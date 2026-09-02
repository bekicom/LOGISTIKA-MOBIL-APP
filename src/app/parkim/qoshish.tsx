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
 */
import { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Field, Header, ListRow, Steps } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";

type VType = { id: number; key: string; nameUz: string; capacityT: number | null; volumeM3: number | null };

const PARTS = [
  { key: "SINGLE", label: "Yaxlit" },
  { key: "TRACTOR", label: "Tyagach" },
  { key: "TRAILER", label: "Tirkama" },
] as const;

/** Ilova ishlaydigan davlatlar — backenddagi WORK_COUNTRIES bilan bir xil */
const COUNTRIES = [
  { code: "UZ", flag: "🇺🇿", name: "O'zbekiston" },
  { code: "KZ", flag: "🇰🇿", name: "Qozog'iston" },
  { code: "RU", flag: "🇷🇺", name: "Rossiya" },
  { code: "KG", flag: "🇰🇬", name: "Qirg'iziston" },
  { code: "TJ", flag: "🇹🇯", name: "Tojikiston" },
  { code: "TM", flag: "🇹🇲", name: "Turkmaniston" },
  { code: "TR", flag: "🇹🇷", name: "Turkiya" },
  { code: "CN", flag: "🇨🇳", name: "Xitoy" },
];

export default function TransportQoshish() {
  const router = useRouter();
  const types = useApi<{ items: VType[] }>("/api/vehicle-types");

  const [part, setPart] = useState<string>("SINGLE");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
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
        Alert.alert("Shunday transport bormi?", err.message ?? "O'xshash mashina topildi.", [
          { text: "Bekor qilish", style: "cancel" },
          { text: "Baribir qo'shish", onPress: () => void save(true) },
        ]);
      } else if (err.code === "TARIFF" || err.code === "LIMIT") {
        Alert.alert("Tarif cheklovi", err.message ?? "Bu tarifda mashina qo'shib bo'lmaydi.");
      } else {
        Alert.alert("Saqlanmadi", err.message ?? "Qaytadan urinib ko'ring");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title="Transport qo'shish" subtitle="1-qadam: asosiy ma'lumot" />

      <View style={s.stepsWrap}>
        <Steps total={3} current={1} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Tuzilishi — birinchi savol, qolgani shunga bog'liq */}
        <View>
          <Text style={s.label}>Bu qanday transport?</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {PARTS.map((p) => {
              const on = part === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPart(p.key)}
                  style={({ pressed }) => [s.opt, on && s.optOn, pressed && !on && { backgroundColor: color.muted }]}
                >
                  <Icon name="truck" size={22} stroke={on ? color.brand : "#475569"} />
                  <Text style={[s.optText, on && { color: color.brand }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hint}>
            Tyagach va tirkama alohida yoziladi — hujjat va texnik ko&apos;rik ikkalasida
            boshqacha.
          </Text>
        </View>

        <Field
          label="Davlat raqami"
          value={plate}
          onChangeText={setPlate}
          placeholder="01 A 123 AA"
          autoCapitalize="characters"
          error={errors.plate}
        />
        <Text style={s.hintTight}>
          Raqam almashsa keyin o&apos;zgartirasiz — ichki raqam (TR-…) o&apos;zgarmaydi.
        </Text>

        <Field
          label="Rusum"
          value={brand}
          onChangeText={setBrand}
          placeholder="Mercedes-Benz, MAN, Isuzu..."
          autoCapitalize="words"
          error={errors.brand}
        />

        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1.4 }}>
            <Field label="Model" hint="ixtiyoriy" value={model} onChangeText={setModel} placeholder="Actros 1845" />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Yili"
              hint="ixtiyoriy"
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
          <Text style={s.label}>Transport turi</Text>
          <Pressable
            onPress={() => setPickType(true)}
            style={({ pressed }) => [s.picker, pressed && { backgroundColor: color.muted }]}
          >
            <View style={s.pickIcon}>
              <Icon name="truck" size={19} stroke={color.brand} />
            </View>
            <Text style={[s.pickText, !type && { color: "#94a3b8" }]}>
              {type ? `${type.nameUz}${type.capacityT ? ` ${type.capacityT} t` : ""}` : "Tanlang"}
            </Text>
            <Icon name="chevron" size={16} stroke="#94a3b8" />
          </Pressable>
          {errors.vehicleTypeId ? <Text style={s.err}>{errors.vehicleTypeId}</Text> : null}
          <Text style={s.hint}>
            14 ta turdan tanlanadi. Yuk e&apos;lonlari aynan shu bo&apos;yicha moslanadi.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Yuk ko'tarish"
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
              label="Hajm"
              hint="ixtiyoriy"
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
        <View>
          <Text style={s.label}>Qaysi davlatlarga chiqadi</Text>
          <View style={s.flags}>
            {COUNTRIES.map((c) => {
              const on = countries.includes(c.code);
              return (
                <Pressable
                  key={c.code}
                  onPress={() => toggleCountry(c.code)}
                  style={({ pressed }) => [s.flag, on && s.flagOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={{ fontSize: 13 }}>{c.flag}</Text>
                  <Text style={[s.flagText, on && { color: "#fff", fontWeight: "600" }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hint}>
            Chiqmaydigan davlatdagi yuk e&apos;lonlari ko&apos;rsatilmaydi — ro&apos;yxat toza qoladi.
          </Text>
        </View>

        <View style={s.note}>
          <Text style={s.noteTitle}>Keyingi qadamlar</Text>
          <Text style={s.noteBody}>
            2-qadam — o&apos;lchamlar, yoqilg&apos;i normasi va spidometr. 3-qadam — hujjatlar
            va surat. Ikkalasini keyin ham to&apos;ldirish mumkin: mashina shu qadamdan
            keyinoq e&apos;lonlarda ishlaydi.
          </Text>
        </View>

        <Button title="Saqlash va davom etish" onPress={() => save()} loading={busy} disabled={!ready} />
        <Text style={s.foot}>Keyingi qadamlarni keyin ham to&apos;ldirish mumkin</Text>
      </ScrollView>

      {/* Tur tanlash */}
      <Modal visible={pickType} animationType="slide" transparent onRequestClose={() => setPickType(false)}>
        <Pressable style={s.backdrop} onPress={() => setPickType(false)} />
        <View style={s.sheet}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>Transport turi</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            <Card>
              {(types.data?.items ?? []).map((t, i) => (
                <ListRow
                  key={t.id}
                  last={i === (types.data?.items.length ?? 0) - 1}
                  title={t.nameUz}
                  hint={[
                    t.capacityT ? `${t.capacityT} t` : null,
                    t.volumeM3 ? `${t.volumeM3} m³` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  right={typeId === t.id ? <Icon name="check" size={18} stroke={color.brand} /> : undefined}
                  onPress={() => chooseType(t)}
                />
              ))}
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
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
  optText: { fontSize: 12, fontWeight: "600", color: "#475569" },

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
    borderWidth: 1, borderColor: "#cbd5e1", borderRadius: radius.card,
    backgroundColor: "#f8fafc", padding: space.lg,
  },
  noteTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  noteBody: { fontSize: 12, color: "#475569", lineHeight: 19, marginTop: 5 },
  foot: { textAlign: "center", fontSize: font.caption, color: color.mutedForeground },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    backgroundColor: color.background, borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet, padding: space.lg, paddingBottom: space.xxl * 1.5,
  },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: space.md },
  sheetTitle: { fontSize: font.title, fontWeight: "700", color: color.foreground, marginBottom: space.md },
});
