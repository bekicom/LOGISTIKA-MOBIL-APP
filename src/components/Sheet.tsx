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
 * ekranda turganmi. Yopilganda avval animatsiya o'ynaydi, keyin
 * Modal olib tashlanadi; aks holda panel «g'oyib bo'lardi».
 */
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, themed } from "@/lib/theme";

const DROP = 420;

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
        Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }),
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: DROP, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [open, y, fade]);

  if (!visible) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="close" />
      </Animated.View>

      <Animated.View
        style={[s.panel, { paddingBottom: insets.bottom + space.lg, transform: [{ translateY: y }] }]}
      >
        <View style={s.handle} />
        {title ? <Text style={s.title}>{title}</Text> : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const s = themed(() => ({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0b152699" },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.border,
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "700", color: color.foreground, marginBottom: 12, letterSpacing: -0.3 },
}));
