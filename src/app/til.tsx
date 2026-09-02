/** A1 — til tanlash. Birinchi ochilishda ko'rinadi. */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { color, font, radius, space } from "@/lib/theme";
import { LOCALES, LOCALE_INFO, deviceLocale, setLocale, type Locale } from "@/lib/i18n";

/* Ro'yxat `lib/i18n.ts` dan olinadi — til nomlari ikki joyda
   yozilsa, biri qo'shilib ikkinchisi unutilardi. */
const LANGS = LOCALES.map((code) => ({ code, label: LOCALE_INFO[code].native }));

export default function TilTanlash() {
  const [picked, setPicked] = useState<Locale>(deviceLocale());
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Logo width={244} light />
          <Text style={s.tagline}>Yuk va transport topish platformasi</Text>
        </View>

        <Text style={s.caption}>TILNI TANLANG</Text>

        <View style={s.grid}>
          {LANGS.map((l) => {
            const on = picked === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => setPicked(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[s.lang, on && s.langOn]}
              >
                <Text style={[s.langText, on && s.langTextOn]}>{l.label}</Text>
                {on ? (
                  <Svg width={17} height={17} viewBox="0 0 24 24">
                    <Path
                      d="M20 6 9 17l-5-5"
                      stroke="#ffffff"
                      strokeWidth={2.6}
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
      </ScrollView>

      <View style={s.footer}>
        <Button
          title="Davom etish"
          onPress={async () => {
            /* Tanlov SAQLANADI. Ilgari bu ekran faqat ko'rinish edi:
               til tanlansa ham keyingi ekranga o'tib ketardi va
               tanlov yo'qolardi. */
            await setLocale(picked);
            router.push("/tanishtiruv");
          }}
        />
        <Text style={s.note}>Tilni keyin ham o&apos;zgartirishingiz mumkin</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.xl },

  hero: { alignItems: "center", gap: 14, paddingVertical: space.xxl },
  tagline: { fontSize: 14, color: "#94a3b8", textAlign: "center" },

  caption: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: space.md,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  lang: {
    width: "48%",
    flexGrow: 1,
    height: 50,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "#1e3048",
    backgroundColor: "#10203a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  langOn: { backgroundColor: color.brand, borderColor: color.brand },
  langText: { fontSize: font.body, fontWeight: "500", color: "#e2e8f0" },
  langTextOn: { fontWeight: "600", color: "#ffffff" },

  footer: { paddingHorizontal: space.xl, gap: space.md },
  note: { fontSize: 12, color: "#64748b", textAlign: "center" },
});
