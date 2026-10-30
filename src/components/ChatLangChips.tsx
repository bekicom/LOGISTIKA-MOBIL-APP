/**
 * Suhbat tepasidagi ikkita til tugmasi (TZ-08, 2026-09-19).
 *
 *   ┌──────────────────┐ ┌──────────────────┐
 *   │ 🔴 MENGA          │ │ 🔵 UNGA           │
 *   │ 🇺🇿 O'zbekcha    ▾ │ │ 🇨🇳 中文         ▾ │
 *   └──────────────────┘ └──────────────────┘
 *
 * Webdagi `furam/src/components/chat/chat-lang-chips.tsx` ning juftligi.
 * Mijoz: «u yoqdan keladigan xabar — qizil tugmaga, bu yoqdan
 * boradigani — ko'k tugmaga». Ranglar ATAYLAB shunday.
 *
 * Ilgari ilovada suhbat tili faqat PROFILDA edi (hamma suhbatga bitta):
 * xitoylik bilan xitoycha, rus bilan ruscha yozishga har safar profilga
 * kirib tilni almashtirish kerak edi.
 *
 * Ro'yxat pastdan chiqadigan varaqda — tugma ostidagi menyu 320 px da
 * ekrandan chiqib ketardi va barmoq bilan tanlashga kichik edi.
 *
 * ── IKKI QAVAT, BITTA QATOR ─────────────────────────────────────
 *
 * Webdagidek bir qatorli «Menga: 🇺🇿 O'zbekcha» ruschada («Читаю»,
 * «Отправляю») 375 px ga ham sig'masdi va ikkinchi tugma yangi qatorga
 * tushib, xabarlar ustidan ikki qator joy yerdi (brauzerda bosib
 * sinalganda ko'rindi). Endi har tugma — kichik yorliq ustida til nomi,
 * ikkalasi teng yarim kenglikda: sakkiz tilning hammasida, 320 px da
 * ham bir qator.
 *
 * ── 2026-10-30: KATTA «TARJIMA» TUGMASI (TZ 29-okt §4.3) ──────────
 *
 * «Chat tepasida katta, aniq tugma: 🌐 Tarjima: Yoqilgan — O'zbekcha;
 * bosilsa o'chadi yoki tilni o'zgartiradi. Kichik va tushunarsiz ikonka
 * bo'lmaydi». «Menga» shu katta tugmaga aylandi (til tanlash ham, o'chirish
 * ham ichida); «Unga» ikki kishilik suhbatda kichik ko'k tugma bo'lib qoldi.
 */
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Tap } from "@/components/Tap";
import { api } from "@/lib/api";
import { CHAT_TILLARI, isChatTil, type ChatTil, type ChatTillari } from "@/lib/chat-til";
import { LOCALE_INFO, t } from "@/lib/i18n";
import { color, radius, space, themed } from "@/lib/theme";

type Qaysi = "menga" | "unga";

/**
 * Til nomi o'quvchining tilida («O'zbekcha», «Ruscha») — TZ 29-okt §4.3:
 * «AI tarjimasi · asli: Ruscha». Kalitlar ATAYLAB to'liq yozilgan:
 * `sync-mobile-i18n` lug'atga faqat koddan topgan kalitni ko'chiradi.
 */
export function tilNomi(l: string | null | undefined): string {
  switch (l) {
    case "uz": return t("chatTil.tilNomi.uz");
    case "ru": return t("chatTil.tilNomi.ru");
    case "en": return t("chatTil.tilNomi.en");
    case "kk": return t("chatTil.tilNomi.kk");
    case "ky": return t("chatTil.tilNomi.ky");
    case "tg": return t("chatTil.tilNomi.tg");
    case "tr": return t("chatTil.tilNomi.tr");
    case "zh": return t("chatTil.tilNomi.zh");
    /* Tili aniqlanmagan matn — deyarli doim o'zbekcha lotin (`guessLang`) */
    default: return t("chatTil.tilNomi.uz");
  }
}

/* FUNKSIYA — mavzu almashganda rang ham almashsin (`RolePicker.rangi`) */
const rangi = (q: Qaysi) => (q === "menga" ? color.danger : color.blue);

/** Til nomi bayroq bilan; `null` — tarjimasiz, asl matn */
function nomi(l: string | null): string {
  return isChatTil(l) ? `${LOCALE_INFO[l].flag} ${LOCALE_INFO[l].native}` : t("chatTil.asl");
}

export function ChatLangChips({
  chatId,
  tillar,
  onChange,
  yozaOladi = true,
}: {
  chatId: string;
  tillar: ChatTillari;
  onChange: (t: ChatTillari) => void;
  /** Yopiq suhbatda «Unga» ning ma'nosi yo'q — hech narsa ketmaydi */
  yozaOladi?: boolean;
}) {
  /* Varaq ochiqligi va QAYSI tugma uchun — alohida: yopilish
     animatsiyasi paytida ham mazmun turishi kerak, aks holda varaq
     bo'sh holda pastga sirg'alardi */
  const [ochiq, setOchiq] = useState(false);
  const [varaq, setVaraq] = useState<Qaysi>("menga");
  const [band, setBand] = useState<Qaysi | null>(null);
  const [xato, setXato] = useState(false);

  const tugmalar: Qaysi[] = tillar.ungaBor && yozaOladi ? ["unga"] : [];
  const yoniq = tillar.tarjima !== false && isChatTil(tillar.menga);
  /* Til nomi o'quvchining tilida («O'zbekcha», «Ruscha») */
  const joriy = (q: Qaysi) => (q === "menga" ? tillar.menga : tillar.unga);
  const tanlangan = (q: Qaysi) => (q === "menga" ? tillar.mengaTanlangan : tillar.ungaTanlangan);
  const standart = (q: Qaysi) => (q === "menga" ? tillar.mengaStandart : tillar.ungaStandart);

  async function tanla(q: Qaysi, til: ChatTil | null) {
    /* Hech narsa o'zgarmadi — so'rov ham, ro'yxatni qayta yuklash ham,
       tarjima so'rash ham kerak emas */
    if (til === (tanlangan(q) ? joriy(q) : null) && (q !== "menga" || yoniq)) {
      setOchiq(false);
      return;
    }
    return saqla(q, { [q]: til });
  }

  async function saqla(q: Qaysi, body: Record<string, unknown>) {
    setOchiq(false);
    setBand(q);
    setXato(false);
    try {
      const r = await api<{ tillar: ChatTillari }>(`/api/chat/${chatId}/lang`, {
        method: "POST",
        body,
      });
      onChange(r.tillar);
    } catch {
      setXato(true);
    } finally {
      setBand(null);
    }
  }

  return (
    <View>
      {/* KATTA «🌐 Tarjima: Yoqilgan — O'zbekcha» (TZ 29-okt §4.3) */}
      <Tap
        onPress={() => {
          setVaraq("menga");
          setOchiq(true);
        }}
        disabled={band !== null}
        feel="select"
        accessibilityLabel={yoniq ? t("chatTil.tarjimaYoqiq", { til: tilNomi(tillar.menga as ChatTil) }) : t("chatTil.tarjimaOchiq")}
        style={[s.katta, yoniq ? { borderColor: `${color.brand}66`, backgroundColor: `${color.brand}14` } : null]}
      >
        <Text style={s.kattaIkon}>🌐</Text>
        <Text style={[s.kattaText, yoniq && { color: color.brandText }]} numberOfLines={1}>
          {yoniq ? t("chatTil.tarjimaYoqiq", { til: tilNomi(tillar.menga as ChatTil) }) : t("chatTil.tarjimaOchiq")}
        </Text>
        {band === "menga" ? (
          <ActivityIndicator size="small" color={color.brand} />
        ) : (
          <Icon name="chevron" size={14} stroke={yoniq ? color.brand : color.mutedForeground} />
        )}
      </Tap>
      <View style={[s.row, tugmalar.length > 0 && { marginTop: 8 }]}>
        {tugmalar.map((q) => {
          const tint = rangi(q);
          const til = nomi(joriy(q));
          return (
            /* Kenglik TASHQI qutida — `Tap` o'zini `Animated.View` ga
               o'raydi va `flex` ichkaridan ishlamaydi */
            <View key={q} style={s.cell}>
              <Tap
                onPress={() => {
                  setVaraq(q);
                  setOchiq(true);
                }}
                disabled={band !== null}
                feel="select"
                accessibilityLabel={`${t(`chatTil.${q}`)}: ${til}. ${t(`chatTil.${q}Hint`)}`}
                style={[s.btn, { borderColor: `${tint}59`, backgroundColor: `${tint}12` }]}
              >
                <View style={s.body}>
                  <View style={s.kickerRow}>
                    <View style={[s.dot, { backgroundColor: tint }]} />
                    <Text style={[s.kicker, { color: tint }]} numberOfLines={1}>
                      {t(`chatTil.${q}`)}
                    </Text>
                  </View>
                  <Text style={s.lang} numberOfLines={1}>
                    {til}
                  </Text>
                </View>
                {/* Qat'iy o'lchamli quti: saqlanayotganda tugma sakramasin */}
                <View style={s.tail}>
                  {band === q ? (
                    <ActivityIndicator size="small" color={tint} style={s.spin} />
                  ) : (
                    <View style={s.down}>
                      <Icon name="chevron" size={14} stroke={tint} />
                    </View>
                  )}
                </View>
              </Tap>
            </View>
          );
        })}
      </View>
      {xato ? <Text style={s.err}>{t("chatTil.saveFailed")}</Text> : null}

      <Sheet open={ochiq} onClose={() => setOchiq(false)} title={varaq === "menga" ? t("chatTil.tilniOzgartir") : t(`chatTil.${varaq}`)}>
        <View accessibilityRole="radiogroup">
          {varaq === "menga" ? (
            <Tap
              onPress={() => void saqla("menga", { tarjima: !yoniq })}
              feel="select"
              accessibilityRole="button"
              style={[s.ochir, yoniq ? { borderColor: color.danger } : { borderColor: color.brand, backgroundColor: `${color.brand}14` }]}
            >
              <Text style={[s.ochirText, { color: yoniq ? color.danger : color.brandText }]}>
                {yoniq ? t("chatTil.tarjimaOchir") : t("chatTil.tarjimaYoq")}
              </Text>
            </Tap>
          ) : (
            <View style={s.hintRow}>
              <View style={[s.dot, { backgroundColor: rangi(varaq) }]} />
              <Text style={s.hint}>{t(`chatTil.${varaq}Hint`)}</Text>
            </View>
          )}
          <View style={s.grid}>
            {CHAT_TILLARI.map((l) => (
              <View key={l} style={s.half}>
                <Variant
                  label={varaq === "menga" ? `${LOCALE_INFO[l].flag} ${tilNomi(l)}` : nomi(l)}
                  on={(varaq === "menga" ? yoniq : tanlangan(varaq)) && joriy(varaq) === l}
                  tint={rangi(varaq)}
                  onPress={() => void tanla(varaq, l)}
                />
              </View>
            ))}
          </View>
          {/* Standart — tanlovni olib tashlash: «Menga» → profil tili,
              «Unga» → suhbatdosh qaysi tilda o'qisa */}
          <Variant
            label={t("chatTil.standart", { til: nomi(standart(varaq)) })}
            on={!tanlangan(varaq)}
            tint={rangi(varaq)}
            onPress={() => void tanla(varaq, null)}
          />
        </View>
      </Sheet>
    </View>
  );
}

function Variant({ label, on, tint, onPress }: { label: string; on: boolean; tint: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      feel="select"
      accessibilityRole="radio"
      selected={on}
      accessibilityLabel={label}
      style={[s.opt, on && { borderColor: tint, backgroundColor: `${tint}14` }]}
    >
      <Text style={[s.optText, on && { color: tint, fontWeight: "700" }]} numberOfLines={1}>
        {label}
      </Text>
      {on ? <Icon name="check" size={16} stroke={tint} /> : null}
    </Tap>
  );
}

const s = themed(() => ({
  katta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.muted,
  },
  kattaIkon: { fontSize: 18 },
  kattaText: { flex: 1, fontSize: 15, fontWeight: "800", color: color.mutedForeground },
  ochir: { minHeight: 46, borderWidth: 1.5, borderRadius: radius.control, alignItems: "center", justifyContent: "center", marginBottom: space.md, paddingHorizontal: 12 },
  ochirText: { fontSize: 15, fontWeight: "800" },
  row: { flexDirection: "row", gap: 8 },
  /* Bitta tugma (guruh) ham yarim kenglikda — butun qatorni egallab
     «asosiy amal» dek ko'rinmasin */
  cell: { flex: 1, maxWidth: "50%" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  body: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  kicker: { flexShrink: 1, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  lang: { fontSize: 13.5, fontWeight: "700", color: color.foreground, marginTop: 1 },
  tail: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  /* O'ngga qaragan ikonka pastga buriladi — «ochiladi» belgisi */
  down: { transform: [{ rotate: "90deg" }] },
  spin: { transform: [{ scale: 0.75 }] },
  err: { fontSize: 11.5, fontWeight: "600", color: color.danger, marginTop: 4 },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.md },
  hint: { flex: 1, fontSize: 13, lineHeight: 18, color: color.mutedForeground },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8, marginBottom: 8 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  /* Kenglik TASHQI qutida: `Tap` bosilish animatsiyasi uchun o'zini
     `Animated.View` ga o'raydi va foiz o'sha qutiga nisbatan hisoblanardi */
  half: { width: "48.5%" },
  optText: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
}));
