/**
 * E4 — reys xarajatlari.
 *
 * Yig'indi serverda hisoblanadi. Valyutalar QO'SHILMAYDI: har biri o'z
 * qatorida turadi — kurs kunlik o'zgaradi va bitta «jami» raqami ertaga
 * boshqacha chiqib, odamni chalg'itardi.
 */
import { useState } from "react";
import {
  FlatList, Image, Modal, Pressable, RefreshControl,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Field, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = {
  id: string; category: string; label: string; station: string | null;
  amount: number; currency: string; liters: number | null;
  note: string | null; hasReceipt: boolean; createdAt: string;
};
type Feed = { items: Item[]; totals: Record<string, number>; count: number };

const CATS: { key: string; label: string; icon: IconName }[] = [
  { key: "FUEL", label: t("mob.exp.fuel"), icon: "truck" },
  { key: "TOLL", label: t("mob.exp.road"), icon: "border" },
  { key: "CUSTOMS", label: "Bojxona", icon: "doc" },
  { key: "FOOD", label: t("mob.exp.food"), icon: "package" },
  { key: "PARKING", label: "Parking", icon: "clock" },
  { key: "REPAIR", label: t("mob.exp.repair"), icon: "alert" },
  { key: "WASH", label: t("mob.exp.wash"), icon: "check" },
  { key: "PARTS", label: t("mob.exp.parts"), icon: "package" },
  { key: "FINE", label: t("mob.exp.fine"), icon: "alert" },
  { key: "OTHER", label: t("mob.exp.other"), icon: "plus" },
];

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];

function money(n: number, cur: string) {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ${cur}`;
}

function iconOf(cat: string): IconName {
  return CATS.find((c) => c.key === cat)?.icon ?? "package";
}

export default function Xarajatlar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/trips/${id}/expenses/list` : null,
    [id],
  );

  const totals = Object.entries(data?.totals ?? {});

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("mob.exp.title")}</Text>
          <Text style={s.sub}>{data ? `${data.count} ta yozuv` : "…"}</Text>
        </View>
      </View>

      {/* Jami — har valyuta alohida */}
      {totals.length > 0 ? (
        <View style={s.totals}>
          {totals.map(([cur, sum]) => (
            <View key={cur} style={s.total}>
              <Text style={s.totalValue}>{new Intl.NumberFormat("ru-RU").format(sum)}</Text>
              <Text style={s.totalCur}>{cur}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Icon name={iconOf(item.category)} size={19} stroke={color.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{item.label}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {[item.station, item.liters ? `${item.liters} l` : null, when(item.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            {item.hasReceipt ? (
              <View style={s.receipt}>
                <Icon name="doc" size={14} />
              </View>
            ) : null}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.amount}>{new Intl.NumberFormat("ru-RU").format(item.amount)}</Text>
              <Text style={s.cur}>{item.currency}</Text>
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
              icon="package"
              title="Xarajat yozilmagan"
              text="Yoqilg'i, yo'l haqi va boshqa xarajatlarni shu yerda qayd eting — reys yopilganda hisobotga tushadi."
            />
          )
        }
      />

      <Pressable style={[s.fab, { bottom: insets.bottom + space.lg }]} onPress={() => setSheet(true)}>
        <Icon name="plus" size={20} stroke="#fff" />
        <Text style={s.fabText}>{t("mob.exp.one")}</Text>
      </Pressable>

      <AddSheet
        open={sheet}
        tripId={String(id)}
        onClose={() => setSheet(false)}
        onDone={() => {
          setSheet(false);
          reload();
        }}
      />
    </View>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────── kiritish oynasi */

function AddSheet({ open, tripId, onClose, onDone }: {
  open: boolean; tripId: string; onClose: () => void; onDone: () => void;
}) {
  const [cat, setCat] = useState("FUEL");
  const [amount, setAmount] = useState("");
  const [cur, setCur] = useState("UZS");
  const [station, setStation] = useState("");
  const [liters, setLiters] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const num = Number(amount.replace(/\s/g, "").replace(",", "."));
  const ready = num > 0;

  function reset() {
    setCat("FUEL"); setAmount(""); setStation(""); setLiters(""); setNote("");
    setPhoto(null); setErr(null);
  }

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await apiUpload(
        `/api/trips/${tripId}/expenses`,
        {
          category: cat,
          amount: num,
          currency: cur,
          station: station.trim() || undefined,
          liters: cat === "FUEL" && liters ? Number(liters) : undefined,
          note: note.trim() || undefined,
        },
        photo ? [toUpload(photo, "receipt")] : [],
      );
      reset();
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <FlatList
            data={[0]}
            keyExtractor={() => "form"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: space.xl, paddingTop: space.lg }}
            renderItem={() => (
              <View>
                <Text style={s.sheetTitle}>{t("mob.exp.add")}</Text>

                <Text style={[s.label, { marginTop: space.xl }]}>{t("mob.exp.kind")}</Text>
                <View style={s.cats}>
                  {CATS.map((c) => {
                    const on = cat === c.key;
                    return (
                      <Pressable key={c.key} onPress={() => setCat(c.key)} style={[s.cat, on && s.catOn]}>
                        <Icon name={c.icon} size={18} stroke={on ? color.brand : color.mutedForeground} />
                        <Text style={[s.catText, on && s.catTextOn]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ marginTop: space.xl, flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t("mob.exp.amount")}
                      placeholder="0"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                    />
                  </View>
                  <View style={{ width: 104 }}>
                    <Text style={s.label}>{t("mob.exp.currency")}</Text>
                    <View style={s.curRow}>
                      {CURRENCIES.map((c) => (
                        <Pressable key={c} onPress={() => setCur(c)} style={[s.curChip, cur === c && s.curChipOn]}>
                          <Text style={[s.curText, cur === c && s.curTextOn]}>{c}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: space.lg }}>
                  <Field
                    label={cat === "FUEL" ? t("mob.exp.refuel") : "Joy"}
                    hint="ixtiyoriy"
                    placeholder={cat === "FUEL" ? t("mob.exp.wherePh") : t("mob.exp.where")}
                    value={station}
                    onChangeText={setStation}
                  />
                </View>

                {cat === "FUEL" ? (
                  <View style={{ marginTop: space.lg }}>
                    <Field
                      label={t("mob.exp.liters")}
                      hint="ixtiyoriy"
                      placeholder="120"
                      keyboardType="numeric"
                      value={liters}
                      onChangeText={setLiters}
                    />
                  </View>
                ) : null}

                <View style={{ marginTop: space.lg }}>
                  <Field label={t("mob.exp.note")} hint="ixtiyoriy" placeholder={t("mob.exp.notePh")} value={note} onChangeText={setNote} />
                </View>

                {/* Chek */}
                <Text style={[s.label, { marginTop: space.xl }]}>
                  Chek <Text style={s.optional}>{t("mob.exp.receiptHint")}</Text>
                </Text>
                <View style={{ flexDirection: "row", gap: 9, marginTop: 9 }}>
                  {photo ? (
                    <View style={s.thumb}>
                      <Image source={{ uri: photo.uri }} style={s.thumbImg} />
                      <Pressable style={s.remove} hitSlop={8} onPress={() => setPhoto(null)}>
                        <Icon name="close" size={11} stroke="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <Pressable style={s.add} onPress={async () => { const g = await takePhoto(); if (g[0]) setPhoto(g[0]); }}>
                        <Icon name="doc" size={20} />
                        <Text style={s.addText}>{t("mob.step.takePhoto")}</Text>
                      </Pressable>
                      <Pressable style={s.add} onPress={async () => { const g = await pickPhotos(1); if (g[0]) setPhoto(g[0]); }}>
                        <Icon name="package" size={20} />
                        <Text style={s.addText}>{t("mob.chat.gallery")}</Text>
                      </Pressable>
                    </>
                  )}
                </View>

                {err ? <View style={{ marginTop: space.lg }}><Notice tone="danger">{err}</Notice></View> : null}
              </View>
            )}
          />

          <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
            <Button title={t("mob.common.save")} onPress={submit} loading={busy} disabled={!ready} />
            <Pressable onPress={() => { reset(); onClose(); }} style={s.cancel}>
              <Text style={s.cancelText}>{t("mob.common.cancel")}</Text>
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

  totals: {
    backgroundColor: color.card, paddingHorizontal: space.lg, paddingVertical: space.lg,
    borderBottomWidth: 1, borderBottomColor: color.border, flexDirection: "row", gap: space.xl, flexWrap: "wrap",
  },
  total: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  totalValue: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  totalCur: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },

  list: { padding: space.lg, gap: space.sm },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: color.card,
    borderRadius: radius.card, borderWidth: 1, borderColor: color.border, padding: space.md, ...shadow.card,
  },
  rowIcon: { width: 40, height: 40, borderRadius: radius.control, backgroundColor: "#f45a181a", alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  receipt: { width: 28, height: 28, borderRadius: 6, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  amount: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  cur: { fontSize: 11, color: color.mutedForeground },

  fab: {
    position: "absolute", right: space.lg, height: 52, paddingHorizontal: 20,
    borderRadius: 26, backgroundColor: color.brand, flexDirection: "row",
    alignItems: "center", gap: 8,
    shadowColor: color.brand, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  fabText: { fontSize: font.body, fontWeight: "600", color: "#fff" },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: "92%" },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginTop: 10 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: color.foreground },

  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 6 },
  optional: { fontWeight: "400", color: color.mutedForeground },

  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: {
    flexDirection: "row", alignItems: "center", gap: 7, height: 40, paddingHorizontal: 12,
    borderRadius: radius.control, borderWidth: 1, borderColor: color.border,
  },
  catOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180f" },
  catText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  catTextOn: { fontWeight: "700", color: "#c2490f" },

  curRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  curChip: { paddingHorizontal: 9, height: 24, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  curChipOn: { backgroundColor: color.brand },
  curText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  curTextOn: { color: "#fff" },

  thumb: { width: 78, height: 78, borderRadius: radius.control, overflow: "hidden", backgroundColor: color.muted },
  thumbImg: { width: "100%", height: "100%" },
  remove: {
    position: "absolute", right: 4, top: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(15,23,42,0.6)", alignItems: "center", justifyContent: "center",
  },
  add: {
    width: 78, height: 78, borderRadius: radius.control, borderWidth: 1.5, borderColor: "#cbd5e1",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4,
  },
  addText: { fontSize: 10, fontWeight: "500", color: color.mutedForeground, textAlign: "center" },

  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },
  cancel: { height: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
