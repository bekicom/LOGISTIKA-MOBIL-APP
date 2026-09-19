import { useEffect, useRef, useState } from "react";
import { flushCrashes, installErrorLog } from "@/lib/error-log";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { AuthProvider } from "@/lib/auth-context";
import { OfflineBar } from "@/components/OfflineBar";
import { PushAsk } from "@/components/PushAsk";
import { IntroVideo } from "@/components/IntroVideo";
import { useOutboxRunner } from "@/lib/use-outbox";
import { useXaridKuzatuvchi } from "@/lib/use-xarid";
import { color, themeName } from "@/lib/theme";
import { deviceLocale, readLocale, setLocale, useLocaleVersion } from "@/lib/i18n";
import { loadTheme, useThemeVersion } from "@/lib/theme-store";
import { markSplashDone } from "@/lib/first-run";
import { routeOf } from "@/lib/push";

/* Ushlanmagan xato serverga boradi (poydevor, 2026-09-07).
   MODUL DARAJASIDA: `useEffect` ichida qo'ysak, ilova
   ochilishidagi — ya'ni eng qimmat — xatolar tutilmay qolardi. */
installErrorLog();

/* Oldingi seansni yiqitgan xato diskda turadi (A27) — ochilishda
   yuboriladi. Fon ishi: natijasi ekranga ta'sir qilmaydi va
   tarmoq yo'q bo'lsa keyingi ochilishda yana uriniladi. */
void flushCrashes();

export default function RootLayout() {
  /* Shrift — Manrope, beshta og'irlik (~480 KB). Yuklanmaguncha
     hech narsa chizilmaydi: aks holda matn tizim shriftida chiqib,
     keyin «sakrab» almashardi. Yuklanmasa (xato) — tizim shrifti
     bilan davom etamiz, ilova to'xtab qolmaydi. */
  const [fontsReady, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  /* Til birinchi chizishdan OLDIN tiklanadi: aks holda ekran bir
     zum o'zbekcha chiqib, keyin tanlangan tilga sakrardi. */
  const [ready, setReady] = useState(false);
  /* Ochilish videosi — har safar TO'LIQ (Bekzod, 2026-09-16; `IntroVideo.tsx`) */
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    void (async () => {
      /* REJIM ham til bilan birga, CHIZISHDAN OLDIN tiklanadi:
         aks holda ekran bir zum yorug' chiqib, keyin qorong'iga
         sakrardi — bu ilova «buzuq» bo'lib ko'rinadi. */
      await Promise.all([setLocale((await readLocale()) ?? deviceLocale()), loadTheme()]);
      setReady(true);
    })();
  }, []);

  /* Til o'zgarganda BUTUN daraxt yangidan chiziladi (kalit
     o'zgaradi). `i18n.locale` React holati emas — busiz ochiq
     ekranlar eski tilda qolib ketardi. Navigatsiya boshiga
     qaytadi va odam bosh sahifaga tushadi: bu yerda bu to'g'ri
     xatti-harakat, «ilova yangi tilda ochildi» degani. */
  const localeVersion = useLocaleVersion();
  /* Rejim o'zgarsa daraxt qayta chiziladi — uslub proxy'lari
     yangi rejimning keshini qaytaradi (`lib/theme.ts`) */
  const themeVersion = useThemeVersion();

  if (!ready || (!fontsReady && !fontError)) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* ⚠️ `auto` EMAS: `auto` tizim rejimiga qaraydi, ilova esa
            o'z rejimini yuritadi. Odam telefoni yorug' turganda
            ilovada qorong'ini tanlasa, `auto` qora yozuvni qora
            fonga chizib qo'yardi. */}
        <StatusBar style={themeName() === "dark" ? "light" : "dark"} />
        <Shell key={`${localeVersion}-${themeVersion}`} />
        {splash ? (
          /* Brend videosi — animatsiyali splash o'rniga (2026-09-16) */
          <IntroVideo
            onDone={() => {
              setSplash(false);
              markSplashDone();
            }}
          />
        ) : null}
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
  /* Do'kon xaridi: natija qaysi ekranda kelsa ham serverga yetsin,
     yakunlanmagani ilova ochilganda qayta yuborilsin (`xarid.ts`) */
  useXaridKuzatuvchi();
  return (
    <>
      <OfflineBar online={online} />
      <PushAsk />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.card },
          animation: "slide_from_right",
          /* ── BARMOQ BILAN ORTGA (2026-09-13) ──────────────────
             Bekzod: «pagelarga kirib chiqqanimda ham slayderga
             o'xshab ishlasin».

             `gestureEnabled` — ekranni o'ngga surib ortga qaytish.
             `fullScreenGestureEnabled` esa BUTUN ekrandan surishga
             ruxsat beradi, faqat chap chetidan emas — katta
             telefonda chetni barmoq bilan tutish qiyin va odam
             harakatning borligini sezmay qolardi. */
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
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
/* Web'da bildirishnoma moduli yo'q — hook chaqirilsa ilova yiqiladi
   (brauzerda sinash, 2026-09-19). `Platform.OS` bundle uchun o'zgarmas,
   ya'ni hook tartibi buzilmaydi. */
const useLastResponse: typeof Notifications.useLastNotificationResponse =
  Platform.OS === "web" ? () => undefined : Notifications.useLastNotificationResponse;

function usePushTap() {
  const router = useRouter();
  const response = useLastResponse();
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
