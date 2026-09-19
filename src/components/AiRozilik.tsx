/**
 * AI xizmatlariga (OpenAI) rozilik oynasi — Apple 5.1.2(i), B3 qarori
 * (Bekzod, 2026-09-19): BITTA umumiy rozilik.
 *
 * ── QACHON CHIQADI ──────────────────────────────────────────────
 *
 *  1. Odam AI funksiyasini bosganda, server `AI_CONSENT_REQUIRED`
 *     qaytarsa — `api.ts` ushlab shu oynani ochadi va javobdan keyin
 *     so'rovni qayta yuboradi. Ekranlarning o'zi hech narsa qilmaydi.
 *  2. Suhbatda tarjima kerak bo'lganda — ekran `aiRozilikSora("tarjima")`
 *     bilan o'zi so'raydi (fondagi so'rov: server 200 va sabab beradi).
 *
 * ── NIMA YOZILGAN ───────────────────────────────────────────────
 *
 * Apple: provayder NOMI (OpenAI), NIMA ketadi, NIMA uchun va qaytarib
 * olish yo'li — hammasi oynaning o'zida, siyosatga havola emas. Belgi
 * oldindan qo'yilmagan: ikki teng tugma.
 *
 * Yopilsa (surish, ✕) — QAROR YO'Q: `null` qoladi, keyingi AI
 * funksiyasida yana so'raladi. «Yo'q» — `false` yoziladi va fondagi
 * tarjima endi so'ramaydi (sozlamadan yoqiladi).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError, setAiRozilikSorovchi, type AiRozilikJavob } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { t } from "@/lib/i18n";
import { color, font, space, themed } from "@/lib/theme";

/** Oyna nima sababdan ochildi — tepada bir qator izoh */
export type AiKontekst = "umumiy" | "tarjima" | "unga";

/** Rozilikni serverga yozish — oyna ham, sozlama ekrani ham shu yo'ldan */
export async function aiRozilikniYoz(rozi: boolean): Promise<void> {
  await api("/api/profile/ai-rozilik", { method: "POST", body: { rozi } });
}

let tashqiSora: ((k: AiKontekst) => Promise<AiRozilikJavob>) | null = null;

/** Ekrandan so'rash — oyna ildizda turmasa (mehmon) darrov «yopildi» */
export function aiRozilikSora(kontekst: AiKontekst = "umumiy"): Promise<AiRozilikJavob> {
  return tashqiSora ? tashqiSora(kontekst) : Promise.resolve("yopildi");
}

/** Nima ketadi — ro'yxat tartibi oynada va sozlamada bir xil */
export const AI_ROZILIK_BANDLARI = ["i1", "i2", "i3", "i4", "i5"] as const;

export function AiRozilikBandlari() {
  return (
    <View style={s.bandlar}>
      {AI_ROZILIK_BANDLARI.map((b) => (
        <View key={b} style={s.band}>
          <Icon name="check" size={15} stroke={color.brand} />
          <Text style={s.bandText}>{t(`aiRozilik.${b}`)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Ildizda BIR marta (`_layout.tsx` → `Shell`) */
export function AiRozilikOynasi() {
  const { user, setAiRozilik } = useAuth();
  const { height } = useWindowDimensions();
  const [kontekst, setKontekst] = useState<AiKontekst | null>(null);
  const [yozilmoqda, setYozilmoqda] = useState<"ha" | "yoq" | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  /* Bir vaqtda bir necha so'rov qulasa — bitta oyna, bitta javob */
  const kutuvchi = useRef<{ promise: Promise<AiRozilikJavob>; resolve: (j: AiRozilikJavob) => void } | null>(null);

  const och = useCallback((k: AiKontekst) => {
    if (kutuvchi.current) return kutuvchi.current.promise;
    let resolve: (j: AiRozilikJavob) => void = () => {};
    const promise = new Promise<AiRozilikJavob>((r) => {
      resolve = r;
    });
    kutuvchi.current = { promise, resolve };
    setXato(null);
    setKontekst(k);
    return promise;
  }, []);

  const yop = useCallback((j: AiRozilikJavob) => {
    const k = kutuvchi.current;
    kutuvchi.current = null;
    setKontekst(null);
    k?.resolve(j);
  }, []);

  /* Faqat kirgan odamga: mehmonning roziligi yozilmaydi */
  const kirgan = !!user;
  useEffect(() => {
    if (!kirgan) return;
    setAiRozilikSorovchi(() => och("umumiy"));
    tashqiSora = och;
    return () => {
      setAiRozilikSorovchi(null);
      tashqiSora = null;
    };
  }, [kirgan, och]);

  async function javob(rozi: boolean) {
    setYozilmoqda(rozi ? "ha" : "yoq");
    setXato(null);
    try {
      await aiRozilikniYoz(rozi);
      setAiRozilik(rozi);
      yop(rozi ? "ha" : "yoq");
    } catch (e) {
      /* Yozilmadi — oyna ochiq qoladi, odam qayta bosadi */
      setXato((e as FuramError).message ?? t("mob.err.generic"));
    } finally {
      setYozilmoqda(null);
    }
  }

  const kontekstMatni =
    kontekst === "tarjima"
      ? t("aiRozilik.kontekstTarjima")
      : kontekst === "unga"
        ? t("aiRozilik.kontekstUnga")
        : null;

  return (
    <Sheet open={kontekst !== null} onClose={() => yop("yopildi")} title={t("aiRozilik.title")}>
      <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={s.body}>
        {kontekstMatni ? <Text style={s.kontekst}>{kontekstMatni}</Text> : null}
        <Text style={s.lead}>{t("aiRozilik.lead")}</Text>
        <AiRozilikBandlari />
        <Text style={s.note}>{t("aiRozilik.note")}</Text>
      </ScrollView>
      {xato ? <Text style={s.xato}>{xato}</Text> : null}
      <View style={s.tugmalar}>
        <Button
          title={t("aiRozilik.ha")}
          onPress={() => void javob(true)}
          loading={yozilmoqda === "ha"}
          disabled={!!yozilmoqda}
        />
        <Button
          title={t("aiRozilik.yoq")}
          variant="secondary"
          onPress={() => void javob(false)}
          loading={yozilmoqda === "yoq"}
          disabled={!!yozilmoqda}
        />
      </View>
    </Sheet>
  );
}

const s = themed(() => ({
  body: { gap: space.md, paddingBottom: space.sm },
  kontekst: {
    fontSize: font.body,
    lineHeight: 21,
    fontWeight: "600",
    color: color.foreground,
    padding: 12,
    borderRadius: 12,
    backgroundColor: color.brandSoft,
  },
  lead: { fontSize: font.body, lineHeight: 22, color: color.foreground },
  bandlar: { gap: 9 },
  band: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  bandText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: color.foreground },
  note: { fontSize: 12.5, lineHeight: 19, color: color.mutedForeground },
  xato: { fontSize: 12.5, color: color.danger, marginTop: space.sm },
  tugmalar: { gap: 10, marginTop: space.md },
}));
