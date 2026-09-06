/** A1 — til tanlash. Birinchi ochilishda ko'rinadi. */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Logo } from "@/components/Logo";
import { color, font, space } from "@/lib/theme";
import { LOCALES, LOCALE_INFO, deviceLocale, setLocale, t, type Locale } from "@/lib/i18n";

const LANGS = LOCALES.map((code) => ({ code, label: LOCALE_INFO[code].native }));

export default function TilTanlash() {
  const [picked, setPicked] = useState<Locale>(deviceLocale());
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function next() {
    await setLocale(picked);
    router.push("/tanishtiruv");
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + space.lg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Logo width={216} light />
          <Text style={s.tagline}>{t("mob.lang.tagline")}</Text>
        </View>

        <View style={s.panel}>
          <Text style={s.caption}>{t("mob.lang.pick")}</Text>
          <View style={s.grid}>
            {LANGS.map((l) => {
              const on = picked === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => setPicked(l.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [s.lang, on && s.langOn, pressed && { opacity: 0.86 }]}
                >
                  <Text style={[s.langText, on && s.langTextOn]}>{l.label}</Text>
                  {on ? (
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Path
                        d="M20 6 9 17l-5-5"
                        stroke="#ffffff"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable onPress={next} style={({ pressed }) => [s.primary, pressed && { opacity: 0.8 }]}>
          <Text style={s.primaryText}>{t("mob.common.continueBtn")}</Text>
        </Pressable>
        <Text style={s.note}>{t("mob.lang.later")}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#3556d8" },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.xl },
  hero: { alignItems: "center", gap: 14, paddingBottom: 46 },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.82)", textAlign: "center" },
  panel: { gap: space.md },
  caption: { fontSize: 24, fontWeight: "800", color: "#ffffff", textAlign: "center", marginBottom: 10 },
  grid: { gap: 14 },
  lang: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  langOn: { backgroundColor: color.brand },
  langText: { fontSize: font.bodyLg, fontWeight: "700", color: "#202638" },
  langTextOn: { color: "#ffffff" },
  footer: { paddingHorizontal: space.xl, gap: space.md },
  primary: { height: 56, borderRadius: 18, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: font.bodyLg, fontWeight: "800", color: "#3556d8" },
  note: { fontSize: 12.5, color: "rgba(255,255,255,0.78)", textAlign: "center" },
});
