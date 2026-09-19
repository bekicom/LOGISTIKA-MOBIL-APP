/**
 * D3 — transport qo'shish, 1-qadam.
 *
 * `Vehicle` jadvalida 30 dan ortiq maydon bor. Hammasi bitta ekranga
 * qo'yilsa odam yarmida tashlab ketadi, shuning uchun QADAMLARGA
 * bo'lindi. Bu — birinchi qadam: mashinani e'lonlarga chiqarish uchun
 * YETARLI eng kam ma'lumot. Shundan keyin ham mashina saqlanadi va
 * ishlaydi; o'lchamlar, hujjat va surat keyin to'ldiriladi.
 *
 * Tirkama/tyagach tanlovi BIRINCHI savol: hujjat va texnik ko'rik
 * ikkalasida boshqacha yuritiladi (TZ 03, 43-45-band).
 *
 * Joy tugagan bo'lsa (2026-09-19) — forma boshida aytiladi va saqlash
 * to'xtaydi. Forma faqat park ekranidan emas, bosh sahifa va AI dan ham
 * ochiladi, shuning uchun o'zi ham so'raydi (`/api/fleet/seats`).
 */
import { useState } from "react";
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
/* Pardasi allaqachon bosiladigan (`s.backdrop`) — faqat ✕ va surish qo'shildi */
import { SheetClose, useSheetDrag } from "@/components/sheet-kit";
import { useRouter } from "expo-router";
import { Button, Card, Field, Header, ListRow, Steps } from "@/components/ui";
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

/* `name` — server SO'ROV TILIDA qaytaradi (`localName`). Ilgari
   `nameUz` ishlatilardi va ruscha interfeysda o'zbekcha chiqardi. */
type VType = { id: number; key: string; name: string; capacityT: number | null; volumeM3: number | null };

const PARTS = ["SINGLE", "TRACTOR", "TRAILER"] as const;

const partLabel = (k: string) =>
  ({ SINGLE: t("mob.add.single"), TRACTOR: t("mob.add.tractor"), TRAILER: t("mob.add.trailer") })[k] ?? k;

/* Davlatlar — webdagi 16 ta (`ISH_DAVLATLARI`; ilgari shu yerda 8 ta
   yozilgan edi). Nomlari `jobCatalog.countries.*` dan, bayroq ISO koddan */

export default function TransportQoshish() {
  /* Yopishning uchta yo'li: surish, ✕, parda (2026-09-13) */
  const drag = useSheetDrag(() => setPickType(false));
  const router = useRouter();
  const types = useApi<{ items: VType[] }>("/api/vehicle-types");
  const joy = useApi<{ seats: Joylar | null }>("/api/fleet/seats");
  const joylar = joy.data?.seats;

  const [part, setPart] = useState<string>("SINGLE");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  /* ── UCHTA MAYDON YETADI (2026-09-10) ─────────────────────────
     Server ALLAQACHON faqat uchtasini talab qiladi: raqam, marka,
     turi. Muammo forma tomonida edi — maydonlar birdan chiqib,
     odam telefonda uzun ro'yxatni ko'rib mashina qo'shishni
     keyinga qoldirardi.

     ⚠️ Yopilganda maydonlar DOM dan olib tashlanmaydi — `hidden`
     bilan yashiriladi. Aks holda odam bir qismini to'ldirib
     yopib qo'ysa, yozgani yo'qolardi. */
  const [more, setMore] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [volume, setVolume] = useState("");
  const [countries, setCountries] = useState<string[]>(["UZ"]);

  const [pickType, setPickType] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const type = types.data?.items.find((t) => t.id === typeId) ?? null;
  const ready = plate.trim().length >= 3 && brand.trim().length >= 2 && !!typeId;

  function chooseType(t: VType) {
    setTypeId(t.id);
    setPickType(false);
    // Turdan kelgan qiymatlar TAKLIF sifatida to'ldiriladi, qulflanmaydi
    if (!capacity && t.capacityT) setCapacity(String(t.capacityT));
    if (!volume && t.volumeM3) setVolume(String(t.volumeM3));
  }

  function toggleCountry(code: string) {
    setCountries((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  }

  /** Serverga yuboriladigan tana — ikkala urinishda ham bir xil */
  function payload(force?: boolean) {
    return {
      part,
      plate: plate.trim(),
      brand: brand.trim(),
      model: model.trim() || undefined,
      year: year ? Number(year) : undefined,
      vehicleTypeId: typeId,
      capacityT: capacity ? Number(capacity) : undefined,
      volumeM3: volume ? Number(volume) : undefined,
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
      router.replace(`/parkim/${res.id}`);
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
        /* Ilgari kod «TARIFF»/«LIMIT» bilan solishtirilardi va hech qachon
           mos kelmasdi. Server `message` ida narx bor — ko'rsatilmaydi
           (Apple 3.1.1): son `seats` dan, matn lug'atdan */
        joyTugadi((err.data?.seats as Joylar | undefined)?.limit ?? joylar?.limit);
        joy.reload();
      } else {
        Alert.alert(t("mob.common.notSaved"), err.message ?? t("mob.common.tryAgain"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.add.title")} subtitle={t("mob.add.step1")} />

      <View style={s.stepsWrap}>
        <Steps total={3} current={1} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TariffNotice feature="fleet" />
        <JoyTugadiOgohi joy={joylar} />
        {/* Tuzilishi — birinchi savol, qolgani shunga bog'liq */}
        <View>
          <Text style={s.label}>{t("mob.add.kind")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {PARTS.map((p) => {
              const on = part === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPart(p)}
                  style={({ pressed }) => [s.opt, on && s.optOn, pressed && !on && { backgroundColor: color.muted }]}
                >
                  <Icon name="truck" size={22} stroke={on ? color.brand : color.icon} />
                  <Text style={[s.optText, on && { color: color.brand }]}>{partLabel(p)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hint}>{t("mob.add.kindHint")}</Text>
        </View>

        <Field
          label={t("mob.add.plate")}
          value={plate}
          onChangeText={setPlate}
          placeholder="01 A 123 AA"
          autoCapitalize="characters"
          error={errors.plate}
        />
        <Text style={s.hintTight}>{t("mob.add.plateHint")}</Text>

        <Field
          label={t("mob.add.brand")}
          value={brand}
          onChangeText={setBrand}
          placeholder={t("mob.add.brandPh")}
          autoCapitalize="words"
          error={errors.brand}
        />

        <View style={[{ flexDirection: "row", gap: space.md }, !more && s.gone]}>
          <View style={{ flex: 1.4 }}>
            <Field label={t("mob.add.model")} hint={t("mob.common.optional")} value={model} onChangeText={setModel} placeholder={t("mob.add.model")} />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t("mob.add.year")}
              hint={t("mob.common.optional")}
              value={year}
              onChangeText={setYear}
              placeholder="2019"
              keyboardType="number-pad"
              maxLength={4}
              error={errors.year}
            />
          </View>
        </View>

        {/* Transport turi — e'lonlarni moslash uchun majburiy */}
        <View>
          <Text style={s.label}>{t("mob.add.vType")}</Text>
          <Pressable
            onPress={() => setPickType(true)}
            style={({ pressed }) => [s.picker, pressed && { backgroundColor: color.muted }]}
          >
            <View style={s.pickIcon}>
              <Icon name="truck" size={19} stroke={color.brand} />
            </View>
            <Text style={[s.pickText, !type && { color: "#94a3b8" }]}>
              {type ? `${type.name}${type.capacityT ? ` ${type.capacityT} t` : ""}` : t("mob.add.vTypePick")}
            </Text>
            <Icon name="chevron" size={16} stroke="#94a3b8" />
          </Pressable>
          {errors.vehicleTypeId ? <Text style={s.err}>{errors.vehicleTypeId}</Text> : null}
          <Text style={s.hint}>{t("mob.add.vTypeHint")}</Text>
        </View>

        <View style={[{ flexDirection: "row", gap: space.md }, !more && s.gone]}>
          <View style={{ flex: 1 }}>
            <Field
              label={t("mob.vehicle.capacity")}
              value={capacity}
              onChangeText={setCapacity}
              placeholder="20"
              keyboardType="decimal-pad"
              right={<Text style={s.unit}>t</Text>}
              error={errors.capacityT}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t("mob.vehicle.volume")}
              hint={t("mob.common.optional")}
              value={volume}
              onChangeText={setVolume}
              placeholder="86"
              keyboardType="decimal-pad"
              right={<Text style={s.unit}>m³</Text>}
              error={errors.volumeM3}
            />
          </View>
        </View>

        {/* Davlatlar */}
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

        {/* Qo'shimcha maydonlarni ochish/yopish. Tugma HAR DOIM
            ko'rinadi: ochilganda «yopish» bo'lib qoladi, ya'ni
            odam ochganini yopa oladi. */}
        <Pressable onPress={() => setMore((v) => !v)} style={s.moreBtn} accessibilityRole="button">
          <Icon name={more ? "chevron" : "plus"} size={16} stroke={color.brand} />
          <Text style={s.moreText}>
            {more ? t("mob.add.lessFields") : t("mob.add.moreFields")}
          </Text>
        </Pressable>

        <View style={s.note}>
          <Text style={s.noteTitle}>{t("mob.add.nextSteps")}</Text>
          <Text style={s.noteBody}>{t("mob.add.nextStepsText")}</Text>
        </View>

        <Button title={t("mob.add.submit")} onPress={() => save()} loading={busy} disabled={!ready} />
        <Text style={s.foot}>{t("mob.add.laterHint")}</Text>
      </ScrollView>

      {/* Tur tanlash */}
      <Modal visible={pickType} animationType="slide" transparent onRequestClose={() => setPickType(false)}>
        <Pressable style={s.backdrop} onPress={() => setPickType(false)} />
        <Animated.View style={[s.sheet, drag.style]} {...drag.panHandlers}>
          <View style={s.grab} />
          <SheetClose onPress={() => setPickType(false)} />
          <Text style={s.sheetTitle}>{t("mob.add.vType")}</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            <Card>
              {(types.data?.items ?? []).map((vt, i) => (
                <ListRow
                  key={vt.id}
                  last={i === (types.data?.items.length ?? 0) - 1}
                  title={vt.name}
                  hint={[
                    vt.capacityT ? `${vt.capacityT} t` : null,
                    vt.volumeM3 ? `${vt.volumeM3} m³` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  right={typeId === vt.id ? <Icon name="check" size={18} stroke={color.brand} /> : undefined}
                  onPress={() => chooseType(vt)}
                />
              ))}
            </Card>
          </ScrollView>
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = themed(() => ({
  /* `display: "none"` — komponent DARAXTDA qoladi, faqat
     chizilmaydi. `hidden` React Native'da yo'q (u DOM xususiyati),
     shartli render esa maydonlarni butunlay olib tashlab, odam
     to'ldirganini yo'qotardi. */
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
  moreText: { fontSize: 13, fontWeight: "700", color: color.brand },

  root: { flex: 1, backgroundColor: color.card },
  stepsWrap: { paddingHorizontal: space.xl, paddingTop: space.md },
  scroll: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl * 2 },

  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 6, lineHeight: 18 },
  hintTight: { fontSize: 12, color: color.mutedForeground, marginTop: -14, lineHeight: 18 },
  err: { fontSize: 12, color: color.danger, marginTop: 6 },
  unit: { fontSize: 14, color: color.mutedForeground },

  opt: {
    flex: 1, height: 64, borderRadius: 10, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.card, alignItems: "center", justifyContent: "center", gap: 5,
  },
  optOn: { borderColor: color.brand, borderWidth: 2, backgroundColor: color.brand + "0d" },
  optText: { fontSize: 12, fontWeight: "600", color: color.icon },

  picker: {
    height: 52, borderRadius: radius.control, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.card, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, gap: 10,
  },
  pickIcon: {
    width: 30, height: 30, borderRadius: 7, backgroundColor: color.brand + "1f",
    alignItems: "center", justifyContent: "center",
  },
  pickText: { flex: 1, fontSize: font.bodyLg, color: color.foreground },

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

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    backgroundColor: color.background, borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet, padding: space.lg, paddingBottom: space.xxl * 1.5,
  },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.iconFaint, alignSelf: "center", marginBottom: space.md },
  sheetTitle: { fontSize: font.title, fontWeight: "700", color: color.foreground, marginBottom: space.md },
}));
