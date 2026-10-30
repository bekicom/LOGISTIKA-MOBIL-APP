/**
 * «PDF hujjatlarim» (TZ 29-okt §5.4): barcha PDF lar — nomi, turi, sanasi,
 * qaysi reys yoki mashinaga tegishli; qidiruv va filtr; bosilganda
 * «Yuborish». Web'dagi `components/skaner/pdf-royxat.tsx` egizagi.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { HujjatYuborish } from "@/components/HujjatYuborish";
import { useApi } from "@/lib/use-api";
import { openRemoteFile } from "@/lib/files";
import { t } from "@/lib/i18n";
import { color, font, radius, space, themed } from "@/lib/theme";

type Hujjat = {
  id: string;
  nom: string;
  kind: string | null;
  aiTur: string | null;
  sana: string;
  sahifalar: number | null;
  reys: { id: string; raqam: number } | null;
  mashina: { id: string; raqam: string } | null;
  ulash: string;
};

const JOYLAR = ["", "shaxsiy", "reys", "mashina"] as const;
const TURLAR = ["passport", "license", "medical", "adr", "tech_passport", "insurance", "dozvol", "cmr", "invoice", "receipt", "other"];

export default function PdfHujjatlar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [joy, setJoy] = useState<(typeof JOYLAR)[number]>("");
  const [tanlangan, setTanlangan] = useState<Hujjat | null>(null);
  const sp = new URLSearchParams();
  if (q.trim()) sp.set("q", q.trim());
  if (joy) sp.set("joy", joy);
  const { data, loading, error, reload, refreshing, refresh } = useApi<{ hujjatlar: Hujjat[] }>(`/api/skaner/hujjatlar?${sp}`, [
    q,
    joy,
  ]);

  const turNomi = (h: Hujjat) => (h.aiTur && TURLAR.includes(h.aiTur) ? t(`skaner.tur.${h.aiTur}`) : (h.kind ?? ""));

  return (
    <View style={s.root}>
      <Header
        title={t("skaner.list")}
        right={
          <Pressable onPress={() => router.push("/hujjatlarim/skaner")} hitSlop={8}>
            <Text style={s.qosh}>📷 {t("skaner.pdfQilish")}</Text>
          </Pressable>
        }
      />
      <View style={s.filtrlar}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("skaner.search")}
          placeholderTextColor={color.mutedForeground}
          style={s.qidiruv}
        />
        <View style={s.chiplar}>
          {JOYLAR.map((j) => (
            <Pressable key={j || "all"} onPress={() => setJoy(j)} style={[s.chip, joy === j && s.chipTanlangan]}>
              <Text style={[s.chipMatn, joy === j && { color: color.brand }]}>{j ? t(`skaner.joy.${j}`) : t("skaner.filterAll")}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data?.hujjatlar ?? []}
          keyExtractor={(h) => h.id}
          contentContainerStyle={s.royxat}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
          ListEmptyComponent={
            <Empty
              icon="doc"
              title={t("skaner.listEmpty")}
              actionLabel={t("skaner.pdfQilish")}
              onAction={() => router.push("/hujjatlarim/skaner")}
            />
          }
          renderItem={({ item: h }) => (
            <View style={s.karta}>
              <Text style={s.nom} numberOfLines={1}>
                {h.nom}
              </Text>
              <Text style={s.izoh} numberOfLines={1}>
                {[turNomi(h), h.sana.slice(0, 10), h.sahifalar ? t("skaner.pagesN", { n: h.sahifalar }) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {(h.reys || h.mashina) && (
                <Text style={s.bog} numberOfLines={1}>
                  {[h.reys ? `🚚 #${h.reys.raqam}` : null, h.mashina ? `🚛 ${h.mashina.raqam}` : null].filter(Boolean).join("  ")}
                </Text>
              )}
              <View style={s.tugmalar}>
                <Pressable style={s.tugma} onPress={() => void openRemoteFile(`/api/documents/${h.id}`, "hujjat.pdf").catch(() => {})}>
                  <Text style={s.tugmaMatn}>{t("skaner.open")}</Text>
                </Pressable>
                <Pressable style={[s.tugma, s.asosiy]} onPress={() => setTanlangan(h)}>
                  <Text style={[s.tugmaMatn, { color: color.brandForeground }]}>{t("skaner.send")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
      <HujjatYuborish ochiq={!!tanlangan} onClose={() => setTanlangan(null)} hujjat={tanlangan} />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  qosh: { fontSize: font.caption, fontWeight: "700" as const, color: color.brand },
  filtrlar: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  qidiruv: {
    height: 44,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    color: color.foreground,
    fontSize: font.body,
  },
  chiplar: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border },
  chipTanlangan: { borderColor: color.brand, backgroundColor: color.brandSoft },
  chipMatn: { fontSize: font.caption, fontWeight: "700" as const, color: color.foreground },
  royxat: { padding: space.lg, gap: space.sm },
  karta: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, borderWidth: 1, borderColor: color.border },
  nom: { fontSize: font.body, fontWeight: "700" as const, color: color.foreground },
  izoh: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  bog: { fontSize: font.caption, color: color.brand, fontWeight: "600" as const, marginTop: 2 },
  tugmalar: { flexDirection: "row" as const, gap: space.sm, marginTop: space.sm },
  tugma: {
    flex: 1,
    height: 40,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  asosiy: { backgroundColor: color.brand, borderColor: color.brand },
  tugmaMatn: { fontSize: font.caption, fontWeight: "700" as const, color: color.foreground },
}));
