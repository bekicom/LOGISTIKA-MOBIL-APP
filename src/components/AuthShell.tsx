/**
 * Kirish ekranlarining umumiy qobig'i — to'q ko'k fon, tepada logo va
 * til, pastda oq karta.
 *
 * Kirish, ro'yxat va parolni tiklash ilgari har biri o'z sahifasini
 * chizardi (uch xil «orqaga», uch xil sarlavha). Endi bitta qobiq:
 * ekranlar faqat karta ICHINI beradi.
 *
 * «Kirish | Ro'yxatdan o'tish» almashtirgichi — namunadagidek
 * (Kornet) kartaning tepasida; ikkala ekran bir-biriga `replace`
 * bilan o'tadi, tarix to'planmaydi.
 *
 * ── SARLAVHA IXCHAM ─────────────────────────────────────────────
 *
 * Bekzod (sinov): «logoni teparoqqa, kichikroq — input ko'rinmay
 * qolmasin». Logo 104, sarlavha 22, oraliqlar kichik. Klaviatura
 * ochilganda iOS `automaticallyAdjustKeyboardInsets` maydonni
 * yuqoriga suradi.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/Text";
import { color, radius, space } from "@/lib/theme";
import { LOCALE_INFO, currentLocale, t } from "@/lib/i18n";

export type AuthTab = "signIn" | "signUp";

export function AuthShell({
  title,
  subtitle,
  tab,
  onBack,
  children,
  footer,
  compact,
}: {
  title: string;
  subtitle?: string;
  /** Berilsa kartaning tepasida almashtirgich chiqadi */
  tab?: AuthTab;
  onBack?: () => void;
  children: ReactNode;
  /** Karta ostida, ko'k fonda — masalan «Hisobingiz bormi? Kirish» */
  footer?: ReactNode;
  /** Klaviatura ochiq ekranlar uchun yanada kichik sarlavha */
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + space.xl }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={s.top}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={12} style={s.back} accessibilityRole="button">
                <Icon name="back" size={22} stroke="#ffffff" />
              </Pressable>
            ) : (
              <View style={s.back} />
            )}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.push("/til?back=1")}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [s.lang, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.langFlag}>{LOCALE_INFO[currentLocale()].flag}</Text>
              <Text style={s.langText}>{LOCALE_INFO[currentLocale()].native}</Text>
            </Pressable>
          </View>

          <View style={[s.hero, compact && s.heroCompact]}>
            <Logo width={compact ? 88 : 104} light />
            <Text style={[s.title, compact && s.titleCompact]}>{title}</Text>
            {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
          </View>

          <View style={s.card}>
            {tab ? (
              <View style={s.seg}>
                {(["signIn", "signUp"] as const).map((k) => {
                  const on = tab === k;
                  return (
                    <Pressable
                      key={k}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      onPress={() => !on && router.replace(k === "signIn" ? "/kirish" : "/royxat")}
                      style={[s.segItem, on && s.segOn]}
                    >
                      <Text style={[s.segText, on && s.segTextOn]}>
                        {t(k === "signIn" ? "mob.intro.signIn" : "mob.intro.signUp")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {children}
          </View>

          {footer ? <View style={s.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Karta ostidagi «Savol? Havola» qatori */
export function AuthLine({ text, link, onPress }: { text: string; link: string; onPress: () => void }) {
  return (
    <View style={s.line}>
      <Text style={s.lineText}>{text}</Text>
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
        <Text style={s.lineLink}>{link}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.blue },
  scroll: { flexGrow: 1, paddingHorizontal: space.lg },

  top: { flexDirection: "row", alignItems: "center", minHeight: 40 },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  lang: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff22",
  },
  langFlag: { fontSize: 13 },
  langText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },

  hero: { alignItems: "center", marginTop: 6, marginBottom: 16 },
  heroCompact: { marginTop: 0, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#ffffff", marginTop: 12, letterSpacing: -0.3, textAlign: "center" },
  titleCompact: { fontSize: 19, marginTop: 8 },
  sub: { fontSize: 13, color: "#ffffffcc", marginTop: 3, textAlign: "center", lineHeight: 18, paddingHorizontal: 12 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.sheet,
    padding: space.xl,
    paddingTop: space.lg,
  },
  seg: {
    flexDirection: "row",
    backgroundColor: color.muted,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: space.lg,
  },
  segItem: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  segOn: { backgroundColor: color.brand },
  segText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },
  segTextOn: { color: "#ffffff" },

  footer: { marginTop: space.xl, alignItems: "center" },
  line: { flexDirection: "row", justifyContent: "center", gap: 6 },
  lineText: { fontSize: 14, color: "#ffffffcc" },
  lineLink: { fontSize: 14, fontWeight: "700", color: "#ffffff", textDecorationLine: "underline" },
});
