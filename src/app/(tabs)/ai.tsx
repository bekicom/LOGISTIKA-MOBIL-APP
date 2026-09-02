/** AI yordamchi — keyingi bosqichda quriladi. */
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Empty } from "@/components/state";
import { color, space } from "@/lib/theme";

export default function Screen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text style={s.title}>AI yordamchi</Text>
      </View>
      <View style={s.body}>
        <Empty icon="sparkle" title="Hali tayyor emas" text="AI K bo'limida quriladi — savol berasiz, u ma'lumotingiz asosida javob beradi." />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card, paddingHorizontal: space.lg, paddingTop: 4,
    paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.border,
  },
  title: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  body: { padding: space.lg },
});
