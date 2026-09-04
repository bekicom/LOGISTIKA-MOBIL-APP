/**
 * U4c — usta profili.
 *
 * ── BIR MARTA TO'LDIRILADI ──────────────────────────────────────
 *
 * Shuning uchun u panelning ichida, pastda turadi: usta har kuni
 * taklif beradi, profilni esa yiliga bir marta ochadi.
 *
 * ── MUTAXASSISLIK MAJBURIY ──────────────────────────────────────
 *
 * Usta buyurtmalarni aynan shu bo'yicha oladi (`hasSome`). Bo'sh
 * qoldirilsa unga hech narsa kelmasdi va u «ilova ishlamayapti»
 * deb o'ylardi. Server ham buni talab qiladi.
 *
 * ── MOBIL BO'LSA RADIUS SHART ───────────────────────────────────
 *
 * «Boraman» deb radius yozmasa, buyurtmalar qayerdan kelishi
 * noma'lum bo'lardi. Server `RADIUS_REQUIRED` qaytaradi, forma
 * esa uni oldindan aytadi.
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
import { Button, Field, Header, Switch } from "@/components/ui";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { serviceSpecLabel, serviceVehicleKindLabel, t } from "@/lib/i18n";
import { color, space } from "@/lib/theme";

const SPECS = [
  "engine", "gearbox", "chassis", "electric", "diagnostic", "ac",
  "brakes", "steering", "electronics", "welder", "body", "tyre",
  "vulcan", "fuel", "trailer", "tractor",
] as const;

/** `furam/src/lib/service.ts:VEHICLE_KINDS` */
const KINDS = [
  "fura", "tractor", "trailer", "gazel", "isuzu", "bongo",
  "porter", "minibus", "labo", "car", "special",
] as const;

const RADIUS = [20, 50, 100, 200] as const;

type Profile = {
  name: string | null;
  about: string | null;
  specialities: string[];
  vehicleKinds: string[];
  mobile: boolean;
  radiusKm: number | null;
  address: string | null;
  workHours: string | null;
  phone: string | null;
  priceNote: string | null;
  isApproved: boolean;
};

export default function UstaProfil() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, reload } = useApi<{ profile: Profile | null }>(
    "/api/service/master",
  );

  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [mobile, setMobile] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [picking, setPicking] = useState(false);
  const [address, setAddress] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [phone, setPhone] = useState("");
  const [priceNote, setPriceNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* Bor profil formaga tushadi: tahrirlash yangi yozuv emas,
     shu yozuvning davomi. */
  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setName(p.name ?? "");
    setAbout(p.about ?? "");
    setSpecs(p.specialities);
    setKinds(p.vehicleKinds);
    setMobile(p.mobile);
    setRadiusKm(p.radiusKm);
    setAddress(p.address ?? "");
    setWorkHours(p.workHours ?? "");
    setPhone(p.phone ?? "");
    setPriceNote(p.priceNote ?? "");
  }, [data]);

  const ready = specs.length > 0 && (!mobile || !!radiusKm);

  const toggle = (list: string[], set: (v: string[]) => void, k: string) =>
    set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      await api("/api/service", {
        method: "POST",
        body: {
          action: "profile",
          name: name.trim() || null,
          about: about.trim() || null,
          specialities: specs,
          vehicleKinds: kinds,
          mobile,
          radiusKm: mobile ? radiusKm : null,
          locationId: loc?.id ?? null,
          address: address.trim() || null,
          workHours: workHours.trim() || null,
          phone: phone.trim() || null,
          priceNote: priceNote.trim() || null,
        },
      });
      router.back();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.svc.myProfile")} subtitle={t("mob.svc.profileSub")} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {err ? <ErrorBox message={err} /> : null}

            <Field
              label={t("mob.svc.shopName")}
              value={name}
              onChangeText={setName}
              placeholder={t("mob.svc.shopNamePh")}
            />

            <View>
              <Text style={s.label}>{t("mob.svc.specialities")}</Text>
              <View style={s.picks}>
                {SPECS.map((k) => (
                  <Pressable
                    key={k}
                    style={[s.pick, specs.includes(k) && s.pickOn]}
                    onPress={() => toggle(specs, setSpecs, k)}
                  >
                    <Text style={[s.pickText, specs.includes(k) && s.pickTextOn]}>
                      {serviceSpecLabel(k)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.hint}>{t("mob.svc.specialitiesHint")}</Text>
            </View>

            <View>
              <Text style={s.label}>{t("mob.svc.vehicleKinds")}</Text>
              <View style={s.picks}>
                {KINDS.map((k) => (
                  <Pressable
                    key={k}
                    style={[s.pick, kinds.includes(k) && s.pickOn]}
                    onPress={() => toggle(kinds, setKinds, k)}
                  >
                    <Text style={[s.pickText, kinds.includes(k) && s.pickTextOn]}>
                      {serviceVehicleKindLabel(k)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.hint}>{t("mob.svc.vehicleKindsHint")}</Text>
            </View>

            <View style={s.line} />

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>{t("mob.svc.iCome")}</Text>
                <Text style={s.switchHint}>{t("mob.svc.iComeHint")}</Text>
              </View>
              <Switch value={mobile} onValueChange={setMobile} />
            </View>

            {mobile && (
              <View>
                <Text style={s.label}>{t("mob.svc.radius")}</Text>
                <View style={s.picks}>
                  {RADIUS.map((r) => (
                    <Pressable
                      key={r}
                      style={[s.pick, radiusKm === r && s.pickOn]}
                      onPress={() => setRadiusKm(r)}
                    >
                      <Text style={[s.pickText, radiusKm === r && s.pickTextOn]}>{r} km</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={s.line} />

            <View>
              <Text style={s.label}>{t("mob.svc.city")}</Text>
              <Pressable style={s.locBtn} onPress={() => setPicking(true)}>
                <Text style={[s.locText, !loc && s.locPh]}>
                  {loc?.name ?? t("mob.sale.wherePh")}
                </Text>
              </Pressable>
            </View>

            <Field
              label={t("mob.sale.address")}
              value={address}
              onChangeText={setAddress}
              placeholder={t("mob.sale.addressPh")}
            />
            <Field
              label={t("mob.svc.workHours")}
              value={workHours}
              onChangeText={setWorkHours}
              placeholder={t("mob.svc.workHoursPh")}
            />
            <Field
              label={t("mob.svc.phone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+998 90 123 45 67"
            />
            <Field
              label={t("mob.svc.priceNote")}
              value={priceNote}
              onChangeText={setPriceNote}
              placeholder={t("mob.svc.priceNotePh")}
            />
            <Field
              label={t("mob.svc.about")}
              value={about}
              onChangeText={setAbout}
              placeholder={t("mob.svc.aboutPh")}
              multiline
              style={s.area}
            />

            <Button
              title={t("mob.common.save")}
              onPress={() => void save()}
              disabled={!ready}
              loading={busy}
            />

            {!data?.profile && <Text style={s.note}>{t("mob.svc.approveNote")}</Text>}
          </>
        )}
      </ScrollView>

      <LocationPicker
        open={picking}
        title={t("mob.svc.city")}
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
  scroll: { padding: space.lg, gap: space.md },

  label: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, marginBottom: 5 },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: 6 },
  note: { fontSize: 12, color: color.mutedForeground, textAlign: "center", lineHeight: 18 },
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
  switchHint: { fontSize: 12, color: color.mutedForeground, marginTop: 1, lineHeight: 17 },

  locBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    backgroundColor: color.card,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  locText: { fontSize: 15, color: color.foreground },
  locPh: { color: "#94a3b8" },
});
