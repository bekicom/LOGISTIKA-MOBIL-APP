/**
 * Ochilishdagi brend videosi (2026-09-16).
 *
 * Bekzod: «shu qisqa video dasturga kirayotganda boshida chiqsin».
 * Oldingi animatsiyali splash (`Splash.tsx`) o'rniga — ikkalasi
 * ketma-ket chiqsa ochilish ikki barobar uzayardi.
 *
 * ── UZUNLIK: OLDINGI QOIDA SAQLANDI ─────────────────────────────
 *
 * Birinchi ochilishda TO'LIQ video (5.7 s). Keyingilarida faqat oxiri
 * (`intro-short.mp4`, ~2 s): mashina logotipga aylanadi va konfetti.
 * Kuniga o'n marta ochadigan haydovchi har safar 6 soniya kutib
 * o'tirmaydi — bu qoida splash'da ham shunday edi.
 *
 * Qisqa variant ALOHIDA FAYL, videoni o'rtasidan boshlash emas: iOS'da
 * yuklanishdan oldingi `currentTime` e'tiborsiz qoladi va ekranda bir
 * zum birinchi kadr ko'rinib, keyin sakrardi.
 *
 * ── OVOZSIZ ─────────────────────────────────────────────────────
 *
 * Asl videoda musiqa bor, lekin faylda ovoz yo'lagi OLIB TASHLANGAN.
 * Ochilishda kutilmagan ovoz odamning musiqasi yoki qo'ng'irog'ini
 * to'xtatardi — do'kon tekshiruvchilari ham buni yoqtirmaydi.
 * `mixWithOthers` — shunga qaramay audio sessiyani egallamasin.
 *
 * ── HECH QACHON TO'SIQ BO'LMAYDI ────────────────────────────────
 *
 *   · bosilsa — darrov tugaydi;
 *   · video ochilmasa (eski Android dekoderi) — tugaydi;
 *   · qotib qolsa — qo'riqchi taymer tugatadi;
 *   · telefonda «harakatni kamaytirish» yoqilgan bo'lsa — video
 *     umuman ko'rsatilmaydi (`useReduceMotion`).
 *
 * Ilova video OSTIDA yuklanadi, ya'ni bu vaqt behuda ketmaydi.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useReduceMotion } from "@/lib/motion";
import { themed } from "@/lib/theme";

const TOLIQ = require("../../assets/intro.mp4");
const QISQA = require("../../assets/intro-short.mp4");

/** Nativ splash rangi (`app.json`) — video shu fonda ochiladi, sakrash bo'lmasin */
const SPLASH_FON = "#0b1526";

export function IntroVideo({ full, onDone }: { full: boolean; onDone: () => void }) {
  const reduce = useReduceMotion();
  /* `useState` — ref emas: chizish paytida `ref.current` ni o'qish
     lint'da taqiqlangan (`react-hooks/refs`) */
  const [overlay] = useState(() => new Animated.Value(1));
  const [video] = useState(() => new Animated.Value(0));
  /* `ref` — holat emas: `playToEnd`, qo'riqchi taymer va bosish uchalasi
     ham `finish` ni chaqirishi mumkin. Holat eski yopilishda yangilanmay,
     `onDone` ikki marta ishlardi. Ref faqat hodisada o'qiladi. */
  const tugadi = useRef(false);

  const player = useVideoPlayer(full ? TOLIQ : QISQA, (p) => {
    p.muted = true;
    p.loop = false;
    p.audioMixingMode = "mixWithOthers";
    p.play();
  });

  function finish() {
    if (tugadi.current) return;
    tugadi.current = true;
    Animated.timing(overlay, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => onDone());
  }

  useEffect(() => {
    if (reduce) {
      finish();
      return;
    }
    const subs = [
      player.addListener("playToEnd", finish),
      player.addListener("statusChange", ({ status }) => {
        if (status === "error") finish();
      }),
    ];
    /* Qo'riqchi: video davomiyligi + zaxira. Dekoder qotib qolsa ham
       odam ilovaga kiradi. */
    const guard = setTimeout(finish, full ? 8000 : 4000);
    return () => {
      subs.forEach((s) => s.remove());
      clearTimeout(guard);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `finish` har chizishda yangi; bir marta ulanadi
  }, [player, reduce, full]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: video }]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
            /* Android'da `surfaceView` shaffoflik animatsiyasini
               ko'rsatmaydi — video yo'qolib-paydo bo'lish o'rniga
               keskin chiqardi */
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
