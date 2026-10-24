/**
 * Rasmlar butun ekranda — surish va kattalashtirish (TZ v2 §7, 2026-10-24).
 *
 * Mijoz: «e'londa 10 ta rasm bo'lsa ham ko'rinmaydi, kattalashtirib
 * bo'lmaydi». Bozor e'lonida kichik galereya surilardi, lekin
 * tirkamaning zangi yoki shinaning yeyilganini ko'rish uchun rasmni
 * kattalashtirish kerak — webda bor (`sale-gallery.tsx`), ilovada
 * yo'q edi (6-qoida: webda nima bo'lsa mobilda ham).
 *
 * Ikki barmoq — kattalashtirish (1–4 barobar), ikki marta bosish —
 * 2,5 barobar / qaytish, kattalashganda bir barmoq — surish. Rasm
 * kattalashgan paytda kadrlar orasida surish O'CHADI: aks holda rasm
 * ichida yurmoqchi bo'lgan odam keyingi rasmga o'tib ketardi.
 *
 * Ro'yxat chegaralangan — e'longa ko'pi bilan 10 ta rasm
 * (`MAX_SALE_PHOTOS`), shuning uchun `ScrollView`.
 */
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { t } from "@/lib/i18n";

const MAX = 4;
const IKKI_BOSISH = 2.5;

type Manba = ImageSourcePropType;

export function RasmlarEkrani({
  rasmlar,
  boshi,
  onYop,
}: {
  rasmlar: Manba[];
  /** Qaysi rasmdan ochiladi */
  boshi: number;
  onYop: (oxirgi: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(boshi);
  const [katta, setKatta] = useState(false);

  return (
    <Modal visible animationType="fade" onRequestClose={() => onYop(i)} statusBarTranslucent>
      {/* Modal o'z oynasida ochiladi — imo-ishora ildizi shu yerda ham kerak */}
      <GestureHandlerRootView style={s.root}>
        <ScrollView
          horizontal
          pagingEnabled
          scrollEnabled={!katta}
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: boshi * width, y: 0 }}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {rasmlar.map((r, j) => (
            <Kattalashuvchi key={j} manba={r} width={width} height={height} faol={j === i} onKatta={setKatta} />
          ))}
        </ScrollView>

        <Pressable
          onPress={() => onYop(i)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("mob.common.close")}
          style={[s.yop, { top: insets.top + 8 }]}
        >
          <Icon name="close" size={20} stroke="#fff" />
        </Pressable>
        {rasmlar.length > 1 ? (
          <View style={[s.son, { bottom: insets.bottom + 16 }]}>
            <Text style={s.sonText}>
              {i + 1} / {rasmlar.length}
            </Text>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function Kattalashuvchi({
  manba,
  width,
  height,
  faol,
  onKatta,
}: {
  manba: Manba;
  width: number;
  height: number;
  faol: boolean;
  onKatta: (v: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const boshScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const boshX = useSharedValue(0);
  const boshY = useSharedValue(0);

  /* Rasm ekrandan chiqib ketmasin: kattalashgan qismining yarmigacha */
  const chegara = (v: number, olcham: number, k: number) => {
    "worklet";
    const m = (olcham * (k - 1)) / 2;
    return Math.min(m, Math.max(-m, v));
  };

  const qaytar = () => {
    "worklet";
    scale.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    scheduleOnRN(onKatta, false);
  };

  const pinch = Gesture.Pinch()
    .enabled(faol)
    .onStart(() => {
      boshScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX, Math.max(0.8, boshScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.05) qaytar();
      else scheduleOnRN(onKatta, true);
    });

  const pan = Gesture.Pan()
    .enabled(faol)
    /* Kattalashmagan rasmda surish — kadrlar orasida (ScrollView) */
    .manualActivation(true)
    .onTouchesMove((_e, st) => {
      if (scale.value > 1.05) st.activate();
      else st.fail();
    })
    .onStart(() => {
      boshX.value = tx.value;
      boshY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = chegara(boshX.value + e.translationX, width, scale.value);
      ty.value = chegara(boshY.value + e.translationY, height, scale.value);
    });

  const ikki = Gesture.Tap()
    .enabled(faol)
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) qaytar();
      else {
        scale.value = withTiming(IKKI_BOSISH);
        scheduleOnRN(onKatta, true);
      }
    });

  const uslub = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, ikki)}>
      <View style={{ width, height, justifyContent: "center" }}>
        <Animated.Image source={manba} style={[{ width, height }, uslub]} resizeMode="contain" />
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  yop: {
    position: "absolute",
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  son: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  sonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
