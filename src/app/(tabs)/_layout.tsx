/**
 * Tab bar — beshta bo'lim, o'rtada «+».
 *
 * ── DIZAYN-2 (2026-09-06) ────────────────────────────────────────
 *
 * Ilgari oltita yorliq bor edi (web'dagi pastki menyu nusxasi):
 * bosh, yuklar, reyslar, chat, AI, profil. Bekzod: «ilova tuzilishi
 * mobil bo'lsin». Namuna ilovalarning hammasida beshta va o'rtada
 * katta «yaratish» tugmasi. Endi:
 *
 *   Bosh | Yuklar | (+) | Menyu | Profil
 *
 * Reyslar, chat, AI tabdan chiqdi: chat va bildirishnoma — har
 * sarlavhaning o'ng burchagida (`TabHeader`), reyslar va AI —
 * menyuda va bosh sahifada.
 *
 * ── «+» EKRAN EMAS ──────────────────────────────────────────────
 *
 * O'rtadagi tugma pastdan varaq ochadi (`PostSheet`). `joylash.tsx`
 * fayli baribir kerak — expo-router har yorliq uchun fayl so'raydi;
 * u to'g'ridan-to'g'ri manzil bilan ochilsa (deep link) o'sha
 * ro'yxatni oddiy ekran qilib ko'rsatadi.
 *
 * ── MEHMONDA ────────────────────────────────────────────────────
 *
 * Kirmagan odamga «Bosh» ochilmaydi — serveri 401 beradi. Yorliq
 * YASHIRILADI (`href: null`), o'chirilmaydi — kirgandan keyin darrov
 * paydo bo'ladi. «+» mehmonda kirish taklifini chiqaradi.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { PostSheet } from "@/components/PostSheet";
import { Tour } from "@/components/Tour";
import { clearTourRequest, markSeen, seen, useSplashDone, useTourRequest } from "@/lib/first-run";
import { color, shadow } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { guestBlocked } from "@/lib/guest-gate";
import { t } from "@/lib/i18n";

type Tab = { name: string; title: string; icon: IconName; guest: boolean; center?: boolean };

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function tabs(guest: boolean): Tab[] {
  return [
    { name: "bosh", title: t("mob.nav.home"), icon: "home", guest: false },
    { name: "yuklar", title: t("mob.nav.loads"), icon: "package", guest: true },
    { name: "joylash", title: t("mob.nav.post"), icon: "plus", guest: true, center: true },
    { name: "menyu", title: t("mob.nav.menu"), icon: "grid", guest: true },
    {
      name: "profil",
      /* Mehmonda bu yorliq profil emas — kirish taklifi. */
      title: guest ? t("mob.intro.signIn") : t("mob.nav.profile"),
      icon: "user",
      guest: true,
    },
  ];
}

/** O'rtadagi ko'tarilgan tugma — tab bar o'zi chizmaydi, biz chizamiz */
function CenterButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={s.centerWrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [s.center, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Icon name="plus" size={28} stroke="#ffffff" />
      </Pressable>
      <Text style={s.centerLabel}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  /* `isGuest()` — oddiy o'zgaruvchi, o'zgarganda ekran qayta
     chizilmaydi. Mehmon kirgan zahoti yorliqlar qaytib kelishi
     uchun `user` ga qaraymiz: u holat, ya'ni o'zgarsa React
     shu joyni qayta chizadi. */
  const { user } = useAuth();
  const guest = !user && isGuest();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState(false);

  /* Yo'l-yo'riq — kirgan odamga, bir marta, splash tugagach.
     Mehmonga emas: uning tab bari boshqacha (bosh yo'q). */
  const [tour, setTour] = useState(false);
  const splashDone = useSplashDone();
  const wanted = useTourRequest();
  useEffect(() => {
    if (wanted) {
      clearTourRequest();
      setTour(true);
    }
  }, [wanted]);
  useEffect(() => {
    if (!user || guest || !splashDone) return;
    let alive = true;
    void seen("tourSeen").then((v) => {
      if (alive && !v) setTour(true);
    });
    return () => {
      alive = false;
    };
  }, [user, guest, splashDone]);

  function openPost() {
    if (guest && guestBlocked()) return;
    setPost(true);
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color.brand,
          tabBarInactiveTintColor: "#8a94a6",
          tabBarStyle: {
            backgroundColor: color.card,
            borderTopWidth: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            ...shadow.bar,
          },
          tabBarItemStyle: { paddingVertical: 2 },
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Manrope_600SemiBold" },
        }}
      >
        {tabs(guest).map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: guest && !tab.guest ? null : undefined,
              tabBarIcon: ({ color: c }) => <Icon name={tab.icon} stroke={c} size={23} />,
              ...(tab.center
                ? { tabBarButton: () => <CenterButton label={tab.title} onPress={openPost} /> }
                : null),
            }}
          />
        ))}
      </Tabs>

      <PostSheet open={post} onClose={() => setPost(false)} />
      <Tour
        open={tour}
        onDone={() => {
          setTour(false);
          void markSeen("tourSeen");
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "flex-start", top: -18 },
  center: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: color.card,
    ...shadow.float,
  },
  centerLabel: { fontSize: 11, fontWeight: "600", color: "#8a94a6", marginTop: 2 },
});
