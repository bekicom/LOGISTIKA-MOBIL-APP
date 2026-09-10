/**
 * Qorong'i rejim — YOQIB-O'CHIRADIGAN KALIT.
 *
 * ── NEGA KALIT, UCHTA TUGMA EMAS ────────────────────────────────
 *
 * Birinchi variantda uchta tugma bor edi: Yorug' / Qorong'i /
 * Tizim. Bekzod ko'rib rad etdi: «galochkali qil, yoqib
 * o'chiradigan qil». U haq — qorong'i rejim odam uchun BITTA
 * savol («qorong'i bo'lsinmi?»), uchta variantli tanlov emas.
 * Uchta tugma esa har ochilishda o'qib chiqishni talab qilardi.
 *
 * ── «TIZIM» YO'QOLMADI, KO'RINMAY QOLDI ─────────────────────────
 *
 * Standart holat baribir «tizim»: ilova birinchi ochilishda
 * odamning telefoni qanday bo'lsa shunday ko'rinadi va u hech
 * narsa qilmasa ham to'g'ri chiqadi.
 *
 * Kalitga TEGILGAN zahoti tanlov QAT'IY bo'ladi (`light` yoki
 * `dark`) — odam ataylab qo'lda tanladi, demak telefon
 * sozlamasi endi uni bosmasligi kerak.
 *
 * Ya'ni uchinchi holat interfeysdan chiqdi, lekin xatti-harakati
 * qoldi. Buni ko'rsatish uchun izoh matni turadi: kalit tegilmagan
 * bo'lsa «telefon sozlamasiga ergashadi» deb yoziladi.
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Switch } from "@/components/ui";
import { setThemeChoice, themeChoice, useThemeVersion } from "@/lib/theme-store";
import { color, radius, space, themed, themeName } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function ThemePick() {
  /* `themeChoice()` oddiy o'zgaruvchi — o'zi qayta chizishni
     keltirmaydi, shuning uchun versiyaga obuna bo'lamiz */
  useThemeVersion();
  const choice = themeChoice();
  const dark = themeName() === "dark";

  return (
    <Pressable
      /* Butun qator bosiladi, faqat kalit emas: telefonda kichik
         kalitni aniq bosish qiyin */
      onPress={() => setThemeChoice(dark ? "light" : "dark")}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: color.muted }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      accessibilityLabel={t("mob.theme.dark")}
    >
      <View style={s.badge}>
        <Icon name={dark ? "eye-off" : "eye"} size={19} stroke={color.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{t("mob.theme.dark")}</Text>
        {/* Kalit hali tegilmagan bo'lsa — nega shunday ko'rinayotgani
            aytiladi. Aks holda odam «men qorong'i qilmadim, nega
            qorong'i?» degan savol bilan qolardi. */}
        <Text style={s.hint}>
          {choice === "system" ? t("mob.theme.systemHint") : t("mob.theme.manualHint")}
        </Text>
      </View>
      <Switch value={dark} onValueChange={(v) => setThemeChoice(v ? "dark" : "light")} />
    </Pressable>
  );
}

const s = themed(() => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderRadius: radius.card,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  title: { fontSize: 14, fontWeight: "700", color: color.foreground },
  hint: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2, lineHeight: 16 },
}));
