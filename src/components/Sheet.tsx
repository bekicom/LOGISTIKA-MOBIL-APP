/**
 * Pastdan chiqadigan varaq.
 *
 * ── NEGA KUTUBXONA EMAS ─────────────────────────────────────────
 *
 * `@gorhom/bottom-sheet` — 400 KB va reanimated'ning aniq versiyasiga
 * bog'liq. Bizga kerak narsa: qorong'i parda, pastdan sirg'alib
 * chiqadigan panel, tashqariga bosilsa yopilish. Bu `Modal` +
 * `Animated` bilan 80 qator.
 *
 * ── IKKI HOLAT ──────────────────────────────────────────────────
 *
 * `open` — ota komponent xohishi, `visible` — Modal haqiqatda
 * ekranda turganmi. Yopilganda avval animatsiya o'ynaladi, keyin
 * Modal olib tashlanadi; aks holda panel «g'oyib bo'lardi».
 *
 * ── ⚠️ YOPISHNING UCHTA YO'LI (2026-09-13) ──────────────────────
 *
 * Bekzod telefonda sinab ko'rib qamalib qoldi: taklif oynasida
 * klaviatura chiqqan, «Bekor qilish» tugmasi klaviatura ostida
 * qolgan va ortga qaytishning BOSHQA yo'li yo'q edi.
 *
 * Shuning uchun endi uchta yo'l bor va uchalasi ham har varaqda
 * ishlaydi:
 *
 *   1. tutqichdan PASTGA SURISH — telefonda eng tabiiy harakat;
 *   2. o'ng yuqoridagi ✕ — klaviatura ochiq bo'lganda ham ko'rinadi,
 *      chunki u varaqning TEPASIDA;
 *   3. pardaga bosish.
 *
 * Android'dagi «orqaga» tugmasi ham yopadi (`onRequestClose`).
 *
 * ── SURISH `useNativeDriver: false` BILAN ───────────────────────
 *
 * Bitta `Animated.Value` ni ham barmoq (`setValue`), ham prujina
 * yuritganda drayver BIR XIL bo'lishi kerak — aks holda RN
 * «native node» ogohlantirishini beradi va surish sakraydi.
 * Panel siljishi shu sababdan JS drayverda; parda esa alohida
 * tugun, u nativ qoladi.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const DROP = 420;
/** Shundan uzoq surilsa varaq yopiladi */
const CLOSE_AT = 110;

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  /* `useState` — ref emas: ref'ni chizish paytida o'qish lint'da
     taqiqlangan (`react-hooks/refs`). */
  const [y] = useState(() => new Animated.Value(DROP));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, useNativeDriver: false, damping: 22, stiffness: 240 }),
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: DROP, duration: 200, useNativeDriver: false }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [open, y, fade]);

  /* Surish tutqich va sarlavha qatorida ishlaydi, BUTUN varaqda
     emas: ichidagi ro'yxat va maydonlar o'z harakatini yo'qotmasin. */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          // Yuqoriga tortishga yo'l yo'q: varaq balandligi o'zgarmaydi
          if (g.dy > 0) y.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          /* Tez siljish ham yopadi: odam varaqni «otib» yuborsa,
             110 px gacha yetmasa ham yopilishini kutadi. */
          if (g.dy > CLOSE_AT || g.vy > 1.1) onClose();
          else Animated.spring(y, { toValue: 0, useNativeDriver: false, damping: 22, stiffness: 240 }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(y, { toValue: 0, useNativeDriver: false, damping: 22, stiffness: 240 }).start();
        },
      }),
    [y, onClose],
  );

  if (!visible) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="close" />
      </Animated.View>

      {/* Klaviatura varaqni bosib qolmasin: ichidagi tugmalar
          klaviatura ustiga chiqadi */}
      <KeyboardAvoidingView
        style={s.wrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[s.panel, { paddingBottom: insets.bottom + space.lg, transform: [{ translateY: y }] }]}
        >
          <View {...pan.panHandlers}>
            {/* Tutqich kattaroq bosish maydoni bilan: barmoq 5 px
                chiziqni aniq tutolmaydi */}
            <View style={s.handleBox}>
              <View style={s.handle} />
            </View>
            {title ? (
              <View style={s.head}>
                <Text style={s.title}>{title}</Text>
              </View>
            ) : null}
          </View>

          {/* ✕ har doim TEPADA: klaviatura chiqqanda ham ko'rinadi */}
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={s.close}
            accessibilityRole="button"
            accessibilityLabel={t("mapUi.close")}
          >
            <Icon name="close" size={19} stroke={color.icon} />
          </Pressable>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = themed(() => ({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0b152699" },
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  panel: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: 4,
  },
  handleBox: { alignItems: "center", paddingTop: 6, paddingBottom: 8 },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.border,
  },
  head: { paddingRight: 34, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
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
  },
}));
