/**
 * Oltita bo'lim — web'dagi pastki menyu bilan bir xil
 * (`furam/src/components/layout/bottom-nav.tsx`).
 */
import { Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { color } from "@/lib/theme";

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "bosh", title: "Bosh sahifa", icon: "home" },
  { name: "yuklar", title: "Yuklar", icon: "package" },
  { name: "reyslar", title: "Reyslar", icon: "route" },
  { name: "chat", title: "Chat", icon: "chat" },
  { name: "ai", title: "AI", icon: "sparkle" },
  { name: "profil", title: "Profil", icon: "user" },
];

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
      {TABS.map((t) => (
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
