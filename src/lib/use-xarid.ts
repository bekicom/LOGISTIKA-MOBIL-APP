/**
 * Do'kon xaridi uchun React hook'lari (2026-09-19, B1) — mantiq `xarid.ts` da.
 */
import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { dokonniOl, kutilganlarniYubor, xaridKuzatuvchisi, type Dokon } from "./xarid";

/**
 * Ilova ildizida (`_layout.tsx` → `Shell`): kirgan odamda xarid natijasini
 * kuzatadi va yakunlanmagan xaridlarni serverga qayta yuboradi. Tarif
 * yoqilsa huquqlar ro'yxati (`can()`) va tarif belgisi yangilanadi.
 */
export function useXaridKuzatuvchi(): void {
  const { user, refresh } = useAuth();
  const id = user?.id;
  useEffect(() => {
    if (!id) return;
    const yoqildi = () => void refresh();
    const stop = xaridKuzatuvchisi(yoqildi);
    void kutilganlarniYubor(yoqildi);
    return stop;
  }, [id, refresh]);
}

/** Ekran uchun: katalog va do'kon narxlari; `null` — hali yuklanmoqda */
export function useDokon(): Dokon | null {
  const [dokon, setDokon] = useState<Dokon | null>(null);
  useEffect(() => {
    let tirik = true;
    dokonniOl()
      .then((d) => tirik && setDokon(d))
      .catch(() => tirik && setDokon({ bor: false, hisob: null, kun: 30, mahsulotlar: [] }));
    return () => {
      tirik = false;
    };
  }, []);
  return dokon;
}
