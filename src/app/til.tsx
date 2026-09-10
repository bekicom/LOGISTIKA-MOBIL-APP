/**
 * A1 — til tanlash. Birinchi ochilishda ko'rinadi.
 *
 * Dizayn-2: to'q ko'k fon (logodagi), tillar 3 ustunli karta
 * panjarasida — Bekzod: «ustun emas, 3 tadan qator, karta
 * ko'rinishida». Tanlov saqlanadi va tanishtiruvga o'tiladi.
 * `?back=1` bilan ochilsa (kirish ekranidagi til tugmasi) —
 * tanlagach orqaga qaytadi.
 *
 * `?live=1` — ILOVA ICHIDAN (profil → «Til»). Bu holda daraxt
 * yangidan chiziladi (`applyLocaleNow`): ochiq ekranlar eski
 * tilda qolib ketmasin. Boshqa holatlarda bu QILINMAYDI —
 * birinchi ochilishda daraxt yangilansa, til tanlangach
 * tanishtiruvga o'tish o'rniga odam yana shu ekranda qolardi.
 */
import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/Text";
import { color, space, themed } from "@/lib/theme";
import { applyLocaleNow, LOCALES, LOCALE_INFO, currentLocale, deviceLocale, setLocale, t, type Locale } from "@/lib/i18n";

/* Ro'yxat `lib/i18n.ts` dan olinadi — til nomlari ikki joyda
   yozilsa, biri qo'shilib ikkinchisi unutilardi. */
const LANGS = LOCALES.map((code) => ({ code, ...LOCALE_INFO[code] }));

const COLS = 3;
const GAP = 10;

export default function TilTanlash() {
  const { back, live } = useLocalSearchParams<{ back?: string; live?: string }>();
  const [picked, setPicked] = useState<Locale>(back || live ? currentLocale() : deviceLocale());
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = (width - space.xl * 2 - GAP * (COLS - 1)) / COLS;

  async function choose(code: Locale) {
    if (busy) return;
    setPicked(code);
    setBusy(true);
    /* Tanlov SAQLANADI. Ilgari bu ekran faqat ko'rinish edi:
       til tanlansa ham keyingi ekranga o'tib ketardi va
       tanlov yo'qolardi. */
    await setLocale(code);
    if (live) {
      /* Daraxt yangidan chiziladi — navigatsiya ham qayta
         quriladi, shuning uchun bu yerda hech qayerga
         o'tilmaydi. Odam bosh sahifada, yangi tilda paydo
         bo'ladi. */
      applyLocaleNow();
      return;
    }
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
          <Logo width={180} light />
          <Text style={s.tagline}>{t("mob.lang.tagline")}</Text>
        </View>

        <Text style={s.caption}>{t("mob.lang.pick")}</Text>

        <View style={s.grid}>
          {LANGS.map((l) => {
            const on = picked === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => void choose(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [s.card, { width: cardW }, on && s.cardOn, pressed && { opacity: 0.85 }]}
              >
                {on ? (
                  <View style={s.tick}>
                    <Icon name="check" size={11} stroke="#ffffff" />
                  </View>
                ) : null}
                <Text style={s.flag}>{l.flag}</Text>
                <Text style={[s.name, on && s.nameOn]} numberOfLines={1} adjustsFontSizeToFit>
                  {l.native}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.note}>{t("mob.lang.later")}</Text>
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
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

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    height: 92,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  cardOn: { backgroundColor: color.brand },
  flag: { fontSize: 28 },
  name: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  nameOn: { color: "#ffffff" },
  tick: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffffff44",
    alignItems: "center",
    justifyContent: "center",
  },

  note: { fontSize: 12.5, color: "#ffffff99", textAlign: "center", marginTop: space.xl },
}));
