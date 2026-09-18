/**
 * Bloklangan foydalanuvchilar (2026-09-18, do'kon auditi A12).
 *
 * Apple 1.2 bloklashning O'ZINI talab qiladi, lekin ro'yxatsiz
 * bloklash yarim ish bo'lardi: odam kimni bloklaganini eslab
 * yurishi va blokni ochishning yo'li bo'lmasligi kerak emas.
 *
 * Ro'yxat FAQAT o'zi bloklaganlarini ko'rsatadi — kim uni
 * bloklaganini bilish mumkin emas (server ham bermaydi).
 */
import { useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { Button, Card, Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Blocked = {
  id: string;
  furamId: number;
  name: string | null;
  avatarUrl: string | null;
  at: string;
};

export default function Bloklanganlar() {
  const { data, loading, error, refreshing, refresh, reload } =
    useApi<{ blocks: Blocked[] }>("/api/blocks");
  const [busy, setBusy] = useState<string | null>(null);

  async function ochish(u: Blocked) {
    setBusy(u.id);
    try {
      await api(`/api/blocks?userId=${encodeURIComponent(u.id)}`, { method: "DELETE" });
      reload();
    } catch (e) {
      Alert.alert((e as FuramError).message ?? t("mob.err.generic"));
    } finally {
      setBusy(null);
    }
  }

  const rows = data?.blocks ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.block.listTitle")} />

      {loading && !data ? (
        <View style={s.pad}>
          <Skeleton rows={3} />
        </View>
      ) : error ? (
        <View style={s.pad}>
          <ErrorBox message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(u) => u.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
          }
          ListHeaderComponent={<Text style={s.hint}>{t("mob.block.listHint")}</Text>}
          ListEmptyComponent={<Empty title={t("mob.block.empty")} text={t("mob.block.emptyHint")} />}
          renderItem={({ item }) => (
            <Card style={{ padding: space.lg }}>
              <View style={s.row}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(item.name ?? "?").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>
                    {item.name ?? t("mob.block.someone")}
                  </Text>
                  <Text style={s.sub}>FURAM-{item.furamId}</Text>
                </View>
              </View>
              <View style={{ marginTop: space.md }}>
                <Button
                  title={t("mob.block.unblock")}
                  variant="secondary"
                  loading={busy === item.id}
                  onPress={() => void ochish(item)}
                />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  pad: { padding: space.lg },
  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  hint: { fontSize: font.caption, color: color.mutedForeground, lineHeight: 19, marginBottom: space.xs },

  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800", color: color.mutedForeground },
  name: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
}));
