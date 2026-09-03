/**
 * H3 — hujjatni ko'rish.
 *
 * «KIM KO'RGAN» ALOHIDA BO'LIM. Pasport va pravaning nusxasi —
 * shaxsiy ma'lumot; odam uni yuklab, keyin «kim ochdi ekan» deb
 * o'ylab yuradi. Bazada `DocumentView` jadvali bor edi, faqat
 * ko'rsatilmasdi. Uni yashirish — ma'lumotni yashirish bo'lardi.
 *
 * Egasining O'Z ochishlari ro'yxatda ko'rinmaydi (server filtrlaydi):
 * odamga «men ochdim» degan qator kerak emas, unga BEGONA
 * ochganini bilish kerak.
 */
import { useState } from "react";
import {
  Alert, Image, Linking, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, API_BASE, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Detail = {
  document: {
    id: string; kind: string | null; name: string; number: string | null;
    issuedAt: string | null; expiresAt: string | null; days: number | null;
    state: "ok" | "soon" | "expired" | "forever" | "missing";
    version: number; isImage: boolean; createdAt: string;
  };
  views: { id: string; name: string | null; role: string; at: string; count: number }[];
  older: { id: string; version: number; createdAt: string; expiresAt: string | null }[];
};

const kindName = (k: string | null) => (k ? t(`mob.pdocKind.${k}`) : t("mob.pdocKind.OTHER"));

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function HujjatKorish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    id ? `/api/documents/${id}/meta` : null,
    [id],
  );

  function remove() {
    Alert.alert(t("mob.pdoc.deleteDoc"), t("mob.pdoc.deleteAsk"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.pdoc.deleteDoc"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await api(`/api/documents/${id}`, { method: "DELETE" });
            router.back();
          } catch (e) {
            Alert.alert(t("mob.common.notSaved"), (e as FuramError).message ?? t("mob.common.tryAgain"));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.root}>
        <Header title={t("mob.pdoc.title")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.pdoc.title")} />
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.vehicle.notFound")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const d = data.document;
  const bad = d.state === "expired";
  const soon = d.state === "soon";
  const tint = bad ? color.danger : soon ? color.warning : color.success;
  /* Faylning o'zi shu manzildan keladi. Ochilishi `DocumentView` ga
     yoziladi — «kim ko'rgan» ro'yxati shundan to'ladi. */
  const fileUrl = `${API_BASE}/api/documents/${d.id}`;

  return (
    <View style={s.root}>
      <Header title={kindName(d.kind)} subtitle={d.number ?? undefined} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
      >
        {/* Surat — to'liq kenglikda, bosilsa ochiladi */}
        <Pressable onPress={() => Linking.openURL(fileUrl)} style={s.shot}>
          {d.isImage ? (
            <Image source={{ uri: fileUrl }} style={s.shotImg} resizeMode="contain" />
          ) : (
            <View style={s.shotFile}>
              <Icon name="doc" size={40} stroke="rgba(255,255,255,0.65)" />
              <Text style={s.shotName}>{d.name}</Text>
            </View>
          )}
          <View style={s.zoom}>
            <Icon name="search" size={13} stroke="rgba(255,255,255,0.9)" />
            <Text style={s.zoomText}>{t("mob.pdoc.zoomHint")}</Text>
          </View>
        </Pressable>

        {/* Muddat — eng tepada */}
        <View style={[s.expiry, { borderColor: tint + "66" }]}>
          <View style={[s.expIcon, { backgroundColor: tint + "1f" }]}>
            <Icon name={bad ? "alert" : soon ? "clock" : "check"} size={21} stroke={tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.expTitle, { color: tint }]}>
              {d.state === "forever"
                ? t("mob.pdoc.forever")
                : bad
                  ? t("mob.pdoc.expiredAgo", { n: -(d.days ?? 0) })
                  : t("mob.pdoc.daysLeft", { n: d.days ?? 0 })}
            </Text>
            {d.expiresAt ? (
              <Text style={s.expSub}>
                {t("mob.pdoc.until", { date: new Date(d.expiresAt).toLocaleDateString() })}
              </Text>
            ) : null}
          </View>
          {bad || soon ? (
            <Pressable
              onPress={() => router.push(`/hujjatlarim/qoshish?kind=${d.kind ?? "OTHER"}`)}
              style={({ pressed }) => [s.renew, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.renewText}>{t("mob.common.renew")}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Ma'lumot */}
        <Card>
          <Text style={s.sec}>{t("mob.pdoc.docInfo")}</Text>
          <Row k={t("mob.exp.kind")} v={kindName(d.kind)} />
          {d.number ? <Row k={t("mob.pdoc.docNumber")} v={d.number} mono /> : null}
          <Row k={t("mob.pdoc.uploadedAt")} v={new Date(d.createdAt).toLocaleDateString()} />
        </Card>

        {/* Kim ko'rgan */}
        <Card>
          <Text style={s.sec}>{t("mob.pdoc.whoViewed")}</Text>
          {data.views.length === 0 ? (
            <View style={s.emptyViews}>
              <Text style={s.emptyViewsText}>{t("mob.pdoc.noViews")}</Text>
            </View>
          ) : (
            data.views.map((v) => (
              <View key={v.id} style={s.viewRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials(v.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.viewName}>{v.name ?? "—"}</Text>
                  <Text style={s.viewSub}>
                    {t(`mob.viewerRole.${v.role}`)} · {new Date(v.at).toLocaleDateString()}
                    {v.count > 1 ? ` · ${t("mob.pdoc.timesN", { n: v.count })}` : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
          <Text style={s.note}>{t("mob.pdoc.whoViewedHint")}</Text>
        </Card>

        {/* Eski nusxalar */}
        {data.older.length > 0 ? (
          <Card>
            <Text style={s.sec}>{t("mob.pdoc.older")}</Text>
            {data.older.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => Linking.openURL(`${API_BASE}/api/documents/${o.id}`)}
                style={({ pressed }) => [s.viewRow, pressed && { backgroundColor: color.muted }]}
              >
                <View style={s.vBox}>
                  <Text style={s.vBoxText}>v{o.version}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.viewName}>{kindName(d.kind)}</Text>
                  <Text style={s.viewSub}>
                    {new Date(o.createdAt).toLocaleDateString()}
                    {o.expiresAt ? ` — ${new Date(o.expiresAt).toLocaleDateString()}` : ""}
                  </Text>
                </View>
                <Text style={s.openText}>{t("mob.queue.open")}</Text>
              </Pressable>
            ))}
            <Text style={s.note}>{t("mob.pdoc.olderHint")}</Text>
          </Card>
        ) : null}

        <Pressable
          onPress={busy ? undefined : remove}
          style={({ pressed }) => [s.del, pressed && { backgroundColor: color.danger + "0d" }]}
        >
          <Text style={s.delText}>{t("mob.pdoc.deleteDoc")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowK}>{k}</Text>
      <Text style={[s.rowV, mono && { fontFamily: "monospace" }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  shot: { height: 240, borderRadius: radius.card, backgroundColor: color.navy, overflow: "hidden" },
  shotImg: { width: "100%", height: "100%" },
  shotFile: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  shotName: { fontSize: font.caption, color: "rgba(241,245,249,0.8)" },
  zoom: {
    position: "absolute", bottom: 12, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    height: 28, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  zoomText: { fontSize: 11, color: "rgba(255,255,255,0.9)" },

  expiry: {
    flexDirection: "row", alignItems: "center", gap: 13,
    backgroundColor: color.card, borderWidth: 1, borderRadius: radius.card, padding: space.lg,
  },
  expIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  expTitle: { fontSize: 16, fontWeight: "700" },
  expSub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  renew: {
    height: 36, paddingHorizontal: 13, borderRadius: radius.control,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  renewText: { fontSize: font.caption, fontWeight: "600", color: "#fff" },

  sec: {
    padding: space.lg, paddingBottom: 8, fontSize: 12, fontWeight: "600",
    color: color.mutedForeground, letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: space.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  rowK: { flex: 1, fontSize: font.caption, color: color.mutedForeground },
  rowV: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  viewRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: space.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: color.logoBlue,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  viewName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  viewSub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  openText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },
  vBox: {
    width: 34, height: 42, borderRadius: 6, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  vBoxText: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },

  emptyViews: { paddingHorizontal: space.lg, paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.border },
  emptyViewsText: { fontSize: font.caption, color: color.mutedForeground },
  note: {
    fontSize: 12, color: color.mutedForeground, lineHeight: 18,
    paddingHorizontal: space.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.border,
  },

  del: {
    height: 48, borderRadius: radius.control, borderWidth: 1,
    borderColor: color.danger + "59", backgroundColor: color.card,
    alignItems: "center", justifyContent: "center", marginTop: space.xs,
  },
  delText: { fontSize: 14, fontWeight: "600", color: color.danger },
});
