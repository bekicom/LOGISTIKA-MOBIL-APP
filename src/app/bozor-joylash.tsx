/**
 * P3 — sotuv e'loni.
 *
 * ── BIRINCHI SAVOL: PARKDAN TANLASH ─────────────────────────────
 *
 * Mashina FURAM parkida bo'lsa marka, model, yil va probeg tayyor —
 * odam yigirmata katakni qo'lda to'ldirmaydi. Muhimrog'i: shu
 * bog'lanish e'longa TEXNIK TARIXNI qo'shadi, ya'ni xaridor
 * probegni tekshira oladi. Bu bozorning boshqa e'lon saytlaridan
 * yagona jiddiy farqi.
 *
 * Qo'lda kiritish ikkinchi yo'l bo'lib qoladi: parkda bo'lmagan
 * mashinani ham sotish kerak.
 *
 * ── MAJBURIYSI FAQAT UCHTA ──────────────────────────────────────
 *
 * Marka, narx, joy. Qolgani ixtiyoriy: yilini yoki dvigatel
 * raqamini bilmagan odam ham e'lon bera olishi kerak, aks holda
 * yarmi to'ldirmasdan tashlab ketadi.
 *
 * ── SURAT OXIRIDA VA MAJBURIY EMAS ──────────────────────────────
 *
 * Suratsiz e'lon — o'lik e'lon, lekin uni MAJBURIY qilish
 * telefonida surat yo'q odamni butunlay to'sib qo'yardi.
 * Ogohlantiramiz, to'smaymiz.
 */
import { useMemo, useState } from "react";
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
import { Button, Field, Header, Steps, Switch } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, apiUpload, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { useApi } from "@/lib/use-api";
import { notePushMoment } from "@/lib/push";
import { saleCategoryLabel, saleFeatureLabel, salePriceKindLabel, t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";
import { TariffNotice } from "@/components/TariffNotice";
import { tariffBlocked } from "@/lib/features";

const CATS = ["FURA", "TRUCK", "TRAILER", "MINIBUS", "BUS", "SPECIAL", "CAR", "OTHER"] as const;
const FEATURES = ["gps", "webasto", "ac", "fridge", "retarder", "cruise", "hydro", "sleeper", "adr", "tir"] as const;
const KINDS = ["FIXED", "NEGOTIABLE", "URGENT"] as const;
const CURRENCIES = ["USD", "UZS", "EUR"] as const;
const MAX_PHOTOS = 10;

type Fleet = {
  id: string;
  plate: string;
  brand: string;
  model: string | null;
  photo: string | null;
};

/** Bo'shliqli raqamni songa: «620 000» → 620000 */
const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function BozorJoylash() {
  const [step, setStep] = useState(1);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 1-qadam
  const [pick, setPick] = useState<Fleet | null>(null);
  const [cat, setCat] = useState<string | null>(null);

  // 2-qadam
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [gearbox, setGearbox] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [about, setAbout] = useState("");

  // 3-qadam
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [priceKind, setPriceKind] = useState<string>("NEGOTIABLE");
  const [inst, setInst] = useState(false);
  const [down, setDown] = useState("");
  const [months, setMonths] = useState("");
  const [monthly, setMonthly] = useState("");
  const [exchange, setExchange] = useState(false);

  // 4-qadam
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [picking, setPicking] = useState(false);
  const [address, setAddress] = useState("");
  const [hasDocs, setHasDocs] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fleet = useApi<{ items: Fleet[] }>("/api/fleet/vehicles");

  /* TAKLIF QILINADIGAN OYLIK — foizsiz bo'linma. Sotuvchilarning
     ko'pi hisoblab o'tirmaydi va katakni bo'sh qoldiradi; bo'sh
     qolsa e'londa oylik to'lov ko'rsatilmaydi va muddatli to'lov
     yozuvi raqamsiz qoladi. */
  const suggest = useMemo(() => {
    const p = num(price);
    const d = num(down) ?? 0;
    const m = num(months);
    if (!p || !m || d >= p) return null;
    return Math.round((p - d) / m);
  }, [price, down, months]);

  const canNext =
    step === 1
      ? !!pick || !!cat
      : step === 2
        ? brand.trim().length > 0
        : step === 3
          ? !!num(price)
          : !!loc;

  function toggleFeature(k: string) {
    setFeatures((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
  }

  async function addPhotos(from: "camera" | "gallery") {
    const got = from === "camera" ? await takePhoto() : await pickPhotos(MAX_PHOTOS);
    if (!got.length) return;
    setPhotos((p) => [...p, ...got].slice(0, MAX_PHOTOS));
  }

  async function submit() {
    /* Oxirgi to'siq — ekran boshidagi ogohlantirishga
       e'tibor bermay o'tib ketgan holat uchun. */
    if (tariffBlocked("auto_sale")) return;
    setErr(null);
    setBusy(true);
    try {
      /* E'LON AVVAL SAQLANADI, surat keyin: rasm marshruti
         `saleId` ni talab qiladi. Ya'ni suratlar yuklanmasa ham
         e'lon qoladi — bu ataylab shunday. */
      const res = await api<{ id: string; saleNo: number }>("/api/market", {
        method: "POST",
        body: {
          action: "save",
          vehicleId: pick?.id ?? null,
          category: pick ? (cat ?? "TRUCK") : cat,
          brand: brand.trim(),
          model: model.trim() || null,
          year: num(year),
          odometer: num(odometer),
          fuel: fuel.trim() || null,
          gearbox: gearbox.trim() || null,
          features,
          about: about.trim() || null,
          price: num(price),
          currency,
          priceKind,
          installment: inst,
          ...(inst
            ? {
                downPayment: num(down),
                months: num(months),
                monthlyPayment: num(monthly) ?? suggest,
              }
            : {}),
          exchange,
          locationId: loc?.id ?? null,
          address: address.trim() || null,
          hasDocs,
        },
      });

      /* Suratlar KETMA-KET yuboriladi: server har birini alohida
         qabul qiladi (bitta so'rovda bitta rasm), va bittasi tushmasa
         qolgani yo'qolmasin. Xato YUTILADI — e'lon allaqachon
         saqlangan, uni suratsiz qoldirgandan ko'ra chiqargan
         yaxshiroq; sotuvchi keyin qo'shadi. */
      for (const p of photos) {
        await apiUpload(`/api/market/${res.id}/photos`, {}, [toUpload(p, "photo")]).catch(
          () => null,
        );
      }

      notePushMoment();
      router.replace(`/bozor/${res.id}`);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.post.failed"));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.sale.post")}
        subtitle={t(`mob.sale.step${step}`)}
        onBack={() => (step === 1 ? router.back() : setStep(step - 1))}
      />
      <View style={s.steps}>
        <Steps total={4} current={step} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <TariffNotice feature="auto_sale" />
        {err ? <ErrorBox message={err} /> : null}

        {/* ══ 1: nima sotilyapti ══ */}
        {step === 1 && (
          <>
            <Text style={s.lead}>{t("mob.sale.pickLead")}</Text>

            {fleet.loading ? (
              <Skeleton rows={2} />
            ) : fleet.error ? (
              <ErrorBox message={fleet.error} onRetry={fleet.reload} />
            ) : (fleet.data?.items ?? []).length === 0 ? null : (
              <>
                {(fleet.data?.items ?? []).map((v) => {
                  const on = pick?.id === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      style={[s.veh, on && s.vehOn]}
                      onPress={() => {
                        setPick(on ? null : v);
                        if (!on) {
                          // Parkdagi ma'lumot formaga ko'chadi
                          setBrand(v.brand);
                          setModel(v.model ?? "");
                        }
                      }}
                    >
                      {v.photo ? (
                        <Image source={vehiclePhoto(v.id, v.photo)} style={s.vehShot} resizeMode="cover" />
                      ) : (
                        <View style={[s.vehShot, s.vehShotEmpty]}>
                          <Icon name="truck" size={22} stroke="#94a3b8" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.vehPlate}>
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

                <View style={s.why}>
                  <Icon name="check" size={15} stroke="#c2490f" />
                  <Text style={s.whyText}>{t("mob.sale.fleetWhy")}</Text>
                </View>

                <View style={s.orRow}>
                  <View style={s.orLine} />
                  <Text style={s.orText}>{t("mob.common.or")}</Text>
                  <View style={s.orLine} />
                </View>
              </>
            )}

            <Text style={s.label}>{t("mob.sale.category")}</Text>
            <View style={s.picks}>
              {CATS.map((c) => (
                <Pressable
                  key={c}
                  style={[s.pick, cat === c && s.pickOn]}
                  onPress={() => setCat(cat === c ? null : c)}
                >
                  <Text style={[s.pickText, cat === c && s.pickTextOn]}>
                    {saleCategoryLabel(c)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ══ 2: texnik ══ */}
        {step === 2 && (
          <>
            {pick && (
              <View style={s.ok}>
                <Icon name="check" size={15} stroke="#15803d" />
                <Text style={s.okText}>{t("mob.sale.autoFilled")}</Text>
              </View>
            )}

            <View style={s.two}>
              <View style={{ flex: 1 }}>
                <Field label={t("mob.sale.brand")} value={brand} onChangeText={setBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t("mob.sale.model")} value={model} onChangeText={setModel} />
              </View>
            </View>

            <View style={s.two}>
              <View style={{ flex: 1 }}>
                <Field
                  label={t("mob.sale.year")}
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t("mob.sale.odometer")}
                  value={odometer}
                  onChangeText={setOdometer}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={s.two}>
              <View style={{ flex: 1 }}>
                <Field label={t("mob.sale.fuel")} value={fuel} onChangeText={setFuel} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t("mob.sale.gearbox")} value={gearbox} onChangeText={setGearbox} />
              </View>
            </View>

            <Text style={s.label}>{t("mob.sale.features")}</Text>
            <View style={s.picks}>
              {FEATURES.map((f) => (
                <Pressable
                  key={f}
                  style={[s.pick, features.includes(f) && s.pickOn]}
                  onPress={() => toggleFeature(f)}
                >
                  <Text style={[s.pickText, features.includes(f) && s.pickTextOn]}>
                    {saleFeatureLabel(f)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Field
              label={t("mob.sale.about")}
              value={about}
              onChangeText={setAbout}
              placeholder={t("mob.sale.aboutPh")}
              multiline
              style={s.area}
            />
          </>
        )}

        {/* ══ 3: narx ══ */}
        {step === 3 && (
          <>
            <View style={s.two}>
              <View style={{ flex: 2 }}>
                <Field
                  label={t("mob.sale.price")}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t("mob.sale.currency")}</Text>
                <View style={s.picks}>
                  {CURRENCIES.map((c) => (
                    <Pressable
                      key={c}
                      style={[s.pick, currency === c && s.pickOn]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text style={[s.pickText, currency === c && s.pickTextOn]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Text style={s.label}>{t("mob.sale.priceKind")}</Text>
            <View style={s.picks}>
              {KINDS.map((k) => (
                <Pressable
                  key={k}
                  style={[s.pick, priceKind === k && s.pickOn]}
                  onPress={() => setPriceKind(k)}
                >
                  <Text style={[s.pickText, priceKind === k && s.pickTextOn]}>
                    {salePriceKindLabel(k)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.line} />

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>{t("mob.market.installment")}</Text>
                <Text style={s.switchHint}>{t("mob.sale.installmentHint")}</Text>
              </View>
              <Switch value={inst} onValueChange={setInst} />
            </View>

            {inst && (
              <>
                <View style={s.two}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t("mob.market.down")}
                      value={down}
                      onChangeText={setDown}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t("mob.market.months")}
                      value={months}
                      onChangeText={setMonths}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Field
                  label={t("mob.market.perMonth")}
                  value={monthly}
                  onChangeText={setMonthly}
                  keyboardType="number-pad"
                />
                {suggest != null && !num(monthly) && (
                  <Pressable onPress={() => setMonthly(String(suggest))}>
                    <Text style={s.suggest}>
                      {t("mob.sale.suggest", { sum: `${fmtNum(suggest)} ${currency}` })}
                    </Text>
                  </Pressable>
                )}
              </>
            )}

            <View style={s.line} />

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>{t("mob.market.f_exchange")}</Text>
                <Text style={s.switchHint}>{t("mob.sale.exchangeHint")}</Text>
              </View>
              <Switch value={exchange} onValueChange={setExchange} />
            </View>
          </>
        )}

        {/* ══ 4: surat va joy ══ */}
        {step === 4 && (
          <>
            <Text style={s.label}>
              {t("mob.sale.photos", { n: photos.length, max: MAX_PHOTOS })}
            </Text>
            <View style={s.shots}>
              {photos.map((p, i) => (
                <Pressable
                  key={p.uri}
                  style={s.shot}
                  onPress={() => setPhotos((x) => x.filter((y) => y.uri !== p.uri))}
                >
                  <Image source={{ uri: p.uri }} style={s.shotImg} />
                  {i === 0 && (
                    <View style={s.mainTag}>
                      <Text style={s.mainTagText}>{t("mob.sale.mainPhoto")}</Text>
                    </View>
                  )}
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
            <Text style={s.hint}>{t("mob.sale.photoHint")}</Text>

            <View style={s.line} />

            <Text style={s.label}>{t("mob.sale.where")}</Text>
            <Pressable style={s.locBtn} onPress={() => setPicking(true)}>
              <Icon name="border" size={17} stroke={color.mutedForeground} />
              <Text style={[s.locText, !loc && s.locPh]}>
                {loc?.name ?? t("mob.sale.wherePh")}
              </Text>
            </Pressable>

            <Field
              label={t("mob.sale.address")}
              value={address}
              onChangeText={setAddress}
              placeholder={t("mob.sale.addressPh")}
            />

            <View style={s.line} />

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>{t("mob.market.docsReady")}</Text>
                <Text style={s.switchHint}>{t("mob.sale.docsHint")}</Text>
              </View>
              <Switch value={hasDocs} onValueChange={setHasDocs} />
            </View>

            {/* Suratsiz e'lon — to'silmaydi, ogohlantiriladi */}
            {photos.length === 0 && (
              <View style={s.warn}>
                <Text style={s.warnText}>{t("mob.sale.noPhotoWarn")}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[s.foot, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          title={step === 4 ? t("mob.sale.publish") : t("mob.common.next")}
          onPress={() => (step === 4 ? void submit() : setStep(step + 1))}
          disabled={!canNext}
          loading={busy}
        />
      </View>

      <LocationPicker
        open={picking}
        title={t("mob.sale.where")}
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

  lead: { fontSize: 14, color: color.mutedForeground, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, marginBottom: 5 },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 18 },

  veh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 12,
    padding: 11,
  },
  vehOn: { borderWidth: 2, borderColor: color.brand },
  vehShot: { width: 44, height: 44, borderRadius: 9, backgroundColor: color.muted },
  vehShotEmpty: { alignItems: "center", justifyContent: "center" },
  vehPlate: { fontSize: 14, fontWeight: "600", color: color.foreground },
  vehSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  why: {
    flexDirection: "row",
    gap: 8,
    padding: 11,
    borderRadius: 10,
    backgroundColor: color.brand + "12",
  },
  whyText: { flex: 1, fontSize: 12, color: "#9a3412", lineHeight: 18 },

  orRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: color.border },
  orText: { fontSize: 12, color: "#94a3b8" },

  ok: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: color.success + "14",
  },
  okText: { fontSize: 12, fontWeight: "500", color: "#15803d" },

  two: { flexDirection: "row", gap: 10 },
  area: { minHeight: 74, textAlignVertical: "top" },

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

  line: { height: 1, backgroundColor: color.border },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  switchTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  switchHint: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  suggest: { fontSize: 12, color: color.brand, fontWeight: "600" },

  shots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shot: { width: 106, height: 80, borderRadius: 10, overflow: "hidden", backgroundColor: color.muted },
  shotImg: { width: "100%", height: "100%" },
  mainTag: {
    position: "absolute",
    left: 6,
    top: 6,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: "#0f172a99",
    justifyContent: "center",
  },
  mainTagText: { fontSize: 9, fontWeight: "700", color: "#fff" },
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
    width: 106,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { fontSize: 11, fontWeight: "500", color: "#94a3b8" },

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

  warn: {
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
  },
  warnText: { fontSize: font.caption, color: "#92400e", lineHeight: 19 },

  foot: {
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
});
