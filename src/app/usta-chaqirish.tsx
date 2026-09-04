/**
 * U3 — usta chaqirish.
 *
 * ── BIRINCHI SAVOL — MUAMMO, MASHINA EMAS ───────────────────────
 *
 * Haydovchi yo'lda to'xtab qolgan va uning boshida bitta gap bor:
 * «korobka shovqin qilyapti». Undan avval mashina tanlashni
 * so'rasak, u shu yerda to'xtaydi. Mashina esa parkdan o'zi
 * qo'yiladi — u tizimga allaqachon ma'lum.
 *
 * ── JOYLASHUV TELEFONDAN ────────────────────────────────────────
 *
 * «Shahar tanlang» ro'yxati yo'lda qolgan odam uchun foydasiz: u
 * M-39 yo'lining 142-kilometrida turibdi va ro'yxatda bunday joy
 * yo'q. GPS nuqtasi ustaga aniq manzil beradi.
 *
 * Ruxsat berilmasa yoki nuqta olinmasa — shahar ro'yxati qoladi.
 * Ikkalasi ham bo'lmasa mobil usta chaqirib bo'lmaydi (server ham
 * shuni talab qiladi: `PLACE_REQUIRED`).
 */
import { useEffect, useState } from "react";
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
import * as Location from "expo-location";
import { Button, Field, Header, Steps, Switch } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { ErrorBox } from "@/components/state";
import { api, apiUpload, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { useApi } from "@/lib/use-api";
import { notePushMoment } from "@/lib/push";
import { serviceSpecLabel, t } from "@/lib/i18n";
import { color, space } from "@/lib/theme";

const SPECS = [
  "engine", "gearbox", "chassis", "electric", "diagnostic", "ac",
  "brakes", "steering", "electronics", "welder", "body", "tyre",
  "vulcan", "fuel", "trailer", "tractor",
] as const;

const MAX_PHOTOS = 6;

type Fleet = { id: string; plate: string; brand: string; model: string | null; photo: string | null };

/** Qachon kerak — tayyor javoblar. Sana tanlash kamdan-kam kerak. */
const WHEN = ["now", "today", "tomorrow"] as const;

export default function UstaChaqirish() {
  const [step, setStep] = useState(1);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [problem, setProblem] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [pick, setPick] = useState<Fleet | null>(null);
  const [vehicleText, setVehicleText] = useState("");

  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "denied">("idle");
  const [loc, setLoc] = useState<Loc | null>(null);
  const [picking, setPicking] = useState(false);
  const [address, setAddress] = useState("");
  const [needMobile, setNeedMobile] = useState(true);
  const [when, setWhen] = useState<string>("now");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fleet = useApi<{ items: Fleet[] }>("/api/fleet/vehicles");

  /* Nuqta 2-qadamga o'tilganda so'raladi, ekran ochilganda emas:
     odam hali nima uchun kerakligini bilmaydi va rad etadi. */
  useEffect(() => {
    if (step !== 2 || point || geoState !== "idle") return;
    setGeoState("asking");
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGeoState("denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("idle");
      } catch {
        setGeoState("denied");
      }
    })();
  }, [step, point, geoState]);

  const hasPlace = !!point || !!loc || address.trim().length > 0;
  const canNext =
    step === 1
      ? problem.trim().length > 0
      : (!!pick || vehicleText.trim().length > 0) && (!needMobile || hasPlace);

  function toggleSpec(k: string) {
    setSpecs((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
  }

  async function addPhotos(from: "camera" | "gallery") {
    const got = from === "camera" ? await takePhoto() : await pickPhotos(MAX_PHOTOS);
    if (!got.length) return;
    setPhotos((p) => [...p, ...got].slice(0, MAX_PHOTOS));
  }

  /** «Bugun» — bugun kechqurun, «ertaga» — ertaga ertalab */
  function neededAt(): string | null {
    const d = new Date();
    if (when === "now") return null;
    if (when === "today") {
      d.setHours(20, 0, 0, 0);
      return d.toISOString();
    }
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ id: string; orderNo: number }>("/api/service", {
        method: "POST",
        body: {
          action: "create",
          problem: problem.trim(),
          services: specs,
          vehicleId: pick?.id ?? null,
          vehicleText: pick ? null : vehicleText.trim() || null,
          locationId: loc?.id ?? null,
          address: address.trim() || null,
          lat: point?.lat ?? null,
          lng: point?.lng ?? null,
          needMobile,
          neededAt: neededAt(),
        },
      });

      /* Suratlar buyurtma yaratilgach yuboriladi: marshrut
         `orderId` ni talab qiladi. Xato yutiladi — buyurtma
         allaqachon ustalarga ketgan, uni suratsiz qoldirgandan
         ko'ra yuborgan yaxshiroq. */
      for (const p of photos) {
        await apiUpload(`/api/service/${res.id}/photos`, {}, [toUpload(p, "photo")]).catch(
          () => null,
        );
      }

      notePushMoment();
      router.replace(`/ustaxona/${res.id}`);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.svc.callTitle")}
        subtitle={t(`mob.svc.step${step}`)}
        onBack={() => (step === 1 ? router.back() : setStep(1))}
      />
      <View style={s.steps}>
        <Steps total={2} current={step} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {err ? <ErrorBox message={err} /> : null}

        {/* ══ 1: nima bo'ldi ══ */}
        {step === 1 && (
          <>
            <Field
              label={t("mob.svc.problem")}
              value={problem}
              onChangeText={setProblem}
              placeholder={t("mob.svc.problemPh")}
              multiline
              style={s.area}
            />
            <Text style={s.hint}>{t("mob.svc.problemHint")}</Text>

            <View>
              <Text style={s.label}>{t("mob.svc.photos")}</Text>
              <View style={s.shots}>
                {photos.map((p) => (
                  <Pressable
                    key={p.uri}
                    style={s.shot}
                    onPress={() => setPhotos((x) => x.filter((y) => y.uri !== p.uri))}
                  >
                    <Image source={{ uri: p.uri }} style={s.shotImg} />
                    <View style={s.shotX}>
                      <Icon name="close" size={12} stroke="#fff" />
                    </View>
                  </Pressable>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <>
                    <Pressable style={s.add} onPress={() => void addPhotos("camera")}>
                      <Icon name="plus" size={19} stroke="#94a3b8" />
                      <Text style={s.addText}>{t("mob.photo.camera")}</Text>
                    </Pressable>
                    <Pressable style={s.add} onPress={() => void addPhotos("gallery")}>
                      <Icon name="doc" size={19} stroke="#94a3b8" />
                      <Text style={s.addText}>{t("mob.photo.gallery")}</Text>
                    </Pressable>
                  </>
                )}
              </View>
              <Text style={s.hint}>{t("mob.svc.photoHint")}</Text>
            </View>

            <View>
              <Text style={s.label}>{t("mob.svc.whichMaster")}</Text>
              <View style={s.picks}>
                {SPECS.map((k) => (
                  <Pressable
                    key={k}
                    style={[s.pick, specs.includes(k) && s.pickOn]}
                    onPress={() => toggleSpec(k)}
                  >
                    <Text style={[s.pickText, specs.includes(k) && s.pickTextOn]}>
                      {serviceSpecLabel(k)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.hint}>{t("mob.svc.specHint")}</Text>
            </View>
          </>
        )}

        {/* ══ 2: qayerda va qachon ══ */}
        {step === 2 && (
          <>
            <View>
              <Text style={s.label}>{t("mob.svc.whichVehicle")}</Text>
              {(fleet.data?.items ?? []).map((v) => {
                const on = pick?.id === v.id;
                return (
                  <Pressable
                    key={v.id}
                    style={[s.veh, on && s.vehOn]}
                    onPress={() => setPick(on ? null : v)}
                  >
                    {v.photo ? (
                      <Image source={vehiclePhoto(v.id, v.photo)} style={s.vehShot} resizeMode="cover" />
                    ) : (
                      <View style={[s.vehShot, s.vehShotEmpty]}>
                        <Icon name="truck" size={22} stroke="#94a3b8" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.vehTitle}>
                        {v.brand} {v.model ?? ""}
                      </Text>
                      <Text style={s.vehSub}>{v.plate}</Text>
                    </View>
                    {on && (
                      <View style={s.tick}>
                        <Icon name="check" size={14} stroke="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {!pick && (
                <Field
                  label={t("mob.svc.otherVehicle")}
                  value={vehicleText}
                  onChangeText={setVehicleText}
                  placeholder={t("mob.svc.otherVehiclePh")}
                />
              )}
            </View>

            {/* ── Joylashuv */}
            <View>
              <Text style={s.label}>{t("mob.svc.where")}</Text>

              {point ? (
                <View style={s.geoOk}>
                  <Icon name="border" size={16} stroke="#15803d" />
                  <View style={{ flexGrow: 1 }}>
                    <Text style={s.geoOkTitle}>{t("mob.svc.pointTaken")}</Text>
                    <Text style={s.geoOkSub}>{t("mob.svc.pointFrom")}</Text>
                  </View>
                  <Pressable onPress={() => setPoint(null)}>
                    <Text style={s.change}>{t("mob.svc.change")}</Text>
                  </Pressable>
                </View>
              ) : geoState === "asking" ? (
                <View style={s.geoWait}>
                  <Text style={s.geoWaitText}>{t("mob.svc.pointAsking")}</Text>
                </View>
              ) : (
                <>
                  <Pressable style={s.locBtn} onPress={() => setPicking(true)}>
                    <Icon name="border" size={17} stroke={color.mutedForeground} />
                    <Text style={[s.locText, !loc && s.locPh]}>
                      {loc?.name ?? t("mob.sale.wherePh")}
                    </Text>
                  </Pressable>
                  {geoState === "denied" && (
                    <Text style={s.hint}>{t("mob.svc.pointDenied")}</Text>
                  )}
                </>
              )}

              <Field
                label={t("mob.svc.landmark")}
                value={address}
                onChangeText={setAddress}
                placeholder={t("mob.svc.landmarkPh")}
              />
            </View>

            {/* ── Mobil usta */}
            <View style={[s.mobileRow, needMobile && s.mobileRowOn]}>
              <View style={{ flexGrow: 1 }}>
                <Text style={s.mobileTitle}>{t("mob.svc.comeToMe")}</Text>
                <Text style={s.mobileHint}>{t("mob.svc.comeToMeHint")}</Text>
              </View>
              <Switch value={needMobile} onValueChange={setNeedMobile} />
            </View>

            <View>
              <Text style={s.label}>{t("mob.svc.whenNeeded")}</Text>
              <View style={s.picks}>
                {WHEN.map((k) => (
                  <Pressable
                    key={k}
                    style={[s.pick, when === k && s.pickOn]}
                    onPress={() => setWhen(k)}
                  >
                    <Text style={[s.pickText, when === k && s.pickTextOn]}>
                      {t(`mob.svc.when_${k}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[s.foot, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          title={step === 2 ? t("mob.svc.sendToMasters") : t("mob.common.next")}
          onPress={() => (step === 2 ? void submit() : setStep(2))}
          disabled={!canNext}
          loading={busy}
        />
        {step === 2 && <Text style={s.footNote}>{t("mob.svc.sendNote")}</Text>}
      </View>

      <LocationPicker
        open={picking}
        title={t("mob.svc.where")}
        onClose={() => setPicking(false)}
        onPick={(l) => {
          setLoc(l);
          setPicking(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  steps: { backgroundColor: color.card, paddingHorizontal: space.lg, paddingBottom: space.md },
  scroll: { padding: space.lg, gap: space.md },

  label: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, marginBottom: 5 },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: 6 },
  area: { minHeight: 92, textAlignVertical: "top" },

  shots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shot: { width: 88, height: 70, borderRadius: 10, overflow: "hidden", backgroundColor: color.muted },
  shotImg: { width: "100%", height: "100%" },
  shotX: {
    position: "absolute",
    right: 5,
    top: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0f172acc",
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    width: 88,
    height: 70,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { fontSize: 11, fontWeight: "500", color: "#94a3b8" },

  picks: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pick: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  pickOn: { backgroundColor: color.brand + "17", borderColor: color.brand },
  pickText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  pickTextOn: { color: "#c2490f", fontWeight: "600" },

  veh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },
  vehOn: { borderWidth: 2, borderColor: color.brand },
  vehShot: { width: 44, height: 44, borderRadius: 9, backgroundColor: color.muted },
  vehShotEmpty: { alignItems: "center", justifyContent: "center" },
  vehTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  vehSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  geoOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: color.success + "12",
    borderWidth: 1,
    borderColor: color.success + "40",
  },
  geoOkTitle: { fontSize: 13, fontWeight: "600", color: color.foreground },
  geoOkSub: { fontSize: 11, color: color.mutedForeground, marginTop: 1 },
  change: { fontSize: 12, fontWeight: "600", color: color.brand },

  geoWait: { padding: 14, borderRadius: 12, backgroundColor: color.muted, alignItems: "center" },
  geoWaitText: { fontSize: 13, color: color.mutedForeground },

  locBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
  },
  locText: { fontSize: 15, color: color.foreground },
  locPh: { color: "#94a3b8" },

  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  mobileRowOn: { backgroundColor: color.brand + "12", borderColor: color.brand + "4d" },
  mobileTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  mobileHint: { fontSize: 12, color: color.mutedForeground, marginTop: 1, lineHeight: 17 },

  foot: {
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  footNote: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8, lineHeight: 16 },
});
