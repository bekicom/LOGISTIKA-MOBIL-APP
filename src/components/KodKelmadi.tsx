import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { color, font, radius, space, themed } from "@/lib/theme";
import { AppleLogo, GoogleG, type useSocialSignIn } from "@/components/SocialButtons";
import { t } from "@/lib/i18n";

/**
 * «Kod kelmadimi?» — boshqa yo'l bilan kirish (TZ 28-okt §1).
 * Webdagi `components/auth/kod-kelmadi.tsx` ning o'zi.
 *
 * Eskiz balansi tugagan kunlari odam kod kutib qolardi. Endi kod
 * 30 soniyada kelmasa yoki yuborish yiqilsa: Telegram orqali kod
 * (Gateway sozlangan va kod hali Telegramga ketmagan bo'lsa),
 * Google va iPhone'da Apple. Hech biri bo'lmasa blok chiqmaydi.
 */
export function KodKelmadi({
  telegram,
  onTelegram,
  social,
  busy,
}: {
  telegram: boolean;
  onTelegram: () => void;
  social: ReturnType<typeof useSocialSignIn>;
  busy?: boolean;
}) {
  const google = !!social.google;
  const apple = !!social.apple;
  if (!telegram && !google && !apple) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t("kodKelmadi.title")}</Text>
      <Text style={s.hint}>{t("kodKelmadi.hint")}</Text>
      <View style={{ gap: 8, marginTop: space.md }}>
        {telegram ? (
          <Pressable
            onPress={onTelegram}
            disabled={busy}
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            accessibilityRole="button"
          >
            <Text style={s.btnText}>✈️  {t("kodKelmadi.telegram")}</Text>
          </Pressable>
        ) : null}
        {/* Apple qoidasi: Google bor joyda iPhone'da Apple ham turadi */}
        {apple ? (
          <Pressable
            onPress={() => void social.run("apple")}
            disabled={!!social.busy}
            style={({ pressed }) => [s.btn, s.apple, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={t("mob.social.apple")}
          >
            {social.busy === "apple" ? <ActivityIndicator color="#fff" /> : <AppleLogo size={18} />}
            <Text style={[s.btnText, { color: "#ffffff" }]}>{t("mob.social.apple")}</Text>
          </Pressable>
        ) : null}
        {google ? (
          <Pressable
            onPress={() => void social.run("google")}
            disabled={!!social.busy}
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            accessibilityRole="button"
          >
            {social.busy === "google" ? <ActivityIndicator /> : <GoogleG size={18} />}
            <Text style={s.btnText}>{t("kodKelmadi.google")}</Text>
          </Pressable>
        ) : null}
      </View>
      {social.err ? <Text style={s.err}>{social.err}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  wrap: {
    marginTop: space.lg,
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.muted,
  },
  title: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  apple: { borderWidth: 0, backgroundColor: "#000000" },
  pressed: { backgroundColor: color.muted },
  btnText: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  err: { marginTop: space.sm, fontSize: 13, color: color.dangerText },
}));
