/**
 * A2 — tanishtiruv (2026-09-05, yangi dizayn).
 *
 * ── OXIRGI PANELGACHA BITTA TUGMA ───────────────────────────────
 *
 * Ilgari uchala panelda ham «Ro'yxatdan o'tish / Kirish / Avval
 * ko'rib chiqaman» turardi — ya'ni birinchi ekrandayoq qaror
 * so'ralardi, holbuki odam hali nima taklif qilinayotganini
 * bilmaydi. Endi oxirgi panelgacha faqat «Davom etish», qaror esa
 * oxirida.
 *
 * ── «O'TKAZIB YUBORISH» KIRISHGA EMAS, OXIRGI PANELGA ───────────
 *
 * Ilgari u to'g'ridan-to'g'ri kirish ekraniga tashlardi — ya'ni
 * «o'tkazib yuborish» aslida «ro'yxatdan o'tishga majburlash»
 * edi. Endi u oxirgi panelga sakraydi: u yerda uchala yo'l ham
 * ochiq, «avval ko'rib chiqaman» ham bor.
 *
 * ── ILLYUSTRATSIYALAR ───────────────────────────────────────────
 *
 * ⚠️ Hozir uchala panelda ham BITTA rasm turibdi. 2 va 3-panel
 * uchun o'z rasmi kerak (reys kuzatuvi, hujjat va pul) — kelganda
 * `PANELS` dagi `img` almashtiriladi, boshqa hech narsa emas.
 */
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { setGuest } from "@/lib/guest";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const GLOBUS = require("../../assets/images/onboarding-globus.png");

/* Matnlar lug'atda (`mob.intro.*`) — bu yerda faqat tartib va
   kalitlar. Sakkiz til kod ichida yozilsa, ular ajralib ketardi. */
const PANELS = [
  { title: "mob.intro.t1", body: "mob.intro.b1", img: GLOBUS },
  { title: "mob.intro.t2", body: "mob.intro.b2", img: GLOBUS },
  { title: "mob.intro.t3", body: "mob.intro.b3", img: GLOBUS },
] as const;

const LAST = PANELS.length - 1;

export default function Tanishtiruv() {
  const [i, setI] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const panel = PANELS[i];
  const end = i === LAST;

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }]}>
      <View style={s.top}>
        <Logo width={112} />
        {!end && (
          <Pressable onPress={() => setI(LAST)} hitSlop={12}>
            <Text style={s.skip}>{t("mob.intro.skip")}</Text>
          </Pressable>
        )}
      </View>

      {/* Rasm bosilsa ham oldinga o'tadi: telefonni bir qo'lda
          ushlagan odam pastdagi tugmaga har safar cho'zilmasin */}
      <Pressable style={s.body} onPress={() => !end && setI(i + 1)}>
        <View style={s.art}>
          <Image source={panel.img} style={s.img} resizeMode="contain" />
        </View>

        <Text style={s.title}>{t(panel.title)}</Text>
        <Text style={s.text}>{t(panel.body)}</Text>

        <View style={s.dots}>
          {PANELS.map((_, k) => (
            <View key={k} style={[s.dot, k === i && s.dotOn]} />
          ))}
        </View>
      </Pressable>

      <View style={s.footer}>
        {end ? (
          <>
            <Button title={t("mob.intro.signUp")} onPress={() => router.push("/royxat")} />
            <Button
              title={t("mob.intro.signIn")}
              variant="secondary"
              onPress={() => router.push("/kirish")}
            />

            {/* AVVAL KO'RIB CHIQISH — web'da shunday, ilovada yo'q
                edi. Odam nima borligini bilmasdan turib telefon
                raqamini bermaydi; ro'yxatdan o'tishni birinchi
                eshik qilib qo'ysak ko'pchilik shu yerda to'xtaydi. */}
            <Pressable
              style={s.look}
              hitSlop={8}
              onPress={async () => {
                await setGuest(true);
                router.replace("/yuklar");
              }}
            >
              <Text style={s.lookText}>{t("mob.intro.lookFirst")}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [s.next, pressed && { backgroundColor: color.brandHover }]}
            onPress={() => setI(i + 1)}
          >
            <Text style={s.nextText}>{t("mob.common.continueBtn")}</Text>
            <Icon name="arrow-right" size={19} stroke="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    minHeight: 44,
  },
  skip: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },

  body: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  /* Rasm balandligi FOIZDA: kichik telefonlarda (SE) sarlavhani
     ekrandan itarib chiqarmasin */
  art: { height: "48%", alignItems: "center", justifyContent: "center", marginBottom: 30 },
  img: { width: "100%", height: "100%" },

  /* Matn chapga tekislangan: sarlavha ruschada uch qatorga
     cho'zilganda markazlangan matn «zinapoya» bo'lib ko'rinadi */
  title: {
    fontSize: font.display,
    fontWeight: "700",
    color: color.foreground,
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  text: {
    fontSize: font.body,
    color: color.mutedForeground,
    marginTop: 12,
    lineHeight: 23,
  },

  dots: { flexDirection: "row", gap: 7, marginTop: 26 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.border },
  dotOn: { width: 24, backgroundColor: color.brand },

  footer: { paddingHorizontal: space.xl, gap: 10 },
  next: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.brand,
  },
  nextText: { fontSize: font.bodyLg, fontWeight: "700", color: "#fff" },

  look: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16, marginTop: 2 },
  lookText: { fontSize: 14.5, fontWeight: "600", color: color.mutedForeground },
});
