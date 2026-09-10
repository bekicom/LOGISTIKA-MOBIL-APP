/**
 * Tab ekranlarining sarlavhasi — chapda nom, o'ngda chat va
 * qo'ng'iroq (o'qilmagan sanoq bilan).
 *
 * Chat va bildirishnoma tab bardan CHIQDI (dizayn-2): to'rtta
 * namuna ilovada ham ular tepada ikonka. Tab bar beshtadan oshmasin
 * uchun shu yo'l.
 *
 * 2026-09-07 da PROFIL ham shu yerga qo'shildi: pastdagi o'rnini AI
 * egalladi. Avatar ilgari faqat bosh sahifada edi — agar shu yerga
 * ko'chirilmasa, «Yuklar» yoki «Menyu» dan profilga yo'l umuman
 * qolmasdi.
 *
 * Mehmonda ikonkalar yo'q — ularning serveri 401 beradi.
 */
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { refreshChatCount, useCounts } from "@/lib/counts";
import { color, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

function IconButton({
  icon,
  count,
  label,
  onPress,
}: {
  icon: IconName;
  count?: number;
  label: string;
  onPress: () => void;
}) {
  const n = count ?? 0;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={21} stroke={color.foreground} />
      {/* `count && …` EMAS: 0 bo'lsa RN «0» ni matnsiz chizmoqchi
          bo'ladi va qizil ekran beradi */}
      {n > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{n > 99 ? "99+" : n}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** O'ngdagi ikonkalar — bosh sahifa o'z sarlavhasida ham shuni ishlatadi */
export function HeaderIcons({ search }: { search?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const guest = !user && isGuest();
  const counts = useCounts();

  useEffect(() => {
    if (user) void refreshChatCount();
  }, [user]);

  return (
    <View style={s.icons}>
      {search ? (
        <IconButton icon="search" label={t("mob.search.startTitle")} onPress={() => router.push("/qidiruv")} />
      ) : null}
      {!guest ? (
        <>
          <IconButton
            icon="chat"
            count={counts.chat}
            label={t("mob.nav.chat")}
            onPress={() => router.push("/chat")}
          />
          <IconButton
            icon="bell"
            count={counts.notif}
            label={t("mob.profile.notifications")}
            onPress={() => router.push("/bildirishnomalar")}
          />
          {/* Profil — eng o'ngda, ikonka emas BOSH HARFLAR bilan:
              odam o'z hisobini shundan taniydi va u boshqa
              ikonkalar orasida yo'qolib ketmaydi. */}
          <Pressable
            onPress={() => router.push("/profil")}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("mob.nav.profile")}
            style={({ pressed }) => [s.avatar, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.avatarText}>
              {(user?.firstName ?? "?").slice(0, 2).toUpperCase()}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export function TabHeader({
  title,
  subtitle,
  search,
}: {
  title: string;
  subtitle?: string;
  search?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.head, { paddingTop: insets.top + 6 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
      <HeaderIcons search={search} />
    </View>
  );
}

const s = themed(() => ({
  head: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingBottom: 10,
    backgroundColor: color.background,
  },
  title: { fontSize: 24, fontWeight: "800", color: color.foreground, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: color.mutedForeground, marginTop: 1 },

  icons: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: color.background,
  },
  badgeText: { fontSize: 9.5, fontWeight: "700", color: "#fff" },
}));
