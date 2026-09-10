/**
 * «Ishga chiqdim» va ochiq aylanma holati.
 *
 * ── AYLANMA NIMA ────────────────────────────────────────────────
 *
 * Haydovchi garajdan chiqadi, Toshkent → Moskva yukini olib
 * boradi, o'sha yerdan Moskva → Qozon oladi, keyin Qozon →
 * Toshkent bilan qaytadi. Bu UCHTA reys, lekin BITTA chiqish.
 *
 * Ilgari ular bir-biriga bog'lanmagan uchta yozuv edi va uchta
 * natija chiqardi: yoqilg'i qaysi reysga tegishli ekani noaniq
 * qolardi, «bu safar qancha topdim» degan savolga javob yo'q edi,
 * bo'sh qaytishni esa hech kim ko'rmasdi — aynan shu eng katta
 * zarar, chunki uni oldini olish mumkin edi.
 *
 * ── TAKROR BOSISH XATO EMAS ─────────────────────────────────────
 *
 * Server takror bosishda ham 200 qaytaradi va MAVJUD aylanmani
 * beradi. Xato qaytarilsa, haydovchi «ishlamadi» deb yana bosardi
 * va har bosishda ikkinchi aylanma ochilib ketardi.
 *
 * ── YO'NALISH KEYIN BELGILANADI ─────────────────────────────────
 *
 * Aylanma ochilganda yo'nalish BO'SH: haydovchi hali qayerga
 * ketishini o'zi ham bilmaydi. U birinchi reys qo'shilganda
 * paydo bo'ladi.
 */
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { isGuest } from "@/lib/guest";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Tour = {
  id: string;
  no: number;
  startedAt: string;
  from: string | null;
  to: string | null;
  plate: string | null;
  trips: number;
  chatId: string | null;
};

export function TourPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, reload } = useApi<{ tour: Tour | null }>(isGuest() ? null : "/api/tours");
  const tour = data?.tour ?? null;

  const start = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/tours", { method: "POST" });
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }, [reload]);

  /* Javob kelmaguncha hech narsa chizilmaydi: «Ishga chiqdingizmi?»
     chiqib, keyin ochiq aylanmaga almashsa — ko'zga urilardi */
  if (!data) return null;

  if (!tour) {
    return (
      <View style={s.card}>
        <View style={s.icon}>
          <Icon name="route" size={21} stroke={color.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("mob.tour.askTitle")}</Text>
          <Text style={s.sub}>{t("mob.tour.askBody")}</Text>
          {err ? <Text style={s.err}>{err}</Text> : null}
          <View style={{ marginTop: 10 }}>
            <Button title={t("mob.tour.start")} loading={busy} onPress={start} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/aylanma/${tour.id}`)}
      style={({ pressed }) => [s.card, s.cardOpen, pressed && { opacity: 0.92 }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.headRow}>
          <View style={s.no}>
            <Text style={s.noText}>A-{tour.no}</Text>
          </View>
          <Text style={s.openTitle}>{t("mob.tour.open")}</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.since}>{tour.startedAt.slice(0, 10)}</Text>
        </View>

        {/* Yo'nalish — reys qo'shilmaguncha bo'sh turadi */}
        <Text style={s.route}>
          {tour.from && tour.to
            ? `${tour.from} → ${tour.to}`
            : t("mob.tour.routeUnknown")}
        </Text>
        <Text style={s.sub}>
          {tour.trips > 0 ? t("mob.tour.nTrips", { n: tour.trips }) : t("mob.tour.noTrips")}
        </Text>
      </View>
      <Icon name="chevron" size={17} stroke={color.mutedForeground} />
    </Pressable>
  );
}

const s = themed(() => ({
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
  cardOpen: { borderWidth: 1, borderColor: color.brand + "55", backgroundColor: color.brandSoft },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  title: { fontSize: 14.5, fontWeight: "800", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, lineHeight: 17 },

  headRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  no: { backgroundColor: color.brand, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  noText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  openTitle: { fontSize: 13.5, fontWeight: "800", color: color.foreground },
  since: { fontSize: 11.5, color: color.mutedForeground },
  route: { fontSize: 14, fontWeight: "700", color: color.foreground },

  err: { fontSize: 12, color: color.danger, marginTop: 6 },
}));
