/**
 * Til tugmasi — sarlavhada, logodan keyin darhol (TZ 29-okt §2.5, §13.1).
 *
 * Bayroq + o'z nomi (`ixcham` da — bayroq + qisqa kod: tor sarlavhada
 * nom sig'maydi). Bosilganda til ekrani ochiladi (`/til?live=1`) — u
 * yerda tanlov saqlanadi va butun ilova o'sha zahoti yangi tilda
 * chiziladi (`applyLocaleNow`). Mehmonga ham, kirgan odamga ham.
 */
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { currentLocale, LOCALE_INFO, t } from "@/lib/i18n";
import { color, themed } from "@/lib/theme";

const QISQA: Record<string, string> = { "uz-Cyrl": "ЎЗ", uz: "UZ", ru: "RU", en: "EN", tr: "TR", kk: "ҚЗ", ky: "КГ", tg: "ТҶ", zh: "中文" };

export function TilTugma({ ixcham = false }: { ixcham?: boolean }) {
  const router = useRouter();
  const l = currentLocale();
  const info = LOCALE_INFO[l];
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/til", params: { live: "1" } })}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${t("mob.lang.appTitle")}: ${info.native}`}
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.6 }]}
    >
      <Text style={s.flag}>{info.flag}</Text>
      <Text style={s.nom} numberOfLines={1}>
        {ixcham ? QISQA[l] ?? l.toUpperCase() : info.native}
      </Text>
      <View style={{ marginLeft: -1, transform: [{ rotate: "90deg" }] }}>
        <Icon name="chevron" size={12} stroke={color.mutedForeground} />
      </View>
    </Pressable>
  );
}

const s = themed(() => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  flag: { fontSize: 16 },
  nom: { fontSize: 12.5, fontWeight: "700", color: color.foreground, maxWidth: 92 },
}));
