/** A2 — tanishtiruv. Uch panel, keyin kirish yoki ro'yxatdan o'tish. */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { color, font, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/* Matnlar lug'atda (`mob.intro.*`) — bu yerda faqat tartib va
   kalitlar. Sakkiz til kod ichida yozilsa, ular ajralib ketardi. */
const PANELS = [
  { title: "mob.intro.t1", body: "mob.intro.b1" },
  { title: "mob.intro.t2", body: "mob.intro.b2" },
  { title: "mob.intro.t3", body: "mob.intro.b3" },
] as const;

export default function Tanishtiruv() {
  const [i, setI] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const panel = PANELS[i];

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }]}>
      <View style={s.top}>
        <Logo width={122} />
        <Pressable onPress={() => router.replace("/kirish")} hitSlop={12}>
          <Text style={s.skip}>{t("mob.intro.skip")}</Text>
        </Pressable>
      </View>

      <Pressable style={s.body} onPress={() => setI((v) => (v + 1) % PANELS.length)}>
        <Illustration />
        <Text style={s.title}>{t(panel.title)}</Text>
        <Text style={s.text}>{t(panel.body)}</Text>

        <View style={s.dots}>
          {PANELS.map((_, k) => (
            <View key={k} style={[s.dot, k === i && s.dotOn]} />
          ))}
        </View>
      </Pressable>

      <View style={s.footer}>
        <Button title={t("mob.intro.signUp")} onPress={() => router.push("/royxat")} />
        <Button title={t("mob.intro.signIn")} variant="secondary" onPress={() => router.push("/kirish")} />
      </View>
    </View>
  );
}

function Illustration() {
  return (
    <Svg width={240} height={180} viewBox="0 0 240 180">
      <Rect x={18} y={118} width={204} height={8} rx={4} fill="#e2e8f0" />
      <Path
        d="M22 122 h30 M64 122 h24 M100 122 h34 M146 122 h20 M178 122 h26"
        stroke="#cbd5e1"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Rect x={34} y={62} width={86} height={48} rx={6} fill={color.navy} />
      <Rect x={120} y={46} width={62} height={64} rx={6} fill={color.brand} />
      <Rect x={128} y={56} width={46} height={26} rx={3} fill="#ffdccb" />
      <Circle cx={60} cy={114} r={11} fill="#0f172a" />
      <Circle cx={60} cy={114} r={4.5} fill="#94a3b8" />
      <Circle cx={152} cy={114} r={11} fill="#0f172a" />
      <Circle cx={152} cy={114} r={4.5} fill="#94a3b8" />
      <Rect x={44} y={24} width={30} height={30} rx={5} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} />
      <Path d="M44 34 h30 M59 24 v30" stroke="#cbd5e1" strokeWidth={1.5} />
      <Rect x={82} y={14} width={26} height={26} rx={5} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} />
      <Path d="M82 22 h26 M95 14 v26" stroke="#cbd5e1" strokeWidth={1.5} />
      <Path d="M196 44 a20 20 0 1 1 0.01 0" fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <Path
        d="M196 24 a20 20 0 0 1 17.3 30"
        fill="none"
        stroke={color.brand}
        strokeWidth={7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
  },
  skip: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },

  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  title: {
    fontSize: font.display,
    fontWeight: "700",
    color: color.foreground,
    textAlign: "center",
    marginTop: 36,
    letterSpacing: -0.4,
  },
  text: {
    fontSize: font.body,
    color: color.mutedForeground,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  dots: { flexDirection: "row", gap: 7, marginTop: 28 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.border },
  dotOn: { width: 22, backgroundColor: color.brand },

  footer: { paddingHorizontal: space.xl, gap: 10 },
});
