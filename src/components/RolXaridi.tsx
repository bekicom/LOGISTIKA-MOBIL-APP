/**
 * Rol tarifini do'kon orqali sotib olish — «Men kimman?» kartasida
 * (2026-09-19, B1 qarori).
 *
 *   amaldagi rol    → «Uzaytirish — $3,99»  (+30 kun ustiga)
 *   muddati tugagan → «Yoqish — $3,99»
 *   transport egasi → paketlar: 1, 2, 3, 5, 10, 20 mashina; parkdagidan
 *                     kichigi o'chiq (5 talik paket bilan 7 mashina
 *                     sig'maydi — server paket sonini aynan beradi)
 *
 * Narx — do'kondan, o'quvchi valyutasida. Webdagi so'mlik narx ilovada
 * ko'rsatilmaydi (boshqa to'lov yo'liga ishora — Apple 3.1.1, Play).
 * Do'kon yoki mahsulot yo'q bo'lsa hech narsa chizilmaydi: bosilmaydigan
 * tugma Apple 2.1 da rad sababi.
 */
import { useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import { API_BASE, FuramError } from "@/lib/api";
import { sotibOl, xaridniEshit, type Dokon } from "@/lib/xarid";
import { color, radius, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

/** KK.OO.YYYY — sakkiz tilda ham bir xil o'qiladi */
function sana(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/**
 * Kod → lug'at matni. Xarid kodlari (`IAP_*`) va `RATE_LIMIT` — o'z
 * matni; qolgani (aloqa, server) — «ilova o'zi qayta yuboradi»:
 * tranzaksiya yakunlanmagan, pul yo'qolmaydi (`xarid.ts:tasdiqla`).
 */
function xatoMatni(kod: string): string {
  const qayta = t("mob.iap.qayta");
  return kod.startsWith("IAP_") || kod === "RATE_LIMIT" ? tOr(`apiErr.${kod}`, qayta) : qayta;
}

/**
 * «Tarif yoqildi — 19.10.2026 gacha». Ekran chizadi, `RolXaridi` emas:
 * tugagan rol xariddan keyin «amaldagi» guruhga o'tadi va karta qayta
 * yaratiladi — xabar o'sha yangi kartada turishi kerak.
 */
export function XaridYoqildi({ endsAt }: { endsAt: string }) {
  return <Text style={[s.xabar, s.yoqildi]}>{t("mob.iap.yoqildi", { sana: sana(endsAt) })}</Text>;
}

export function RolXaridi({
  roleKey,
  dokon,
  rejim,
  parkda,
}: {
  roleKey: string;
  dokon: Dokon;
  rejim: "uzaytir" | "yoq";
  /** Transport egasi: parkdagi mashinalar (tirkamasiz) — kichik paket o'chiq */
  parkda?: number;
}) {
  const mahsulotlar = useMemo(() => dokon.mahsulotlar.filter((m) => m.roleKey === roleKey), [dokon, roleKey]);
  const [tanlov, setTanlov] = useState<string | null>(null);
  const [kutish, setKutish] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  /* Natija umumiy kuzatuvchidan keladi (`xarid.ts`). Mahsulot nomi
     bo'lmasa (ba'zi do'kon xatolari) — faqat xaridni boshlagan karta
     oladi, aks holda xato hamma kartada chiqardi. Muvaffaqiyatni ekran
     ko'rsatadi (`XaridYoqildi`). */
  useEffect(
    () =>
      xaridniEshit((r) => {
        const meniki = r.productId ? mahsulotlar.some((m) => m.id === r.productId) : kutish;
        if (!meniki) return;
        setKutish(false);
        setXato(r.ok || r.bekor ? null : r.kod);
      }),
    [mahsulotlar, kutish],
  );

  if (!mahsulotlar.length) return null;

  const paketli = mahsulotlar.length > 1;
  const kichikmi = (units: number | null) => paketli && parkda != null && units != null && units < parkda;
  const tanlangan =
    mahsulotlar.find((m) => m.id === tanlov && !kichikmi(m.units)) ?? mahsulotlar.find((m) => !kichikmi(m.units)) ?? null;

  /* To'langan bo'lsa tugma server tasdig'igacha AYLANIB turadi (natija
     kuzatuvchidan keladi) — orada ikkinchi bosish ikkinchi to'lov bo'lardi */
  async function ol() {
    if (!tanlangan || kutish) return;
    setXato(null);
    setKutish(true);
    try {
      if ((await sotibOl(tanlangan.id, dokon.hisob)) === "bekor") setKutish(false);
    } catch (e) {
      setKutish(false);
      setXato((e as FuramError).code ?? "IAP_STORE");
    }
  }

  return (
    <View style={s.wrap}>
      {paketli ? (
        <>
          <View style={s.paketlar}>
            {mahsulotlar.map((m) => {
              const on = m.id === tanlangan?.id;
              const off = kichikmi(m.units);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setTanlov(m.id)}
                  disabled={off}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: off }}
                  style={({ pressed }) => [s.paket, on && s.paketOn, off && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[s.paketNom, on && s.paketNomOn]}>{t("mob.iap.paket", { n: m.units ?? 1 })}</Text>
                  <Text style={[s.paketNarx, on && s.paketNomOn]}>{m.narx}</Text>
                </Pressable>
              );
            })}
          </View>
          {parkda != null && mahsulotlar.some((m) => kichikmi(m.units)) ? (
            <Text style={s.izoh}>{t("mob.iap.kichik", { n: parkda })}</Text>
          ) : null}
        </>
      ) : null}

      <Button
        title={t(rejim === "uzaytir" ? "mob.iap.uzaytir" : "mob.iap.yoq", { narx: tanlangan?.narx ?? "" })}
        onPress={() => void ol()}
        loading={kutish}
        disabled={!tanlangan}
      />
      <Text style={s.izoh}>{t("mob.iap.muddat", { n: dokon.kun })}</Text>
      {xato ? (
        /* «Kutilmoqda» — xato emas: pul olinmagan, tasdiqlansa o'zi yoqiladi */
        <Text style={[s.xabar, { color: xato === "IAP_PENDING" ? color.warning : color.danger }]}>{xatoMatni(xato)}</Text>
      ) : null}
    </View>
  );
}

/**
 * Xarid sharti — ekran pastida bir marta. Platformaga qarab (Apple 2.3.10:
 * iOS ilovada boshqa platforma nomi bo'lmasin). Shartlar va maxfiylik
 * havolasi — obuna xaridida Apple talab qiladi.
 */
export function XaridShartlari({ kun }: { kun: number }) {
  return (
    <View style={s.shart}>
      <Text style={s.shartMatn}>{t(Platform.OS === "ios" ? "mob.iap.shartIos" : "mob.iap.shartAndroid", { n: kun })}</Text>
      <View style={s.havolalar}>
        <Text style={s.havola} accessibilityRole="link" onPress={() => void Linking.openURL(`${API_BASE}/terms`)}>
          {t("mob.legal.terms")}
        </Text>
        <Text style={s.havola} accessibilityRole="link" onPress={() => void Linking.openURL(`${API_BASE}/privacy`)}>
          {t("mob.legal.privacy")}
        </Text>
      </View>
    </View>
  );
}

const s = themed(() => ({
  wrap: { gap: 8, marginTop: 12 },
  paketlar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paket: {
    minWidth: "30%",
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    gap: 2,
  },
  paketOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  paketNom: { fontSize: 12.5, fontWeight: "700", color: color.foreground },
  paketNarx: { fontSize: 12, color: color.mutedForeground, fontVariant: ["tabular-nums"] },
  paketNomOn: { color: color.brandText },
  izoh: { fontSize: 12, lineHeight: 17, color: color.mutedForeground },
  xabar: { fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  yoqildi: { color: color.successText, marginTop: 8 },

  shart: { gap: 6, paddingHorizontal: 4 },
  shartMatn: { fontSize: 11.5, lineHeight: 17, color: color.mutedForeground },
  havolalar: { flexDirection: "row", gap: 16 },
  havola: { fontSize: 12, fontWeight: "600", color: color.brandText },
}));
