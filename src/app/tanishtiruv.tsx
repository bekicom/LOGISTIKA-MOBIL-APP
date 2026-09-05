/**
 * A2 — tanishtiruv (2026-09-05, yangi dizayn).
 *
 * ── SURILADI, ALMASHMAYDI ───────────────────────────────────────
 *
 * Ilgari panellar bosilganda BIRDAN almashardi — matn joyida
 * o'zgarib qolardi va odam qayerga o'tganini sezmasdi. Endi ular
 * yonma-yon turadi va barmoq bilan suriladi: qaysi tomonga
 * ketayotgani, nechtadan nechanchisi ekani harakatning o'zidan
 * ko'rinadi.
 *
 * Nuqtalar ham sakramaydi — surish bilan birga cho'ziladi
 * (`scrollX` ga bog'langan).
 *
 * ── OXIRGI PANELGACHA BITTA TUGMA ───────────────────────────────
 *
 * Ilgari uchala panelda ham «Ro'yxatdan o'tish / Kirish / Avval
 * ko'rib chiqaman» turardi — ya'ni birinchi ekrandayoq qaror
 * so'ralardi, holbuki odam hali nima taklif qilinayotganini
 * bilmaydi. Endi oxirgi panelgacha faqat «Davom etish».
 *
 * ── ILLYUSTRATSIYALAR ───────────────────────────────────────────
 *
 * ⚠️ Hozir uchala panelda ham BITTA rasm turibdi. 2 va 3-panel
 * uchun o'z rasmi kerak (reys kuzatuvi, hujjat va pul) — kelganda
 * `PANELS` dagi `img` almashtiriladi, boshqa hech narsa emas.
 */
import { useRef, useState } from "react";
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { setGuest } from "@/lib/guest";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const GLOBUS = require("../../assets/images/onboarding-globus.png");

/* Matnlar lug'atda (`mob.intro.*`) — bu yerda faqat tartib va
   kalitlar. Sakkiz til kod ichida yozilsa, ular ajralib ketardi. */
const PANELS = [
  { title: "mob.intro.t1", body: "mob.intro.b1", img: GLOBUS },
  { title: "mob.intro.t2", body: "mob.intro.b2", img: GLOBUS },
  { title: "mob.intro.t3", body: "mob.intro.b3", img: GLOBUS },
] as const;

const LAST = PANELS.length - 1;

export default function Tanishtiruv() {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const end = i === LAST;

  const list = useRef<Animated.FlatList<(typeof PANELS)[number]>>(null);
  /* `useRef` EMAS, `useState`: `react-hooks/refs` qoidasi ref ni
     chizish paytida o'qishni taqiqlaydi, `interpolate()` esa
     aynan chizishda kerak. */
  const [scrollX] = useState(() => new Animated.Value(0));

  function go(next: number) {
    list.current?.scrollToOffset({ offset: next * width, animated: true });
  }

  function onEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const n = Math.round(e.nativeEvent.contentOffset.x / width);
    if (n !== i) setI(n);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }]}>
      <View style={s.top}>
        <Logo width={112} />
        {!end && (
          <Pressable onPress={() => go(LAST)} hitSlop={12}>
            <Text style={s.skip}>{t("mob.intro.skip")}</Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={list}
        data={PANELS}
        keyExtractor={(p) => p.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        /* `useNativeDriver: false` — nuqtaning KENGLIGI o'zgaradi,
           bu esa joylashuv xossasi va tabiiy ipda hisoblanadi.
           Uchta nuqta uchun bu arzon. */
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[s.page, { width }]}>
            <View style={s.art}>
              <Image source={item.img} style={s.img} resizeMode="contain" />
            </View>
            <Text style={s.title}>{t(item.title)}</Text>
            <Text style={s.text}>{t(item.body)}</Text>
          </View>
        )}
      />

      <View style={s.dots}>
        {PANELS.map((p, k) => (
          <Animated.View
            key={p.title}
            style={[
              s.dot,
              {
                width: scrollX.interpolate({
                  inputRange: [(k - 1) * width, k * width, (k + 1) * width],
                  outputRange: [7, 24, 7],
                  extrapolate: "clamp",
                }),
                backgroundColor: scrollX.interpolate({
                  inputRange: [(k - 1) * width, k * width, (k + 1) * width],
                  outputRange: [color.border, color.brand, color.border],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        ))}
      </View>

      <View style={s.footer}>
        {end ? (
          <>
            <Button title={t("mob.intro.signUp")} onPress={() => router.push("/royxat")} />
            <Button
              title={t("mob.intro.signIn")}
              variant="secondary"
              onPress={() => router.push("/kirish")}
            />

            {/* AVVAL KO'RIB CHIQISH — web'da shunday, ilovada yo'q
                edi. Odam nima borligini bilmasdan turib telefon
                raqamini bermaydi; ro'yxatdan o'tishni birinchi
                eshik qilib qo'ysak ko'pchilik shu yerda to'xtaydi. */}
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
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [s.next, pressed && { backgroundColor: color.brandHover }]}
            onPress={() => go(i + 1)}
          >
            <Text style={s.nextText}>{t("mob.common.continueBtn")}</Text>
            <Icon name="arrow-right" size={19} stroke="#fff" />
          </Pressable>
        )}
      </View>
    </View>
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
    minHeight: 44,
  },
  skip: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },

  page: { justifyContent: "center", paddingHorizontal: 28 },
  /* Rasm balandligi FOIZDA: kichik telefonlarda (SE) sarlavhani
     ekrandan itarib chiqarmasin */
  art: { height: "46%", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  img: { width: "100%", height: "100%" },

  /* Matn chapga tekislangan: sarlavha ruschada uch qatorga
     cho'zilganda markazlangan matn «zinapoya» bo'lib ko'rinadi */
  title: {
    fontSize: font.display,
    fontWeight: "700",
    color: color.foreground,
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  text: {
    fontSize: font.body,
    color: color.mutedForeground,
    marginTop: 12,
    lineHeight: 23,
  },

  dots: { flexDirection: "row", gap: 7, paddingHorizontal: 28, paddingVertical: 22 },
  dot: { height: 7, borderRadius: 4 },

  footer: { paddingHorizontal: space.xl, gap: 10 },
  next: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.brand,
  },
  nextText: { fontSize: font.bodyLg, fontWeight: "700", color: "#fff" },

  look: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16, marginTop: 2 },
  lookText: { fontSize: 14.5, fontWeight: "600", color: color.mutedForeground },
});
