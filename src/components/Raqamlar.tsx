/**
 * «Mening ishim» — 3-blok: raqamlar (TZ v2 §2.3, 2026-10-27).
 *
 * Webdagi «Mening daromadim» kartasining o'zi (`furam/src/components/home/
 * income-card.tsx`) — ma'lumot `/api/home` → `raqamlar` (`incomeFor`).
 * Valyutalar QO'SHILMAYDI: har biri alohida qator (2-qoida). Yuk egasida
 * daromad yo'q — server `null` beradi, karta chizilmaydi.
 */
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type RaqamlarData = {
  kind: "owner" | "dispatcher" | "sotuv";
  /** Bo'sh holat kaliti (`income.*`) — rolga mos (TZ 28-okt §23); eski server bermaydi */
  bosh?: string;
  days: number;
  income: string[];
  expenses: string[];
  net: string[];
  href: string;
};

export function Raqamlar({ d }: { d?: RaqamlarData | null }) {
  const router = useRouter();
  if (!d) return null;
  const qatorlar = [
    { k: "in", label: d.kind === "dispatcher" ? t("income.feeEarned") : t("income.revenue"), v: d.income, tone: color.success },
    { k: "out", label: d.kind === "dispatcher" ? t("income.feePending") : t("income.expense"), v: d.expenses, tone: d.kind === "dispatcher" ? color.mutedForeground : color.danger },
    { k: "net", label: t("income.net"), v: d.net, tone: color.foreground },
  ].filter((q) => q.v.length > 0);

  return (
    <Tap
      onPress={() => {
        const to = webToApp(d.href);
        if (to) router.push(to as Parameters<typeof router.push>[0]);
      }}
      feel="select"
      scale={0.98}
      style={s.card}
    >
      <View style={s.head}>
        <Text style={s.title}>{t("income.title")}</Text>
        <Text style={s.days}>{t("income.days", { n: d.days })}</Text>
      </View>
      {qatorlar.length === 0 ? (
        <Text style={s.empty}>{t(`income.${d.bosh ?? "empty"}`)}</Text>
      ) : (
        qatorlar.map((q) => (
          <View key={q.k} style={s.row}>
            <Text style={s.label}>{q.label}</Text>
            <View style={{ alignItems: "flex-end" }}>
              {q.v.map((x) => (
                <Text key={x} style={[s.value, { color: q.tone }]}>
                  {x}
                </Text>
              ))}
            </View>
          </View>
        ))
      )}
    </Tap>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 8, ...shadow.card },
  head: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  title: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  days: { fontSize: 11, color: color.mutedForeground },
  row: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const, gap: 12 },
  label: { fontSize: 13, color: color.mutedForeground },
  value: { fontSize: 15, fontFamily: "Manrope_700Bold" },
  empty: { fontSize: 13, color: color.mutedForeground },
}));
