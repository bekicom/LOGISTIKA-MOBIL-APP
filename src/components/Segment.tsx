/**
 * Ikkilik almashtirgich — «Yuklar / Mashinalar».
 *
 * Nega alohida tab emas: pastda allaqachon oltita tab bor va
 * yettinchisi sig'maydi. Nega ko'milgan tugma ham emas: mashinalar
 * bozori — lentaning YARMI, uni menyu ichiga yashirsak bo'limni hech
 * kim topmasdi.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, radius } from "@/lib/theme";

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
  wrap: {
    flexDirection: "row",
    backgroundColor: color.muted,
    borderRadius: radius.control + 2,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    height: 38,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  itemOn: { backgroundColor: color.card },
  pressed: { backgroundColor: "#e2e8f0" },
  text: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
  textOn: { color: color.foreground },
});
