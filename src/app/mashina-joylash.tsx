/**
 * M3 — mashina e'loni.
 *
 * BO'SH FORMADAN BOSHLANMAYDI. Mashina allaqachon bazada: odam
 * parkiga transportni kiritgan — turi, sig'imi, suratlari va hujjat
 * muddatlari hammasi bor. Bo'sh forma ko'rsatib o'shani qaytadan
 * yozdirish — o'zimiz yig'gan ma'lumotni ishlatmaslik demak.
 *
 * Reysdagi mashina TANLANMAYDI, lekin YASHIRILMAYDI ham: «#412
 * reysda» deb ochiq aytiladi, aks holda odam «mashinam qani» deb
 * qidirardi.
 *
 * Hujjati tugagan mashina TO'SILMAYDI, ogohlantiriladi. Sug'urtasi
 * tugaganini biz bilamiz, lekin haydovchi uni bugun yangilagan
 * bo'lishi mumkin — bazada esa hali yo'q. Qaror odamniki.
 */
import { useState } from "react";
import {
  Image,
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
import { Button, Field, Header, ListRow, Steps, Switch } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { notePushMoment } from "@/lib/push";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";
import { TariffNotice } from "@/components/TariffNotice";
import { tariffBlocked } from "@/lib/features";

type Fleet = {
  id: string;
  plate: string;
  brand: string;
  model: string | null;
  type: string;
  vehicleTypeId: number;
  capacityT: number | null;
  volumeM3: number | null;
  photo: string | null;
  docAlert: { kind: string; label: string; state: string; days: number | null } | null;
  trip: { no: number } | null;
};

type VehicleType = { id: number; key: string; name: string };

const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

export default function MashinaJoylash() {
  const [step, setStep] = useState(1);
  const [picking, setPicking] = useState<null | "from" | "to">(null);

  const [pick, setPick] = useState<Fleet | null>(null);
  /** Parkda yo'q — turi va sig'imi qo'lda kiritiladi */
  const [manual, setManual] = useState(false);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [capacity, setCapacity] = useState("");
  const [volume, setVolume] = useState("");

  const [from, setFrom] = useState<Loc | null>(null);
  const [to, setTo] = useState<Loc | null>(null);
  const [freeNow, setFreeNow] = useState(true);
  const [freeDate, setFreeDate] = useState("");
  const [extra, setExtra] = useState(false);

  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [desc, setDesc] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fleet = useApi<{ items: Fleet[] }>("/api/fleet/vehicles");
  const types = useApi<{ items: VehicleType[] }>(manual ? "/api/vehicle-types" : null, [manual]);

  const chosenType = pick?.vehicleTypeId ?? typeId;
  const chosenCap = pick?.capacityT ?? (capacity ? num(capacity) : null);

  const ready =
    step === 1
      ? (!!pick || (manual && typeId != null && num(capacity) > 0))
      : step === 2
        ? !!from && !!to && (freeNow || /^\d{4}-\d{2}-\d{2}$/.test(freeDate))
        : negotiable || num(price) > 0;

  async function publish() {
    /* Oxirgi to'siq — ekran boshidagi ogohlantirishga
       e'tibor bermay o'tib ketgan holat uchun. */
    if (tariffBlocked("post_truck")) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ truck: { id: string } }>("/api/trucks", {
        method: "POST",
        body: {
          ...(pick ? { vehicleId: pick.id } : {}),
          fromLocationId: from!.id,
          toLocationId: to!.id,
          vehicleTypeId: chosenType,
          capacityT: chosenCap,
          ...(pick?.volumeM3 ?? (volume ? num(volume) : null)
            ? { volumeM3: pick?.volumeM3 ?? num(volume) }
            : {}),
          isFreeNow: freeNow,
          ...(freeNow ? {} : { freeDate }),
          takesExtraLoad: extra,
          ...(negotiable ? { isNegotiable: true } : { isNegotiable: false, price: num(price) }),
          currency: "UZS",
          paymentType: "CASH",
          ...(desc.trim() ? { description: desc.trim() } : {}),
        },
      });
      notePushMoment();
      router.replace(`/mashina/${res.truck.id}`);
    } catch (e) {
      setErr((e as FuramError).message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.trucks.post")}
        subtitle={t("mob.trucks.stepOf", { n: step })}
        onBack={() => (step === 1 ? router.back() : setStep(step - 1))}
      />
      <View style={s.steps}>
        <Steps total={3} current={step} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <TariffNotice feature="post_truck" />
        {/* ── 1: qaysi mashina ── */}
        {step === 1 ? (
          <>
            <Text style={s.lead}>{t("mob.trucks.pickLead")}</Text>

            {fleet.loading ? (
              <Skeleton rows={3} />
            ) : fleet.error ? (
              <ErrorBox message={fleet.error} onRetry={fleet.reload} />
            ) : (
              (fleet.data?.items ?? []).map((v) => {
                const busyTrip = !!v.trip;
                const on = pick?.id === v.id;
                const warn = v.docAlert?.state === "expired" || v.docAlert?.state === "soon";
                return (
                  <Pressable
                    key={v.id}
                    disabled={busyTrip}
                    onPress={() => {
                      setPick(v);
                      setManual(false);
                    }}
                    style={[
                      s.veh,
                      on && s.vehOn,
                      warn && !on && s.vehWarn,
                      busyTrip && s.vehOff,
                    ]}
                  >
                    {v.photo ? (
                      <Image source={vehiclePhoto(v.id, v.photo)} style={s.vehShot} resizeMode="cover" />
                    ) : (
                      <View style={[s.vehShot, s.vehShotEmpty]}>
                        <Icon name="truck" size={22} stroke="#94a3b8" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.vehPlate}>{v.plate}</Text>
                      <Text style={s.vehSub} numberOfLines={1}>
                        {[v.brand, v.model, v.type, v.capacityT ? `${v.capacityT} t` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      {busyTrip ? (
                        <Text style={s.vehWarnText}>
                          {t("mob.trucks.onTrip", { n: v.trip!.no })}
                        </Text>
                      ) : warn ? (
                        <Text style={s.vehWarnText}>{v.docAlert!.label}</Text>
                      ) : (
                        <Text style={s.vehOkText}>{t("mob.trucks.docsOk")}</Text>
                      )}
                    </View>
                    {on ? (
                      <View style={s.tick}>
                        <Icon name="check" size={14} stroke="#fff" />
                      </View>
                    ) : warn && !busyTrip ? (
                      <Icon name="alert" size={18} stroke={color.warning} />
                    ) : null}
                  </Pressable>
                );
              })
            )}

            {/* Parkdan tashqari */}
            <Pressable
              onPress={() => {
                setManual(true);
                setPick(null);
              }}
              style={[s.manual, manual && s.manualOn]}
            >
              <View style={s.manualIcon}>
                <Icon name="plus" size={18} stroke="#475569" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.manualTitle}>{t("mob.trucks.notInFleet")}</Text>
                <Text style={s.vehSub}>{t("mob.trucks.notInFleetHint")}</Text>
              </View>
            </Pressable>

            {manual ? (
              <View style={s.card}>
                <Text style={s.label}>{t("mob.post.mainType")}</Text>
                <View style={s.types}>
                  {(types.data?.items ?? []).map((vt) => (
                    <Pressable
                      key={vt.id}
                      onPress={() => setTypeId(vt.id)}
                      style={[s.type, typeId === vt.id && s.typeOn]}
                    >
                      <Text style={[s.typeText, typeId === vt.id && { color: color.brand }]}>
                        {vt.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Field
                  label={t("mob.trucks.capacity")}
                  value={capacity}
                  onChangeText={setCapacity}
                  keyboardType="decimal-pad"
                  placeholder="20"
                />
                <Field
                  label={t("mob.trucks.volume")}
                  value={volume}
                  onChangeText={setVolume}
                  keyboardType="decimal-pad"
                  placeholder="86"
                />
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── 2: yo'nalish va bo'shlik ── */}
        {step === 2 ? (
          <>
            <View style={s.card}>
              <Pick label={t("mob.loads.from")} value={from?.name ?? null} onPress={() => setPicking("from")} />
              <Pick label={t("mob.loads.to")} value={to?.name ?? null} onPress={() => setPicking("to")} />
            </View>

            <View style={s.card}>
              <ListRow
                title={t("mob.trucks.freeNow")}
                right={<Switch value={freeNow} onValueChange={setFreeNow} />}
                last
              />
              {!freeNow ? (
                <Field
                  label={t("mob.trucks.freeDateLabel")}
                  value={freeDate}
                  onChangeText={setFreeDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />
              ) : null}
              <ListRow
                title={t("mob.trucks.takesExtra")}
                hint={t("mob.post.extraLoadNote")}
                right={<Switch value={extra} onValueChange={setExtra} />}
                last
              />
            </View>
          </>
        ) : null}

        {/* ── 3: narx va ko'rib chiqish ── */}
        {step === 3 ? (
          <>
            <View style={s.card}>
              <ListRow
                title={t("mob.loads.negotiable")}
                right={<Switch value={negotiable} onValueChange={setNegotiable} />}
                last
              />
              {!negotiable ? (
                <Field
                  label={t("mob.trucks.price")}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="26 000 000"
                />
              ) : null}
              <Field
                label={t("mob.trucks.note")}
                value={desc}
                onChangeText={setDesc}
                multiline
                placeholder={t("mob.trucks.notePh")}
              />
            </View>

            {/* Nima o'zi to'ldi — odam bilishi kerak */}
            {pick ? (
              <View style={s.card}>
                <Text style={s.groupLabel}>{t("mob.trucks.fromFleet")}</Text>
                <Row k={t("mob.post.mainType")} v={pick.type} />
                <Row
                  k={t("mob.trucks.capacity")}
                  v={[pick.capacityT ? `${pick.capacityT} t` : null, pick.volumeM3 ? `${pick.volumeM3} m³` : null]
                    .filter(Boolean)
                    .join(" · ")}
                />
                <Row k={t("mob.trucks.photos")} v={String(pick.photo ? 1 : 0)} />
              </View>
            ) : null}

            {err ? <ErrorBox message={err} /> : null}
            <Button title={t("mob.trucks.publish")} onPress={publish} loading={busy} disabled={!ready} />
          </>
        ) : null}
      </ScrollView>

      {step < 3 ? (
        <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
          <Button
            title={t("mob.common.next")}
            onPress={() => setStep(step + 1)}
            disabled={!ready}
          />
        </View>
      ) : null}

      <LocationPicker
        open={picking !== null}
        title={picking === "from" ? t("mob.loads.from") : t("mob.loads.to")}
        onClose={() => setPicking(null)}
        onPick={(l) => {
          if (picking === "from") setFrom(l);
          else setTo(l);
          setPicking(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Pick({ label, value, onPress }: { label: string; value: string | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.pick}>
      <View style={{ flex: 1 }}>
        <Text style={s.pickLabel}>{label}</Text>
        <Text style={[s.pickValue, !value && { color: "#94a3b8" }]} numberOfLines={1}>
          {value ?? t("mob.loads.cityPh")}
        </Text>
      </View>
      <Icon name="chevron" size={18} stroke="#cbd5e1" />
    </Pressable>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Icon name="check" size={15} stroke={color.success} />
      <Text style={s.rowK}>{k}</Text>
      <Text style={s.rowV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  steps: { backgroundColor: color.card, paddingHorizontal: space.lg, paddingBottom: space.md },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: font.body, color: "#475569", lineHeight: 22 },

  veh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 12,
  },
  vehOn: { borderColor: color.brand, borderWidth: 2 },
  vehWarn: { borderColor: color.warning + "66" },
  vehOff: { opacity: 0.55 },
  vehShot: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#cbd5e1" },
  vehShotEmpty: { backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  vehPlate: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  vehSub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  vehWarnText: { fontSize: 12, color: color.warning, fontWeight: "600", marginTop: 4 },
  vehOkText: { fontSize: 12, color: color.success, fontWeight: "600", marginTop: 4 },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  manual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    padding: 15,
  },
  manualOn: { borderColor: color.brand, borderStyle: "solid", backgroundColor: color.brand + "0a" },
  manualIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  manualTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.lg,
    gap: 14,
  },
  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  groupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
  },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  typeOn: { borderColor: color.brand, borderWidth: 2, backgroundColor: color.brand + "0d" },
  typeText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },

  pick: { flexDirection: "row", alignItems: "center", gap: 10 },
  pickLabel: { fontSize: 12, color: color.mutedForeground },
  pickValue: { fontSize: font.bodyLg, fontWeight: "600", color: color.foreground, marginTop: 2 },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowK: { flex: 1, fontSize: font.caption, color: color.foreground },
  rowV: { fontSize: font.caption, fontWeight: "600", color: color.mutedForeground },

  foot: {
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: 12,
  },
});
