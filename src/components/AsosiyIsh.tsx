/**
 * «Mening ishim» — 2-blok: rolning asosiy ishi (TZ v2 §2.3, 2026-10-27).
 *
 * Ma'lumot `/api/home` → `asosiy` dan (webdagi `asosiy-ish-karta.tsx` bilan
 * bitta server funksiyasi — `furam/src/lib/mening-ishim.ts`). Matn lug'atdan.
 * Eski server maydonni yubormasa — chizilmaydi.
 */
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type AsosiyIshData =
  | { tur: "park"; bosh: number; reysda: number; tamirda: number; haydovchisiz: number; href: string }
  | { tur: "yuk"; faol: number; yolda: number; qiziqqan: number; href: string }
  | { tur: "haydovchi"; reys: { id: string; no: number; status: string } | null; mosYuk: number; href: string }
  | { tur: "dispetcher"; faolYuk: number; reysda: number; bitim: number; href: string };

type Son = { label: string; n: number | string; tone?: string };

export function AsosiyIsh({ d }: { d?: AsosiyIshData | null }) {
  const router = useRouter();
  if (!d) return null;

  const [sarlavha, sonlar]: [string, Son[]] =
    d.tur === "park"
      ? [
          t("ishim.parkTitle"),
          [
            { label: t("ishim.bosh"), n: d.bosh, tone: d.bosh > 0 ? color.warning : undefined },
            { label: t("ishim.reysda"), n: d.reysda, tone: color.success },
            { label: t("ishim.tamirda"), n: d.tamirda },
            { label: t("ishim.haydovchisiz"), n: d.haydovchisiz, tone: d.haydovchisiz > 0 ? color.danger : undefined },
          ],
        ]
      : d.tur === "yuk"
        ? [
            t("ishim.yukTitle"),
            [
              { label: t("ishim.faol"), n: d.faol },
              { label: t("ishim.yolda"), n: d.yolda, tone: color.success },
              { label: t("ishim.qiziqqan"), n: d.qiziqqan, tone: d.qiziqqan > 0 ? color.brand : undefined },
            ],
          ]
        : d.tur === "haydovchi"
          ? [
              t("ishim.haydovchiTitle"),
              [
                { label: t("ishim.reys"), n: d.reys ? `#${d.reys.no}` : t("ishim.reysYoq") },
                { label: t("ishim.mosYuk"), n: d.mosYuk, tone: d.mosYuk > 0 ? color.brand : undefined },
              ],
            ]
          : [
              t("ishim.dispTitle"),
              [
                { label: t("ishim.faolYuk"), n: d.faolYuk },
                { label: t("ishim.kuzatuvda"), n: d.reysda, tone: color.success },
                { label: t("ishim.bitim"), n: d.bitim, tone: color.brand },
              ],
            ];

  const ochish = () => {
    const to = webToApp(d.href);
    if (to) router.push(to as Parameters<typeof router.push>[0]);
  };

  return (
    <Tap onPress={ochish} feel="select" scale={0.98} style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>{sarlavha}</Text>
        <Text style={s.open}>{t("ishim.open")} →</Text>
      </View>
      <View style={s.grid}>
        {sonlar.map((x) => (
          <View key={x.label} style={s.cell}>
            <Text style={[s.n, x.tone ? { color: x.tone } : null]} numberOfLines={1}>
              {x.n}
            </Text>
            <Text style={s.label} numberOfLines={2}>
              {x.label}
            </Text>
          </View>
        ))}
      </View>
    </Tap>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 10, ...shadow.card },
  head: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  title: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  open: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: color.brand },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  cell: { flexGrow: 1, flexBasis: "45%" as const, padding: 10, borderRadius: radius.control, backgroundColor: color.muted },
  n: { fontSize: 20, fontFamily: "Manrope_800ExtraBold", color: color.foreground },
  label: { fontSize: 11, color: color.mutedForeground },
}));
