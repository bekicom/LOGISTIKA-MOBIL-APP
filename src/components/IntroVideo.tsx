/**
 * Ochilishdagi brend videosi (2026-09-16).
 *
 * Bekzod: «shu qisqa video dasturga kirayotganda boshida chiqsin».
 * Oldingi animatsiyali splash (`Splash.tsx`) o'rniga — ikkalasi
 * ketma-ket chiqsa ochilish ikki barobar uzayardi.
 *
 * ── HAR SAFAR TO'LIQ ────────────────────────────────────────────
 *
 * Avval splash qoidasi saqlangan edi: birinchi marta to'liq, keyin
 * faqat oxiri (~2 s). Bekzod: «nega juda tez o'tib ketdi? video 5 s-ku,
 * to'liq ko'rinsin». Endi har ochilishda to'liq; odam xohlasa ekranga
 * bosib o'tkazib yuboradi.
 *
 * ⚠️ DAVOMIYLIK KODDA YOZILMAGAN — `player.duration` dan olinadi
 * (2026-09-21 da video almashtirildi: 5.7 s → 6.3 s, yangi brend
 * rolig`i. Fayl `assets/intro.mp4`, ovozsiz, 355 KB).
 *
 * ── OVOZSIZ ─────────────────────────────────────────────────────
 *
 * Asl videoda musiqa bor, lekin faylda ovoz yo'lagi OLIB TASHLANGAN.
 * Ochilishda kutilmagan ovoz odamning musiqasi yoki qo'ng'irog'ini
 * to'xtatardi. `mixWithOthers` — audio sessiyani egallamasin.
 *
 * ── TO'SIQ BO'LMAYDI, LEKIN ERTA HAM KESMAYDI ───────────────────
 *
 *   · bosilsa — tugaydi;
 *   · ochilmasa (dekoder xatosi) — tugaydi;
 *   · 6 s ichida o'ynay boshlamasa — tugaydi;
 *   · o'ynay boshlagach qotib qolsa — davomiylik + 2.5 s dan keyin.
 *
 * ⚠️ Zaxira taymer O'YNASH BOSHLANGANDAN sanaladi, ochilishdan emas:
 * birinchi versiyada ochilishdan sanalardi va video sekin yuklansa
 * (Expo Go'da tarmoq orqali) oxiri kesilib qolardi.
 *
 * ⚠️ «Harakatni kamaytirish» O'YNASHDAN OLDIN tekshiriladi: ilgari
 * sozlama kechikib kelar, video boshlanib, keyin to'satdan kesilardi.
 * Yoqilgan bo'lsa video umuman ko'rsatilmaydi — bu sozlamani bosh
 * og'rig'i yoki ko'ngil aynishi sababli yoqadigan odamlar bor.
 *
 * Ilova video OSTIDA yuklanadi, ya'ni bu vaqt behuda ketmaydi.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { themed } from "@/lib/theme";

const VIDEO = require("../../assets/intro.mp4");

/** Nativ splash rangi (`app.json`) — video shu fonda ochiladi, sakrash bo'lmasin */
const SPLASH_FON = "#0b1526";

/** O'ynay boshlamasa shuncha kutiladi */
const YUKLASH_MS = 6000;

export function IntroVideo({ onDone }: { onDone: () => void }) {
  /* `useState` — ref emas: chizish paytida `ref.current` ni o'qish
     lint'da taqiqlangan (`react-hooks/refs`) */
  const [overlay] = useState(() => new Animated.Value(1));
  const [video] = useState(() => new Animated.Value(0));
  /* `ref` — holat emas: hodisalar, taymerlar va bosish `finish` ni
     chaqiradi; holat eski yopilishda yangilanmay `onDone` ikki marta
     ishlardi. Ref faqat hodisada o'qiladi. */
  const tugadi = useRef(false);

  const player = useVideoPlayer(VIDEO, (p) => {
    p.muted = true;
    p.loop = false;
    p.audioMixingMode = "mixWithOthers";
    /* `play()` bu yerda EMAS — avval «harakatni kamaytirish» tekshiriladi */
  });

  function finish(sabab: string) {
    if (tugadi.current) return;
    tugadi.current = true;
    /* Dev jurnalida sabab: video erta tugasa nima kesganini bir qarashda
       ko'rish uchun (tugadi / bosildi / xato / yuklanmadi / qotdi / harakat) */
    if (__DEV__) console.log("[intro] tugadi:", sabab);
    Animated.timing(overlay, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => onDone());
  }

  useEffect(() => {
    let yuklash: ReturnType<typeof setTimeout> | null = null;
    let qotish: ReturnType<typeof setTimeout> | null = null;
    let tirik = true;

    const subs = [
      player.addListener("playToEnd", () => finish("tugadi")),
      player.addListener("statusChange", ({ status }) => {
        if (status === "error") finish("xato");
      }),
      player.addListener("playingChange", ({ isPlaying }) => {
        if (!isPlaying || qotish) return;
        /* O'ynay boshladi — endi yuklash emas, davomiylik bo'yicha qo'riqchi */
        if (yuklash) clearTimeout(yuklash);
        const sekund = player.duration > 0 ? player.duration : 6;
        qotish = setTimeout(() => finish("qotdi"), sekund * 1000 + 2500);
      }),
    ];

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((kamaytir) => {
        if (!tirik) return;
        if (kamaytir) {
          finish("harakat");
          return;
        }
        yuklash = setTimeout(() => finish("yuklanmadi"), YUKLASH_MS);
        player.play();
      });

    return () => {
      tirik = false;
      subs.forEach((s) => s.remove());
      if (yuklash) clearTimeout(yuklash);
      if (qotish) clearTimeout(qotish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `finish` har chizishda yangi; bir marta ulanadi
  }, [player]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => finish("bosildi")} accessibilityRole="button">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: video }]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
            /* Android'da `surfaceView` shaffoflik animatsiyasini
               ko'rsatmaydi — video keskin chiqardi */
            surfaceType={Platform.OS === "android" ? "textureView" : undefined}
            /* Birinchi kadr tayyor bo'lgachgina ko'rinadi: undan oldin
               qora yoki bo'sh to'rtburchak ko'rinib qolardi */
            onFirstFrameRender={() => {
              Animated.timing(video, { toValue: 1, duration: 220, useNativeDriver: true }).start();
            }}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const s = themed(() => ({
  root: { backgroundColor: SPLASH_FON, zIndex: 100 },
}));
