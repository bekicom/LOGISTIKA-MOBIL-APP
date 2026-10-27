/**
 * Postlarning bandligi — ilovada (TZ v3 §15-18).
 *
 * Web `/queues/kalendar` dagi yuklama jadvali bilan BITTA manba
 * (`GET /api/queues/bandlik` → `yuklamaMalumoti`). Har post — keyingi 14
 * kunning bo'sh joy soni rang bilan: yashil (ko'p), sariq (kam), qizil
 * (yo'q), kulrang (ma'lumot yo'q / dam), to'q sariq (o'zimniki).
 * Ochiq manba uzilsa ham oxirgi ma'lumot «X soat oldin» yozuvi bilan.
 */
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Kun = { kun: string; bosh: number | null; dam: boolean; meniki: boolean };
type Post = { id: string; nom: string; davlat: string; kunlar: Kun[] };
type Javob = { postlar: Post[]; cgrAtISO: string | null };

/** Ekranda ko'rinadigan kunlar — chegaralangan (14), shuning uchun ScrollView */
const KUN_SONI = 14;

function rang(k: Kun): string {
  if (k.meniki) return color.brand;
  if (k.dam || k.bosh == null) return "#94a3b8";
  if (k.bosh === 0) return color.danger;
  if (k.bosh <= 10) return color.warning;
  return color.success;
}

export default function PostlarBandligi() {
  const { data, loading, error, refreshing, refresh, reload } = useApi<Javob>("/api/queues/bandlik");
  const soat = data?.cgrAtISO ? Math.max(0, Math.round((Date.now() - new Date(data.cgrAtISO).getTime()) / 3_600_000)) : null;

  return (
    <View style={s.root}>
      <Header
        title={t("reysShablon.postlarBandligi")}
        subtitle={soat != null ? t("reysShablon.yangilangan", { n: soat }) : undefined}
      />
      <FlatList
        data={data?.postlar ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item: p }) => (
          <View style={s.card}>
            <Text style={s.nom} numberOfLines={1}>
              {p.nom} <Text style={s.davlat}>· {p.davlat}</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {p.kunlar.slice(0, KUN_SONI).map((k) => (
                <View key={k.kun} style={[s.kun, { backgroundColor: rang(k) }]}>
                  <Text style={s.kunSana}>{k.kun.slice(8, 10)}</Text>
                  <Text style={s.kunSon}>{k.dam ? "—" : k.bosh ?? "?"}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        ListEmptyComponent={
          loading ? <Skeleton rows={4} /> : error ? <ErrorBox message={error} onRetry={reload} /> : <Empty icon="border" title={t("reysShablon.postYoq")} />
        }
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: space.md },
  card: { padding: 12, gap: 8, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  nom: { fontSize: 15, fontWeight: "800", color: color.foreground },
  davlat: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  kun: { width: 38, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  kunSana: { fontSize: 10, fontWeight: "700", color: "#ffffff" },
  kunSon: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
}));
