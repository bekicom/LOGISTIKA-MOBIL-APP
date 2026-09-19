/**
 * Tarif belgisi — profil boshida, ism ostida (TZ-04, 2026-09-19).
 *
 * Mijoz (web uchun): «qaysi roldaligini ham ko'rsatib tursin». Webda
 * belgi sarlavhada, telefonda profil menyusining boshida turadi — ilovada
 * unga profil yorlig'i mos keladi. Bosilsa «Men kimman?» (rollar va
 * muddatlar) ochiladi.
 *
 * Matn va rang qoidasi `lib/tarif-belgi.ts` da — web bilan bir xil.
 * Holat ma'lum bo'lmasa (eski server) hech narsa chizilmaydi.
 */
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { belgiMatni, belgiToni, type BelgiTon } from "@/lib/tarif-belgi";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function TarifBelgi() {
  const { tarif } = useAuth();
  const router = useRouter();
  if (!tarif) return null;

  const ton = belgiToni(tarif);
  const rang = RANG[ton]();
  return (
    <Pressable
      onPress={() => router.push("/rollarim")}
      accessibilityRole="link"
      accessibilityHint={t("mob.roles.title")}
      hitSlop={6}
      style={({ pressed }) => [s.pill, { backgroundColor: rang.bg, borderColor: rang.chiziq }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[s.text, { color: rang.fg }]} numberOfLines={1}>
        {belgiMatni(tarif, t)}
      </Text>
      <Icon name="chevron" size={13} stroke={rang.fg} />
    </Pressable>
  );
}

/* Funksiya — rang mavzu almashganda qayta o'qilsin (`themed` dagi sabab) */
const RANG: Record<BelgiTon, () => { fg: string; bg: string; chiziq: string }> = {
  ok: () => ({ fg: color.successText, bg: color.successSoft, chiziq: color.success + "55" }),
  sinov: () => ({ fg: color.warningText, bg: color.warningSoft, chiziq: color.warning + "55" }),
  tugadi: () => ({ fg: color.danger, bg: color.dangerSoft, chiziq: color.danger + "55" }),
  yoq: () => ({ fg: color.mutedForeground, bg: color.muted, chiziq: color.border }),
};

const s = themed(() => ({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "100%",
    paddingLeft: 11,
    paddingRight: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { flexShrink: 1, fontSize: 12.5, fontWeight: "700" },
}));
