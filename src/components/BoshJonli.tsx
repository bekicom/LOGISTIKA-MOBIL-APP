/**
 * Bosh sahifa — web bilan bir xil bloklar (6-qoida, TZ 28-okt §6, §24):
 *
 *   Statistika   — mehmon ko'radigan sonlar, har biri o'z ro'yxatini ochadi
 *   JonliKartalar — 3–5 jonli mos e'lon «Taklif qilish» bilan
 *   BozorBand    — FURAM Bozorning oxirgi 4 e'loni rasm bilan
 *
 * Ma'lumot `/api/home?v=2` dan (`kpis`, `jonli`, `bozor`) — webdagi
 * `Kpis`, `JonliKartalar`, `MarketBand` bilan bitta server funksiyasi.
 * Eski server bermasa — bloklar chizilmaydi.
 */
import { Image, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { webToApp } from "@/lib/routes";
import { salePhoto } from "@/lib/img";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type KpiData = { key: string; value: number; today: number | null; suffix: string | null; href: string };
export type JonliData = {
  sarlavha: "mosMashinalar" | "mosYuklar" | "yangiYuklar";
  yonalish?: string;
  items: {
    id: string;
    kind: "load" | "truck";
    href: string;
    fromName: string;
    toName: string;
    vehicleTypeName: string;
    weightT: number | null;
    price: number | null;
    currency: string;
    isNegotiable: boolean;
    foiz?: number;
  }[];
  hammasi: { href: string; n: number };
};
export type BozorData = {
  id: string;
  brand: string;
  model: string | null;
  year: number | null;
  price: number;
  currency: string;
  photo: string | null;
  badge: "VIP" | "TOP" | null;
  location: string | null;
};

const son = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ");
const qisqa = (s: string) => s.replace(" viloyati", "").replace(" Respublikasi", "");

function useOch() {
  const router = useRouter();
  return (href: string) => {
    const to = webToApp(href);
    if (to) router.push(to as Parameters<typeof router.push>[0]);
  };
}

/** Statistika — har son bosiladi (TZ 28-okt §6, §7) */
export function Statistika({ items }: { items?: KpiData[] | null }) {
  const och = useOch();
  if (!items?.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kpiQator}>
      {items.map((k) => (
        <Tap key={k.key} onPress={() => och(k.href)} feel="select" scale={0.97} style={s.kpi}>
          <Text style={s.kpiN} numberOfLines={1}>
            {son(k.value)}
            {k.suffix ?? ""}
          </Text>
          <Text style={s.kpiL} numberOfLines={2}>
            {t(`kpi.${k.key}`)}
          </Text>
          {k.today != null ? <Text style={s.kpiBugun}>{t("kpi.addedToday", { n: k.today })}</Text> : null}
        </Tap>
      ))}
    </ScrollView>
  );
}

/** Jonli mos e'lonlar — «Taklif qilish» bilan (TZ 28-okt §24) */
export function JonliKartalar({ d }: { d?: JonliData | null }) {
  const router = useRouter();
  const och = useOch();
  if (!d?.items.length) return null;
  const taklif = (href: string) => {
    const to = webToApp(href);
    if (to) router.push(`${to}?taklif=1` as never);
  };
  return (
    <View style={{ gap: space.sm }}>
      <View style={s.bosh}>
        <View style={{ flex: 1 }}>
          <Text style={s.sarlavha}>{t(`jonli.${d.sarlavha}`)}</Text>
          {d.yonalish ? <Text style={s.izoh}>{d.yonalish}</Text> : null}
        </View>
        <Tap onPress={() => och(d.hammasi.href)} feel="select">
          <Text style={s.hammasi}>{t("jonli.hammasi", { n: d.hammasi.n })} →</Text>
        </Tap>
      </View>
      {d.items.map((k) => (
        <View key={k.id} style={s.karta}>
          <Tap onPress={() => och(k.href)} feel="select" scale={0.98}>
            <Text style={s.yonalish} numberOfLines={1}>
              {qisqa(k.fromName)} → {qisqa(k.toName)}
            </Text>
            <Text style={s.izoh} numberOfLines={1}>
              {k.vehicleTypeName}
              {k.weightT != null ? ` · ${k.weightT} t` : ""}
              {k.foiz != null ? ` · ${t("jonli.mos", { n: k.foiz })}` : ""}
            </Text>
            <Text style={s.narx}>
              {k.isNegotiable || k.price == null ? t("jonli.kelishiladi") : `${son(k.price)} ${k.currency}`}
            </Text>
          </Tap>
          <Tap onPress={() => taklif(k.href)} feel="select" scale={0.97} style={s.taklifBtn}>
            <Text style={s.taklifMatn}>🤝 {t("taklif.yuborish")}</Text>
          </Tap>
        </View>
      ))}
    </View>
  );
}

/** FURAM Bozor — oxirgi 4 e'lon rasm bilan (TZ 28-okt §24) */
export function BozorBand({ items }: { items?: BozorData[] | null }) {
  const router = useRouter();
  if (!items?.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <View style={s.bosh}>
        <Text style={[s.sarlavha, { flex: 1 }]}>{t("jonli.bozor")}</Text>
        <Tap onPress={() => router.push("/bozor" as never)} feel="select">
          <Text style={s.hammasi}>{t("homeMarket.all")} →</Text>
        </Tap>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {items.map((b) => (
          <Tap key={b.id} onPress={() => router.push(`/bozor/${b.id}` as never)} feel="select" scale={0.97} style={s.bozor}>
            <View style={s.rasm}>
              {b.photo ? <Image source={salePhoto(b.id, b.photo)} style={s.rasmImg} resizeMode="cover" /> : null}
              {b.badge ? (
                <View style={s.nishon}>
                  <Text style={s.nishonMatn}>{b.badge}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ padding: 10, gap: 2 }}>
              <Text style={s.yonalish} numberOfLines={1}>
                {b.brand} {b.model ?? ""}
              </Text>
              <Text style={s.izoh} numberOfLines={1}>
                {[b.year, b.location].filter(Boolean).join(" · ")}
              </Text>
              <Text style={s.narx}>
                {son(b.price)} {b.currency}
              </Text>
            </View>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  kpiQator: { gap: space.sm, paddingVertical: 2 },
  kpi: { width: 128, padding: 12, borderRadius: radius.card, backgroundColor: color.card, gap: 2, ...shadow.card },
  kpiN: { fontSize: 20, fontFamily: "Manrope_800ExtraBold", color: color.foreground },
  kpiL: { fontSize: 11, color: color.mutedForeground },
  kpiBugun: { fontSize: 11, fontFamily: "Manrope_700Bold", color: color.success },
  bosh: { flexDirection: "row" as const, alignItems: "center" as const, gap: space.sm },
  sarlavha: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  hammasi: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: color.brand },
  izoh: { fontSize: 12, color: color.mutedForeground },
  karta: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 8, ...shadow.card },
  yonalish: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  narx: { fontSize: 15, fontFamily: "Manrope_800ExtraBold", color: color.foreground, marginTop: 2 },
  taklifBtn: { minHeight: 40, borderRadius: radius.control, backgroundColor: color.brand, alignItems: "center" as const, justifyContent: "center" as const },
  taklifMatn: { fontSize: 13, fontFamily: "Manrope_700Bold", color: "#ffffff" },
  bozor: { width: 200, borderRadius: radius.card, backgroundColor: color.card, overflow: "hidden" as const, ...shadow.card },
  rasm: { height: 120, backgroundColor: color.muted },
  rasmImg: { width: "100%" as const, height: "100%" as const },
  nishon: { position: "absolute" as const, top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: color.brand },
  nishonMatn: { fontSize: 10, fontFamily: "Manrope_800ExtraBold", color: "#ffffff" },
}));
