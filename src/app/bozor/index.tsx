/**
 * P1 — Bozor: sotiladigan transport.
 *
 * ── NEGA SURAT KATTA ────────────────────────────────────────────
 *
 * Mashinalar bozorida (M1) surat 72 px — u yerda asosiy raqam
 * SIG'IM, mashina esa bir reysga olinadi. Bu yerda esa mashina
 * SOTIB OLINADI: 58 000 dollar. Uni ko'rmay hech kim olmaydi,
 * shuning uchun surat 200 px va kartochkaning boshida turadi.
 *
 * ── OYLIK TO'LOV KARTOCHKADA ────────────────────────────────────
 *
 * Bu bozorda ko'pchilik umumiy narxga emas, oyiga qancha to'lashiga
 * qaraydi. Web'da bu faqat «Muddatli to'lov» degan yozuv edi —
 * raqamsiz u qaror qabul qilishga yordam bermaydi.
 *
 * ── «FURAM PARKIDA YURGAN» ──────────────────────────────────────
 *
 * E'lon parkdagi mashinaga bog'langan bo'lsa, probeg va texnik
 * xizmat tizim yozuvi. Bu bo'limning boshqa bozorlardan yagona
 * jiddiy farqi, shuning uchun ro'yxatdayoq ko'rinadi.
 */
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { salePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { fmtNum } from "@/components/cards";
import { saleCategoryLabel, salePriceKindLabel, saleStatusLabel, t } from "@/lib/i18n";

/** Server yuborgan kalitlar — `furam/src/lib/sale.ts:CATEGORIES` */
const CATS = ["FURA", "TRUCK", "TRAILER", "MINIBUS", "BUS", "SPECIAL", "CAR", "OTHER"] as const;

type Sale = {
  id: string;
  saleNo: number;
  category: string;
  brand: string;
  model: string | null;
  year: number | null;
  odometer: number | null;
  price: number;
  currency: string;
  priceKind: string;
  status: string;
  badge: "VIP" | "TOP" | null;
  hasDocs: boolean;
  exchange: boolean;
  monthly: { amount: number; months: number } | null;
  photo: string | null;
  photoCount: number;
  location: string | null;
  fromFleet: boolean;
  saved: boolean;
};

export default function Bozor() {
  const [cat, setCat] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    for (const k of ["installment", "exchange", "docs"]) if (flags[k]) p.set(k, "1");
    return p.toString();
  }, [cat, flags]);

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    items: Sale[];
    total: number;
    canPost: boolean;
  }>(`/api/market?${query}`, [query]);

  /* TARIF TO'SIG'I OLDINDAN AYTILADI. E'lon berish `auto_sale`
     ortida; server buni ro'yxat bilan birga yuboradi. Busiz odam
     to'rtta qadamni to'ldirib, suratlarini qo'yib, oxirida 402
     olardi — qilingan ish yo'qolardi. */
  const [locked, setLocked] = useState(false);

  const items = data?.items ?? [];
  const toggle = (k: string) => setFlags((f) => ({ ...f, [k]: !f[k] }));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flexGrow: 1 }}>
          <Text style={s.title}>{t("mob.market.title")}</Text>
          <Text style={s.sub}>{t("mob.market.subtitle")}</Text>
        </View>
        <Pressable
          style={s.post}
          onPress={() =>
            data && !data.canPost ? setLocked(true) : router.push("/bozor-joylash")
          }
        >
          <Icon name="plus" size={15} stroke="#fff" />
          <Text style={s.postText}>{t("mob.market.sell")}</Text>
        </Pressable>
      </View>

      {/* Kategoriya — gorizontal, sakkiztasi bor */}
      <View style={s.bar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...CATS]}
          keyExtractor={(c) => c ?? "ALL"}
          contentContainerStyle={s.barInner}
          renderItem={({ item: c }) => (
            <Pressable
              style={[s.cat, cat === c && s.catOn]}
              onPress={() => setCat(c)}
            >
              <Text style={[s.catText, cat === c && s.catTextOn]}>
                {c ? saleCategoryLabel(c) : t("mob.market.all")}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Tez filtr — bu bozorda aynan shu uchtasi qidiriladi */}
      <View style={s.flagBar}>
        {(["installment", "exchange", "docs"] as const).map((k) => (
          <Pressable key={k} style={[s.flag, flags[k] && s.flagOn]} onPress={() => toggle(k)}>
            <Text style={[s.flagText, flags[k] && s.flagTextOn]}>{t(`mob.market.f_${k}`)}</Text>
          </Pressable>
        ))}
      </View>

      {locked && (
        <Pressable style={s.lock} onPress={() => setLocked(false)}>
          <Text style={s.lockTitle}>{t("mob.sale.lockedTitle")}</Text>
          <Text style={s.lockText}>{t("mob.sale.lockedText")}</Text>
        </Pressable>
      )}

      {loading && !data ? (
        <View style={s.pad}>
          <Skeleton rows={3} />
        </View>
      ) : error ? (
        <View style={s.pad}>
          <ErrorBox message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={
            <Text style={s.count}>
              {t("mob.market.found", { n: data?.total ?? 0 })}
            </Text>
          }
          ListEmptyComponent={
            <Empty
              icon="truck"
              title={t("mob.market.emptyTitle")}
              text={t("mob.market.emptyHint")}
            />
          }
          renderItem={({ item }) => (
            <SaleCard item={item} onPress={() => router.push(`/bozor/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function SaleCard({ item, onPress }: { item: Sale; onPress: () => void }) {
  /* SOTILGAN e'lon ro'yxatdan yo'qolmaydi, lekin aralashmaydi ham:
     narxi ko'rinib turgani foydali — bozor narxi shundan bilinadi. */
  const closed = item.status === "SOLD";

  const line = [
    item.year ? t("mob.market.yearN", { n: item.year }) : null,
    item.odometer != null ? `${fmtNum(item.odometer)} km` : null,
    item.location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={[s.card, item.fromFleet && !closed && s.cardFleet, closed && s.cardClosed]}
      onPress={onPress}
    >
      <View style={[s.photo, closed && s.photoClosed]}>
        {item.photo ? (
          <Image source={salePhoto(item.id, item.photo)} style={s.photoImg} resizeMode="cover" />
        ) : (
          <View style={s.noPhoto}>
            <Icon name="truck" size={30} stroke="#94a3b8" />
          </View>
        )}

        {item.badge ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.badge}</Text>
          </View>
        ) : item.priceKind === "URGENT" && !closed ? (
          <View style={[s.badge, s.badgeUrgent]}>
            <Text style={s.badgeText}>{t("mob.market.urgent")}</Text>
          </View>
        ) : null}

        {item.photoCount > 1 && (
          <View style={s.count2}>
            <Text style={s.count2Text}>1 / {item.photoCount}</Text>
          </View>
        )}

        {closed && (
          <View style={s.sold}>
            <View style={s.soldTag}>
              <Text style={s.soldText}>{saleStatusLabel("SOLD")}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>
          {item.brand} {item.model ?? ""}
        </Text>
        {line ? <Text style={s.meta}>{line}</Text> : null}

        <View style={s.priceRow}>
          <Text style={s.price}>
            {fmtNum(item.price)} <Text style={s.cur}>{item.currency}</Text>
          </Text>
          {!closed && (
            <Text style={[s.kind, item.priceKind === "FIXED" && s.kindFixed]}>
              {salePriceKindLabel(item.priceKind)}
            </Text>
          )}
        </View>

        {item.monthly && !closed && (
          <View style={s.inst}>
            <Icon name="doc" size={14} stroke="#c2490f" />
            <Text style={s.instText}>
              {t("mob.market.monthly", {
                sum: `${fmtNum(item.monthly.amount)} ${item.currency}`,
                n: item.monthly.months,
              })}
            </Text>
          </View>
        )}

        {!closed && (item.hasDocs || item.exchange) && (
          <View style={s.chips}>
            {item.hasDocs && (
              <View style={[s.chip, s.chipOk]}>
                <Text style={[s.chipText, s.chipOkText]}>{t("mob.market.docsOk")}</Text>
              </View>
            )}
            {item.exchange && (
              <View style={s.chip}>
                <Text style={s.chipText}>{t("mob.market.f_exchange")}</Text>
              </View>
            )}
          </View>
        )}

        {item.fromFleet && !closed && (
          <View style={s.fleet}>
            <Icon name="check" size={14} stroke="#c2490f" />
            <Text style={s.fleetText}>{t("mob.market.fromFleet")}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  pad: { padding: space.lg },

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
  post: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postText: { fontSize: 13, fontWeight: "600", color: color.brandForeground },

  bar: { backgroundColor: color.card },
  barInner: { paddingHorizontal: space.lg, paddingBottom: 11, gap: 7 },
  cat: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  catOn: { backgroundColor: color.foreground, borderColor: color.foreground },
  catText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  catTextOn: { color: color.card, fontWeight: "600" },

  flagBar: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    gap: 7,
  },
  flag: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
  },
  flagOn: { backgroundColor: color.brand + "1a", borderColor: color.brand + "4d" },
  flagText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },
  flagTextOn: { color: "#c2490f", fontWeight: "600" },

  lock: {
    margin: space.lg,
    marginBottom: 0,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
  },
  lockTitle: { fontSize: font.caption, fontWeight: "600", color: "#92400e" },
  lockText: { fontSize: 12, color: "#92400e", marginTop: 4, lineHeight: 18 },

  list: { padding: space.lg, gap: space.md },
  count: { fontSize: 13, color: color.mutedForeground, marginBottom: 4 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  cardFleet: { borderColor: color.brand },
  cardClosed: { opacity: 0.75 },

  photo: { height: 200, backgroundColor: "#e2e8f0" },
  photoClosed: { height: 132 },
  photoImg: { width: "100%", height: "100%" },
  noPhoto: { flex: 1, alignItems: "center", justifyContent: "center" },

  badge: {
    position: "absolute",
    left: 12,
    top: 12,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: color.brand,
    justifyContent: "center",
  },
  badgeUrgent: { backgroundColor: color.danger },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

  count2: {
    position: "absolute",
    right: 12,
    bottom: 12,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#0f172a99",
    justifyContent: "center",
  },
  count2Text: { fontSize: 11, fontWeight: "600", color: "#fff" },

  sold: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0f172a59", alignItems: "center", justifyContent: "center" },
  soldTag: {
    height: 28,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: color.foreground,
    justifyContent: "center",
  },
  soldText: { fontSize: 12, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

  body: { padding: space.md },
  name: { fontSize: 16, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 },
  price: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  cur: { fontSize: 14, color: color.mutedForeground },
  kind: { fontSize: 12, color: color.mutedForeground },
  kindFixed: { color: color.danger, fontWeight: "600" },

  inst: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: radius.control,
    backgroundColor: color.brand + "12",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  instText: { fontSize: 13, fontWeight: "600", color: "#c2490f" },

  chips: { flexDirection: "row", gap: 6, marginTop: 11 },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f1f5f9", justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },
  chipOk: { backgroundColor: color.success + "1a" },
  chipOkText: { color: "#15803d", fontWeight: "600" },

  fleet: {
    marginTop: 10,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fleetText: { fontSize: 12, fontWeight: "600", color: color.foreground },
});
