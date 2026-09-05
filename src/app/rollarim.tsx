/**
 * Rl1 — rol bozori (2026-09-05, yangi dizayn).
 *
 * ── ROL — TANLOV EMAS, HOLAT ────────────────────────────────────
 *
 * Bir odamda bir necha rol bo'lishi mumkin va har birining o'z
 * tarifi bor. Shuning uchun bu «tarif tanlash» emas: o'n uchta
 * rolning HAMMASI bitta ro'yxatda turadi, har birida o'z holati.
 *
 * ── NEGA QIDIRUV VA GURUH ───────────────────────────────────────
 *
 * O'n uchta qator bitta ekranga sig'maydi. Guruhlar serverdan
 * keladi (`/api/roles` → `groups`) — ilovada ko'chirilsa, yangi
 * rol qo'shilganda u guruhsiz qolib ketardi.
 *
 * ── ⚠️ iOS'DA NARX KO'RSATILMAYDI ───────────────────────────────
 *
 * App Store Guideline 3.1.1: ilova ichida raqamli xizmat sotilsa,
 * to'lov Apple tizimidan o'tishi kerak. Narxni ko'rsatish yoki
 * «sotib olish» tugmasi qo'yish — rad etish sababi.
 *
 * iPhone'da narx o'rniga «Rolni saytda ochasiz» yozuvi turadi.
 * Android'da narx bor. Ayni shu farqni profil ekrani ham qiladi.
 *
 * ── TUGAGANDA NIMA BO'LADI ──────────────────────────────────────
 *
 * TZ 25-band: ma'lumot o'chirilmaydi, faqat yangi ish to'xtaydi.
 * Buni aytmasak odam «hammasi yo'qoladi» deb qo'rqadi va shu
 * qo'rquv bilan qaror qiladi.
 */
import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

/* `accessOf()` shakli — `furam/src/app/api/roles/route.ts`.
   `daysLeft` serverda hisoblanadi: telefon soati noto'g'ri
   bo'lsa muddat ham noto'g'ri chiqardi. */
type Live = {
  roleKey: string;
  status: string;
  daysLeft: number | null;
  tariff: string | null;
};

type Offer = {
  roleKey: string;
  name: string;
  price: number;
  days: number;
  trialDays: number;
};

type Group = { key: string; roles: string[] };

/** Qatorning o'ng chetidagi belgi */
type Chip = { text: string; tone: "ok" | "warn" | "free" | "muted" };

export default function Rollarim() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    live: Live[];
    offers?: Offer[];
    groups?: Group[];
  }>("/api/roles");

  const groups = useMemo(() => data?.groups ?? [], [data]);

  /**
   * Har rol uchun: holati, belgisi va tartibi.
   *
   * `?? []` ichkarida: tashqarida yozilsa har chizishda YANGI
   * massiv yasalardi va `useMemo` hech qachon kesh bermasdi
   * (`react-hooks/exhaustive-deps` shuni aytadi).
   */
  const rows = useMemo(() => {
    const live = data?.live ?? [];
    const offers = data?.offers ?? [];
    const byLive = new Map(live.map((l) => [l.roleKey, l]));
    const byOffer = new Map(offers.map((o) => [o.roleKey, o]));
    const keys = groups.flatMap((g) => g.roles);

    return keys.map((key) => {
      const l = byLive.get(key);
      const o = byOffer.get(key);
      const name = tOr(`mob.role.${key}`, key);
      const g = groups.find((x) => x.roles.includes(key))?.key ?? "other";

      let chip: Chip;
      if (l) {
        const trial = l.status === "TRIAL";
        const soon = l.daysLeft != null && l.daysLeft <= 5;
        chip = {
          text:
            l.daysLeft != null
              ? t("mob.roles.daysLeft", { n: Math.max(0, l.daysLeft) })
              : trial
                ? t("mob.roles.trial")
                : (l.tariff ?? ""),
          tone: soon ? "warn" : "ok",
        };
      } else if (!o || o.price === 0) {
        chip = { text: t("mob.roles.free"), tone: "free" };
      } else if (o.trialDays > 0) {
        chip = { text: t("mob.roles.trialN", { n: o.trialDays }), tone: "free" };
      } else if (Platform.OS === "ios") {
        /* iOS: narx YO'Q — Guideline 3.1.1 */
        chip = { text: t("mob.roles.iosPrice"), tone: "muted" };
      } else {
        chip = { text: t("mob.roles.perMonth", { p: fmtNum(o.price) }), tone: "muted" };
      }

      return { key, name, group: g, live: l ?? null, offer: o ?? null, chip };
    });
  }, [data, groups]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!group || r.group === group) &&
        (!needle || r.name.toLowerCase().includes(needle)),
    );
  }, [rows, q, group]);

  return (
    <View style={s.root}>
      <Header title={t("mob.roles.pickTitle")} subtitle={t("mob.roles.pickSub")} />

      <View style={s.searchWrap}>
        <View style={s.search}>
          <Icon name="search" size={18} stroke="#94a3b8" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("mob.roles.searchPh")}
            placeholderTextColor="#94a3b8"
            style={s.searchInput}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Icon name="close" size={16} stroke="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={s.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Pressable style={[s.chip, !group && s.chipOn]} onPress={() => setGroup(null)}>
            <Text style={[s.chipText, !group && s.chipTextOn]}>{t("mob.common.all")}</Text>
          </Pressable>
          {groups.map((g) => (
            <Pressable
              key={g.key}
              style={[s.chip, group === g.key && s.chipOn]}
              onPress={() => setGroup(group === g.key ? null : g.key)}
            >
              <Text style={[s.chipText, group === g.key && s.chipTextOn]}>
                {tOr(`roleGroup.${g.key}`, g.key)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {loading && !data ? (
          <Skeleton rows={4} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : shown.length === 0 ? (
          <Text style={s.none}>{t("mob.roles.notFound")}</Text>
        ) : (
          <>
            <View style={s.list}>
              {shown.map((r, i) => (
                <RoleRow key={r.key} row={r} last={i === shown.length - 1} />
              ))}
            </View>

            {/* ══ TO'LOV WEB'DA ══
                Ilova ichida to'lov App Store komissiyasiga
                tushadi. Shuning uchun tarif brauzerda uzaytiriladi
                va buni yashirmaymiz. */}
            <View style={s.note}>
              <Icon name="alert" size={16} stroke={color.mutedForeground} />
              <Text style={s.noteText}>{t("mob.roles.payNote")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RoleRow({
  row,
  last,
}: {
  row: { key: string; name: string; live: Live | null; chip: Chip };
  last: boolean;
}) {
  const { live, chip } = row;
  const trial = live?.status === "TRIAL";
  const left = live?.daysLeft ?? null;
  const soon = left != null && left <= 5;

  /* Sinov muddati qisqa (odatda 3–7 kun), to'lovli tarif esa
     oylik. Chiziq shu farqni hisobga oladi, aks holda sinov doim
     «deyarli tugagan» ko'rinardi. */
  const span = trial ? 7 : 30;
  const pct = left == null ? 0 : Math.max(2, Math.min(100, (left / span) * 100));

  const tone =
    chip.tone === "ok"
      ? color.success
      : chip.tone === "warn"
        ? color.warning
        : chip.tone === "free"
          ? color.info
          : color.mutedForeground;

  return (
    <View style={[s.row, !last && s.rowLine, soon && s.rowWarn]}>
      <View style={s.head}>
        <View style={[s.icon, { backgroundColor: tone + "1a" }]}>
          <Icon name="user" size={19} stroke={tone} />
        </View>

        <View style={{ flexGrow: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={1}>
            {row.name}
          </Text>
          <Text style={s.desc} numberOfLines={1}>
            {tOr(`mob.roleHint.${row.key}`, live ? (live.tariff ?? "") : "")}
          </Text>
        </View>

        <View style={[s.chipR, { backgroundColor: tone + "14" }]}>
          <Text style={[s.chipRText, { color: tone }]} numberOfLines={1}>
            {chip.text}
          </Text>
        </View>
      </View>

      {/* Muddat chizig'i FAQAT amaldagi rolda: «14 kun qoldi» degan
          raqam shoshirmaydi, tugab borayotgan chiziq esa ko'rinadi */}
      {live && (
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: tone }]} />
        </View>
      )}

      {soon && <Text style={s.endNote}>{t("mob.roles.endNote")}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.md },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    paddingHorizontal: 13,
    borderRadius: radius.control,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  searchInput: { flex: 1, fontSize: font.body, color: color.foreground },

  chipsWrap: { paddingTop: space.md },
  chips: { paddingHorizontal: space.lg, gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  chipTextOn: { color: "#fff", fontWeight: "600" },

  scroll: { padding: space.lg, gap: space.lg },
  none: { fontSize: 14, color: color.mutedForeground, textAlign: "center", marginTop: 28 },

  list: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  row: { padding: 13 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  rowWarn: { backgroundColor: color.warning + "0a" },

  head: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14.5, fontWeight: "600", color: color.foreground },
  desc: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  chipR: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, maxWidth: 132 },
  chipRText: { fontSize: 11.5, fontWeight: "700" },

  bar: { height: 4, borderRadius: 2, backgroundColor: color.muted, marginTop: 11, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  endNote: { fontSize: 12, color: color.warning, marginTop: 9, lineHeight: 18 },

  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
});
