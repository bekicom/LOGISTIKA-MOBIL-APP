/** A2 — tanishtiruv. Toza, silliq onboarding. */
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
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
  const last = i === PANEL_META.length - 1;

  async function next() {
    if (last) router.push("/royxat");
    else setI((v) => v + 1);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + space.xl }]}>
      <View style={s.top}>
        <Logo width={136} light />
      </View>

      <View style={s.copy}>
        <Text style={s.title}>{t(panel.title)}</Text>
        <Text style={s.text}>{t(panel.body)}</Text>
      </View>

      <View style={s.imageWrap}>
        <Image source={HERO_IMAGES[i]} style={s.image} resizeMode="cover" />
      </View>

      <View style={s.bottom}>
        <View style={s.dots}>
          {PANEL_META.map((_, k) => (
            <Pressable key={k} onPress={() => setI(k)} hitSlop={10}>
              <View style={[s.dot, k === i && s.dotOn]} />
            </Pressable>
          ))}
        </View>

        <View style={s.bottomRow}>
          <Pressable
            hitSlop={8}
            onPress={async () => {
              await setGuest(true);
              router.replace("/yuklar");
            }}
          >
            <Text style={s.skip}>{t("mob.intro.lookFirst")}</Text>
          </Pressable>

          <Pressable onPress={next} style={({ pressed }) => [s.next, pressed && { opacity: 0.78 }]}>
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path d="M5 12h14M13 6l6 6-6 6" stroke={color.brand} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/kirish")} style={s.signIn}>
          <Text style={s.signInText}>{t("mob.intro.signIn")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#3556d8", paddingHorizontal: space.xl },
  top: { minHeight: 52, justifyContent: "center" },
  copy: { alignItems: "center", marginTop: 58 },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  text: {
    fontSize: font.body,
    lineHeight: 22,
    color: "rgba(255,255,255,0.84)",
    textAlign: "center",
    marginTop: 14,
  },
  imageWrap: {
    flex: 1,
    marginTop: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    maxWidth: 310,
    aspectRatio: 1,
    borderRadius: 28,
  },
  bottom: { gap: 18 },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.36)" },
  dotOn: { width: 24, backgroundColor: "#ffffff" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skip: { fontSize: font.body, fontWeight: "700", color: "#ffffff" },
  next: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  signIn: { height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  signInText: { fontSize: font.bodyLg, color: "rgba(255,255,255,0.82)", fontWeight: "800" },
});
