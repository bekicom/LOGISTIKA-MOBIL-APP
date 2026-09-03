import { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth-context";
import { OfflineBar } from "@/components/OfflineBar";
import { PushAsk } from "@/components/PushAsk";
import { useOutboxRunner } from "@/lib/use-outbox";
import { color } from "@/lib/theme";
import { deviceLocale, readLocale, setLocale } from "@/lib/i18n";
import { routeOf } from "@/lib/push";

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
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Navbat shu yerda ishga tushadi — ilova ochiq turganda fon
 * rejimida yozuvlarni yuboradi. Chiziq esa Stack'dan YUQORIDA:
 * u har ekranda ko'rinishi kerak, chunki aloqa istalgan ekranda
 * uzilishi mumkin.
 */
function Shell() {
  const { online } = useOutboxRunner();
  usePushTap();
  return (
    <>
      <OfflineBar online={online} />
      <PushAsk />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.card },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}

/**
 * Bosilgan xabar TO'G'RI ekranni ochadi.
 *
 * `useLastNotificationResponse` ikkala holatni ham qamraydi: ilova
 * ochiq turganda bosilgani ham, ilova butunlay yopiq bo'lgani ham
 * (bunda javob ishga tushishda qaytariladi). Oddiy tinglovchi bilan
 * ikkinchisi qo'lga tushmaydi — sovuq ishga tushishda tinglovchi
 * hali ulanmagan bo'ladi va odam bosgan xabar bosh ekranda tugardi.
 *
 * Har javob BIR MARTA ishlaydi: hook o'sha javobni qayta chizishlarda
 * ham qaytaraveradi, tekshirilmasa ekran qayta-qayta ochilardi.
 */
function usePushTap() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (done.current === id) return;
    done.current = id;

    const data = response.notification.request.content.data as
      | Record<string, unknown>
      | undefined;
    const to = routeOf(data);
    if (to) router.push(to as never);
  }, [response, router]);
}
