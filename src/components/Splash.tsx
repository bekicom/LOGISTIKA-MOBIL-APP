/**
 * Splash — ilova ochilishidagi birinchi ekran (2026-09-05, yangi dizayn).
 *
 * ── NEGA IKKITA SPLASH EMAS ─────────────────────────────────────
 *
 * Tizimning o'z splash'i ham bor (`app.json` → `expo-splash-screen`):
 * to'q fon va logotip. U ilova KODI yuklanguncha turadi, bu esa
 * undan keyin. Fon rangi bir xil (`#0b1526`) — shuning uchun
 * o'tish ko'zga tashlanmaydi, ekran «yorishib» ketmaydi.
 *
 * ── NEGA ENG KAMI 1,1 SONIYA ────────────────────────────────────
 *
 * Sessiyani tekshirish ba'zan 150 ms da tugaydi. O'shanda splash
 * MILTILLAB o'tib ketardi — odam nima ko'rganini ham anglamaydi va
 * bu buzuq taassurot qoldiradi. Kutish sun'iy, lekin u faqat
 * sessiya tez tekshirilgan holatda seziladi; sekin tarmoqda
 * qo'shimcha kutish YO'Q — ikkalasi parallel ketadi.
 *
 * ── SO'NIB O'TADI, KESILMAYDI ───────────────────────────────────
 *
 * Tayyor bo'lganda ekran BIRDAN almashmaydi: 260 ms ichida
 * so'nadi va shundan keyingina yo'naltirish bo'ladi. Keskin
 * kesish «ilova qayta ishga tushdi» degan taassurot qoldirardi.
 *
 * ── SURAT ───────────────────────────────────────────────────────
 *
 * `assets/images/splash-fura.png`. Hozir o'rin egallovchi 1×1
 * fayl turishi mumkin — o'shanda ekran shunchaki to'q fon bo'lib
 * chiqadi, lekin YIQILMAYDI. Haqiqiy surat ustiga yozilsa,
 * boshqa hech narsa o'zgartirilmaydi.
 */
import { useEffect, useState } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Logo } from "@/components/Logo";
import { color, font, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Eng kam ko'rinish vaqti (ms) */
const MIN_MS = 1100;

export function useSplashDone(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), MIN_MS);
    return () => clearTimeout(id);
  }, []);
  return done;
}

/**
 * @param fadeOut  `true` bo'lganda ekran so'na boshlaydi
 * @param onGone   so'nish tugagach chaqiriladi — shundan keyin
 *                 yo'naltirish bo'ladi
 */
export function Splash({ fadeOut, onGone }: { fadeOut?: boolean; onGone?: () => void } = {}) {
  /* Chiziq TO'LMAYDI, faqat harakatlanadi: haqiqiy foizni
     ko'rsatolmaymiz — sessiya tekshiruvi bosqichlarga
     bo'linmagan. Yolg'on foiz ko'rsatgandan ko'ra, «ishlayapti»
     degan belgi halolroq. */
  /* `useRef` EMAS, `useState`: `react-hooks/refs` qoidasi ref ni
     chizish paytida o'qishni taqiqlaydi, `slide.interpolate()` esa
     aynan chizishda kerak. Boshlang'ich qiymat funksiya bilan
     berilgani uchun obyekt bir marta yaratiladi. */
  const [slide] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!fadeOut) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onGone?.();
    });
  }, [fadeOut, fade, onGone]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [slide]);

  return (
    <Animated.View style={[s.root, { opacity: fade }]}>
      <ImageBackground source={require("../../assets/images/splash-fura.png")} style={s.bg} resizeMode="cover">
        {/* Tepadan va pastdan qoraytirish — logotip va matn
            suratning yorug' joyiga tushib qolsa ham o'qiladi */}
        <LinearGradient
          colors={["#0b1526f2", "#0b152680", "#0b152600", "#0b1526cc", "#0b1526"]}
          locations={[0, 0.22, 0.45, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={s.top}>
          <Logo width={168} light />
          <Text style={s.tagline}>{t("mob.splash.tagline")}</Text>
        </View>

        <View style={s.bottom}>
          <Text style={s.footer}>{t("mob.splash.footer")}</Text>
          <View style={s.track}>
            <Animated.View
              style={[
                s.fill,
                {
                  transform: [
                    {
                      translateX: slide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-64, 64],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  bg: { flex: 1, justifyContent: "space-between" },

  top: { alignItems: "center", paddingTop: "26%", paddingHorizontal: space.xl },
  tagline: {
    marginTop: 18,
    fontSize: font.bodyLg,
    lineHeight: 24,
    color: "#f1f5f9d9",
    textAlign: "center",
  },

  bottom: { alignItems: "center", paddingBottom: 54, paddingHorizontal: space.xl },
  footer: {
    fontSize: font.caption,
    lineHeight: 19,
    color: "#f1f5f9a6",
    textAlign: "center",
    marginBottom: 20,
  },
  /* Chiziq tor: u asosiy narsa emas, faqat «kutilyapti» belgisi */
  track: {
    width: 96,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#ffffff26",
    overflow: "hidden",
  },
  fill: { width: 32, height: 3, borderRadius: 2, backgroundColor: color.brand },
});
