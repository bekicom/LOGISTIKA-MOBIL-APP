/**
 * Z1 — zapchast qidirish.
 *
 * ── ARTIKUL QIDIRUVNING ASOSI ───────────────────────────────────
 *
 * Eski detal ustida raqam yozilgan va usta ham aynan shuni aytadi.
 * Nom bo'yicha qidiruv chalkash: «kolodka» — o'nta xil detal.
 * Server artikul mos kelganini `oemHit` bilan aytadi, ekran uni
 * ajratib ko'rsatadi va raqamning o'zi kartochkada monoshriftda
 * turadi — odam uni eski detal bilan solishtiradi.
 *
 * ── «MASHINAM» FILTRI O'ZI TO'LADI ──────────────────────────────
 *
 * «Volvo FH 2019» ni qo'lda yozdirishning ma'nosi yo'q: mashina
 * parkda turibdi va markasi, modeli, yili tizimda bor.
 *
 * ── MAVJUD EMAS DETAL YASHIRILMAYDI ─────────────────────────────
 *
 * Narxi va do'koni ko'rinib turgani foydali: odam qo'ng'iroq qilib
 * «qachon keladi» deb so'raydi. Yashirsak, u detal umuman yo'q deb
 * o'ylaydi.
 */
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { partConditionLabel, partOrderStatusLabel, partStockLabel, t } from "@/lib/i18n";

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
  oemHit: boolean;
  shop: { id: string; name: string; delivery: boolean; location: string | null };
};

type Order = {
  id: string;
  orderNo: number;
  name: string;
  shop: string;
  quantity: number;
  /* BUTUN buyurtmaning narxi — server uni allaqachon donaga
     ko'paytirgan (`orderPart`). Yana ko'paytirilmaydi. */
  total: number;
  currency: string;
  delivery: boolean;
  status: string;
  serviceOrder: { orderNo: number; problem: string } | null;
};

type Fleet = { id: string; plate: string; brand: string; model: string | null; year: number | null };

const STOCK_TONE: Record<string, string> = {
  IN_STOCK: color.success,
  LOW: color.warning,
  OUT: color.danger,
};

export default function Zapchast() {
  const [q, setQ] = useState("");
  const [sent, setSent] = useState("");
  const [vehicle, setVehicle] = useState<Fleet | null>(null);
  const [picking, setPicking] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [cond, setCond] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (sent.trim()) p.set("q", sent.trim());
    if (vehicle) p.set("vehicleId", vehicle.id);
    if (inStock) p.set("stock", "1");
    if (cond) p.set("cond", cond);
    return p.toString();
  }, [sent, vehicle, inStock, cond]);

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    canSell: boolean;
    items: Part[];
    orders: Order[];
  }>(`/api/parts?${query}`, [query]);

  const fleet = useApi<{ items: Fleet[] }>("/api/fleet/vehicles");

  const items = data?.items ?? [];
  const orders = data?.orders ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flexGrow: 1 }}>
          <Text style={s.title}>{t("mob.part.title")}</Text>
          <Text style={s.sub}>{t("mob.part.subtitle")}</Text>
        </View>
      </View>

      {/* ══ Qidiruv: artikul yoki nom ══ */}
      <View style={s.searchBox}>
        <View style={s.search}>
          <Icon name="search" size={19} stroke="#94a3b8" />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setSent(q)}
            onBlur={() => setSent(q)}
            placeholder={t("mob.part.searchPh")}
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            autoCapitalize="characters"
            style={s.searchInput}
          />
          {q.length > 0 && (
            <Pressable
              onPress={() => {
                setQ("");
                setSent("");
              }}
              hitSlop={8}
            >
              <Icon name="close" size={17} stroke="#94a3b8" />
            </Pressable>
          )}
        </View>
        <Text style={s.searchHint}>{t("mob.part.searchHint")}</Text>
      </View>

      {/* ══ Filtr ══ */}
      <View style={s.bar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.barInner}>
          <Pressable
            style={[s.chip, vehicle && s.chipOn]}
            onPress={() => (vehicle ? setVehicle(null) : setPicking(true))}
          >
            <Icon name="truck" size={14} stroke={vehicle ? "#c2490f" : color.mutedForeground} />
            <Text style={[s.chipText, vehicle && s.chipTextOn]}>
              {vehicle
                ? [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ")
                : t("mob.part.myVehicle")}
            </Text>
            {vehicle && <Icon name="close" size={12} stroke="#c2490f" />}
          </Pressable>

          <Pressable style={[s.chip, inStock && s.chipOn]} onPress={() => setInStock((v) => !v)}>
            <Text style={[s.chipText, inStock && s.chipTextOn]}>{t("mob.part.onlyInStock")}</Text>
          </Pressable>

          {(["NEW", "USED"] as const).map((c) => (
            <Pressable
              key={c}
              style={[s.chip, cond === c && s.chipOn]}
              onPress={() => setCond(cond === c ? null : c)}
            >
              <Text style={[s.chipText, cond === c && s.chipTextOn]}>{partConditionLabel(c)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            <View style={s.countRow}>
              <Text style={s.count}>{t("mob.part.foundN", { n: items.length })}</Text>
              <Pressable onPress={() => router.push("/dokonim")}>
                <Text style={s.link}>{t("mob.part.myShop")}</Text>
              </Pressable>
            </View>

            {items.length === 0 ? (
              <Empty
                icon="package"
                title={t("mob.part.emptyTitle")}
                text={t("mob.part.emptyHint")}
              />
            ) : (
              <View style={{ gap: space.sm }}>
                {items.map((p) => (
                  <PartCard key={p.id} p={p} onPress={() => router.push(`/zapchast/${p.id}`)} />
                ))}
              </View>
            )}

            {/* ══ Buyurtmalarim ══ */}
            {orders.length > 0 && (
              <View style={{ marginTop: space.lg }}>
                <Text style={s.group}>{t("mob.part.myOrders")}</Text>
                <View style={{ gap: space.sm }}>
                  {orders.map((o) => (
                    <View key={o.id} style={s.card}>
                      <View style={s.cardHead}>
                        <View style={s.tag}>
                          <Text style={s.tagText}>{partOrderStatusLabel(o.status)}</Text>
                        </View>
                        <Text style={s.no}>#{o.orderNo}</Text>
                      </View>
                      <Text style={s.name} numberOfLines={1}>
                        {o.name} · {o.quantity} {t("mob.part.pcs")}
                      </Text>
                      <Text style={s.meta}>
                        {[o.shop, o.delivery ? t("mob.part.delivery") : t("mob.part.pickup")]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>

                      {/* USTAGA BOG'LANGAN */}
                      {o.serviceOrder && (
                        <View style={s.linked}>
                          <Icon name="check" size={14} stroke={color.mutedForeground} />
                          <Text style={s.linkedText} numberOfLines={1}>
                            {t("mob.part.linkedTo", { n: o.serviceOrder.orderNo })}
                          </Text>
                        </View>
                      )}

                      <Text style={s.price}>
                        {fmtNum(o.total)} {o.currency}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Mashina tanlash */}
      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={s.sheetBack}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={s.grab} />
            <Text style={s.sheetTitle}>{t("mob.part.pickVehicle")}</Text>
            <Text style={s.sheetSub}>{t("mob.part.pickVehicleHint")}</Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {(fleet.data?.items ?? []).map((v) => (
                <Pressable
                  key={v.id}
                  style={s.veh}
                  onPress={() => {
                    setVehicle(v);
                    setPicking(false);
                  }}
                >
                  <View style={s.vehIcon}>
                    <Icon name="truck" size={20} stroke={color.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.vehTitle}>
                      {v.brand} {v.model ?? ""}
                    </Text>
                    <Text style={s.vehSub}>
                      {[v.plate, v.year].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={() => setPicking(false)} style={s.later}>
              <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PartCard({ p, onPress }: { p: Part; onPress: () => void }) {
  const out = p.stock === "OUT";
  const tone = STOCK_TONE[p.stock] ?? color.mutedForeground;

  const years =
    p.yearFrom || p.yearTo
      ? `${p.yearFrom ?? "…"}–${p.yearTo ?? "…"}`
      : null;

  return (
    <Pressable
      style={[s.card, p.oemHit && !out && s.cardHit, out && s.cardOut]}
      onPress={onPress}
    >
      {p.oemHit && !out && (
        <View style={[s.tag, s.tagHit]}>
          <Text style={[s.tagText, { color: "#c2490f" }]}>{t("mob.part.oemMatch")}</Text>
        </View>
      )}

      <View style={s.row}>
        <View style={s.thumb}>
          <Icon name="package" size={26} stroke="#94a3b8" />
        </View>
        <View style={{ flexGrow: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={2}>
            {p.name}
          </Text>
          {(p.brand || years) && (
            <Text style={s.meta} numberOfLines={1}>
              {[p.brand, p.model, years].filter(Boolean).join(" · ")}
            </Text>
          )}
          {/* ARTIKUL — monoshriftda: raqamlar aralashib ketmasin */}
          {p.oem ? <Text style={s.oem}>{p.oem}</Text> : null}
        </View>
      </View>

      <View style={s.chips}>
        <View style={[s.sChip, { backgroundColor: tone + "1a" }]}>
          <Text style={[s.sChipText, { color: tone }]}>
            {partStockLabel(p.stock)}
            {p.quantity != null && p.stock !== "OUT" ? ` · ${p.quantity}` : ""}
          </Text>
        </View>
        <View style={s.sChip}>
          <Text style={s.sChipText}>{partConditionLabel(p.condition)}</Text>
        </View>
        {p.shop.delivery && !out && (
          <View style={s.sChip}>
            <Text style={s.sChipText}>{t("mob.part.delivers")}</Text>
          </View>
        )}
      </View>

      <View style={s.foot}>
        <View style={{ flexGrow: 1 }}>
          <Text style={s.price}>
            {fmtNum(p.price)} <Text style={s.cur}>{p.currency}</Text>
          </Text>
          <Text style={s.shop} numberOfLines={1}>
            {[p.shop.name, p.shop.location].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {!out && (
          <View style={s.buy}>
            <Text style={s.buyText}>{t("mob.part.order")}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  head: {
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  searchBox: { backgroundColor: color.card, paddingHorizontal: space.lg, paddingBottom: space.md },
  search: {
    height: 50,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 11,
  },
  searchInput: { flex: 1, fontSize: 15, color: color.foreground, padding: 0 },
  searchHint: { fontSize: 12, color: color.mutedForeground, marginTop: 7, lineHeight: 18 },

  bar: { backgroundColor: color.card, borderBottomWidth: 1, borderBottomColor: color.border },
  barInner: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 7 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  chipOn: { backgroundColor: color.brand + "1a", borderColor: color.brand + "4d" },
  chipText: { fontSize: 13, color: color.mutedForeground },
  chipTextOn: { color: "#c2490f", fontWeight: "600" },

  scroll: { padding: space.lg },
  countRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: space.sm },
  count: { fontSize: 13, color: color.mutedForeground },
  link: { fontSize: 13, fontWeight: "600", color: color.brand },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardHit: { borderColor: color.brand },
  cardOut: { opacity: 0.7 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 7 },

  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  tagHit: { alignSelf: "flex-start", marginBottom: 11, backgroundColor: color.brand + "1f" },
  tagText: { fontSize: 10, fontWeight: "700", color: color.mutedForeground },
  no: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  row: { flexDirection: "row", gap: 12 },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, fontWeight: "600", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  oem: {
    fontSize: 12,
    color: color.foreground,
    marginTop: 4,
    fontFamily: "monospace",
  },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  sChip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  sChipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },

  foot: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  price: { fontSize: 19, fontWeight: "700", color: color.foreground },
  cur: { fontSize: 13, color: color.mutedForeground },
  shop: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  buy: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 9,
    backgroundColor: color.brand,
    justifyContent: "center",
  },
  buyText: { fontSize: 13, fontWeight: "600", color: color.brandForeground },

  linked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: "#f8fafc",
  },
  linkedText: { flex: 1, fontSize: 12, color: color.mutedForeground },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
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

  veh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },
  vehIcon: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  vehTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  vehSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
