/**
 * Profil — hozircha asosiy ma'lumot va chiqish.
 *
 * To'liq profil (I bo'limi: tahrir, obuna, qurilmalar, hisobni o'chirish)
 * keyingi bosqichda. Hisobni o'chirish App Store talabi — unutilmasin.
 */
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Button } from "@/components/ui";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, shadow, space } from "@/lib/theme";

const ROLE: Record<string, string> = {
  DRIVER: "Haydovchi",
  SHIPPER: "Yuk egasi",
  VEHICLE_OWNER: "Mashina egasi",
  DISPATCHER: "Dispetcher",
};

export default function Profil() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function confirmLeave() {
    Alert.alert("Chiqish", "Hisobdan chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/til");
        },
      },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text style={s.title}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: space.xl }]} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.top}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.firstName ?? "?").slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>
                {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}
              </Text>
              <Text style={s.role}>{ROLE[user?.role ?? ""] ?? user?.role}</Text>
            </View>
          </View>

          <View style={s.rows}>
            <Row label="FURAM ID" value={String(user?.furamId ?? "—")} mono />
            <Row label="Telefon" value={user?.phone ?? "—"} />
            <Row label="Tasdiqlangan" value={user?.isVerified ? "Ha" : "Yo'q"} />
          </View>
        </View>

        <View style={s.menu}>
          <Item icon="doc" label="Hujjatlarim" soon />
          <Item icon="package" label="Mening e'lonlarim" soon />
          <Item icon="heart" label="Saqlanganlar" soon />
          <Item icon="bell" label="Bildirishnoma sozlamalari" soon />
          <Item icon="user" label="Qurilmalar" soon />
        </View>

        <View style={s.note}>
          <Text style={s.noteText}>Server: {API_BASE}</Text>
        </View>

        <Button title="Chiqish" variant="secondary" onPress={confirmLeave} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, mono && { fontFamily: "monospace" }]}>{value}</Text>
    </View>
  );
}

function Item({ icon, label, soon }: { icon: IconName; label: string; soon?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [s.item, pressed && { backgroundColor: "#fafbfc" }]}>
      <Icon name={icon} size={20} />
      <Text style={s.itemLabel}>{label}</Text>
      {soon ? <Text style={s.soon}>tez orada</Text> : null}
      <Icon name="chevron" size={18} stroke="#cbd5e1" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card, paddingHorizontal: space.lg, paddingTop: 4,
    paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.border,
  },
  title: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  scroll: { padding: space.lg, gap: space.md },

  card: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: space.lg, ...shadow.card,
  },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.logoBlue, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  name: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  role: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },

  rows: { marginTop: space.lg },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.border,
  },
  rowLabel: { fontSize: font.caption, color: color.mutedForeground },
  rowValue: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  menu: { backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1, borderColor: color.border, ...shadow.card },
  item: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border },
  itemLabel: { flex: 1, fontSize: font.body, color: color.foreground },
  soon: { fontSize: 11, color: color.mutedForeground },

  note: { paddingHorizontal: space.xs },
  noteText: { fontSize: 11, color: color.mutedForeground },
});
