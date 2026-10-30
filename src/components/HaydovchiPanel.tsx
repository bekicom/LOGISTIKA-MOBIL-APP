/**
 * Haydovchi «Mening ishim» (TZ 29-okt §6) — webdagi
 * `components/haydovchi/haydovchi-panel.tsx` bilan bir xil:
 * «Ishga chiqdim» (2 savol → bo'sh transport e'loni), tez tugmalar,
 * pul hisobi valyuta bo'yicha, aylanma reys kartasi.
 * Valyutalar QO'SHILMAYDI (2-qoida). Server: `/api/ishga-chiqish`, `/api/haydovchi-panel`.
 */
import { useState } from "react";
import { Linking, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { api, type FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, themed } from "@/lib/theme";
import { budgetCategoryLabel, t, tripStatusLabel } from "@/lib/i18n";

type Money = { currency: string; amount: number };
type Faol = { truckId: string; slug: string; from: string; to: string; istalgan: boolean; plate: string | null };
type Ish = {
  faol: Faol | null;
  joy: { id: number; nom: string } | null;
  yonalishlar: { id: number; nom: string }[];
  mashinalar: { vehicleId: string; plate: string; turi: string; band: boolean }[];
};
type Qator =
  | { tur: "reys"; tripId: string; furamNo: number; from: string; to: string; yuk: string; status: string; daromad: Money[]; xarajat: Money[]; foyda: Money[] }
  | { tur: "bosh"; from: string; to: string };
type Panel = {
  reys: { id: string; furamNo: number } | null;
  ega: { ism: string; phone: string | null } | null;
  pul: {
    qoldiq: Money[];
    keldi: { manba: string; summa: Money[] }[];
    ketdi: { tur: string; summa: Money[] }[];
    almashtirish: { from: Money; to: Money; rate: number }[];
  };
  aylanma: { tourId: string; qatorlar: Qator[]; jami: { daromad: Money[]; xarajat: Money[]; sof: Money[]; oylik: Money[] } } | null;
};
type Mos = { id: string; href: string; title: string; score: number };

const fmt = (m: Money[]) =>
  m.length ? m.map((x) => `${new Intl.NumberFormat("ru-RU").format(x.amount)} ${x.currency}`).join(" · ") : "—";

export function HaydovchiPanel() {
  const router = useRouter();
  const ish = useApi<Ish>("/api/ishga-chiqish");
  const panel = useApi<Panel>("/api/haydovchi-panel");
  const [savol, setSavol] = useState<Ish | null>(null);
  const [joyXato, setJoyXato] = useState(false);
  const [yon, setYon] = useState<number | null | undefined>(undefined);
  const [mashina, setMashina] = useState<string | null>(null);
  const [band, setBand] = useState(false);
  const [mos, setMos] = useState<Mos[] | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  async function boshla() {
    setJoyXato(false);
    setSavol({ faol: null, joy: null, yonalishlar: [], mashinalar: ish.data?.mashinalar ?? [] });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return setJoyXato(true);
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const j = await api<Ish>(`/api/ishga-chiqish?lat=${p.coords.latitude}&lng=${p.coords.longitude}`);
      setSavol(j);
      setMashina(j.mashinalar.find((m) => !m.band)?.vehicleId ?? j.mashinalar[0]?.vehicleId ?? null);
      if (!j.joy) setJoyXato(true);
    } catch {
      setJoyXato(true);
    }
  }

  async function tasdiq() {
    if (!savol?.joy || !mashina || yon === undefined) return;
    setBand(true);
    setXato(null);
    try {
      const r = await api<{ mos: Mos[] }>("/api/ishga-chiqish", {
        method: "POST",
        body: { fromLocationId: savol.joy.id, toLocationId: yon, vehicleId: mashina },
      });
      setMos(r.mos);
      setSavol(null);
      ish.reload();
    } catch (e) {
      setXato((e as FuramError).message ?? t("tz5e.panelXato"));
    } finally {
      setBand(false);
    }
  }

  async function toxtat() {
    setBand(true);
    await api("/api/ishga-chiqish", { method: "DELETE" }).catch(() => null);
    setBand(false);
    setMos(null);
    ish.reload();
  }

  const p = panel.data;
  const faol = ish.data?.faol;
  const tez: { k: string; on: () => void }[] = [
    { k: "tz5e.hujjatlarSkaner", on: () => router.push("/hujjatlarim" as never) },
    { k: "tz5e.xarajatQoshish", on: () => router.push((p?.reys ? `/reys/${p.reys.id}/xarajatlar` : "/reyslar") as never) },
    { k: "tz5e.texnikYordam", on: () => router.push("/texnik-yordam" as never) },
    { k: "tz5e.meningReysim", on: () => router.push((p?.reys ? `/reys/${p.reys.id}` : "/reyslar") as never) },
    ...(p?.ega?.phone ? [{ k: "tz5e.egamgaQongiroq", on: () => void Linking.openURL(`tel:${p.ega!.phone}`) }] : []),
  ];

  return (
    <View style={{ gap: 12 }}>
      {/* ── «Ishga chiqdim» / «Ishdaman» (§6.1) */}
      {faol ? (
        <View style={[s.card, { borderColor: color.success, borderWidth: 1 }]}>
          <View style={s.qator}>
            <Text style={s.ishdaman}>{t("tz5e.ishdaman")}</Text>
            <Text style={s.elonda}>{t("tz5e.elonda")}</Text>
          </View>
          <Text style={s.sarlavha}>
            {faol.from} → {faol.istalgan ? t("tz5e.istalganYonalish") : faol.to}
          </Text>
          <Text style={s.sub}>✓ {t("tz5e.egagaXabarKetdi")}</Text>
          {mos ? (
            <View style={{ gap: 4 }}>
              <Text style={s.label}>🤖 {t("tz5e.aiMosYuklar")}</Text>
              {mos.length ? (
                mos.map((m) => (
                  <Tap key={m.id} onPress={() => router.push(`/yuk/${m.id}`)}>
                    <Text style={s.mosQator} numberOfLines={1}>
                      <Text style={{ color: color.brand, fontWeight: "800" }}>{m.score}%</Text> {m.title}
                    </Text>
                  </Tap>
                ))
              ) : (
                <Text style={s.sub}>{t("tz5e.mosYukYoq")}</Text>
              )}
            </View>
          ) : (
            <Tap onPress={() => router.push({ pathname: "/moslar/[kind]/[id]", params: { kind: "mashina", id: faol.truckId } })}>
              <Text style={s.havola}>🤖 {t("tz5e.aiMosYuklar")} →</Text>
            </Tap>
          )}
          <Tap onPress={() => void toxtat()} disabled={band} style={s.toxtat}>
            <Text style={s.toxtatTxt}>{t("tz5e.ishniToxtatdim")}</Text>
          </Tap>
        </View>
      ) : savol ? (
        <View style={s.card}>
          <Text style={s.label}>📍 {t("tz5e.joyingiz")}</Text>
          <Text style={s.sarlavha}>{savol.joy ? savol.joy.nom : joyXato ? t("tz5e.joyTopilmadi") : t("tz5e.joyAniqlanmoqda")}</Text>
          {savol.joy ? (
            <>
              <Text style={s.label}>{t("tz5e.yonalishSavol")}</Text>
              <View style={s.chips}>
                {[{ id: null as number | null, nom: t("tz5e.istalganYonalish") }, ...savol.yonalishlar].map((y) => (
                  <Tap key={String(y.id)} onPress={() => setYon(y.id)} feel="select" style={[s.chip, yon === y.id && s.chipOn]}>
                    <Text style={[s.chipTxt, yon === y.id && { color: "#ffffff" }]}>{y.nom}</Text>
                  </Tap>
                ))}
              </View>
            </>
          ) : null}
          <Text style={s.label}>{t("tz5e.mashinaSavol")}</Text>
          {savol.mashinalar.length ? (
            <View style={s.chips}>
              {savol.mashinalar.map((m) => (
                <Tap key={m.vehicleId} onPress={() => setMashina(m.vehicleId)} feel="select" style={[s.chip, mashina === m.vehicleId && s.chipOn]}>
                  <Text style={[s.chipTxt, mashina === m.vehicleId && { color: "#ffffff" }]}>
                    {m.plate} · {m.turi}
                  </Text>
                </Tap>
              ))}
            </View>
          ) : (
            <Text style={[s.sub, { color: color.danger }]}>{t("tz5e.mashinaYoq")}</Text>
          )}
          <Tap
            onPress={() => void tasdiq()}
            feel="action"
            disabled={band || !savol.joy || !mashina || yon === undefined}
            style={[s.katta, (band || !savol.joy || !mashina || yon === undefined) && { opacity: 0.5 }]}
          >
            <Text style={s.kattaTxt}>{t("tz5e.tasdiqlashElon")}</Text>
          </Tap>
          {xato ? <Text style={[s.sub, { color: color.danger }]}>{xato}</Text> : null}
        </View>
      ) : (
        <Tap onPress={() => void boshla()} feel="action" style={s.katta}>
          <Text style={s.kattaTxt}>🚛 {t("tz5e.ishgaChiqdim")}</Text>
          <Text style={s.kattaSub}>{t("tz5e.ishgaChiqSub")}</Text>
        </Tap>
      )}

      {/* ── Tez tugmalar (§6.1.2) */}
      <View style={s.chips}>
        {tez.map((x) => (
          <Tap key={x.k} onPress={x.on} style={s.tez}>
            <Text style={s.tezTxt}>{t(x.k)}</Text>
          </Tap>
        ))}
      </View>

      {/* ── Pul hisobi (§6.3) */}
      {p ? (
        <View style={s.card}>
          <Text style={s.label}>{t("tz5e.pulHisobi")}</Text>
          <View style={s.chips}>
            {p.pul.qoldiq.length ? (
              p.pul.qoldiq.map((m) => (
                <Text key={m.currency} style={[s.qoldiq, { color: m.amount < 0 ? color.danger : color.success }]}>
                  {fmt([m])}
                </Text>
              ))
            ) : (
              <Text style={s.sub}>{t("tz5e.qolimdagiPul")}: —</Text>
            )}
          </View>
          {p.pul.keldi.length ? <Text style={s.label}>{t("tz5e.pulKeldi")}</Text> : null}
          {p.pul.keldi.map((k) => (
            <Text key={k.manba} style={s.sub}>
              {t(`tz5e.manba_${k.manba}`)}: {fmt(k.summa)}
            </Text>
          ))}
          {p.pul.ketdi.length ? <Text style={s.label}>{t("tz5e.pulKetdi")}</Text> : null}
          {p.pul.ketdi.map((k) => (
            <Text key={k.tur} style={s.sub}>
              {budgetCategoryLabel(k.tur)}: {fmt(k.summa)}
            </Text>
          ))}
          {p.pul.almashtirish.slice(0, 3).map((a, i) => (
            <Text key={i} style={s.sub}>
              {fmt([a.from])} → {fmt([a.to])} ({t("tz5e.kurs")} {a.rate.toFixed(4)})
            </Text>
          ))}
          <Text style={s.izoh}>{t("tz5e.qoldiqOtkazildi")}</Text>
        </View>
      ) : null}

      {/* ── Aylanma reys (§6.2) */}
      {p?.aylanma && p.aylanma.qatorlar.length ? (
        <View style={s.card}>
          <Text style={s.label}>{t("tz5e.aylanmaTitle")}</Text>
          {p.aylanma.qatorlar.map((q, i) =>
            q.tur === "bosh" ? (
              <Text key={`b${i}`} style={s.sub}>
                — {q.from} → {q.to} · {t("tz5e.boshBolak")}
              </Text>
            ) : (
              <Tap key={q.tripId} onPress={() => router.push(`/reys/${q.tripId}`)} style={s.leg}>
                <Text style={s.legNom}>
                  #{q.furamNo} {q.from} → {q.to}
                </Text>
                <Text style={s.sub}>
                  {q.yuk} · {tripStatusLabel(q.status)}
                </Text>
                <Text style={s.sub}>
                  {t("tz5e.daromad")}: {fmt(q.daromad)} · {t("tz5e.xarajat")}: {fmt(q.xarajat)} · {t("tz5e.foyda")}: {fmt(q.foyda)}
                </Text>
              </Tap>
            ),
          )}
          <Text style={s.jami}>
            {t("tz5e.jamiDaromad")}: {fmt(p.aylanma.jami.daromad)}
          </Text>
          <Text style={s.jami}>
            {t("tz5e.jamiXarajat")}: {fmt(p.aylanma.jami.xarajat)}
          </Text>
          <Text style={s.jami}>
            {t("tz5e.sofFoyda")}: {fmt(p.aylanma.jami.sof)}
          </Text>
          <Text style={s.jami}>
            {t("tz5e.haydovchiOyligi")}: {fmt(p.aylanma.jami.oylik)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const s = themed(() => ({
  card: { padding: 14, gap: 8, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  qator: { flexDirection: "row", gap: 6, alignItems: "center" },
  ishdaman: { fontSize: 12, fontWeight: "800", color: "#ffffff", backgroundColor: color.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: "hidden" },
  elonda: { fontSize: 11, fontWeight: "800", color: color.success },
  sarlavha: { fontSize: 16, fontWeight: "800", color: color.foreground },
  label: { fontSize: 11, fontWeight: "800", color: color.mutedForeground, textTransform: "uppercase" },
  sub: { fontSize: 13, color: color.mutedForeground },
  izoh: { fontSize: 11, color: color.mutedForeground },
  havola: { fontSize: 14, fontWeight: "700", color: color.brand },
  mosQator: { fontSize: 14, color: color.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipTxt: { fontSize: 13, fontWeight: "700", color: color.foreground },
  katta: { padding: 16, borderRadius: radius.card, backgroundColor: color.success, gap: 2 },
  kattaTxt: { fontSize: 17, fontWeight: "800", color: "#ffffff" },
  kattaSub: { fontSize: 12, color: "#ffffffd9" },
  toxtat: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: color.danger },
  toxtatTxt: { fontSize: 13, fontWeight: "800", color: color.danger },
  tez: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  tezTxt: { fontSize: 13, fontWeight: "700", color: color.foreground },
  qoldiq: { fontSize: 16, fontWeight: "800" },
  leg: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: color.border, gap: 2 },
  legNom: { fontSize: 14, fontWeight: "800", color: color.foreground },
  jami: { fontSize: 13, fontWeight: "700", color: color.foreground },
}));
