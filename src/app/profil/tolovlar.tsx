/**
 * To'lovlar tarixi — tarif va balans to'ldirishlari.
 *
 * ⚠️ NARX YO'Q, TO'LOV TUGMASI YO'Q — bu faqat TARIX. iOS'da
 * o'tgan to'lovni ko'rsatish taqiqlanmagan; taqiqlangani ilova
 * ichida sotish (App Store 3.1.1), u esa bu ekranda yo'q.
 */
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { currentLocale, t, tOr } from "@/lib/i18n";

type Pay = {
  id: string; amount: number; currency: string; provider: string | null;
  status: string; purpose: string; plan: string | null; createdAt: string;
};

const TONE: Record<string, { fg: string; bg: string }> = {
  PAID: { fg: color.success, bg: color.successSoft },
  PENDING: { fg: color.brand, bg: color.brandSoft },
  FAILED: { fg: color.danger, bg: color.dangerSoft },
  REFUNDED: { fg: color.mutedForeground, bg: color.muted },
};

function when(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(currentLocale(), { day: "numeric", month: "short", year: "numeric" })} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Tolovlar() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{ payments: Pay[] }>("/api/profile/payments");
  const rows = data?.payments ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.pay.title")} />
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshing={refreshing}
        onRefresh={refresh}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const tone = TONE[item.status] ?? TONE.PENDING;
          /* Nomi: tarif rejasi bo'lsa u, bo'lmasa to'lov maqsadi.
             Ikkalasi ham KALIT bo'lib keladi. */
          const name = item.plan
            ? tOr(`mob.pay.plan.${item.plan}`, item.plan)
            : tOr(`mob.pay.purpose.${item.purpose}`, item.purpose);
          return (
            <View style={s.card}>
              <View style={[s.icon, { backgroundColor: tone.bg }]}>
                <Icon name="wallet" size={20} stroke={tone.fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={s.name} numberOfLines={1}>{name}</Text>
                  {item.provider ? <Text style={s.provider}>{item.provider.toUpperCase()}</Text> : null}
                </View>
                <Text style={s.meta}>{when(item.createdAt)}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={s.amount}>{fmtNum(item.amount)} {item.currency}</Text>
                <View style={[s.status, { backgroundColor: tone.bg }]}>
                  <Text style={[s.statusText, { color: tone.fg }]}>{tOr(`mob.pay.status.${item.status}`, item.status)}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? <Skeleton rows={2} /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
            <Empty icon="wallet" title={t("mob.pay.empty")} text={t("mob.pay.emptyHint")} />
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: space.sm },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.card, borderRadius: radius.card, padding: space.md, ...shadow.card },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14.5, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  provider: { fontSize: 10, fontWeight: "700", color: color.mutedForeground, letterSpacing: 0.4 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  amount: { fontSize: 14.5, fontWeight: "800", color: color.foreground, fontVariant: ["tabular-nums"] },
  status: { paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: "center" },
  statusText: { fontSize: 10.5, fontWeight: "700" },
});
