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
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Icon } from "@/components/Icon";
import { color, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Shundan uzoq surilsa oyna yopiladi */
const CLOSE_AT = 110;

/**
 * Panelni barmoq bilan pastga surib yopish.
 *
 * Qaytgan `panHandlers` BUTUN PANELGA qo'yiladi: Bekzod varaqni
 * o'rtasidan bosib surganda ham yopilishini so'radi. Ichidagi
 * maydon va ro'yxat o'z harakatini yo'qotmaydi — `Capture`
 * ishlatilmaydi va shart aniq pastga qaragan harakatni talab
 * qiladi.
 *
 * `useNativeDriver: false` — bitta qiymatni ham barmoq
 * (`setValue`), ham prujina yuritganda drayver bir xil bo'lishi
 * shart, aks holda surish sakraydi.
 */
export function useSheetDrag(onClose: () => void) {
  const [y] = useState(() => new Animated.Value(0));

  /* Ichidagi ro'yxat TEPASIDAMI.
     Aylanadigan varaqda pastga surish ikki ma'noli: odam ro'yxatni
     aylantirmoqchimi yoki varaqni yopmoqchimi. Qoida shu: ro'yxat
     tepasida turganda surish YOPADI, aks holda aylantiradi —
     telefonlarda hamma shunday ishlaydi.

     `useRef` EMAS, `useState`: lint chizish paytida `ref.current`
     ni o'qishni taqiqlaydi (`react-hooks/refs`), `PanResponder`
     esa `useMemo` ichida yasaladi. Holat o'zgarganda javobchi
     qayta yasaladi — u arzon va faqat chegarada bir marta
     bo'ladi. */
  const [atTop, setAtTop] = useState(true);

  const pan = useMemo(
    () =>
      PanResponder.create({
        /* ⚠️ BUTUN PANELDAN surish (2026-09-13).
           Ilgari faqat tutqichdan bo'lardi va Bekzod: «modalni
           o'rtasidan bosib pastga sursam tushsin».

           `Capture` ISHLATILMAYDI: shunda ichidagi maydon va
           ro'yxat o'z harakatini yo'qotardi. Shart qat'iy — aniq
           PASTGA qaragan harakat (yon tomonga emas). */
        onMoveShouldSetPanResponder: (_e, g) =>
          atTop && g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
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
    [y, onClose, atTop],
  );

  /** Varaq ichida `ScrollView`/`FlatList` bo'lsa shuni ulash kerak */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setAtTop(e.nativeEvent.contentOffset.y <= 1);
  };

  return { panHandlers: pan.panHandlers, style: { transform: [{ translateY: y }] }, onScroll };
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

/** Tutqich — ko'rinish uchun (surish butun paneldan ishlaydi) */
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
