/**
 * «+» yorlig'ining EKRAN ko'rinishi.
 *
 * Odatda bu yerga kelinmaydi: tab bardagi tugma pastdan varaq
 * ochadi (`(tabs)/_layout.tsx`). Lekin expo-router har yorliq
 * uchun fayl so'raydi va manzil to'g'ridan-to'g'ri ochilib
 * qolsa (deep link, «orqaga» tarixi) bo'sh ekran chiqmasin.
 */
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabHeader } from "@/components/TabHeader";
import { PostActions } from "@/components/PostSheet";
import { Card } from "@/components/ui";
import { color, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function JoylashTab() {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.root}>
      <TabHeader title={t("mob.post.title")} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        <Card style={{ padding: space.sm }}>
          <PostActions />
        </Card>
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },
}));
