/** A2 — tanishtiruv. Uch panel, keyin kirish yoki ro'yxatdan o'tish. */
import { useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Logo } from "@/components/Logo";
import { setGuest } from "@/lib/guest";
import { color, font, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const PANEL_META = [
  { title: "mob.intro.t1", body: "mob.intro.b1" },
  { title: "mob.intro.t2", body: "mob.intro.b2" },
  { title: "mob.intro.t3", body: "mob.intro.b3" },
] as const;

const HERO_IMAGES = [
  require("../../assets/reference/onboarding/onboarding-loads.png"),
  require("../../assets/reference/onboarding/onboarding-tracking.png"),
  require("../../assets/reference/onboarding/onboarding-docs.png"),
] as const;

export default function Tanishtiruv() {
  const [i, setI] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const panel = PANEL_META[i];

  return (
    <View style={[s.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + space.lg }]}>
      <RouteTexture />

      <View style={s.top}>
        <Logo width={148} light />
        <Pressable onPress={() => router.replace("/kirish")} hitSlop={12} style={s.skipBtn}>
          <Text style={s.skip}>{t("mob.intro.skip")}</Text>
        </Pressable>
      </View>

      <Pressable
        style={s.body}
        onPress={() => setI((v) => (v + 1) % PANEL_META.length)}
        accessibilityRole="button"
        accessibilityLabel={t(panel.title)}
      >
        <HeroImage index={i} />

        <View style={s.copy}>
          <Text style={s.title}>{t(panel.title)}</Text>
          <Text style={s.text}>{t(panel.body)}</Text>
        </View>

        <View style={s.dots}>
          {PANEL_META.map((_, k) => (
            <Pressable
              key={k}
              onPress={() => setI(k)}
              accessibilityRole="button"
              accessibilityLabel={`${k + 1}/${PANEL_META.length}`}
              hitSlop={10}
            >
              <View style={[s.dot, k === i && s.dotOn]} />
            </Pressable>
          ))}
        </View>
      </Pressable>

      <View style={s.footer}>
        <Pressable
          onPress={() => router.push("/royxat")}
          accessibilityRole="button"
          style={({ pressed }) => [s.primary, pressed && s.primaryDown]}
        >
          <Text style={s.primaryText}>{t("mob.intro.signUp")}</Text>
          <Text style={s.primaryArrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/kirish")}
          accessibilityRole="button"
          style={({ pressed }) => [s.secondary, pressed && s.secondaryDown]}
        >
          <Text style={s.secondaryText}>{t("mob.intro.signIn")}</Text>
        </Pressable>

        <Pressable
          style={s.look}
          hitSlop={8}
          onPress={async () => {
            await setGuest(true);
            router.replace("/yuklar");
          }}
        >
          <Text style={s.lookText}>{t("mob.intro.lookFirst")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RouteTexture() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 393 852" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#08162b" />
            <Stop offset="0.56" stopColor="#071326" />
            <Stop offset="1" stopColor="#0b1d35" />
          </LinearGradient>
          <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#f45a18" stopOpacity="0.08" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#f45a18" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Rect width="393" height="852" fill="url(#bg)" />
        <Circle cx="330" cy="80" r="150" fill="#12345f" opacity="0.16" />
        <Circle cx="62" cy="648" r="180" fill="#12345f" opacity="0.11" />
        <Path
          d="M-20 505 C58 466 91 537 160 496 C218 462 247 385 411 407"
          fill="none"
          stroke="url(#glow)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <Path
          d="M26 250 C82 222 113 278 166 250 C228 216 266 142 370 178"
          fill="none"
          stroke="#7aa3d8"
          strokeOpacity="0.13"
          strokeWidth={1}
          strokeDasharray="4 7"
        />
        <Path
          d="M-12 332 C57 326 93 358 139 332 C188 304 207 260 276 276 C326 287 351 325 416 305"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.06"
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

function HeroImage({ index }: { index: number }) {
  return (
    <View style={s.illustrationWrap}>
      <ImageBackground
        source={HERO_IMAGES[index]}
        resizeMode="cover"
        style={s.heroImage}
        imageStyle={s.heroImageInner}
      >
        <View style={s.heroFadeTop} />
        <View style={s.heroFadeBottom} />
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
  },
  skipBtn: { minHeight: 40, justifyContent: "center", paddingLeft: space.md },
  skip: { fontSize: 14.5, fontWeight: "600", color: "#9eb5d5" },

  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl },
  illustrationWrap: {
    width: "100%",
    maxWidth: 340,
    height: 322,
    marginTop: 2,
    marginBottom: 4,
    overflow: "hidden",
  },
  heroImage: { flex: 1, justifyContent: "space-between" },
  heroImageInner: { borderRadius: 0 },
  heroFadeTop: { height: 44, backgroundColor: "rgba(8, 22, 43, 0.02)" },
  heroFadeBottom: { height: 78, backgroundColor: "rgba(8, 22, 43, 0.16)" },
  copy: { minHeight: 126, alignItems: "center", justifyContent: "flex-start" },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  text: {
    fontSize: font.bodyLg,
    color: "#a9bddc",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  dots: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#355174" },
  dotOn: { width: 24, backgroundColor: color.brand },

  footer: { paddingHorizontal: space.xl, gap: 12 },
  primary: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: space.xl,
  },
  primaryDown: { backgroundColor: color.brandHover },
  primaryText: { flex: 1, textAlign: "center", color: "#ffffff", fontSize: 18, fontWeight: "800" },
  primaryArrow: { color: "#ffffff", fontSize: 30, fontWeight: "600", marginLeft: -28 },
  secondary: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: "#33577f",
    backgroundColor: "rgba(15, 37, 68, 0.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryDown: { backgroundColor: "rgba(33, 71, 112, 0.72)" },
  secondaryText: { color: "#ffffff", fontSize: 17, fontWeight: "800" },
  look: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 },
  lookText: { fontSize: 15, fontWeight: "600", color: "#9eb5d5" },
});
