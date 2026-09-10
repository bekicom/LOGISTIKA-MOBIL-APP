/**
 * E'lon egasi bilan bog'lanish yo'llari — Telegram TZ C3.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Telegramdan olingan yuklarning DEYARLI YARMIDA telefon raqam
 * yo'q: xabar matnida yozilmagan. 2026-09-10 gacha bunday e'lon
 * umuman saqlanmasdi — o'lchov 108 237 ta tashlangan yukni
 * ko'rsatdi. Endi ular lentaga chiqadi va ular bilan ASL POSTGA
 * havola orqali bog'laniladi: o'sha yerda odam e'lon egasiga
 * to'g'ridan-to'g'ri yozadi.
 *
 * ── QARORNI SERVER QILADI ───────────────────────────────────────
 *
 * Qaysi havola bor, qaysi yo'q — hammasi `links` da keladi
 * (`lib/contact-links.ts`). Ilova shartni TAKRORLAMAYDI: aks
 * holda web bilan ilova bir xil e'londa boshqa-boshqa tugma
 * ko'rsatardi.
 *
 * ⚠️ MEHMONGA telefonli havola KELMAYDI. `wa.me/998…` va
 * `sms:+998…` ichida raqamning O'ZI turadi — server ularni
 * kesib yuboradi (`publicLinks`). Bu yerda qo'shimcha tekshiruv
 * yo'q va bo'lishi ham kerak emas: bitta qoida ikki joyda
 * bo'lsa, biri o'zgarib ikkinchisi qolib ketardi.
 *
 * ── BO'SH TUGMA CHIZILMAYDI ─────────────────────────────────────
 *
 * Havolasi yo'q yo'l tugma bo'lib turmaydi. Odamni bosishga
 * undab, keyin hech narsa qilmaslik — eng g'ashlantiradigan
 * xatti-harakat.
 */
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import Svg, { Path } from "react-native-svg";
import { Icon, type IconName } from "@/components/Icon";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type Links = {
  telegram: string | null;
  whatsapp: string | null;
  tel: string | null;
  sms: string | null;
};

export function hasAnyLink(l: Links | null | undefined): boolean {
  return !!(l && (l.telegram || l.whatsapp || l.tel || l.sms));
}

/** Telegram va WhatsApp — o'z ranglari bilan, boshqalari ikonka */
function Logo({ kind }: { kind: "telegram" | "whatsapp" }) {
  if (kind === "telegram") {
    return (
      <Svg width={19} height={19} viewBox="0 0 24 24">
        <Path
          d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.56 8.22-1.86 8.78c-.14.62-.51.77-1.03.48l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.58.28l.2-2.9 5.29-4.78c.23-.2-.05-.32-.36-.12l-6.53 4.11-2.81-.88c-.61-.19-.62-.61.13-.9l10.99-4.24c.51-.18.96.12.78.95z"
          fill="#229ED9"
        />
      </Svg>
    );
  }
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Path
        d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.8 14.06c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.03.24-2.92-.6-2.28-1.02-3.72-3.4-3.83-3.56-.11-.16-.9-1.24-.9-2.36 0-1.12.59-1.67.8-1.9.21-.23.46-.29.61-.29.16 0 .32 0 .46.01.15.01.35-.06.54.41.2.48.67 1.65.73 1.77.06.12.1.26.02.42-.08.16-.15.26-.29.41-.14.15-.3.33-.43.44-.14.13-.29.27-.13.53.16.26.72 1.19 1.55 1.93.94.83 1.72 1.09 1.98 1.21.26.13.41.11.56-.07.15-.18.65-.76.83-1.02.17-.26.35-.21.58-.13.24.09 1.5.71 1.76.83.26.13.43.2.5.31.06.11.06.65-.18 1.33z"
        fill="#25D366"
      />
    </Svg>
  );
}

function LinkButton({
  href,
  label,
  icon,
  logo,
  primary,
}: {
  href: string;
  label: string;
  icon?: IconName;
  logo?: "telegram" | "whatsapp";
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(href)}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [s.btn, primary && s.btnPrimary, pressed && { opacity: 0.75 }]}
    >
      {logo ? <Logo kind={logo} /> : null}
      {icon ? <Icon name={icon} size={18} stroke={primary ? "#fff" : color.brand} /> : null}
      <Text style={[s.btnText, primary && { color: "#fff" }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ContactLinks({
  links,
  hasPhone,
}: {
  links: Links | null | undefined;
  /** Asl e'londa raqam bormi — izoh matni shunga qarab yoziladi */
  hasPhone?: boolean;
}) {
  if (!hasAnyLink(links) || !links) return null;

  return (
    <View style={s.wrap}>
      <Text style={s.head}>{t("mob.clink.title")}</Text>

      {/* Telegram BIRINCHI va ajratilgan: raqam yo'q bo'lsa yagona
          yo'l shu, bor bo'lsa ham eng tez javob o'sha yerdan
          keladi (mijozning kuzatuvi) */}
      {links.telegram ? (
        <LinkButton href={links.telegram} label={t("mob.clink.telegram")} logo="telegram" primary />
      ) : null}

      <View style={s.row}>
        {links.whatsapp ? (
          <LinkButton href={links.whatsapp} label="WhatsApp" logo="whatsapp" />
        ) : null}
        {links.tel ? (
          <LinkButton href={links.tel} label={t("mob.clink.call")} icon="phone" />
        ) : null}
        {links.sms ? <LinkButton href={links.sms} label="SMS" icon="chat" /> : null}
      </View>

      {/* Raqamsiz e'londa odam nima kutishini bilishi kerak */}
      {hasPhone === false && links.telegram ? (
        <Text style={s.note}>{t("mob.clink.noPhoneNote")}</Text>
      ) : null}
    </View>
  );
}

const s = themed(() => ({
  wrap: { marginTop: space.md, gap: 8 },
  head: { fontSize: 12, fontWeight: "800", color: color.mutedForeground },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  btn: {
    flexGrow: 1,
    flexBasis: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  btnPrimary: { backgroundColor: "#229ED9", borderColor: "#229ED9", flexBasis: "100%" },
  btnText: { fontSize: 13.5, fontWeight: "700", color: color.foreground },

  note: { fontSize: 11.5, color: color.mutedForeground, lineHeight: 17 },
}));
