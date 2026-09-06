/**
 * Ikkilik almashtirgich — «Yuklar / Mashinalar».
 *
 * Nega alohida tab emas: pastda allaqachon oltita tab bor va
 * yettinchisi sig'maydi. Nega ko'milgan tugma ham emas: mashinalar
 * bozori — lentaning YARMI, uni menyu ichiga yashirsak bo'limni hech
 * kim topmasdi.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { color, radius } from "@/lib/theme";

export function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  return (
    <View style={s.wrap}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => !on && onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [s.item, on && s.itemOn, pressed && !on && s.pressed]}
          >
            <Text style={[s.text, on && s.textOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  /* Dizayn-2: pill, faol yarmi ko'k (brend aksenti) */
  wrap: {
    flexDirection: "row",
    backgroundColor: color.card,
    borderRadius: radius.pill,
    padding: 4,
    gap: 3,
  },
  item: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  itemOn: { backgroundColor: color.blue },
  pressed: { backgroundColor: color.muted },
  text: { fontSize: 14, fontWeight: "700", color: color.mutedForeground },
  textOn: { color: "#ffffff" },
});
