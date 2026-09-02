import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth-context";
import { color } from "@/lib/theme";
import { deviceLocale, readLocale, setLocale } from "@/lib/i18n";

export default function RootLayout() {
  /* Til birinchi chizishdan OLDIN tiklanadi: aks holda ekran bir
     zum o'zbekcha chiqib, keyin tanlangan tilga sakrardi. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void (async () => {
      await setLocale((await readLocale()) ?? deviceLocale());
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.card },
            animation: "slide_from_right",
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
