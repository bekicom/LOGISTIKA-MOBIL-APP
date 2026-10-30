/**
 * Postlarning bandligi — ilovada (TZ v3 §15-18).
 *
 * Web `/queues/kalendar` dagi yuklama jadvali bilan BITTA manba
 * (`GET /api/queues/bandlik` → `yuklamaMalumoti`). Har post — keyingi 14
 * kunning bo'sh joy soni rang bilan: yashil (ko'p), sariq (kam), qizil
 * (yo'q), kulrang (ma'lumot yo'q / dam), to'q sariq (o'zimniki).
 * Ochiq manba uzilsa ham oxirgi ma'lumot «X soat oldin» yozuvi bilan.
 */
import { useEffect, useRef } from "react";
import { AppState, FlatList, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Tap } from "@/components/Tap";
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

/* Ranglar bir-biridan ANIQ farq qiladi (TZ 29-okt §8.3): ilgari «post
   ishlamaydi» va «ma'lumot yo'q» bir xil kulrang edi */
const RANG = {
  meniki: "#7c3aed",
  dam: "#475569",
  yoq: "#cbd5e1",
  band: color.danger,
  kam: color.warning,
  kop: color.success,
} as const;

function rang(k: Kun): string {
  if (k.meniki) return RANG.meniki;
  if (k.dam) return RANG.dam;
  if (k.bosh == null) return RANG.yoq;
  if (k.bosh === 0) return RANG.band;
  if (k.bosh <= 10) return RANG.kam;
  return RANG.kop;
}

/** Bugungi mahalliy sana, "2026-10-30" — o'tgan kunlar ko'rsatilmaydi (§8.4) */
function bugun(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const LEGENDA: { k: keyof typeof RANG; key: string }[] = [
  { k: "kop", key: "tz5e.legKop" },
  { k: "kam", key: "tz5e.legKam" },
  { k: "band", key: "tz5e.legBand" },
  { k: "meniki", key: "tz5e.legMeniki" },
  { k: "dam", key: "tz5e.legDam" },
  { k: "yoq", key: "tz5e.legYoq" },
];

export default function PostlarBandligi() {
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Javob>("/api/queues/bandlik");
  /* Ochiq ekran o'zi yangilanadi (TZ 29-okt §8.4): har 10 daqiqada va ilovaga qaytilganda */
  const qayta = useRef(reload);
  useEffect(() => {
    qayta.current = reload;
  });
  useEffect(() => {
    const t = setInterval(() => qayta.current(), 10 * 60_000);
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") qayta.current();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);
  const kun0 = bugun();
  const soat = data?.cgrAtISO ? Math.max(0, Math.round((Date.now() - new Date(data.cgrAtISO).getTime()) / 3_600_000)) : null;

  return (
    <View style={s.root}>
      <Header
        title={t("tz5e.postKalendarTitle")}
        subtitle={soat != null ? t("reysShablon.yangilangan", { n: soat }) : undefined}
      />
      <FlatList
        data={data?.postlar ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            {/* Navbat vazifalariga havola (TZ 29-okt §8.2) */}
            <Tap onPress={() => router.push("/navbat")} style={s.havola}>
              <Text style={s.havolaMatn}>{t("tz5e.navbatVazifaLink")} →</Text>
            </Tap>
            <View style={s.legenda}>
              {LEGENDA.map((l) => (
                <View key={l.k} style={s.legBand}>
                  <View style={[s.legKatak, { backgroundColor: RANG[l.k] }]} />
                  <Text style={s.legMatn}>{t(l.key)}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item: p }) => (
          <View style={s.card}>
            <Text style={s.nom} numberOfLines={1}>
              {p.nom} <Text style={s.davlat}>· {p.davlat}</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {p.kunlar.filter((k) => k.kun >= kun0).slice(0, KUN_SONI).map((k) => (
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
  havola: { padding: 12, borderRadius: radius.card, backgroundColor: color.brand },
  havolaMatn: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  legenda: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legBand: { flexDirection: "row", alignItems: "center", gap: 4 },
  legKatak: { width: 12, height: 12, borderRadius: 3 },
  legMatn: { fontSize: 12, color: color.mutedForeground },
  kunSon: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
}));
