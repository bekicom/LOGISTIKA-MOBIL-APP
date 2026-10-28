/**
 * Haydovchi: safarlarim, jo'natmalar va doimiy marshrutlar (TZ 28-okt 50, 53).
 * Webdagi `/rides/my` va `/rides/[id]` dagi haydovchi amallari bilan bir xil:
 *
 *  · doimiy marshrutni ko'rish va to'xtatish (`jadval-ochir`);
 *  · jo'natmani qabul qilish → yo'lga chiqarish → manzilga yetkazish;
 *  · topshirish RASM va qabul qiluvchi KODI bilan (rasm avval
 *    `/api/rides/parcels/<id>/photo` ga yuklanadi, kaliti `parcel-move` ga).
 */
import { useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Field } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, apiUpload, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Jonatma = { id: string; parcelNo: number; kind: string; status: string; receiverName: string; receiverPhone: string; photos: number };
type Safar = {
  id: string;
  rideNo: number;
  status: string;
  departAt: string;
  seatsFree: number;
  seatsTotal: number;
  price: number;
  currency: string;
  vehicleKind: string | null;
  fromSchedule: boolean;
  from: string;
  to: string;
  parcels: Jonatma[];
};
type Jadval = { id: string; from: string; to: string; departTime: string; weekdays: number[]; seatsTotal: number; price: number; currency: string; rides: number };
type Panel = { rides: Safar[]; jadvallar: Jadval[] };
type Qator = { tur: "jadval"; j: Jadval; key: string } | { tur: "safar"; r: Safar; key: string } | { tur: "sarlavha"; matn: string; key: string };

/** Jo'natmaning keyingi bosqichi (topshirish — alohida, rasm va kod bilan) */
const KEYINGI: Record<string, string> = { NEW: "ACCEPTED", ACCEPTED: "IN_TRANSIT", IN_TRANSIT: "ARRIVED" };

const ikki = (n: number) => String(n).padStart(2, "0");
function vaqt(iso: string) {
  const d = new Date(iso);
  return `${ikki(d.getDate())}.${ikki(d.getMonth() + 1)} · ${ikki(d.getHours())}:${ikki(d.getMinutes())}`;
}

export default function YolovchiSafarlarim() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Panel>("/api/rides/yolovchilar?haydovchi=1");
  const [xato, setXato] = useState<string | null>(null);
  const [band, setBand] = useState<string | null>(null);
  /* Topshirish: jo'natma → yuklangan rasm kaliti va kiritilgan kod */
  const [rasm, setRasm] = useState<Record<string, string>>({});
  const [kod, setKod] = useState<Record<string, string>>({});

  async function amal(id: string, ish: () => Promise<unknown>) {
    setBand(id);
    setXato(null);
    try {
      await ish();
      reload();
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : String(e));
    } finally {
      setBand(null);
    }
  }

  const harakat = (p: Jonatma, to: string) =>
    amal(p.id, () => api("/api/rides", { method: "POST", body: { action: "parcel-move", id: p.id, to } }));

  async function rasmOl(p: Jonatma, kamera: boolean) {
    const tanlov: Photo[] = kamera ? await takePhoto() : await pickPhotos(1);
    const f = tanlov[0];
    if (!f) return;
    await amal(p.id, async () => {
      /* `Content-Type` QO'LDA QO'YILMAYDI — `apiUpload` boundary'ni RN'ga qoldiradi */
      const r = await apiUpload<{ photo: string }>(`/api/rides/parcels/${p.id}/photo`, {}, [toUpload(f, "photo")]);
      setRasm((v) => ({ ...v, [p.id]: r.photo }));
    });
  }

  const topshir = (p: Jonatma) =>
    amal(p.id, () =>
      api("/api/rides", { method: "POST", body: { action: "parcel-move", id: p.id, to: "DELIVERED", code: kod[p.id], photo: rasm[p.id] } }),
    );

  const jonatmaKarta = (p: Jonatma) => (
    <View key={p.id} style={s.jonatma}>
      <Text style={s.jonatmaSarlavha}>
        📦 #{p.parcelNo} · {p.kind} · {t(`yolovchi.kuzatHolat_${p.status}`)}
      </Text>
      <Pressable onPress={() => void Linking.openURL(`tel:${p.receiverPhone}`)} accessibilityRole="link">
        <Text style={s.meta}>
          {p.receiverName} · {p.receiverPhone}
        </Text>
      </Pressable>
      {KEYINGI[p.status] ? (
        <Pressable onPress={() => void harakat(p, KEYINGI[p.status])} disabled={band === p.id} style={[s.btn, band === p.id && { opacity: 0.5 }]} accessibilityRole="button">
          <Text style={s.btnText}>{t(`yolovchi.keyingi_${KEYINGI[p.status]}`)}</Text>
        </Pressable>
      ) : null}
      {p.status === "ARRIVED" ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => void rasmOl(p, true)} style={s.btn} accessibilityRole="button" disabled={band === p.id}>
              <Text style={s.btnText}>📷 {rasm[p.id] ? t("yolovchi.rasmOlindi") : t("yolovchi.kamera")}</Text>
            </Pressable>
            <Pressable onPress={() => void rasmOl(p, false)} style={s.btn} accessibilityRole="button" disabled={band === p.id}>
              <Text style={s.btnText}>🖼 {t("yolovchi.galereya")}</Text>
            </Pressable>
          </View>
          <Field
            label={t("yolovchi.topshirishKodi")}
            value={kod[p.id] ?? ""}
            onChangeText={(v) => setKod((x) => ({ ...x, [p.id]: v.replace(/\D/g, "").slice(0, 6) }))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Pressable
            onPress={() => void topshir(p)}
            disabled={!rasm[p.id] || (kod[p.id] ?? "").length !== 6 || band === p.id}
            style={[s.asosiy, (!rasm[p.id] || (kod[p.id] ?? "").length !== 6) && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={s.asosiyText}>{t("yolovchi.topshirdim")}</Text>
          </Pressable>
          <Text style={s.meta}>{t("yolovchi.topshirishIzoh")}</Text>
        </View>
      ) : null}
    </View>
  );

  /* Chegaralangan ro'yxat: server 40 safar va faol jadvallarni beradi */
  const qatorlar: Qator[] = data
    ? [
        ...(data.jadvallar.length ? [{ tur: "sarlavha" as const, matn: t("yolovchi.doimiyMarshrutlar"), key: "hj" }] : []),
        ...data.jadvallar.map((j) => ({ tur: "jadval" as const, j, key: `j${j.id}` })),
        { tur: "sarlavha" as const, matn: t("yolovchi.safarlarim"), key: "hs" },
        ...data.rides.map((r) => ({ tur: "safar" as const, r, key: r.id })),
      ]
    : [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/yolovchi" as never))} hitSlop={8} style={s.back} accessibilityRole="button">
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {t("yolovchi.safarlarim")}
        </Text>
        <Pressable onPress={() => router.push("/yolovchi-safar-qosh" as never)} style={s.qosh} accessibilityRole="button">
          <Text style={s.btnText}>+ {t("yolovchi.safarQoshish")}</Text>
        </Pressable>
      </View>
      {xato ? <Text style={s.xato}>{xato}</Text> : null}
      <FlatList
        data={qatorlar}
        keyExtractor={(q) => q.key}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item: q }) =>
          q.tur === "sarlavha" ? (
            <Text style={s.label}>{q.matn}</Text>
          ) : q.tur === "jadval" ? (
            <View style={s.card}>
              <Text style={s.yol}>
                {q.j.from} → {q.j.to}
              </Text>
              <Text style={s.meta}>
                {q.j.departTime} · {q.j.weekdays.length ? q.j.weekdays.map((d) => t(`yolovchi.hafta${d}`)).join(", ") : t("yolovchi.harKuni")}
              </Text>
              <Text style={s.meta}>
                {q.j.seatsTotal} · {fmtNum(q.j.price)} {q.j.currency} · {t("yolovchi.safarSoni", { n: q.j.rides })}
              </Text>
              <Pressable
                onPress={() => void amal(q.j.id, () => api("/api/rides/yolovchilar", { method: "POST", body: { action: "jadval-ochir", id: q.j.id } }))}
                disabled={band === q.j.id}
                style={[s.btnXavf, band === q.j.id && { opacity: 0.5 }]}
                accessibilityRole="button"
              >
                <Text style={s.btnXavfText}>{t("yolovchi.jadvalniToxtatish")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.yol}>
                {q.r.from} → {q.r.to}
              </Text>
              <Text style={s.meta}>
                #{q.r.rideNo} · {vaqt(q.r.departAt)} · {t(`yolovchi.safarHolat_${q.r.status}`)}
                {q.r.fromSchedule ? " · 🔁" : ""}
              </Text>
              <Text style={s.meta}>
                {q.r.seatsFree}/{q.r.seatsTotal} · {fmtNum(q.r.price)} {q.r.currency}
                {q.r.vehicleKind ? ` · ${t(`yolovchi.tur_${q.r.vehicleKind}`)}` : ""}
              </Text>
              {q.r.parcels.length ? <Text style={s.label}>{t("yolovchi.jonatmalar")}</Text> : null}
              {q.r.parcels.map(jonatmaKarta)}
            </View>
          )
        }
        ListEmptyComponent={
          loading ? <Skeleton rows={3} /> : error ? <ErrorBox message={error} onRetry={reload} /> : <Empty icon="route" title={t("yolovchi.bosh")} />
        }
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground, flexShrink: 1, flex: 1 },
  qosh: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: color.brand, justifyContent: "center" },
  list: { padding: space.lg, gap: space.md },
  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, textTransform: "uppercase", marginTop: 4 },
  card: { padding: 14, gap: 4, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  yol: { fontSize: 16, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 13, color: color.mutedForeground },
  xato: { color: color.danger, paddingHorizontal: space.lg, fontSize: 13.5 },
  jonatma: { marginTop: 6, padding: 10, gap: 6, borderRadius: radius.control, backgroundColor: color.muted },
  jonatmaSarlavha: { fontSize: 14, fontWeight: "700", color: color.foreground },
  btn: { alignSelf: "flex-start", height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: color.brand, justifyContent: "center" },
  btnText: { fontSize: 13.5, fontWeight: "700", color: color.brandText },
  btnXavf: { alignSelf: "flex-start", height: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: color.danger, justifyContent: "center", marginTop: 4 },
  btnXavfText: { fontSize: 13, fontWeight: "700", color: color.danger },
  asosiy: { height: 42, borderRadius: radius.pill, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  asosiyText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
}));
