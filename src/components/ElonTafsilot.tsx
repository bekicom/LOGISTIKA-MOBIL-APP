/**
 * E'lon ichidagi umumiy qismlar — yuk va mashina sahifasi BIR XIL
 * ko'rinsin (2026-09-21).
 *
 * Yuk sahifasi Bekzod ko'rsatgan namuna bo'yicha qayta chizildi
 * (ikonkali yo'nalish, «Narx» qutisi, ikonkali qatorlar). Mashina
 * sahifasi eski ko'rinishda qolgan edi — ikki ekran bir ilovaga
 * tegishli emasdek turardi. Qismlar shu yerga chiqarildi, ikkalasi
 * ham shularni ishlatadi.
 */
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { t } from "@/lib/i18n";
import { color, radius, space, themed } from "@/lib/theme";

/** Yo'nalish bekati: belgi · shahar (qalin) · davlat (xira) · o'ngda sana/holat */
export function Bekat({
  icon,
  city,
  country,
  right,
  rightTone,
}: {
  icon: IconName;
  city: string;
  country: string;
  right?: string;
  rightTone?: string;
}) {
  return (
    <View style={s.stop}>
      <View style={s.stopIcon}>
        <Icon name={icon} size={19} stroke={color.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.stopCity}>{city}</Text>
        <Text style={s.stopCountry}>{country}</Text>
      </View>
      {right ? <Text style={[s.stopRight, rightTone ? { color: rightTone } : null]}>{right}</Text> : null}
    </View>
  );
}

/** Ikki bekat orasidagi uch nuqta */
export function YolNuqtalari() {
  return (
    <View style={s.routeDots}>
      <View style={s.routeDot} />
      <View style={s.routeDot} />
      <View style={s.routeDot} />
    </View>
  );
}

/**
 * Ma'lumot qatori: rangli katakdagi belgi · nom · qiymat.
 *
 * Ilgari to'rt katakli jadval edi: qiymat nomdan kattaroq, belgisiz —
 * ko'z qaysi raqam nima ekanini har safar pastdagi yozuvdan qidirardi.
 */
export function Qator({
  icon,
  label,
  value,
  tone,
  last,
  locked,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: string;
  last?: boolean;
  /** Kontakt ochilmaguncha yashirin qiymat (davlat raqami) */
  locked?: boolean;
}) {
  return (
    <View style={[s.row, !last && s.rowDivider]}>
      <View style={s.rowIcon}>
        <Icon name={icon} size={17} stroke={color.brand} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, tone ? { color: tone } : null, locked && s.rowLocked]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** «Narx» qutisi — summa yoki «Kelishiladi» */
export function NarxQutisi({ narx }: { narx: string | null }) {
  return (
    <View style={s.priceBox}>
      <View style={s.priceIcon}>
        <Icon name="wallet" size={20} stroke={color.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.priceLabel}>{t("mob.load.price")}</Text>
        {narx ? (
          <Text style={s.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {narx}
          </Text>
        ) : (
          <Text style={s.priceNego}>{t("mob.loads.negotiable")}</Text>
        )}
      </View>
    </View>
  );
}

const s = themed(() => ({
  stop: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  stopIcon: { width: 26, height: 24, alignItems: "center", justifyContent: "center" },
  stopCity: { fontSize: 17, lineHeight: 23, fontWeight: "800", color: color.foreground, letterSpacing: -0.3 },
  stopCountry: { fontSize: 13, color: color.mutedForeground, marginTop: 1 },
  stopRight: { fontSize: 13, fontWeight: "600", color: color.mutedForeground, marginTop: 3 },
  routeDots: { width: 26, alignItems: "center", gap: 4, paddingVertical: 5 },
  routeDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.iconFaint },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: color.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 14, color: color.mutedForeground },
  rowValue: { maxWidth: "55%", textAlign: "right", fontSize: 15, fontWeight: "700", color: color.foreground },
  rowLocked: { color: color.faintText, letterSpacing: 1 },

  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: color.brandSoft,
  },
  priceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  priceLabel: { fontSize: 12.5, color: color.mutedForeground },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: color.brand,
    letterSpacing: -0.5,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  priceNego: { fontSize: 19, fontWeight: "800", color: color.brandText, marginTop: 1 },
}));
