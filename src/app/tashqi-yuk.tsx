/**
 * Tashqarida topilgan yuk (mijoz TZ'si 21-band).
 *
 * ── NEGA BU EKRAN KERAK ─────────────────────────────────────────
 *
 * Haydovchining yukining bir qismi FURAM'dan tashqarida topiladi:
 * tanish orqali, chegarada, yo'l ustida. Agar ular tizimga
 * kirmasa, «qancha ishladim» degan savolga javob yarim bo'lib
 * qoladi va xarajat hisobi ham buziladi.
 *
 * ── LENTAGA CHIQMAYDI ───────────────────────────────────────────
 *
 * Bu e'lon emas — u allaqachon kelishilgan. Server yukni yopiq
 * yaratadi va REYSNI DARHOL JONLI qiladi: keyingi qadamlar (hujjat,
 * xarajat, yopish) oddiy reysdagidek.
 *
 * ── MASHINA SO'RALMAYDI ─────────────────────────────────────────
 *
 * U haydovchining faol biriktirilishidan olinadi. So'rasak,
 * haydovchi begona mashinaga yuk ochib yuborishi mumkin bo'lardi.
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { TariffNotice } from "@/components/TariffNotice";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { api, FuramError } from "@/lib/api";
import { tariffBlocked } from "@/lib/features";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];

export default function TashqiYuk() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [from, setFrom] = useState<Loc | null>(null);
  const [to, setTo] = useState<Loc | null>(null);
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const ready = title.trim().length >= 2 && from != null && to != null;

  async function create() {
    /* Qoida 5: to'siq OLDINDAN. Tashqi yuk darhol JONLI reys ochadi,
       ya'ni «Reys va yuk nazorati» tarifiga kiradi. */
    if (tariffBlocked("trips")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ tripId: string }>("/api/loads/external", {
        method: "POST",
        body: {
          title: title.trim(),
          fromLocationId: from!.id,
          toLocationId: to!.id,
          weightT: num(weight),
          price: num(price),
          currency,
          customer: customer.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      router.replace({ pathname: "/reys/[id]", params: { id: r.tripId } });
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title={t("mob.extLoad.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.extLoad.lead")}</Text>

        <TariffNotice feature="trips" />

        <View style={s.card}>
          <Field
            label={t("mob.extLoad.what")}
            placeholder={t("mob.extLoad.whatPh")}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Pressable onPress={() => setPicking("from")} style={s.pick}>
            <Icon name="map-pin" size={17} stroke={color.mutedForeground} />
            <Text style={s.pickLabel}>{t("mob.loads.from")}</Text>
            <Text style={[s.pickValue, !from && { color: color.mutedForeground }]} numberOfLines={1}>
              {from?.name ?? t("mob.common.notSet")}
            </Text>
            <Icon name="chevron" size={17} stroke="#cbd5e1" />
          </Pressable>

          <Pressable onPress={() => setPicking("to")} style={s.pick}>
            <Icon name="map-pin" size={17} stroke={color.mutedForeground} />
            <Text style={s.pickLabel}>{t("mob.loads.to")}</Text>
            <Text style={[s.pickValue, !to && { color: color.mutedForeground }]} numberOfLines={1}>
              {to?.name ?? t("mob.common.notSet")}
            </Text>
            <Icon name="chevron" size={17} stroke="#cbd5e1" />
          </Pressable>

          <Field
            label={t("mob.trip.weight")}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="t"
          />
        </View>

        <View style={s.card}>
          <Field
            label={t("mob.money.amount")}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="0"
          />
          <View style={s.chips}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={[s.chip, currency === c && s.chipOn]}
              >
                <Text style={[s.chipText, currency === c && { color: "#fff" }]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Field
            label={t("mob.extLoad.customer")}
            placeholder={t("mob.extLoad.customerPh")}
            value={customer}
            onChangeText={setCustomer}
            maxLength={150}
          />
          <Field
            placeholder={t("mob.money.notePh")}
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            multiline
          />
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <Button
          title={t("mob.extLoad.create")}
          onPress={create}
          loading={busy}
          disabled={!ready}
          icon={<Icon name="play" size={18} stroke="#fff" />}
        />
      </ScrollView>

      <LocationPicker
        open={picking !== null}
        title={picking === "from" ? t("mob.loads.from") : t("mob.loads.to")}
        onClose={() => setPicking(null)}
        onPick={(l) => {
          if (picking === "from") setFrom(l);
          else setTo(l);
          setPicking(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },

  pick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: color.muted,
  },
  pickLabel: { fontSize: 13, color: color.mutedForeground },
  pickValue: { flex: 1, fontSize: 14, fontWeight: "600", color: color.foreground, textAlign: "right" },

  chips: { flexDirection: "row", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
});
