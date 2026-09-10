/**
 * I5 — rezyume hujjatlari (TZ 13).
 *
 * ── NEGA REZYUMEGA ILOVA ────────────────────────────────────────
 *
 * «Prava bor» degan belgi bilan pravaning O'ZI boshqa gap. Ish
 * beruvchi muddatni ko'rishi kerak: muddati o'tgan prava bilan
 * odamni reysga qo'yib bo'lmaydi.
 *
 * ⚠️ HUJJATNI HAMMA KO'RMAYDI. Ish beruvchi faqat arizasi ma'lum
 * bosqichga yetgan nomzodnikini ochadi — qoida serverda
 * (`resumeDocuments`), bu yerda takrorlanmaydi.
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, apiUpload, FuramError } from "@/lib/api";
import { openRemoteFile } from "@/lib/files";
import { pickDocument, pickPhotos, toUpload, type Photo } from "@/lib/photo";
import { afterSheet } from "@/lib/native-ui";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** `furam/src/lib/jobs.ts:RESUME_DOC_KINDS` */
const KINDS = ["LICENSE", "PASSPORT", "MEDICAL", "ADR", "VISA", "DIPLOMA", "OTHER"];

type Doc = {
  id: string;
  kind: string | null;
  name: string;
  number: string | null;
  expiresAt: string | null;
  isImage: boolean;
  sizeBytes: number | null;
  createdAt: string;
};
type Feed = { items: Doc[]; mine: boolean };

/** Muddat holati — «necha kun qoldi» bilan, sana bilan emas */
function left(iso: string | null): { text: string; tone: string } | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: t("mob.docs.expiredAgo", { n: -days }), tone: color.danger };
  if (days <= 30) return { text: t("mob.docs.daysLeft", { n: days }), tone: color.warning };
  return { text: t("mob.docs.daysLeft", { n: days }), tone: color.mutedForeground };
}

export default function RezyumeHujjat() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    "/api/jobs/resume/documents",
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("LICENSE");
  const [number, setNumber] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: Photo) {
    setBusy(true);
    setErr(null);
    try {
      await apiUpload(
        "/api/jobs/resume/documents",
        {
          kind,
          name: file.name,
          number: number.trim() || undefined,
          expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(expires) ? expires : undefined,
        },
        [toUpload(file, "file")],
      );
      setOpen(false);
      setNumber("");
      setExpires("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  /* ⚠️ iOS varaq USTIDAN tizim tanlagichini ocholmaydi */
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

  function remove(d: Doc) {
    Alert.alert(t("mob.cdoc.delQ"), d.name, [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.cdoc.del"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/jobs/resume/documents/${d.id}`, { method: "DELETE" });
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
      <Header title={t("mob.rdoc.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.rdoc.lead")}</Text>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && data.items.length === 0 ? (
          <Empty icon="file" title={t("mob.rdoc.empty")} text={t("mob.rdoc.emptyHint")} />
        ) : null}

        <View style={{ gap: 8 }}>
          {(data?.items ?? []).map((d) => {
            const l = left(d.expiresAt);
            return (
              <Pressable
                key={d.id}
                onPress={() =>
                  void openRemoteFile(`/api/jobs/resume/documents/${d.id}`, d.name)
                }
                onLongPress={() => (data?.mine ? remove(d) : undefined)}
                style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
              >
                <View style={s.icon}>
                  <Icon name={d.isImage ? "image" : "file"} size={18} stroke={color.blue} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>
                    {d.kind ? t(`mob.pdocKind.${d.kind}`) : d.name}
                  </Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {[d.number, l?.text].filter(Boolean).join(" · ") || d.name}
                  </Text>
                </View>
                {l ? <Text style={[s.days, { color: l.tone }]}>●</Text> : null}
                <Icon name="chevron" size={17} stroke="#cbd5e1" />
              </Pressable>
            );
          })}
        </View>

        {data?.mine ? (
          <>
            <Text style={s.hint}>{t("mob.rdoc.delHint")}</Text>
            <Button
              title={t("mob.rdoc.add")}
              variant="secondary"
              loading={busy}
              onPress={() => setOpen(true)}
              icon={<Icon name="plus" size={18} stroke={color.foreground} />}
            />
          </>
        ) : null}
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.rdoc.add")}>
        <Text style={s.label}>{t("mob.cdoc.kind")}</Text>
        <View style={s.chips}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.chip, kind === k && s.chipOn]}>
              <Text style={[s.chipText, kind === k && { color: "#fff" }]}>
                {t(`mob.pdocKind.${k}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: space.md, marginTop: space.md }}>
          <Field
            label={t("mob.rdoc.number")}
            value={number}
            onChangeText={setNumber}
            maxLength={60}
          />
          <Field
            label={t("mob.rdoc.expires")}
            value={expires}
            onChangeText={setExpires}
            placeholder="2028-05-20"
            maxLength={10}
          />
          <Button
            title={t("mob.tech.photo")}
            variant="secondary"
            onPress={() => pick("photo")}
            icon={<Icon name="image" size={18} stroke={color.foreground} />}
          />
          <Button
            title={t("mob.rdoc.add")}
            onPress={() => pick("doc")}
            icon={<Icon name="paperclip" size={18} stroke="#fff" />}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },
  hint: { fontSize: 11.5, color: color.mutedForeground, textAlign: "center" },

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
  days: { fontSize: 12 },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },
}));
