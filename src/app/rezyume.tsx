/**
 * Rezyume — ish qidirayotgan haydovchi uchun.
 *
 * NEGA KERAK: «Panelim»dagi «Ish qidiryapman» kaliti `Resume.isActive`
 * ga tegadi, rezyume esa ilovada umuman tuzilmasdi — tugma bosilsa
 * hech qayerga olib bormasdi (o'sha ekranni yozganda men qoldirgan
 * bo'shliq).
 *
 * WEB'DAGI FORMANING QISQARTIRILGANI. Web'da 14 ta maydon bor;
 * telefonda ularning hammasi bir ekranga siqilsa, odam yarmida
 * tashlab ketadi. Bu yerda ish beruvchi TANLOV QILADIGAN beshtasi
 * qoldi: tajriba, toifalar, davlatlar, kutilgan haq va o'zi haqida.
 * Qolganini web'da to'ldirish mumkin va ular BUZILMAYDI — server
 * yuborilmagan maydonni eskisicha qoldirmaydi, shuning uchun
 * mavjud qiymatlar formaga yuklab olinadi va qaytariladi.
 */
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Resume = {
  direction: string;
  professions: string[];
  vehicleKinds: string[];
  title: string | null;
  about: string | null;
  experienceY: number | null;
  licenseClasses: string[];
  countries: string[];
  docs: string[];
  payFrom: number | null;
  payCurrency: string | null;
  schedule: string | null;
  locationId: number | null;
  phone: string | null;
  isPublic: boolean;
  isActive: boolean;
};

/** `driver-link.ts` dagi LICENSE_CLASSES */
const CLASSES = ["B", "C", "CE", "D", "DE"] as const;
/** Eng ko'p ishlatiladigan yo'nalishlar — `jobCatalog.countries` dan */
const COUNTRIES = ["UZ", "KZ", "RU", "KG", "TJ", "TM", "TR", "CN"] as const;

export default function Rezyume() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, reload } = useApi<{ resume: Resume | null }>("/api/jobs/resume");

  const [exp, setExp] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [pay, setPay] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* Bor rezyume formaga yuklanadi. Busiz saqlash eski qiymatlarni
     bo'sh bilan almashtirib yuborardi — `saveResume` butun yozuvni
     qayta yozadi. */
  useEffect(() => {
    const r = data?.resume;
    if (!r) return;
    setExp(r.experienceY != null ? String(r.experienceY) : "");
    setClasses(r.licenseClasses);
    setCountries(r.countries);
    setPay(r.payFrom != null ? String(r.payFrom) : "");
    setAbout(r.about ?? "");
  }, [data]);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function save() {
    setErr(null);
    setBusy(true);
    const r = data?.resume;
    try {
      await api("/api/jobs", {
        method: "POST",
        body: {
          action: "resume",
          // Web'da to'ldirilgani buzilmasin — eskisi qaytariladi
          direction: r?.direction ?? "DRIVER",
          professions: r?.professions ?? [],
          vehicleKinds: r?.vehicleKinds ?? [],
          title: r?.title ?? null,
          docs: r?.docs ?? [],
          schedule: r?.schedule ?? null,
          locationId: r?.locationId ?? null,
          phone: r?.phone ?? null,
          isPublic: r?.isPublic ?? true,
          payCurrency: r?.payCurrency ?? "USD",

          // Shu ekranda tahrirlanadigan beshtasi
          experienceY: exp ? Number(exp) : null,
          licenseClasses: classes,
          countries,
          payFrom: pay ? Number(pay.replace(/\s/g, "")) : null,
          about: about.trim() || null,
        },
      });
      router.back();
    } catch (e) {
      setErr((e as FuramError).message);
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.resume.title")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.resume.title")}
        subtitle={data?.resume ? t("mob.resume.editing") : t("mob.resume.creating")}
      />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        <Text style={s.lead}>{t("mob.resume.lead")}</Text>

        <View style={s.card}>
          <Field
            label={t("mob.resume.exp")}
            value={exp}
            onChangeText={setExp}
            keyboardType="number-pad"
            placeholder="8"
          />

          <View>
            <Text style={s.label}>{t("mob.resume.classes")}</Text>
            <View style={s.chips}>
              {CLASSES.map((c) => {
                const on = classes.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => setClasses((l) => toggle(l, c))}
                    style={[s.chip, on && s.chipOn]}
                    accessibilityRole="button"
                  >
                    <Text style={[s.chipText, on && { color: "#fff" }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={s.label}>{t("mob.resume.countries")}</Text>
            <View style={s.chips}>
              {COUNTRIES.map((c) => {
                const on = countries.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCountries((l) => toggle(l, c))}
                    style={[s.chipWide, on && s.chipOn]}
                    accessibilityRole="button"
                  >
                    <Text style={[s.chipText, on && { color: "#fff" }]}>
                      {t(`jobCatalog.countries.${c}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field
            label={t("mob.resume.pay")}
            hint={t("mob.resume.payHint")}
            value={pay}
            onChangeText={setPay}
            keyboardType="number-pad"
            placeholder="1200"
          />

          <Field
            label={t("mob.resume.about")}
            value={about}
            onChangeText={setAbout}
            multiline
            placeholder={t("mob.resume.aboutPh")}
          />
        </View>

        {/* Web'da to'ldirilgani buzilmasligi OLDINDAN aytiladi */}
        <View style={s.note}>
          <Text style={s.noteText}>{t("mob.resume.webNote")}</Text>
        </View>

        {err ? <ErrorBox message={err} /> : null}

        <Button title={t("mob.resume.save")} loading={busy} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: font.body, color: "#475569", lineHeight: 22 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.lg,
    gap: 16,
  },
  label: { fontSize: 12, color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 38,
    minWidth: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipWide: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: color.navy, borderColor: color.navy },
  chipText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },

  note: {
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  noteText: { fontSize: 12, color: "#475569", lineHeight: 19 },
});
