/**
 * Reys pul oqimi — ilovada (TZ v3 §10, §15-22).
 *
 * Web `trips/[id]/pul-oqimi.tsx` bilan BITTA server (`/api/trips/:id/pul`):
 * hisob, qoldiq va tafovutlar serverda (`lib/reys-pul.ts`), ilova faqat
 * chizadi va yuboradi. Haydovchi ekranida 4 ta katta tugma:
 *   Pul oldim · Almashtirdim · Xarajat qildim · Egasiga berdim
 * Har valyuta ALOHIDA — qo'shilmaydi. Tafovut yashirilmaydi. Transport
 * egasi topshirilgan pulni shu yerda tasdiqlaydi yoki «to'g'ri kelmadi» deydi.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const VALYUTALAR = ["USD", "UZS", "KZT", "RUB", "CNY", "EUR", "KGS", "TJS", "TRY", "TMT"] as const;
const MANBALAR = ["SHIPPER", "OWNER_CASH", "OWNER_BANK", "CARRYOVER", "DRIVER_OWN", "OTHER"] as const;

type Kirim = { currency: string; kirim: number; xarajat: number; almashgaChiqim: number; komissiya: number; topshirilgan: number; tasdiqKutmoqda: number; qoldiq: number };
type Tafovut = { tur: string; matn: string; kod?: string };
type Topshirish = { id: string; kod: string; amount: number; currency: string; tasdiqlangan: boolean; nizo: boolean; bekor: boolean };
type Malumot = {
  hisob: { valyutalar: Kirim[]; tafovutlar: Tafovut[]; tozami: boolean };
  topshirishlar: Topshirish[];
  huquq: { kirita: boolean; tasdiqlay: boolean; kora: boolean };
  egasiBor: boolean;
};

type Oyna = null | "tushum" | "almash" | "topshir";
const son = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);

export default function PulOqimi() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Malumot>(id ? `/api/trips/${id}/pul` : null, [id]);
  const [oyna, setOyna] = useState<Oyna>(null);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  /* Forma maydonlari — uchala oynada umumiy */
  const [summa, setSumma] = useState("");
  const [valyuta, setValyuta] = useState<string>("USD");
  const [manba, setManba] = useState<string>("SHIPPER");
  const [usul, setUsul] = useState<"CASH" | "BANK">("CASH");
  const [summa2, setSumma2] = useState("");
  const [valyuta2, setValyuta2] = useState<string>("KZT");
  const [komissiya, setKomissiya] = useState("");

  function och(o: Oyna) {
    setOyna(o);
    setXato(null);
    setSumma("");
    setSumma2("");
    setKomissiya("");
  }

  const raqam = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

  async function yubor() {
    if (!oyna) return;
    setBand(true);
    setXato(null);
    const body =
      oyna === "tushum"
        ? { tur: "tushum", source: manba, amount: raqam(summa), currency: valyuta, method: usul, idemKey: `${id}:${Date.now()}` }
        : oyna === "almash"
          ? {
              tur: "almashtirish",
              fromCurrency: valyuta,
              fromAmount: raqam(summa),
              toCurrency: valyuta2,
              toAmount: raqam(summa2),
              ...(komissiya ? { fee: raqam(komissiya), feeCurrency: valyuta2 } : {}),
              idemKey: `${id}:${Date.now()}`,
            }
          : { tur: "topshirish", amount: raqam(summa), currency: valyuta, method: usul, idemKey: `${id}:${Date.now()}` };
    try {
      await api(`/api/trips/${id}/pul`, { method: "POST", body });
      setOyna(null);
      reload();
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : t("pulOqimi.xato"));
    } finally {
      setBand(false);
    }
  }

  async function tasdiq(tp: Topshirish, rozimi: boolean) {
    try {
      await api(`/api/trips/${id}/pul`, { method: "POST", body: { tur: "tasdiq", id: tp.id, rozimi } });
      reload();
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : t("pulOqimi.xato"));
    }
  }

  const tanlov = (qiymatlar: readonly string[], joriy: string, set: (v: string) => void, nom?: (v: string) => string) => (
    <View style={s.chips}>
      {qiymatlar.map((v) => (
        <Pressable key={v} onPress={() => set(v)} style={[s.chip, joriy === v && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: joriy === v }}>
          <Text style={[s.chipText, joriy === v && { color: "#ffffff" }]}>{nom ? nom(v) : v}</Text>
        </Pressable>
      ))}
    </View>
  );

  const kutmoqda = (data?.topshirishlar ?? []).filter((x) => !x.tasdiqlangan && !x.nizo && !x.bekor);

  return (
    <View style={s.root}>
      <Header title={t("pulOqimi.sarlavha")} />
      <FlatList
        data={data?.hisob.valyutalar ?? []}
        keyExtractor={(v) => v.currency}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {loading && !data ? <Skeleton rows={2} /> : null}
            {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
            {/* 4 KATTA TUGMA (TZ v3 §10) */}
            {data?.huquq.kirita ? (
              <View style={s.tugmalar}>
                <Pressable style={[s.katta, { backgroundColor: color.success }]} onPress={() => och("tushum")} accessibilityRole="button">
                  <Text style={s.kattaText}>＋ {t("pulOqimi.oldim")}</Text>
                </Pressable>
                <Pressable style={[s.katta, { backgroundColor: color.blue }]} onPress={() => och("almash")} accessibilityRole="button">
                  <Text style={s.kattaText}>⇄ {t("pulOqimi.almashtirdim")}</Text>
                </Pressable>
                <Pressable style={[s.katta, { backgroundColor: color.danger }]} onPress={() => router.push(`/reys/${id}/xarajatlar` as never)} accessibilityRole="button">
                  <Text style={s.kattaText}>− {t("pulOqimi.xarajat")}</Text>
                </Pressable>
                {data.egasiBor ? (
                  <Pressable style={[s.katta, { backgroundColor: color.brand }]} onPress={() => och("topshir")} accessibilityRole="button">
                    <Text style={s.kattaText}>→ {t("pulOqimi.berdim")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {/* Egasi uchun: topshirilgan pulni tasdiqlash */}
            {data?.huquq.tasdiqlay && kutmoqda.length
              ? kutmoqda.map((tp) => (
                  <View key={tp.id} style={s.card}>
                    <Text style={s.qator}>
                      {t("pulOqimi.topshirildi")}: {son(tp.amount)} {tp.currency} · {tp.kod}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button title={t("pulOqimi.tasdiqlash")} onPress={() => void tasdiq(tp, true)} />
                      <Button title={t("pulOqimi.togriKelmadi")} variant="secondary" onPress={() => void tasdiq(tp, false)} />
                    </View>
                  </View>
                ))
              : null}
            {data ? <Text style={s.bosh}>{t("pulOqimi.qoldiqlar")}</Text> : null}
          </View>
        }
        renderItem={({ item: v }) => (
          <View style={s.card}>
            <Text style={s.valyuta}>
              {v.currency}: {son(v.qoldiq)}
            </Text>
            <Text style={s.qator}>
              {t("pulOqimi.kirim")} {son(v.kirim)} · {t("pulOqimi.chiqim")} {son(v.xarajat + v.almashgaChiqim + v.komissiya)} · {t("pulOqimi.egasiga")} {son(v.topshirilgan)}
              {v.tasdiqKutmoqda ? ` (+${son(v.tasdiqKutmoqda)} ${t("pulOqimi.kutmoqda")})` : ""}
            </Text>
          </View>
        )}
        ListFooterComponent={
          data?.hisob.tafovutlar.length ? (
            <View style={[s.card, { borderColor: color.danger, borderWidth: 1 }]}>
              <Text style={[s.bosh, { color: color.danger }]}>{t("pulOqimi.tafovut")}</Text>
              {data.hisob.tafovutlar.map((x, i) => (
                <Text key={i} style={s.qator}>
                  • {x.matn}
                </Text>
              ))}
            </View>
          ) : null
        }
      />

      <Sheet
        open={!!oyna}
        onClose={() => setOyna(null)}
        title={oyna === "tushum" ? t("pulOqimi.oldim") : oyna === "almash" ? t("pulOqimi.almashtirdim") : t("pulOqimi.berdim")}
      >
        <View style={{ gap: space.md }}>
          {oyna === "tushum" ? tanlov(MANBALAR, manba, setManba, (v) => t(`pulOqimi.m_${v}`)) : null}
          <Field label={oyna === "almash" ? t("pulOqimi.berdimSumma") : t("pulOqimi.summa")} value={summa} onChangeText={setSumma} keyboardType="decimal-pad" />
          {tanlov(VALYUTALAR, valyuta, setValyuta)}
          {oyna === "almash" ? (
            <>
              <Field label={t("pulOqimi.oldimSumma")} value={summa2} onChangeText={setSumma2} keyboardType="decimal-pad" />
              {tanlov(VALYUTALAR, valyuta2, setValyuta2)}
              <Field label={t("pulOqimi.komissiya")} value={komissiya} onChangeText={setKomissiya} keyboardType="decimal-pad" />
            </>
          ) : (
            tanlov(["CASH", "BANK"], usul, (v) => setUsul(v as "CASH" | "BANK"), (v) => t(`pulOqimi.u_${v}`))
          )}
          {xato ? <Text style={{ color: color.danger }}>{xato}</Text> : null}
          <Button
            title={t("mob.common.save")}
            loading={band}
            disabled={!(raqam(summa) > 0) || (oyna === "almash" && (!(raqam(summa2) > 0) || valyuta === valyuta2))}
            onPress={() => void yubor()}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: space.md },
  tugmalar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  katta: { flexBasis: "47%", flexGrow: 1, minHeight: 64, borderRadius: radius.card, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  kattaText: { fontSize: 15.5, fontWeight: "800", color: "#ffffff", textAlign: "center" },
  card: { padding: 12, gap: 6, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  bosh: { fontSize: 13, fontWeight: "800", color: color.mutedForeground, textTransform: "uppercase" },
  valyuta: { fontSize: 18, fontWeight: "800", color: color.foreground },
  qator: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { minHeight: 34, paddingHorizontal: 11, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: color.border },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.foreground },
}));
