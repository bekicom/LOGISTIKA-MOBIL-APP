/**
 * Oltita bo'lim — web'dagi pastki menyu bilan bir xil
 * (`furam/src/components/layout/bottom-nav.tsx`).
 */
import { Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { color } from "@/lib/theme";
import { t } from "@/lib/i18n";

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function tabs(): { name: string; title: string; icon: IconName }[] {
  return [
  { name: "bosh", title: t("mob.nav.home"), icon: "home" },
  { name: "yuklar", title: t("mob.nav.loads"), icon: "package" },
  { name: "reyslar", title: t("mob.nav.trips"), icon: "route" },
  { name: "chat", title: t("mob.nav.chat"), icon: "chat" },
  { name: "ai", title: "AI", icon: "sparkle" },
  { name: "profil", title: t("mob.nav.profile"), icon: "user" },
];
}

export default function TabsLayout() {
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
      {tabs().map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color: c }) => <Icon name={t.icon} stroke={c} size={22} />,
          }}
        />
      ))}
    </Tabs>
  );
}
