/**
 * O1 — kelishuvlar.
 *
 * EKRAN HOLAT BO'YICHA EMAS, NAVBAT BO'YICHA TUZILGAN. Webda
 * kelishuvlar holat bo'yicha saralanadi; telefonda odam yo'lda,
 * to'xtash orasida qaraydi va bitta savoli bor: mendan nima
 * kutilyapti? Shuning uchun tepada «sizdan javob kutilmoqda»
 * turadi, qolgani pastda.
 *
 * «Navbat» ikki xil: taklifga javob va PUL TASDIG'I. Server
 * ikkalasini `todo` maydonida oldindan hisoblab beradi — klient
 * status'lardan o'zi chiqarib olmaydi.
 */
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { ago, money } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Deal = {
  id: string;
  kind: "LOAD" | "TRUCK";
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  todo: "answer" | "confirmPay" | "markPay" | null;
  iSent: boolean;
  iCanCancel: boolean;
  amDispatcher: boolean;
  route: { from: string; to: string } | null;
  subject: { kind: "load" | "truck"; id: string; title: string | null; weightT: number | null } | null;
  fee: number;
  currency: string;
  terms: string | null;
  note: string | null;
  rejectReason: string | null;
  paidMarkedAt: string | null;
  paidConfirmedAt: string | null;
  other: { id: string; name: string; furamId: number };
  createdAt: string;
};

type Feed = { items: Deal[]; waiting: number };

const FILTERS = ["all", "pending", "accepted"] as const;
type Filter = (typeof FILTERS)[number];

export default function Kelishuvlar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>("/api/deals/list");

  async function act(id: string, action: string) {
    setBusy(id);
    setErr(null);
    try {
      await api(`/api/deals/${id}`, { method: "PATCH", body: { action } });
      reload();
    } catch (e) {
      setErr((e as FuramError).message);
    } finally {
      setBusy(null);
    }
  }

  const all = data?.items ?? [];
  const shown =
    filter === "pending"
      ? all.filter((d) => d.status === "PENDING")
      : filter === "accepted"
        ? all.filter((d) => d.status === "ACCEPTED")
        : all;

  const mine = shown.filter((d) => d.todo);
  const rest = shown.filter((d) => !d.todo);

  return (
    <View style={s.root}>
      <Header title={t("mob.deals.title")} subtitle={t("mob.deals.subtitle")} />

      <View style={s.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[s.filter, filter === f && s.filterOn]}
            accessibilityRole="button"
          >
            <Text style={[s.filterText, filter === f && s.filterTextOn]}>
              {t(`mob.deals.f_${f}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {loading && !data ? (
          <Skeleton rows={4} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !shown.length ? (
          <Empty icon="package" title={t("mob.deals.empty")} text={t("mob.deals.emptyText")} />
        ) : (
          <>
            {err ? <ErrorBox message={err} /> : null}

            {mine.length ? (
              <>
                <Text style={s.groupHot}>
                  {t("mob.deals.waitingYou", { n: mine.length })}
                </Text>
                {mine.map((d) => (
                  <Card key={d.id} d={d} busy={busy === d.id} onAct={act} onOpen={router.push} />
                ))}
              </>
            ) : null}

            {rest.length ? (
              <>
                <Text style={s.group}>{t("mob.deals.rest")}</Text>
                {rest.map((d) => (
                  <Card key={d.id} d={d} busy={busy === d.id} onAct={act} onOpen={router.push} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Card({
  d,
  busy,
  onAct,
  onOpen,
}: {
  d: Deal;
  busy: boolean;
  onAct: (id: string, action: string) => void;
  onOpen: (href: never) => void;
}) {
  const hot = d.todo === "answer";
  const pay = d.todo === "confirmPay" || d.todo === "markPay";
  const dim = d.status === "REJECTED" || d.status === "CANCELLED";

  return (
    <View style={[s.card, hot && s.cardHot, pay && s.cardPay, dim && s.cardDim]}>
      <View style={s.cardTop}>
        <View style={[s.badge, badgeStyle(d)]}>
          <Text style={[s.badgeText, { color: badgeColor(d) }]}>{badgeLabel(d)}</Text>
        </View>
        <Text style={s.ago}>{ago(d.createdAt)}</Text>
      </View>

      {d.route ? (
        <Text style={s.route}>
          {d.route.from} → {d.route.to}
        </Text>
      ) : null}
      {d.subject ? (
        <Text style={s.subject} numberOfLines={1}>
          {[
            d.subject.title,
            d.subject.weightT != null ? `${d.subject.weightT} t` : null,
            t(`mob.deals.k_${d.kind}`),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}

      {/* Pul tasdig'i — alohida blok, alohida rang */}
      {d.todo === "confirmPay" ? (
        <View style={s.payBox}>
          <Text style={s.payText}>{t("mob.deals.paidClaim", { name: d.other.name })}</Text>
        </View>
      ) : null}

      <View style={s.who}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{d.other.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.whoName}>{d.other.name}</Text>
          <Text style={s.whoSub}>
            {t(d.amDispatcher ? "mob.deals.roleOwner" : "mob.deals.roleDispatcher")} · FURAM ID{" "}
            {d.other.furamId}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.fee}>
            {money(d.fee, d.currency) ?? `${d.fee} ${d.currency}`}
          </Text>
          <Text style={s.whoSub}>{t("mob.deals.fee")}</Text>
        </View>
      </View>

      {d.terms || d.note ? <Text style={s.note}>{d.terms ?? d.note}</Text> : null}
      {d.rejectReason ? (
        <Text style={s.reject}>
          {t("mob.deals.reason")}: {d.rejectReason}
        </Text>
      ) : null}

      {/* Tugmalar — KIM YUBORGANIGA qarab */}
      {d.todo === "answer" ? (
        <View style={s.btns}>
          <Pressable
            style={[s.btn, s.btnPrimary, busy && s.btnOff]}
            disabled={busy}
            onPress={() => onAct(d.id, "accept")}
            accessibilityRole="button"
          >
            <Text style={s.btnPrimaryText}>{t("mob.deals.accept")}</Text>
          </Pressable>
          <Pressable
            style={[s.btn, s.btnGhost, busy && s.btnOff]}
            disabled={busy}
            onPress={() => onAct(d.id, "reject")}
            accessibilityRole="button"
          >
            <Text style={s.btnGhostText}>{t("mob.deals.reject")}</Text>
          </Pressable>
        </View>
      ) : d.todo === "confirmPay" ? (
        <View style={s.btns}>
          <Pressable
            style={[s.btn, s.btnPay, busy && s.btnOff]}
            disabled={busy}
            onPress={() => onAct(d.id, "confirm_paid")}
            accessibilityRole="button"
          >
            <Text style={s.btnPrimaryText}>{t("mob.deals.confirmPay")}</Text>
          </Pressable>
        </View>
      ) : d.todo === "markPay" ? (
        <View style={s.btns}>
          <Pressable
            style={[s.btn, s.btnGhost, busy && s.btnOff]}
            disabled={busy}
            onPress={() => onAct(d.id, "mark_paid")}
            accessibilityRole="button"
          >
            <Text style={s.btnGhostText}>{t("mob.deals.markPay")}</Text>
          </Pressable>
        </View>
      ) : d.iCanCancel ? (
        <Pressable
          style={s.cancelRow}
          disabled={busy}
          onPress={() => onAct(d.id, "cancel")}
          accessibilityRole="button"
        >
          <Text style={s.cancelHint}>{t("mob.deals.youSent")}</Text>
          <Text style={s.cancelText}>{t("mob.deals.takeBack")}</Text>
        </Pressable>
      ) : null}

      {/* E'longa o'tish */}
      {d.subject ? (
        <Pressable
          style={s.openRow}
          onPress={() =>
            onOpen(
              (d.subject!.kind === "load"
                ? `/yuk/${d.subject!.id}`
                : `/mashina/${d.subject!.id}`) as never,
            )
          }
          accessibilityRole="button"
        >
          <Text style={s.openText}>{t("mob.deals.openListing")}</Text>
          <Icon name="chevron" size={16} stroke="#cbd5e1" />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ─────────────────────────────────────────────── yorliqlar */

function badgeLabel(d: Deal): string {
  if (d.todo === "answer") return t("mob.deals.bOffer");
  if (d.todo === "confirmPay") return t("mob.deals.bPay");
  if (d.status === "PENDING") return t("mob.deals.bWaiting");
  return t(`mob.deals.st_${d.status}`);
}
const badgeColor = (d: Deal) =>
  d.todo === "answer"
    ? "#c2490f"
    : d.todo === "confirmPay" || d.status === "ACCEPTED"
      ? "#15803d"
      : d.status === "REJECTED"
        ? "#b91c1c"
        : "#64748b";
const badgeStyle = (d: Deal) => ({
  backgroundColor:
    d.todo === "answer"
      ? color.brand + "1f"
      : d.todo === "confirmPay" || d.status === "ACCEPTED"
        ? color.success + "1f"
        : d.status === "REJECTED"
          ? color.danger + "1a"
          : color.muted,
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  filters: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    gap: 7,
  },
  filter: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
  },
  filterOn: { backgroundColor: color.foreground, borderColor: color.foreground },
  filterText: { fontSize: font.caption, fontWeight: "500", color: "#475569" },
  filterTextOn: { color: "#fff", fontWeight: "600" },

  scroll: { padding: space.lg, gap: space.md },
  groupHot: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c2490f",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  group: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.4,
    marginTop: 8,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 15,
  },
  cardHot: { borderColor: color.brand + "73", borderLeftWidth: 3, borderLeftColor: color.brand },
  cardPay: { borderColor: color.success + "73", borderLeftWidth: 3, borderLeftColor: color.success },
  cardDim: { opacity: 0.72 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  ago: { fontSize: 12, color: color.mutedForeground },

  route: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground, marginTop: 10 },
  subject: { fontSize: font.caption, color: "#475569", marginTop: 2 },

  payBox: {
    backgroundColor: color.success + "10",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  payText: { fontSize: font.caption, color: "#15803d", lineHeight: 20 },

  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 10, fontWeight: "600", color: color.mutedForeground },
  whoName: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  whoSub: { fontSize: 12, color: color.mutedForeground },
  fee: { fontSize: font.title, fontWeight: "700", color: color.foreground, letterSpacing: -0.2 },

  note: { fontSize: font.caption, color: "#475569", marginTop: 11, lineHeight: 20 },
  reject: { fontSize: font.caption, color: color.danger, marginTop: 8, lineHeight: 20 },

  btns: { flexDirection: "row", gap: 9, marginTop: 14 },
  btn: { flex: 1, height: 42, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: color.brand },
  btnPay: { backgroundColor: color.success },
  btnGhost: { borderWidth: 1, borderColor: color.border },
  btnOff: { opacity: 0.5 },
  btnPrimaryText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: "#475569" },

  cancelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  cancelHint: { flex: 1, fontSize: font.caption, color: "#475569" },
  cancelText: { fontSize: font.caption, fontWeight: "600", color: color.danger },

  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  openText: { flex: 1, fontSize: font.caption, fontWeight: "600", color: color.brand },
});
