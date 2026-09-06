/**
 * A2 — tanishtiruv. Uch panel, barmoq bilan siljiydi.
 *
 * Dizayn-2 (Kornet): ko'k fon, illyustratsiya, sarlavha va matn,
 * nuqtalar, pastda «O'tkazib yuborish» va dumaloq strelka. Oxirgi
 * panel → rol tanlash. «Avval ko'rib chiqish» (mehmon) qoladi —
 * odam nima borligini bilmasdan turib telefon raqamini bermaydi.
 *
 * Slayder — `ScrollView` + `pagingEnabled`: reanimated shart emas,
 * tizim o'zi siliq siljitadi. Nuqtalar `onScroll` dan hisoblanadi.
 */
import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/Text";
import { IlloDocs, IlloMarket, IlloTracking } from "@/components/illustrations";
import { setGuest } from "@/lib/guest";
import { color, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/* Matnlar lug'atda (`mob.intro.*`) — bu yerda faqat tartib va
   kalitlar. Sakkiz til kod ichida yozilsa, ular ajralib ketardi. */
const PANELS = [
  { title: "mob.intro.t1", body: "mob.intro.b1", Illo: IlloMarket },
  { title: "mob.intro.t2", body: "mob.intro.b2", Illo: IlloTracking },
  { title: "mob.intro.t3", body: "mob.intro.b3", Illo: IlloDocs },
] as const;

export default function Tanishtiruv() {
  const [i, setI] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const scroll = useRef<ScrollView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const last = i === PANELS.length - 1;

  function go(k: number) {
    scroll.current?.scrollTo({ x: k * width, animated: true });
  }

  function onEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setI(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + space.lg }]}>
      <View style={s.top}>
        <Logo width={120} light />
        <Pressable onPress={() => router.push("/rol")} hitSlop={12}>
          <Text style={s.skip}>{t("mob.intro.skip")}</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={onEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {PANELS.map((p) => (
          <View key={p.title} style={[s.panel, { width }]}>
            <View style={s.illo}>
              <p.Illo />
            </View>
            <Text style={s.title}>{t(p.title)}</Text>
            <Text style={s.text}>{t(p.body)}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Nuqtalar — faol nuqta cho'ziladi, siljish bilan birga */}
      <View style={s.dots}>
        {PANELS.map((_, k) => {
          const w = x.interpolate({
            inputRange: [(k - 1) * width, k * width, (k + 1) * width],
            outputRange: [8, 26, 8],
            extrapolate: "clamp",
          });
          const o = x.interpolate({
            inputRange: [(k - 1) * width, k * width, (k + 1) * width],
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });
          return <Animated.View key={k} style={[s.dot, { width: w, opacity: o }]} />;
        })}
      </View>

      <View style={s.bottom}>
        {/* AVVAL KO'RIB CHIQISH — web'da shunday, ilovada yo'q edi.
            Ro'yxatdan o'tishni birinchi eshik qilib qo'ysak
            ko'pchilik shu yerda to'xtaydi. */}
        <Pressable
          hitSlop={8}
          onPress={async () => {
            await setGuest(true);
            router.replace("/yuklar");
          }}
        >
          <Text style={s.look}>{t("mob.intro.lookFirst")}</Text>
        </Pressable>

        <Pressable
          onPress={() => (last ? router.push("/rol") : go(i + 1))}
          accessibilityRole="button"
          accessibilityLabel={last ? t("mob.common.continueBtn") : t("mob.tour.next")}
          style={({ pressed }) => [s.next, last && s.nextLast, pressed && { opacity: 0.85 }]}
        >
          {last ? (
            <Text style={s.nextText}>{t("mob.common.continueBtn")}</Text>
          ) : (
            <Icon name="arrow-right" size={26} stroke={color.blue} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.blue },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    minHeight: 44,
  },
  skip: { fontSize: 14, fontWeight: "600", color: "#ffffffcc" },

  panel: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  illo: { marginBottom: 26 },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  text: {
    fontSize: 15,
    color: "#ffffffd9",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 23,
  },

  dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 22 },
  dot: { height: 8, borderRadius: 4, backgroundColor: "#ffffff" },

  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
  },
  look: { fontSize: 14.5, fontWeight: "600", color: "#ffffffd9", textDecorationLine: "underline" },
  next: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  nextLast: { width: undefined, paddingHorizontal: 26, backgroundColor: color.brand },
  nextText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
});
