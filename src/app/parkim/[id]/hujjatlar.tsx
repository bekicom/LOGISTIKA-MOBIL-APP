/**
 * D4 — transport hujjatlari.
 *
 * Ro'yxat SARALANMAYDI, ikkiga BO'LINADI: e'tibor talab qiladigani
 * tepada, qolgani pastda. Sanalar bilan bir tekis yozilsa muddati
 * tugayotgani ko'zdan qochadi.
 *
 * Yo'q hujjat ham ro'yxatda TURADI — nuqtali ramka bilan. Aks holda
 * odam nimasi yetishmayotganini bilmaydi: yo'q narsa ko'rinmaydi.
 */
import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card, GroupLabel, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Doc = {
  id: string | null;
  kind: string;
  label: string;
  number: string | null;
  expiresAt: string | null;
  days: number | null;
  state: "ok" | "soon" | "expired" | "forever" | "missing";
  countries: string[];
  missing: boolean;
};
type Detail = { vehicle: { plate: string; brand: string; model: string | null }; documents: Doc[] };

export default function TransportHujjatlar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    id ? `/api/fleet/vehicles/${id}` : null,
    [id],
  );

  const { need, fine } = useMemo(() => {
    const docs = data?.documents ?? [];
    return {
      need: docs.filter((d) => d.missing || d.state === "expired" || d.state === "soon"),
      fine: docs.filter((d) => !d.missing && (d.state === "ok" || d.state === "forever")),
    };
  }, [data]);

  const total = (data?.documents ?? []).length;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.docs.title")}
        subtitle={data ? `${data.vehicle.plate} · ${data.vehicle.brand}` : undefined}
        right={<Text style={s.add}>{t("mob.common.add")}</Text>}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
      >
        {loading ? (
          <Skeleton rows={4} />
        ) : error || !data ? (
          <ErrorBox message={error ?? t("mob.vehicle.notFound")} onRetry={reload} />
        ) : (
          <>
            {/* Umumiy holat */}
            <View style={s.summary}>
              <View style={[s.ring, need.length > 0 && { borderTopColor: color.danger, borderRightColor: color.warning }]}>
                <Text style={s.ringText}>
                  {fine.length}/{total}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sumTitle}>
                  {need.length === 0
                    ? t("mob.docs.allFine")
                    : need.length === 1
                      ? t("mob.docs.oneNeeds")
                      : t("mob.docs.manyNeed", { n: need.length })}
                </Text>
                <Text style={s.sumBody}>
                  {need.length === 0
                    ? t("mob.docs.allFineText")
                    : need
                        .map((d) =>
                          `${d.label} — ${
                            d.missing
                              ? t("mob.docs.missingShort")
                              : d.state === "expired"
                                ? t("mob.docs.expiredAgo", { n: -(d.days ?? 0) })
                                : t("mob.docs.daysLeft", { n: d.days ?? 0 })
                          }`,
                        )
                        .join(", ")}
                </Text>
              </View>
            </View>

            {need.length > 0 ? (
              <View>
                <GroupLabel>{t("mob.docs.attention")}</GroupLabel>
                <Card>
                  {need.map((d, i) => (
                    <DocRow key={d.kind + (d.id ?? "")} doc={d} last={i === need.length - 1} />
                  ))}
                </Card>
              </View>
            ) : null}

            {fine.length > 0 ? (
              <View>
                <GroupLabel>{t("mob.docs.fine")}</GroupLabel>
                <Card>
                  {fine.map((d, i) => (
                    <DocRow key={d.kind + (d.id ?? "")} doc={d} last={i === fine.length - 1} />
                  ))}
                </Card>
              </View>
            ) : null}

            <View style={s.note}>
              <Text style={s.noteTitle}>{t("mob.docs.reminder")}</Text>
              <Text style={s.noteBody}>{t("mob.docs.reminderText")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DocRow({ doc, last }: { doc: Doc; last: boolean }) {
  const bad = doc.missing || doc.state === "expired";
  const soon = doc.state === "soon";
  const tint = bad ? color.danger : soon ? color.warning : color.mutedForeground;

  return (
    <Pressable
      style={({ pressed }) => [
        s.row,
        !last && s.rowLine,
        bad && { backgroundColor: color.danger + "0a" },
        soon && { backgroundColor: color.warning + "0a" },
        pressed && { backgroundColor: color.muted },
      ]}
    >
      <View
        style={[
          s.thumb,
          doc.missing && {
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: color.danger + "73",
            backgroundColor: color.danger + "1a",
          },
        ]}
      >
        <Icon name={doc.missing ? "plus" : "doc"} size={19} stroke={doc.missing ? color.danger : "#475569"} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.name}>{doc.label}</Text>
        <Text style={[s.when, (bad || soon) && { color: tint, fontWeight: "600" }]}>
          {doc.missing
            ? t("mob.docs.missing")
            : doc.state === "expired"
              ? t("mob.docs.expiredAgo", { n: -(doc.days ?? 0) })
              : doc.state === "forever"
                ? [doc.number, t("mob.docs.forever")].filter(Boolean).join(" · ")
                : `${t("mob.docs.daysLeft", { n: doc.days ?? 0 })} · ${new Date(doc.expiresAt!).toLocaleDateString()}`}
        </Text>
      </View>

      {bad || soon ? (
        <View style={[s.btn, doc.missing && { backgroundColor: color.brand, borderWidth: 0 }]}>
          <Text style={[s.btnText, doc.missing && { color: "#fff" }]}>
            {doc.missing ? t("mob.common.add") : t("mob.common.renew")}
          </Text>
        </View>
      ) : (
        <Icon name="check" size={17} stroke={color.success} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  add: { fontSize: font.bodyLg, fontWeight: "600", color: color.brand },

  summary: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: color.card, borderWidth: 1, borderColor: color.border,
    borderRadius: radius.card, padding: space.lg,
  },
  ring: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 4, borderColor: color.border,
    borderTopColor: color.success, borderRightColor: color.success,
    alignItems: "center", justifyContent: "center",
  },
  ringText: { fontSize: 15, fontWeight: "700", color: color.foreground },
  sumTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  sumBody: { fontSize: 12, color: color.mutedForeground, marginTop: 3, lineHeight: 18 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.border },
  thumb: {
    width: 42, height: 42, borderRadius: 8, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "600", color: color.foreground },
  when: { fontSize: 12, color: color.mutedForeground, marginTop: 3 },
  btn: {
    height: 34, paddingHorizontal: 13, borderRadius: radius.control,
    borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center",
  },
  btnText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },

  note: {
    borderWidth: 1, borderColor: "#cbd5e1", borderRadius: radius.card,
    backgroundColor: "#f8fafc", padding: space.lg,
  },
  noteTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  noteBody: { fontSize: 12, color: "#475569", lineHeight: 19, marginTop: 5 },
});
