/**
 * Sh3 — shartnoma hujjatlari (TZ 18-band).
 *
 * ── NEGA REYS HUJJATLARIDAN ALOHIDA EMAS ────────────────────────
 *
 * Bir xil hujjat: shartnoma bosqichida qo'yilgan CMR reys ochilgach
 * o'sha reysda ham ko'rinadi (`tripId` server tomonda to'ldiriladi).
 * Ikkinchi nusxa yasalmaydi — aks holda qaysi biri to'g'ri degan
 * savol chiqardi.
 *
 * ── FAYL «OCHISH» EMAS, «ULASHISH» ──────────────────────────────
 *
 * Hujjat `Authorization` talab qiladi. Oddiy havola sarlavhasiz
 * boradi va 401 oladi, shuning uchun fayl avval keshga yuklanadi,
 * keyin tizim oynasi chaqiriladi (u yerda ko'rish ham, saqlash ham,
 * boshqa ilovaga yuborish ham bor).
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, apiUpload, FuramError } from "@/lib/api";
import { openRemoteFile } from "@/lib/files";
import { pickDocument, pickPhotos, toUpload, type Photo } from "@/lib/photo";
import { afterSheet } from "@/lib/native-ui";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** `furam/src/app/api/contracts/[id]/documents/route.ts:kindSchema` */
const KINDS = ["CMR", "INVOICE", "PACKING", "TIR", "DOZVOL", "INSURANCE", "OTHER"];

type Item = {
  id: string;
  kind: string;
  name: string;
  sizeBytes: number | null;
  mimeType: string | null;
  byName: string | null;
  mine: boolean;
  createdAt: string;
};
type Feed = { canAdd: boolean; max: number; items: Item[] };

function size(b: number | null) {
  if (!b) return null;
  return b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function ShartnomaHujjatlari() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/contracts/${id}/documents` : null,
    [id],
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("CMR");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: Photo) {
    setBusy(true);
    setErr(null);
    try {
      await apiUpload(`/api/contracts/${id}/documents`, { kind, name: file.name }, [
        toUpload(file, "file"),
      ]);
      setOpen(false);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  /* ⚠️ iOS varaq USTIDAN tizim tanlagichini ocholmaydi — avval
     varaq yopiladi, keyin tanlagich chaqiriladi (`afterSheet`). */
  function pick(from: "doc" | "photo") {
    void afterSheet(
      () => setOpen(false),
      async () => {
        const f = from === "doc" ? await pickDocument() : ((await pickPhotos(1))[0] ?? null);
        if (f) await upload(f);
        else setOpen(true);
      },
    );
  }

  async function remove(doc: Item) {
    Alert.alert(t("mob.cdoc.delQ"), doc.name, [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.cdoc.del"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/contracts/${id}/documents/${doc.id}`, { method: "DELETE" });
            reload();
          } catch (e) {
            setErr((e as FuramError).message ?? t("mob.common.failed"));
          }
        },
      },
    ]);
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.cdoc.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.cdoc.lead")}</Text>

        {/* Qoida 5: to'siq OLDINDAN aytiladi. Hujjat qo'yish
            «Hujjatlarim» tarifiga kiradi — odam faylni tanlab,
            yuklab, oxirida «tarifingizga kirmaydi» eshitmasin. */}
        <TariffNotice feature="documents" />

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && data.items.length === 0 ? (
          <Empty icon="file" title={t("mob.cdoc.empty")} text={t("mob.cdoc.emptyHint")} />
        ) : null}

        <View style={{ gap: 8 }}>
          {(data?.items ?? []).map((d) => (
            <Pressable
              key={d.id}
              onPress={() => void openRemoteFile(`/api/contracts/${id}/documents/${d.id}`, d.name)}
              onLongPress={() => (d.mine ? remove(d) : undefined)}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
            >
              <View style={s.icon}>
                <Icon
                  name={d.mimeType?.startsWith("image/") ? "image" : "file"}
                  size={18}
                  stroke={color.blue}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={s.meta} numberOfLines={1}>
                  {t(`docKind.${d.kind}`)}
                  {size(d.sizeBytes) ? ` · ${size(d.sizeBytes)}` : ""}
                  {d.byName ? ` · ${d.byName}` : ""}
                </Text>
              </View>
              <Icon name="chevron" size={17} stroke="#cbd5e1" />
            </Pressable>
          ))}
        </View>

        {data && !data.canAdd ? <Notice tone="info">{t("mob.cdoc.locked")}</Notice> : null}

        {data?.canAdd ? (
          <Button
            title={t("mob.cdoc.add")}
            variant="secondary"
            onPress={() => setOpen(true)}
            loading={busy}
            icon={<Icon name="plus" size={18} stroke={color.foreground} />}
          />
        ) : null}
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.cdoc.add")}>
        <Text style={s.label}>{t("mob.cdoc.kind")}</Text>
        <View style={s.chips}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.chip, kind === k && s.chipOn]}>
              <Text style={[s.chipText, kind === k && { color: "#fff" }]}>{t(`docKind.${k}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.lg, gap: 9 }}>
          <Button
            title={t("mob.tech.photo")}
            variant="secondary"
            onPress={() => pick("photo")}
            icon={<Icon name="image" size={18} stroke={color.foreground} />}
          />
          <Button
            title={t("mob.cdoc.add")}
            onPress={() => pick("doc")}
            icon={<Icon name="paperclip" size={18} stroke="#fff" />}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: color.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
});
