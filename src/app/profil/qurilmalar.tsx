/**
 * I4 — kirgan qurilmalar.
 *
 * Nima uchun kerak: haydovchi telefonini yo'qotsa yoki sotsa, hisobi
 * begona qo'lda qolmasligi kerak. Bu yerdan uzsa, o'sha qurilmadagi
 * sessiya DARHOL tugaydi — sessiya bazada saqlanadi, shuning uchun
 * masofadan uzish haqiqatan ishlaydi.
 *
 * Qurilma nomi serverdan tayyor kelmaydi: server xom `userAgent`
 * beradi, ko'rinishni shu yerda yasaymiz. Sabab — ilova bir necha
 * tilda ishlaydi, server esa bitta tilda yozib yuborardi.
 */
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, GroupLabel, Header, ListRow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";

type Device = {
  id: string;
  userAgent: string | null;
  city: string | null;
  country: string | null;
  ip: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
};

/** «Chrome · Windows», «FURAM ilovasi · iOS» yoki «Noma'lum qurilma» */
function deviceName(ua: string | null): string {
  if (!ua) return "Noma'lum qurilma";
  // Ilovaning o'zi — brauzerdan ajratib turishi kerak
  if (/Expo|okhttp|CFNetwork|FURAM/i.test(ua)) {
    const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS|Darwin|CFNetwork/i.test(ua) ? "iOS" : "";
    return os ? `FURAM ilovasi · ${os}` : "FURAM ilovasi";
  }
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("OPR/") || ua.includes("Opera")
      ? "Opera"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua.includes("Safari/")
            ? "Safari"
            : "Brauzer";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Android")
      ? "Android"
      : ua.includes("iPhone") || ua.includes("iPad")
        ? "iOS"
        : ua.includes("Mac OS")
          ? "macOS"
          : ua.includes("Linux")
            ? "Linux"
            : "Qurilma";
  return `${browser} · ${os}`;
}

/** «hozir faol», «2 kun oldin», «3 hafta oldin» */
function since(iso: string): { text: string; stale: boolean } {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 5) return { text: "hozir faol", stale: false };
  if (min < 60) return { text: `${min} daqiqa oldin`, stale: false };
  const hour = Math.floor(min / 60);
  if (hour < 24) return { text: `${hour} soat oldin`, stale: false };
  const day = Math.floor(hour / 24);
  if (day < 7) return { text: `${day} kun oldin`, stale: false };
  const week = Math.floor(day / 7);
  /* Uzoq kirilmagan qurilma ajratib ko'rsatiladi — egasi e'tibor
     bersin, balki begonadir. */
  if (week < 5) return { text: `${week} hafta oldin`, stale: week >= 2 };
  return { text: `${Math.floor(day / 30)} oy oldin`, stale: true };
}

export default function Qurilmalar() {
  const { data, loading, error, refreshing, refresh, reload } =
    useApi<{ items: Device[] }>("/api/sessions");
  const [busy, setBusy] = useState<string | null>(null);

  const items = data?.items ?? [];
  const current = items.find((d) => d.isCurrent) ?? null;
  const others = items.filter((d) => !d.isCurrent);

  async function cut(d: Device) {
    Alert.alert(
      "Qurilmani uzish",
      `«${deviceName(d.userAgent)}» hisobingizdan chiqariladi. Davom etaylikmi?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Uzish",
          style: "destructive",
          onPress: async () => {
            setBusy(d.id);
            try {
              await api(`/api/sessions/${d.id}`, { method: "DELETE" });
              reload();
            } catch (e) {
              Alert.alert("Uzilmadi", (e as FuramError).message ?? "Qaytadan urinib ko'ring");
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  function cutAll() {
    Alert.alert(
      "Hamma qurilmadan chiqish",
      "Shu telefondan tashqari barcha qurilmada sessiya tugaydi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Chiqish",
          style: "destructive",
          onPress: async () => {
            setBusy("all");
            try {
              const r = await api<{ removed: number }>("/api/sessions", { method: "DELETE" });
              reload();
              Alert.alert("Bajarildi", `${r.removed} ta qurilma uzildi`);
            } catch (e) {
              Alert.alert("Bajarilmadi", (e as FuramError).message ?? "Qaytadan urinib ko'ring");
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={s.root}>
      <Header title="Qurilmalar" subtitle="Hisobingizga kirgan qurilmalar" />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
      >
        {loading ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {current ? (
              <Card style={{ borderColor: color.success + "59" }}>
                <ListRow
                  last
                  icon={
                    <View style={[s.badge, { backgroundColor: color.success + "1a" }]}>
                      <Icon name="user" size={20} stroke={color.success} />
                    </View>
                  }
                  title={deviceName(current.userAgent)}
                  hint={[
                    [current.city, current.country].filter(Boolean).join(", ") || current.ip || "—",
                    since(current.lastActiveAt).text,
                  ].join(" · ")}
                  right={<Text style={s.now}>SHU QURILMA</Text>}
                />
              </Card>
            ) : null}

            {others.length > 0 ? (
              <View>
                <GroupLabel>BOSHQA QURILMALAR</GroupLabel>
                <Card>
                  {others.map((d, i) => {
                    const t = since(d.lastActiveAt);
                    return (
                      <ListRow
                        key={d.id}
                        last={i === others.length - 1}
                        icon={
                          <View style={s.badge}>
                            <Icon name="user" size={20} stroke={color.mutedForeground} />
                          </View>
                        }
                        title={deviceName(d.userAgent)}
                        hint={[d.city, d.country].filter(Boolean).join(", ") || d.ip || "—"}
                        right={
                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <Text style={[s.when, t.stale && { color: color.warning, fontWeight: "600" }]}>
                              {t.text}
                            </Text>
                            <Text
                              style={[s.cut, busy === d.id && { opacity: 0.4 }]}
                              onPress={busy ? undefined : () => cut(d)}
                            >
                              Uzish
                            </Text>
                          </View>
                        }
                      />
                    );
                  })}
                </Card>
              </View>
            ) : (
              <Text style={s.alone}>Boshqa qurilmada kirilmagan.</Text>
            )}

            {others.length > 0 ? (
              <Text
                style={[s.cutAll, busy === "all" && { opacity: 0.4 }]}
                onPress={busy ? undefined : cutAll}
              >
                Boshqa hamma qurilmadan chiqish
              </Text>
            ) : null}

            <View style={s.note}>
              <Text style={s.noteTitle}>Nima uchun bu ekran bor</Text>
              <Text style={s.noteBody}>
                Telefoningizni yo'qotsangiz yoki sotsangiz — hisobingiz begona
                qo'lda qolmasligi kerak. Bu yerdan uzsangiz, o'sha qurilmadagi
                sessiya darhol tugaydi.
              </Text>
              <Text style={s.noteBody}>
                Uzoq vaqt kirilmagan qurilma sanasi jigarrang yoziladi — e'tibor
                bering, balki begonadir.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  badge: {
    width: 44, height: 44, borderRadius: radius.control,
    backgroundColor: color.muted, alignItems: "center", justifyContent: "center",
  },
  now: {
    fontSize: 10, fontWeight: "700", color: color.success,
    backgroundColor: color.success + "1f", paddingHorizontal: 7,
    paddingVertical: 3, borderRadius: 6, overflow: "hidden",
  },
  when: { fontSize: 12, color: color.mutedForeground },
  cut: { fontSize: font.caption, fontWeight: "600", color: color.foreground },

  alone: { fontSize: font.caption, color: color.mutedForeground, paddingHorizontal: space.xs },
  cutAll: {
    textAlign: "center", fontSize: font.body, fontWeight: "600", color: color.danger,
    borderWidth: 1, borderColor: color.danger + "59", borderRadius: radius.control,
    backgroundColor: color.card, paddingVertical: 14,
  },

  note: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: radius.card, backgroundColor: "#f8fafc", padding: space.lg, gap: 8 },
  noteTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  noteBody: { fontSize: 12, color: "#475569", lineHeight: 19 },
});
