/**
 * C4 — yuk e'lonini joylash. To'rt bosqich + ko'rib chiqish.
 *
 * Nega bo'lingan: bitta sahifada 14 ta maydon telefonda to'ldirilmaydi.
 * Har bosqich bitta savolga javob beradi va «Davom etish» faqat o'sha
 * bosqich to'lganda yonadi.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { TruckIcon } from "@/components/TruckIcon";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { Route, Chip } from "@/components/cards";
import { Button, Field, Notice, Steps } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type VehicleType = { id: number; key: string; nameUz: string };

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];
const PAY = [
  { key: "CASH", label: "Naqd" },
  { key: "TRANSFER", label: "O'tkazma" },
  { key: "MIXED", label: "Aralash" },
];

/** Qo'shimcha turlar chegarasi — serverdagi `altVehicleTypeIds.max(3)` bilan bir xil */
const MAX_ALT = 3;

export default function YukJoylash() {
  const [step, setStep] = useState(1);
  const [picking, setPicking] = useState<null | "from" | "to">(null);

  const [from, setFrom] = useState<Loc | null>(null);
  const [to, setTo] = useState<Loc | null>(null);
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [count, setCount] = useState(1);
  const [extra, setExtra] = useState(false);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [alts, setAlts] = useState<number[]>([]);
  const [readyNow, setReadyNow] = useState(true);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [negotiable, setNegotiable] = useState(false);
  const [advance, setAdvance] = useState("");
  const [payment, setPayment] = useState("CASH");
  const [desc, setDesc] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const types = useApi<{ items: VehicleType[] }>("/api/vehicle-types");

  const typeOf = (id: number | null) => types.data?.items.find((t) => t.id === id) ?? null;
  const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

  const ready =
    step === 1 ? !!from && !!to :
    step === 2 ? title.trim().length >= 2 && num(weight) > 0 :
    step === 3 ? typeId != null :
    step === 4 ? negotiable || num(price) > 0 :
    true;

  function toggleAlt(id: number) {
    setAlts((a) =>
      a.includes(id) ? a.filter((x) => x !== id) : a.length < MAX_ALT ? [...a, id] : a,
    );
  }

  async function publish() {
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ load: { id: string } }>("/api/loads", {
        method: "POST",
        body: {
          fromLocationId: from!.id,
          toLocationId: to!.id,
          vehicleTypeId: typeId,
          altVehicleTypeIds: alts,
          title: title.trim(),
          weightT: num(weight),
          ...(volume ? { volumeM3: num(volume) } : {}),
          vehicleCount: count,
          isExtraLoad: extra,
          isReadyNow: readyNow,
          ...(negotiable ? { isNegotiable: true } : { price: num(price) }),
          currency,
          ...(advance ? { advance: num(advance) } : {}),
          paymentType: payment,
          ...(desc.trim() ? { description: desc.trim() } : {}),
        },
      });
      router.replace(`/yuk/${res.load.id}`);
    } catch (e) {
      setErr((e as FuramError).message ?? "E'lon joylanmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top }}>
        <View style={s.header}>
          <Pressable
            onPress={() => (step === 1 ? router.back() : setStep(step - 1))}
            hitSlop={10}
            style={s.back}
          >
            <Icon name={step === 1 ? "close" : "back"} size={22} stroke={color.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            {step > 1 && from && to ? (
              <Text style={s.crumb} numberOfLines={1}>
                {from.nameUz} → {to.nameUz}
                {step > 2 && weight ? ` · ${weight} t` : ""}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ paddingHorizontal: space.xl }}>
          <Steps total={5} current={step} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: space.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.caption}>{step}-BOSQICH · 5 DAN</Text>

        {/* 1 — yo'nalish */}
        {step === 1 ? (
          <>
            <Text style={s.title}>Yuk qayerdan qayerga?</Text>
            <View style={{ gap: space.md, marginTop: space.xxl }}>
              <Picker label="Qayerdan" value={from?.nameUz ?? null} filled onPress={() => setPicking("from")} />
              <Picker label="Qayerga" value={to?.nameUz ?? null} onPress={() => setPicking("to")} />
            </View>
          </>
        ) : null}

        {/* 2 — yuk */}
        {step === 2 ? (
          <>
            <Text style={s.title}>Qanday yuk?</Text>
            <View style={{ gap: space.lg, marginTop: space.xxl }}>
              <View>
                <Field label="Yuk nomi" placeholder="Quruq mevalar, qadoqlangan" value={title} onChangeText={setTitle} autoFocus />
                <Text style={s.hint}>Haydovchi shu nomga qarab qaror qiladi — aniq yozing</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Og'irlik (t)" placeholder="18" keyboardType="numeric" value={weight} onChangeText={setWeight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Hajm (m³)" hint="ixtiyoriy" placeholder="62" keyboardType="numeric" value={volume} onChangeText={setVolume} />
                </View>
              </View>

              <View>
                <Text style={s.label}>Nechta mashina kerak</Text>
                <View style={s.counter}>
                  <Pressable style={s.cntBtn} onPress={() => setCount((c) => Math.max(1, c - 1))}>
                    <Text style={s.cntSign}>−</Text>
                  </Pressable>
                  <Text style={s.cntValue}>{count}</Text>
                  <Pressable style={[s.cntBtn, s.cntBtnOn]} onPress={() => setCount((c) => Math.min(100, c + 1))}>
                    <Icon name="plus" size={20} stroke="#fff" />
                  </Pressable>
                </View>
              </View>

              <Toggle
                title="Bu qo'shimcha yuk"
                note="Mashina to'la emas — boshqa yuk bilan birga ketishi mumkin"
                on={extra}
                onPress={() => setExtra((v) => !v)}
              />
            </View>
          </>
        ) : null}

        {/* 3 — transport */}
        {step === 3 ? (
          <>
            <Text style={s.title}>Qanday transport kerak?</Text>

            <Text style={[s.label, { marginTop: space.xxl }]}>Asosiy tur</Text>
            <View style={s.grid}>
              {(types.data?.items ?? []).map((t) => {
                const on = typeId === t.id;
                return (
                  <Pressable key={t.id} onPress={() => { setTypeId(t.id); setAlts((a) => a.filter((x) => x !== t.id)); }} style={[s.type, on && s.typeOn]}>
                    <TruckIcon type={t.key} size={34} color={on ? color.brand : color.mutedForeground} />
                    <Text style={[s.typeText, on && s.typeTextOn]} numberOfLines={2}>{t.nameUz}</Text>
                  </Pressable>
                );
              })}
            </View>

            {typeId != null ? (
              <>
                <View style={[s.rowBetween, { marginTop: space.xxl }]}>
                  <Text style={s.label}>Yana qaysi turlar bo&apos;laveradi</Text>
                  <Text style={s.counterHint}>{alts.length} / {MAX_ALT}</Text>
                </View>
                <Text style={s.hint}>Ko&apos;proq tur — ko&apos;proq haydovchi ko&apos;radi</Text>
                <View style={[s.chipWrap, { marginTop: space.md }]}>
                  {(types.data?.items ?? [])
                    .filter((t) => t.id !== typeId)
                    .map((t) => {
                      const on = alts.includes(t.id);
                      const full = !on && alts.length >= MAX_ALT;
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => !full && toggleAlt(t.id)}
                          style={[s.altChip, on && s.altChipOn, full && { opacity: 0.35 }]}
                        >
                          <Text style={[s.altText, on && s.altTextOn]}>{t.nameUz}</Text>
                        </Pressable>
                      );
                    })}
                </View>
                {alts.length >= MAX_ALT ? (
                  <Text style={s.hint}>
                    Uchtadan ko&apos;p tanlansa e&apos;lon «istalgan mashina» degan ma&apos;noni beradi va filtrda topilmay qoladi
                  </Text>
                ) : null}
              </>
            ) : null}

            <Text style={[s.label, { marginTop: space.xxl }]}>Yuklash qachon</Text>
            <View style={s.segment}>
              <Pressable style={[s.seg, readyNow && s.segOn]} onPress={() => setReadyNow(true)}>
                <Text style={[s.segText, readyNow && s.segTextOn]}>Hozir tayyor</Text>
              </Pressable>
              <Pressable style={[s.seg, !readyNow && s.segOn]} onPress={() => setReadyNow(false)}>
                <Text style={[s.segText, !readyNow && s.segTextOn]}>Keyinroq</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* 4 — narx */}
        {step === 4 ? (
          <>
            <Text style={s.title}>Narx va to&apos;lov</Text>

            <View style={{ marginTop: space.xxl, flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Narx"
                  placeholder="28 000 000"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                  editable={!negotiable}
                />
              </View>
              <View style={{ width: 100 }}>
                <Text style={s.label}>Valyuta</Text>
                <View style={s.chipWrap}>
                  {CURRENCIES.map((c) => (
                    <Pressable key={c} onPress={() => setCurrency(c)} style={[s.curChip, currency === c && s.curChipOn]}>
                      <Text style={[s.curText, currency === c && s.curTextOn]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Pressable style={s.check} onPress={() => setNegotiable((v) => !v)}>
              <View style={[s.box, negotiable && s.boxOn]}>
                {negotiable ? <Icon name="check" size={13} stroke="#fff" /> : null}
              </View>
              <Text style={s.checkText}>Narx kelishiladi</Text>
            </Pressable>

            <View style={{ marginTop: space.lg }}>
              <Field
                label="Oldindan to'lov"
                hint="ixtiyoriy"
                placeholder="10 000 000"
                keyboardType="numeric"
                value={advance}
                onChangeText={setAdvance}
              />
              <Text style={s.hint}>Oldindan to&apos;lov bo&apos;lgan e&apos;lonlar tezroq olinadi</Text>
            </View>

            <Text style={[s.label, { marginTop: space.xl }]}>To&apos;lov turi</Text>
            <View style={s.segment}>
              {PAY.map((p) => (
                <Pressable key={p.key} style={[s.seg, payment === p.key && s.segOn]} onPress={() => setPayment(p.key)}>
                  <Text style={[s.segText, payment === p.key && s.segTextOn]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: space.xl }}>
              <View style={s.rowBetween}>
                <Text style={s.label}>Izoh <Text style={s.optional}>— ixtiyoriy</Text></Text>
                <Text style={s.counterHint}>{desc.length} / 1000</Text>
              </View>
              <TextInput
                value={desc}
                onChangeText={(v) => setDesc(v.slice(0, 1000))}
                placeholder="Yuklash joyi, vaqti, qadoq turi..."
                placeholderTextColor="#94a3b8"
                multiline
                style={s.textarea}
              />
            </View>
          </>
        ) : null}

        {/* 5 — ko'rib chiqish */}
        {step === 5 ? (
          <>
            <Text style={s.title}>Ko&apos;rib chiqing</Text>
            <Text style={s.sub}>Haydovchilar e&apos;loningizni shunday ko&apos;radi</Text>

            <View style={[s.preview, { marginTop: space.xl }]}>
              <View style={s.rowBetween}>
                <Chip text="YANGI" tone="success" />
                <Icon name="heart" size={20} stroke="#cbd5e1" />
              </View>
              <View style={{ marginTop: 11 }}>
                <Route from={from?.nameUz ?? ""} to={to?.nameUz ?? ""} />
              </View>
              <Text style={s.previewCargo}>{title}</Text>
              <View style={[s.chipWrap, { marginTop: 11 }]}>
                <Chip text={`${weight} t`} />
                {typeOf(typeId) ? <Chip text={typeOf(typeId)!.nameUz} /> : null}
                {readyNow ? <Chip text="Hozir tayyor" tone="success" /> : null}
              </View>
              <Text style={s.previewPrice}>
                {negotiable || !price
                  ? "Kelishiladi"
                  : `${new Intl.NumberFormat("ru-RU").format(num(price))} ${currency}`}
              </Text>
            </View>

            <View style={[s.summary, { marginTop: space.md }]}>
              <SumRow label="Yo'nalish" value={`${from?.nameUz} → ${to?.nameUz}`} onEdit={() => setStep(1)} />
              <SumRow
                label="Yuk"
                value={`${title} · ${weight} t${volume ? ` · ${volume} m³` : ""} · ${count} mashina`}
                onEdit={() => setStep(2)}
              />
              <SumRow
                label="Transport"
                value={[typeOf(typeId)?.nameUz, ...alts.map((a) => typeOf(a)?.nameUz)].filter(Boolean).join(", ")}
                onEdit={() => setStep(3)}
              />
              <SumRow
                label="Narx"
                value={`${negotiable ? "Kelishiladi" : `${price} ${currency}`} · ${PAY.find((p) => p.key === payment)?.label}`}
                onEdit={() => setStep(4)}
                last
              />
            </View>

            <View style={{ marginTop: space.md }}>
              <Notice tone="info">
                E&apos;lon 30 kun turadi. Keyin arxivga tushadi — istagan paytda qayta faollashtirasiz.
              </Notice>
            </View>

            {err ? <View style={{ marginTop: space.md }}><Notice tone="danger">{err}</Notice></View> : null}
          </>
        ) : null}
      </ScrollView>

      <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          title={step === 5 ? "E'lonni joylash" : "Davom etish"}
          onPress={() => (step === 5 ? publish() : setStep(step + 1))}
          disabled={!ready}
          loading={busy}
        />
        {!ready ? <Text style={s.footHint}>{HINT[step]}</Text> : null}
      </View>

      <LocationPicker
        open={picking !== null}
        title={picking === "from" ? "Qayerdan" : "Qayerga"}
        onClose={() => setPicking(null)}
        onPick={(l) => {
          picking === "from" ? setFrom(l) : setTo(l);
          setPicking(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const HINT: Record<number, string> = {
  1: "Ikkala manzilni tanlang",
  2: "Yuk nomi va og'irligini kiriting",
  3: "Transport turini tanlang",
  4: "Narx kiriting yoki «kelishiladi» belgilang",
};

/* ─────────────────────────────────────────────── bo'laklar */

function Picker({ label, value, filled, onPress }: {
  label: string; value: string | null; filled?: boolean; onPress: () => void;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={[s.pick, value && s.pickOn]} onPress={onPress}>
        <View style={[s.dot, filled ? s.dotDark : s.dotBrand]} />
        <Text style={[s.pickText, !value && s.pickPlaceholder]}>{value ?? "Shahar yoki viloyat"}</Text>
        <Icon name="chevron" size={16} stroke="#94a3b8" />
      </Pressable>
    </View>
  );
}

function Toggle({ title, note, on, onPress }: { title: string; note: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={s.toggle} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        <Text style={s.hint}>{note}</Text>
      </View>
      <View style={[s.switch, on && s.switchOn]}>
        <View style={[s.knob, on && s.knobOn]} />
      </View>
    </Pressable>
  );
}

function SumRow({ label, value, onEdit, last }: { label: string; value: string; onEdit: () => void; last?: boolean }) {
  return (
    <View style={[s.sumRow, !last && s.sumDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={s.meta}>{label}</Text>
        <Text style={s.sumValue} numberOfLines={2}>{value}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Text style={s.edit}>Tahrir</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  crumb: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },

  body: { paddingHorizontal: space.xl, paddingTop: space.xl },
  caption: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: "700", color: color.foreground, marginTop: 6, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: color.mutedForeground, marginTop: 7, lineHeight: 21 },
  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 8 },
  optional: { fontWeight: "400", color: color.mutedForeground },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 6, lineHeight: 17 },
  meta: { fontSize: 12, color: color.mutedForeground },
  rowBetween: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  counterHint: { fontSize: 12, fontWeight: "600", color: color.brand },

  pick: {
    height: 52, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10,
  },
  pickOn: { borderWidth: 2, borderColor: color.brand },
  pickText: { flex: 1, fontSize: font.bodyLg, fontWeight: "600", color: color.foreground },
  pickPlaceholder: { fontWeight: "400", color: "#94a3b8" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotDark: { borderWidth: 3, borderColor: color.foreground },
  dotBrand: { backgroundColor: color.brand },

  counter: { flexDirection: "row", alignItems: "center", gap: 14 },
  cntBtn: {
    width: 52, height: 52, borderRadius: radius.control, borderWidth: 1,
    borderColor: color.border, alignItems: "center", justifyContent: "center",
  },
  cntBtnOn: { backgroundColor: color.brand, borderColor: color.brand },
  cntSign: { fontSize: 24, fontWeight: "600", color: color.foreground, marginTop: -2 },
  cntValue: { flex: 1, textAlign: "center", fontSize: 26, fontWeight: "700", color: color.foreground },

  toggle: {
    flexDirection: "row", alignItems: "center", gap: space.md, padding: 14,
    borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
  },
  toggleTitle: { fontSize: 14, fontWeight: "500", color: color.foreground },
  switch: { width: 46, height: 27, borderRadius: 14, backgroundColor: color.border, padding: 3 },
  switchOn: { backgroundColor: color.brand },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: {
    width: "22.6%", flexGrow: 1, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    paddingVertical: 10, paddingHorizontal: 2, minHeight: 78, alignItems: "center", justifyContent: "center", gap: 6,
  },
  typeOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180f" },
  typeText: { fontSize: 10, fontWeight: "500", color: "#475569", textAlign: "center", lineHeight: 13 },
  typeTextOn: { fontWeight: "700", color: "#c2490f" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  altChip: { height: 34, paddingHorizontal: 12, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, justifyContent: "center" },
  altChipOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a181a" },
  altText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  altTextOn: { fontWeight: "700", color: "#c2490f" },

  segment: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1, height: 46, borderRadius: radius.control, borderWidth: 1,
    borderColor: color.border, alignItems: "center", justifyContent: "center",
  },
  segOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180f" },
  segText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  segTextOn: { fontWeight: "700", color: "#c2490f" },

  curChip: { paddingHorizontal: 9, height: 24, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  curChipOn: { backgroundColor: color.brand },
  curText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  curTextOn: { color: "#fff" },

  check: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: space.md },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.brand, borderColor: color.brand },
  checkText: { fontSize: 14, color: color.foreground },

  textarea: {
    minHeight: 92, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    padding: 14, fontSize: font.body, color: color.foreground, textAlignVertical: "top",
  },

  preview: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: space.lg, ...shadow.card,
  },
  previewCargo: { fontSize: 14, color: "#475569", marginTop: 10 },
  previewPrice: { fontSize: 21, fontWeight: "700", color: color.foreground, marginTop: 13, letterSpacing: -0.3 },

  summary: { backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1, borderColor: color.border },
  sumRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: 14 },
  sumDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
  sumValue: { fontSize: 14, fontWeight: "600", color: color.foreground, marginTop: 2 },
  edit: { fontSize: 13, fontWeight: "600", color: color.brand },

  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.card },
  footHint: { fontSize: 12, color: color.mutedForeground, textAlign: "center", marginTop: 10 },
});
