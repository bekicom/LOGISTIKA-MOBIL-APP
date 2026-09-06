/**
 * Suhbatdagi hodisalar ro'yxati (TZ 02, 29-30-band).
 * `GET /api/incidents?chatId=` — ilova uchun qo'shildi (2026-09-06).
 */
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Inc = { id: string; kind: string; title: string; status: string; placeName: string | null; createdBy: string | null; createdAt: string; items: number };

const TONE: Record<string, { fg: string; bg: string }> = {
  OPEN: { fg: color.danger, bg: color.dangerSoft },
  IN_PROGRESS: { fg: color.warning, bg: color.warningSoft },
  RESOLVED: { fg: color.success, bg: color.successSoft },
};

export default function Hodisalar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{ incidents: Inc[] }>(
    id ? `/api/incidents?chatId=${id}` : null,
    [id],
  );
  const items = data?.incidents ?? [];
  const open = items.filter((i) => i.status !== "RESOLVED").length;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.inc.title")}
        subtitle={items.length ? (open > 0 ? t("mob.inc.openN", { n: open }) : t("mob.inc.status.RESOLVED")) : undefined}
        right={
          <Pressable
            onPress={() => router.push({ pathname: "/suhbat/[id]/amal", params: { id: String(id), kind: "incident" } })}
            hitSlop={8}
            style={s.add}
          >
            <Icon name="plus" size={18} stroke="#fff" />
          </Pressable>
        }
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item }) => {
          const tone = TONE[item.status] ?? TONE.OPEN;
          return (
            <Pressable onPress={() => router.push(`/hodisa/${item.id}`)} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
              <View style={[s.icon, { backgroundColor: tone.bg }]}>
                <Icon name="alert" size={20} stroke={tone.fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <Text style={s.sub} numberOfLines={1}>
                  {t(`mob.inc.kind.${item.kind}`)}{item.placeName ? ` · ${item.placeName}` : ""}
                </Text>
                <Text style={s.meta}>{item.createdBy} · {item.createdAt} · {t("mob.common.countN", { n: item.items })}</Text>
              </View>
              <View style={[s.status, { backgroundColor: tone.bg }]}>
                <Text style={[s.statusText, { color: tone.fg }]}>{t(`mob.inc.status.${item.status}`)}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? <Skeleton rows={2} /> : error ? <ErrorBox message={error} onRetry={reload} /> : <Empty icon="alert" title={t("mob.inc.none")} />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  list: { padding: space.lg, gap: space.sm },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.card, borderRadius: radius.card, padding: space.md, ...shadow.card },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14.5, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },
  meta: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  status: { paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: "center" },
  statusText: { fontSize: 11, fontWeight: "700" },
});
