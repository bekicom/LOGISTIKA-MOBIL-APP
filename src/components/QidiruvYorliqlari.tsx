/**
 * «Mening qidiruvlarim» — lenta tepasidagi yorliqlar (TZ-03, 2026-09-19).
 * Webdagi `furam/src/components/saved-search-chips.tsx` juftligi.
 *
 * Mijoz: «faqat mijoz o'zi saqlagan filtrlar tursin — doim filtrga
 * kirmaydi, o'sha hudud ustiga bossa yuklar chiqaveradi».
 *
 *   MENING QIDIRUVLARIM
 *   [Toshkent → Moskva · Tent  12] [Samarqand → …  3]  Hammasi (5) ›
 *
 * Yonidagi son — HOZIR nechta mos e'lon bor: odam bosmasdan ham «yangisi
 * bormi» degan savolga javob oladi. Bir qatorda, yon tomonga suriladi —
 * 320 px da ham qator ikki qatorga cho'zilib, e'lonlarni pastga surmaydi.
 * O'chirish va xabarni yoqish/o'chirish — «Hammasi» ro'yxatida (telefonda
 * har yorliqda uchta tugma barmoq uchun juda mayda bo'lardi).
 *
 * Saqlagan qidiruvi yo'q odamda va mehmonda qator chizilmaydi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { EMPTY_FILTR, type Filtr } from "@/components/FiltrSheet";
import { useApi } from "@/lib/use-api";
import { isGuest } from "@/lib/guest";
import {
  filtrdanParams,
  filtrga,
  paramsKaliti,
  qidiruvSorovi,
  type SaqlanganQidiruv,
} from "@/lib/saqlangan-qidiruv";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Javob = { rows: SaqlanganQidiruv[]; max: number; jami?: number };

/** Ilova filtriga sig'magan qidiruv — lentaga xom so'rov bo'lib ketadi */
export type XomQidiruv = { id: string; nomi: string; query: string };

/**
 * Yorliqlar ma'lumoti va ularni qo'llash — yuklar va mashinalar lentasi
 * uchun BITTA mantiq.
 *
 * `boshlangich` — `?qidiruv=<id>` (ro'yxatdan bosib kelinganda): yorliqlar
 * kelgach qo'llanadi va parametr o'chiriladi.
 */
export function useQidiruvYorliqlari(
  kind: "load" | "truck",
  filtr: Filtr,
  setFiltr: (f: Filtr) => void,
  boshlangich?: string,
) {
  const router = useRouter();

  /* Ekranga qaytganda jim yangilanadi: ro'yxatda o'chirilgan yorliq
     qolib ketmasin, son esa «yangisi bormi» ga javob bersin. Birinchi
     fokus — ochilishning o'zi, u yerda so'rov allaqachon ketgan */
  const [fokus, setFokus] = useState(0);
  const birinchi = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (birinchi.current) birinchi.current = false;
      else setFokus((n) => n + 1);
    }, []),
  );

  /* Mehmonga so'rov ketmaydi — 401 xato qutisi chiqmasin */
  const { data, reload } = useApi<Javob>(isGuest() ? null : `/api/saved-search?kind=${kind}`, [kind, fokus]);
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const [xom, setXom] = useState<XomQidiruv | null>(null);

  const qoll = useCallback(
    (r: SaqlanganQidiruv) => {
      const f = filtrga(r);
      if (f) {
        setXom(null);
        setFiltr({ ...EMPTY_FILTR, ...f });
      } else {
        /* Filtr AYNAN `EMPTY_FILTR` bo'lib qoladi — pastdagi effekt shu
           havola bo'yicha «odam filtrni o'zgartirdi» ni taniydi */
        setFiltr(EMPTY_FILTR);
        setXom({ id: r.id, nomi: r.nomi || t("saveSearch.any"), query: qidiruvSorovi(r.params) });
      }
    },
    [setFiltr],
  );

  /* Xom qidiruv faqat filtr bo'sh turganda amal qiladi: odam filtrni
     o'zgartirsa — u yorliq o'rniga o'z filtrini tanlagan */
  useEffect(() => {
    if (xom && filtr !== EMPTY_FILTR) setXom(null);
  }, [filtr, xom]);

  /* `?qidiruv=` bir marta ishlatiladi va o'chiriladi: lenta ochiq turgan
     tab bo'lgani uchun odam ro'yxatdan AYNAN shu yorliqni yana tanlasa,
     qiymat o'zgarmay qolardi va filtr qo'llanmasdi */
  useEffect(() => {
    if (!boshlangich) return;
    const r = rows.find((x) => x.id === boshlangich);
    if (!r) return;
    qoll(r);
    router.setParams({ qidiruv: undefined });
  }, [boshlangich, rows, qoll, router]);

  /* Hozirgi filtr qaysi yorliqqa teng — o'sha ajratiladi (qo'lda xuddi
     shu filtrni tanlagan bo'lsa ham) */
  const kalit = paramsKaliti(filtrdanParams(filtr));
  const faolId = xom?.id ?? rows.find((r) => paramsKaliti(r.params) === kalit)?.id ?? null;

  return {
    rows,
    jami: data?.jami ?? rows.length,
    reload,
    xom,
    tozala: () => setXom(null),
    qoll,
    faolId,
  };
}

export function QidiruvYorliqlari({
  rows,
  jami,
  faolId,
  onQoll,
}: {
  rows: readonly SaqlanganQidiruv[];
  jami: number;
  faolId: string | null;
  onQoll: (r: SaqlanganQidiruv) => void;
}) {
  const router = useRouter();
  if (!rows.length) return null;

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{t("saveSearch.mine")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {rows.map((r) => {
          const on = r.id === faolId;
          return (
            <Pressable
              key={r.id}
              onPress={() => onQoll(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]}
            >
              {/* Xabar o'chiq — ko'rinib tursin (odam nega xabar kelmayotganini bilsin) */}
              {!r.notify ? <Icon name="bell" size={12} stroke={on ? "#ffffff" : color.mutedForeground} /> : null}
              <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>
                {r.nomi || t("saveSearch.any")}
              </Text>
              <View style={[s.soni, on && s.soniOn]}>
                <Text style={[s.soniText, on && s.soniTextOn]}>{r.soni}</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push("/saqlangan-qidiruv")} hitSlop={8} accessibilityRole="link" style={s.all}>
          <Text style={s.allText}>
            {t("saveSearch.all")} ({jami})
          </Text>
          <Icon name="chevron" size={14} stroke={color.brand} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  wrap: { gap: 6 },
  label: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: color.mutedForeground },
  row: { alignItems: "center", gap: 7, paddingRight: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingLeft: 12,
    paddingRight: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  /* 200 — 320 px da ham keyingi yorliq chetdan ko'rinib tursin: qator
     suriladigan ekani shundan bilinadi (240 da birinchisi butun kenglikni
     egallardi va «Hammasi» ham yashirinib qolardi) */
  chipText: { fontSize: 13, fontWeight: "600", color: color.foreground, maxWidth: 200 },
  chipTextOn: { color: "#ffffff" },
  soni: { minWidth: 24, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: color.brandSoft },
  soniOn: { backgroundColor: "#ffffff33" },
  soniText: { fontSize: 11, fontWeight: "800", color: color.brand, fontVariant: ["tabular-nums"] },
  soniTextOn: { color: "#ffffff" },
  all: { flexDirection: "row", alignItems: "center", gap: 2, height: 34, paddingHorizontal: 4 },
  allText: { fontSize: 12.5, fontWeight: "700", color: color.brand },
}));
