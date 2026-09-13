/**
 * Pastdan chiqadigan oynalar uchun uch bo'lak: parda, ✕ va surish.
 *
 * ── NEGA ALOHIDA USKUNA ─────────────────────────────────────────
 *
 * Ilovada pastdan chiqadigan oyna ko'p va ularning yarmi umumiy
 * `Sheet` dan oldin yozilgan — har birining o'z tuzilishi bor
 * (ichida `FlatList`, forma, bosqichlar). Ularni butunlay `Sheet`
 * ga ko'chirish katta qayta yozish va do'konga chiqish oldida
 * xavfli.
 *
 * Shuning uchun yopish YO'LLARI alohida bo'laklarga ajratildi:
 * har oynaga uch satr qo'shiladi va xatti-harakat hamma joyda
 * bir xil bo'ladi.
 *
 * ── NEGA SHART (2026-09-13) ─────────────────────────────────────
 *
 * Bekzod telefonda taklif oynasida QAMALIB QOLDI: narx maydoniga
 * bosgan, klaviatura chiqib pastdagi «Bekor qilish» tugmasini
 * bosib qolgan, boshqa yo'l yo'q edi. Bu do'konga chiqishga
 * to'siq bo'ladigan xato: Apple tekshiruvchisi ham aynan shunday
 * qamalsa ilovani rad etadi.
 *
 * Shuning uchun har oynada UCHTA yo'l bo'lishi kerak:
 *   1. tutqichdan pastga surish;
 *   2. ✕ — u varaqning TEPASIDA, klaviatura uni bosolmaydi;
 *   3. pardaga bosish.
 */
import { useMemo, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/Icon";
import { color, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Shundan uzoq surilsa oyna yopiladi */
const CLOSE_AT = 110;

/**
 * Panelni barmoq bilan pastga surib yopish.
 *
 * Qaytgan `panHandlers` TUTQICH atrofidagi `View` ga qo'yiladi,
 * butun panelga emas: ichidagi ro'yxat va maydonlar o'z
 * harakatini yo'qotmasligi kerak.
 *
 * `useNativeDriver: false` — bitta qiymatni ham barmoq
 * (`setValue`), ham prujina yuritganda drayver bir xil bo'lishi
 * shart, aks holda surish sakraydi.
 */
export function useSheetDrag(onClose: () => void) {
  const [y] = useState(() => new Animated.Value(0));

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          if (g.dy > 0) y.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          /* Tez «otib yuborish» ham yopadi: odam 110 px gacha
             surmasa ham yopilishini kutadi */
          if (g.dy > CLOSE_AT || g.vy > 1.1) {
            y.setValue(0);
            onClose();
          } else {
            Animated.spring(y, {
              toValue: 0,
              useNativeDriver: false,
              damping: 22,
              stiffness: 240,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(y, {
            toValue: 0,
            useNativeDriver: false,
            damping: 22,
            stiffness: 240,
          }).start();
        },
      }),
    [y, onClose],
  );

  return { panHandlers: pan.panHandlers, style: { transform: [{ translateY: y }] } };
}

/**
 * Panel ORQASIDAGI bosiladigan parda.
 *
 * Panelning O'ZI emas, uning ostidagi qatlam: shuning uchun
 * `absoluteFill` va panelDAN OLDIN chiziladi. Panelga bosilganda
 * bu ishga tushmaydi.
 */
export function SheetBackdrop({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("mapUi.close")}
    />
  );
}

/** Panel tepasidagi ✕ — klaviatura ochiq bo'lganda ham ko'rinadi */
export function SheetClose({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={s.close}
      accessibilityRole="button"
      accessibilityLabel={t("mapUi.close")}
    >
      <Icon name="close" size={19} stroke={color.icon} />
    </Pressable>
  );
}

/** Tutqich — surish maydoni bilan birga */
export function SheetGrip() {
  return (
    <View style={s.gripBox}>
      <View style={s.grip} />
    </View>
  );
}

const s = themed(() => ({
  close: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: color.muted,
    zIndex: 5,
  },
  gripBox: { alignItems: "center", paddingTop: 8, paddingBottom: 8 },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: color.border },
}));
