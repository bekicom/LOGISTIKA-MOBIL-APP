/**
 * Yo'lovchi tashish — FURAM Bozorning bo'limi (TZ v3 §4, §15-17).
 *
 * Ilgari ilovada bu bo'lim umuman yo'q edi (faqat web `/rides`). Ro'yxat
 * web bilan bitta so'rovdan (`GET /api/rides` → `searchRides`): sinov
 * hisobi va o'tib ketgan safar chiqmaydi. Bron — webdagi bilan bir xil
 * amal (`POST /api/rides`, `action: "book"`): oferta roziligi katakchadan,
 * server o'zi tekshiradi.
 *
 * TZ 28-okt 48–49 (webdagi `/rides`, `/rides/yolovchilar` bilan bir xil):
 *  · ikki tomonlama ro'yxat — «Safarlar», «Yo'lovchilar», «Pochta»;
 *  · guruhdan olingan safar: manba, «N ta guruhda», «Kelishiladi»,
 *    bron o'rniga qo'ng'iroq (haydovchi FURAM'da yo'q);
 *  · haydovchi so'rovga bir bosishda taklif qiladi;
 *  · «Joy so'rash» / «Pochta jo'natish» — so'rov qoldirish.
 */
import { useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Segment } from "@/components/Segment";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { Button, Field } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Safar = {
  id: string;
  rideNo: number;
  from: string;
  to: string;
  departAt: string;
  seatsFree: number;
  seatsTotal: number;
  price: number;
  currency: string;
  isNegotiable: boolean;
  vehicle: string | null;
  driver: { name: string; isVerified: boolean };
  source?: string;
  sourceChat?: string | null;
  groupCount?: number;
  timeKnown?: boolean;
  vehicleKind?: string | null;
  plateNo?: string | null;
  phone?: string | null;
};

type Sorov = {
  id: string;
  kind: "YOLOVCHI" | "POCHTA";
  from: string;
  to: string;
  departAt: string | null;
  timeKnown: boolean;
  people: number;
  baggageNote: string | null;
  withParcel: boolean;
  note: string | null;
  phone: string | null;
  source: string;
  sourceChat: string | null;
  groupCount: number;
  offers: number;
  mine: boolean;
};

type Tab = "safar" | "yolovchi" | "pochta";

const ikki = (n: number) => String(n).padStart(2, "0");
function vaqt(iso: string) {
  const d = new Date(iso);
  return `${ikki(d.getDate())}.${ikki(d.getMonth() + 1)} · ${ikki(d.getHours())}:${ikki(d.getMinutes())}`;
}
function kun(iso: string) {
  const d = new Date(iso);
  return `${ikki(d.getDate())}.${ikki(d.getMonth() + 1)}`;
}
const tarmoq = (src?: string) => (src === "WHATSAPP" ? "WhatsApp" : "Telegram");

export default function Yolovchi() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("safar");
  const safarlar = useApi<{ items: Safar[] }>("/api/rides");
  const sorovlar = useApi<{ items: Sorov[] }>(
    tab === "safar" ? null : `/api/rides/yolovchilar?tur=${tab === "pochta" ? "POCHTA" : "YOLOVCHI"}`,
    [tab],
  );
  const faol = tab === "safar" ? safarlar : sorovlar;

  const [bron, setBron] = useState<Safar | null>(null);
  const [joy, setJoy] = useState(1);
  const [ism, setIsm] = useState("");
  const [tel, setTel] = useState("");
  const [rozi, setRozi] = useState(false);
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState<{ matn: string; xato: boolean } | null>(null);
  /* Taklif yuborilgan so'rovlar — javobdagi raqam bilan */
  const [taklif, setTaklif] = useState<Record<string, string>>({});
  /* So'rov qoldirish oynasi */
  const [sorovOch, setSorovOch] = useState(false);

  function och(r: Safar) {
    if (!user) return router.push("/kirish");
    setBron(r);
    setJoy(1);
    setIsm(user.firstName ?? "");
    setTel(user.phone ?? "");
    setRozi(false);
    setXabar(null);
  }

  async function yubor() {
    if (!bron) return;
    setBand(true);
    setXabar(null);
    try {
      const r = await api<{ code: string }>("/api/rides", {
        method: "POST",
        body: { action: "book", rideId: bron.id, seats: joy, passengerName: ism, phone: tel, baggage: "NONE", acceptOffer: rozi },
      });
      setXabar({ matn: t("yolovchiUi.bronBoldi", { kod: r.code }), xato: false });
      safarlar.reload();
    } catch (e) {
      setXabar({ matn: e instanceof FuramError ? e.message : String(e), xato: true });
    } finally {
      setBand(false);
    }
  }

  async function taklifQil(id: string) {
    if (!user) return router.push("/kirish");
    try {
      const r = await api<{ phone: string }>("/api/rides/yolovchilar", { method: "POST", body: { action: "taklif", id } });
      setTaklif((v) => ({ ...v, [id]: r.phone }));
    } catch (e) {
      setXabar({ matn: e instanceof FuramError ? e.message : String(e), xato: true });
    }
  }

  const qongiroq = (phone: string | null | undefined) => {
    if (!user) return router.push("/kirish");
    if (phone) void Linking.openURL(`tel:${phone}`);
  };

  const safarKarta = (r: Safar) => {
    const importli = !!r.source && r.source !== "FURAM";
    return (
      <View style={s.card}>
        <Text style={s.yol} numberOfLines={2}>
          {r.from} → {r.to}
        </Text>
        <Text style={s.meta}>
          {r.timeKnown === false ? t("yolovchi.vaqtKelishiladi") : vaqt(r.departAt)} ·{" "}
          {r.seatsTotal > 0 ? t("yolovchiUi.joy", { n: r.seatsFree }) : t("yolovchi.orinAytilmagan")}
          {r.vehicleKind ? ` · ${t(`yolovchi.tur_${r.vehicleKind}`)}` : ""}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {importli
            ? [r.vehicle, r.plateNo].filter(Boolean).join(" · ")
            : `${[r.vehicle, r.driver.name].filter(Boolean).join(" · ")}${r.driver.isVerified ? " ✓" : ""}`}
        </Text>
        {importli ? (
          <Text style={s.manba} numberOfLines={1}>
            {t("yolovchi.manba", { tarmoq: tarmoq(r.source) })}
            {r.sourceChat ? ` · ${r.sourceChat}` : ""}
            {(r.groupCount ?? 1) > 1 ? ` · ${t("yolovchi.guruhlarda", { n: r.groupCount ?? 1 })}` : ""}
          </Text>
        ) : null}
        <View style={s.pastki}>
          <Text style={s.narx}>
            {!r.price ? t("yolovchi.narxKelishiladi") : `${fmtNum(r.price)} ${r.currency}`}
          </Text>
          {importli ? (
            <Pressable
              onPress={() => qongiroq(r.phone)}
              accessibilityRole="button"
              style={({ pressed }) => [s.bronBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.bronText}>{user && r.phone ? `📞 ${r.phone}` : t("yolovchi.raqamUchunKiring")}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => och(r)}
              disabled={r.seatsFree < 1}
              accessibilityRole="button"
              style={({ pressed }) => [s.bronBtn, (pressed || r.seatsFree < 1) && { opacity: 0.6 }]}
            >
              <Text style={s.bronText}>{t("yolovchiUi.bron")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const sorovKarta = (r: Sorov) => (
    <View style={s.card}>
      <Text style={s.yol} numberOfLines={2}>
        {r.from} → {r.to}
      </Text>
      <Text style={s.meta}>
        {r.kind === "POCHTA" ? `📦 ${t("yolovchi.pochta")}` : t("yolovchi.odam", { n: r.people })} ·{" "}
        {r.departAt ? (r.timeKnown ? vaqt(r.departAt) : kun(r.departAt)) : t("yolovchi.vaqtKelishiladi")}
        {r.withParcel && r.kind !== "POCHTA" ? ` · 📦 ${t("yolovchi.pochtaHam")}` : ""}
      </Text>
      {r.baggageNote ? <Text style={s.meta}>{r.baggageNote}</Text> : null}
      {r.note ? <Text style={s.izoh}>{r.note}</Text> : null}
      {r.source !== "FURAM" ? (
        <Text style={s.manba} numberOfLines={1}>
          {t("yolovchi.manba", { tarmoq: tarmoq(r.source) })}
          {r.sourceChat ? ` · ${r.sourceChat}` : ""}
          {r.groupCount > 1 ? ` · ${t("yolovchi.guruhlarda", { n: r.groupCount })}` : ""}
        </Text>
      ) : null}
      <View style={s.pastki}>
        <Text style={s.meta}>{r.offers > 0 ? t("yolovchi.takliflarSoni", { n: r.offers }) : ""}</Text>
        {r.mine ? null : taklif[r.id] ? (
          <Pressable onPress={() => qongiroq(taklif[r.id])} accessibilityRole="button" style={s.bronBtn}>
            <Text style={s.bronText}>📞 {taklif[r.id]}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void taklifQil(r.id)}
            accessibilityRole="button"
            style={({ pressed }) => [s.bronBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.bronText}>{user ? t("yolovchi.taklifQilish") : t("yolovchi.taklifUchunKiring")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const royxat: (Safar | Sorov)[] = (tab === "safar" ? safarlar.data?.items : sorovlar.data?.items) ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/bozor-bolimlar" as never))}
          hitSlop={8}
          accessibilityRole="button"
          style={s.back}
        >
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {t("yolovchiUi.sarlavha")}
        </Text>
        <Pressable
          onPress={() => (user ? setSorovOch(true) : router.push("/kirish"))}
          accessibilityRole="button"
          style={s.qoshBtn}
        >
          <Text style={s.qoshText}>{tab === "pochta" ? t("yolovchi.pochtaQoldirish") : t("yolovchi.sorovQoldirish")}</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: space.lg }}>
        <Segment
          value={tab}
          onChange={(k) => setTab(k as Tab)}
          options={[
            { key: "safar", label: t("yolovchi.tabSafarlar") },
            { key: "yolovchi", label: t("yolovchi.tabYolovchilar") },
            { key: "pochta", label: t("yolovchi.tabPochta") },
          ]}
        />
        {/* Webdagi tablar va havolalar (TZ 28-okt 50, 51) */}
        <View style={s.havolalar}>
          <Pressable onPress={() => router.push("/yolovchi-yonalishlar" as never)} accessibilityRole="link">
            <Text style={s.qoshText}>{t("yolovchi.tabYonalishlar")} →</Text>
          </Pressable>
          {user ? (
            <Pressable onPress={() => router.push("/yolovchi-safarlarim" as never)} accessibilityRole="link">
              <Text style={s.qoshText}>{t("yolovchi.safarlarim")} →</Text>
            </Pressable>
          ) : null}
          {user ? (
            <Pressable onPress={() => router.push("/yolovchi-mening" as never)} accessibilityRole="link">
              <Text style={s.qoshText}>{t("yolovchi.meningSorovlarim")} →</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {xabar && !bron ? (
        <Text style={{ color: xabar.xato ? color.danger : color.successText, fontSize: 13.5, paddingHorizontal: space.lg, marginTop: 8 }}>
          {xabar.matn}
        </Text>
      ) : null}

      <FlatList
        data={royxat}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={faol.refreshing} onRefresh={faol.refresh} tintColor={color.brand} />}
        renderItem={({ item }) => (tab === "safar" ? safarKarta(item as Safar) : sorovKarta(item as Sorov))}
        ListEmptyComponent={
          faol.loading ? (
            <Skeleton rows={3} />
          ) : faol.error ? (
            <ErrorBox message={faol.error} onRetry={faol.reload} />
          ) : (
            <Empty icon="users" title={t("yolovchiUi.bosh")} text={tab === "safar" ? t("yolovchiUi.boshIzoh") : t("yolovchi.yolovchilarIzoh")} />
          )
        }
      />

      <Sheet open={!!bron} onClose={() => setBron(null)} title={t("yolovchiUi.bron")}>
        {bron ? (
          <View style={{ gap: space.md }}>
            <Text style={s.yol}>
              {bron.from} → {bron.to}
            </Text>
            <Text style={s.bosh}>{t("yolovchiUi.necha")}</Text>
            <View style={s.joylar}>
              {Array.from({ length: Math.min(4, bron.seatsFree) }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setJoy(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: joy === n }}
                  style={[s.joyBtn, joy === n && s.joyOn]}
                >
                  <Text style={[s.joyText, joy === n && { color: "#ffffff" }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Field label={t("yolovchiUi.ism")} value={ism} onChangeText={setIsm} />
            <Field label={t("yolovchiUi.telefon")} value={tel} onChangeText={setTel} keyboardType="phone-pad" />
            <Pressable
              onPress={() => setRozi((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rozi }}
              style={s.rozi}
            >
              <View style={[s.katak, rozi && s.katakOn]}>{rozi ? <Icon name="check" size={14} stroke="#ffffff" /> : null}</View>
              <Text style={s.roziText}>
                {t("yolovchiUi.oferta")}{" "}
                <Text style={s.havola} onPress={() => router.push("/huquqiy")}>
                  →
                </Text>
              </Text>
            </Pressable>
            {xabar ? <Text style={{ color: xabar.xato ? color.danger : color.successText, fontSize: 13.5 }}>{xabar.matn}</Text> : null}
            <Button title={t("yolovchiUi.bron")} loading={band} disabled={!rozi || !ism.trim() || !tel.trim()} onPress={() => void yubor()} />
          </View>
        ) : null}
      </Sheet>

      <SorovSheet
        open={sorovOch}
        pochta={tab === "pochta"}
        phone={user?.phone ?? ""}
        onClose={() => setSorovOch(false)}
        onDone={() => {
          setSorovOch(false);
          setTab(tab === "pochta" ? "pochta" : "yolovchi");
          sorovlar.reload();
        }}
      />
    </View>
  );
}

/** «Joy so'rash» / «Pochta jo'natish» — webdagi `/rides/sorov/new` ning o'zi */
function SorovSheet({
  open,
  pochta,
  phone: tel0,
  onClose,
  onDone,
}: {
  open: boolean;
  pochta: boolean;
  phone: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"YOLOVCHI" | "POCHTA">(pochta ? "POCHTA" : "YOLOVCHI");
  const [from, setFrom] = useState<Loc | null>(null);
  const [to, setTo] = useState<Loc | null>(null);
  const [pick, setPick] = useState<"from" | "to" | null>(null);
  const [qachon, setQachon] = useState<0 | 1 | 2 | null>(null);
  const [odam, setOdam] = useState(1);
  const [bagaj, setBagaj] = useState("");
  const [izoh, setIzoh] = useState("");
  const [tel, setTel] = useState(tel0);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  /* Kun Toshkent vaqtida, tush payti — vaqt «Kelishiladi» */
  const sana = (k: number) => {
    const d = new Date(Date.now() + k * 86_400_000 + 5 * 3600_000);
    return `${d.toISOString().slice(0, 10)}T12:00:00+05:00`;
  };

  async function yubor() {
    if (!from || !to) return;
    setBand(true);
    setXato(null);
    try {
      await api("/api/rides/yolovchilar", {
        method: "POST",
        body: {
          action: "sorov-yoz",
          kind,
          fromLocationId: from.id,
          toLocationId: to.id,
          departAt: qachon == null ? null : sana(qachon),
          people: odam,
          baggageNote: bagaj || null,
          note: izoh || null,
          phone: tel,
        },
      });
      onDone();
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : String(e));
    } finally {
      setBand(false);
    }
  }

  const KUNLAR: { k: 0 | 1 | 2 | null; label: string }[] = [
    { k: 0, label: t("yolovchi.bugun") },
    { k: 1, label: t("yolovchi.ertaga") },
    { k: 2, label: t("yolovchi.indinga") },
    { k: null, label: t("yolovchi.vaqtKelishiladi") },
  ];

  return (
    <>
      <Sheet open={open && !pick} onClose={onClose} title={kind === "POCHTA" ? t("yolovchi.pochtaQoldirish") : t("yolovchi.sorovQoldirish")}>
        <View style={{ gap: space.md }}>
          <Segment
            value={kind}
            onChange={(k) => setKind(k as "YOLOVCHI" | "POCHTA")}
            options={[
              { key: "YOLOVCHI", label: t("yolovchi.joyKerak") },
              { key: "POCHTA", label: t("yolovchi.pochtaBor") },
            ]}
          />
          <Pressable onPress={() => setPick("from")} style={s.tanla} accessibilityRole="button">
            <Text style={s.tanlaLabel}>{t("yolovchi.qayerdan")}</Text>
            <Text style={s.tanlaQiymat}>{from?.name ?? t("yolovchi.tanlang")}</Text>
          </Pressable>
          <Pressable onPress={() => setPick("to")} style={s.tanla} accessibilityRole="button">
            <Text style={s.tanlaLabel}>{t("yolovchi.qayerga")}</Text>
            <Text style={s.tanlaQiymat}>{to?.name ?? t("yolovchi.tanlang")}</Text>
          </Pressable>
          <Text style={s.bosh}>{t("yolovchi.qachon")}</Text>
          <View style={s.joylar}>
            {KUNLAR.map((x) => (
              <Pressable
                key={String(x.k)}
                onPress={() => setQachon(x.k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: qachon === x.k }}
                style={[s.chip, qachon === x.k && s.joyOn]}
              >
                <Text style={[s.chipText, qachon === x.k && { color: "#ffffff" }]}>{x.label}</Text>
              </Pressable>
            ))}
          </View>
          {kind === "YOLOVCHI" ? (
            <>
              <Text style={s.bosh}>{t("yolovchi.necha")}</Text>
              <View style={s.joylar}>
                {[1, 2, 3, 4].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setOdam(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: odam === n }}
                    style={[s.joyBtn, odam === n && s.joyOn]}
                  >
                    <Text style={[s.joyText, odam === n && { color: "#ffffff" }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label={t("yolovchi.bagaj")} value={bagaj} onChangeText={setBagaj} placeholder={t("yolovchi.bagajMisol")} />
            </>
          ) : null}
          <Field label={t("yolovchi.izoh")} value={izoh} onChangeText={setIzoh} />
          <Field label={t("yolovchi.telefon")} value={tel} onChangeText={setTel} keyboardType="phone-pad" />
          {xato ? <Text style={{ color: color.danger, fontSize: 13.5 }}>{xato}</Text> : null}
          <Button title={t("yolovchi.yuborish")} loading={band} disabled={!from || !to || !tel.trim()} onPress={() => void yubor()} />
        </View>
      </Sheet>
      <LocationPicker
        open={pick !== null}
        title={pick === "to" ? t("yolovchi.qayerga") : t("yolovchi.qayerdan")}
        onClose={() => setPick(null)}
        onPick={(l) => {
          if (pick === "to") setTo(l);
          else setFrom(l);
          setPick(null);
        }}
      />
    </>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground, flexShrink: 1, flex: 1 },
  qoshBtn: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: color.brand, justifyContent: "center" },
  qoshText: { fontSize: 13, fontWeight: "700", color: color.brandText },
  havolalar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 14, marginTop: 8 },
  list: { padding: space.lg, gap: space.md },
  card: { padding: 14, gap: 4, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  yol: { fontSize: 16, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 13, color: color.mutedForeground },
  manba: { fontSize: 12, color: color.mutedForeground, fontStyle: "italic" },
  izoh: { fontSize: 13.5, color: color.foreground },
  pastki: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  narx: { flex: 1, fontSize: 16, fontWeight: "800", color: color.brandText },
  bronBtn: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.brand, justifyContent: "center", marginLeft: "auto" },
  bronText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  bosh: { fontSize: 14, fontWeight: "700", color: color.foreground },
  joylar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  joyBtn: { width: 48, height: 44, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  joyOn: { backgroundColor: color.brand, borderColor: color.brand },
  joyText: { fontSize: 16, fontWeight: "800", color: color.foreground },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "700", color: color.foreground },
  tanla: { padding: 12, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, gap: 2 },
  tanlaLabel: { fontSize: 12, color: color.mutedForeground },
  tanlaQiymat: { fontSize: 15, fontWeight: "700", color: color.foreground },
  rozi: { flexDirection: "row", alignItems: "center", gap: 10 },
  katak: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  katakOn: { backgroundColor: color.brand, borderColor: color.brand },
  roziText: { flex: 1, fontSize: 13.5, color: color.foreground },
  havola: { fontWeight: "800", color: color.brandText },
}));
