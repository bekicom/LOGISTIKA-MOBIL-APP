/**
 * «Bozor» yorlig'i — FURAM Bozorning 4 katta bo'limi (TZ v3 §4, §15-17).
 *
 *   Texnika savdosi · Yo'lovchi tashish · Usta va servis · Zapchast
 *
 * Web bilan bir xil (`furam/src/components/bozor-bolimlar.tsx`): avval
 * to'rtta katta bo'lim, bosilgach o'z ekrani ochiladi.
 */
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { HeaderIcons } from "@/components/TabHeader";
import { TilTugma } from "@/components/TilTugma";
import { useAuth } from "@/lib/auth-context";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Web manzili — admin o'chirgan bo'lim chizilmaydi (TZ v2 §8.1) */
const BOLIMLAR: { key: string; to: string; web: string; icon: IconName }[] = [
  { key: "texnika", to: "/bozor", web: "/market", icon: "truck" },
  { key: "yolovchi", to: "/yolovchi", web: "/rides", icon: "users" },
  { key: "usta", to: "/ustaxona", web: "/service", icon: "wrench" },
  { key: "zapchast", to: "/zapchast", web: "/parts", icon: "tag" },
];

export default function BozorBolimlar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { yashirin } = useAuth();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        {/* Til — sarlavha boshida (TZ 29-okt §2.5) */}
        <View style={{ marginRight: 8 }}>
          <TilTugma ixcham />
        </View>
        <Text style={s.title} numberOfLines={1}>
          {t("ishStoli.bozor")}
        </Text>
        <View style={{ flex: 1 }} />
        <HeaderIcons />
      </View>
      <ScrollView contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}>
        {BOLIMLAR.filter((b) => !yashirin(b.web)).map((b) => (
          <Pressable
            key={b.key}
            onPress={() => router.push(b.to as never)}
            accessibilityRole="button"
            style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
          >
            <View style={s.icon}>
              <Icon name={b.icon} size={28} stroke="#ffffff" />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.nom}>{t(`bozor4.${b.key}`)}</Text>
              <Text style={s.izoh} numberOfLines={2}>
                {t(`bozor4.${b.key}Izoh`)}
              </Text>
            </View>
            <Icon name="chevron" size={18} stroke={color.faintText} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  title: { fontSize: 24, fontWeight: "800", color: color.foreground, letterSpacing: -0.5, flexShrink: 1 },
  list: { padding: space.lg, gap: space.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 92,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.card,
    ...shadow.card,
  },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: color.brand },
  nom: { fontSize: 17, fontWeight: "800", color: color.foreground },
  izoh: { fontSize: 13, color: color.mutedForeground },
}));
