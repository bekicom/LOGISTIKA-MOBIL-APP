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

  const tugmalar: Qaysi[] = tillar.ungaBor && yozaOladi ? ["menga", "unga"] : ["menga"];
  const joriy = (q: Qaysi) => (q === "menga" ? tillar.menga : tillar.unga);
  const tanlangan = (q: Qaysi) => (q === "menga" ? tillar.mengaTanlangan : tillar.ungaTanlangan);
  const standart = (q: Qaysi) => (q === "menga" ? tillar.mengaStandart : tillar.ungaStandart);

  async function tanla(q: Qaysi, til: ChatTil | null) {
    setOchiq(false);
    /* Hech narsa o'zgarmadi — so'rov ham, ro'yxatni qayta yuklash ham,
       tarjima so'rash ham kerak emas */
    if (til === (tanlangan(q) ? joriy(q) : null)) return;
    setBand(q);
    setXato(false);
    try {
      const r = await api<{ tillar: ChatTillari }>(`/api/chat/${chatId}/lang`, {
        method: "POST",
        body: { [q]: til },
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
      <View style={s.row}>
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

      <Sheet open={ochiq} onClose={() => setOchiq(false)} title={t(`chatTil.${varaq}`)}>
        <View accessibilityRole="radiogroup">
          <View style={s.hintRow}>
            <View style={[s.dot, { backgroundColor: rangi(varaq) }]} />
            <Text style={s.hint}>{t(`chatTil.${varaq}Hint`)}</Text>
          </View>
          <View style={s.grid}>
            {CHAT_TILLARI.map((l) => (
              <View key={l} style={s.half}>
                <Variant
                  label={nomi(l)}
                  on={tanlangan(varaq) && joriy(varaq) === l}
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
