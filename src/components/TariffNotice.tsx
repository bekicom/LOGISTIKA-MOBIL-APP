/**
 * Tarif ogohlantirishi — forma boshida (2026-09-04, audit 07).
 *
 * ── NEGA TUGMANI O'CHIRMAYDI ────────────────────────────────────
 *
 * Tarif tugagan odamning ma'lumoti o'chirilmaydi, faqat faol
 * ishlash bloklanadi (TZ 19, 25-band). Shu mantiq interfeysda ham
 * saqlanadi: forma to'ldirilaveradi, faqat oxirida rol so'raladi.
 * Tugmani o'chirib qo'ysak, odam nima uchun ishlamayotganini
 * bilmay qolardi — o'chirilgan tugma sababini aytmaydi.
 *
 * ── NEGA EKRAN BOSHIDA ──────────────────────────────────────────
 *
 * Ilgari javob faqat «Joylash» bosilgandan keyin kelardi: odam
 * uzun formani to'ldirib, suratlarini yuklab, oxirida «tarifingizga
 * kirmaydi» xabarini olardi. Bajarilgan ish behuda ketishi —
 * xatoning eng qimmat turi.
 *
 * Ochiq bo'lsa HECH NARSA chizilmaydi: to'lagan odam har ekranda
 * tarif haqida o'qib yurmasligi kerak.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { featureName, type FeatureKey } from "@/lib/features";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/**
 * `top` — `gap` i yo'q ro'yxatlar uchun ustki oraliq.
 *
 * Tashqi `<View style={{marginTop}}>` bilan o'rash YARAMAYDI: tarif
 * ochiq bo'lganda ichkarisi bo'sh qoladi, lekin margin qolib
 * ketadi va to'lagan odam har ekranda 20px bo'sh joy ko'radi.
 */
export function TariffNotice({ feature, top = 0 }: { feature: FeatureKey; top?: number }) {
  const { can } = useAuth();
  const router = useRouter();

  if (can(feature)) return null;

  return (
    <View style={[s.box, top ? { marginTop: top } : null]}>
      <View style={s.head}>
        <Icon name="alert" size={17} stroke={color.warning} />
        <Text style={s.title}>{t("mob.tariff.need", { f: featureName(feature) })}</Text>
      </View>
      <Text style={s.body}>{t("mob.tariff.needHint")}</Text>
      <Pressable
        style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]}
        onPress={() => router.push("/rollarim")}
        hitSlop={6}
      >
        <Text style={s.btnText}>{t("mob.tariff.pick")}</Text>
        <Icon name="arrow-right" size={15} stroke={color.warning} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
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
  btn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  btnText: { fontSize: 13.5, fontWeight: "700", color: color.warning },
});
