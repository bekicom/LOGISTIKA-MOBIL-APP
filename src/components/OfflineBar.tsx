/**
 * Aloqa va navbat holati — ekran tepasidagi tor chiziq.
 *
 * NEGA KO'RINADI: haydovchi «yubordim» deb o'ylab, aslida yozuv
 * telefonda turganini bilmasligi mumkin. Chiziq shuni ochiq
 * aytadi va nechtasi kutayotganini ko'rsatadi.
 *
 * NEGA HAMMA VAQT EMAS: aloqa bor va navbat bo'sh bo'lsa chiziq
 * umuman chizilmaydi. Doim turgan «hammasi joyida» yozuvi bir
 * kunda ko'rinmay qoladi va chinakam ogohlantirish ham u bilan
 * birga sezilmay ketardi.
 *
 * Uch holat, uch rang:
 *   qizil  — aloqa yo'q
 *   sariq  — aloqa bor, navbatda yozuv turibdi
 *   qizil  — yuborilmagan (server rad etgan) yozuv bor
 */
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "./Icon";
import { useOutboxCounts } from "@/lib/use-outbox";
import { t } from "@/lib/i18n";
import { color, font } from "@/lib/theme";

export function OfflineBar({ online }: { online: boolean }) {
  const { pending, failed } = useOutboxCounts();
  const router = useRouter();

  if (online && !pending && !failed) return null;

  const bad = failed > 0;
  const tone = !online || bad ? color.danger : color.warning;

  const text = bad
    ? t("mob.outbox.failed", { n: failed })
    : !online
      ? pending
        ? t("mob.outbox.offlineWith", { n: pending })
        : t("mob.outbox.offline")
      : t("mob.outbox.sending", { n: pending });

  return (
    <Pressable
      onPress={() => router.push("/navbatim")}
      accessibilityRole="button"
      style={[s.bar, { backgroundColor: tone }]}
    >
      <Icon name={bad ? "alert" : !online ? "close" : "clock"} size={15} stroke="#fff" />
      <Text style={s.text} numberOfLines={1}>
        {text}
      </Text>
      <Icon name="chevron" size={15} stroke="rgba(255,255,255,0.75)" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: { flex: 1, fontSize: font.caption, fontWeight: "600", color: "#fff" },
});
