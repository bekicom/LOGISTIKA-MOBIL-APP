/**
 * Kirish nuqtasi — yo'naltiradi va splash'ni ushlab turadi.
 *
 * Sessiya tekshirilgunicha `Splash` turadi. U tizimning o'z
 * splash'i bilan bir xil to'q fonda boshlanadi, shuning uchun
 * o'tish ko'zga tashlanmaydi.
 */
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

  if (loading || !shown) return <Splash />;

  /* MEHMON YUKLARGA TUSHADI, bosh sahifaga emas: `/api/home`
     kirish talab qiladi va bosh sahifa mehmonda bo'sh chiqardi.
     Yuklar ro'yxati esa ilovaning ochiq o'zagi. */
  if (user) return <Redirect href="/bosh" />;
  if (isGuest()) return <Redirect href="/yuklar" />;
  return <Redirect href="/til" />;
}
