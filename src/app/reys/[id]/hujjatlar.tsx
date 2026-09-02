/**
 * E5 — reys hujjatlari.
 *
 * CMR, invoys, deklaratsiya, tushirish suratlari. Almashtirilgan hujjat
 * ro'yxatda ko'rinmaydi — faqat oxirgi versiya, ustida «v2» belgisi bilan.
 */
import { useState } from "react";
import {
  FlatList, Image, Modal, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Doc = {
  id: string; kind: string | null; kindLabel: string; name: string;
  version: number; isImage: boolean; sizeBytes: number | null;
  createdAt: string; by: string | null;
};

/** Serverdagi `TRIP_DOC_KINDS` bilan bir xil */
const KINDS = [
  { key: "CMR", label: "CMR" },
  { key: "INVOICE", label: "Invoys" },
  { key: "PACKING", label: "Packing List" },
  { key: "CUSTOMS", label: "Bojxona" },
  { key: "TIR", label: "TIR" },
  { key: "DOZVOL", label: "Dozvol" },
  { key: "UNLOAD_PHOTO", label: "Tushirish rasmi" },
  { key: "OTHER", label: "Boshqa" },
];

export default function Hujjatlar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: Doc[]; count: number }>(
    id ? `/api/trips/${id}/documents/list` : null,
    [id],
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Hujjatlar</Text>
          <Text style={s.sub}>{data ? `${data.count} ta` : "…"}</Text>
        </View>
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(d) => d.id}
        numColumns={2}
        columnWrapperStyle={data?.items?.length ? { gap: space.md } : undefined}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.preview}>
              <Icon name="doc" size={30} stroke="#94a3b8" />
              {item.version > 1 ? (
                <View style={s.version}>
                  <Text style={s.versionText}>v{item.version}</Text>
                </View>
              ) : null}
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.kindLabel}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {when(item.createdAt)}
                {item.sizeBytes ? ` · ${Math.round(item.sizeBytes / 1024)} KB` : ""}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty
              icon="doc"
              title="Hujjat yo'q"
              text="CMR, invoys va tushirish suratlarini shu yerga qo'shing. Reys yopilganda hisobotga tushadi."
            />
          )
        }
      />

      <Pressable style={[s.fab, { bottom: insets.bottom + space.lg }]} onPress={() => setSheet(true)}>
        <Icon name="doc" size={19} stroke="#fff" />
        <Text style={s.fabText}>Hujjat qo&apos;shish</Text>
      </Pressable>

      <AddSheet
        open={sheet}
        tripId={String(id)}
        onClose={() => setSheet(false)}
        onDone={() => { setSheet(false); reload(); }}
      />
    </View>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  const M = ["yanv", "fev", "mart", "apr", "may", "iyun", "iyul", "avg", "sent", "okt", "noya", "dek"];
  return `${d.getDate()}-${M[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────── qo'shish */

function AddSheet({ open, tripId, onClose, onDone }: {
  open: boolean; tripId: string; onClose: () => void; onDone: () => void;
}) {
  const [kind, setKind] = useState("CMR");
  const [pages, setPages] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  function reset() {
    setKind("CMR"); setPages([]); setErr(null); setDone(0);
  }

  async function add(from: "camera" | "gallery") {
    const got = from === "camera" ? await takePhoto() : await pickPhotos(8);
    if (got.length) setPages((p) => [...p, ...got].slice(0, 10));
  }

  async function submit() {
    setErr(null);
    setBusy(true);
    setDone(0);
    try {
      /* Har sahifa ALOHIDA hujjat bo'lib ketadi: server bitta so'rovda
         bitta fayl kutadi. Ketma-ket yuboriladi — parallel yuborilsa
         sekin internetda hammasi birdan uzilib qolardi. */
      for (const p of pages) {
        await apiUpload(`/api/trips/${tripId}/documents`, { kind }, [toUpload(p, "file")]);
        setDone((n) => n + 1);
      }
      reset();
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? "Yuborilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <View style={{ padding: space.xl, paddingTop: space.lg }}>
            <Text style={s.sheetTitle}>Hujjat qo&apos;shish</Text>

            <Text style={[s.label, { marginTop: space.xl }]}>Turi</Text>
            <View style={s.kinds}>
              {KINDS.map((k) => {
                const on = kind === k.key;
                return (
                  <Pressable key={k.key} onPress={() => setKind(k.key)} style={[s.kind, on && s.kindOn]}>
                    <Text style={[s.kindText, on && s.kindTextOn]}>{k.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[s.label, { marginTop: space.xl }]}>
              Sahifalar {pages.length > 0 ? <Text style={s.optional}>— {pages.length} ta</Text> : null}
            </Text>
            <View style={s.pages}>
              {pages.map((p, i) => (
                <View key={p.uri} style={s.thumb}>
                  <Image source={{ uri: p.uri }} style={s.thumbImg} />
                  <View style={s.pageNo}>
                    <Text style={s.pageNoText}>{i + 1}</Text>
                  </View>
                  <Pressable style={s.remove} hitSlop={8} onPress={() => setPages((v) => v.filter((_, k) => k !== i))}>
                    <Icon name="close" size={11} stroke="#fff" />
                  </Pressable>
                </View>
              ))}
              {pages.length < 10 ? (
                <>
                  <Pressable style={s.add} onPress={() => add("camera")}>
                    <Icon name="doc" size={20} />
                    <Text style={s.addText}>Skanerlash</Text>
                  </Pressable>
                  <Pressable style={s.add} onPress={() => add("gallery")}>
                    <Icon name="package" size={20} />
                    <Text style={s.addText}>Galereya</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            {busy && pages.length > 1 ? (
              <Text style={s.progress}>Yuborilmoqda: {done} / {pages.length}</Text>
            ) : null}

            {err ? <View style={{ marginTop: space.lg }}><Notice tone="danger">{err}</Notice></View> : null}
          </View>

          <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
            <Button
              title={pages.length > 1 ? `${pages.length} sahifani yuborish` : "Yuborish"}
              onPress={submit}
              loading={busy}
              disabled={pages.length === 0}
            />
            <Pressable onPress={() => { reset(); onClose(); }} style={s.cancel}>
              <Text style={s.cancelText}>Bekor qilish</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: { backgroundColor: color.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  list: { padding: space.lg, gap: space.md },
  card: {
    flex: 1, backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, overflow: "hidden", ...shadow.card,
  },
  preview: { height: 118, backgroundColor: "#eef2f7", alignItems: "center", justifyContent: "center" },
  version: {
    position: "absolute", right: 8, top: 8, height: 22, paddingHorizontal: 8,
    borderRadius: 6, backgroundColor: color.info, alignItems: "center", justifyContent: "center",
  },
  versionText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  cardBody: { padding: 11 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: color.foreground },
  meta: { fontSize: 11, color: color.mutedForeground, marginTop: 2 },

  fab: {
    position: "absolute", right: space.lg, height: 52, paddingHorizontal: 20, borderRadius: 26,
    backgroundColor: color.brand, flexDirection: "row", alignItems: "center", gap: 8,
    shadowColor: color.brand, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  fabText: { fontSize: font.body, fontWeight: "600", color: "#fff" },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginTop: 10 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: color.foreground },

  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 9 },
  optional: { fontWeight: "400", color: color.mutedForeground },

  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  kind: { height: 34, paddingHorizontal: 12, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, justifyContent: "center" },
  kindOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180f" },
  kindText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  kindTextOn: { fontWeight: "700", color: "#c2490f" },

  pages: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  thumb: { width: 78, height: 78, borderRadius: radius.control, overflow: "hidden", backgroundColor: color.muted },
  thumbImg: { width: "100%", height: "100%" },
  pageNo: {
    position: "absolute", left: 4, top: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  pageNoText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  remove: {
    position: "absolute", right: 4, top: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(15,23,42,0.6)", alignItems: "center", justifyContent: "center",
  },
  add: {
    width: 78, height: 78, borderRadius: radius.control, borderWidth: 1.5, borderColor: "#cbd5e1",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4,
  },
  addText: { fontSize: 10, fontWeight: "500", color: color.mutedForeground, textAlign: "center" },
  progress: { fontSize: 12, color: color.mutedForeground, textAlign: "center", marginTop: space.md },

  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },
  cancel: { height: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
