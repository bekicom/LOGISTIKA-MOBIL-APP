/**
 * Dispetcher anketasi.
 *
 * ── TAHRIR TASDIQNI BEKOR QILADI ────────────────────────────────
 *
 * Server har saqlashda `isApproved` ni `false` ga qaytaradi:
 * tasdiqlangan profilni keyin xohlagancha o'zgartirib bo'lmaydi.
 * Bu ekranda OLDINDAN aytiladi (5-qoida) — aks holda odam bir
 * so'zni tuzatib, ro'yxatdan tushib qolganini keyin bilardi.
 *
 * ── RAD SABABI TARJIMA QILINMAYDI ───────────────────────────────
 *
 * `rejectNote` — admin qo'lda yozgan matn, kalit emas. U qaysi
 * tilda yozilgan bo'lsa shundayligicha ko'rsatiladi: mazmunini
 * o'zgartirib yuborgandan ko'ra, o'zgacha tilda bo'lgani yaxshi.
 *
 * ── ROL YO'Q BO'LSA FORMA OCHILMAYDI ────────────────────────────
 *
 * Server `PUT` da rolni tekshiradi va biz buni oldindan aytamiz.
 */
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { LOCALE_INFO, t, type Locale } from "@/lib/i18n";
import { color, space, themed } from "@/lib/theme";

/** `dispatcher.ts` dagi `WORK_COUNTRIES` */
const COUNTRIES = [
  "UZ", "RU", "KZ", "KG", "TJ", "TM", "TR", "CN",
  "AF", "IR", "AZ", "BY", "GE", "UA", "PL", "DE",
] as const;
/** `dispatcher.ts` dagi `LANGUAGES` — ro'yxatda `ky` YO'Q */
const LANGS = ["uz", "ru", "en", "tr", "kk", "tg", "zh"] as const;
/** `dispatcher.ts` dagi `FEE_MODES` */
const FEES = ["FIXED", "PERCENT", "NEGOTIABLE"] as const;

type Profile = {
  city: string | null;
  countries: string[];
  routes: string | null;
  vehicleTypes: number[];
  experienceY: number | null;
  languages: string[];
  serviceKind: string | null;
  feeMode: string | null;
  about: string | null;
  isApproved: boolean;
  rejectNote: string | null;
};
type VehicleType = { id: number; key: string; name: string };

export default function DispetcherAnketa() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const me = useApi<{ profile: Profile | null }>("/api/dispatcher-profile");
  const types = useApi<{ items: VehicleType[] }>("/api/vehicle-types");

  const [city, setCity] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [routes, setRoutes] = useState("");
  const [vtypes, setVtypes] = useState<number[]>([]);
  const [exp, setExp] = useState("");
  const [langs, setLangs] = useState<string[]>([]);
  const [serviceKind, setServiceKind] = useState("");
  const [feeMode, setFeeMode] = useState<string | null>(null);
  const [about, setAbout] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const p = me.data?.profile ?? null;
  useEffect(() => {
    if (!p) return;
    setCity(p.city ?? "");
    setCountries(p.countries);
    setRoutes(p.routes ?? "");
    setVtypes(p.vehicleTypes);
    setExp(p.experienceY != null ? String(p.experienceY) : "");
    setLangs(p.languages);
    setServiceKind(p.serviceKind ?? "");
    setFeeMode(p.feeMode);
    setAbout(p.about ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  const canEdit = user?.role === "DISPATCHER";

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      await api("/api/dispatcher-profile", {
        method: "PUT",
        body: {
          city: city.trim(),
          countries,
          routes: routes.trim(),
          vehicleTypes: vtypes,
          experienceY: exp.trim() ? Number(exp) : null,
          languages: langs,
          serviceKind: serviceKind.trim(),
          feeMode: feeMode ?? undefined,
          about: about.trim(),
        },
      });
      router.back();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.pform.title")} subtitle={t("mob.pform.sub")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {me.loading ? <Skeleton rows={4} /> : null}
        {me.error ? <ErrorBox message={me.error} onRetry={me.reload} /> : null}

        {me.data && !canEdit ? (
          <Notice tone="warning" title={t("mob.pform.needRole")}>
            {t("mob.pform.needRoleBody")}
          </Notice>
        ) : null}

        {/* Holat: tasdiqlangan / kutilmoqda / rad etilgan */}
        {p ? (
          <View style={{ marginBottom: space.md }}>
            {p.isApproved ? (
              <Notice title={t("mob.pform.approved")}>{t("mob.pform.approvedBody")}</Notice>
            ) : p.rejectNote ? (
              <Notice tone="danger" title={t("mob.pform.rejected")}>
                {p.rejectNote}
              </Notice>
            ) : (
              <Notice tone="warning" title={t("mob.pform.pending")}>
                {t("mob.pform.pendingBody")}
              </Notice>
            )}
          </View>
        ) : null}

        {me.data ? (
          <View style={{ gap: space.md }}>
            <Field label={t("mob.pform.city")} value={city} onChangeText={setCity} maxLength={60} />

            <View>
              <Text style={s.label}>{t("mob.pform.countries")}</Text>
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

            <Field
              label={t("mob.pform.routes")}
              hint={t("mob.pform.routesHint")}
              placeholder={t("mob.pform.routesPh")}
              value={routes}
              onChangeText={setRoutes}
              multiline
              style={s.area}
              maxLength={500}
            />

            <View>
              <Text style={s.label}>{t("mob.pform.vehicleTypes")}</Text>
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

            <Field
              label={t("mob.pform.experience")}
              value={exp}
              onChangeText={setExp}
              keyboardType="number-pad"
              maxLength={2}
            />

            <View>
              <Text style={s.label}>{t("mob.pform.languages")}</Text>
              <View style={s.chips}>
                {LANGS.map((l) => (
                  <Chip
                    key={l}
                    on={langs.includes(l)}
                    label={LOCALE_INFO[l as Locale].native}
                    onPress={() => toggle(langs, l, setLangs)}
                  />
                ))}
              </View>
            </View>

            <Field
              label={t("mob.pform.serviceKind")}
              hint={t("mob.pform.serviceKindHint")}
              value={serviceKind}
              onChangeText={setServiceKind}
              multiline
              style={s.area}
              maxLength={300}
            />

            <View>
              <Text style={s.label}>{t("mob.pform.feeMode")}</Text>
              <View style={s.chips}>
                {FEES.map((f) => (
                  <Chip
                    key={f}
                    on={feeMode === f}
                    label={t(`mob.feeMode.${f}`)}
                    onPress={() => setFeeMode(feeMode === f ? null : f)}
                  />
                ))}
              </View>
            </View>

            <Field
              label={t("mob.pform.about")}
              value={about}
              onChangeText={setAbout}
              multiline
              style={s.area}
              maxLength={1000}
            />
          </View>
        ) : null}

        {err ? <Text style={s.err}>{err}</Text> : null}

        {canEdit ? (
          <View style={{ marginTop: space.lg, gap: 9 }}>
            {/* Tahrir tasdiqni bekor qiladi — saqlashdan OLDIN */}
            {p?.isApproved ? (
              <Notice tone="warning">{t("mob.pform.resetWarn")}</Notice>
            ) : null}
            <Button title={t("mob.common.save")} loading={saving} onPress={save} />
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

const s = themed(() => ({
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

  err: { fontSize: 12.5, color: color.danger, marginTop: space.md },
}));
