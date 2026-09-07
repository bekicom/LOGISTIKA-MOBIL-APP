/**
 * Haydovchi anketasi.
 *
 * ── REZYUMEDAN FARQI ────────────────────────────────────────────
 *
 * `rezyume` — ISH QIDIRISH uchun: tajriba, kutilayotgan maosh,
 * yo'nalish. Bu esa HUJJATLI profil: pasport, prava, toifalar,
 * muddat. Ikkalasi bir odamda ham bo'ladi va ular boshqa-boshqa
 * joyda ishlatiladi — mashina egasi haydovchini biriktirishdan
 * oldin aynan shu yerga qaraydi.
 *
 * ── HUJJAT RASMI QAYTIB KELMAYDI ────────────────────────────────
 *
 * Server pasport va prava suratini «bor / yo'q» deb aytadi,
 * faylning o'zini bermaydi: u shaxsiy hujjat. Shuning uchun
 * ekranda ham faqat belgi turadi. Yangisi yuborilsa eskisi
 * almashadi, hech narsa yuborilmasa eskisi joyida qoladi.
 *
 * ── ROL YO'Q BO'LSA FORMA OCHILMAYDI ────────────────────────────
 *
 * Server `PUT` da rolni tekshiradi. Buni oldindan aytamiz
 * (5-qoida): odam butun anketani to'ldirib, oxirida «siz
 * haydovchi emassiz» degan xabarni ko'rmasin.
 */
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { apiUpload, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { pickDocument, toUpload, type Photo } from "@/lib/photo";
import { LOCALE_INFO, t, type Locale } from "@/lib/i18n";
import { color, radius, space } from "@/lib/theme";

/** `driver-link.ts` dagi `LICENSE_CLASSES` */
const CLASSES = ["B", "C", "CE", "D", "DE", "BE"] as const;
/** `dispatcher.ts` dagi `WORK_COUNTRIES` — server boshqasini rad etadi */
const COUNTRIES = [
  "UZ", "RU", "KZ", "KG", "TJ", "TM", "TR", "CN",
  "AF", "IR", "AZ", "BY", "GE", "UA", "PL", "DE",
] as const;
/** `dispatcher.ts` dagi `LANGUAGES` — ro'yxatda `ky` YO'Q */
const LANGS = ["uz", "ru", "en", "tr", "kk", "tg", "zh"] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Profile = {
  birthDate: string | null;
  region: string | null;
  passportNo: string | null;
  licenseNo: string | null;
  licenseUntil: string | null;
  licenseClasses: string[];
  experienceY: number | null;
  countries: string[];
  vehicleTypes: number[];
  languages: string[];
  certificates: string | null;
  about: string | null;
  hasPassport: boolean;
  hasLicense: boolean;
};
type VehicleType = { id: number; key: string; name: string };

const d10 = (v: string | null) => (v ? v.slice(0, 10) : "");

export default function HaydovchiAnketa() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const me = useApi<{ canEdit: boolean; profile: Profile | null }>("/api/driver-profile");
  const types = useApi<{ items: VehicleType[] }>("/api/vehicle-types");

  const [birth, setBirth] = useState("");
  const [region, setRegion] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseUntil, setLicenseUntil] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [exp, setExp] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [vtypes, setVtypes] = useState<number[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [certs, setCerts] = useState("");
  const [about, setAbout] = useState("");
  const [passportFile, setPassportFile] = useState<Photo | null>(null);
  const [licenseFile, setLicenseFile] = useState<Photo | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /* Boshlang'ich qiymatlar BIR MARTA — keyingi javoblar odam
     yozayotgan matnni ustidan bosib ketmasin */
  const p = me.data?.profile ?? null;
  useEffect(() => {
    if (!p) return;
    setBirth(d10(p.birthDate));
    setRegion(p.region ?? "");
    setPassportNo(p.passportNo ?? "");
    setLicenseNo(p.licenseNo ?? "");
    setLicenseUntil(d10(p.licenseUntil));
    setClasses(p.licenseClasses);
    setExp(p.experienceY != null ? String(p.experienceY) : "");
    setCountries(p.countries);
    setVtypes(p.vehicleTypes);
    setLangs(p.languages);
    setCerts(p.certificates ?? "");
    setAbout(p.about ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const badDate = (!!birth && !DATE.test(birth)) || (!!licenseUntil && !DATE.test(licenseUntil));

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      await apiUpload(
        "/api/driver-profile",
        {
          birthDate: DATE.test(birth) ? birth : "",
          region: region.trim(),
          passportNo: passportNo.trim(),
          licenseNo: licenseNo.trim(),
          licenseUntil: DATE.test(licenseUntil) ? licenseUntil : "",
          licenseClasses: classes.join(","),
          experienceY: exp.trim(),
          countries: countries.join(","),
          vehicleTypes: vtypes.join(","),
          languages: langs.join(","),
          certificates: certs.trim(),
          about: about.trim(),
        },
        [
          ...(passportFile ? [toUpload(passportFile, "passportFile")] : []),
          ...(licenseFile ? [toUpload(licenseFile, "licenseFile")] : []),
        ],
        "PUT",
      );
      setDone(true);
      router.back();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.dform.title")} subtitle={t("mob.dform.sub")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {me.loading ? <Skeleton rows={4} /> : null}
        {me.error ? <ErrorBox message={me.error} onRetry={me.reload} /> : null}

        {me.data && !me.data.canEdit ? (
          <Notice tone="warning" title={t("mob.dform.needRole")}>
            {t("mob.dform.needRoleBody")}
          </Notice>
        ) : null}

        {me.data ? (
          <View style={{ gap: space.md }}>
            <Field
              label={t("mob.dform.birth")}
              placeholder="1990-05-14"
              value={birth}
              onChangeText={setBirth}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Field
              label={t("mob.dform.region")}
              value={region}
              onChangeText={setRegion}
              maxLength={80}
            />

            <Field
              label={t("mob.dform.passportNo")}
              value={passportNo}
              onChangeText={setPassportNo}
              autoCapitalize="characters"
              maxLength={40}
            />
            <FilePick
              label={t("mob.dform.passportFile")}
              has={!!p?.hasPassport}
              picked={passportFile}
              onPick={async () => setPassportFile((await pickDocument()) ?? null)}
            />

            <Field
              label={t("mob.dform.licenseNo")}
              value={licenseNo}
              onChangeText={setLicenseNo}
              autoCapitalize="characters"
              maxLength={40}
            />
            <Field
              label={t("mob.dform.licenseUntil")}
              placeholder="2030-01-01"
              value={licenseUntil}
              onChangeText={setLicenseUntil}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <FilePick
              label={t("mob.dform.licenseFile")}
              has={!!p?.hasLicense}
              picked={licenseFile}
              onPick={async () => setLicenseFile((await pickDocument()) ?? null)}
            />

            <View>
              <Text style={s.label}>{t("mob.dform.classes")}</Text>
              <View style={s.chips}>
                {CLASSES.map((c) => (
                  <Chip
                    key={c}
                    on={classes.includes(c)}
                    label={c}
                    onPress={() => toggle(classes, c, setClasses)}
                  />
                ))}
              </View>
            </View>

            <Field
              label={t("mob.dform.experience")}
              value={exp}
              onChangeText={setExp}
              keyboardType="number-pad"
              maxLength={2}
            />

            <View>
              <Text style={s.label}>{t("mob.dform.countries")}</Text>
              <View style={s.chips}>
                {COUNTRIES.map((c) => (
                  <Chip
                    key={c}
                    on={countries.includes(c)}
                    label={t(`jobCatalog.countries.${c}`)}
                    onPress={() => toggle(countries, c, setCountries)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={s.label}>{t("mob.dform.vehicleTypes")}</Text>
              <View style={s.chips}>
                {(types.data?.items ?? []).map((v) => (
                  <Chip
                    key={v.id}
                    on={vtypes.includes(v.id)}
                    label={v.name}
                    onPress={() => toggle(vtypes, v.id, setVtypes)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={s.label}>{t("mob.dform.languages")}</Text>
              <View style={s.chips}>
                {LANGS.map((l) => (
                  <Chip
                    key={l}
                    on={langs.includes(l)}
                    /* Til nomi O'Z YOZUVIDA — «Ruscha» deb yozsak,
                       ruscha bilmaydigan odam uni topa olardi-yu,
                       ruschani izlayotgan odam esa yo'q */
                    label={LOCALE_INFO[l as Locale].native}
                    onPress={() => toggle(langs, l, setLangs)}
                  />
                ))}
              </View>
            </View>

            <Field
              label={t("mob.dform.certificates")}
              hint={t("mob.dform.certificatesHint")}
              value={certs}
              onChangeText={setCerts}
              multiline
              style={s.area}
              maxLength={500}
            />
            <Field
              label={t("mob.dform.about")}
              value={about}
              onChangeText={setAbout}
              multiline
              style={s.area}
              maxLength={1000}
            />
          </View>
        ) : null}

        {badDate ? <Text style={s.err}>{t("mob.vdoc.badDate")}</Text> : null}
        {err ? <Text style={s.err}>{err}</Text> : null}

        {me.data?.canEdit ? (
          <View style={{ marginTop: space.lg }}>
            <Button
              title={done ? t("mob.common.saved") : t("mob.common.save")}
              loading={saving}
              disabled={badDate}
              onPress={save}
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityRole="button">
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Hujjat fayli: bori belgi bilan, yangisi tanlangani nomi bilan */
function FilePick({
  label,
  has,
  picked,
  onPick,
}: {
  label: string;
  has: boolean;
  picked: Photo | null;
  onPick: () => void;
}) {
  return (
    <Pressable onPress={onPick} style={s.file} accessibilityRole="button">
      <Icon name={picked || has ? "check" : "paperclip"} size={18} stroke={picked || has ? color.success : color.brand} />
      <View style={{ flex: 1 }}>
        <Text style={s.fileLabel}>{label}</Text>
        <Text style={s.fileState}>
          {picked ? picked.name : has ? t("mob.dform.fileHas") : t("mob.dform.fileNone")}
        </Text>
      </View>
      <Icon name="chevron" size={16} stroke={color.mutedForeground} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },

  label: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, marginBottom: 9 },
  area: { minHeight: 84, textAlignVertical: "top" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: color.card,
  },
  chipOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  chipText: { fontSize: 12.5, fontWeight: "600", color: color.mutedForeground },
  chipTextOn: { color: color.brand, fontWeight: "800" },

  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: color.card,
  },
  fileLabel: { fontSize: 13, fontWeight: "700", color: color.foreground },
  fileState: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2 },

  err: { fontSize: 12.5, color: color.danger, marginTop: space.md },
});
