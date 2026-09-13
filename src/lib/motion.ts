/**
 * Harakat — bitta manbadan.
 *
 * ── NEGA KUTUBXONA EMAS ─────────────────────────────────────────
 *
 * `reanimated` loyihada bor (`expo-router` uni tortadi), lekin uning
 * API si babel plaginiga va worklet'larga tayanadi. Do'kon buildidan
 * oldin nativ qatlamga tegish xavfli: bir xato butun buildni
 * yiqitadi va sabab kompilyator jurnalida ko'rinadi.
 *
 * Bizga kerak narsa — bosishda kichrayish, paydo bo'lish, jimirlash.
 * Bularning hammasi RN ning o'z `Animated` i bilan chiqadi va u
 * ishlashi kafolatlangan.
 *
 * ── NEGA BITTA JOYDA ────────────────────────────────────────────
 *
 * 64 ta faylda `pressed && { opacity }` yozilgan edi — har birida
 * o'z soni bilan. Natijada bir ekranda tugma 0.9 ga, ikkinchisida
 * 0.7 ga o'chardi va ilova yig'ma ko'rinmasdi. Endi son shu yerda:
 * bir joyda o'zgartirilsa hamma joyda o'zgaradi.
 *
 * ── HARAKATNI O'CHIRGAN ODAM ────────────────────────────────────
 *
 * Telefon sozlamasida «harakatni kamaytirish» bor (iOS: Reduce
 * Motion, Android: Remove animations) va uni bosh og'rig'i yoki
 * ko'ngil aynishi sababli yoqadigan odamlar bor. Shunda paydo
 * bo'lish animatsiyalari O'CHADI — majburan ko'rsatish ularga
 * jismoniy noqulaylik beradi. Bosishdagi kichrayish qoladi: u
 * harakat emas, javob.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

/** Davomiylik — millisekund */
export const DUR = {
  /** Bosishga javob: darrov sezilishi kerak */
  tap: 110,
  /** Odatiy o'tish */
  base: 220,
  /** Paydo bo'lish, varaq */
  slow: 300,
} as const;

/**
 * Yumshoq chiqish egri chizig'i.
 *
 * `ease-out` ataylab: harakat tez boshlanib sekin tugaydi va shu
 * odam kutgan narsa — barmoq ko'targanda javob darrov ko'rinadi.
 */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Prujina — varaq va kichrayish uchun bir xil his */
export const SPRING = { damping: 20, stiffness: 260, mass: 0.9 } as const;

/** Telefonda harakat kamaytirilganmi */
export function useReduceMotion(): boolean {
  const [off, setOff] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setOff(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => setOff(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return off;
}

/**
 * Bosishda kichrayish.
 *
 * NEGA SHAFFOFLIK EMAS: o'chib-yonish tugmani «nosoz» ko'rsatadi,
 * kichrayish esa bosilganini aytadi — barmoq ostida narsa
 * cho'kkanday bo'ladi. Telefon interfeyslarida standart javob shu.
 *
 * `useNativeDriver: true` — bu harakat JS ipiga BOG'LIQ BO'LMAYDI:
 * ro'yxat yuklanayotganda ham silliq qoladi.
 */
export function usePressScale(to = 0.97) {
  /* `useRef` EMAS: chizish paytida `ref.current` ni o'qish
     lint'da taqiqlangan (`react-hooks/refs`). Loyihada shu
     naqsh `Sheet.tsx` da ham ishlatilgan. */
  const [scale] = useState(() => new Animated.Value(1));

  const press = () => {
    Animated.spring(scale, { toValue: to, useNativeDriver: true, ...SPRING }).start();
  };
  const release = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...SPRING }).start();
  };

  return { style: { transform: [{ scale }] }, onPressIn: press, onPressOut: release };
}

/**
 * Paydo bo'lish: pastdan ko'tarilib, ochilib chiqadi.
 *
 * `delay` — ro'yxatda ketma-ket chiqishi uchun. Kechikish 40 ms
 * dan oshmaydi va 6 ta elementdan keyin to'xtaydi: aks holda
 * ro'yxatning oxiri sekundlab kutiladi va bu bezovta qiladi.
 */
export function useFadeUp(delay = 0, disabled = false) {
  /* `useRef` EMAS: chizish paytida `ref.current` ni o'qish
     lint'da taqiqlangan (`react-hooks/refs`). Loyihada shu
     naqsh `Sheet.tsx` da ham ishlatilgan. */
  const [v] = useState(() => new Animated.Value(disabled ? 1 : 0));

  useEffect(() => {
    if (disabled) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, {
      toValue: 1,
      duration: DUR.slow,
      delay,
      easing: EASE,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [v, delay, disabled]);

  return {
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
      },
    ],
  };
}

/** Ro'yxatdagi o'rinni kechikishga o'giradi */
export const stagger = (i: number) => Math.min(i, 6) * 40;

/**
 * Jimirlash — yuklanish ko'rsatkichi uchun.
 *
 * To'xtovsiz aylanadi, shuning uchun `loop`. Shaffoflik 0.45 dan
 * pastga tushmaydi: kuchli o'chib-yonish ekranni «buzuq» qiladi.
 */
export function usePulse(disabled = false) {
  /* `useRef` EMAS: chizish paytida `ref.current` ni o'qish
     lint'da taqiqlangan (`react-hooks/refs`). Loyihada shu
     naqsh `Sheet.tsx` da ham ishlatilgan. */
  const [v] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    if (disabled) {
      v.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, easing: EASE, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 650, easing: EASE, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, disabled]);

  return { opacity: v };
}
