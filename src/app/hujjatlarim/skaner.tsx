/**
 * Skaner — PDF qilish (TZ 29-okt §5.2–5.4), web `/hujjatlar/skaner` egizagi.
 *
 * Suratga olish yoki galereyadan → chegara SERVERDA topiladi → burchaklarni
 * barmoq bilan surish → sahifalar (qo'shish, o'chirish, tartib) → bitta
 * PDF (A4 yoki karta asl o'lchamida) → AI turini aniqlab o'zi joylaydi.
 *
 * ⚠️ NATIV SKANER (Google ML Kit / Apple VisionKit) — keyingi do'kon
 * buildida: nativ modul qo'shish ilovani do'kondan qayta chiqarishni talab
 * qiladi. Hozirgi yo'l OTA bilan yetadi va natija web bilan bir xil.
 *
 * Parametrlar: `trip`, `vehicle`, `chat` — «PDF qilish» qayerdan bosilgan
 * (§5.5). Chatdan kelsa tayyor PDF o'sha chatga yuboriladi.
 */
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Button, Card, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { SkanerRamka, type Burchaklar } from "@/components/SkanerRamka";
import { HujjatYuborish } from "@/components/HujjatYuborish";
import { api, apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { openRemoteFile } from "@/lib/files";
import { t } from "@/lib/i18n";
import { color, font, radius, space, themed } from "@/lib/theme";

type Sahifa = { id: string; foto: Photo; burchaklar: Burchaklar; topildi: boolean | null };
type Variant = { id: string; nom: string };
type Natija =
  | { holat: "joylandi"; manzil: string; nom: string | null; href: string | null }
  | { holat: "savol"; savol: "tur" | "mashina" | "reys"; variantlar: Variant[] }
  | { holat: "xato"; kod: string };
type Maydon = { tur: string; muddat: string | null };

const RAMKA: Burchaklar = [
  [0.04, 0.04],
  [0.96, 0.04],
  [0.96, 0.96],
  [0.04, 0.96],
];
const MAX_SAHIFA = 20;

export default function Skaner() {
  const router = useRouter();
  const p = useLocalSearchParams<{ trip?: string; vehicle?: string; chat?: string }>();
  const [sahifalar, setSahifalar] = useState<Sahifa[]>([]);
  const [tahrir, setTahrir] = useState<string | null>(null);
  const [rejim, setRejim] = useState<"a4" | "karta">("a4");
  const [filtr, setFiltr] = useState<"rang" | "asl">("rang");
  const [nom, setNom] = useState("");
  const [band, setBand] = useState<"saqlash" | "ai" | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [hujjat, setHujjat] = useState<{ id: string; nom: string; ulash: string } | null>(null);
  const [natija, setNatija] = useState<Natija | null>(null);
  const [maydon, setMaydon] = useState<Maydon | null>(null);
  const [yuborOchiq, setYuborOchiq] = useState(false);

  const qosh = async (fotolar: Photo[]) => {
    if (!fotolar.length) return;
    const yangi = fotolar.slice(0, MAX_SAHIFA - sahifalar.length).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      foto: f,
      burchaklar: RAMKA,
      topildi: null as boolean | null,
    }));
    setSahifalar((s) => [...s, ...yangi]);
    if (yangi.length === 1) setTahrir(yangi[0].id);
    await Promise.all(
      yangi.map(async (s) => {
        const r = await apiUpload<{ burchaklar: Burchaklar; topildi: boolean }>("/api/skaner/aniqla", {}, [
          toUpload(s.foto, "rasm"),
        ]).catch(() => null);
        setSahifalar((all) =>
          all.map((x) => (x.id === s.id ? { ...x, burchaklar: r?.burchaklar ?? x.burchaklar, topildi: !!r?.topildi } : x)),
        );
      }),
    );
  };

  const surish = (i: number, d: -1 | 1) =>
    setSahifalar((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const javob = async (tur: string, tanlov: { vehicleId?: string; tripId?: string } = {}) => {
    if (!hujjat) return;
    setBand("ai");
    const r = await api<{ natija: Natija }>("/api/skaner/joyla", {
      method: "POST",
      body: { documentId: hujjat.id, tur, ...tanlov },
    }).catch(() => null);
    setBand(null);
    if (r?.natija) {
      setMaydon((m) => (m ? { ...m, tur } : { tur, muddat: null }));
      setNatija(r.natija);
    } else setNatija({ holat: "xato", kod: "generic" });
  };

  const saqla = async () => {
    if (!sahifalar.length || band) return;
    setXato(null);
    setBand("saqlash");
    try {
      const r = await apiUpload<{ document: { id: string; name: string }; ulash: string }>(
        "/api/skaner/pdf",
        { burchaklar: JSON.stringify(sahifalar.map((s) => s.burchaklar)), rejim, filtr, nom },
        sahifalar.map((s) => toUpload(s.foto, "rasm")),
      );
      setHujjat({ id: r.document.id, nom: r.document.name, ulash: r.ulash });
      if (p.chat) {
        await api(`/api/chat/${p.chat}/hujjat`, { method: "POST", body: { manba: "shaxsiy", documentId: r.document.id } }).catch(
          () => null,
        );
        router.back();
        return;
      }
      setBand("ai");
      const a = await api<{ maydon: Maydon; natija: Natija }>("/api/skaner/ajrat", {
        method: "POST",
        body: { documentId: r.document.id, tripId: p.trip, vehicleId: p.vehicle },
        timeoutMs: 60000,
      }).catch(() => null);
      setBand(null);
      if (a?.natija) {
        setMaydon(a.maydon);
        setNatija(a.natija);
      } else setNatija({ holat: "xato", kod: "generic" });
    } catch (e) {
      setBand(null);
      setXato(e instanceof FuramError ? e.message : t("skaner.err.generic"));
    }
  };

  const qayta = () => {
    setSahifalar([]);
    setHujjat(null);
    setNatija(null);
    setMaydon(null);
    setNom("");
  };

  const tahrirdagi = sahifalar.find((s) => s.id === tahrir);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("skaner.title")} subtitle={t("skaner.bigBtnHint")} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" scrollEnabled={!tahrir}>
        {hujjat ? (
          <Card>
            <Text style={s.saqlandi}>✓ {t("skaner.saved")}</Text>
            <Text style={s.izoh} numberOfLines={1}>
              {hujjat.nom}
            </Text>
            {band === "ai" && <Text style={s.band}>{t("skaner.aiReading")}</Text>}
            {natija?.holat === "joylandi" && (
              <View style={s.yashil}>
                <Text style={s.yashilMatn}>
                  {maydon?.tur ? `${t(`skaner.tur.${maydon.tur}`)} — ` : ""}
                  {t(`skaner.placed.${natija.manzil}`, { nom: natija.nom ?? "" })}
                </Text>
                {!!maydon?.muddat && <Text style={s.izoh}>{t("skaner.expiry", { d: maydon.muddat })}</Text>}
              </View>
            )}
            {natija?.holat === "savol" && (
              <View style={{ marginTop: space.md }}>
                <Text style={s.savol}>
                  {natija.savol === "tur"
                    ? t("skaner.askType")
                    : natija.savol === "mashina"
                      ? t("skaner.askVehicle")
                      : t("skaner.askTrip")}
                </Text>
                <View style={s.chiplar}>
                  {natija.variantlar.map((v) => (
                    <Pressable
                      key={v.id}
                      disabled={!!band}
                      onPress={() =>
                        natija.savol === "tur"
                          ? javob(v.id, { tripId: p.trip, vehicleId: p.vehicle })
                          : natija.savol === "mashina"
                            ? javob(maydon?.tur ?? "tech_passport", { vehicleId: v.id })
                            : javob(maydon?.tur ?? "cmr", { tripId: v.id })
                      }
                      style={s.chip}
                    >
                      <Text style={s.chipMatn}>{natija.savol === "tur" ? t(`skaner.tur.${v.id}`) : v.nom}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {natija?.holat === "xato" && (
              <Text style={s.ogoh}>
                {["NO_TRIP", "NO_VEHICLE", "NO_AMOUNT", "NOT_FOUND"].includes(natija.kod)
                  ? t(`skaner.err.${natija.kod}`)
                  : t("skaner.err.generic")}
              </Text>
            )}
            <View style={s.qator}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t("skaner.open")}
                  variant="secondary"
                  onPress={() => void openRemoteFile(`/api/documents/${hujjat.id}`, "hujjat.pdf").catch(() => {})}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={t("skaner.send")} onPress={() => setYuborOchiq(true)} />
              </View>
            </View>
            <Button title={t("skaner.newScan")} variant="ghost" onPress={qayta} />
          </Card>
        ) : (
          <>
            <View style={s.qator}>
              <Pressable style={[s.katta, s.kattaAsosiy]} onPress={async () => qosh(await takePhoto())}>
                <Text style={s.kattaBelgi}>📷</Text>
                <Text style={[s.kattaMatn, { color: color.brandForeground }]}>{t("skaner.camera")}</Text>
              </Pressable>
              <Pressable style={s.katta} onPress={async () => qosh(await pickPhotos(MAX_SAHIFA - sahifalar.length))}>
                <Text style={s.kattaBelgi}>🖼️</Text>
                <Text style={s.kattaMatn}>{t("skaner.gallery")}</Text>
              </Pressable>
            </View>
            {sahifalar.length === 0 && <Text style={s.izoh}>{t("skaner.empty")}</Text>}
            <Text style={s.kichik}>{t("skaner.nativeNote")}</Text>

            {tahrirdagi && (
              <Card>
                <Text style={s.savol}>
                  {tahrirdagi.topildi === null
                    ? t("skaner.detecting")
                    : tahrirdagi.topildi
                      ? t("skaner.adjust")
                      : t("skaner.notFound")}
                </Text>
                <View style={{ marginVertical: space.md }}>
                  <SkanerRamka
                    uri={tahrirdagi.foto.uri}
                    burchaklar={tahrirdagi.burchaklar}
                    onChange={(b) => setSahifalar((all) => all.map((x) => (x.id === tahrirdagi.id ? { ...x, burchaklar: b } : x)))}
                  />
                </View>
                <Button title={t("skaner.done")} onPress={() => setTahrir(null)} />
              </Card>
            )}

            {sahifalar.length > 0 && (
              <>
                <Text style={s.savol}>{t("skaner.pages", { n: sahifalar.length })}</Text>
                {/* Sahifalar — telefondagi mahalliy holat, ko'pi bilan 20 ta (server ham shuni qabul qiladi) */}
                <View style={s.tor}>
                  {sahifalar.map((x, i) => (
                    <View key={x.id} style={[s.sahifa, tahrir === x.id && { borderColor: color.brand }]}>
                      <Image source={{ uri: x.foto.uri }} style={s.rasm} />
                      <Text style={s.raqam}>{i + 1}</Text>
                      <View style={s.amallar}>
                        <Pressable accessibilityLabel={t("skaner.edit")} hitSlop={6} onPress={() => setTahrir(x.id)}>
                          <Text style={s.amal}>✎</Text>
                        </Pressable>
                        <Pressable accessibilityLabel={t("skaner.up")} hitSlop={6} disabled={i === 0} onPress={() => surish(i, -1)}>
                          <Text style={[s.amal, i === 0 && s.ochiq]}>↑</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={t("skaner.down")}
                          hitSlop={6}
                          disabled={i === sahifalar.length - 1}
                          onPress={() => surish(i, 1)}
                        >
                          <Text style={[s.amal, i === sahifalar.length - 1 && s.ochiq]}>↓</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={t("skaner.delete")}
                          hitSlop={6}
                          onPress={() => {
                            setSahifalar((all) => all.filter((y) => y.id !== x.id));
                            if (tahrir === x.id) setTahrir(null);
                          }}
                        >
                          <Icon name="trash" size={18} stroke={color.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                <Card>
                  {(["a4", "karta"] as const).map((r) => (
                    <Pressable key={r} onPress={() => setRejim(r)} style={[s.rejim, rejim === r && s.rejimTanlangan]}>
                      <Text style={[s.rejimMatn, rejim === r && { color: color.brand }]}>
                        {r === "a4" ? t("skaner.modeA4") : t("skaner.modeCard")}
                      </Text>
                      {r === "karta" && <Text style={s.kichik}>{t("skaner.modeCardHint")}</Text>}
                    </Pressable>
                  ))}
                  <View style={s.chiplar}>
                    {(["rang", "asl"] as const).map((f) => (
                      <Pressable key={f} onPress={() => setFiltr(f)} style={[s.chip, filtr === f && s.chipTanlangan]}>
                        <Text style={[s.chipMatn, filtr === f && { color: color.brand }]}>
                          {f === "rang" ? t("skaner.filterColor") : t("skaner.filterOrig")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field label={t("skaner.name")} value={nom} onChangeText={setNom} maxLength={120} />
                  {!!xato && <Text style={s.xato}>{xato}</Text>}
                  <Button
                    title={band === "saqlash" ? t("skaner.saving") : t("skaner.save")}
                    loading={band === "saqlash"}
                    onPress={saqla}
                  />
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
      <HujjatYuborish ochiq={yuborOchiq} onClose={() => setYuborOchiq(false)} hujjat={hujjat} />
    </KeyboardAvoidingView>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  qator: { flexDirection: "row" as const, gap: space.sm, marginTop: space.md },
  katta: {
    flex: 1,
    height: 88,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: color.brand + "4D",
    backgroundColor: color.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
  },
  kattaAsosiy: { backgroundColor: color.brand, borderColor: color.brand },
  kattaBelgi: { fontSize: 26 },
  kattaMatn: { fontSize: font.body, fontWeight: "700" as const, color: color.brand },
  izoh: { fontSize: font.caption, color: color.mutedForeground, marginTop: 4 },
  kichik: { fontSize: font.micro, color: color.mutedForeground, marginTop: 2 },
  band: { marginTop: space.md, fontSize: font.body, fontWeight: "600" as const, color: color.foreground },
  saqlandi: { fontSize: font.title, fontWeight: "800" as const, color: color.successText },
  yashil: { marginTop: space.md, padding: space.md, borderRadius: radius.control, backgroundColor: color.successSoft },
  yashilMatn: { fontSize: font.body, fontWeight: "700" as const, color: color.successText },
  ogoh: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: color.warningSoft,
    color: color.warningText,
    fontSize: font.body,
  },
  savol: { fontSize: font.body, fontWeight: "700" as const, color: color.foreground },
  chiplar: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: space.sm, marginTop: space.sm, marginBottom: space.md },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  chipTanlangan: { borderColor: color.brand, backgroundColor: color.brandSoft },
  chipMatn: { fontSize: font.caption, fontWeight: "700" as const, color: color.foreground },
  tor: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: space.sm },
  sahifa: {
    width: "31%" as const,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.card,
    overflow: "hidden" as const,
  },
  rasm: { width: "100%" as const, height: 110 },
  raqam: {
    position: "absolute" as const,
    left: 6,
    top: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontWeight: "700" as const,
    fontSize: font.micro,
  },
  amallar: { flexDirection: "row" as const, justifyContent: "space-around" as const, paddingVertical: 6 },
  amal: { fontSize: 18, fontWeight: "700" as const, color: color.foreground },
  ochiq: { opacity: 0.25 },
  rejim: { padding: space.md, borderRadius: radius.control, borderWidth: 2, borderColor: color.border, marginBottom: space.sm },
  rejimTanlangan: { borderColor: color.brand, backgroundColor: color.brandSoft },
  rejimMatn: { fontSize: font.body, fontWeight: "700" as const, color: color.foreground },
  xato: { color: color.dangerText, fontSize: font.caption, marginBottom: space.sm },
}));
