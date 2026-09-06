/**
 * A1 — til tanlash. Birinchi ochilishda ko'rinadi.
 *
 * Dizayn-2: to'liq ko'k fon, oq pill tugmalar (Kornet). Tanlov
 * saqlanadi va tanishtiruvga o'tiladi. `?back=1` bilan ochilsa
 * (kirish ekranidagi til tugmasi) — tanlagach orqaga qaytadi.
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/Text";
import { color, radius, space } from "@/lib/theme";
import { LOCALES, LOCALE_INFO, currentLocale, deviceLocale, setLocale, t, type Locale } from "@/lib/i18n";

/* Ro'yxat `lib/i18n.ts` dan olinadi — til nomlari ikki joyda
   yozilsa, biri qo'shilib ikkinchisi unutilardi. */
const LANGS = LOCALES.map((code) => ({ code, ...LOCALE_INFO[code] }));

export default function TilTanlash() {
  const { back } = useLocalSearchParams<{ back?: string }>();
  const [picked, setPicked] = useState<Locale>(back ? currentLocale() : deviceLocale());
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function choose(code: Locale) {
    if (busy) return;
    setPicked(code);
    setBusy(true);
    /* Tanlov SAQLANADI. Ilgari bu ekran faqat ko'rinish edi:
       til tanlansa ham keyingi ekranga o'tib ketardi va
       tanlov yo'qolardi. */
    await setLocale(code);
    if (back) router.back();
    else router.push("/tanishtiruv");
    setBusy(false);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Logo width={190} light />
          <Text style={s.tagline}>{t("mob.lang.tagline")}</Text>
        </View>

        <Text style={s.caption}>{t("mob.lang.pick")}</Text>

        <View style={s.list}>
          {LANGS.map((l) => {
            const on = picked === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => void choose(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [s.lang, on && s.langOn, pressed && { opacity: 0.85 }]}
              >
                <Text style={s.flag}>{l.flag}</Text>
                <Text style={[s.langText, on && s.langTextOn]}>{l.native}</Text>
                {on ? (
                  <View style={s.tick}>
                    <Icon name="check" size={14} stroke="#ffffff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={s.note}>{t("mob.lang.later")}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.blue },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl, justifyContent: "center" },

  hero: { alignItems: "center", gap: 12, paddingVertical: space.xxl },
  tagline: { fontSize: 14, color: "#ffffffcc", textAlign: "center" },

  caption: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffffb3",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: space.md,
  },

  list: { gap: 10 },
  lang: {
    height: 54,
    borderRadius: radius.control + 4,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  langOn: { backgroundColor: color.brand },
  flag: { fontSize: 20 },
  langText: { flex: 1, fontSize: 16, fontWeight: "600", color: color.foreground },
  langTextOn: { color: "#ffffff" },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff33",
    alignItems: "center",
    justifyContent: "center",
  },

  note: { fontSize: 12.5, color: "#ffffff99", textAlign: "center", marginTop: space.xl },
});
