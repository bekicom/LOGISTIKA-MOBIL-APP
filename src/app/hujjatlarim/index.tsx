/**
 * H1 — shaxsiy hujjatlarim.
 *
 * TEPADA «CHEGARAGA TAYYORMISIZ», hujjat soni emas. Haydovchiga
 * «4 ta hujjat» degan raqam hech narsa aytmaydi; unga «chiqa
 * olasizmi va nima to'sqinlik qilyapti» kerak.
 *
 * YO'Q HUJJAT HAM RO'YXATDA TURADI — nuqtali ramka bilan. Server
 * uni `missing: true` bo'lib qaytaradi. Yo'q narsa ko'rinmaydi:
 * odam nimasi yetishmayotganini bilmay qoladi.
 */
import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, GroupLabel, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Doc = {
  id: string | null;
  kind: string | null;
  name: string | null;
  number: string | null;
  expiresAt: string | null;
  days: number | null;
  state: "ok" | "soon" | "expired" | "forever" | "missing";
  required: boolean;
  missing: boolean;
};
type Feed = {
  items: Doc[];
  readiness: {
    ready: number;
    total: number;
    blockers: { kind: string | null; state: string; days: number | null }[];
  };
};

const kindName = (k: string | null) => (k ? t(`mob.pdocKind.${k}`) : t("mob.pdocKind.OTHER"));

/** Holatga qarab rang — bitta joyda */
function tone(state: Doc["state"]): string {
  if (state === "missing" || state === "expired") return color.danger;
  if (state === "soon") return color.warning;
  return color.mutedForeground;
}

/** Muddat matni: sana emas, «necha kun» */
function whenText(d: Doc): string {
  if (d.missing) return t("mob.pdoc.missingBorder");
  if (d.state === "expired") return t("mob.pdoc.expiredAgo", { n: -(d.days ?? 0) });
  if (d.state === "forever") return t("mob.pdoc.forever");
  return t("mob.pdoc.daysLeft", { n: d.days ?? 0 });
}

export default function Hujjatlarim() {
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>("/api/documents");

  const items = data?.items ?? [];
  const required = useMemo(() => items.filter((d) => d.required), [items]);
  const extra = useMemo(() => items.filter((d) => !d.required), [items]);

  const r = data?.readiness;
  const allReady = !!r && r.blockers.length === 0 && r.total > 0;

  /* Sarlavha ostidagi jumla — BIRINCHI to'sqinlikni aytadi.
     Ro'yxatni «uchtasi muammoli» deb umumlashtirmaydi: odam
     nimadan boshlashini bilishi kerak. */
  const blockerText = useMemo(() => {
    const b = r?.blockers[0];
    if (!b) return t("mob.pdoc.readyText");
    const doc = kindName(b.kind);
    if (b.state === "missing") return t("mob.pdoc.missingOne", { doc });
    if (b.state === "expired") return t("mob.pdoc.expiredOne", { doc });
    return `${t("mob.pdoc.expiringOne", { doc, n: b.days ?? 0 })} ${t("mob.pdoc.borderHint")}`;
  }, [r]);

  return (
    <View style={s.root}>
      <Header
        title={t("mob.pdoc.title")}
        subtitle={t("mob.pdoc.subtitle")}
        right={
          <Pressable onPress={() => router.push("/hujjatlarim/qoshish")} hitSlop={8}>
            <Text style={s.add}>{t("mob.common.add")}</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
      >
        {loading ? (
          <Skeleton rows={4} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <Empty
            icon="doc"
            title={t("mob.pdoc.empty")}
            text={t("mob.pdoc.emptyText")}
            actionLabel={t("mob.common.add")}
            onAction={() => router.push("/hujjatlarim/qoshish")}
          />
        ) : (
          <>
            {/* Chegaraga tayyorlik — ekrandagi birinchi javob */}
            {r ? (
              <View style={[s.ready, !allReady && { borderColor: color.warning + "66" }]}>
                <View
                  style={[
                    s.ring,
                    allReady
                      ? { borderTopColor: color.success, borderRightColor: color.success }
                      : { borderTopColor: color.warning },
                  ]}
                >
                  <Text style={s.ringText}>
                    {r.ready}/{r.total}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.readyTitle}>
                    {allReady ? t("mob.pdoc.ready") : t("mob.pdoc.notReady")}
                  </Text>
                  <Text style={s.readyText}>{blockerText}</Text>
                </View>
              </View>
            ) : null}

            {required.length > 0 ? (
              <View>
                <GroupLabel>{t("mob.pdoc.required")}</GroupLabel>
                <Card>
                  {required.map((d, i) => (
                    <DocRow
                      key={d.kind ?? d.id ?? String(i)}
                      d={d}
                      last={i === required.length - 1}
                      onPress={() =>
                        d.id
                          ? router.push(`/hujjatlarim/${d.id}`)
                          : router.push(`/hujjatlarim/qoshish?kind=${d.kind}`)
                      }
                    />
                  ))}
                </Card>
              </View>
            ) : null}

            {extra.length > 0 ? (
              <View>
                <GroupLabel>{t("mob.pdoc.extra")}</GroupLabel>
                <Card>
                  {extra.map((d, i) => (
                    <DocRow
                      key={d.id ?? String(i)}
                      d={d}
                      last={i === extra.length - 1}
                      onPress={() => d.id && router.push(`/hujjatlarim/${d.id}`)}
                    />
                  ))}
                </Card>
              </View>
            ) : null}

            {/* Maxfiylik — hujjat yuklash ishonch masalasi */}
            <View style={s.privacy}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="check" size={18} stroke={color.foreground} />
                <Text style={s.privacyTitle}>{t("mob.pdoc.whoSees")}</Text>
              </View>
              <Text style={s.privacyText}>{t("mob.pdoc.whoSeesText")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DocRow({ d, last, onPress }: { d: Doc; last: boolean; onPress: () => void }) {
  const c = tone(d.state);
  const bad = d.missing || d.state === "expired";
  const soon = d.state === "soon";

  return (
    <Pressable
      onPress={onPress}
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
          d.missing && {
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: color.danger + "73",
            backgroundColor: color.danger + "17",
          },
        ]}
      >
        <Icon name={d.missing ? "plus" : "doc"} size={19} stroke={d.missing ? color.danger : "#475569"} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.name}>{kindName(d.kind)}</Text>
        {d.number ? <Text style={s.sub}>{d.number}</Text> : null}
        <Text style={[s.sub, (bad || soon) && { color: c, fontWeight: "600" }]}>{whenText(d)}</Text>
      </View>

      {d.missing ? (
        <View style={s.btnAdd}>
          <Text style={s.btnAddText}>{t("mob.common.add")}</Text>
        </View>
      ) : soon || bad ? (
        <View style={s.btn}>
          <Text style={s.btnText}>{t("mob.common.renew")}</Text>
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

  ready: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: color.card, borderWidth: 1, borderColor: color.success + "59",
    borderRadius: radius.card, padding: space.lg,
  },
  ring: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 4, borderColor: color.border,
    alignItems: "center", justifyContent: "center",
  },
  ringText: { fontSize: 15, fontWeight: "700", color: color.foreground },
  readyTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  readyText: { fontSize: 12, color: color.mutedForeground, marginTop: 3, lineHeight: 18 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.border },
  thumb: {
    width: 44, height: 54, borderRadius: 7, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "600", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 3 },

  btn: {
    height: 34, paddingHorizontal: 12, borderRadius: radius.control,
    borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center",
  },
  btnText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },
  btnAdd: {
    height: 34, paddingHorizontal: 12, borderRadius: radius.control,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  btnAddText: { fontSize: font.caption, fontWeight: "600", color: "#fff" },

  privacy: {
    backgroundColor: color.card, borderWidth: 1, borderColor: color.border,
    borderRadius: radius.card, padding: space.lg,
  },
  privacyTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  privacyText: { fontSize: 12, color: "#475569", lineHeight: 19, marginTop: 8 },
});
