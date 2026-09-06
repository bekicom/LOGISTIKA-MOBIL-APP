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
 * hisoblanadi. Sarlavha ikonkalari ham: o'ng burchak, `TabHeader`
 * o'lchamlari.
 *
 * ── TESHIK ──────────────────────────────────────────────────────
 *
 * RN da pardaga teshik ochib bo'lmaydi — teshik atrofiga to'rtta
 * qorong'i to'rtburchak qo'yiladi (tepa, chap, o'ng, past).
 */
import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Step = { title: string; text: string; x: number; y: number; w: number; h: number; r: number };

const TABS = 5;
const BAR = 60;
const DIM = "#0b1526c9";

export function Tour({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));

  const barH = BAR + insets.bottom;
  const slot = width / TABS;
  const tab = (k: number): Pick<Step, "x" | "y" | "w" | "h" | "r"> => ({
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
      x: slot * 2 + slot / 2 - 38,
      y: height - barH - 22,
      w: 76,
      h: 76,
      r: 38,
    },
    { title: t("mob.tour.menuT"), text: t("mob.tour.menu"), ...tab(3) },
    { title: t("mob.tour.profileT"), text: t("mob.tour.profile"), ...tab(4) },
    {
      title: t("mob.tour.topT"),
      text: t("mob.tour.top"),
      x: width - space.lg - 92 - 6,
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

  if (!open) return null;

  const st = steps[i];
  const last = i === steps.length - 1;
  /* Izoh kartasi: teshik pastda bo'lsa — ustida, tepada bo'lsa — ostida */
  const below = st.y < height / 2;
  const cardPos = below ? { top: st.y + st.h + 14 } : { bottom: height - st.y + 14 };

  return (
    <Modal transparent visible statusBarTranslucent animationType="fade" onRequestClose={onDone}>
      {/* Parda — to'rt bo'lak, o'rtada teshik */}
      <View style={[s.dim, { top: 0, left: 0, right: 0, height: st.y }]} />
      <View style={[s.dim, { top: st.y, left: 0, width: st.x, height: st.h }]} />
      <View style={[s.dim, { top: st.y, left: st.x + st.w, right: 0, height: st.h }]} />
      <View style={[s.dim, { top: st.y + st.h, left: 0, right: 0, bottom: 0 }]} />
      {/* Yoritilgan joy atrofidagi halqa */}
      <View style={[s.ring, { left: st.x - 3, top: st.y - 3, width: st.w + 6, height: st.h + 6, borderRadius: st.r + 3 }]} pointerEvents="none" />

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
  dim: { position: "absolute", backgroundColor: DIM },
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
