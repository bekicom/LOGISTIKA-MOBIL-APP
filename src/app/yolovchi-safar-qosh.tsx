/**
 * Haydovchi: safar qo'shish (TZ 28-okt 50) — webdagi `/rides/new` formasining
 * o'zi: transport turi, oraliq shaharlar, bekatlar va «Doimiy marshrut».
 *
 *  · bir martalik safar → `POST /api/rides` (`ride-save`);
 *  · doimiy marshrut → `POST /api/rides/yolovchilar` (`jadval-saqla`):
 *    jadval bir marta qo'yiladi, keyingi 3 kunlik safarlar o'zi chiqadi.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Button, Field, Switch } from "@/components/ui";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { TariffNotice } from "@/components/TariffNotice";
import { tariffBlocked } from "@/lib/features";

type Fleet = { id: string; plate: string; brand: string; model: string | null };
type Pick = "from" | "to" | "stop" | null;

const TURLAR = ["SEDAN", "MINIVAN", "MARSHRUTKA", "BUS"];
const VALYUTA = ["UZS", "USD", "RUB", "KZT"];
const HAFTA = [1, 2, 3, 4, 5, 6, 7];

export default function YolovchiSafarQosh() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fleet = useApi<{ items: Fleet[] }>("/api/fleet/vehicles");

  const [from, setFrom] = useState<Loc | null>(null);
  const [to, setTo] = useState<Loc | null>(null);
  const [stops, setStops] = useState<Loc[]>([]);
  const [pick, setPick] = useState<Pick>(null);
  const [bekatlar, setBekatlar] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicleText, setVehicleText] = useState("");
  const [seats, setSeats] = useState("4");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [kun, setKun] = useState(0);
  const [soat, setSoat] = useState("07:00");
  const [doimiy, setDoimiy] = useState(false);
  const [kunlar, setKunlar] = useState<number[]>([]);
  const [pochta, setPochta] = useState(false);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const soatTogri = /^([01]\d|2[0-3]):[0-5]\d$/.test(soat);
  const tayyor = !!from && !!to && soatTogri && Number(seats) > 0 && Number(price) > 0 && (!!vehicleId || !!vehicleText.trim());

  /* Kun Toshkent vaqtida (web formasi ham `+05:00` yuboradi) */
  function jonash(): string {
    const d = new Date(Date.now() + kun * 86_400_000 + 5 * 3600_000);
    return `${d.toISOString().slice(0, 10)}T${soat}:00+05:00`;
  }

  async function saqla() {
    if (!from || !to) return;
    /* Tarif to'sig'i oldindan aytiladi (qoida 5) */
    if (tariffBlocked("passenger")) return;
    setBand(true);
    setXato(null);
    const umumiy = {
      fromLocationId: from.id,
      toLocationId: to.id,
      stops: stops.map((x) => x.id),
      pickupPoints: bekatlar.split(",").map((x) => x.trim()).filter(Boolean),
      vehicleId,
      vehicleText: vehicleId ? null : vehicleText.trim(),
      vehicleKind: kind,
      seatsTotal: Number(seats),
      pricePerSeat: Number(price),
      currency,
      acceptsParcels: pochta,
    };
    try {
      if (doimiy) {
        await api("/api/rides/yolovchilar", {
          method: "POST",
          body: { action: "jadval-saqla", ...umumiy, departTime: soat, weekdays: kunlar },
        });
      } else {
        await api("/api/rides", { method: "POST", body: { action: "ride-save", ...umumiy, departAt: jonash() } });
      }
      router.replace("/yolovchi-safarlarim" as never);
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : String(e));
    } finally {
      setBand(false);
    }
  }

  const chip = (faol: boolean) => [s.chip, faol && s.chipOn];
  const chipText = (faol: boolean) => [s.chipText, faol && { color: "#ffffff" }];
  const joyQatori = (label: string, l: Loc | null, p: Pick) => (
    <Pressable onPress={() => setPick(p)} style={s.tanla} accessibilityRole="button">
      <Text style={s.tanlaLabel}>{label}</Text>
      <Text style={s.tanlaQiymat}>{l?.name ?? t("yolovchi.tanlang")}</Text>
    </Pressable>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/yolovchi-safarlarim" as never))} hitSlop={8} style={s.back} accessibilityRole="button">
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {t("yolovchi.safarQoshish")}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + space.xl }]} keyboardShouldPersistTaps="handled">
        <TariffNotice feature="passenger" />
        {joyQatori(t("yolovchi.qayerdan"), from, "from")}
        {joyQatori(t("yolovchi.qayerga"), to, "to")}

        <Text style={s.bosh}>{t("yolovchi.oraliq")}</Text>
        <View style={s.chiplar}>
          {stops.map((x) => (
            <Pressable key={x.id} onPress={() => setStops(stops.filter((y) => y.id !== x.id))} style={chip(true)} accessibilityRole="button">
              <Text style={chipText(true)}>{x.name} ✕</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setPick("stop")} style={chip(false)} accessibilityRole="button">
            <Text style={chipText(false)}>+</Text>
          </Pressable>
        </View>
        <Field label={t("yolovchi.bekatlar")} value={bekatlar} onChangeText={setBekatlar} placeholder={t("yolovchi.bekatlarMisol")} />

        <Text style={s.bosh}>{t("yolovchi.transportTuri")}</Text>
        <View style={s.chiplar}>
          {TURLAR.map((k) => (
            <Pressable key={k} onPress={() => setKind(kind === k ? null : k)} style={chip(kind === k)} accessibilityRole="radio" accessibilityState={{ selected: kind === k }}>
              <Text style={chipText(kind === k)}>{t(`yolovchi.tur_${k}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.bosh}>{t("yolovchi.mashina")}</Text>
        <View style={s.chiplar}>
          {(fleet.data?.items ?? []).map((v) => (
            <Pressable key={v.id} onPress={() => setVehicleId(vehicleId === v.id ? null : v.id)} style={chip(vehicleId === v.id)} accessibilityRole="radio" accessibilityState={{ selected: vehicleId === v.id }}>
              <Text style={chipText(vehicleId === v.id)}>
                {v.plate} · {v.brand}
              </Text>
            </Pressable>
          ))}
        </View>
        {!vehicleId ? <Field label={t("yolovchi.mashinaMatn")} value={vehicleText} onChangeText={setVehicleText} placeholder="Chevrolet Cobalt · 01 A 123 AA" /> : null}

        <View style={s.qator}>
          <View style={{ flex: 1 }}>
            <Field label={t("yolovchi.orinlar")} value={seats} onChangeText={(v) => setSeats(v.replace(/\D/g, ""))} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t("yolovchi.narx")} value={price} onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={s.chiplar}>
          {VALYUTA.map((c) => (
            <Pressable key={c} onPress={() => setCurrency(c)} style={chip(currency === c)} accessibilityRole="radio" accessibilityState={{ selected: currency === c }}>
              <Text style={chipText(currency === c)}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.switchQator}>
          <Text style={s.bosh}>{t("yolovchi.doimiyMarshrut")}</Text>
          <Switch value={doimiy} onValueChange={setDoimiy} />
        </View>
        {doimiy ? (
          <>
            <Text style={s.meta}>{t("yolovchi.doimiyIzoh")}</Text>
            <View style={s.chiplar}>
              {HAFTA.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setKunlar(kunlar.includes(d) ? kunlar.filter((x) => x !== d) : [...kunlar, d])}
                  style={chip(kunlar.includes(d))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: kunlar.includes(d) }}
                >
                  <Text style={chipText(kunlar.includes(d))}>{t(`yolovchi.hafta${d}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.meta}>{t("yolovchi.harKuniIzoh")}</Text>
          </>
        ) : (
          <View style={s.chiplar}>
            {[0, 1, 2].map((k) => (
              <Pressable key={k} onPress={() => setKun(k)} style={chip(kun === k)} accessibilityRole="radio" accessibilityState={{ selected: kun === k }}>
                <Text style={chipText(kun === k)}>{t(k === 0 ? "yolovchi.bugun" : k === 1 ? "yolovchi.ertaga" : "yolovchi.indinga")}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Field
          label={t("yolovchi.jonashVaqti")}
          value={soat}
          onChangeText={setSoat}
          placeholder="07:00"
          keyboardType="numbers-and-punctuation"
          error={soatTogri ? undefined : t("yolovchi.errBAD_TIME")}
        />

        <View style={s.switchQator}>
          <Text style={s.bosh}>{t("yolovchi.pochtaOladi")}</Text>
          <Switch value={pochta} onValueChange={setPochta} />
        </View>

        {xato ? <Text style={{ color: color.danger, fontSize: 13.5 }}>{xato}</Text> : null}
        <Button title={t("yolovchi.saqlash")} loading={band} disabled={!tayyor} onPress={() => void saqla()} />
      </ScrollView>

      <LocationPicker
        open={pick !== null}
        title={pick === "to" ? t("yolovchi.qayerga") : pick === "stop" ? t("yolovchi.oraliq") : t("yolovchi.qayerdan")}
        onClose={() => setPick(null)}
        onPick={(l) => {
          if (pick === "from") setFrom(l);
          else if (pick === "to") setTo(l);
          else if (!stops.some((x) => x.id === l.id)) setStops([...stops, l]);
          setPick(null);
        }}
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  body: { padding: space.lg, gap: space.md },
  bosh: { fontSize: 14, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12.5, color: color.mutedForeground },
  qator: { flexDirection: "row", gap: space.md },
  switchQator: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  chiplar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.foreground },
  tanla: { padding: 12, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, gap: 2 },
  tanlaLabel: { fontSize: 12, color: color.mutedForeground },
  tanlaQiymat: { fontSize: 15, fontWeight: "700", color: color.foreground },
}));
