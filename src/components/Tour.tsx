/**
 * Yo'l-yo'riq — birinchi kirishda «qayerda nima» (coach marks).
 *
 * ── NAMUNA ──────────────────────────────────────────────────────
 *
 * Kornet: qorong'i parda, ekranning bir joyi yoritiladi, yonida
 * izoh va «Keyingi». Bekzod: «user birinchi kirganida qayer qanday
 * ishlashi haqida tushuntirish chiqsa juda zor bo'ladi».
 *
 * ── O'LCHASH YO'Q ───────────────────────────────────────────────
 *
 * Tab bar tugmalarini `measure` bilan olish uchun react-navigation
 * ichiga ref kirgizish kerak — mo'rt. Tab bar geometriyasi esa
 * ma'lum: beshta teng katak, balandligi 60 + pastki inset. Shundan
 * hisoblanadi. Sarlavha ikonkalari ham — bosh sahifa sarlavhasi
 * (`bosh.tsx`): o'ngdan avatar 36 + oraliq 12, keyin chat va
 * qo'ng'iroq (42 + 8 + 42).
 *
 * ── TESHIK — SVG ────────────────────────────────────────────────
 *
 * Ilgari parda to'rtta to'rtburchakdan yig'ilgan edi va teshik
 * burchakli chiqardi (Bekzod: «dumaloq ustiga to'rtburchak fon»).
 * Endi bitta SVG yo'l: butun ekran + teshik, `evenodd` — teshik
 * istalgan radiusda, «+» uchun to'liq aylana.
 */
import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Hole = { x: number; y: number; w: number; h: number; r: number };
type Step = Hole & { title: string; text: string };

const TABS = 5;
const BAR = 60;
const DIM = "#0b1526cc";

/** Teshikli parda: tashqi to'rtburchak + ichki yumaloq to'rtburchak, evenodd */
function dimPath(W: number, H: number, { x, y, w, h, r }: Hole): string {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    `M0 0H${W}V${H}H0Z ` +
    `M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}` +
    `A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}` +
    `V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`
  );
}

export function Tour({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));

  const barH = BAR + insets.bottom;
  const slot = width / TABS;
  const tab = (k: number): Hole => ({
    x: slot * k + 4,
    y: height - barH + 2,
    w: slot - 8,
    h: BAR - 4,
    r: 16,
  });

  const steps: Step[] = [
    { title: t("mob.tour.loadsT"), text: t("mob.tour.loads"), ...tab(1) },
    {
      title: t("mob.tour.postT"),
      text: t("mob.tour.post"),
      x: slot * 2 + slot / 2 - 37,
      y: height - barH - 22,
      w: 74,
      h: 74,
      r: 37,
    },
    { title: t("mob.tour.menuT"), text: t("mob.tour.menu"), ...tab(3) },
    { title: t("mob.tour.profileT"), text: t("mob.tour.profile"), ...tab(4) },
    {
      title: t("mob.tour.topT"),
      text: t("mob.tour.top"),
      /* bosh.tsx sarlavhasi: pad 16 + avatar 36 + oraliq 12, keyin 92 */
      x: width - 16 - 36 - 12 - 92 - 6,
      y: insets.top + 2,
      w: 92 + 12,
      h: 50,
      r: 25,
    },
  ];

  useEffect(() => {
    if (!open) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [open, i, fade]);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  if (!open) return null;

  const st = steps[Math.min(i, steps.length - 1)];
  const last = i === steps.length - 1;
  /* Izoh kartasi: teshik pastda bo'lsa — ustida, tepada bo'lsa — ostida */
  const below = st.y < height / 2;
  const cardPos = below ? { top: st.y + st.h + 14 } : { bottom: height - st.y + 14 };

  return (
    <Modal transparent visible statusBarTranslucent animationType="fade" onRequestClose={onDone}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill as object} pointerEvents="none">
        <Path d={dimPath(width, height, st)} fill={DIM} fillRule="evenodd" />
      </Svg>
      {/* Yoritilgan joy atrofidagi halqa */}
      <View
        style={[
          s.ring,
          { left: st.x - 3, top: st.y - 3, width: st.w + 6, height: st.h + 6, borderRadius: st.r + 3 },
        ]}
        pointerEvents="none"
      />

      <Animated.View style={[s.card, cardPos, { opacity: fade }]}>
        <View style={s.cardTop}>
          <Text style={s.count}>
            {i + 1} / {steps.length}
          </Text>
          <Pressable onPress={onDone} hitSlop={8}>
            <Text style={s.skip}>{t("mob.intro.skip")}</Text>
          </Pressable>
        </View>
        <Text style={s.title}>{st.title}</Text>
        <Text style={s.text}>{st.text}</Text>

        <View style={s.dots}>
          {steps.map((_, k) => (
            <View key={k} style={[s.dot, k === i && s.dotOn]} />
          ))}
        </View>

        <Button
          title={last ? t("mob.tour.done") : t("mob.tour.next")}
          onPress={() => (last ? onDone() : setI((v) => v + 1))}
        />
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  ring: { position: "absolute", borderWidth: 2.5, borderColor: "#ffffff" },
  card: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.xl,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  count: { fontSize: 12, fontWeight: "700", color: color.brand, letterSpacing: 0.5 },
  skip: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  title: { fontSize: 19, fontWeight: "800", color: color.foreground, letterSpacing: -0.3 },
  text: { fontSize: 14.5, color: color.mutedForeground, marginTop: 6, lineHeight: 21 },
  dots: { flexDirection: "row", gap: 6, marginTop: 16, marginBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.border },
  dotOn: { width: 18, backgroundColor: color.brand },
});
