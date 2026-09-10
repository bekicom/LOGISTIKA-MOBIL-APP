/**
 * Rejim tanlagich — yorug' / qorong'i / tizim.
 *
 * ── NEGA UCHTA, IKKITA EMAS ─────────────────────────────────────
 *
 * «Tizim» — bu uchinchi holat, «yorug'» ning boshqa nomi emas.
 * Odam telefonini kechqurun qorong'iga o'tadigan qilib qo'ygan
 * bo'lsa, ilova ham o'tishi kerak. Faqat ikkita holat bo'lsa, u
 * har kuni qo'lda almashtirib o'tirardi.
 *
 * ── NEGA RO'YXAT EMAS, QATOR ────────────────────────────────────
 *
 * Uchta variant bitta qatorga sig'adi va tanlov DARROV ko'rinadi.
 * Alohida ekran ochilsa, odam «qorong'i bormi-yo'qmi» degan
 * savolga javob olish uchun ikki marta bosardi.
 *
 * ── O'ZGARISH ZAHOTI KO'RINADI ──────────────────────────────────
 *
 * Bosilgan zahoti butun daraxt qayta chiziladi (`theme-store`),
 * shuning uchun odam natijani shu ekranda ko'radi — hech qayerga
 * o'tish yoki ilovani qayta ochish kerak emas.
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { setThemeChoice, themeChoice, useThemeVersion, type ThemeChoice } from "@/lib/theme-store";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const OPTIONS: { key: ThemeChoice; icon: IconName; label: string }[] = [
  { key: "light", icon: "eye", label: "mob.theme.light" },
  { key: "dark", icon: "eye-off", label: "mob.theme.dark" },
  { key: "system", icon: "grid", label: "mob.theme.system" },
];

export function ThemePick() {
  /* Tanlov o'zgarganda qayta chizilishi uchun — `themeChoice()`
     oddiy o'zgaruvchi, u o'zi qayta chizishni keltirmaydi */
  useThemeVersion();
  const now = themeChoice();

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{t("mob.theme.title")}</Text>
      <View style={s.row}>
        {OPTIONS.map((o) => {
          const on = now === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setThemeChoice(o.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[s.item, on && s.itemOn]}
            >
              <Icon name={o.icon} size={17} stroke={on ? color.brand : color.mutedForeground} />
              <Text style={[s.text, on && s.textOn]}>{t(o.label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = themed(() => ({
  wrap: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  label: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, marginBottom: 9 },
  row: { flexDirection: "row", gap: 7 },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  itemOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  text: { fontSize: 12, fontWeight: "600", color: color.mutedForeground },
  textOn: { color: color.brand, fontWeight: "800" },
}));
