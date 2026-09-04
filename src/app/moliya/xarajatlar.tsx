/**
 * F2 — xarajatlarni tasdiqlash.
 *
 * ── BU YERDA ISH TO'XTAB TURADI ─────────────────────────────────
 *
 * Haydovchi chek yubordi, egasi tasdiqlamaguncha reys hisobi
 * noto'g'ri va haydovchi puliga yeta olmaydi.
 *
 * ── CHEK SURATI KARTOCHKADA ─────────────────────────────────────
 *
 * Qaror aynan chekka qarab qabul qilinadi, shuning uchun egasi
 * har birini ochib-yopib o'tirmasin. Cheki yo'q xarajat alohida
 * belgilanadi — bu rad etish sababi bo'lishi mumkin.
 *
 * ── SUMMANI TUZATISH MUMKIN, LEKIN YOZILADI ─────────────────────
 *
 * `editCount` — necha marta tuzatilgani. Keyin nizo chiqsa
 * «men boshqa summa yozgandim» degan gapga tarix javob beradi.
 */
import { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { authImage } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { expenseCategoryLabel, t } from "@/lib/i18n";

type Expense = {
  id: string;
  tripId: string;
  tripNo: number;
  plate: string | null;
  category: string;
  title: string | null;
  amount: number;
  currency: string;
  status: string;
  hasReceipt: boolean;
  edits: number;
  at: string;
};

const TABS = ["PENDING", "APPROVED", "REJECTED"] as const;

export default function Xarajatlar() {
  const [tab, setTab] = useState<string>("PENDING");
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    status: string;
    items: Expense[];
  }>(`/api/finance/expenses?status=${tab}`, [tab]);

  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(id);
    setFailed("");
    try {
      await api("/api/finance/expense", { method: "POST", body: { id, status } });
      reload();
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <View style={s.root}>
      <Header
        title={t("mob.fin.expensesTitle")}
        subtitle={
          tab === "PENDING"
            ? t("mob.fin.pendingN", { n: items.length })
            : t("mob.fin.itemsN", { n: items.length })
        }
      />

      <View style={s.tabs}>
        {TABS.map((k) => (
          <Pressable key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabText, tab === k && s.tabTextOn]}>{t(`mob.expStatus.${k}`)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Xarajatlar tarixi cheksiz o'sadi — har reysdan yangi
          yozuvlar qo'shiladi. `ScrollView` ularning hammasini bir
          vaqtda chizardi. */}
      <FlatList
        data={loading && !data ? [] : items}
        keyExtractor={(e) => e.id}
        renderItem={({ item: e }) => (
        <View style={[s.card, e.status === "PENDING" && s.cardHot]}>
          <View style={s.head}>
            <View style={s.catTag}>
              <Text style={s.catText}>{expenseCategoryLabel(e.category)}</Text>
            </View>
            <Text style={s.meta}>
              {t("mob.fin.tripN", { n: e.tripNo })}
              {e.plate ? ` · ${e.plate}` : ""}
            </Text>
          </View>

          <Text style={s.amount}>
            {fmtNum(e.amount)} <Text style={s.cur}>{e.currency}</Text>
          </Text>
          {e.title ? <Text style={s.title}>{e.title}</Text> : null}

          {/* CHEK — qaror shunga qarab qabul qilinadi */}
          {e.hasReceipt ? (
            <Image
              source={authImage(`/api/trips/${e.tripId}/expenses/${e.id}/receipt`)}
              style={s.receipt}
              resizeMode="contain"
            />
          ) : (
            <View style={s.noReceipt}>
              <Icon name="alert" size={15} stroke={color.warning} />
              <Text style={s.noReceiptText}>{t("mob.fin.noReceipt")}</Text>
            </View>
          )}

          {e.edits > 0 && (
            <Text style={s.edited}>{t("mob.fin.editedN", { n: e.edits })}</Text>
          )}

          {e.status === "PENDING" && (
            <>
              <View style={s.row2}>
                <Pressable
                  style={[s.btn, s.btnGhost]}
                  disabled={busy === e.id}
                  onPress={() => void decide(e.id, "REJECTED")}
                >
                  <Text style={[s.btnGhostText, { color: color.danger }]}>
                    {t("mob.fin.reject")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.btn, s.btnGhost]}
                  disabled={busy === e.id}
                  onPress={() => setEditing(e)}
                >
                  <Text style={s.btnGhostText}>{t("mob.fin.fixAmount")}</Text>
                </Pressable>
              </View>
              <Pressable
                style={[s.btn, s.btnOk]}
                disabled={busy === e.id}
                onPress={() => void decide(e.id, "APPROVED")}
              >
                <Text style={s.btnOkText}>{t("mob.fin.approve")}</Text>
              </Pressable>
            </>
          )}
        </View>
        )}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          failed ? (
            <View style={s.failed}>
              <Text style={s.failedText}>{failed}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading && !data ? (
            <Skeleton rows={3} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty
              icon="check"
              title={tab === "PENDING" ? t("mob.fin.allDoneTitle") : t("mob.fin.emptyTitle")}
              text={tab === "PENDING" ? t("mob.fin.allDoneHint") : ""}
            />
          )
        }
      />

      <EditSheet
        expense={editing}
        onClose={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          reload();
        }}
      />
    </View>
  );
}

/**
 * Summani tuzatish.
 *
 * Har tuzatish jurnalga tushadi — shuning uchun oynada buni ochiq
 * aytamiz: odam bilib turib o'zgartirsin.
 */
function EditSheet({
  expense,
  onClose,
  onDone,
}: {
  expense: Expense | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const insets = useSafeAreaInsets();

  const value = Number(amount.replace(/\s/g, ""));

  async function save() {
    if (!expense) return;
    setBusy(true);
    setErr("");
    try {
      await api("/api/finance/expense", {
        method: "POST",
        body: { id: expense.id, amount: value },
      });
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={!!expense} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.fin.fixAmount")}</Text>
          <Text style={s.sheetSub}>
            {expense
              ? t("mob.fin.wasSum", { sum: `${fmtNum(expense.amount)} ${expense.currency}` })
              : ""}
          </Text>

          {err ? <ErrorBox message={err} /> : null}

          <Field
            label={t("mob.fin.newAmount")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
          />
          <Text style={s.hint}>{t("mob.fin.editNote")}</Text>

          <Button
            title={t("mob.common.save")}
            disabled={!(value > 0)}
            loading={busy}
            onPress={() => void save()}
          />
          <Pressable onPress={onClose} style={s.later}>
            <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  tabs: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  tabTextOn: { color: color.card, fontWeight: "600" },

  scroll: { padding: space.lg, gap: space.md },

  failed: {
    borderWidth: 1,
    borderColor: color.danger + "59",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  failedText: { fontSize: font.caption, color: color.danger },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardHot: { borderWidth: 2, borderColor: color.brand },

  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  catTag: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: color.brand + "1f",
    justifyContent: "center",
  },
  catText: { fontSize: 12, fontWeight: "600", color: "#c2490f" },
  meta: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  amount: { fontSize: 24, fontWeight: "700", color: color.foreground, marginTop: 11 },
  cur: { fontSize: 14, color: color.mutedForeground },
  title: { fontSize: 13, color: color.mutedForeground, marginTop: 3 },

  receipt: {
    height: 180,
    borderRadius: 11,
    backgroundColor: color.muted,
    marginTop: 12,
  },
  noReceipt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: color.warning + "14",
  },
  noReceiptText: { flex: 1, fontSize: 12, color: "#92400e" },

  edited: { fontSize: 12, color: color.mutedForeground, marginTop: 10 },

  row2: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },
  btnOk: { backgroundColor: color.success, marginTop: 8 },
  btnOkText: { fontSize: 15, fontWeight: "600", color: "#fff" },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: space.xs },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: color.foreground },
  sheetSub: { fontSize: 13, color: color.mutedForeground, marginBottom: space.xs },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 18 },
  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
