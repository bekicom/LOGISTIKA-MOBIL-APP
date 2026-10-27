/**
 * A15 «Dispetcher murabbiyi» (TZ v2 §3.4.7, 2026-10-27).
 *
 * Webdagi `/murabbiy` ning o'zi: bugungi vazifa (3 ta yuk + mos mashinalar),
 * o'quv yo'li (bajarilgani faktdan), tayyor xabar matnlari (nusxa), haftalik
 * natija. Ma'lumot — `/api/murabbiy`. Ro'yxatlar CHEGARALANGAN (3 yuk,
 * 5 dars, 3 matn) — shuning uchun ScrollView (`test-lists-mobile.ts`).
 */
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Data = {
  darslar: { kalit: string; bajarildi: boolean; href: string }[];
  vazifa: { id: string; slug: string; yonalish: string; mosMashina: number }[];
  natija: { reys: number; taklif: number; bitim: number; komissiya: string[]; yonalish: string | null };
};

const MATNLAR = ["yuk", "haydovchi", "mijoz"] as const;

export default function Murabbiy() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Data>("/api/murabbiy");
  const [nusxa, setNusxa] = useState<string | null>(null);
  const och = (href: string) => {
    const to = webToApp(href);
    if (to) router.push(to as Parameters<typeof router.push>[0]);
  };

  return (
    <View style={s.root}>
      <Header title={t("murabbiy.title")} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]} showsVerticalScrollIndicator={false}>
        <Text style={s.lead}>{t("murabbiy.sub")}</Text>
        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {data ? (
          <>
            <View style={s.card}>
              <Text style={s.h}>{t("murabbiy.vazifa")}</Text>
              {data.vazifa.length === 0 ? (
                <Text style={s.muted}>{t("murabbiy.vazifa_bosh")}</Text>
              ) : (
                <>
                  <Text style={s.body}>{t("murabbiy.vazifa_t")}</Text>
                  {data.vazifa.map((v) => (
                    <Tap key={v.id} onPress={() => och(`/loads/${v.slug}`)} feel="select" style={s.row}>
                      <Text style={s.rowTitle} numberOfLines={1}>{v.yonalish}</Text>
                      <Text style={[s.small, { color: v.mosMashina > 0 ? color.success : color.mutedForeground }]}>
                        {t("murabbiy.mos", { n: v.mosMashina })}
                      </Text>
                    </Tap>
                  ))}
                </>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.h}>{t("murabbiy.darslar")}</Text>
              {data.darslar.map((d, i) => (
                <Tap key={d.kalit} onPress={() => och(d.href)} feel="select" style={s.dars}>
                  <View style={[s.num, d.bajarildi && { backgroundColor: color.success }]}>
                    <Text style={[s.numText, d.bajarildi && { color: "#ffffff" }]}>{d.bajarildi ? "✓" : String(i + 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{t(`murabbiy.dars_${d.kalit}`)}</Text>
                    <Text style={s.muted}>{t(`murabbiy.dars_${d.kalit}_t`)}</Text>
                  </View>
                </Tap>
              ))}
            </View>

            <View style={s.card}>
              <Text style={s.h}>{t("murabbiy.matnlar")}</Text>
              {MATNLAR.map((k) => (
                <View key={k} style={s.matn}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={s.rowTitle}>{t(`murabbiy.matn_${k}`)}</Text>
                    <Tap
                      onPress={async () => {
                        await Clipboard.setStringAsync(t(`murabbiy.matn_${k}_t`));
                        setNusxa(k);
                      }}
                      feel="select"
                      style={s.copy}
                    >
                      <Text style={s.copyText}>{nusxa === k ? t("murabbiy.nusxaOlindi") : t("murabbiy.nusxa")}</Text>
                    </Tap>
                  </View>
                  <Text style={s.muted}>{t(`murabbiy.matn_${k}_t`)}</Text>
                </View>
              ))}
            </View>

            <View style={s.card}>
              <Text style={s.h}>{t("murabbiy.natija")}</Text>
              <View style={s.grid}>
                {(
                  [
                    [t("murabbiy.reys"), String(data.natija.reys)],
                    [t("murabbiy.taklif"), String(data.natija.taklif)],
                    [t("murabbiy.bitim"), String(data.natija.bitim)],
                    [t("murabbiy.komissiya"), data.natija.komissiya.join("\n") || "—"],
                  ] as const
                ).map(([nom, q]) => (
                  <View key={nom} style={s.cell}>
                    <Text style={s.small}>{nom}</Text>
                    <Text style={s.val}>{q}</Text>
                  </View>
                ))}
              </View>
              {data.natija.yonalish ? (
                <Text style={s.body}>
                  {t("murabbiy.yonalish")}: <Text style={{ fontFamily: "Manrope_700Bold" }}>{data.natija.yonalish}</Text>
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 14, color: color.mutedForeground },
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 8, ...shadow.card },
  h: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground, textTransform: "uppercase" as const },
  body: { fontSize: 14, color: color.foreground },
  muted: { fontSize: 13, color: color.mutedForeground, lineHeight: 18 },
  small: { fontSize: 12, color: color.mutedForeground },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  rowTitle: { flex: 1, fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  dars: { flexDirection: "row" as const, gap: 10, paddingVertical: 6 },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  numText: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground },
  matn: { borderWidth: 1, borderColor: color.border, borderRadius: radius.control, padding: 10, gap: 4 },
  copy: { borderWidth: 1, borderColor: color.border, borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: 4 },
  copyText: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.brand },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  cell: { minWidth: "45%" as const, flexGrow: 1, padding: 10, borderRadius: radius.control, backgroundColor: color.muted },
  val: { fontSize: 16, fontFamily: "Manrope_800ExtraBold", color: color.foreground },
}));
