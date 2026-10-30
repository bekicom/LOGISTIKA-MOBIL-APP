/**
 * To'rt burchakni barmoq bilan surish (TZ 29-okt §5.2.3).
 *
 * Koordinatalar 0..1 — rasm o'lchamiga bog'liq emas, serverga ham shu
 * holda ketadi (web'dagi `components/skaner/ramka.tsx` bilan bir xil).
 *
 * `react-native-gesture-handler` (ilovada allaqachon bor — nativ modul
 * qo'shilmaydi, OTA yetadi). `onChange` dagi `changeX/changeY` — oxirgi
 * hodisadan beri siljish: boshlang'ich nuqtani saqlash shart emas, har
 * chizishda eng so'nggi burchaklar ishlatiladi.
 */
import { useEffect, useState } from "react";
import { Image, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Polygon } from "react-native-svg";
import { color } from "@/lib/theme";

export type Nuqta = [number, number];
export type Burchaklar = [Nuqta, Nuqta, Nuqta, Nuqta];

const TUTQICH = 34;
const ch = (v: number) => Math.min(1, Math.max(0, v));

function Tutqich({
  i,
  burchaklar,
  eni,
  boyi,
  onChange,
}: {
  i: number;
  burchaklar: Burchaklar;
  eni: number;
  boyi: number;
  onChange: (b: Burchaklar) => void;
}) {
  const [x, y] = burchaklar[i];
  const pan = Gesture.Pan()
    .runOnJS(true)
    .hitSlop(12)
    .minDistance(0)
    .onChange((e) => {
      const b = burchaklar.map((p) => [...p]) as Burchaklar;
      b[i] = [ch(x + e.changeX / eni), ch(y + e.changeY / boyi)];
      onChange(b);
    });
  return (
    <GestureDetector gesture={pan}>
      <View
        style={{
          position: "absolute",
          left: x * eni - TUTQICH / 2,
          top: y * boyi - TUTQICH / 2,
          width: TUTQICH,
          height: TUTQICH,
          borderRadius: TUTQICH / 2,
          borderWidth: 4,
          borderColor: "#ffffff",
          backgroundColor: color.brand,
        }}
      />
    </GestureDetector>
  );
}

export function SkanerRamka({
  uri,
  burchaklar,
  onChange,
}: {
  uri: string;
  burchaklar: Burchaklar;
  onChange: (b: Burchaklar) => void;
}) {
  const [eni, setEni] = useState(0);
  const [nisbat, setNisbat] = useState(4 / 3);
  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => w > 0 && setNisbat(h / w),
      () => {},
    );
  }, [uri]);
  const boyi = eni * nisbat;

  return (
    <GestureHandlerRootView style={{ width: "100%" }}>
      <View onLayout={(e: LayoutChangeEvent) => setEni(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
        {eni > 0 && (
          <View style={{ width: eni, height: boyi }}>
            <Image source={{ uri }} style={{ width: eni, height: boyi, borderRadius: 8 }} resizeMode="stretch" />
            <Svg width={eni} height={boyi} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
              <Polygon
                points={burchaklar.map(([x, y]) => `${x * eni},${y * boyi}`).join(" ")}
                fill="rgba(37,99,235,0.15)"
                stroke="#2563eb"
                strokeWidth={2}
              />
            </Svg>
            {[0, 1, 2, 3].map((i) => (
              <Tutqich key={i} i={i} burchaklar={burchaklar} eni={eni} boyi={boyi} onChange={onChange} />
            ))}
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}
