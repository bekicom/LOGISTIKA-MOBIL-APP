/**
 * Suhbatdan amallar — kelishuv, to'lov so'rovi, tasdiq so'rovi,
 * hodisa (TZ 02: 27, 28, 36, 30-band). `?kind=` bilan ochiladi.
 *
 * Web `chat-actions.tsx` bilan bir xil maydonlar; natija chatda
 * maxsus xabar bo'lib chiqadi (`kind`), hodisa esa alohida yozuv.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Field, Header, Notice, Switch } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Kind = "agreement" | "pay" | "confirm" | "incident";
const CURRENCIES = ["UZS", "USD", "RUB", "KZT", "EUR"] as const;
const INC_KINDS = ["breakdown", "accident", "customs", "cargo", "payment", "delay", "weather", "other"] as const;

const HEAD: Record<Kind, { icon: IconName; tint: string; title: string; hint: string }> = {
  agreement: { icon: "handshake", tint: color.brand, title: "mob.chatAct.agreementTitle", hint: "mob.chatAct.agreementHint" },
  pay: { icon: "wallet", tint: color.success, title: "mob.chatAct.payTitle", hint: "mob.chatAct.payHint" },
  confirm: { icon: "check", tint: color.warning, title: "mob.chatAct.confirmTitle", hint: "mob.chatAct.confirmHint" },
  incident: { icon: "alert", tint: color.danger, title: "mob.chatAct.incidentTitle", hint: "" },
};

export default function SuhbatAmal() {
  const { id, kind: k, tripId } = useLocalSearchParams<{ id: string; kind?: string; tripId?: string }>();
  const kind = (["agreement", "pay", "confirm", "incident"].includes(k ?? "") ? k : "agreement") as Kind;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [service, setService] = useState(t("mob.chatAct.serviceDefault"));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [incKind, setIncKind] = useState<(typeof INC_KINDS)[number]>("breakdown");
  const [incTitle, setIncTitle] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [withLoc, setWithLoc] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = Number(amount.replace(/[^\d.]/g, ""));
  const ready =
    kind === "confirm" ? text.trim().length >= 3
    : kind === "incident" ? incTitle.trim().length >= 3
    : num > 0 && (kind !== "agreement" || service.trim().length >= 2);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      if (kind === "incident") {
        let lat: number | undefined;
        let lng: number | undefined;
        if (withLoc) {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.granted) {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
            if (pos) {
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
            }
          }
        }
        await api("/api/incidents", {
          method: "POST",
          body: {
            kind: incKind,
            title: incTitle.trim(),
            description: incDesc.trim() || null,
            ...(tripId ? { tripId } : { chatId: id }),
            ...(lat != null && lng != null ? { lat, lng } : {}),
          },
        });
      } else {
        const body =
          kind === "agreement"
            ? { action: "agreement", service: service.trim(), amount: num, currency, note: note.trim() || undefined }
            : kind === "pay"
              ? { action: "pay_request", amount: num, currency, note: note.trim() || undefined }
              : { action: "confirm_request", text: text.trim() };
        await api(`/api/chat/${id}/actions`, { method: "POST", body });
      }
      router.back();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const h = HEAD[kind];

  return (
    <View style={s.root}>
      <Header title={t(h.title)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: h.tint + "1a" }]}>
            <Icon name={h.icon} size={26} stroke={h.tint} />
          </View>
          {h.hint ? <Text style={s.hint}>{t(h.hint)}</Text> : null}
        </View>

        <View style={s.card}>
          {kind === "agreement" ? (
            <Field label={t("mob.chatAct.service")} value={service} onChangeText={setService} maxLength={120} />
          ) : null}

          {kind === "agreement" || kind === "pay" ? (
            <>
              <View style={s.amountRow}>
                <View style={{ flex: 1 }}>
                  <Field label={t("mob.chatAct.amount")} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="100" />
                </View>
              </View>
              <View style={s.curRow}>
                {CURRENCIES.map((c) => (
                  <Pressable key={c} onPress={() => setCurrency(c)} style={[s.cur, currency === c && s.curOn]}>
                    <Text style={[s.curText, currency === c && s.curTextOn]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label={t("mob.chatAct.note")} hint={t("mob.common.optional")} value={note} onChangeText={setNote} maxLength={500} />
            </>
          ) : null}

          {kind === "confirm" ? (
            <Field
              label={t("mob.chatAct.text")}
              value={text}
              onChangeText={setText}
              placeholder={t("mob.chatAct.confirmPh")}
              multiline
              maxLength={1000}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
          ) : null}

          {kind === "incident" ? (
            <>
              <View style={s.kinds}>
                {INC_KINDS.map((ik) => (
                  <Pressable key={ik} onPress={() => setIncKind(ik)} style={[s.kind, incKind === ik && s.kindOn]}>
                    <Text style={[s.kindText, incKind === ik && s.kindTextOn]}>{t(`mob.inc.kind.${ik}`)}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label={t("mob.chatAct.incWhat")} value={incTitle} onChangeText={setIncTitle} placeholder={t("mob.chatAct.incWhatPh")} maxLength={200} />
              <Field
                label={t("mob.chatAct.incDetails")}
                hint={t("mob.common.optional")}
                value={incDesc}
                onChangeText={setIncDesc}
                multiline
                maxLength={2000}
                style={{ minHeight: 80, textAlignVertical: "top" }}
              />
              <View style={s.switchRow}>
                <Icon name="map-pin" size={18} stroke={color.mutedForeground} />
                <Text style={s.switchText}>{t("mob.chatAct.incWithLocation")}</Text>
                <Switch value={withLoc} onValueChange={setWithLoc} />
              </View>
            </>
          ) : null}

          {err ? <Notice tone="danger">{err}</Notice> : null}

          <Button title={t(kind === "incident" ? "mob.chatAct.incidentTitle" : "mob.tripDocs.send")} onPress={submit} loading={busy} disabled={!ready} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  hero: { alignItems: "center", gap: 10, paddingVertical: 6 },
  heroIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 13, color: color.mutedForeground, textAlign: "center", lineHeight: 19, paddingHorizontal: 12 },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, gap: space.md, ...shadow.card },
  amountRow: { flexDirection: "row", gap: 8 },
  curRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  cur: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.muted, justifyContent: "center" },
  curOn: { backgroundColor: color.blue },
  curText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
  curTextOn: { color: "#fff" },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kind: { paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: color.muted, justifyContent: "center" },
  kindOn: { backgroundColor: color.dangerSoft },
  kindText: { fontSize: 12.5, fontWeight: "600", color: color.mutedForeground },
  kindTextOn: { color: color.danger },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchText: { flex: 1, fontSize: 14, color: color.foreground },
}));
