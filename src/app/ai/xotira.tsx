/**
 * AI xotirasi — nimani eslab qolgani.
 *
 * ── NEGA KO'RSATILADI ───────────────────────────────────────────
 *
 * AI odam aytgan gaplarni eslab qoladi: «Moskvaga qatnayman»,
 * «refrijeratorim bor». Bu javoblarni yaxshilaydi, lekin odam
 * NIMA eslab qolinganini bilmasa, AI birdan uning haqida
 * nimalarni «bilib» turishi noqulay tuyuladi.
 *
 * Shuning uchun uchta narsa shu ekranda: ro'yxatni KO'RISH,
 * bittasini O'CHIRISH, hammasini o'chirish. Ular birgalikda
 * bitta gapni aytadi — xotira SIZNIKI.
 *
 * ── QO'LDA QO'SHISH HAM BOR ─────────────────────────────────────
 *
 * AI o'zi eslab qolishini kutmasdan odam yozib qo'ya oladi. Bunday
 * yozuv chegara to'lganda avtomatik o'chmaydi (`source: "user"`):
 * odam qo'li bilan yozgan narsani jimgina yo'qotish uning
 * tanlovini bekor qilish bo'lardi.
 *
 * ── RAD SABABI SERVERDAN KELADI ─────────────────────────────────
 *
 * Xotira to'lgan, matn juda qisqa, takror — hammasi kod bilan
 * (`apiErr.REJECTED` / `VALIDATION`). Jim rad etish eng yomon
 * variant: odam gapni qayta yozib ko'rmaydi, «ishlamadi» deb
 * qo'yadi.
 */
import { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Button, Field, Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = { id: string; text: string; source: string; createdAt: string };

export default function AiXotira() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } =
    useApi<{ items: Item[] }>("/api/ai/memory");
  const items = data?.items ?? [];

  async function add() {
    const text = draft.trim();
    if (text.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/ai/memory", { method: "POST", body: { text } });
      setDraft("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/ai/memory/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      Alert.alert(t("mob.common.failed"), (e as FuramError).message ?? "");
    }
  }

  function askClearAll() {
    /* Hammasini o'chirish qaytarilmaydi — so'raladi */
    Alert.alert(t("mob.aimem.clearAsk"), t("mob.aimem.clearAskBody"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.aimem.clear"),
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/ai/memory", { method: "DELETE" });
            reload();
          } catch (e) {
            Alert.alert(t("mob.common.failed"), (e as FuramError).message ?? "");
          }
        },
      },
    ]);
  }

  return (
    <View style={s.root}>
      <Header
        title={t("mob.aimem.title")}
        subtitle={items.length > 0 ? t("mob.aimem.nItems", { n: items.length }) : undefined}
        right={
          items.length > 0 ? (
            <Pressable onPress={askClearAll} hitSlop={8} accessibilityRole="button">
              <Text style={s.clear}>{t("mob.aimem.clear")}</Text>
            </Pressable>
          ) : undefined
        }
      />

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <Text style={s.lead}>{t("mob.aimem.lead")}</Text>

            <View style={s.addBox}>
              <Field
                placeholder={t("mob.aimem.placeholder")}
                value={draft}
                onChangeText={setDraft}
                multiline
                style={s.area}
                maxLength={200}
              />
              {err ? <Text style={s.err}>{err}</Text> : null}
              <Button
                title={t("mob.aimem.add")}
                loading={busy}
                disabled={draft.trim().length < 4}
                onPress={add}
              />
            </View>

            {loading && !data ? <Skeleton rows={3} /> : null}
            {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading || error ? null : (
            <Empty
              icon="robot"
              title={t("mob.aimem.emptyTitle")}
              text={t("mob.aimem.emptyText")}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{item.text}</Text>
              <Text style={s.meta}>
                {t(`mob.aimem.src.${item.source === "user" ? "user" : "ai"}`)} ·{" "}
                {item.createdAt.slice(0, 10)}
              </Text>
            </View>
            <Pressable
              onPress={() => void remove(item.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("mob.common.delete")}
              style={({ pressed }) => [s.del, pressed && { opacity: 0.6 }]}
            >
              <Icon name="trash" size={17} stroke={color.danger} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: 9 },

  lead: { fontSize: 12.5, color: color.mutedForeground, lineHeight: 18 },
  clear: { fontSize: 12.5, fontWeight: "700", color: color.danger },

  addBox: {
    gap: 9,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  area: { minHeight: 62, textAlignVertical: "top" },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  text: { fontSize: 13, color: color.foreground, lineHeight: 19 },
  meta: { fontSize: 11, color: color.mutedForeground, marginTop: 4 },
  del: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  err: { fontSize: 12, color: color.danger },
});
