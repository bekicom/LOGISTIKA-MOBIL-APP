/**
 * Rol tanlash — ro'yxatdan o'tish, Google/Apple ro'yxati va «Men kimman?»
 * uchun BITTA komponent (TZ-04, 2026-09-19).
 *
 * Ilgari uch ekranda uch nusxa turardi (4 ta eski rol, chalkash
 * haydovchi izohi bilan) va biri o'zgarganda qolganlari eskirib
 * qolardi. Endi ro'yxat `lib/rollar.ts` dan, matnlar lug'atdan:
 * nomi `mob.role.*`, izohi `mob.roleHint.*` / `rolTanlash.*`, guruh
 * sarlavhasi `roleGroup.*`.
 *
 * Ikki ko'rinish: `surface` — oddiy fon (kartochka rangida),
 * `onBrand` — `rol.tsx` dagi ko'k fon (oq kartochkalar).
 */
import { memo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Tap } from "@/components/Tap";
import { ROL_GURUHLARI, ROL_IKONKA, rolIzohKaliti, type RolGuruh, type RoyxatRol } from "@/lib/rollar";
import { color, font, radius, space, themed } from "@/lib/theme";
import { roleLabel, t } from "@/lib/i18n";

type Tone = "surface" | "onBrand";

/**
 * Guruh rangi — rol belgisi fonida. Rang ma'no beradi: bir guruh — bir oila.
 *
 * FUNKSIYA, o'zgarmas emas: `color` mavzu almashganda yangilanadi, modul
 * yuklanganda o'qib olingan qiymat esa yorug' mavzuda qotib qolardi.
 *
 * Fon — rangning SHAFFOF qatlami (`…1f`), mavzuning «soft» rangi emas:
 * `rol.tsx` dagi oq kartochkada qorong'i mavzuning soft ranglari to'q
 * kvadrat bo'lib chiqardi. Shaffof qatlam oq ustida ham, to'q ustida
 * ham bir xil o'qiladi.
 */
function rangi(g: RolGuruh): { tint: string; bg: string } {
  const tint =
    g === "cargo" ? color.blue : g === "transport" ? color.brand : g === "service" ? color.success : g === "work" ? color.warning : color.purple;
  return { tint, bg: `${tint}1f` };
}

/** «Siz kimsiz?» ning 4 ta katta kartasi (TZ v2 §2.2) */
const ASOSIY_ROLLAR: readonly RoyxatRol[] = ["DRIVER", "VEHICLE_OWNER", "CARGO_OWNER", "DISPATCHER"];

export function RolePicker({
  value,
  onChange,
  tone = "surface",
  faqat,
  qoshimcha,
}: {
  value: RoyxatRol | null;
  onChange: (r: RoyxatRol) => void;
  tone?: Tone;
  /** Faqat shu rollar ko'rsatiladi («Men kimman?» da — hali olinmaganlari).
      Bo'sh qolgan guruh sarlavhasi chizilmaydi. */
  faqat?: readonly RoyxatRol[];
  /** Rol ostida qo'shimcha qator (masalan Android'da narx) */
  qoshimcha?: Partial<Record<RoyxatRol, string>>;
}) {
  const [boshqa, setBoshqa] = useState(false);
  /* ── «SIZ KIMSIZ?» — 4 TA KATTA KARTA (TZ v2 §2.2, 2026-10-27) ──
     Ro'yxatdan o'tishda (`faqat` berilmagan) avval 4 ta asosiy rol,
     qolganlari «Boshqa rollar» ostida — web bilan bir xil
     (`furam/src/components/auth/rol-tanlash.tsx`). Tanlangan rol
     boshqalardan bo'lsa ro'yxat ochiq turadi. */
  const asosiyRejim = !faqat;
  const ochiq = !asosiyRejim || boshqa || (value != null && !ASOSIY_ROLLAR.includes(value));
  const guruhlar = (
    faqat
      ? ROL_GURUHLARI.map((g) => ({ ...g, rollar: g.rollar.filter((r) => faqat.includes(r)) }))
      : ROL_GURUHLARI.map((g) => ({ ...g, rollar: g.rollar.filter((r) => !ASOSIY_ROLLAR.includes(r)) }))
  ).filter((g) => g.rollar.length > 0);
  const guruhOf = (r: RoyxatRol) => ROL_GURUHLARI.find((g) => g.rollar.includes(r))?.guruh ?? "other";
  return (
    <View style={s.root} accessibilityRole="radiogroup">
      {asosiyRejim ? (
        <View style={s.group}>
          <Text style={[s.groupLabel, tone === "onBrand" && s.groupLabelOnBrand]}>{t("rolTanlash.savol")}</Text>
          {ASOSIY_ROLLAR.map((r) => (
            <RolKarta key={r} rol={r} guruh={guruhOf(r)} on={value === r} tone={tone} qator={qoshimcha?.[r]} onPress={onChange} />
          ))}
          <Tap onPress={() => setBoshqa((x) => !x)} hitSlop={8} accessibilityRole="button">
            <Text style={[s.change, { paddingVertical: 6 }]}>
              {ochiq ? t("rolTanlash.yopish") : `${t("rolTanlash.boshqa")} (${ROL_GURUHLARI.flatMap((g) => g.rollar).filter((r) => !ASOSIY_ROLLAR.includes(r)).length})`}
            </Text>
          </Tap>
        </View>
      ) : null}
      {ochiq && guruhlar.map((g) => (
        <View key={g.guruh} style={s.group}>
          <Text style={[s.groupLabel, tone === "onBrand" && s.groupLabelOnBrand]}>
            {t(`roleGroup.${g.guruh}`)}
          </Text>
          {g.rollar.map((r) => (
            <RolKarta
              key={r}
              rol={r}
              guruh={g.guruh}
              on={value === r}
              tone={tone}
              qator={qoshimcha?.[r]}
              onPress={onChange}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Oldingi ekranda tanlangan rol — ro'yxat o'rniga BITTA kartochka.
 *
 * Odam rolni `rol.tsx` da allaqachon tanlagan: 11 ta kartochkani
 * qayta ko'rsatish uni ikkinchi marta tanlashga majburlardi. Fikri
 * o'zgarsa — «Boshqa rol».
 */
export function RolTanlangan({
  rol,
  onChange,
  qator,
}: {
  rol: RoyxatRol;
  onChange: () => void;
  /** Qo'shimcha qator (Android'da narx) — ro'yxatdagi kartochka bilan bir xil */
  qator?: string;
}) {
  const guruh = ROL_GURUHLARI.find((g) => g.rollar.includes(rol))?.guruh ?? "other";
  const rang = rangi(guruh);
  return (
    <View style={[s.card, s.cardOn]}>
      <View style={[s.icon, { backgroundColor: rang.tint }]}>
        <Icon name={ROL_IKONKA[rol]} size={20} stroke="#ffffff" />
      </View>
      <View style={s.body}>
        <Text style={s.name}>{roleLabel(rol)}</Text>
        <Text style={s.hint} numberOfLines={2}>
          {t(rolIzohKaliti(rol))}
        </Text>
        {qator ? <Text style={s.extra}>{qator}</Text> : null}
      </View>
      <Tap onPress={onChange} hitSlop={8} accessibilityRole="button">
        <Text style={s.change}>{t("mob.signUp.otherRole")}</Text>
      </Tap>
    </View>
  );
}

/* Kartochka alohida va `memo` — tanlov o'zgarganda faqat ikkita
   kartochka (eski va yangi) qayta chiziladi, o'n bittasi emas */
const RolKarta = memo(function RolKarta({
  rol,
  guruh,
  on,
  tone,
  qator,
  onPress,
}: {
  rol: RoyxatRol;
  guruh: RolGuruh;
  on: boolean;
  tone: Tone;
  qator?: string;
  onPress: (r: RoyxatRol) => void;
}) {
  const rang = rangi(guruh);
  const brand = tone === "onBrand";
  const nom = roleLabel(rol);
  const izoh = t(rolIzohKaliti(rol));
  return (
    <Tap
      onPress={() => onPress(rol)}
      feel="select"
      scale={0.985}
      accessibilityRole="radio"
      selected={on}
      accessibilityLabel={`${nom}. ${izoh}`}
      style={[s.card, brand && s.cardOnBrand, on && s.cardOn]}
    >
      <View style={[s.icon, { backgroundColor: on ? rang.tint : rang.bg }]}>
        <Icon name={ROL_IKONKA[rol]} size={20} stroke={on ? "#ffffff" : rang.tint} />
      </View>
      <View style={s.body}>
        <Text style={[s.name, brand && s.nameOnBrand]}>{nom}</Text>
        <Text style={[s.hint, brand && s.hintOnBrand]} numberOfLines={2}>
          {izoh}
        </Text>
        {qator ? <Text style={s.extra}>{qator}</Text> : null}
      </View>
      <View style={[s.radio, brand && s.radioOnBrand, on && s.radioOn]}>
        {on ? <Icon name="check" size={12} stroke="#ffffff" /> : null}
      </View>
    </Tap>
  );
});

const s = themed(() => ({
  root: { gap: space.lg },
  group: { gap: 8 },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: color.mutedForeground,
    marginLeft: 2,
  },
  groupLabelOnBrand: { color: "#ffffffb3" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  /* Ko'k fonda kartochka oq — mavzudan qat'i nazar, fon ham qat'iy */
  cardOnBrand: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  cardOn: { borderColor: color.brand },

  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  hint: { fontSize: 12.5, lineHeight: 17, color: color.mutedForeground, marginTop: 2 },
  extra: { fontSize: 12, fontWeight: "600", color: color.foreground, marginTop: 4 },
  /* Oq kartochkada matn doim qorong'i — qorong'i mavzuda ham (aks holda
     oq ustida oq yozuv bo'lardi) */
  nameOnBrand: { color: "#0f172a" },
  hintOnBrand: { color: "#475569" },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOnBrand: { borderColor: "#cbd5e1" },
  change: { fontSize: font.caption, fontWeight: "600", color: color.brandText },
  radioOn: { backgroundColor: color.brand, borderColor: color.brand },
}));
