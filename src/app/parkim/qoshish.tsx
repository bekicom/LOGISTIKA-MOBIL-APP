/**
 * D3 — transport qo'shish, 1-qadam.
 *
 * ── AVVAL TUR (TZ v3 §7, §15-13, 2026-10-27) ─────────────────────
 * Tekshiruv: «21 tur bitta ro'yxatda, hammasiga bir xil maydonlar; marka
 * va model qo'lda, yil — oddiy raqam». Endi birinchi ekran — 8 ta katta
 * tugma (Labo/Damas, Bongo/Porter, Isuzu, Tyagach, Samosval, Maxsus
 * texnika, Avtobus, Tirkama). Tanlangach forma shu turga moslashadi:
 * marka — shu turning ro'yxatidan qidiruv bilan («vo», «вольво» → Volvo),
 * model — markaning modellari, yil — ro'yxat, turga xos maydonlar tugma
 * bilan. Katalog web bilan BITTA (`lib/mashina-katalog.ts` — nusxa,
 * `test-tz3.ts` solishtiradi).
 *
 * Joy tugagan bo'lsa (2026-09-19) — forma boshida aytiladi va saqlash
 * to'xtaydi. Forma faqat park ekranidan emas, bosh sahifa va AI dan ham
 * ochiladi, shuning uchun o'zi ham so'raydi (`/api/fleet/seats`).
 */
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Button, Field, Header, Steps } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { ISH_DAVLATLARI } from "@/lib/davlat-royxati";
import { isoBayroq } from "@/lib/phone-codes";
import { TariffNotice } from "@/components/TariffNotice";
import { JoyTugadiOgohi, joyTugadi, tolami, type Joylar } from "@/components/ParkJoylari";
import { tariffBlocked } from "@/lib/features";
import {
  KATEGORIYALAR,
  MARKALAR,
  TIRKAMA_VT,
  kategoriyaInfo,
  markaQidir,
  maydonKorinadi,
  yillar,
  type Kategoriya,
} from "@/lib/mashina-katalog";

/* `name` — server SO'ROV TILIDA qaytaradi (`localName`) */
type VType = { id: number; key: string; name: string; capacityT: number | null; volumeM3: number | null };

/** Sonli maydonlar `Vehicle` ustuniga, qolganlari `xususiyat` ga */
const USTUN = new Set(["capacityT", "volumeM3", "bodyLengthM"]);

export default function TransportQoshish() {
  const router = useRouter();
  const types = useApi<{ items: VType[] }>("/api/vehicle-types");
  const joy = useApi<{ seats: Joylar | null }>("/api/fleet/seats");
  const joylar = joy.data?.seats;

  const [kat, setKat] = useState<Kategoriya | null>(null);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [markaQ, setMarkaQ] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [typeKey, setTypeKey] = useState<string | null>(null);
  const [xus, setXus] = useState<Record<string, string>>({});
  const [more, setMore] = useState(false);
  const [countries, setCountries] = useState<string[]>(["UZ"]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const info = kategoriyaInfo(kat);
  const vtlar = types.data?.items ?? [];
  /* Tirkamada tur tirkama turidan; boshqalarida — kategoriyaning turlaridan */
  const turKey =
    info?.key === "tirkama" ? (xus.tirkamaTuri ? TIRKAMA_VT[xus.tirkamaTuri as keyof typeof TIRKAMA_VT] : null) : typeKey;
  const tur = vtlar.find((v) => v.key === turKey) ?? null;
  const katTurlari = info ? vtlar.filter((v) => info.turlar.includes(v.key)) : [];
  const modellar = kat ? (MARKALAR[kat].find((m) => m.nom === brand)?.modellar ?? []) : [];
  const ready = !!info && plate.trim().length >= 3 && brand.trim().length >= 2 && !!tur;

  function turTanla(k: Kategoriya) {
    const i = kategoriyaInfo(k)!;
    setKat(k);
    setXus({});
    setBrand("");
    setMarkaQ("");
    setModel("");
    setTypeKey(i.key === "tirkama" ? null : i.turlar[0]);
  }

  function toggleCountry(code: string) {
    setCountries((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  }

  const son = (v?: string) => (v && v.trim() ? Number(v.replace(",", ".")) : undefined);

  /** Serverga yuboriladigan tana — ikkala urinishda ham bir xil */
  function payload(force?: boolean) {
    return {
      part: info?.part,
      kategoriya: info?.key,
      plate: plate.trim(),
      brand: brand.trim(),
      model: model.trim() || undefined,
      year: year ? Number(year) : undefined,
      vehicleTypeId: tur?.id,
      capacityT: son(xus.capacityT),
      volumeM3: son(xus.volumeM3),
      bodyLengthM: son(xus.bodyLengthM),
      xususiyat: Object.fromEntries(
        Object.entries(xus)
          .filter(([k, v]) => !USTUN.has(k) && v !== "")
          .map(([k, v]) => [k, /^-?\d+([.,]\d+)?$/.test(v) ? Number(v.replace(",", ".")) : v]),
      ),
      countries,
      ...(force ? { force: true } : {}),
    };
  }

  async function save(force?: boolean) {
    /* Oxirgi to'siq — ekran boshidagi ogohlantirishga
       e'tibor bermay o'tib ketgan holat uchun. */
    if (tariffBlocked("fleet")) return;
    if (joylar && tolami(joylar)) {
      joyTugadi(joylar.limit);
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      // Server `{ ok, id, plate }` qaytaradi
      const res = await api<{ id: string }>("/api/fleet/vehicles", {
        method: "POST",
        body: payload(force),
      });
      /* TZ v2 §4.2: qo'shilgach AI so'raydi — «haydovchi kerakmi?» */
      router.replace(`/parkim/${res.id}?haydovchi=1`);
    } catch (e) {
      const err = e as FuramError;
      if (err.details) {
        setErrors(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0] ?? ""])));
      } else if (err.code === "DUPLICATE" && !force) {
        /* Server o'xshash mashina topdi. Bu TO'SIQ EMAS — bir xil
           raqamli tirkama va tyagach bo'lishi mumkin; qarorni egasi
           qabul qiladi. */
        Alert.alert(t("mob.add.dupTitle"), err.message ?? t("mob.add.dupText"), [
          { text: t("mob.common.cancel"), style: "cancel" },
          { text: t("mob.add.dupAnyway"), onPress: () => void save(true) },
        ]);
      } else if (err.code === "TARIFF_LIMIT") {
        /* Server `message` ida narx bor — ko'rsatilmaydi (Apple 3.1.1):
           son `seats` dan, matn lug'atdan */
        joyTugadi((err.data?.seats as Joylar | undefined)?.limit ?? joylar?.limit);
        joy.reload();
      } else {
        Alert.alert(t("mob.common.notSaved"), err.message ?? t("mob.common.tryAgain"));
      }
    } finally {
      setBusy(false);
    }
  }

  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [s.chip, on && s.chipOn, pressed && !on && { backgroundColor: color.muted }]}
    >
      <Text style={[s.chipText, on && { color: "#ffffff" }]}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.add.title")} subtitle={t("mob.add.step1")} />

      <View style={s.stepsWrap}>
        <Steps total={3} current={1} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TariffNotice feature="fleet" />
        <JoyTugadiOgohi joy={joylar} />

        {!info ? (
          /* 1-QADAM: TUR — 8 ta katta tugma */
          <View>
            <Text style={s.label}>{t("parkTur.qaysiTur")}</Text>
            <View style={s.katlar}>
              {KATEGORIYALAR.map((k) => (
                <Pressable
                  key={k.key}
                  onPress={() => turTanla(k.key)}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.kat, pressed && { backgroundColor: color.muted }]}
                >
                  <Icon name="truck" size={22} stroke={color.brand} />
                  <Text style={s.katNom} numberOfLines={2}>
                    {t(`parkTur.k_${k.key}`)}
                  </Text>
                  <Text style={s.katIzoh} numberOfLines={2}>
                    {t(`parkTur.i_${k.key}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={s.tanlangan}>
              <Text style={s.tanlanganText}>{t(`parkTur.k_${info.key}`)}</Text>
              <Pressable onPress={() => setKat(null)} hitSlop={8} accessibilityRole="button">
                <Text style={s.havola}>{t("parkTur.turAlmashtir")}</Text>
              </Pressable>
            </View>

            <Field
              label={t("mob.add.plate")}
              value={plate}
              onChangeText={setPlate}
              placeholder="01 A 123 AA"
              autoCapitalize="characters"
              error={errors.plate}
            />

            {/* Marka — shu turning ro'yxatidan, qidiruv bilan */}
            <View>
              <Field
                label={t("mob.add.brand")}
                value={brand ? brand : markaQ}
                onChangeText={(v) => {
                  setBrand("");
                  setModel("");
                  setMarkaQ(v);
                }}
                placeholder={t("parkTur.markaPh")}
                autoCapitalize="words"
                error={errors.brand}
              />
              {!brand ? (
                <View style={s.chips}>
                  {markaQidir(info.key, markaQ).map((m) =>
                    chip(m.nom, m.nom, false, () => {
                      setBrand(m.nom);
                      setMarkaQ("");
                    }),
                  )}
                  {markaQ.trim().length >= 2
                    ? chip("_boshqa", t("parkTur.boshqaMarka", { nom: markaQ.trim() }), false, () => setBrand(markaQ.trim()))
                    : null}
                </View>
              ) : null}
            </View>

            {/* Model — markaning modellari (ro'yxatda yo'q markada qo'lda) */}
            {brand ? (
              modellar.length ? (
                <View>
                  <Text style={s.label}>{t("mob.add.model")}</Text>
                  <View style={s.chips}>{modellar.map((m) => chip(m, m, model === m, () => setModel(model === m ? "" : m)))}</View>
                </View>
              ) : (
                <Field label={t("mob.add.model")} hint={t("mob.common.optional")} value={model} onChangeText={setModel} placeholder={t("parkTur.modelPh")} />
              )
            ) : null}

            {/* Yil — ro'yxat, joriy yildan pastga */}
            <View>
              <Text style={s.label}>{t("mob.add.year")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                {yillar().map((y) => chip(String(y), String(y), year === String(y), () => setYear(year === String(y) ? "" : String(y))))}
              </ScrollView>
            </View>

            {/* Kategoriyada bir nechta tur bo'lsa — faqat o'shalar */}
            {info.key !== "tirkama" && katTurlari.length > 1 ? (
              <View>
                <Text style={s.label}>{t("mob.add.vType")}</Text>
                <View style={s.chips}>{katTurlari.map((v) => chip(v.key, v.name, typeKey === v.key, () => setTypeKey(v.key)))}</View>
              </View>
            ) : null}

            {/* Turga xos maydonlar (TZ v3 §7 jadvali) */}
            {info.maydonlar
              .filter((m) => maydonKorinadi(m, xus))
              .map((m) =>
                m.tur === "tanlov" ? (
                  <View key={m.k}>
                    <Text style={s.label}>{t(`parkTur.f_${m.k}`)}</Text>
                    <View style={s.chips}>
                      {m.variant.map((v) =>
                        chip(v, t(`parkTur.v_${v}`), xus[m.k] === v, () => setXus((p) => ({ ...p, [m.k]: p[m.k] === v ? "" : v }))),
                      )}
                    </View>
                  </View>
                ) : (
                  <Field
                    key={m.k}
                    label={t(`parkTur.f_${m.k}`)}
                    value={xus[m.k] ?? ""}
                    onChangeText={(v) => setXus((p) => ({ ...p, [m.k]: v }))}
                    keyboardType={m.k === "haroratMin" || m.k === "haroratMax" ? "numbers-and-punctuation" : "decimal-pad"}
                    placeholder={
                      m.k === "capacityT" && tur?.capacityT
                        ? t("parkTur.masalan", { v: String(tur.capacityT) })
                        : m.k === "volumeM3" && tur?.volumeM3
                          ? t("parkTur.masalan", { v: String(tur.volumeM3) })
                          : undefined
                    }
                    error={errors[m.k]}
                  />
                ),
              )}

            {info.tirkama !== "yoq" ? <Text style={s.hint}>{t(`parkTur.tirkama_${info.tirkama}`)}</Text> : null}
            {errors.vehicleTypeId ? <Text style={s.err}>{errors.vehicleTypeId}</Text> : null}

            {/* Davlatlar — qo'shimcha */}
            <View style={!more ? s.gone : undefined}>
              <Text style={s.label}>{t("mob.add.countries")}</Text>
              <View style={s.flags}>
                {ISH_DAVLATLARI.map((c) => {
                  const on = countries.includes(c);
                  return (
                    <Pressable
                      key={c}
                      onPress={() => toggleCountry(c)}
                      style={({ pressed }) => [s.flag, on && s.flagOn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={{ fontSize: 13 }}>{isoBayroq(c)}</Text>
                      <Text style={[s.flagText, on && { color: "#fff", fontWeight: "600" }]}>{t(`jobCatalog.countries.${c}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={s.hint}>{t("mob.add.countriesHint")}</Text>
            </View>

            <Pressable onPress={() => setMore((v) => !v)} style={s.moreBtn} accessibilityRole="button">
              <Icon name={more ? "chevron" : "plus"} size={16} stroke={color.brand} />
              <Text style={s.moreText}>{more ? t("mob.add.lessFields") : t("mob.add.moreFields")}</Text>
            </Pressable>

            <View style={s.note}>
              <Text style={s.noteTitle}>{t("mob.add.nextSteps")}</Text>
              <Text style={s.noteBody}>{t("mob.add.nextStepsText")}</Text>
            </View>

            <Button title={t("mob.add.submit")} onPress={() => save()} loading={busy} disabled={!ready} />
            <Text style={s.foot}>{t("mob.add.laterHint")}</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = themed(() => ({
  /* `display: "none"` — komponent DARAXTDA qoladi, faqat chizilmaydi:
     odam to'ldirgani yo'qolmaydi */
  gone: { display: "none" },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.brand + "55",
  },
  moreText: { fontSize: 13, fontWeight: "700", color: color.brandText },

  root: { flex: 1, backgroundColor: color.card },
  stepsWrap: { paddingHorizontal: space.xl, paddingTop: space.md },
  scroll: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl * 2 },

  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 18 },
  err: { fontSize: 12, color: color.danger, marginTop: 6 },

  katlar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kat: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 96,
    padding: 12,
    gap: 4,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  katNom: { fontSize: 14.5, fontWeight: "800", color: color.foreground },
  katIzoh: { fontSize: 12, color: color.mutedForeground },

  tanlangan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.control,
    backgroundColor: color.brand + "14",
  },
  tanlanganText: { fontSize: 15, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  havola: { fontSize: 13, fontWeight: "700", color: color.brandText },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 13,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipText: { fontSize: 13.5, fontWeight: "600", color: color.foreground },

  flags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  flag: {
    height: 34, paddingHorizontal: 12, borderRadius: radius.pill,
    borderWidth: 1, borderColor: color.border, backgroundColor: color.card,
    flexDirection: "row", alignItems: "center", gap: 5,
  },
  flagOn: { backgroundColor: color.navy, borderColor: color.navy },
  flagText: { fontSize: font.caption, color: color.mutedForeground },

  note: {
    borderWidth: 1, borderColor: color.iconFaint, borderRadius: radius.card,
    backgroundColor: color.surface, padding: space.lg,
  },
  noteTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  noteBody: { fontSize: 12, color: color.icon, lineHeight: 19, marginTop: 5 },
  foot: { textAlign: "center", fontSize: font.caption, color: color.mutedForeground },
}));
