/**
 * Hodisa tafsiloti — dalillar va holat (TZ 02, 29-30-band).
 *
 * Dalil: izoh, rasm, joylashuv. Holat: OPEN → IN_PROGRESS → RESOLVED,
 * orqaga qaytish ham mumkin (web bilan bir xil `NEXT_STATUS`).
 */
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, apiUpload, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { pickPhotos, takePhoto, toUpload } from "@/lib/photo";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = { id: string; kind: string; text: string | null; lat: number | null; lng: number | null; hasFile: boolean; mine: boolean; createdAt: string };
type Inc = {
  id: string; kind: string; title: string; description: string | null; status: string;
  lat: number | null; lng: number | null; placeName: string | null; tripId: string | null;
  createdBy: string | null; createdAt: string; resolvedBy: string | null; resolveNote: string | null; items: Item[];
};

const NEXT: Record<string, string[]> = { OPEN: ["IN_PROGRESS", "RESOLVED"], IN_PROGRESS: ["RESOLVED", "OPEN"], RESOLVED: ["OPEN"] };
const TONE: Record<string, { fg: string; bg: string }> = {
  OPEN: { fg: color.danger, bg: color.dangerSoft },
  IN_PROGRESS: { fg: color.warning, bg: color.warningSoft },
  RESOLVED: { fg: color.success, bg: color.successSoft },
};
const ITEM_ICON: Record<string, IconName> = { photo: "image", video: "play", file: "file", location: "map-pin", note: "doc" };

export default function Hodisa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useApi<Inc>(id ? `/api/incidents/${id}` : null, [id]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const addNote = () =>
    run(async () => {
      if (!note.trim()) return;
      await apiUpload(`/api/incidents/${id}/items`, { kind: "note", text: note.trim() });
      setNote("");
    });

  const addPhoto = (from: "camera" | "gallery") =>
    run(async () => {
      const got = from === "camera" ? (await takePhoto())[0] : (await pickPhotos(1))[0];
      if (!got) return;
      await apiUpload(`/api/incidents/${id}/items`, { kind: "photo" }, [toUpload(got, "file")]);
    });

  const addLocation = () =>
    run(async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new FuramError({ error: "LOC", message: t("mob.msg.locDenied"), status: 0 });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await apiUpload(`/api/incidents/${id}/items`, { kind: "location", lat: pos.coords.latitude, lng: pos.coords.longitude });
    });

  const move = (status: string) =>
    run(() => api(`/api/incidents/${id}`, { method: "PATCH", body: { status, note: status === "RESOLVED" && note.trim() ? note.trim() : undefined } }));

  const d = data;
  const tone = d ? (TONE[d.status] ?? TONE.OPEN) : TONE.OPEN;

  return (
    <View style={s.root}>
      <Header title={d?.title ?? t("mob.inc.title")} subtitle={d ? t(`mob.inc.kind.${d.kind}`) : undefined} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        {loading && !d ? <Skeleton rows={2} /> : null}
        {error && !d ? <ErrorBox message={error} onRetry={reload} /> : null}

        {d ? (
          <>
            <View style={s.card}>
              <View style={s.row}>
                <View style={[s.status, { backgroundColor: tone.bg }]}>
                  <Text style={[s.statusText, { color: tone.fg }]}>{t(`mob.inc.status.${d.status}`)}</Text>
                </View>
                <Text style={s.meta}>{d.createdBy} · {d.createdAt}</Text>
              </View>
              {d.description ? <Text style={s.desc}>{d.description}</Text> : null}
              {d.lat != null && d.lng != null ? (
                <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps?q=${d.lat},${d.lng}`)} style={s.link}>
                  <Icon name="map-pin" size={16} stroke={color.brand} />
                  <Text style={s.linkText}>{d.placeName ?? t("mob.msg.openMap")}</Text>
                </Pressable>
              ) : null}
              {d.resolveNote ? (
                <View style={s.resolved}>
                  <Icon name="check-check" size={15} stroke={color.success} />
                  <Text style={s.resolvedText}>{d.resolvedBy}: {d.resolveNote}</Text>
                </View>
              ) : null}
            </View>

            {/* Dalillar */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("mob.inc.evidence")}</Text>
              {d.items.length === 0 ? <Text style={s.meta}>—</Text> : null}
              {d.items.map((it) => (
                <View key={it.id} style={s.item}>
                  <View style={s.itemIcon}>
                    <Icon name={ITEM_ICON[it.kind] ?? "doc"} size={16} stroke={color.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemKind}>{t(`mob.inc.itemKind.${it.kind}`)} · {it.createdAt}</Text>
                    {it.text ? <Text style={s.itemText}>{it.text}</Text> : null}
                    {it.lat != null && it.lng != null ? (
                      <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps?q=${it.lat},${it.lng}`)}>
                        <Text style={s.linkText}>{t("mob.msg.openMap")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}

              <Field value={note} onChangeText={setNote} placeholder={t("mob.inc.addNote")} multiline style={{ minHeight: 60, textAlignVertical: "top" }} />
              <View style={s.actions}>
                <Chip icon="doc" label={t("mob.inc.addNote")} onPress={addNote} disabled={busy || !note.trim()} />
                <Chip icon="image" label={t("mob.inc.addPhoto")} onPress={() => addPhoto("camera")} disabled={busy} />
                <Chip icon="map-pin" label={t("mob.inc.addLocation")} onPress={addLocation} disabled={busy} />
              </View>
            </View>

            {/* Holat */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("mob.inc.moveTo")}</Text>
              {d.status !== "RESOLVED" ? <Text style={s.meta}>{t("mob.inc.resolveNote")}: {t("mob.inc.addNote").toLowerCase()} ↑</Text> : null}
              <View style={{ gap: 8 }}>
                {(NEXT[d.status] ?? []).map((st) => (
                  <Button
                    key={st}
                    title={t(`mob.inc.status.${st}`)}
                    variant={st === "RESOLVED" ? "primary" : "secondary"}
                    onPress={() => move(st)}
                    loading={busy}
                  />
                ))}
              </View>
            </View>

            {err ? <Notice tone="danger">{err}</Notice> : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Chip({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.chip, disabled && { opacity: 0.5 }]}>
      <Icon name={icon} size={15} stroke={color.brand} />
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, gap: 10, ...shadow.card },
  cardTitle: { fontSize: 15, fontWeight: "800", color: color.foreground },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  status: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: "center" },
  statusText: { fontSize: 12, fontWeight: "700" },
  meta: { fontSize: 12, color: color.mutedForeground },
  desc: { fontSize: 14, color: color.foreground, lineHeight: 21 },
  link: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { fontSize: 13, fontWeight: "700", color: color.brand, textDecorationLine: "underline" },
  resolved: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: radius.control, backgroundColor: color.successSoft },
  resolvedText: { flex: 1, fontSize: 13, color: "#15803d" },
  item: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  itemIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  itemKind: { fontSize: 11.5, color: color.mutedForeground },
  itemText: { fontSize: 14, color: color.foreground, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.brandSoft },
  chipText: { fontSize: 13, fontWeight: "700", color: color.brand },
}));
