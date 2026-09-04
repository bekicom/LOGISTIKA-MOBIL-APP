/**
 * Z2 — detal tafsiloti va buyurtma.
 *
 * ── «MASHINAMGA TO'G'RI KELADIMI» ───────────────────────────────
 *
 * Javobni server beradi. Xaridor «2013–2021» ni ko'rib «2019
 * kiradimi» deb o'ylab o'tirmasin — bu xato qilinadigan joy, va
 * noto'g'ri detal olingach uni qaytarish og'ir.
 *
 * ── USTAGA BOG'LASH ─────────────────────────────────────────────
 *
 * Haydovchi zapchastni o'zi uchun emas, USTA aytgani uchun oladi.
 * Bog'lansa do'kon detalni to'g'ri ustaxonaga yuboradi va u servis
 * buyurtmasiga tegishli bo'ladi. `PartOrder.serviceOrderId` maydoni
 * bazada bor edi, lekin uni tanlaydigan joy yo'q edi.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, Header, Switch } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { partConditionLabel, partStockLabel, t } from "@/lib/i18n";

type Part = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  oem: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  condition: string;
  stock: string;
  quantity: number | null;
  price: number;
  currency: string;
  note: string | null;
  shop: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    workHours: string | null;
    delivery: boolean;
    location: string | null;
  };
};

type Fleet = { id: string; plate: string; title: string; year: number | null; fits: boolean };
type SvcOrder = { id: string; orderNo: number; problem: string };

const STOCK_TONE: Record<string, string> = {
  IN_STOCK: color.success,
  LOW: color.warning,
  OUT: color.danger,
};

export default function Detal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, reload } = useApi<{
    part: Part;
    fleet: Fleet[];
    serviceOrders: SvcOrder[];
    isMine: boolean;
  }>(id ? `/api/parts/${id}` : null, [id]);

  const [sheet, setSheet] = useState(false);

  if (loading && !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.part.one")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.part.one")} />
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.state.noData")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const { part: p, fleet, serviceOrders, isMine } = data;
  const out = p.stock === "OUT";
  const tone = STOCK_TONE[p.stock] ?? color.mutedForeground;
  /* Bir nechta mashinasi bo'lsa, mos kelganini ko'rsatamiz —
     mos kelmagani haqida jim turmaymiz ham. */
  const fitting = fleet.find((v) => v.fits);
  const notFitting = fleet.length > 0 && !fitting;

  const years =
    p.yearFrom || p.yearTo ? `${p.yearFrom ?? "…"}–${p.yearTo ?? "…"}` : null;

  return (
    <View style={s.root}>
      <Header title={t("mob.part.one")} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        <View style={s.photo}>
          <Icon name="package" size={64} stroke="#94a3b8" />
        </View>

        {/* ── Bosh ma'lumot */}
        <View style={s.card}>
          <Text style={s.name}>{p.name}</Text>

          {/* ARTIKUL — eng muhim qator */}
          {p.oem ? (
            <View style={s.oemBox}>
              <View style={{ flexGrow: 1 }}>
                <Text style={s.oemKey}>{t("mob.part.oem")}</Text>
                <Text style={s.oemValue} selectable>
                  {p.oem}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={s.price}>
            {fmtNum(p.price)} <Text style={s.cur}>{p.currency}</Text>
          </Text>

          <View style={s.chips}>
            <View style={[s.chip, { backgroundColor: tone + "1a" }]}>
              <Text style={[s.chipText, { color: tone }]}>
                {partStockLabel(p.stock)}
                {p.quantity != null && !out ? ` · ${p.quantity}` : ""}
              </Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipText}>{partConditionLabel(p.condition)}</Text>
            </View>
          </View>

          {p.note ? <Text style={s.text}>{p.note}</Text> : null}
        </View>

        {/* ── Qaysi transportga */}
        <View style={s.card}>
          <Text style={s.sec}>{t("mob.part.forWhich")}</Text>
          <View style={{ marginTop: 4 }}>
            {(p.brand || p.model) && (
              <Row label={t("mob.part.brandModel")} value={[p.brand, p.model].filter(Boolean).join(" ")} />
            )}
            {years && <Row label={t("mob.part.years")} value={years} />}
            <Row label={t("mob.part.condition")} value={partConditionLabel(p.condition)} last />
          </View>

          {/* MOS KELADIMI — javob darhol */}
          {fitting ? (
            <View style={[s.fits, s.fitsOk]}>
              <Icon name="check" size={16} stroke="#15803d" />
              <Text style={s.fitsOkText}>
                {t("mob.part.fitsYes", {
                  car: [fitting.title, fitting.year].filter(Boolean).join(" "),
                })}
              </Text>
            </View>
          ) : notFitting ? (
            <View style={[s.fits, s.fitsWarn]}>
              <Icon name="alert" size={16} stroke={color.warning} />
              <Text style={s.fitsWarnText}>{t("mob.part.fitsNo")}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Do'kon */}
        <View style={s.card}>
          <Text style={s.sec}>{t("mob.part.shop")}</Text>
          <View style={s.shopRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials(p.shop.name)}</Text>
            </View>
            <View style={{ flexGrow: 1, minWidth: 0 }}>
              <Text style={s.shopName} numberOfLines={1}>
                {p.shop.name}
              </Text>
              <Text style={s.shopMeta} numberOfLines={1}>
                {[p.shop.location, p.shop.address].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>

          <View style={s.chips}>
            {p.shop.delivery && (
              <View style={[s.chip, { backgroundColor: color.success + "1a" }]}>
                <Text style={[s.chipText, { color: "#15803d" }]}>{t("mob.part.delivers")}</Text>
              </View>
            )}
            {p.shop.workHours ? (
              <View style={s.chip}>
                <Text style={s.chipText}>{p.shop.workHours}</Text>
              </View>
            ) : null}
          </View>

          {p.shop.phone && (
            <Pressable
              style={[s.btn, s.btnGhost]}
              onPress={() => void Linking.openURL(`tel:${p.shop.phone}`)}
            >
              <Text style={s.btnGhostText}>{p.shop.phone}</Text>
            </Pressable>
          )}
        </View>

        {isMine ? (
          <Text style={s.own}>{t("mob.part.ownPart")}</Text>
        ) : out ? (
          <View style={s.outBox}>
            <Text style={s.outText}>{t("mob.part.outHint")}</Text>
          </View>
        ) : (
          <Pressable style={[s.btn, s.btnPri]} onPress={() => setSheet(true)}>
            <Text style={s.btnPriText}>{t("mob.part.order")}</Text>
          </Pressable>
        )}
      </ScrollView>

      <OrderSheet
        open={sheet}
        part={p}
        serviceOrders={serviceOrders}
        onClose={() => setSheet(false)}
        onDone={() => {
          setSheet(false);
          router.replace("/zapchast");
        }}
      />
    </View>
  );
}

/** Buyurtma oynasi */
function OrderSheet({
  open,
  part,
  serviceOrders,
  onClose,
  onDone,
}: {
  open: boolean;
  part: Part;
  serviceOrders: SvcOrder[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState(false);
  const [address, setAddress] = useState("");
  const [linked, setLinked] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const insets = useSafeAreaInsets();

  /* Eng yangi ochiq servis buyurtmasi — odamda bir nechtasi
     bo'lsa ham, oxirgisi eng ehtimoliy. */
  const svc = serviceOrders[0] ?? null;
  const max = part.quantity ?? 99;
  const ready = qty > 0 && (!delivery || address.trim().length > 0);

  async function send() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/parts", {
        method: "POST",
        body: {
          action: "order",
          partId: part.id,
          quantity: qty,
          delivery,
          address: address.trim() || null,
          note: note.trim() || null,
          serviceOrderId: linked && svc ? svc.id : null,
        },
      });
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.sheetScroll}
          contentContainerStyle={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.part.order")}</Text>
          <Text style={s.sheetSub} numberOfLines={2}>
            {part.name} · {part.shop.name}
          </Text>

          {err ? <ErrorBox message={err} /> : null}

          <View>
            <Text style={s.label}>{t("mob.part.howMany")}</Text>
            <View style={s.qtyRow}>
              <Pressable style={s.qtyBtn} onPress={() => setQty((n) => Math.max(1, n - 1))}>
                <Icon name="close" size={16} stroke={color.mutedForeground} />
              </Pressable>
              <Text style={s.qty}>{qty}</Text>
              <Pressable style={s.qtyBtn} onPress={() => setQty((n) => Math.min(max, n + 1))}>
                <Icon name="plus" size={18} stroke={color.mutedForeground} />
              </Pressable>
            </View>
            {part.quantity != null && (
              <Text style={s.hint}>{t("mob.part.inShopN", { n: part.quantity })}</Text>
            )}
          </View>

          <View>
            <Text style={s.label}>{t("mob.part.howGet")}</Text>
            <View style={s.two}>
              <Pressable
                style={[s.way, !delivery && s.wayOn]}
                onPress={() => setDelivery(false)}
              >
                <Text style={[s.wayText, !delivery && s.wayTextOn]}>{t("mob.part.pickup")}</Text>
                <Text style={s.waySub} numberOfLines={1}>
                  {part.shop.location ?? part.shop.address ?? ""}
                </Text>
              </Pressable>
              <Pressable
                style={[s.way, delivery && s.wayOn, !part.shop.delivery && s.wayOff]}
                disabled={!part.shop.delivery}
                onPress={() => setDelivery(true)}
              >
                <Text style={[s.wayText, delivery && s.wayTextOn]}>{t("mob.part.delivery")}</Text>
                <Text style={s.waySub}>
                  {part.shop.delivery ? t("mob.part.needAddress") : t("mob.part.noDelivery")}
                </Text>
              </Pressable>
            </View>
          </View>

          {delivery && (
            <Field
              label={t("mob.part.whereTo")}
              value={address}
              onChangeText={setAddress}
              placeholder={t("mob.part.whereToPh")}
            />
          )}

          {/* ══ USTAGA BOG'LASH ══ */}
          {svc && (
            <View style={[s.linkBox, linked && s.linkBoxOn]}>
              <View style={{ flexGrow: 1, minWidth: 0 }}>
                <Text style={s.linkTitle}>{t("mob.part.linkService")}</Text>
                <Text style={s.linkSub} numberOfLines={1}>
                  #{svc.orderNo} · {svc.problem}
                </Text>
              </View>
              <Switch value={linked} onValueChange={setLinked} />
            </View>
          )}

          <Field
            label={t("mob.part.note")}
            value={note}
            onChangeText={setNote}
            placeholder={t("mob.part.notePh")}
          />

          <View style={s.total}>
            <Text style={s.totalKey}>{t("mob.svc.total")}</Text>
            <Text style={s.totalValue}>
              {fmtNum(part.price * qty)} {part.currency}
            </Text>
          </View>

          <Button
            title={t("mob.part.send")}
            disabled={!ready}
            loading={busy}
            onPress={() => void send()}
          />
          <Pressable onPress={onClose} style={s.later}>
            <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
          </Pressable>

          <Text style={s.sheetNote}>{t("mob.part.payNote")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.r, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rk}>{label}</Text>
      <Text style={s.rv}>{value}</Text>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },

  photo: {
    height: 200,
    borderRadius: radius.card,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  name: { fontSize: 18, fontWeight: "700", color: color.foreground },

  oemBox: {
    marginTop: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  oemKey: { fontSize: 11, color: color.mutedForeground },
  oemValue: {
    fontSize: 17,
    fontWeight: "700",
    color: color.foreground,
    fontFamily: "monospace",
    marginTop: 1,
  },

  price: { fontSize: 26, fontWeight: "700", color: color.foreground, marginTop: 13, letterSpacing: -0.6 },
  cur: { fontSize: 15, color: color.mutedForeground },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  text: { fontSize: 13, color: color.mutedForeground, marginTop: 10, lineHeight: 20 },

  r: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.muted,
    gap: space.md,
  },
  rk: { fontSize: 13, color: color.mutedForeground },
  rv: { flexShrink: 1, fontSize: 13, fontWeight: "600", color: color.foreground, textAlign: "right" },

  fits: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  fitsOk: { backgroundColor: color.success + "14" },
  fitsOkText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#15803d" },
  fitsWarn: { backgroundColor: color.warning + "14" },
  fitsWarnText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 19 },

  shopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 11 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  shopName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  shopMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  own: { fontSize: 13, color: color.mutedForeground, textAlign: "center", paddingVertical: space.md },
  outBox: {
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  outText: { fontSize: 13, color: color.mutedForeground, lineHeight: 19, textAlign: "center" },

  btn: { height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 12 },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 15, fontWeight: "600", color: color.brandForeground },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheetScroll: { maxHeight: "88%", flexGrow: 0 },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: space.xs },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: color.foreground },
  sheetSub: { fontSize: 13, color: color.mutedForeground, lineHeight: 19, marginBottom: space.xs },
  sheetNote: { fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 16 },

  label: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, marginBottom: 5 },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 6 },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "700", color: color.foreground },

  two: { flexDirection: "row", gap: 8 },
  way: {
    flex: 1,
    minHeight: 62,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 3,
  },
  wayOn: { borderColor: color.brand, backgroundColor: color.brand + "14" },
  wayOff: { opacity: 0.5 },
  wayText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  wayTextOn: { color: "#c2490f" },
  waySub: { fontSize: 11, color: "#94a3b8" },

  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  linkBoxOn: { borderColor: color.brand + "4d", backgroundColor: color.brand + "12" },
  linkTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  linkSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  total: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
  },
  totalKey: { fontSize: 13, color: color.mutedForeground },
  totalValue: { fontSize: 19, fontWeight: "700", color: color.foreground },

  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
