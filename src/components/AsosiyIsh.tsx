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

/** Har son o'z ro'yxati bilan (TZ 28-okt §7) — eski server bermasa `undefined` */
export type IshSon = { kalit: string; n: number | string; href: string; ton?: "brand" | "success" | "warning" | "danger" };
type Umumiy = { sarlavha?: string; sonlar?: IshSon[] };

export type AsosiyIshData = Umumiy &
  (
  | { tur: "park"; bosh: number; reysda: number; tamirda: number; haydovchisiz: number; href: string }
  | { tur: "yuk"; faol: number; yolda: number; qiziqqan: number; href: string }
  | {
      tur: "haydovchi";
      reys: { id: string; no: number; status: string } | null;
      mosYuk: number;
      href: string;
      /** «Mashinam» (TZ v3 §15-5) — eski server bermasa `undefined` */
      mashina?: { vehicleId: string; plate: string; brand: string; turi: string; ega: string; ozimHaydayman: boolean } | null;
    }
  | { tur: "dispetcher"; faolYuk: number; reysda: number; bitim: number; href: string }
  /* Logistika va kichik rollar (TZ 28-okt §23) — faqat `sonlar` */
  | { tur: "rol"; href: string }
  );

type Son = { label: string; n: number | string; tone?: string; href?: string };

const TON = (): Record<NonNullable<IshSon["ton"]>, string> => ({
  brand: color.brand,
  success: color.success,
  warning: color.warning,
  danger: color.danger,
});

export function AsosiyIsh({ d }: { d?: AsosiyIshData | null }) {
  const router = useRouter();
  if (!d) return null;

  const [sarlavha, sonlar]: [string, Son[]] =
    d.sonlar && d.sarlavha
      ? [
          t(`ishim.${d.sarlavha}`),
          d.sonlar.map((x) => ({ label: t(`ishim.${x.kalit}`), n: x.n, tone: x.ton ? TON()[x.ton] : undefined, href: x.href })),
        ]
      : d.tur === "rol"
        ? ["", []]
        : d.tur === "park"
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

  if (d.tur === "rol" && sonlar.length === 0) return null;

  const ochish = (href = d.href) => {
    /* «Mos yuklar» — o'sha turdagi lenta (son = ro'yxat, TZ 28-okt §38) */
    const turi = /^\/loads\?vehicleTypeId=(\d+)$/.exec(href);
    if (turi) {
      const nomi = d.tur === "haydovchi" ? (d.mashina?.turi ?? "") : "";
      router.push(`/yuklar?turi=${turi[1]}&turiNomi=${encodeURIComponent(nomi)}` as never);
      return;
    }
    const to = webToApp(href);
    if (to) router.push(to as Parameters<typeof router.push>[0]);
  };

  return (
    <>
    <Tap onPress={() => ochish()} feel="select" scale={0.98} style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>{sarlavha}</Text>
        <Text style={s.open}>{t("ishim.open")} →</Text>
      </View>
      <View style={s.grid}>
        {/* Har son bosiladi — o'z ro'yxati ochiladi (TZ 28-okt §7) */}
        {sonlar.map((x) => (
          <Tap key={x.label} onPress={() => ochish(x.href)} feel="select" scale={0.97} style={s.cell}>
            <Text style={[s.n, x.tone ? { color: x.tone } : null]} numberOfLines={1}>
              {x.n}
            </Text>
            <Text style={s.label} numberOfLines={2}>
              {x.label}
            </Text>
          </Tap>
        ))}
      </View>
    </Tap>
    {/* «Mashinam» (TZ v3 §15-5): biriktirilgan mashina darhol ko'rinadi */}
    {d.tur === "haydovchi" && d.mashina !== undefined ? (
      <Tap
        onPress={() => router.push((d.mashina?.ozimHaydayman ? `/parkim/${d.mashina.vehicleId}` : "/panelim") as never)}
        feel="select"
        scale={0.98}
        style={s.coach}
      >
        <Text style={s.coachText} numberOfLines={2}>
          🚛 {d.mashina ? `${t("ishim.mashinam")}: ${d.mashina.plate} · ${d.mashina.brand} — ${d.mashina.ega}` : t("ishim.mashinaYoq")}
        </Text>
      </Tap>
    ) : null}
    {/* Dispetcher murabbiyi (TZ v2 §3.4.7, A15) — webdagi havola bilan bir xil */}
    {d.tur === "dispetcher" ? (
      <Tap onPress={() => router.push("/murabbiy" as never)} feel="select" scale={0.98} style={s.coach}>
        <Text style={s.coachText}>{t("murabbiy.title")}</Text>
        <Text style={s.coachText}>→</Text>
      </Tap>
    ) : null}
    </>
  );
}

const s = themed(() => ({
  coach: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 12,
    borderRadius: radius.control,
    backgroundColor: color.brandSoft,
  },
  coachText: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.brand },
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 10, ...shadow.card },
  head: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  title: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  open: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: color.brand },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  cell: { flexGrow: 1, flexBasis: "45%" as const, padding: 10, borderRadius: radius.control, backgroundColor: color.muted },
  n: { fontSize: 20, fontFamily: "Manrope_800ExtraBold", color: color.foreground },
  label: { fontSize: 11, color: color.mutedForeground },
}));
