/**
 * Huquqiy hujjatlar — ommaviy oferta, maxfiylik va shartlar.
 *
 * DO'KON TALABI. Apple ilovani maxfiylik siyosati havolasisiz QABUL
 * QILMAYDI (App Store Review Guidelines 5.1.1). Hozirgacha ilovada
 * bu havola umuman yo'q edi — ya'ni ilova ko'rikdan o'tmasdi.
 *
 * MATN ILOVAGA KO'CHIRILMAYDI. Hujjatlar web'da turadi va vaqti-vaqti
 * bilan o'zgaradi (rekvizit, band, sana). Nusxa olsak, ikkalasi
 * ajralib ketardi va foydalanuvchi eski shartni o'qib, yangisiga
 * rozilik bergan bo'lib qolardi. Shuning uchun brauzerda ochiladi.
 *
 * ⚠️ Brauzer ilovaning tilini bilmaydi — sahifa qurilma tiliga
 * qarab ochiladi (`Accept-Language`). Ikkalasi deyarli har doim bir
 * xil; farq qilsa ham hujjatning O'ZI to'g'ri, faqat tili boshqa.
 */
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Header, ListRow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { API_BASE } from "@/lib/api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

/** Web'dagi manzillar — `furam/src/app/(info)/` */
const DOCS = [
  { key: "offer", path: "/offer" },
  { key: "privacy", path: "/privacy" },
  { key: "terms", path: "/terms" },
] as const;

export default function Huquqiy() {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <Header title={t("mob.legal.title")} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        <Card>
          {DOCS.map((d, i) => (
            <ListRow
              key={d.key}
              icon={
                <View style={s.badge}>
                  <Icon name="doc" size={17} stroke={color.mutedForeground} />
                </View>
              }
              title={t(`mob.legal.${d.key}`)}
              hint={t(`mob.legal.${d.key}Hint`)}
              right={<Icon name="arrow-right" size={17} stroke="#cbd5e1" />}
              last={i === DOCS.length - 1}
              onPress={() => void Linking.openURL(`${API_BASE}${d.path}`)}
            />
          ))}
        </Card>

        <View style={s.note}>
          <Icon name="alert" size={16} stroke="#94a3b8" />
          <Text style={s.noteText}>{t("mob.legal.opensInBrowser")}</Text>
        </View>

        {/* Kompaniya rekvizitlari — oferta talabi */}
        <View style={s.company}>
          <Text style={s.companyLabel}>{t("mob.legal.company")}</Text>
          <Text style={s.companyName}>ESSEN TRUCK MCHJ</Text>
          <Pressable onPress={() => void Linking.openURL(`${API_BASE}/offer`)}>
            <Text style={s.companyLink}>{t("mob.legal.details")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    flexDirection: "row",
    gap: 9,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: radius.card,
    padding: 13,
  },
  noteText: { flex: 1, fontSize: 12, color: "#475569", lineHeight: 19 },

  company: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.lg,
  },
  companyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
  },
  companyName: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground, marginTop: 6 },
  companyLink: { fontSize: font.caption, fontWeight: "600", color: color.brand, marginTop: 10 },
});
