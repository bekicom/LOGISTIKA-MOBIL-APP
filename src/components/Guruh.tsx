/**
 * Foydalanuvchi guruhlari — ochish va a'zolarni boshqarish (TZ v2 §5.1, 2026-10-27).
 *
 * Webdagi nusxasi: `furam/src/components/chat/guruh-ui.tsx`; server —
 * `furam/src/lib/guruh.ts`. A'zo FURAM ID bilan yoki shaxsiy suhbatdagi
 * tanishlardan qo'shiladi (telefon bilan EMAS — begona raqam oshkor bo'lmasin).
 */
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Tanish = { id: string; name: string; furamId: number };
type Azo = Tanish & { isAdmin: boolean; men: boolean };
type Azolar = { azolar: Azo[]; menAdmin: boolean; boshqariladi: boolean; title: string | null };

const idlarniOl = (s: string) =>
  s
    .split(/[\s,;]+/)
    .map((x) => Number(x.replace(/\D/g, "")))
    .filter((n) => Number.isInteger(n) && n > 0);

/** «Yangi guruh» varag'i */
export function YangiGuruhSheet({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (chatId: string, title: string) => void;
}) {
  const [nom, setNom] = useState("");
  const [idlar, setIdlar] = useState("");
  const [tanishlar, setTanishlar] = useState<Tanish[] | null>(null);
  const [tanlangan, setTanlangan] = useState<Set<string>>(new Set());
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tanishlar) return;
    void api<{ tanishlar?: Tanish[] }>("/api/chat/guruh")
      .then((d) => setTanishlar(d.tanishlar ?? []))
      .catch(() => setTanishlar([]));
  }, [open, tanishlar]);

  async function yarat() {
    setBand(true);
    setXato(null);
    try {
      const r = await api<{ chatId: string }>("/api/chat/guruh", {
        method: "POST",
        body: { title: nom.trim(), memberIds: [...tanlangan], furamIds: idlarniOl(idlar) },
      });
      onDone(r.chatId, nom.trim());
      setNom("");
      setIdlar("");
      setTanlangan(new Set());
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBand(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("guruh.newGroup")}>
      <Text style={s.label}>{t("guruh.name")}</Text>
      <TextInput value={nom} onChangeText={setNom} maxLength={80} placeholder={t("guruh.namePh")} placeholderTextColor={color.faintText} style={s.input} />
      <Text style={s.label}>{t("guruh.fromContacts")}</Text>
      {tanishlar === null ? <ActivityIndicator color={color.brand} /> : null}
      {tanishlar?.length === 0 ? <Text style={s.hint}>{t("guruh.noContacts")}</Text> : null}
      <FlatList
        data={tanishlar ?? []}
        keyExtractor={(u) => u.id}
        style={{ maxHeight: 220 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const on = tanlangan.has(item.id);
          return (
            <Pressable
              onPress={() =>
                setTanlangan((x) => {
                  const n = new Set(x);
                  if (n.has(item.id)) n.delete(item.id);
                  else n.add(item.id);
                  return n;
                })
              }
              style={s.row}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <View style={[s.box, on && s.boxOn]}>{on ? <Icon name="check" size={14} stroke="#ffffff" /> : null}</View>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.hint}>ID {item.furamId}</Text>
            </Pressable>
          );
        }}
      />
      {tanlangan.size > 0 ? <Text style={s.hint}>{t("guruh.selected", { n: tanlangan.size })}</Text> : null}
      <Text style={s.label}>{t("guruh.addById")}</Text>
      <TextInput value={idlar} onChangeText={setIdlar} placeholder={t("guruh.idPh")} placeholderTextColor={color.faintText} keyboardType="number-pad" style={s.input} />
      {xato ? <Text style={s.err}>{xato}</Text> : null}
      <View style={{ marginTop: space.md }}>
        <Button title={t("guruh.create")} onPress={() => void yarat()} loading={band} disabled={!nom.trim()} />
      </View>
    </Sheet>
  );
}

/** Guruh a'zolari varag'i — admin qo'shadi/chiqaradi, nomini o'zgartiradi; har kim chiqib keta oladi */
export function AzolarSheet({
  chatId,
  open,
  onClose,
  onLeft,
  onRenamed,
}: {
  chatId: string;
  open: boolean;
  onClose: () => void;
  onLeft: () => void;
  onRenamed: (title: string) => void;
}) {
  const [d, setD] = useState<Azolar | null>(null);
  const [id, setId] = useState("");
  const [nom, setNom] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  const yukla = useCallback(async () => {
    try {
      setD(await api<Azolar>(`/api/chat/${chatId}/members`));
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.err.network"));
    }
  }, [chatId]);

  useEffect(() => {
    if (open) void yukla();
  }, [open, yukla]);

  async function amal(body: object) {
    setXato(null);
    try {
      await api(`/api/chat/${chatId}/members`, { method: "PATCH", body });
      return true;
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
      return false;
    }
  }

  const boshqar = !!d?.boshqariladi && !!d.menAdmin;

  return (
    <Sheet open={open} onClose={onClose} title={d ? t("guruh.membersN", { n: d.azolar.length }) : t("guruh.members")}>
      {!d ? <ActivityIndicator color={color.brand} /> : null}
      {boshqar ? (
        <View style={{ gap: 8, marginBottom: space.sm }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={id} onChangeText={setId} placeholder={t("guruh.idPh")} placeholderTextColor={color.faintText} keyboardType="number-pad" style={[s.input, { flex: 1, marginBottom: 0 }]} />
            <Pressable
              onPress={async () => {
                const n = idlarniOl(id)[0];
                if (n && (await amal({ action: "add", furamId: n }))) {
                  setId("");
                  await yukla();
                }
              }}
              style={s.addBtn}
              accessibilityRole="button"
            >
              <Text style={s.addText}>{t("guruh.add")}</Text>
            </Pressable>
          </View>
          {nom === null ? (
            <Pressable onPress={() => setNom(d?.title ?? "")} hitSlop={6}>
              <Text style={s.link}>{t("guruh.rename")}</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={nom} onChangeText={setNom} maxLength={80} style={[s.input, { flex: 1, marginBottom: 0 }]} />
              <Pressable
                onPress={async () => {
                  if (nom.trim() && (await amal({ action: "rename", title: nom.trim() }))) {
                    onRenamed(nom.trim());
                    setNom(null);
                    await yukla();
                  }
                }}
                style={s.addBtn}
              >
                <Text style={s.addText}>{t("guruh.save")}</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      <FlatList
        data={d?.azolar ?? []}
        keyExtractor={(a) => a.id}
        style={{ maxHeight: 320 }}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>
                {item.name}
                {item.men ? <Text style={s.hint}> ({t("guruh.you")})</Text> : null}
              </Text>
              {item.isAdmin ? <Text style={s.adminTag}>{t("guruh.admin")}</Text> : null}
            </View>
            {boshqar && !item.men ? (
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Pressable onPress={async () => (await amal({ action: "admin", userId: item.id, on: !item.isAdmin })) && yukla()} hitSlop={6}>
                  <Text style={s.link}>{item.isAdmin ? t("guruh.removeAdmin") : t("guruh.makeAdmin")}</Text>
                </Pressable>
                <Pressable onPress={async () => (await amal({ action: "remove", userId: item.id })) && yukla()} hitSlop={6}>
                  <Text style={[s.link, { color: color.danger }]}>{t("guruh.remove")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
      {d?.boshqariladi ? (
        <Pressable
          onPress={() =>
            Alert.alert(t("guruh.leave"), t("guruh.leaveAsk"), [
              { text: t("mob.common.cancel"), style: "cancel" },
              { text: t("guruh.leave"), style: "destructive", onPress: async () => (await amal({ action: "leave" })) && onLeft() },
            ])
          }
          style={{ marginTop: space.md }}
          accessibilityRole="button"
        >
          <Text style={[s.link, { color: color.danger }]}>{t("guruh.leave")}</Text>
        </Pressable>
      ) : null}
      {xato ? <Text style={s.err}>{xato}</Text> : null}
    </Sheet>
  );
}

const s = themed(() => ({
  label: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground, marginTop: space.sm, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: color.foreground,
    marginBottom: 4,
  },
  hint: { fontSize: 12, color: color.mutedForeground },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  boxOn: { backgroundColor: color.brand, borderColor: color.brand },
  name: { flex: 1, fontSize: 15, color: color.foreground },
  adminTag: { fontSize: 11, color: color.brand, fontFamily: "Manrope_700Bold", marginTop: 2 },
  link: { fontSize: 13, color: color.brand, fontFamily: "Manrope_700Bold" },
  addBtn: { backgroundColor: color.brand, borderRadius: radius.control, paddingHorizontal: 14, justifyContent: "center" as const },
  addText: { color: "#ffffff", fontFamily: "Manrope_700Bold", fontSize: 14 },
  err: { marginTop: 8, fontSize: 13, color: color.danger },
}));
