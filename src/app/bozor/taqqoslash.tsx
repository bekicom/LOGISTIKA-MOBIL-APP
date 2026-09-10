/**
 * B3 — e'lonlarni taqqoslash.
 *
 * ── NEGA USTUN, RO'YXAT EMAS ────────────────────────────────────
 *
 * Taqqoslashning butun ma'nosi — bir qatorda uch qiymatni yonma-yon
 * ko'rish. Kartochkalar ketma-ket tursa, odam yuqoriga qaytib
 * eslab qolishga majbur bo'ladi va taqqoslash yo'qoladi.
 *
 * ── FARQI BOR QATOR AJRATILADI ──────────────────────────────────
 *
 * Uchalasida bir xil qiymat turgan qator ko'zni chalg'itadi. Farqi
 * bor qator qalinroq: e'tibor aynan shu yerga kerak.
 */
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Header } from "@/components/ui";
import { Empty, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { clearCompare, toggleCompare, useCompare } from "@/lib/compare";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { saleCategoryLabel, saleSpecLabel, t } from "@/lib/i18n";

type Sale = {
  id: string;
  brand: string;
  model: string | null;
  year: number | null;
  odometer: number | null;
  price: number;
  currency: string;
  category: string;
  engineL: number | null;
  fuel: string | null;
  gearbox: string | null;
  capacityT: number | null;
  condition: string | null;
  location: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

export default function Taqqoslash() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ids = useCompare();

  return (
    <View style={s.root}>
      <Header
        title={t("mob.cmp.title")}
        right={
          ids.length > 0 ? (
            <Pressable onPress={clearCompare} hitSlop={8}>
              <Text style={s.clear}>{t("mob.cmp.clear")}</Text>
            </Pressable>
          ) : undefined
        }
      />

      {ids.length === 0 ? (
        <View style={{ padding: space.lg }}>
          <Empty
            icon="tag"
            title={t("mob.cmp.empty")}
            text={t("mob.cmp.emptyHint")}
            actionLabel={t("mob.market.title")}
            onAction={() => router.replace("/bozor")}
          />
        </View>
      ) : (
        <Rows ids={ids} bottom={insets.bottom} />
      )}
    </View>
  );
}

function Rows({ ids, bottom }: { ids: string[]; bottom: number }) {
  const router = useRouter();
  /* Har e'lon alohida so'raladi: ro'yxat uchtadan oshmaydi va
     ular uchun maxsus marshrut yozish ortiqcha bo'lardi. */
  const a = useApi<{ sale: Sale }>(ids[0] ? `/api/market/${ids[0]}` : null, [ids[0]]);
  const b = useApi<{ sale: Sale }>(ids[1] ? `/api/market/${ids[1]}` : null, [ids[1]]);
  const c = useApi<{ sale: Sale }>(ids[2] ? `/api/market/${ids[2]}` : null, [ids[2]]);

  const items = [a.data?.sale, b.data?.sale, c.data?.sale].filter(Boolean) as Sale[];
  const loading = (a.loading && !a.data) || (b.loading && !b.data) || (c.loading && !c.data);

  if (loading) {
    return (
      <View style={{ padding: space.lg }}>
        <Skeleton rows={4} />
      </View>
    );
  }

  const rows: { k: string; v: (x: Sale) => string }[] = [
    { k: t("mob.sale.price"), v: (x) => `${fmt(x.price)} ${x.currency}` },
    { k: t("mob.vehicle.year"), v: (x) => (x.year != null ? String(x.year) : "—") },
    { k: t("mob.svcRec.odometer"), v: (x) => (x.odometer != null ? `${fmt(x.odometer)} km` : "—") },
    { k: t("mob.sale.category"), v: (x) => saleCategoryLabel(x.category) },
    { k: saleSpecLabel("engineL"), v: (x) => (x.engineL != null ? `${x.engineL} L` : "—") },
    { k: saleSpecLabel("fuel"), v: (x) => (x.fuel ? saleSpecLabel(x.fuel) : "—") },
    { k: saleSpecLabel("gearbox"), v: (x) => (x.gearbox ? saleSpecLabel(x.gearbox) : "—") },
    { k: t("mob.vehicle.capacity"), v: (x) => (x.capacityT != null ? `${x.capacityT} t` : "—") },
    { k: t("mob.loads.from"), v: (x) => x.location ?? "—" },
  ];

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: bottom + space.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Sarlavhalar */}
      <View style={s.head}>
        {items.map((x) => (
          <Pressable key={x.id} style={s.col} onPress={() => router.push(`/bozor/${x.id}`)}>
            <Text style={s.name} numberOfLines={2}>
              {[x.brand, x.model].filter(Boolean).join(" ")}
            </Text>
            <Pressable onPress={() => toggleCompare(x.id)} hitSlop={8} style={s.drop}>
              <Icon name="close" size={13} stroke={color.mutedForeground} />
            </Pressable>
          </Pressable>
        ))}
      </View>

      {rows.map((r) => {
        const vals = items.map((x) => r.v(x));
        /* Uchalasida bir xil bo'lsa — e'tibor talab qilmaydi */
        const same = vals.every((v) => v === vals[0]);
        return (
          <View key={r.k} style={s.row}>
            <Text style={s.rowKey}>{r.k}</Text>
            <View style={s.rowVals}>
              {vals.map((v, i) => (
                <Text key={i} style={[s.val, !same && s.valDiff]} numberOfLines={2}>
                  {v}
                </Text>
              ))}
            </View>
          </View>
        );
      })}

      <View style={{ marginTop: space.lg }}>
        <Button title={t("mob.cmp.addMore")} variant="secondary" onPress={() => router.push("/bozor")} />
      </View>
    </ScrollView>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },
  clear: { fontSize: 13, fontWeight: "700", color: color.danger },

  head: { flexDirection: "row", gap: 8, marginBottom: space.md },
  col: {
    flex: 1,
    backgroundColor: color.card,
    borderRadius: radius.control,
    padding: space.md,
    ...shadow.card,
  },
  name: { fontSize: 13, fontWeight: "800", color: color.foreground },
  drop: { alignSelf: "flex-start", marginTop: 6 },

  row: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingVertical: 10,
  },
  rowKey: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground, marginBottom: 5 },
  rowVals: { flexDirection: "row", gap: 8 },
  val: { flex: 1, fontSize: 13, color: color.mutedForeground },
  valDiff: { color: color.foreground, fontWeight: "700" },
}));
