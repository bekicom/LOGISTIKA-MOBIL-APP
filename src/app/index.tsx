/**
 * Kirish nuqtasi — yo'naltiradi va splash'ni ushlab turadi.
 *
 * Sessiya tekshirilgunicha `Splash` turadi. U tizimning o'z
 * splash'i bilan bir xil to'q fonda boshlanadi, shuning uchun
 * o'tish ko'zga tashlanmaydi.
 */
import { useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { Splash, useSplashDone } from "@/components/Splash";

export default function Index() {
  const { user, loading } = useAuth();
  /* Ikkita shart YONMA-YON kutiladi, ketma-ket emas: sessiya
     tekshiruvi 1,1 soniyadan uzoq cho'zilsa, splash qo'shimcha
     vaqt qo'shmaydi. */
  const shown = useSplashDone();
  const ready = !loading && shown;

  /* Yo'naltirish SO'NISH TUGAGACH bo'ladi: `Redirect` darhol
     chizilsa, splash o'rtasida kesilib qolardi. */
  const [gone, setGone] = useState(false);
  if (!gone) return <Splash fadeOut={ready} onGone={() => setGone(true)} />;

  /* MEHMON YUKLARGA TUSHADI, bosh sahifaga emas: `/api/home`
     kirish talab qiladi va bosh sahifa mehmonda bo'sh chiqardi.
     Yuklar ro'yxati esa ilovaning ochiq o'zagi. */
  if (user) return <Redirect href="/bosh" />;
  if (isGuest()) return <Redirect href="/yuklar" />;
  return <Redirect href="/til" />;
}
