/**
 * E7 — reysda olingan pullar («Pul oldim», TZ 17).
 *
 * ── NEGA XARAJATLARDAN ALOHIDA ──────────────────────────────────
 *
 * Xarajat — pul KETDI, bu esa pul KELDI. Ikkalasi bitta ro'yxatda
 * turganda haydovchi avansni xarajat qatoriga yozib yuborardi va
 * hisob teskari chiqardi.
 *
 * ⚠️ VALYUTALAR QO'SHILMAYDI (qoida 2): `totals` — massiv. Kurs
 * kunlik o'zgaradi, bitta «jami» raqami ertaga boshqacha chiqib
 * odamni chalg'itardi.
 *
 * Yozuvni O'CHIRISH yo'q — ataylab. Bu pul harakati jurnali:
 * «avansni oldim» degani keyin yo'qolib qolsa, bahsning ma'nosi
 * qolmaydi. Xato yozilsa yangi qator bilan to'g'rilanadi.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const KINDS = ["ADVANCE", "SALARY", "FREIGHT", "OTHER"] as const;
const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];

type Item = {
  id: string;
  kind: string;
  amount: number;
  currency: string;
  note: string | null;
  actorName: string;
  mine: boolean;
  createdAt: string;
};
type Feed = {
  canAdd: boolean;
  items: Item[];
  totals: { currency: string; amount: number }[];
};

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export default function ReysPuli() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/trips/${id}/money` : null,
    [id],
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("ADVANCE");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const value = Number(amount.replace(/\s/g, "").replace(",", "."));
  const ready = Number.isFinite(value) && value > 0;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/trips/${id}/money`, {
        method: "POST",
        body: { kind, amount: value, currency, note: note.trim() || undefined },
      });
      setOpen(false);
      setAmount("");
      setNote("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.money.title")} />

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <Text style={s.lead}>{t("mob.money.lead")}</Text>
            {loading && !data ? <Skeleton rows={2} /> : null}
            {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

            {data && data.totals.length > 0 ? (
              <View style={s.totals}>
                <Text style={s.totalsLabel}>{t("mob.money.total")}</Text>
                {data.totals.map((tt) => (
                  <Text key={tt.currency} style={s.totalsValue}>
                    {fmt(tt.amount)} {tt.currency}
                  </Text>
                ))}
              </View>
            ) : null}

            {data && !data.canAdd ? (
              <Notice tone="info">{t("mob.money.lockedRole")}</Notice>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          data && !loading ? (
            <Empty
              icon="wallet"
              title={t("mob.money.empty")}
              text={t("mob.money.emptyHint")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Icon name="wallet" size={18} stroke={color.success} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.rowTitle}>{t(`moneyKind.${item.kind}`)}</Text>
              <Text style={s.rowMeta} numberOfLines={1}>
                {item.mine ? t("mob.tpart.you") : item.actorName} · {item.createdAt.slice(5, 10)}
              </Text>
              {item.note ? <Text style={s.rowNote}>{item.note}</Text> : null}
            </View>
            <Text style={s.rowAmount}>
              {fmt(item.amount)} {item.currency}
            </Text>
          </View>
        )}
      />

      {data?.canAdd ? (
        <View style={[s.bar, { paddingBottom: insets.bottom + space.md }]}>
          <Button
            title={t("mob.money.add")}
            onPress={() => setOpen(true)}
            icon={<Icon name="plus" size={18} stroke="#fff" />}
          />
        </View>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.money.add")}>
        <Text style={s.label}>{t("mob.money.kind")}</Text>
        <View style={s.chips}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.chip, kind === k && s.chipOn]}>
              <Text style={[s.chipText, kind === k && { color: "#fff" }]}>{t(`moneyKind.${k}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.money.amount")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>

        <Text style={[s.label, { marginTop: space.md }]}>{t("mob.money.currency")}</Text>
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

        <View style={{ marginTop: space.md }}>
          <Field
            placeholder={t("mob.money.notePh")}
            value={note}
            onChangeText={setNote}
            maxLength={300}
          />
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <View style={{ marginTop: space.md }}>
          <Button
            title={t("mob.common.save")}
            onPress={save}
            loading={busy}
            disabled={!ready}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: 8 },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  totals: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  totalsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  totalsValue: {
    fontSize: 21,
    fontWeight: "800",
    color: color.foreground,
    fontVariant: ["tabular-nums"],
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: color.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14.5, fontWeight: "700", color: color.foreground },
  rowMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  rowNote: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3 },
  rowAmount: {
    fontSize: 14.5,
    fontWeight: "800",
    color: color.foreground,
    fontVariant: ["tabular-nums"],
  },

  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
});
