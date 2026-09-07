/**
 * «Bu yukni olaman» — reys ochish (dispetcher va mashina egasi).
 *
 * ── NEGA ALOHIDA OYNA ───────────────────────────────────────────
 *
 * Reys ochish bitta tugma emas: qaysi mashina bilan degan savol
 * bor. Webda ham shunday (`trip-assign`) va sabab bir xil —
 * odamda bir nechta mashina bo'lishi mumkin, birinchisini
 * jimgina tanlab qo'yish esa noto'g'ri reys ochilishiga olib
 * kelardi.
 *
 * ── HAYDOVCHISIZ MASHINA OLDINDAN AYTILADI ──────────────────────
 *
 * Asosiy haydovchisi yo'q mashinada reys ochilmaydi. Buni server
 * xato qilib qaytarardi, biz esa oldindan aytamiz va o'sha yerda
 * taklif havolasini beramiz (5-qoida): aks holda odam xatoni
 * ko'rib, haydovchini qayerdan topishni o'ylab qolardi.
 *
 * ── YORLIQ SHU YERDA YIG'ILADI ──────────────────────────────────
 *
 * Server maydonlarni alohida yuboradi: raqam, marka, haydovchi.
 * «01A123AA · Isuzu · haydovchisiz» degan jumla ilovada, o'z
 * tilida yasaladi (1-qoida).
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { DriverInvite } from "@/components/DriverInvite";
import { api, FuramError } from "@/lib/api";
import { guestBlocked } from "@/lib/guest-gate";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Option = {
  id: string;
  kind: "vehicle" | "truck";
  plate: string | null;
  brand: string | null;
  driver: string | null;
  needsDriver: boolean;
  typeName: string | null;
  capacityT: number | null;
};

type Take = { canTake: boolean; tripId: string | null; options: Option[] };

export function TakeLoad({ loadId }: { loadId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Take | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Ro'yxat EKRAN OCHILISHIDA emas, tugma bosilganda olinadi: u
     ikkita ortiqcha so'rov va yuk sahifasi undan tez ochiladi */
  const load = useCallback(async () => {
    try {
      const r = await api<Take>(`/api/loads/${loadId}/take`);
      setData(r);
      setPicked(r.options[0]?.id ?? null);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.err.unknown"));
    }
  }, [loadId]);

  useEffect(() => {
    if (open && !data) void load();
  }, [open, data, load]);

  const chosen = data?.options.find((o) => o.id === picked) ?? null;

  async function submit() {
    if (!chosen) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ trip: { id: string } }>("/api/trips", {
        method: "POST",
        body:
          chosen.kind === "vehicle"
            ? { loadId, vehicleId: chosen.id }
            : { loadId, truckId: chosen.id },
      });
      setOpen(false);
      router.push(`/reys/${r.trip.id}`);
    } catch (e) {
      const fe = e as FuramError;
      /* Server «bu yukka reys allaqachon ochilgan» desa, xato
         ko'rsatish o'rniga o'sha reysga olib boramiz — web ham
         shunday qiladi va odam ikkinchi marta urinib ko'rmaydi */
      const tripId = (fe.data as { tripId?: string } | undefined)?.tripId;
      if (tripId) {
        setOpen(false);
        router.push(`/reys/${tripId}`);
        return;
      }
      setErr(fe.message ?? t("mob.err.unknown"));
    } finally {
      setBusy(false);
    }
  }

  function label(o: Option): string {
    if (o.kind === "truck") {
      const cap = o.capacityT != null ? ` · ${o.capacityT} ${t("mob.unit.t")}` : "";
      return `${t("mob.take.fromAd")}: ${o.typeName ?? "—"}${cap}`;
    }
    const who = o.driver ?? t("mob.take.noDriver");
    return [o.plate, o.brand, who].filter(Boolean).join(" · ");
  }

  return (
    <>
      <Pressable
        onPress={() => {
          if (guestBlocked()) return;
          setOpen(true);
        }}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
      >
        <View style={s.icon}>
          <Icon name="truck" size={21} stroke={color.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("mob.take.title")}</Text>
          <Text style={s.sub}>{t("mob.take.sub")}</Text>
        </View>
        <Icon name="chevron" size={17} stroke={color.mutedForeground} />
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.take.sheetTitle")}>
        {data && data.options.length === 0 ? (
          <Text style={s.empty}>{t("mob.take.noVehicles")}</Text>
        ) : null}

        {data && data.options.length > 0 ? (
          <>
            <Text style={s.ask}>{t("mob.take.which")}</Text>
            {/* Ro'yxat CHEGARALANGAN: server 20 ta mashina va 10 ta
                e'londan ortig'ini bermaydi — bitta odamda undan ko'p
                bo'sh transport bo'lishi amalda kuzatilmagan */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {data.options.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => setPicked(o.id)}
                    style={[s.row, picked === o.id && s.rowOn]}
                  >
                    <View style={[s.radio, picked === o.id && s.radioOn]}>
                      {picked === o.id ? <View style={s.dot} /> : null}
                    </View>
                    <Text style={s.rowText}>{label(o)}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {chosen?.needsDriver ? (
              <View style={s.warn}>
                <Text style={s.warnTitle}>{t("mob.take.needDriver")}</Text>
                <Text style={s.warnBody}>{t("mob.take.needDriverBody")}</Text>
                <DriverInvite vehicleId={chosen.id} />
              </View>
            ) : null}
          </>
        ) : null}

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={{ marginTop: space.lg, gap: 9 }}>
          <Button
            title={t("mob.take.open")}
            loading={busy}
            disabled={!chosen || chosen.needsDriver}
            onPress={submit}
          />
          <Button title={t("mob.common.cancel")} variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginTop: space.md,
    ...shadow.card,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  title: { fontSize: 14.5, fontWeight: "800", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 2, lineHeight: 17 },

  ask: { fontSize: 13, fontWeight: "700", color: color.foreground, marginBottom: 9 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  rowOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
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
  rowText: { flex: 1, fontSize: 13, fontWeight: "600", color: color.foreground },

  warn: {
    marginTop: space.md,
    borderWidth: 1,
    borderColor: color.warning + "4d",
    backgroundColor: color.warning + "12",
    borderRadius: radius.control,
    padding: space.md,
    gap: 6,
  },
  warnTitle: { fontSize: 12.5, fontWeight: "800", color: color.warning },
  warnBody: { fontSize: 11.5, color: color.mutedForeground, lineHeight: 17 },

  empty: { fontSize: 13, color: color.mutedForeground, lineHeight: 20 },
  err: { fontSize: 12.5, color: color.danger, marginTop: space.md },
});
