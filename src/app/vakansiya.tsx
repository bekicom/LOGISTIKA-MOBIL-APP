/**
 * Vakansiya berish — «Haydovchi / xodim kerak» e'loni (2026-09-21).
 *
 * ── NEGA ──────────────────────────────────────────────────────
 *
 * UI ko'rigida topildi: «Joylash → Ish o'rni» ish beruvchi sahifasini
 * ochardi, lekin ilovada e'lon BERISHNING umuman yo'li yo'q edi —
 * sahifada faqat «Vakansiya bermagansiz» turardi. Webda shakl bor
 * (`furam/src/app/fleet/vacancies/vacancy-form.tsx`), qoida esa —
 * «webda nima bo'lsa mobilda ham».
 *
 * Maydonlar webdagi bilan bir xil va o'sha `POST /api/vacancies` ga
 * ketadi. Matnlar ham webniki (`pgFleetVacancies.*`, `jobCatalog.*`) —
 * ikki joyda ikki xil yozilmasin.
 *
 * ── FARQI ─────────────────────────────────────────────────────
 *
 * · Mashina o'rni faqat ASOSIY haydovchi uchun: ilovadagi park
 *   ro'yxati yordamchi haydovchini bermaydi. Bo'sh o'rin bo'lsa —
 *   webdagidek bittasi tanlanadi (birinchisi oldindan).
 * · «Qachondan» sanasi so'ralmaydi: ixtiyoriy, telefonda sana
 *   kiritish ko'p xato beradi; kerak bo'lsa izohga yoziladi.
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { TariffNotice } from "@/components/TariffNotice";
import { xabarcha } from "@/components/Xabarcha";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tariffBlocked } from "@/lib/features";
import { sumKiritish } from "@/lib/sum";
import { ISH_DAVLATLARI, TOIFALAR } from "@/lib/davlat-royxati";
import { KASBLAR, TOLOV_TURLARI, VAKANSIYA_VALYUTALARI, YONALISHLAR, type Yonalish } from "@/lib/kasblar";
import { jobProfessionLabel, t } from "@/lib/i18n";
import { color, radius, space, themed } from "@/lib/theme";

type Mashina = { id: string; plate: string; brand: string | null; driver: string | null };

export default function Vakansiya() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [yonalish, setYonalish] = useState<Yonalish>("DRIVER");
  const [kasb, setKasb] = useState<string | null>(null);
  const [lavozim, setLavozim] = useState("");
  /* Tanlanmagan bo'lsa — birinchi bo'sh o'rin (webdagidek) */
  const [mashinaId, setMashinaId] = useState<string | null>(null);
  const [qayerdan, setQayerdan] = useState<Loc | null>(null);
  const [qayerga, setQayerga] = useState<Loc | null>(null);
  const [joyTanlash, setJoyTanlash] = useState<"from" | "to" | null>(null);
  const [kelishiladi, setKelishiladi] = useState(true);
  const [summa, setSumma] = useState("");
  const [valyuta, setValyuta] = useState<string>("UZS");
  const [tolovTuri, setTolovTuri] = useState<string>("TRIP");
  const [staj, setStaj] = useState("");
  const [toifalar, setToifalar] = useState<string[]>([]);
  const [davlatlar, setDavlatlar] = useState<string[]>([]);
  const [izoh, setIzoh] = useState("");
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const haydovchi = yonalish === "DRIVER";

  /* Bo'sh o'rin — asosiy haydovchisi yo'q mashina (faqat haydovchi e'lonida) */
  const park = useApi<{ items: Mashina[] }>(haydovchi ? "/api/fleet/vehicles" : null, [haydovchi]);
  const boshlar = (park.data?.items ?? []).filter((m) => !m.driver);
  const tanlanganMashina = mashinaId ?? boshlar[0]?.id ?? null;

  const ozgartir = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function yubor() {
    if (band || tariffBlocked("vacancies")) return;
    setBand(true);
    setXato(null);
    try {
      const miqdor = Number(summa.replace(/\s/g, ""));
      await api("/api/vacancies", {
        method: "POST",
        body: {
          direction: yonalish,
          profession: kasb ?? undefined,
          title: lavozim.trim() || undefined,
          vehicleId: haydovchi ? (tanlanganMashina ?? undefined) : undefined,
          seat: "MAIN",
          fromLocationId: qayerdan?.id,
          toLocationId: qayerga?.id,
          isNegotiable: kelishiladi,
          payAmount: kelishiladi || !miqdor ? undefined : miqdor,
          payCurrency: valyuta,
          payKind: tolovTuri,
          minExperienceY: staj ? Number(staj) : undefined,
          licenseClasses: haydovchi ? toifalar : [],
          countries: davlatlar,
          note: izoh.trim() || undefined,
        },
      });
      xabarcha({ matn: t("mob.vac.posted") });
      router.back();
    } catch (e) {
      setXato((e as FuramError).message);
    } finally {
      setBand(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.vac.post")}
        /* Ikkala kalit ham ALOHIDA `t()` da — lug'at sinxroni `t(a ? "x" : "y")` ni ko'rmaydi */
        subtitle={haydovchi ? t("pgFleetVacancies.driverNeeded") : t("pgFleetVacancies.workerNeeded")}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <TariffNotice feature="vacancies" />

        {/* Yo'nalish — kasblar ro'yxati shunga bog'liq */}
        <View style={s.block}>
          <Text style={s.label}>{t("pgFleetVacancies.fDirection")}</Text>
          <View style={s.chips}>
            {YONALISHLAR.map((y) => (
              <Chip
                key={y}
                on={yonalish === y}
                label={t(`jobCatalog.directions.${y}`)}
                onPress={() => {
                  setYonalish(y);
                  /* Eski yo'nalishning kasbi qolib ketmasin */
                  setKasb(null);
                }}
              />
            ))}
          </View>
        </View>

        <View style={s.block}>
          <Text style={s.label}>{t("pgFleetVacancies.fProfession")}</Text>
          <View style={s.chips}>
            <Chip on={kasb === null} label={t("pgFleetVacancies.anyProfession")} onPress={() => setKasb(null)} />
            {KASBLAR[yonalish].map((k) => (
              <Chip key={k} on={kasb === k} label={jobProfessionLabel(k)} onPress={() => setKasb(k)} />
            ))}
          </View>
        </View>

        <Field
          label={t("pgFleetVacancies.fTitle")}
          hint={t("pgFleetVacancies.optional")}
          value={lavozim}
          onChangeText={setLavozim}
          placeholder={t("pgFleetVacancies.fTitlePh")}
          maxLength={120}
        />

        {haydovchi ? (
          <View style={s.block}>
            <Text style={s.label}>{t("pgFleetVacancies.fVehicle")}</Text>
            {park.data && boshlar.length === 0 ? (
              <Notice tone="info">{t("pgFleetVacancies.noSeatsHint")}</Notice>
            ) : (
              <View style={s.chips}>
                {boshlar.map((m) => (
                  <Chip
                    key={m.id}
                    on={tanlanganMashina === m.id}
                    label={[m.plate, m.brand].filter(Boolean).join(" · ")}
                    onPress={() => setMashinaId(m.id)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Odatiy yo'nalish — ixtiyoriy */}
        <View style={s.block}>
          <JoyQatori
            label={t("pgFleetVacancies.fFrom")}
            qiymat={qayerdan?.name ?? null}
            onPress={() => setJoyTanlash("from")}
            onClear={qayerdan ? () => setQayerdan(null) : undefined}
          />
          <JoyQatori
            label={t("pgFleetVacancies.fTo")}
            qiymat={qayerga?.name ?? null}
            onPress={() => setJoyTanlash("to")}
            onClear={qayerga ? () => setQayerga(null) : undefined}
          />
        </View>

        {/* To'lov */}
        <View style={s.block}>
          <Text style={s.label}>{t("pgFleetVacancies.fPay")}</Text>
          <View style={s.chips}>
            <Chip on={kelishiladi} label={t("pgFleetVacancies.negotiable")} onPress={() => setKelishiladi(true)} />
            <Chip on={!kelishiladi} label={t("mob.vac.fixedPay")} onPress={() => setKelishiladi(false)} />
          </View>
          {!kelishiladi ? (
            <>
              <Field
                value={summa}
                onChangeText={(v) => setSumma(sumKiritish(v))}
                keyboardType="number-pad"
                placeholder="2 500 000"
              />
              <View style={s.chips}>
                {VAKANSIYA_VALYUTALARI.map((v) => (
                  <Chip key={v} on={valyuta === v} label={v} onPress={() => setValyuta(v)} />
                ))}
              </View>
              <View style={s.chips}>
                {TOLOV_TURLARI.map((k) => (
                  <Chip key={k} on={tolovTuri === k} label={t(`jobCatalog.payKinds.${k}`)} onPress={() => setTolovTuri(k)} />
                ))}
              </View>
            </>
          ) : null}
        </View>

        <Field
          label={t("pgFleetVacancies.fMinExp")}
          hint={t("pgFleetVacancies.optional")}
          value={staj}
          onChangeText={(v) => setStaj(v.replace(/\D/g, "").slice(0, 2))}
          keyboardType="number-pad"
          placeholder="3"
        />

        {haydovchi ? (
          <View style={s.block}>
            <Text style={s.label}>{t("pgFleetVacancies.fLicense")}</Text>
            <View style={s.chips}>
              {TOIFALAR.map((c) => (
                <Chip key={c} on={toifalar.includes(c)} label={c} onPress={() => setToifalar((a) => ozgartir(a, c))} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.block}>
          <Text style={s.label}>{t("pgFleetVacancies.fCountries")}</Text>
          <View style={s.chips}>
            {ISH_DAVLATLARI.map((c) => (
              <Chip
                key={c}
                on={davlatlar.includes(c)}
                label={t(`jobCatalog.countries.${c}`)}
                onPress={() => setDavlatlar((a) => ozgartir(a, c))}
              />
            ))}
          </View>
        </View>

        <Field
          label={t("pgFleetVacancies.fNote")}
          hint={t("pgFleetVacancies.optional")}
          value={izoh}
          onChangeText={setIzoh}
          placeholder={t("pgFleetVacancies.fNotePh")}
          multiline
          maxLength={1000}
        />

        {xato ? <Notice tone="danger">{xato}</Notice> : null}

        <Button
          title={band ? t("pgFleetVacancies.posting") : t("pgFleetVacancies.postBtn")}
          loading={band}
          onPress={() => void yubor()}
        />
      </ScrollView>

      <LocationPicker
        open={joyTanlash !== null}
        title={joyTanlash === "from" ? t("pgFleetVacancies.fFrom") : t("pgFleetVacancies.fTo")}
        onClose={() => setJoyTanlash(null)}
        onPick={(l) => {
          if (joyTanlash === "from") setQayerdan(l);
          else setQayerga(l);
          setJoyTanlash(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Joy tanlash qatori: bo'sh bo'lsa «Ixtiyoriy», tanlangan bo'lsa ✕ bilan tozalanadi */
function JoyQatori({
  label,
  qiymat,
  onPress,
  onClear,
}: {
  label: string;
  qiymat: string | null;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={onPress} style={[s.pick, qiymat && s.pickOn]} accessibilityRole="button" accessibilityLabel={label}>
        <Icon name="map-pin" size={17} stroke={qiymat ? color.brand : color.iconFaint} />
        <Text style={[s.pickText, !qiymat && s.pickPlaceholder]} numberOfLines={1}>
          {qiymat ?? t("pgFleetVacancies.optional")}
        </Text>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("mob.common.close")}>
            <Icon name="close" size={16} stroke={color.mutedForeground} />
          </Pressable>
        ) : (
          <Icon name="chevron" size={16} stroke={color.iconFaint} />
        )}
      </Pressable>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  block: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  chipOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  chipText: { fontSize: 13.5, color: color.foreground },
  chipTextOn: { fontWeight: "700", color: color.brandText },
  pick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  pickOn: { borderColor: color.brand },
  pickText: { flex: 1, fontSize: 15, color: color.foreground },
  pickPlaceholder: { color: color.faintText },
}));
