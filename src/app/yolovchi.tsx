/**
 * Yo'lovchi tashish — FURAM Bozorning bo'limi (TZ v3 §4, §15-17).
 *
 * Ilgari ilovada bu bo'lim umuman yo'q edi (faqat web `/rides`). Ro'yxat
 * web bilan bitta so'rovdan (`GET /api/rides` → `searchRides`): sinov
 * hisobi va o'tib ketgan safar chiqmaydi. Bron — webdagi bilan bir xil
 * amal (`POST /api/rides`, `action: "book"`): oferta roziligi katakchadan,
 * server o'zi tekshiradi.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
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
};

const ikki = (n: number) => String(n).padStart(2, "0");
function vaqt(iso: string) {
  const d = new Date(iso);
  return `${ikki(d.getDate())}.${ikki(d.getMonth() + 1)} · ${ikki(d.getHours())}:${ikki(d.getMinutes())}`;
}

export default function Yolovchi() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: Safar[] }>("/api/rides");
  const [bron, setBron] = useState<Safar | null>(null);
  const [joy, setJoy] = useState(1);
  const [ism, setIsm] = useState("");
  const [tel, setTel] = useState("");
  const [rozi, setRozi] = useState(false);
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState<{ matn: string; xato: boolean } | null>(null);

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
      reload();
    } catch (e) {
      setXabar({ matn: e instanceof FuramError ? e.message : String(e), xato: true });
    } finally {
      setBand(false);
    }
  }

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
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item: r }) => (
          <View style={s.card}>
            <Text style={s.yol} numberOfLines={2}>
              {r.from} → {r.to}
            </Text>
            <Text style={s.meta}>
              {vaqt(r.departAt)} · {t("yolovchiUi.joy", { n: r.seatsFree })}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {[r.vehicle, r.driver.name].filter(Boolean).join(" · ")}
              {r.driver.isVerified ? " ✓" : ""}
            </Text>
            <View style={s.pastki}>
              <Text style={s.narx}>
                {r.isNegotiable && !r.price ? t("yolovchiUi.kelishiladi") : `${fmtNum(r.price)} ${r.currency}`}
              </Text>
              <Pressable
                onPress={() => och(r)}
                disabled={r.seatsFree < 1}
                accessibilityRole="button"
                style={({ pressed }) => [s.bronBtn, (pressed || r.seatsFree < 1) && { opacity: 0.6 }]}
              >
                <Text style={s.bronText}>{t("yolovchiUi.bron")}</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={3} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty icon="users" title={t("yolovchiUi.bosh")} text={t("yolovchiUi.boshIzoh")} />
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
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  list: { padding: space.lg, gap: space.md },
  card: { padding: 14, gap: 4, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  yol: { fontSize: 16, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 13, color: color.mutedForeground },
  pastki: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  narx: { flex: 1, fontSize: 16, fontWeight: "800", color: color.brandText },
  bronBtn: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.brand, justifyContent: "center" },
  bronText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  bosh: { fontSize: 14, fontWeight: "700", color: color.foreground },
  joylar: { flexDirection: "row", gap: 8 },
  joyBtn: { width: 48, height: 44, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  joyOn: { backgroundColor: color.brand, borderColor: color.brand },
  joyText: { fontSize: 16, fontWeight: "800", color: color.foreground },
  rozi: { flexDirection: "row", alignItems: "center", gap: 10 },
  katak: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  katakOn: { backgroundColor: color.brand, borderColor: color.brand },
  roziText: { flex: 1, fontSize: 13.5, color: color.foreground },
  havola: { fontWeight: "800", color: color.brandText },
}));
