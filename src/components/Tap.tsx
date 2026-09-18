/**
 * Bosiladigan narsa — bitta ko'rinish bilan.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Ilovada 64 ta faylda `pressed && { opacity: … }` yozilgan edi va
 * har birida o'z soni bilan: bir ekranda tugma 0.9 ga, boshqasida
 * 0.7 ga o'chardi. Bu ko'zga «har xil odam yozgan» bo'lib
 * tashlanadi.
 *
 * Endi javob bitta: barmoq ostida narsa CHO'KADI (kichrayadi).
 * Shaffoflik o'zgarishi tugmani nosozdek ko'rsatadi, kichrayish
 * esa bosilganini aytadi — telefon interfeyslarida standart shu.
 *
 * ── TEBRANISH (HAPTIC) ──────────────────────────────────────────
 *
 * Faqat MA'NOLI amalda: saqlash, yuborish, tanlash. Har bosishda
 * tebratish — charchatadi va batareyani yeydi.
 *
 * Android'da tebranish ruxsat talab qilmaydi, lekin telefon
 * sozlamasida o'chirilgan bo'lishi mumkin — `expo-haptics` shunda
 * jimgina hech narsa qilmaydi, ya'ni tekshirish shart emas.
 */
import { type ReactNode } from "react";
import { Animated, Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { usePressScale } from "@/lib/motion";

export type TapFeel =
  /** Oddiy bosish — tebranish yo'q */
  | "none"
  /** Tanlov: chip, yorliq, ro'yxat qatori */
  | "select"
  /** Asosiy amal: saqlash, yuborish */
  | "action";

export function Tap({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  feel = "none",
  /** Kichrayish chuqurligi — katta kartochkada kichikroq bo'lsin */
  scale = 0.97,
  accessibilityLabel,
  accessibilityRole = "button",
  selected,
  hitSlop,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /* Pressable ning o'zidagi tur: uslub FUNKSIYA ham bo'lishi
     mumkin (`({pressed}) => …`) va ilovada ko'p joyda shunday */
  style?: PressableProps["style"];
  feel?: TapFeel;
  scale?: number;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "switch" | "tab" | "radio";
  /** Tanlov (radio, yorliq) — ekran o'quvchiga «tanlangan» deb aytiladi */
  selected?: boolean;
  hitSlop?: number;
}) {
  const press = usePressScale(scale);

  function fire() {
    if (feel === "select") void Haptics.selectionAsync();
    else if (feel === "action") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }

  return (
    <Animated.View style={[press.style, disabled && { opacity: 0.5 }]}>
      <Pressable
        onPress={disabled ? undefined : fire}
        onLongPress={disabled ? undefined : onLongPress}
        onPressIn={disabled ? undefined : press.onPressIn}
        onPressOut={disabled ? undefined : press.onPressOut}
        disabled={disabled}
        style={style}
        hitSlop={hitSlop}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled, ...(selected !== undefined ? { selected } : {}) }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
