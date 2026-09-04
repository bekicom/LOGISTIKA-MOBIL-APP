/**
 * X1 — Xodimlarim (TZ 13, 2026-09-05).
 *
 * ── NEGA ALOHIDA EKRAN ──────────────────────────────────────────
 *
 * Ilgari `DriverLink` orqali faqat HAYDOVCHI boshqarilardi va u
 * «Parkim → Haydovchilar» da mashinalar bilan birga turardi.
 * Dispecher, ekspeditor va ustaning mashinasi yo'q — ular o'sha
 * ro'yxatga sig'masdi. Bu yerda yo'nalishidan qat'i nazar hammasi
 * bitta ro'yxatda.
 *
 * ── IKKI TOMON, BITTA EKRAN ─────────────────────────────────────
 *
 * Yuqorida «xodimlarim» (men ish beruvchiman), pastda «ish
 * joylarim» (men xodimman). Bitta odam ikkalasi ham bo'lishi
 * mumkin: o'zi haydovchi, ayni paytda mexanik yollagan ega.
 *
 * ── TAKLIF HAVOLA BILAN, TO'G'RIDAN-TO'G'RI EMAS ────────────────
 *
 * FURAM ID bo'yicha «bu mening xodimim» deb yozib bo'lmaydi:
 * bog'lanish ikki tomonning roziligi bilan tuziladi. Ega havola
 * chiqaradi, xodim uni ochib qabul qiladi.
 *
 * Havola bildirishnomaga SOLINMAYDI — taklifning maxfiy kaliti
 * bazada faqat xesh bo'lib yotadi va uni ochiq matnda saqlash
 * o'sha kafolatni yo'q qilardi. Shuning uchun ega havolani o'z
 * Telegrami yoki SMS'i orqali yuboradi.
 */
import { useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tariffBlocked } from "@/lib/features";
import { color, font, radius, space } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

type Staff = {
  id: string;
  status: string;
  direction: string;
  profession: string | null;
  title: string | null;
  name: string;
  phone: string;
  furamId: number;
  plate: string | null;
  seat: string | null;
  onTrip: boolean;
  respondedAt: string | null;
  createdAt: string;
};

type Invite = {
  id: string;
  direction: string;
  profession: string | null;
  title: string | null;
  expiresAt: string;
};

type Job = {
  id: string;
  status: string;
  direction: string;
  profession: string | null;
  title: string | null;
  ownerName: string;
  ownerFuramId: number;
  plate: string | null;
  onTrip: boolean;
  createdAt: string;
};

type Cat = { key: string; professions: string[] };
type Data = { staff: Staff[]; invites: Invite[]; jobs: Job[]; catalog: Cat[] };

/**
 * Lavozim nomi — uchta manbadan biri.
 *
 * Odam yozgan nom ustun; bo'lmasa kasb, u ham bo'lmasa yo'nalish.
 * Uchalasi ham KALIT bo'lib keladi va shu yerda tarjima qilinadi —
 * server tayyor satr yubormaydi (audit 05).
 */
function roleName(x: { title: string | null; profession: string | null; direction: string }) {
  if (x.title) return x.title;
  if (x.profession) return tOr(`jobCatalog.professions.${x.profession}`, x.profession);
  return tOr(`jobCatalog.directions.${x.direction}`, x.direction);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export default function Xodimlarim() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");

  const { data, loading, error, refreshing, refresh, reload } = useApi<Data>("/api/staff");

  const staff = data?.staff ?? [];
  const invites = data?.invites ?? [];
  const jobs = data?.jobs ?? [];

  async function act(id: string, path: string, init: Parameters<typeof api>[1]) {
    setBusy(id);
    setFailed("");
    try {
      await api(path, init);
      reload();
    } catch (e) {
      setFailed((e as FuramError).message);
    } finally {
      setBusy(null);
    }
  }

  /** Bog'lanishni uzish — ega ham, xodim ham shu marshrutdan */
  function end(id: string, ask: string) {
    Alert.alert(ask, "", [
      { text: t("pgStaff.cancel"), style: "cancel" },
      {
        text: t("pgStaff.endConfirm"),
        style: "destructive",
        onPress: () => void act(id, `/api/staff/${id}`, { method: "PATCH", body: { action: "end" } }),
      },
    ]);
  }

  return (
    <View style={s.root}>
      <Header
        title={t("pgStaff.title")}
        subtitle={t("pgStaff.subtitle")}
        right={
          <Pressable
            hitSlop={8}
            onPress={() => {
              if (tariffBlocked("drivers")) return;
              setAdding(true);
            }}
          >
            <Text style={s.add}>{t("mob.common.add")}</Text>
          </Pressable>
        }
      />

      <FlatList
        data={loading && !data ? [] : staff}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => (
          <View style={s.card}>
            <View style={s.cardHead}>
              <View style={[s.tag, x.status === "PENDING" && s.tagWait]}>
                <Text style={[s.tagText, x.status === "PENDING" && s.tagWaitText]}>
                  {t(`pgStaff.st_${x.status}`)}
                </Text>
              </View>
              {x.onTrip && (
                <View style={[s.tag, s.tagTrip]}>
                  <Text style={[s.tagText, { color: color.brand }]}>{t("pgStaff.onTrip")}</Text>
                </View>
              )}
              <Text style={s.since}>{shortDate(x.respondedAt ?? x.createdAt)}</Text>
            </View>

            <Text style={s.name} numberOfLines={1}>
              {x.name}
            </Text>
            <Text style={s.role} numberOfLines={1}>
              {[roleName(x), x.plate, x.seat].filter(Boolean).join(" · ")}
            </Text>

            <View style={s.row2}>
              <Pressable
                style={[s.btn, s.btnGhost]}
                onPress={() => void Linking.openURL(`tel:${x.phone}`)}
              >
                <Icon name="user" size={15} stroke={color.foreground} />
                <Text style={s.btnGhostText}>{x.phone}</Text>
              </Pressable>
              {x.status === "ACTIVE" && (
                <Pressable
                  style={[s.btn, s.btnGhost]}
                  disabled={busy === x.id}
                  onPress={() => end(x.id, t("pgStaff.endBtn"))}
                >
                  <Text style={[s.btnGhostText, { color: color.danger }]}>
                    {t("pgStaff.endBtn")}
                  </Text>
                </Pressable>
              )}
            </View>
            {/* Javob kutilayotgan bog'lanishga tegilmaydi: qabul
                yoki rad javobini XODIM beradi, ega emas */}
            {x.status === "PENDING" && <Text style={s.wait}>{t("pgStaff.answerThere")}</Text>}
          </View>
        )}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.head2}>
            <TariffNotice feature="drivers" />

            {failed ? (
              <View style={s.failed}>
                <Text style={s.failedText}>{failed}</Text>
              </View>
            ) : null}

            {/* ══ JAVOB KUTAYOTGAN TAKLIFLAR ══ */}
            {invites.length > 0 && (
              <View style={{ gap: space.sm }}>
                <Text style={s.group}>{t("pgStaff.inviteSent")}</Text>
                {invites.map((i) => (
                  <View key={i.id} style={s.inviteRow}>
                    <View style={{ flexGrow: 1, minWidth: 0 }}>
                      <Text style={s.inviteName} numberOfLines={1}>
                        {roleName(i)}
                      </Text>
                      <Text style={s.inviteMeta}>
                        {t("pgStaff.until", { d: shortDate(i.expiresAt) })}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      disabled={busy === i.id}
                      onPress={() =>
                        void act(i.id, `/api/staff/invites/${i.id}`, { method: "DELETE" })
                      }
                    >
                      <Text style={s.revoke}>{t("pgStaff.revoke")}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {staff.length > 0 && (
              <Text style={s.group}>{t("pgStaff.listTitle", { n: staff.length })}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          loading && !data ? (
            <Skeleton rows={3} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty icon="user" title={t("pgStaff.empty")} text={t("pgStaff.addNote")} />
          )
        }
        ListFooterComponent={
          error ? null : (
            <View style={s.foot2}>
              {/* ══ ISH JOYLARIM — men xodim bo'lgan tomonim ══ */}
              {jobs.length > 0 && (
                <View style={{ gap: space.sm }}>
                  <Text style={s.group}>{t("pgStaff.myJobs")}</Text>
                  <Text style={s.groupNote}>{t("pgStaff.myJobsNote")}</Text>
                  {jobs.map((j) => (
                    <View key={j.id} style={s.card}>
                      <View style={s.cardHead}>
                        <View style={[s.tag, j.status === "PENDING" && s.tagWait]}>
                          <Text style={[s.tagText, j.status === "PENDING" && s.tagWaitText]}>
                            {t(`pgStaff.st_${j.status}`)}
                          </Text>
                        </View>
                        {j.onTrip && (
                          <View style={[s.tag, s.tagTrip]}>
                            <Text style={[s.tagText, { color: color.brand }]}>
                              {t("pgStaff.onTrip")}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.name} numberOfLines={1}>
                        {j.ownerName}
                      </Text>
                      <Text style={s.role} numberOfLines={1}>
                        {[roleName(j), `FURAM-${j.ownerFuramId}`, j.plate]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      <Pressable
                        style={[s.btn, s.btnGhost, { alignSelf: "flex-start", marginTop: 10 }]}
                        disabled={busy === j.id}
                        onPress={() =>
                          end(j.id, j.onTrip ? t("pgStaff.quitOnTrip") : t("pgStaff.quitConfirm"))
                        }
                      >
                        <Text style={[s.btnGhostText, { color: color.danger }]}>
                          {t("pgStaff.quitBtn")}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={s.note}>
                <Text style={s.noteTitle}>{t("pgStaff.aboutTitle")}</Text>
                <Text style={s.noteText}>{t("pgStaff.aboutBody")}</Text>
              </View>

              {/* Haydovchi boshqa oqimda: unda mashina va o'rin
                  tanlash bor va u parkda turadi */}
              <Pressable style={s.fleetRow} onPress={() => router.push("/parkim")}>
                <View style={s.fleetIcon}>
                  <Icon name="truck" size={19} stroke={color.mutedForeground} />
                </View>
                <Text style={s.fleetText}>{t("pgStaff.driverHint")}</Text>
                <Icon name="chevron" size={18} stroke="#cbd5e1" />
              </Pressable>
            </View>
          )
        }
      />

      <AddSheet
        open={adding}
        catalog={data?.catalog ?? []}
        onClose={() => setAdding(false)}
        onDone={reload}
      />
    </View>
  );
}

/* ─────────────────────────────────────────── Xodim chaqirish */

function AddSheet({
  open,
  catalog,
  onClose,
  onDone,
}: {
  open: boolean;
  catalog: Cat[];
  onClose: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [dir, setDir] = useState<string | null>(null);
  const [prof, setProf] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pickedDir = dir ?? catalog[0]?.key ?? null;
  const profs = catalog.find((c) => c.key === pickedDir)?.professions ?? [];

  async function create() {
    if (!pickedDir || busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ url: string }>("/api/staff/invites", {
        method: "POST",
        body: {
          direction: pickedDir,
          profession: prof ?? undefined,
          title: title.trim() || undefined,
        },
      });
      /* Havola DARHOL ulashishga beriladi: ekranda ko'rsatib
         «nusxa oling» desak, odam uni qo'lda tanlab nusxalashi
         kerak bo'lardi. Tizim oynasi Telegram, WhatsApp va SMS
         ni o'zi taklif qiladi. */
      await Share.share({ message: r.url });
      onDone();
      close();
    } catch (e) {
      setErr((e as FuramError).message);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setDir(null);
    setProf(null);
    setTitle("");
    setErr("");
    onClose();
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <View style={s.sheetBack}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("pgStaff.addTitle")}</Text>
          <Text style={s.sheetSub}>{t("pgStaff.addNote")}</Text>

          <Text style={s.label}>{t("pgStaff.direction")}</Text>
          <View style={s.chips}>
            {catalog.map((c) => (
              <Pressable
                key={c.key}
                style={[s.chip, pickedDir === c.key && s.chipOn]}
                onPress={() => {
                  setDir(c.key);
                  setProf(null);
                }}
              >
                <Text style={[s.chipText, pickedDir === c.key && s.chipTextOn]}>
                  {tOr(`jobCatalog.directions.${c.key}`, c.key)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>{t("pgStaff.profession")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            <Pressable style={[s.chip, !prof && s.chipOn]} onPress={() => setProf(null)}>
              <Text style={[s.chipText, !prof && s.chipTextOn]}>{t("pgStaff.anyProfession")}</Text>
            </Pressable>
            {profs.map((k) => (
              <Pressable
                key={k}
                style={[s.chip, prof === k && s.chipOn]}
                onPress={() => setProf(prof === k ? null : k)}
              >
                <Text style={[s.chipText, prof === k && s.chipTextOn]}>
                  {tOr(`jobCatalog.professions.${k}`, k)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={s.label}>{t("pgStaff.titleField")}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("pgStaff.titlePh")}
            placeholderTextColor="#94a3b8"
            maxLength={80}
            style={s.input}
          />

          <Text style={s.rules}>{t("pgStaff.linkRules")}</Text>
          {err ? <Text style={s.err}>{err}</Text> : null}

          <Pressable style={[s.mainBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={create}>
            <Text style={s.mainBtnText}>
              {busy ? t("pgStaff.creating") : t("pgStaff.createLink")}
            </Text>
          </Pressable>
          <Pressable style={s.cancel} onPress={close}>
            <Text style={s.cancelText}>{t("pgStaff.close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },
  head2: { gap: space.md, marginBottom: space.md },
  foot2: { gap: space.lg, marginTop: space.lg },
  add: { fontSize: font.bodyLg, fontWeight: "600", color: color.brand },

  group: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, letterSpacing: 0.3 },
  groupNote: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: -4 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: color.success + "1a",
  },
  tagWait: { backgroundColor: color.warning + "1a" },
  tagTrip: { backgroundColor: color.brand + "1a" },
  tagText: { fontSize: 11, fontWeight: "700", color: color.success },
  tagWaitText: { color: color.warning },
  since: { marginLeft: "auto", fontSize: 11, color: color.mutedForeground },
  name: { fontSize: 15, fontWeight: "700", color: color.foreground },
  role: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },
  wait: { fontSize: 12, color: color.warning, marginTop: 8 },

  row2: { flexDirection: "row", gap: 8, marginTop: 11 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: radius.control,
  },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 13, fontWeight: "600", color: color.foreground },

  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.warning + "0d",
    borderWidth: 1,
    borderColor: color.warning + "40",
    borderRadius: radius.card,
    padding: 12,
  },
  inviteName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  inviteMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  revoke: { fontSize: 13, fontWeight: "600", color: color.danger },

  failed: {
    backgroundColor: color.danger + "0d",
    borderWidth: 1,
    borderColor: color.danger + "40",
    borderRadius: radius.card,
    padding: 12,
  },
  failedText: { fontSize: 13, color: color.danger },

  note: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: radius.card,
    padding: space.md,
  },
  noteTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  noteText: { fontSize: 12, color: "#475569", lineHeight: 19, marginTop: 5 },

  fleetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  fleetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  fleetText: { flexGrow: 1, fontSize: 13.5, fontWeight: "500", color: color.foreground },

  /* ── Chaqirish oynasi ── */
  sheetBack: { flex: 1, backgroundColor: "#0f172a80", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.lg,
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  sheetSub: { fontSize: 13, color: color.mutedForeground, marginTop: 4, lineHeight: 19 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    marginTop: 16,
    marginBottom: 7,
  },
  chips: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  chipOn: { backgroundColor: color.brand + "1a", borderColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  chipTextOn: { color: color.brand, fontWeight: "600" },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    fontSize: 15,
    color: color.foreground,
    backgroundColor: color.card,
  },
  rules: { fontSize: 11.5, color: color.mutedForeground, lineHeight: 17, marginTop: 12 },
  err: { fontSize: 13, color: color.danger, marginTop: 8 },
  mainBtn: {
    height: 50,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  mainBtnText: { fontSize: font.bodyLg, fontWeight: "700", color: "#fff" },
  cancel: { alignSelf: "center", paddingVertical: 11 },
  cancelText: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },
});
