/**
 * I1 — profil.
 *
 * ⚠️ TARIF KARTASI iOS VA ANDROID'DA BOSHQACHA.
 *
 * App Store Guideline 3.1.1: ilova ichida raqamli xizmat sotilsa,
 * to'lov faqat Apple'ning o'z tizimi orqali o'tishi kerak. Narxni
 * ko'rsatish, «sotib olish» tugmasi qo'yish yoki saytga havola
 * berish — hammasi rad qilish sababi.
 *
 * Shuning uchun iOS'da FAQAT HOLAT ko'rinadi: qaysi tarif va necha
 * kun qolgani. Narx ham, tugma ham, havola ham yo'q. Android'da
 * hammasi bor. Ayni shu farqni `diip.uz` ham qilgan.
 *
 * Atamalar ham ataylab tanlangan: «obuna» so'zi Apple tekshiruvida
 * IAP talabini chaqiradi, shuning uchun «xizmat rejasi» deyiladi.
 */
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Card, GroupLabel, ListRow } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space } from "@/lib/theme";

const ROLE: Record<string, string> = {
  DRIVER: "Haydovchi",
  SHIPPER: "Yuk egasi",
  VEHICLE_OWNER: "Mashina egasi",
  DISPATCHER: "Dispetcher",
  USER: "Oddiy foydalanuvchi",
};

type Trust = {
  score: number | null;
  bandLabel: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  tripsClosed: number;
};

/** Muddatgacha necha kun qolgani; o'tib ketgan yoki yo'q bo'lsa null */
function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86400000) : null;
}

export default function Profil() {
  const { user, signOut, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const trust = useApi<Trust>(user ? `/api/trust/${user.id}` : null, [user?.id]);

  const vip = daysLeft(user?.vipUntil);
  const premium = daysLeft(user?.premiumUntil);
  const plan = vip ? "VIP" : premium ? "Kengaytirilgan" : null;
  const left = vip ?? premium;

  async function copyId() {
    if (!user) return;
    await Clipboard.setStringAsync(String(user.furamId));
    Alert.alert("Nusxalandi", `FURAM ID: ${user.furamId}`);
  }

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
        <Pressable
          onPress={() => router.push("/profil/tahrir")}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Text style={s.edit}>Tahrirlash</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={trust.refreshing}
            onRefresh={() => {
              void refresh();
              trust.refresh();
            }}
            tintColor={color.brand}
          />
        }
      >
        {/* Kim */}
        <View style={s.person}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.firstName ?? "?").slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>
            {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}
          </Text>
          <Text style={s.role}>{ROLE[user?.role ?? ""] ?? user?.role}</Text>

          <Pressable onPress={copyId} style={({ pressed }) => [s.idChip, pressed && { opacity: 0.6 }]}>
            <Text style={s.idText}>FURAM ID: {user?.furamId ?? "—"}</Text>
            <Icon name="doc" size={13} stroke={color.mutedForeground} />
          </Pressable>
        </View>

        {/* Ishonch */}
        <Card style={{ padding: space.lg }}>
          <View style={s.trustTop}>
            <Text style={s.trustLabel}>Ishonch bali</Text>
            {trust.data?.bandLabel ? (
              <Text style={s.band}>{trust.data.bandLabel}</Text>
            ) : null}
          </View>
          <View style={s.stats}>
            <Stat value={trust.data?.score != null ? String(trust.data.score) : "—"} label="ball" />
            <Stat
              value={trust.data?.ratingAvg != null ? trust.data.ratingAvg.toFixed(1) : "—"}
              label={`reyting${trust.data?.ratingCount ? ` (${trust.data.ratingCount})` : ""}`}
            />
            <Stat value={String(trust.data?.tripsClosed ?? 0)} label="yopilgan reys" last />
          </View>
        </Card>

        {/* Tarif — platformaga qarab */}
        <Card style={{ padding: space.lg }}>
          <View style={s.planTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.planName}>{plan ? `${plan} rejasi` : "Bepul reja"}</Text>
              <Text style={s.planHint}>
                {plan
                  ? left != null
                    ? `${left} kun qoldi`
                    : "Muddati tugagan"
                  : "Asosiy imkoniyatlar ochiq"}
              </Text>
            </View>
            {plan ? <Text style={s.planBadge}>FAOL</Text> : null}
          </View>

          {plan && left != null ? (
            <View style={s.bar}>
              {/* 365 kunlik reja bo'yicha taxminiy ulush */}
              <View style={[s.barFill, { width: `${Math.min(100, (left / 365) * 100)}%` }]} />
            </View>
          ) : null}

          {Platform.OS === "ios" ? (
            /* iOS: narx, tugma va havola YO'Q — Guideline 3.1.1 */
            <Text style={s.iosNote}>
              Xizmat rejasini boshqarish veb-versiyada mavjud. Faol reja shu
              yerda ko&apos;rinadi.
            </Text>
          ) : (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <Text style={s.price}>
                {plan ? "Muddatni uzaytirish" : "Kengaytirilgan reja — oyiga 99 000 so'm"}
              </Text>
              <Button
                title={plan ? "Uzaytirish" : "Rejani ochish"}
                onPress={() => Alert.alert("Tez orada", "To'lov oqimi keyingi bosqichda ulanadi.")}
              />
            </View>
          )}
        </Card>

        {/* Menyu */}
        <View>
          <GroupLabel>HISOB</GroupLabel>
          <Card>
            <ListRow
              icon={<Badge icon="user" />}
              title="Profilni tahrirlash"
              onPress={() => router.push("/profil/tahrir")}
            />
            <ListRow
              icon={<Badge icon="bell" />}
              title="Bildirishnomalar"
              hint="Nima haqida va qaysi yo'l bilan"
              onPress={() => router.push("/profil/bildirishnoma")}
            />
            <ListRow
              icon={<Badge icon="check" />}
              title="Qurilmalar"
              hint="Kirgan qurilmalarni ko'rish va uzish"
              onPress={() => router.push("/profil/qurilmalar")}
              last
            />
          </Card>
        </View>

        <View>
          <GroupLabel>MENING ISHIM</GroupLabel>
          <Card>
            <ListRow icon={<Badge icon="package" />} title="E'lonlarim" right={<Soon />} />
            <ListRow icon={<Badge icon="heart" />} title="Saqlanganlar" right={<Soon />} />
            <ListRow icon={<Badge icon="doc" />} title="Hujjatlarim" right={<Soon />} last />
          </Card>
        </View>

        {/* Chiqish va o'chirish */}
        <View style={{ gap: space.md, marginTop: space.sm }}>
          <Button title="Chiqish" variant="secondary" onPress={confirmLeave} />
          <Text style={s.delete} onPress={() => router.push("/profil/ochirish")}>
            Hisobni o&apos;chirish
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <View style={[s.stat, !last && s.statLine]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Badge({ icon }: { icon: IconName }) {
  return (
    <View style={s.badge}>
      <Icon name={icon} size={18} stroke={color.brand} />
    </View>
  );
}

function Soon() {
  return <Text style={s.soon}>tez orada</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card, flexDirection: "row", alignItems: "center",
    paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.md,
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  edit: { fontSize: font.body, fontWeight: "600", color: color.brand },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },

  person: { alignItems: "center", gap: 6, paddingTop: space.sm },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: color.logoBlue,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  name: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  role: { fontSize: font.caption, color: color.mutedForeground },
  idChip: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6,
    backgroundColor: color.card, borderWidth: 1, borderColor: color.border,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  idText: { fontSize: font.caption, fontWeight: "600", color: color.foreground },

  trustTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  trustLabel: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  band: {
    fontSize: 11, fontWeight: "700", color: color.success,
    backgroundColor: color.success + "1f", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: "hidden",
  },
  stats: { flexDirection: "row", marginTop: space.lg },
  stat: { flex: 1, alignItems: "center" },
  statLine: { borderRightWidth: 1, borderRightColor: color.border },
  statValue: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  statLabel: { fontSize: 11, color: color.mutedForeground, marginTop: 2, textAlign: "center" },

  planTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  planName: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  planHint: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  planBadge: {
    fontSize: 10, fontWeight: "700", color: color.brand,
    backgroundColor: color.brand + "1f", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: "hidden",
  },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.muted, marginTop: space.md, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: color.brand },
  iosNote: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: space.md },
  price: { fontSize: font.caption, color: color.mutedForeground },

  badge: {
    width: 34, height: 34, borderRadius: radius.control,
    backgroundColor: color.brand + "1f", alignItems: "center", justifyContent: "center",
  },
  soon: { fontSize: 11, color: color.mutedForeground },

  delete: {
    textAlign: "center", fontSize: font.caption, fontWeight: "600",
    color: color.danger, paddingVertical: space.md,
  },
});
