/**
 * Animatsiyali splash — ilova ochilganda.
 *
 * ── NAMUNA ──────────────────────────────────────────────────────
 *
 * Kornet: oq ekran, logo o'rtada, atrofida bo'lim ikonkalari suzib
 * chiqib so'nadi, pastda progress chiziq. Bekzodga aynan shu yoqdi:
 * «ilova nima qilishini ochilishidayoq ko'rsatadi».
 *
 * ── UZUNLIK ─────────────────────────────────────────────────────
 *
 * Birinchi marta — to'liq (~3 s). Keyingi ochilishlarda qisqa
 * (~1.2 s): har kuni o'n marta ochadigan haydovchi kutib o'tirmaydi.
 * Bosilsa — darrov tugaydi.
 *
 * Rasm yo'q: logo SVG, ikonkalar SVG. `Animated` (RN ning o'zi) —
 * reanimated'ning babel plagini va versiya bog'liqligi kerak emas.
 */
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { color } from "@/lib/theme";

const ORBIT: { icon: IconName; bg: string; tint: string; angle: number }[] = [
  { icon: "package", bg: color.brandSoft, tint: color.brand, angle: -90 },
  { icon: "truck", bg: color.blueSoft, tint: color.blue, angle: -30 },
  { icon: "route", bg: color.successSoft, tint: color.success, angle: 30 },
  { icon: "doc", bg: color.purpleSoft, tint: color.purple, angle: 90 },
  { icon: "chat", bg: color.blueSoft, tint: color.blue, angle: 150 },
  { icon: "wallet", bg: color.brandSoft, tint: color.brand, angle: 210 },
];

const RADIUS = 118;

export function Splash({ full, onDone }: { full: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  /* `useState(() => new Animated.Value)` — ref emas: ref'ni chizish
     paytida o'qish lint'da taqiqlangan (`react-hooks/refs`). */
  const [logo] = useState(() => new Animated.Value(0));
  const [bar] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [orbit] = useState(() => ORBIT.map(() => new Animated.Value(0)));
  const [finished, setFinished] = useState(false);

  function finish() {
    if (finished) return;
    setFinished(true);
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(onDone);
  }

  useEffect(() => {
    const total = full ? 2700 : 1100;

    const logoIn = Animated.spring(logo, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 });
    const barRun = Animated.timing(bar, {
      toValue: 1,
      duration: total,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    if (!full) {
      Animated.parallel([logoIn, barRun]).start(() => finish());
      return;
    }

    /* Ikonkalar: 0 → 1 chiqadi (joyiga suzib boradi), 1 → 2 so'nadi */
    const ins = orbit.map((v, i) =>
      Animated.sequence([
        Animated.delay(350 + i * 110),
        Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 140 }),
      ]),
    );
    const outs = orbit.map((v, i) =>
      Animated.sequence([
        Animated.delay(1750 + i * 60),
        Animated.timing(v, { toValue: 2, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );

    Animated.parallel([logoIn, barRun, ...ins, ...outs]).start(() => finish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: fade }]} pointerEvents={finished ? "none" : "auto"}>
      <Pressable style={StyleSheet.absoluteFill as object} onPress={finish} accessibilityLabel="skip" />

      <View style={[s.stage, { width }]} pointerEvents="none">
        {full
          ? ORBIT.map((o, i) => {
              const a = (o.angle * Math.PI) / 180;
              const x = Math.cos(a) * RADIUS;
              const y = Math.sin(a) * RADIUS;
              const v = orbit[i];
              return (
                <Animated.View
                  key={o.icon}
                  style={[
                    s.orb,
                    { backgroundColor: o.bg },
                    {
                      opacity: v.interpolate({ inputRange: [0, 0.6, 1, 1.6, 2], outputRange: [0, 1, 1, 0.6, 0] }),
                      transform: [
                        { translateX: v.interpolate({ inputRange: [0, 1, 2], outputRange: [x * 0.3, x, x * 1.35] }) },
                        { translateY: v.interpolate({ inputRange: [0, 1, 2], outputRange: [y * 0.3, y, y * 1.35] }) },
                        { scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.4, 1, 0.8] }) },
                      ],
                    },
                  ]}
                >
                  <Icon name={o.icon} size={22} stroke={o.tint} />
                </Animated.View>
              );
            })
          : null}

        <Animated.View
          style={{
            opacity: logo,
            transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          <Logo width={168} />
        </Animated.View>
      </View>

      <View style={[s.barWrap, { bottom: insets.bottom + 56 }]} pointerEvents="none">
        <View style={s.track}>
          <Animated.View
            style={[
              s.fill,
              { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    zIndex: 1000,
    elevation: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
  stage: { alignItems: "center", justifyContent: "center", height: 320 },
  orb: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  barWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  track: { width: 132, height: 4, borderRadius: 2, backgroundColor: "#e9edf3", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2, backgroundColor: color.brand },
});
