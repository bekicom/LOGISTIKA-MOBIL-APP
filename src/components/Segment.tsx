/**
 * Ikkilik almashtirgich — «Yuklar / Mashinalar».
 *
 * Nega alohida tab emas: pastda allaqachon oltita tab bor va
 * yettinchisi sig'maydi. Nega ko'milgan tugma ham emas: mashinalar
 * bozori — lentaning YARMI, uni menyu ichiga yashirsak bo'limni hech
 * kim topmasdi.
 */
import { useEffect, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/Text";
import { color, radius, themed } from "@/lib/theme";
import { SPRING, useReduceMotion } from "@/lib/motion";

export function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  /* ── SIRG'ALUVCHI BELGI (2026-09-13) ──────────────────────────
     Ilgari faol yarmi DARROV o'rin almashardi — ko'zga sakrash
     bo'lib ko'rinadi va odam qaysi tomonga o'tganini ilg'amaydi.
     Endi belgi surilib boradi: harakatning O'ZI qaysi tomonga
     o'tilganini aytadi.

     Kenglik o'lchanadi (`onLayout`), chunki yorliq matni tilga
     qarab har xil uzunlikda bo'ladi — qat'iy son yozib bo'lmaydi. */
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  /* `useRef` EMAS: chizish paytida `ref.current` ni o'qish
     lint'da taqiqlangan (`react-hooks/refs`). Loyihada shu
     naqsh `Sheet.tsx` da ham ishlatilgan. */
  const [x] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();

  const step = options.length > 0 ? w / options.length : 0;

  useEffect(() => {
    const to = step * idx;
    if (reduce || step === 0) {
      x.setValue(to);
      return;
    }
    Animated.spring(x, { toValue: to, useNativeDriver: true, ...SPRING }).start();
  }, [idx, step, x, reduce]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 8);

  return (
    <View style={s.wrap} onLayout={onLayout}>
      {step > 0 ? (
        <Animated.View
          style={[s.marker, { width: step - 3, transform: [{ translateX: x }] }]}
          pointerEvents="none"
        />
      ) : null}

      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              if (on) return;
              /* Tanlov tebranishi — eng yengil turi: bu ma'noli
                 amal, lekin «saqlash» darajasida emas */
              void Haptics.selectionAsync();
              onChange(o.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [s.item, pressed && !on && s.pressed]}
          >
            {/* SIG'MASA KICHRAYADI (2026-09-20, 320 px): ruscha
                yorliqlar («Предстоящие», «Завершённые») tor ekranda
                kesilardi — uchtasi bir qatorda turadi */}
            <Text
              style={[s.text, on && s.textOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ⚠️ `themed` — `StyleSheet.create` EMAS (2026-09-10).
   `create` qiymatni modul yuklanganda muzlatadi, ya'ni qorong'i
   rejimga o'tilganda bu komponent yorug' ranglarda qolib
   ketardi. Loyihadagi qolgan 155 fayl allaqachon `themed` da. */
const s = themed(() => ({
  /* Dizayn-2: pill, faol yarmi ko'k (brend aksenti) */
  wrap: {
    flexDirection: "row",
    backgroundColor: color.card,
    borderRadius: radius.pill,
    padding: 4,
    gap: 3,
  },
  /* Faol yarmini BELGI chizadi, `itemOn` emas — shuning uchun u
     endi ishlatilmaydi, lekin rangi bu yerdan olinadi */
  marker: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: radius.pill,
    backgroundColor: color.navy,
  },
  item: {
    flex: 1,
    height: 36,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  itemOn: { backgroundColor: color.blue },
  pressed: { backgroundColor: color.muted },
  text: { fontSize: 14, fontWeight: "700", color: color.mutedForeground },
  textOn: { color: "#ffffff" },
}));
