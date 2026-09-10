/**
 * Saqlangan qidiruvlar — yangi e'lon chiqqanda xabar keladi.
 *
 * ── NIMA UCHUN RO'YXAT KERAK ────────────────────────────────────
 *
 * Saqlash tugmasi bor-u ro'yxat bo'lmasa, odam nechta qidiruv
 * saqlaganini bilmaydi va chegaraga (20 ta) yetganda «nega
 * saqlanmadi» degan savol bilan qolardi. Ustiga keraksizini
 * o'chirish yo'li ham bo'lmasdi — xabarlar esa kelaverardi.
 *
 * ── FILTRNI SO'Z BILAN YOZMAYMIZ ────────────────────────────────
 *
 * Server `params` ni XOM holda qaytaradi: joy va transport turi
 * ID lari. Ularni nomga aylantirish uchun ikkita qo'shimcha so'rov
 * kerak bo'lardi. Shuning uchun qatorda odam O'ZI qo'ygan nom
 * turadi; nom yo'q bo'lsa — nechta shart borligi. Bu yetadi:
 * ro'yxat o'chirish uchun ochiladi, o'qish uchun emas.
 */
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Params = {
  fromId?: number[];
  toId?: number[];
  vehicleTypeId?: number[];
  weightMin?: number;
  weightMax?: number;
};
type Row = {
  id: string;
  name: string | null;
  kind: "load" | "truck";
  params: Params;
  notify: boolean;
};

/** Nechta shart qo'yilgan — nom yo'q bo'lsa shu ko'rsatiladi */
function conditions(p: Params): number {
  let n = 0;
  if (p.fromId?.length) n++;
  if (p.toId?.length) n++;
  if (p.vehicleTypeId?.length) n++;
  if (p.weightMin != null || p.weightMax != null) n++;
  return n;
}

export default function SaqlanganQidiruv() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } =
    useApi<{ rows: Row[] }>("/api/saved-search");

  const remove = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        await api("/api/saved-search", { method: "POST", body: { action: "remove", id } });
        reload();
      } catch (e) {
        Alert.alert(t("mob.common.failed"), (e as FuramError).message ?? "");
      } finally {
        setBusy(null);
      }
    },
    [reload],
  );

  const rows = data?.rows ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.ssearch.title")} />

      {loading && !data ? (
        <View style={{ padding: space.lg }}>
          <Skeleton rows={3} />
        </View>
      ) : error && !data ? (
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
          }
          ListEmptyComponent={
            <Empty
              icon="heart"
              title={t("mob.ssearch.emptyTitle")}
              text={t("mob.ssearch.emptyText")}
              actionLabel={t("mob.nav.loads")}
              onAction={() => router.push("/yuklar")}
            />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.icon}>
                <Icon
                  name={item.kind === "load" ? "package" : "truck"}
                  size={19}
                  stroke={color.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>
                  {item.name ?? t(`mob.ssearch.kind.${item.kind}`)}
                </Text>
                <Text style={s.sub}>
                  {t("mob.ssearch.nConditions", { n: conditions(item.params) })}
                  {item.notify ? ` · ${t("mob.ssearch.notifyOn")}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => void remove(item.id)}
                disabled={busy === item.id}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("mob.common.delete")}
                style={({ pressed }) => [s.del, pressed && { opacity: 0.6 }]}
              >
                <Icon name="trash" size={17} stroke={color.danger} />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: 9 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  name: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2 },
  del: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
}));
