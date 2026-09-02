/**
 * C3 — yuk tafsiloti.
 *
 * Mehmon ham ko'ra oladi (web'dagidek), lekin telefon raqam yopiq turadi.
 * Uni ochish alohida amal: `/api/contact-reveal`. Bu yerda faqat
 * «ochilganmi» degan javob keladi.
 */
import { useState } from "react";
import {
  Linking, Modal, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Icon } from "@/components/Icon";
import { TruckIcon } from "@/components/TruckIcon";
import { Route, Chip } from "@/components/cards";
import { Button, Field, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Load = {
  id: string; title: string | null; description: string | null;
  isMine: boolean; isTaken: boolean; isTop: boolean;
  views: number; createdAt: string;
  route: { from: string; fromCountry: string; to: string; toCountry: string };
  cargo: {
    weightT: number | null; volumeM3: number | null; vehicleCount: number;
    isExtraLoad: boolean; isReadyNow: boolean; loadingDate: string | null;
    vehicleType: { key: string; name: string };
    altVehicleTypes: { key: string; name: string }[];
  };
  price: {
    amount: number | null; currency: string; isNegotiable: boolean;
    advance: number | null; paymentType: string;
  };
  owner: {
    id: string; name: string; company: string | null; furamId: number;
    isVerified: boolean; memberSince: string;
    rating: number | null; ratingCount: number;
  } | null;
  contact: string | null;
};

const PAY: Record<string, string> = { CASH: "Naqd", TRANSFER: "O'tkazma", MIXED: "Aralash" };

function money(n: number, cur: string) {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ${cur}`;
}

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.round(h / 24)} kun oldin`;
}

export default function YukTafsiloti() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [offer, setOffer] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealErr, setRevealErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<Load>(
    id ? `/api/loads/${id}` : null,
    [id],
  );

  async function reveal() {
    setRevealErr(null);
    setRevealing(true);
    try {
      await api("/api/contact-reveal", { method: "POST", body: { kind: "load", id: String(id) } });
      reload();
    } catch (e) {
      setRevealErr((e as FuramError).message ?? "Kontakt ochilmadi");
    } finally {
      setRevealing(false);
    }
  }

  const c = data?.cargo;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={10} style={s.back}>
          <Icon name="heart" size={22} stroke="#cbd5e1" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton rows={2} /> : null}
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data && c ? (
          <>
            {/* Asosiy */}
            <View style={s.card}>
              <View style={s.cardHead}>
                {data.isTop ? <Chip text="TOP" tone="brand" /> : <Chip text="YANGI" tone="success" />}
                <Text style={s.meta}>{ago(data.createdAt)} · {data.views} marta</Text>
              </View>

              <View style={{ marginTop: 14 }}>
                <Route
                  from={data.route.from}
                  fromC={data.route.fromCountry}
                  to={data.route.to}
                  toC={data.route.toCountry}
                  size={21}
                />
              </View>

              {data.title ? <Text style={s.cargoName}>{data.title}</Text> : null}

              <View style={s.grid}>
                <Cell label="Og'irlik" value={c.weightT != null ? `${c.weightT} t` : "—"} />
                <Cell label="Hajm" value={c.volumeM3 != null ? `${c.volumeM3} m³` : "—"} />
                <Cell label="Mashina soni" value={`${c.vehicleCount} ta`} />
                <Cell
                  label="Yuklash"
                  value={c.isReadyNow ? "Hozir tayyor" : c.loadingDate ? date(c.loadingDate) : "—"}
                  tone={c.isReadyNow ? color.success : undefined}
                />
              </View>

              {/* Transport turlari */}
              <View style={s.types}>
                <Text style={s.label}>Transport turi</Text>
                <View style={s.typeRow}>
                  <View style={s.typeMain}>
                    <TruckIcon type={c.vehicleType.key} size={26} color="#fff" />
                    <Text style={s.typeMainText}>{c.vehicleType.name}</Text>
                  </View>
                  {c.altVehicleTypes.map((a) => (
                    <View key={a.key} style={s.typeAlt}>
                      <Text style={s.typeAltText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
                {c.altVehicleTypes.length > 0 ? (
                  <Text style={s.hint}>Birinchisi asosiy, qolgani ham bo&apos;laveradi</Text>
                ) : null}
              </View>

              {c.isExtraLoad ? (
                <View style={{ marginTop: space.md }}>
                  <Chip text="Qo'shimcha yuk — mashina to'la emas" tone="info" />
                </View>
              ) : null}
            </View>

            {/* Narx */}
            <View style={s.card}>
              <Text style={s.meta}>Narx</Text>
              <Text style={s.price}>
                {data.price.isNegotiable || data.price.amount == null
                  ? "Kelishiladi"
                  : money(data.price.amount, data.price.currency)}
              </Text>
              <View style={s.priceChips}>
                <Chip text={PAY[data.price.paymentType] ?? data.price.paymentType} />
                {data.price.advance ? (
                  <Chip text={`Oldindan ${money(data.price.advance, data.price.currency)}`} tone="info" />
                ) : null}
              </View>
            </View>

            {/* Izoh */}
            {data.description ? (
              <View style={s.card}>
                <Text style={s.cardTitle}>Izoh</Text>
                <Text style={s.desc}>{data.description}</Text>
              </View>
            ) : null}

            {/* E'lon beruvchi */}
            {data.owner ? (
              <View style={s.card}>
                <View style={s.ownerRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{data.owner.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.ownerName} numberOfLines={1}>
                        {data.owner.company || data.owner.name}
                      </Text>
                      {data.owner.isVerified ? (
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                          <Path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" fill={color.info} />
                          <Path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                      ) : null}
                    </View>
                    <Text style={s.meta}>FURAM ID {data.owner.furamId}</Text>
                  </View>
                </View>

                {data.owner.rating != null ? (
                  <View style={s.trust}>
                    <Svg width={15} height={15} viewBox="0 0 24 24">
                      <Path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" fill={color.brand} />
                    </Svg>
                    <Text style={s.trustValue}>{data.owner.rating.toFixed(1)}</Text>
                    <Text style={s.meta}>· {data.owner.ratingCount} baho</Text>
                  </View>
                ) : null}

                {/* Kontakt */}
                {data.contact ? (
                  <Pressable style={s.contactOpen} onPress={() => Linking.openURL(`tel:${data.contact}`)}>
                    <Icon name="check" size={19} stroke={color.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.contactPhone}>{data.contact}</Text>
                      <Text style={s.contactNote}>Bosing — qo&apos;ng&apos;iroq qilinadi</Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={s.contactLocked}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                      <View style={s.lockIcon}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path d="M3 11h18v11H3z" fill="none" stroke={color.mutedForeground} strokeWidth={2} strokeLinejoin="round" />
                          <Path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={color.mutedForeground} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.hiddenPhone}>+998 ** *** ** **</Text>
                        <Text style={s.meta}>Telefon raqam yopiq</Text>
                      </View>
                    </View>

                    {revealErr ? <Text style={s.err}>{revealErr}</Text> : null}

                    <View style={{ marginTop: space.md }}>
                      <Button title="Kontaktni ochish" onPress={reveal} loading={revealing} />
                    </View>
                    <Pressable style={s.freeAlt} hitSlop={6}>
                      <Icon name="chat" size={15} stroke={color.brand} />
                      <Text style={s.freeAltText}>Yoki bepul xabar yozing</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}

            {data.isTaken ? (
              <Notice tone="warning">Bu yukka allaqachon reys ochilgan.</Notice>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* Pastki panel */}
      {data && !data.isMine && !data.isTaken ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + space.lg }]}>
          <Pressable
            style={({ pressed }) => [s.primary, pressed && { backgroundColor: color.brandHover }]}
            onPress={() => setOffer(true)}
          >
            <Text style={s.primaryText}>Taklif yuborish</Text>
          </Pressable>
          <View style={s.iconBtn}>
            <Icon name="chat" size={20} stroke={color.foreground} />
          </View>
        </View>
      ) : null}

      <OfferSheet
        open={offer}
        loadId={String(id)}
        suggested={data?.price.amount ?? null}
        currency={data?.price.currency ?? "UZS"}
        onClose={() => setOffer(false)}
        onDone={() => { setOffer(false); reload(); }}
      />
    </View>
  );
}

function date(iso: string) {
  const d = new Date(iso);
  const M = ["yanv", "fev", "mart", "apr", "may", "iyun", "iyul", "avg", "sent", "okt", "noya", "dek"];
  return `${d.getDate()}-${M[d.getMonth()]}`;
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ width: "47%", flexGrow: 1 }}>
      <Text style={s.meta}>{label}</Text>
      <Text style={[s.cellValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── taklif */

function OfferSheet({ open, loadId, suggested, currency, onClose, onDone }: {
  open: boolean; loadId: string; suggested: number | null; currency: string;
  onClose: () => void; onDone: () => void;
}) {
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const insets = useSafeAreaInsets();

  const num = Number(fee.replace(/\s/g, "").replace(",", "."));

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await api("/api/deals", {
        method: "POST",
        body: { kind: "LOAD", id: loadId, fee: num, currency, note: note.trim() || undefined },
      });
      setOk(true);
      setTimeout(() => { setOk(false); setFee(""); setNote(""); onDone(); }, 1200);
    } catch (e) {
      setErr((e as FuramError).message ?? "Taklif yuborilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <View style={{ padding: space.xl, paddingTop: space.lg }}>
            {ok ? (
              <View style={{ alignItems: "center", paddingVertical: space.xl }}>
                <View style={s.okCircle}>
                  <Icon name="check" size={28} stroke={color.success} />
                </View>
                <Text style={s.okText}>Taklif yuborildi</Text>
              </View>
            ) : (
              <>
                <Text style={s.sheetTitle}>Taklif yuborish</Text>
                <Text style={s.sheetSub}>
                  Yuk egasi taklifingizni ko&apos;radi va javob beradi. Kelishilsa reys ochiladi.
                </Text>

                <View style={{ marginTop: space.xl }}>
                  <Field
                    label={`Narxingiz (${currency})`}
                    placeholder={suggested ? new Intl.NumberFormat("ru-RU").format(suggested) : "0"}
                    keyboardType="numeric"
                    value={fee}
                    onChangeText={setFee}
                  />
                  {suggested ? (
                    <Text style={s.hint}>E&apos;londagi narx: {money(suggested, currency)}</Text>
                  ) : null}
                </View>

                <View style={{ marginTop: space.lg }}>
                  <Field
                    label="Izoh"
                    hint="ixtiyoriy"
                    placeholder="Masalan: ertaga ertalab yuklashga tayyorman"
                    value={note}
                    onChangeText={setNote}
                  />
                </View>

                {err ? <View style={{ marginTop: space.lg }}><Notice tone="danger">{err}</Notice></View> : null}
              </>
            )}
          </View>

          {!ok ? (
            <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
              <Button title="Yuborish" onPress={submit} loading={busy} disabled={!(num > 0)} />
              <Pressable onPress={onClose} style={s.cancel}>
                <Text style={s.cancelText}>Bekor qilish</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: { backgroundColor: color.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  body: { padding: space.lg, gap: space.md },
  card: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: space.lg, ...shadow.card,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginBottom: 8 },
  meta: { fontSize: 12, color: color.mutedForeground },

  cargoName: { fontSize: font.bodyLg, fontWeight: "600", color: color.foreground, marginTop: 16 },

  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 16,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: color.border,
  },
  cellValue: { fontSize: 17, fontWeight: "700", color: color.foreground, marginTop: 2 },

  types: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: color.border },
  label: { fontSize: 12, color: color.mutedForeground, marginBottom: 9 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  typeMain: {
    height: 34, paddingHorizontal: 12, borderRadius: radius.control, backgroundColor: color.brand,
    flexDirection: "row", alignItems: "center", gap: 7,
  },
  typeMainText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  typeAlt: { height: 34, paddingHorizontal: 12, borderRadius: radius.control, backgroundColor: color.muted, justifyContent: "center" },
  typeAltText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 8 },

  price: { fontSize: 30, fontWeight: "700", color: color.foreground, letterSpacing: -0.6, marginTop: 2 },
  priceChips: { flexDirection: "row", gap: 7, marginTop: 12, flexWrap: "wrap" },
  desc: { fontSize: 14, color: "#475569", lineHeight: 22 },

  ownerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "600", color: color.mutedForeground },
  ownerName: { fontSize: font.bodyLg, fontWeight: "600", color: color.foreground },
  trust: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },
  trustValue: { fontSize: 14, fontWeight: "700", color: color.foreground },

  contactOpen: {
    flexDirection: "row", alignItems: "center", gap: 11, marginTop: 14,
    padding: 13, borderRadius: radius.control, backgroundColor: "#16a34a12",
  },
  contactPhone: { fontSize: 16, fontWeight: "700", color: color.foreground },
  contactNote: { fontSize: 12, color: "#15803d", marginTop: 1 },

  contactLocked: { marginTop: 14, padding: 16, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: "#f8fafc" },
  lockIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.border, alignItems: "center", justifyContent: "center" },
  hiddenPhone: { fontSize: 17, fontWeight: "700", color: "#94a3b8", letterSpacing: 1 },
  freeAlt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12 },
  freeAltText: { fontSize: 13, fontWeight: "600", color: color.brand },
  err: { fontSize: 12, color: color.danger, marginTop: 10 },

  actions: {
    flexDirection: "row", gap: 8, backgroundColor: color.card,
    paddingHorizontal: space.lg, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  primary: { flex: 1, height: 52, borderRadius: radius.control, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: font.body, fontWeight: "600", color: "#fff" },
  iconBtn: { width: 52, height: 52, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginTop: 10 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: color.foreground },
  sheetSub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 5, lineHeight: 20 },
  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },
  cancel: { height: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },

  okCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#16a34a1f", alignItems: "center", justifyContent: "center" },
  okText: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground, marginTop: space.md },
});
