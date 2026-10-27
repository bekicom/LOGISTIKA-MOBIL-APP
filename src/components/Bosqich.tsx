/**
 * «0 dan 100 gacha» — odamning yo'li va keyingi qadam (TZ v2 §3.4.1 / A16, 2026-10-27).
 *
 * Webdagi `furam/src/components/home/bosqich-karta.tsx` ning o'zi; ma'lumot
 * `/api/home` → `bosqich` (server har ochilishda yangilaydi).
 */
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Icon } from "@/components/Icon";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type BosqichData = {
  rol: string;
  bosqich: number;
  keyingi: { kalit: string; href: string } | null;
  dan: string;
};

export function Bosqich({ d }: { d?: BosqichData | null }) {
  const router = useRouter();
  if (!d) return null;
  const keyingi = d.keyingi;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>{t("bosqich.title")}</Text>
        <Text style={s.step}>{t("bosqich.step", { n: d.bosqich })}</Text>
      </View>
      <View style={s.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: d.bosqich }}>
        <View style={[s.fill, { width: `${Math.max(4, d.bosqich)}%` }]} />
      </View>
      {keyingi ? (
        <Tap
          onPress={() => {
            const to = webToApp(keyingi.href);
            if (to) router.push(to as Parameters<typeof router.push>[0]);
          }}
          feel="select"
          scale={0.98}
          style={s.next}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.nextLabel}>{t("bosqich.next")}</Text>
            <Text style={s.nextText}>{t(`bosqich.${keyingi.kalit}`)}</Text>
          </View>
          <Icon name="chevron" size={18} stroke={color.brand} />
        </Tap>
      ) : (
        <Text style={s.done}>{t("bosqich.done")}</Text>
      )}
    </View>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 8, ...shadow.card },
  head: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  title: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  step: { fontSize: 14, fontFamily: "Manrope_800ExtraBold", color: color.brand },
  bar: { height: 8, borderRadius: 4, backgroundColor: color.muted, overflow: "hidden" as const },
  fill: { height: 8, borderRadius: 4, backgroundColor: color.brand },
  next: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: 10,
    borderRadius: radius.control,
    backgroundColor: color.brandSoft,
  },
  nextLabel: { fontSize: 11, fontFamily: "Manrope_700Bold", color: color.mutedForeground, textTransform: "uppercase" as const },
  nextText: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  done: { fontSize: 13, fontFamily: "Manrope_700Bold", color: color.success },
}));
