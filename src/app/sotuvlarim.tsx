/**
 * P4 — sotuvlarim: e'lonlarim va sotib olganlarim.
 *
 * ── SOTUVCHIGA UCHTA RAQAM ──────────────────────────────────────
 *
 * «E'lon berdim, nega hech kim qo'ng'iroq qilmaydi» — javob shu uch
 * raqamda. 214 ko'rilgan va 9 tasi telefon olgan bo'lsa e'lon
 * yaxshi, narx muhokamaga muhtoj. 214 ko'rilib 0 kontakt bo'lsa —
 * narx baland yoki surat yomon. 6 ko'rilgan bo'lsa e'lon umuman
 * ko'rinmayapti.
 *
 * ── XARIDORNING IKKI QADAMI KARTOCHKADA ─────────────────────────
 *
 * Tasdiqlash va parkka qo'shish — ikkalasi ham oson unutiladi va
 * ikkalasining ham oqibati bor: tasdiqsiz bitim ochiq qoladi,
 * parkka qo'shilmasa mashina reys, xarajat va texnik tarix
 * zanjiriga ulanmaydi. Shuning uchun ular tafsilot ekranining
 * ichida yashirilmaydi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Segment } from "@/components/Segment";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { saleStatusLabel, t } from "@/lib/i18n";

type Selling = {
  id: string;
  saleNo: number;
  brand: string;
  model: string | null;
  price: number;
  currency: string;
  status: string;
  views: number;
  contacts: number;
  saves: number;
  badge: "VIP" | "TOP" | null;
  todo: "waitBuyer" | "resume" | null;
};

type Bought = {
  id: string;
  saleNo: number;
  brand: string;
  model: string | null;
  price: number;
  currency: string;
  seller: string;
  confirmedAt: string | null;
  canAddToFleet: boolean;
  inFleet: boolean;
  todo: "confirm" | "toFleet" | null;
};

const TONE: Record<string, string> = {
  ACTIVE: color.success,
  NEGOTIATING: color.warning,
  IN_DEAL: color.warning,
  SOLD: color.foreground,
  PAUSED: color.mutedForeground,
  CANCELLED: color.mutedForeground,
  EXPIRED: color.mutedForeground,
};

export default function Sotuvlarim() {
  const [tab, setTab] = useState("selling");
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    selling: Selling[];
    bought: Bought[];
  }>("/api/market/my");

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setFailed("");
    try {
      const r = await api<Record<string, unknown>>("/api/market", {
        method: "POST",
        body: { ...body, id },
      });
      reload();
      return r;
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
      return null;
    } finally {
      setBusy(null);
    }
  }

  const selling = data?.selling ?? [];
  const bought = data?.bought ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.sale.mine")} subtitle={t("mob.sale.mineSub")} />

      <View style={s.tabs}>
        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { key: "selling", label: t("mob.sale.selling", { n: selling.length }) },
            { key: "bought", label: t("mob.sale.bought", { n: bought.length }) },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {failed ? (
              <View style={s.failed}>
                <Text style={s.failedText}>{failed}</Text>
              </View>
            ) : null}

            {tab === "selling" ? (
              selling.length === 0 ? (
                <Empty
                  icon="truck"
                  title={t("mob.sale.noneTitle")}
                  text={t("mob.sale.noneHint")}
                  actionLabel={t("mob.market.sell")}
                  onAction={() => router.push("/bozor-joylash")}
                />
              ) : (
                selling.map((x) => (
                  <SellCard
                    key={x.id}
                    x={x}
                    busy={busy === x.id}
                    onOpen={() => router.push(`/bozor/${x.id}`)}
                    onAct={(body) => void act(x.id, body)}
                  />
                ))
              )
            ) : bought.length === 0 ? (
              <Empty
                icon="package"
                title={t("mob.sale.noBoughtTitle")}
                text={t("mob.sale.noBoughtHint")}
              />
            ) : (
              bought.map((x) => (
                <BuyCard
                  key={x.id}
                  x={x}
                  busy={busy === x.id}
                  onOpen={() => router.push(`/bozor/${x.id}`)}
                  onAct={async (body) => {
                    const r = await act(x.id, body);
                    if (r?.vehicleId) router.push(`/parkim/${String(r.vehicleId)}`);
                  }}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SellCard({
  x,
  busy,
  onOpen,
  onAct,
}: {
  x: Selling;
  busy: boolean;
  onOpen: () => void;
  onAct: (body: Record<string, unknown>) => void;
}) {
  const tone = TONE[x.status] ?? color.mutedForeground;
  /* «Sotildi» XARIDORNI TALAB QILADI: bitim tarixi va reyting
     shu ID ga bog'lanadi. Shuning uchun tugma darhol yubormaydi,
     avval FURAM ID so'raladi. */
  const [sellForm, setSellForm] = useState(false);
  const [buyer, setBuyer] = useState("");

  return (
    <View style={[s.card, x.todo === "waitBuyer" && s.cardWait]}>
      <Pressable onPress={onOpen}>
        <View style={s.head}>
          <View style={[s.tag, { backgroundColor: tone + "1a" }]}>
            <Text style={[s.tagText, { color: tone }]}>{saleStatusLabel(x.status)}</Text>
          </View>
          {x.badge && (
            <View style={[s.tag, s.tagBoost]}>
              <Text style={[s.tagText, { color: "#c2490f" }]}>{x.badge}</Text>
            </View>
          )}
          <Text style={s.no}>#{x.saleNo}</Text>
        </View>

        <Text style={s.name} numberOfLines={1}>
          {x.brand} {x.model ?? ""}
        </Text>
        <Text style={s.price}>
          {fmtNum(x.price)} {x.currency}
        </Text>

        {/* «E'lonim ishlayaptimi» — javob shu uch raqamda */}
        <View style={s.stats}>
          <Stat label={t("mob.sale.statViews")} value={fmtNum(x.views)} />
          <Stat label={t("mob.sale.statContacts")} value={fmtNum(x.contacts)} good={x.contacts > 0} />
          <Stat label={t("mob.sale.statSaves")} value={fmtNum(x.saves)} />
        </View>
      </Pressable>

      {x.todo === "waitBuyer" ? (
        <View style={s.wait}>
          <Text style={s.waitText}>{t("mob.sale.waitBuyer")}</Text>
        </View>
      ) : (
        <View style={s.acts}>
          {x.status === "ACTIVE" && (
            <Pressable
              style={s.act}
              disabled={busy}
              onPress={() => onAct({ action: "move", to: "PAUSED" })}
            >
              <Text style={s.actText}>{t("mob.sale.pause")}</Text>
            </Pressable>
          )}
          {x.status === "PAUSED" && (
            <Pressable
              style={s.act}
              disabled={busy}
              onPress={() => onAct({ action: "move", to: "ACTIVE" })}
            >
              <Text style={s.actText}>{t("mob.sale.resume")}</Text>
            </Pressable>
          )}
          {(x.status === "ACTIVE" || x.status === "NEGOTIATING") && (
            <Pressable
              style={[s.act, s.actPri]}
              disabled={busy}
              onPress={() => setSellForm((v) => !v)}
            >
              <Text style={[s.actText, s.actPriText]}>{t("mob.sale.markSold")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {sellForm && x.todo !== "waitBuyer" && (
        <View style={s.sellForm}>
          <Field
            label={t("mob.sale.buyerId")}
            value={buyer}
            onChangeText={setBuyer}
            keyboardType="number-pad"
            placeholder="10005"
          />
          <Text style={s.text}>{t("mob.sale.buyerHint")}</Text>
          <Button
            title={t("mob.common.confirm")}
            disabled={busy || !Number(buyer)}
            onPress={() =>
              onAct({ action: "move", to: "SOLD", buyerFuramId: Number(buyer) })
            }
          />
        </View>
      )}
    </View>
  );
}

function BuyCard({
  x,
  busy,
  onOpen,
  onAct,
}: {
  x: Bought;
  busy: boolean;
  onOpen: () => void;
  onAct: (body: Record<string, unknown>) => void;
}) {
  return (
    <View
      style={[
        s.card,
        x.todo === "confirm" && s.cardTodo,
        x.todo === "toFleet" && s.cardFleet,
      ]}
    >
      <Pressable onPress={onOpen}>
        <View style={s.head}>
          <View
            style={[
              s.tag,
              { backgroundColor: (x.todo === "confirm" ? color.brand : color.success) + "1a" },
            ]}
          >
            <Text
              style={[
                s.tagText,
                { color: x.todo === "confirm" ? "#c2490f" : "#15803d" },
              ]}
            >
              {x.todo === "confirm"
                ? t("mob.sale.needConfirm")
                : x.inFleet
                  ? t("mob.sale.inFleet")
                  : t("mob.sale.dealDone")}
            </Text>
          </View>
          <Text style={s.no}>#{x.saleNo}</Text>
        </View>

        <Text style={s.name} numberOfLines={1}>
          {x.brand} {x.model ?? ""}
        </Text>
        <Text style={s.seller}>{t("mob.sale.sellerIs", { name: x.seller })}</Text>
        <Text style={s.price}>
          {fmtNum(x.price)} {x.currency}
        </Text>
      </Pressable>

      {x.todo === "confirm" ? (
        <>
          <Text style={s.text}>{t("mob.market.confirmHint")}</Text>
          <Pressable
            style={s.primary}
            disabled={busy}
            onPress={() => onAct({ action: "confirm" })}
          >
            <Text style={s.primaryText}>{t("mob.market.confirm")}</Text>
          </Pressable>
        </>
      ) : x.todo === "toFleet" ? (
        <View style={s.fleetBox}>
          <Text style={s.fleetTitle}>{t("mob.sale.toFleetTitle")}</Text>
          <Text style={s.text}>{t("mob.market.toFleetHint")}</Text>
          <Pressable
            style={s.primary}
            disabled={busy}
            onPress={() => onAct({ action: "to-fleet" })}
          >
            <Text style={s.primaryText}>{t("mob.market.toFleet")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.statKey}>{label}</Text>
      <Text style={[s.statValue, good && { color: "#15803d" }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  tabs: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
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
  cardWait: { borderColor: color.brand + "66" },
  cardTodo: { borderWidth: 2, borderColor: color.brand },
  cardFleet: { borderColor: color.success + "66", backgroundColor: color.success + "08" },

  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagBoost: { backgroundColor: color.brand + "1f" },
  tagText: { fontSize: 10, fontWeight: "700" },
  no: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  name: { fontSize: 15, fontWeight: "600", color: color.foreground, marginTop: 10 },
  seller: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  price: { fontSize: 17, fontWeight: "700", color: color.foreground, marginTop: 3 },

  stats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  statKey: { fontSize: 11, color: "#94a3b8" },
  statValue: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 1 },

  acts: { flexDirection: "row", gap: 7, marginTop: 12 },
  act: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
  },
  actPri: { marginLeft: "auto", backgroundColor: color.brand, borderColor: color.brand },
  actText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  actPriText: { color: color.brandForeground },

  sellForm: {
    marginTop: 12,
    padding: space.md,
    borderRadius: 10,
    backgroundColor: color.muted,
    gap: space.xs,
  },

  wait: {
    marginTop: 12,
    padding: 11,
    borderRadius: 9,
    backgroundColor: color.brand + "12",
  },
  waitText: { fontSize: 12, color: "#9a3412", lineHeight: 18 },

  text: { fontSize: 13, color: color.mutedForeground, marginTop: 8, lineHeight: 19 },

  fleetBox: {
    marginTop: 11,
    padding: space.md,
    borderRadius: 10,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  fleetTitle: { fontSize: 13, fontWeight: "600", color: color.foreground },

  primary: {
    height: 42,
    borderRadius: 10,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryText: { fontSize: 14, fontWeight: "600", color: color.brandForeground },
});
