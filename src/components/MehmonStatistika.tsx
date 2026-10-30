/**
 * Mehmonga statistika — birinchi ekranning tepasida (TZ 29-okt §1, §13.3:
 * «Statistika bloki doim eng tepada — mehmon sahifasida ham»).
 *
 * Kirgan odam sonlarni `/api/home` dan oladi (bosh sahifa); mehmonda bosh
 * sahifa yo'q, uning birinchi ekrani — «Yuklar». Ma'lumot ochiq
 * `/api/statistika` dan, web bosh sahifasi bilan bitta funksiya.
 */
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { useApi } from "@/lib/use-api";
import { Statistika, type KpiData } from "@/components/BoshJonli";

export function MehmonStatistika() {
  const { user } = useAuth();
  const mehmon = !user && isGuest();
  const { data } = useApi<{ kpis: KpiData[] }>(mehmon ? "/api/statistika" : null);
  if (!mehmon) return null;
  return <Statistika items={data?.kpis} />;
}
