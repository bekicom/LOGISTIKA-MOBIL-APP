/**
 * Guruhlar — ochish va a'zolarni boshqarish (TZ v2 §5.1; TZ 28-okt Q63–Q68).
 *
 * Webdagi nusxasi: `furam/src/components/chat/guruh-ui.tsx`; server —
 * `furam/src/lib/guruh.ts`. A'zo ism, FURAM ID yoki to'liq telefon bilan
 * qo'shiladi (Q67); javobda raqamning o'zi yo'q — faqat ism va ID.
 * Guruh ochiq yoki yopiq, rasmi va taklif havolasi bor.
 */
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Share, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { api, apiUpload, API_BASE, FuramError } from "@/lib/api";
import { pickPhotos, toUpload } from "@/lib/photo";
import { tokenNow } from "@/lib/session";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Tanish = { id: string; name: string; furamId: number };
type Azo = Tanish & { isAdmin: boolean; men: boolean };
type Azolar = {
  azolar: Azo[];
  menAdmin: boolean;
  boshqariladi: boolean;
  title: string | null;
  isPublic?: boolean;
  inviteCode?: string | null;
  avatarUrl?: string | null;
  muted?: boolean;
  asosiy?: boolean;
  arxiv?: boolean;
};

/** Taklif havolasi — web sahifasi (`furam.uz/g/<kod>`), ilovada `furam://guruh/<kod>` */
export const havolaUrl = (code: string) => `https://furam.uz/g/${code}`;

/** Guruh rasmi — faqat a'zoga beriladi, shuning uchun sarlavha bilan */
export function guruhRasmi(chatId: string, v = 0) {
  const token = tokenNow();
  return {
    uri: `${API_BASE}/api/chat/${chatId}/rasm${v ? `?v=${v}` : ""}`,
    headers: token ? { Authorization: `Bearer ${token}`, "X-Client": "mobile" } : undefined,
  };
}

/** Odam qidirish (Q67): ism (≥3 harf), FURAM ID yoki to'liq telefon */
function OdamQidir({ onTanla, tanlangan }: { onTanla: (o: Tanish) => void; tanlangan: Set<string> }) {
  const [q, setQ] = useState("");
  const [natija, setNatija] = useState<Tanish[] | null>(null);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 3 && !/^\d{1,9}$/.test(s)) {
      const id = setTimeout(() => setNatija(null), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      void api<{ odamlar?: Tanish[] }>(`/api/chat/guruh/qidir?q=${encodeURIComponent(s)}`)
        .then((d) => setNatija(d.odamlar ?? []))
        .catch(() => setNatija([]));
    }, 350);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("guruh.searchPh")}
        placeholderTextColor={color.faintText}
        autoCorrect={false}
        style={s.input}
      />
      {natija?.length === 0 ? <Text style={s.hint}>{t("guruh.notFound")}</Text> : null}
      {(natija ?? []).map((o) => {
        const bor = tanlangan.has(o.id);
        return (
          <Pressable key={o.id} onPress={() => !bor && onTanla(o)} style={s.row} accessibilityRole="button" disabled={bor}>
            <Text style={s.name} numberOfLines={1}>{o.name}</Text>
            <Text style={s.hint}>ID {o.furamId}</Text>
            <Text style={s.link}>{bor ? "✓" : "+"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** «Yangi guruh» varag'i (Q67: nom, ochiq/yopiq, a'zolar) */
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
  const [ommaviy, setOmmaviy] = useState(false);
  const [tanishlar, setTanishlar] = useState<Tanish[] | null>(null);
  const [tanlangan, setTanlangan] = useState<Map<string, Tanish>>(new Map());
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tanishlar) return;
    void api<{ tanishlar?: Tanish[] }>("/api/chat/guruh")
      .then((d) => setTanishlar(d.tanishlar ?? []))
      .catch(() => setTanishlar([]));
  }, [open, tanishlar]);

  const almashtir = (u: Tanish) =>
    setTanlangan((x) => {
      const n = new Map(x);
      if (n.has(u.id)) n.delete(u.id);
      else n.set(u.id, u);
      return n;
    });

  async function yarat() {
    setBand(true);
    setXato(null);
    try {
      const r = await api<{ chatId: string }>("/api/chat/guruh", {
        method: "POST",
        body: { title: nom.trim(), memberIds: [...tanlangan.keys()], isPublic: ommaviy },
      });
      onDone(r.chatId, nom.trim());
      setNom("");
      setOmmaviy(false);
      setTanlangan(new Map());
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

      <Text style={s.label}>{t("guruh.typeTitle")}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {([false, true] as const).map((v) => (
          <Pressable
            key={String(v)}
            onPress={() => setOmmaviy(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ommaviy === v }}
            style={[s.tur, ommaviy === v && s.turOn]}
          >
            <Text style={[s.turTitle, ommaviy === v && { color: color.brand }]}>{v ? t("guruh.public") : t("guruh.private")}</Text>
            <Text style={s.hint}>{v ? t("guruh.publicHint") : t("guruh.privateHint")}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>{t("guruh.addPeople")}</Text>
      <OdamQidir onTanla={almashtir} tanlangan={new Set(tanlangan.keys())} />

      <Text style={s.label}>{t("guruh.fromContacts")}</Text>
      {tanishlar === null ? <ActivityIndicator color={color.brand} /> : null}
      {tanishlar?.length === 0 ? <Text style={s.hint}>{t("guruh.noContacts")}</Text> : null}
      <FlatList
        data={tanishlar ?? []}
        keyExtractor={(u) => u.id}
        style={{ maxHeight: 200 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const on = tanlangan.has(item.id);
          return (
            <Pressable onPress={() => almashtir(item)} style={s.row} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <View style={[s.box, on && s.boxOn]}>{on ? <Icon name="check" size={14} stroke="#ffffff" /> : null}</View>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.hint}>ID {item.furamId}</Text>
            </Pressable>
          );
        }}
      />
      {tanlangan.size > 0 ? (
        <Text style={s.hint} numberOfLines={2}>
          {t("guruh.selected", { n: tanlangan.size })}: {[...tanlangan.values()].map((u) => u.name).join(", ")}
        </Text>
      ) : null}
      {xato ? <Text style={s.err}>{xato}</Text> : null}
      <View style={{ marginTop: space.md }}>
        <Button title={t("guruh.create")} onPress={() => void yarat()} loading={band} disabled={!nom.trim()} />
      </View>
    </Sheet>
  );
}

/**
 * Guruh a'zolari varag'i. Odam ochgan guruhda admin: rasm, ochiq/yopiq,
 * taklif havolasi, qo'shish/chiqarish, nom. Asosiy guruhda (Q63):
 * «Guruhni tark etish», moderator a'zoni chiqaradi. Har guruhda —
 * bildirishnoma qo'ng'iroqchasi (Q68).
 */
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
  const [nom, setNom] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [rasmV, setRasmV] = useState(0);

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

  async function amal(body: object): Promise<{ code?: string } | null> {
    setXato(null);
    try {
      return await api<{ code?: string }>(`/api/chat/${chatId}/members`, { method: "PATCH", body });
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
      return null;
    }
  }

  async function qongiroq() {
    if (!d) return;
    try {
      await api(`/api/chats/${chatId}/flags`, { method: "PATCH", body: { isMuted: !d.muted } });
      await yukla();
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  async function rasmTanla() {
    const [p] = await pickPhotos(1);
    if (!p) return;
    try {
      await apiUpload(`/api/chat/${chatId}/rasm`, {}, [toUpload(p, "file")]);
      setRasmV(Date.now());
      await yukla();
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  async function havolaUlash(yangila = false) {
    const r = await amal({ action: "invite", yangila });
    if (!r?.code) return;
    await yukla();
    await Share.share({ message: t("guruh.shareText", { title: d?.title ?? "FURAM", url: havolaUrl(r.code) }) }).catch(() => null);
  }

  const boshqar = !!d?.boshqariladi && !!d.menAdmin;
  const chiqaradi = boshqar || (!!d?.asosiy && !!d.menAdmin);

  return (
    <Sheet open={open} onClose={onClose} title={d ? t("guruh.membersN", { n: d.azolar.length }) : t("guruh.members")}>
      {!d ? <ActivityIndicator color={color.brand} /> : null}
      {d?.arxiv ? <Text style={s.hint}>🗄 {t("guruh.archivedHint")}</Text> : null}

      {d && !d.arxiv ? (
        <Pressable onPress={() => void qongiroq()} style={s.row} accessibilityRole="switch" accessibilityState={{ checked: !d.muted }}>
          <Text style={s.name}>{d.muted ? `🔕 ${t("guruh.notifyOn")}` : `🔔 ${t("guruh.notifyOff")}`}</Text>
        </Pressable>
      ) : null}

      {boshqar ? (
        <View style={{ gap: 8, marginVertical: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {d?.avatarUrl ? (
              <Image source={guruhRasmi(chatId, rasmV)} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarBo]}>
                <Text style={s.avatarHarf}>{(d?.title ?? "?").slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <Pressable onPress={() => void rasmTanla()} hitSlop={6} accessibilityRole="button">
              <Text style={s.link}>{t("guruh.photo")}</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={async () => (await amal({ action: "public", on: !d?.isPublic })) && yukla()} hitSlop={6} accessibilityRole="button">
              <Text style={s.link}>{d?.isPublic ? t("guruh.makePrivate") : t("guruh.makePublic")}</Text>
            </Pressable>
          </View>
          <Text style={s.hint}>{d?.isPublic ? t("guruh.publicHint") : t("guruh.privateHint")}</Text>

          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Pressable onPress={() => void havolaUlash(false)} style={s.addBtn} accessibilityRole="button">
              <Text style={s.addText}>🔗 {t("guruh.shareLink")}</Text>
            </Pressable>
            {d?.inviteCode ? (
              <Pressable onPress={() => void havolaUlash(true)} hitSlop={6}>
                <Text style={[s.hint, { textDecorationLine: "underline" }]}>{t("guruh.linkReset")}</Text>
              </Pressable>
            ) : null}
          </View>

          <OdamQidir
            tanlangan={new Set(d?.azolar.map((a) => a.id) ?? [])}
            onTanla={async (o) => {
              if (await amal({ action: "add", userId: o.id })) await yukla();
            }}
          />

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
        style={{ maxHeight: 300 }}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>
                {item.name}
                {item.men ? <Text style={s.hint}> ({t("guruh.you")})</Text> : null}
              </Text>
              {item.isAdmin ? <Text style={s.adminTag}>{d?.asosiy ? t("guruh.moderator") : t("guruh.admin")}</Text> : null}
            </View>
            {!item.men && (boshqar || chiqaradi) ? (
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {boshqar ? (
                  <Pressable onPress={async () => (await amal({ action: "admin", userId: item.id, on: !item.isAdmin })) && yukla()} hitSlop={6}>
                    <Text style={s.link}>{item.isAdmin ? t("guruh.removeAdmin") : t("guruh.makeAdmin")}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={async () => (await amal({ action: "remove", userId: item.id })) && yukla()} hitSlop={6}>
                  <Text style={[s.link, { color: color.danger }]}>{t("guruh.remove")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
      {(d?.boshqariladi || d?.asosiy) && !d?.arxiv ? (
        <Pressable
          onPress={() =>
            Alert.alert(d?.asosiy ? t("guruh.leaveMain") : t("guruh.leave"), d?.asosiy ? t("guruh.leaveMainAsk") : t("guruh.leaveAsk"), [
              { text: t("mob.common.cancel"), style: "cancel" },
              {
                text: d?.asosiy ? t("guruh.leaveMain") : t("guruh.leave"),
                style: "destructive",
                onPress: async () => (await amal({ action: "leave" })) && onLeft(),
              },
            ])
          }
          style={{ marginTop: space.md }}
          accessibilityRole="button"
        >
          <Text style={[s.link, { color: color.danger }]}>{d?.asosiy ? t("guruh.leaveMain") : t("guruh.leave")}</Text>
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
  tur: { flex: 1, borderWidth: 1, borderColor: color.border, borderRadius: radius.control, padding: 10, gap: 2 },
  turOn: { borderColor: color.brand, borderWidth: 2 },
  turTitle: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground },
  name: { flex: 1, fontSize: 15, color: color.foreground },
  adminTag: { fontSize: 11, color: color.brand, fontFamily: "Manrope_700Bold", marginTop: 2 },
  link: { fontSize: 13, color: color.brand, fontFamily: "Manrope_700Bold" },
  addBtn: { backgroundColor: color.brand, borderRadius: radius.control, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" as const },
  addText: { color: "#ffffff", fontFamily: "Manrope_700Bold", fontSize: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarBo: { backgroundColor: color.muted, alignItems: "center" as const, justifyContent: "center" as const },
  avatarHarf: { fontSize: 16, fontFamily: "Manrope_700Bold", color: color.foreground },
  err: { marginTop: 8, fontSize: 13, color: color.danger },
}));
