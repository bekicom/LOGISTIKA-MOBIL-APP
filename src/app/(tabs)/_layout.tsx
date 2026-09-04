/**
 * Oltita bo'lim — web'dagi pastki menyu bilan bir xil
 * (`furam/src/components/layout/bottom-nav.tsx`).
 *
 * ── MEHMONDA IKKITA ─────────────────────────────────────────────
 *
 * Kirmagan odamga «Bosh sahifa», «Reyslar», «Chat» va «AI» ochilmaydi
 * — ularning serveri 401 beradi. Yorliq turib, bosilganda xato
 * chiqishi eng yomon variant: odam ilova buzuq deb o'ylaydi.
 * Shuning uchun yorliq YASHIRILADI (`href: null`), o'chirilmaydi —
 * marshrut o'z joyida qoladi va kirgandan keyin darrov paydo bo'ladi.
 */
import { Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { color } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { t } from "@/lib/i18n";

type Tab = { name: string; title: string; icon: IconName; guest: boolean };

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function tabs(guest: boolean): Tab[] {
  return [
    { name: "bosh", title: t("mob.nav.home"), icon: "home", guest: false },
    { name: "yuklar", title: t("mob.nav.loads"), icon: "package", guest: true },
    { name: "reyslar", title: t("mob.nav.trips"), icon: "route", guest: false },
    { name: "chat", title: t("mob.nav.chat"), icon: "chat", guest: false },
    { name: "ai", title: "AI", icon: "sparkle", guest: false },
    {
      name: "profil",
      /* Mehmonda bu yorliq profil emas — kirish taklifi va ochiq
         bo'limlar ro'yxati. Nomi ham shunga qarab o'zgaradi. */
      title: guest ? t("mob.intro.signIn") : t("mob.nav.profile"),
      icon: "user",
      guest: true,
    },
  ];
}

export default function TabsLayout() {
  /* `isGuest()` — oddiy o'zgaruvchi, o'zgarganda ekran qayta
     chizilmaydi. Mehmon kirgan zahoti yorliqlar qaytib kelishi
     uchun `user` ga qaraymiz: u holat, ya'ni o'zgarsa React
     shu joyni qayta chizadi. */
  const { user } = useAuth();
  const guest = !user && isGuest();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.mutedForeground,
        tabBarStyle: {
          backgroundColor: color.card,
          borderTopColor: color.border,
          height: 88,
          paddingTop: 8,
        },
        // Oltita yorliq tor joyga sig'ishi kerak — 10px dan pastga
        // tushirilmaydi, aks holda o'qib bo'lmaydi (rus tilida ayniqsa)
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      {tabs(guest).map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: guest && !tab.guest ? null : undefined,
            tabBarIcon: ({ color: c }) => <Icon name={tab.icon} stroke={c} size={22} />,
          }}
        />
      ))}
    </Tabs>
  );
}
