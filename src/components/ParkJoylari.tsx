/**
 * Park joylari — «Joylar: 3 tadan 2 tasi band» (2026-09-19).
 *
 * Webdagi `fleet/tariff-banner.tsx` qatorining juftligi — faqat SON.
 * Narx, «joy oching», «uzaytiring» YO'Q: ilovada to'lov yo'li yo'q
 * (Apple 3.1.1, Play to'lov qoidasi), chaqiriq esa boshi berk ko'cha
 * bo'lardi. Joy tugagani OLDINDAN ko'rinadi (5-qoida): ilgari odam
 * butun formani to'ldirib, saqlashda «Tarifni kengaytiring» olardi.
 *
 * Sonlar serverdan (`tariff-server.ts:joylar`) — chegara admin panelidan
 * o'zgaradi, sinovda boshqa (hozir 3 ta), shuning uchun ilovada
 * hisoblanmaydi. `null` — cheksiz (VIP): unda hech narsa chizilmaydi.
 */
import { Alert, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { color, font, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** `furam/src/lib/tariff-server.ts:Joylar` */
export type Joylar = { used: number; limit: number };

/* Oddiy boolean, tip predikati EMAS: to'lmagan joy ham `Joylar` —
   predikat `false` tarmog'ida uni «yo'q» deb toraytirib yuborardi */
export function tolami(j: Joylar | null | undefined): boolean {
  return !!j && j.used >= j.limit;
}

/** Joy tugagan — forma ochilmaydi, sababi aytiladi. Son noma'lum bo'lsa umumiy matn */
export function joyTugadi(limit: number | null | undefined) {
  Alert.alert(
    t("pgFleet.joylarTola"),
    limit != null ? t("pgFleet.joylarTolaMatn", { n: limit }) : t("apiErr.TARIFF_LIMIT"),
  );
}

/** Park ro'yxati tepasidagi qator; joy tugagan bo'lsa sariq */
export function JoylarQatori({ joy }: { joy: Joylar | null | undefined }) {
  if (!joy) return null;
  const tola = tolami(joy);
  return (
    <View style={[s.qator, tola && s.qatorTola]}>
      <Icon name="truck" size={15} stroke={tola ? color.warningText : color.mutedForeground} />
      <Text style={[s.qatorMatn, tola && { color: color.warningText }]}>
        {t("pgFleet.tarSeats", { used: joy.used, total: joy.limit })}
      </Text>
    </View>
  );
}

/** Qo'shish formasi boshida — `TariffNotice` ko'rinishida, tugmasiz */
export function JoyTugadiOgohi({ joy }: { joy: Joylar | null | undefined }) {
  if (!joy || !tolami(joy)) return null;
  return (
    <View style={s.box}>
      <View style={s.head}>
        <Icon name="alert" size={17} stroke={color.warning} />
        <Text style={s.title}>{t("pgFleet.joylarTola")}</Text>
      </View>
      <Text style={s.body}>{t("pgFleet.joylarTolaMatn", { n: joy.limit })}</Text>
    </View>
  );
}

const s = themed(() => ({
  qator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  qatorTola: { backgroundColor: color.warningSoft },
  qatorMatn: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, fontVariant: ["tabular-nums"] },

  box: {
    borderWidth: 1,
    borderColor: color.warning + "47",
    backgroundColor: color.warning + "0d",
    borderRadius: radius.card,
    padding: space.md,
    gap: 5,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { flex: 1, fontSize: font.bodyLg, fontWeight: "600", color: color.warning },
  body: { fontSize: 12.5, color: color.warning, lineHeight: 18, opacity: 0.9 },
}));
