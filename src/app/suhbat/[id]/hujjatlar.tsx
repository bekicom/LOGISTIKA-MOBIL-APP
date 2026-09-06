/**
 * Suhbat hujjatlari (TZ 02, 23, 26-band): CMR, TIR, invoys… Yangi
 * versiya eski hujjat ustiga qo'yiladi, eskisi tarixda qoladi.
 * Reysga bog'langan suhbatda reys hujjatlari ham shu ro'yxatda.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { apiUpload, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { pickDocument, pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { openRemoteFile } from "@/lib/files";
import { afterSheet } from "@/lib/native-ui";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Doc = {
  id: string; kind: string; name: string; version: number; hasOlder: boolean; sizeKb: number | null;
  by: string; mine: boolean; createdAt: string; seenBy: { name: string; at: string }[];
};
const KINDS = ["CMR", "TIR", "DOZVOL", "INVOICE", "PACKING", "INSURANCE", "TECH_PASSPORT", "CUSTOMS", "UNLOAD_PHOTO", "OTHER"] as const;

export default function SuhbatHujjatlari() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{ documents: Doc[] }>(
    id ? `/api/chat/${id}/documents` : null,
    [id],
  );
  const [pick, setPick] = useState<{ replaces?: Doc } | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("CMR");
  const [file, setFile] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [seenOf, setSeenOf] = useState<Doc | null>(null);

  async function choose(from: "camera" | "gallery" | "doc") {
    /* Varaq YOPILADI, keyin tanlagich ochiladi — iOS ochiq `Modal`
       ustiga tizim oynasini chiqara olmaydi. Tanlangach varaq
       qaytadan ochiladi va fayl ko'rinadi. */
    const back = pick;
    const got = await afterSheet(() => setPick(null), async () =>
      from === "camera" ? (await takePhoto())[0] : from === "gallery" ? (await pickPhotos(1))[0] : await pickDocument(),
    );
    setPick(back);
    if (got) setFile(got);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      await apiUpload(
        `/api/chat/${id}/documents`,
        { kind: pick?.replaces ? pick.replaces.kind : kind, name: file.name, ...(pick?.replaces ? { replacesId: pick.replaces.id } : {}) },
        [toUpload(file, "file")],
      );
      setPick(null);
      setFile(null);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function open(d: Doc) {
    try {
      await openRemoteFile(`/api/chat/${id}/documents/${d.id}`, d.name);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.err.network"));
    }
  }

  const docs = data?.documents ?? [];

  return (
    <View style={s.root}>
      <Header
        title={t("mob.chatDoc.title")}
        subtitle={docs.length ? t("mob.common.countN", { n: docs.length }) : undefined}
        right={
          <Pressable onPress={() => { setFile(null); setPick({}); }} hitSlop={8} style={s.add}>
            <Icon name="plus" size={18} stroke="#fff" />
          </Pressable>
        }
      />
      {err ? <View style={{ paddingHorizontal: space.lg }}><Notice tone="danger">{err}</Notice></View> : null}
      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
            <View style={s.icon}>
              <Icon name="file" size={20} stroke={color.blue} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.kind}>{t(`mob.chatDoc.kinds.${item.kind}`)}</Text>
                {item.version > 1 ? <Text style={s.ver}>{t("mob.chatDoc.version", { n: item.version })}</Text> : null}
              </View>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.meta}>{item.by} · {item.createdAt}{item.sizeKb ? ` · ${item.sizeKb} KB` : ""}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Pressable onPress={() => setSeenOf(item)} hitSlop={8} style={s.seen}>
                <Icon name="check-check" size={13} stroke={item.seenBy.length ? color.success : "#94a3b8"} />
                <Text style={s.seenText}>{item.seenBy.length}</Text>
              </Pressable>
              <Pressable onPress={() => { setFile(null); setPick({ replaces: item }); }} hitSlop={8}>
                <Text style={s.replace}>{t("mob.chatDoc.replace")}</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? <Skeleton rows={2} /> : error ? <ErrorBox message={error} onRetry={reload} /> : <Empty icon="doc" title={t("mob.chatDoc.noDocs")} />
        }
      />

      {/* Yuklash varag'i */}
      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick?.replaces ? t("mob.chatDoc.replace") : t("mob.chatDoc.upload")}>
        {!pick?.replaces ? (
          <>
            <Text style={s.label}>{t("mob.chatDoc.kind")}</Text>
            <View style={s.kinds}>
              {KINDS.map((k) => (
                <Pressable key={k} onPress={() => setKind(k)} style={[s.kchip, kind === k && s.kchipOn]}>
                  <Text style={[s.kchipText, kind === k && s.kchipTextOn]}>{t(`mob.chatDoc.kinds.${k}`)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={s.meta}>{pick.replaces.name} → v{pick.replaces.version + 1}</Text>
        )}
        <Text style={s.label}>{t("mob.chatDoc.pickFile")}</Text>
        <View style={s.pickRow}>
          <Pick label={t("mob.chat.camera")} onPress={() => choose("camera")} />
          <Pick label={t("mob.chat.gallery")} onPress={() => choose("gallery")} />
          <Pick label={t("mob.chat.document")} onPress={() => choose("doc")} />
        </View>
        {file ? (
          <View style={s.fileRow}>
            <Icon name="paperclip" size={15} stroke={color.brand} />
            <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
            <Pressable onPress={() => setFile(null)} hitSlop={8}><Icon name="close" size={15} stroke={color.mutedForeground} /></Pressable>
          </View>
        ) : null}
        <View style={{ marginTop: 14 }}>
          <Button title={t("mob.chatDoc.upload")} onPress={upload} loading={busy} disabled={!file} />
        </View>
      </Sheet>

      {/* Ko'rganlar */}
      <Sheet open={!!seenOf} onClose={() => setSeenOf(null)} title={t("mob.chatDoc.seenBy")}>
        {seenOf?.seenBy.length ? (
          seenOf.seenBy.map((v, i) => (
            <View key={i} style={s.seenRow}>
              <Icon name="user" size={16} stroke={color.mutedForeground} />
              <Text style={s.seenName}>{v.name}</Text>
              <Text style={s.meta}>{v.at}</Text>
            </View>
          ))
        ) : (
          <Text style={s.meta}>—</Text>
        )}
      </Sheet>
    </View>
  );
}

function Pick({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.pick}>
      <Text style={s.pickText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  list: { padding: space.lg, gap: space.sm },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.card, borderRadius: radius.card, padding: space.md, ...shadow.card },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: color.blueSoft, alignItems: "center", justifyContent: "center" },
  kind: { fontSize: 11, fontWeight: "800", color: color.blue, letterSpacing: 0.3 },
  ver: { fontSize: 10.5, fontWeight: "700", color: color.mutedForeground, backgroundColor: color.muted, paddingHorizontal: 6, borderRadius: 6, overflow: "hidden" },
  name: { fontSize: 14, fontWeight: "700", color: color.foreground, marginTop: 2 },
  meta: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2 },
  seen: { flexDirection: "row", alignItems: "center", gap: 3 },
  seenText: { fontSize: 11, color: color.mutedForeground },
  replace: { fontSize: 11, fontWeight: "700", color: color.brand },
  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginTop: 8, marginBottom: 8, letterSpacing: 0.3 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kchip: { height: 32, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: color.muted, justifyContent: "center" },
  kchipOn: { backgroundColor: color.blue },
  kchipText: { fontSize: 12.5, fontWeight: "600", color: color.mutedForeground },
  kchipTextOn: { color: "#fff" },
  pickRow: { flexDirection: "row", gap: 8 },
  pick: { flex: 1, height: 44, borderRadius: radius.control, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  pickText: { fontSize: 13, fontWeight: "700", color: color.foreground },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, padding: 10, borderRadius: radius.control, backgroundColor: color.brandSoft },
  fileName: { flex: 1, fontSize: 13, fontWeight: "600", color: color.foreground },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  seenName: { flex: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
});
