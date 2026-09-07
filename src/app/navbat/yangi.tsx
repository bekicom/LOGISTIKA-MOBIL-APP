/**
 * Qo'lda yangi navbat — PARK EGASI uchun.
 *
 * ── NEGA QO'LDA ─────────────────────────────────────────────────
 *
 * Navbat odatda reys ochilganda o'zi paydo bo'ladi: server
 * yo'nalishga qarab chegarani topadi. Lekin mashina hali reysda
 * bo'lmasligi ham mumkin — bo'sh ketayotgan, yoki reysi FURAM'dan
 * tashqarida. O'shanda egasi chegarani O'ZI tanlaydi.
 *
 * ── CHEGARA QOIDASI OLDINDAN AYTILADI ───────────────────────────
 *
 * Ba'zi chegarada navbat MAJBURIY va uni bir necha kun oldin olish
 * kerak (`mode`, `leadDays`). Buni tanlashdan KEYIN aytish kech
 * bo'lardi — mashina yo'lga chiqib bo'lgan bo'lishi mumkin
 * (5-qoida).
 *
 * ── FAQAT BO'SH MASHINALAR EMAS ─────────────────────────────────
 *
 * Ro'yxatda parkdagi hamma mashina turadi. Reysdagi mashinaga ham
 * navbat kerak bo'ladi — aynan u chegaraga borayotgan bo'lishi
 * mumkin.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tariffBlocked } from "@/lib/features";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Vehicle = { id: string; plate: string; brand: string | null; status: string };
type Border = {
  id: string;
  name: string;
  countryA: string;
  countryB: string;
  mode: "REQUIRED" | "NOT_REQUIRED" | "CONDITIONAL";
  leadDays: number;
};

export default function YangiNavbat() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const cars = useApi<{ items: Vehicle[] }>("/api/fleet/vehicles");
  const borders = useApi<{ items: Border[] }>("/api/queues/borders");

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [borderId, setBorderId] = useState<string | null>(null);
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const border = useMemo(
    () => borders.data?.items.find((b) => b.id === borderId) ?? null,
    [borders.data, borderId],
  );

  async function submit() {
    if (!vehicleId || !borderId) return;
    /* Qoida 5: to'siq OLDINDAN — «Chegara navbati» tarifga kiradi */
    if (tariffBlocked("queues")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ id: string }>("/api/queues", {
        method: "POST",
        body: { vehicleId, borderId, direction: direction.trim() || null },
      });
      router.replace(`/navbat/${r.id}`);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const loading = cars.loading || borders.loading;
  const error = cars.error ?? borders.error;

  return (
    <View style={s.root}>
      <Header title={t("mob.queueNew.title")} />
      <TariffNotice feature="queues" />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton rows={3} /> : null}
        {error ? (
          <ErrorBox
            message={error}
            onRetry={() => {
              cars.reload();
              borders.reload();
            }}
          />
        ) : null}

        {cars.data && cars.data.items.length === 0 ? (
          <Notice tone="warning">{t("mob.queueNew.noVehicles")}</Notice>
        ) : null}

        {cars.data && cars.data.items.length > 0 ? (
          <>
            <Text style={s.label}>{t("mob.queueNew.vehicle")}</Text>
            {/* CHEGARALANGAN: server parkdan 100 tagacha mashina
                beradi va bittasini tanlash uchun shuncha yetadi */}
            <View style={{ gap: 8 }}>
              {cars.data.items.map((v) => (
                <Pick
                  key={v.id}
                  on={vehicleId === v.id}
                  title={v.plate}
                  sub={v.brand ?? undefined}
                  onPress={() => setVehicleId(v.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {borders.data ? (
          <>
            <Text style={[s.label, { marginTop: space.lg }]}>{t("mob.queueNew.border")}</Text>
            <View style={{ gap: 8 }}>
              {borders.data.items.map((b) => (
                <Pick
                  key={b.id}
                  on={borderId === b.id}
                  title={b.name}
                  sub={`${b.countryA} → ${b.countryB}`}
                  onPress={() => setBorderId(b.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Chegara qoidasi — tanlangandan keyin darrov */}
        {border ? (
          <View style={{ marginTop: space.md }}>
            <Notice tone={border.mode === "REQUIRED" ? "warning" : "info"}>
              {border.mode === "REQUIRED"
                ? t("mob.queueNew.required", { n: border.leadDays })
                : border.mode === "NOT_REQUIRED"
                  ? t("mob.queueNew.notRequired")
                  : t("mob.queueNew.conditional", { n: border.leadDays })}
            </Notice>
          </View>
        ) : null}

        <View style={{ marginTop: space.lg }}>
          <Field
            label={t("mob.queueNew.direction")}
            hint={t("mob.queueNew.directionHint")}
            value={direction}
            onChangeText={setDirection}
            maxLength={200}
          />
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={{ marginTop: space.lg }}>
          <Button
            title={t("mob.queueNew.create")}
            loading={busy}
            disabled={!vehicleId || !borderId}
            onPress={submit}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Pick({
  on,
  title,
  sub,
  onPress,
}: {
  on: boolean;
  title: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.pick, on && s.pickOn]}>
      <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.dot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.pickTitle}>{title}</Text>
        {sub ? <Text style={s.pickSub}>{sub}</Text> : null}
      </View>
      {on ? <Icon name="check" size={17} stroke={color.brand} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },

  label: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, marginBottom: 9 },

  pick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    paddingVertical: 11,
    ...shadow.card,
  },
  pickOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  pickTitle: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  pickSub: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2 },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: color.brand },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },

  err: { fontSize: 12.5, color: color.danger, marginTop: space.md },
});
