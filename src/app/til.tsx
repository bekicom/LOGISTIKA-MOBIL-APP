/** A1 — til tanlash. Birinchi ochilishda ko'rinadi. */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { AuthTexture, GlassPanel, PrimaryAction } from "@/components/AuthDesign";
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
      <AuthTexture />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Logo width={216} light />
          <Text style={s.tagline}>{t("mob.lang.tagline")}</Text>
        </View>

        <GlassPanel style={s.panel}>
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
        </GlassPanel>
      </ScrollView>

      <View style={s.footer}>
        <PrimaryAction title={t("mob.common.continueBtn")} onPress={next} />
        <Text style={s.note}>{t("mob.lang.later")}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.xl },
  hero: { alignItems: "center", gap: 14, paddingBottom: 36 },
  tagline: { fontSize: 14.5, color: "#a9bddc", textAlign: "center" },
  panel: { gap: space.md },
  caption: { fontSize: 12, fontWeight: "800", color: "#8fa7c7", letterSpacing: 0.8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  lang: {
    width: "48%",
    flexGrow: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  langOn: { backgroundColor: color.brand, borderColor: color.brand },
  langText: { fontSize: font.body, fontWeight: "700", color: "#e2e8f0" },
  langTextOn: { color: "#ffffff" },
  footer: { paddingHorizontal: space.xl, gap: space.md },
  note: { fontSize: 12.5, color: "#9eb5d5", textAlign: "center" },
});
