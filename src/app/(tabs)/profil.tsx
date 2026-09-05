/**
 * I1 — profil.
 *
 * ⚠️ TARIF KARTASI iOS VA ANDROID'DA BOSHQACHA.
 *
 * App Store Guideline 3.1.1: ilova ichida raqamli xizmat sotilsa,
 * to'lov faqat Apple'ning o'z tizimi orqali o'tishi kerak. Narxni
 * ko'rsatish, «sotib olish» tugmasi qo'yish yoki saytga havola
 * berish — hammasi rad qilish sababi.
 *
 * Shuning uchun iOS'da FAQAT HOLAT ko'rinadi: qaysi tarif va necha
 * kun qolgani. Narx ham, tugma ham, havola ham yo'q. Android'da
 * hammasi bor. Ayni shu farqni `diip.uz` ham qilgan.
 *
 * Atamalar ham ataylab tanlangan: «obuna» so'zi Apple tekshiruvida
 * IAP talabini chaqiradi, shuning uchun «xizmat rejasi» deyiladi.
 */
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Card, GroupLabel, ListRow } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { GuestPanel } from "@/components/GuestPanel";
import { isGuest } from "@/lib/guest";
import { color, font, radius, space } from "@/lib/theme";
import { roleLabel, t, tOr } from "@/lib/i18n";


/** `/api/roles` → `live` */
type LiveRole = {
  roleKey: string;
  status: string;
  daysLeft: number | null;
};

type Trust = {
  score: number | null;
  bandLabel: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  tripsClosed: number;
};

/** Muddatgacha necha kun qolgani; o'tib ketgan yoki yo'q bo'lsa null */
function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86400000) : null;
}

/**
 * Yorliqning ikki holati.
 *
 * Mehmonda profil yo'q — o'rniga kirish taklifi va ochiq bo'limlar
 * ro'yxati turadi (`GuestPanel`). Ikkalasi ALOHIDA komponent:
 * bitta funksiyaga sig'dirilsa, mehmon uchun ma'nosiz `useApi`
 * chaqiruvlari ham ishlab ketardi.
 */
export default function ProfilTab() {
  const { user, loading } = useAuth();
  if (!user && isGuest() && !loading) return <GuestPanel />;
  return <OwnProfil />;
}

function OwnProfil() {
  const { user, signOut, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const trust = useApi<Trust>(user ? `/api/trust/${user.id}` : null, [user?.id]);
  /* Rollar ALOHIDA so'rov: `/api/auth/me` faqat funksiyalar
     ro'yxatini beradi (`features`), rolning MUDDATI esa unda
     yo'q. Ikkinchi chaqiruv shu sababdan. */
  const roles = useApi<{ live: LiveRole[] }>("/api/roles");

  const vip = daysLeft(user?.vipUntil);
  const premium = daysLeft(user?.premiumUntil);
  const plan = vip ? "VIP" : premium ? "Kengaytirilgan" : null;
  const left = vip ?? premium;

  async function copyId() {
    if (!user) return;
    await Clipboard.setStringAsync(String(user.furamId));
    Alert.alert(t("mob.profile.copied"), `FURAM ID: ${user.furamId}`);
  }

  function confirmLeave() {
    Alert.alert(t("mob.common.signOut"), t("mob.profile.signOutAsk"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.common.signOut"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/til");
        },
      },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text style={s.title}>{t("mob.profile.title")}</Text>
        <Pressable
          onPress={() => router.push("/profil/tahrir")}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Text style={s.edit}>{t("mob.common.edit")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={trust.refreshing}
            onRefresh={() => {
              void refresh();
              trust.refresh();
            }}
            tintColor={color.brand}
          />
        }
      >
        {/* Kim */}
        <View style={s.person}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.firstName ?? "?").slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>
            {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}
          </Text>
          <Text style={s.role}>{roleLabel(user?.role)}</Text>
          {user?.phone ? <Text style={s.phone}>{user.phone}</Text> : null}

          <Pressable onPress={copyId} style={({ pressed }) => [s.idChip, pressed && { opacity: 0.6 }]}>
            <Text style={s.idText}>FURAM ID: {user?.furamId ?? "—"}</Text>
            <Icon name="doc" size={13} stroke={color.mutedForeground} />
          </Pressable>
        </View>

        {/* Ishonch */}
        <Card style={{ padding: space.lg }}>
          <View style={s.trustTop}>
            <Text style={s.trustLabel}>{t("mob.profile.trust")}</Text>
            {trust.data?.bandLabel ? (
              <Text style={s.band}>{trust.data.bandLabel}</Text>
            ) : null}
          </View>
          <View style={s.stats}>
            <Stat value={trust.data?.score != null ? String(trust.data.score) : "—"} label={t("mob.profile.points")} />
            <Stat
              value={trust.data?.ratingAvg != null ? trust.data.ratingAvg.toFixed(1) : "—"}
              label={`${t("mob.profile.rating")}${trust.data?.ratingCount ? ` (${trust.data.ratingCount})` : ""}`}
            />
            <Stat value={String(trust.data?.tripsClosed ?? 0)} label={t("mob.profile.closedTrips")} last />
          </View>
        </Card>

        {/* Tarif — platformaga qarab */}
        <Card style={{ padding: space.lg }}>
          <View style={s.planTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.planName}>{plan ? t("mob.profile.planName", { plan }) : t("mob.profile.freePlan")}</Text>
              <Text style={s.planHint}>
                {plan
                  ? left != null
                    ? t("mob.profile.daysLeft", { n: left })
                    : t("mob.profile.expired")
                  : t("mob.profile.freePlanHint")}
              </Text>
            </View>
            {plan ? <Text style={s.planBadge}>{t("mob.profile.active")}</Text> : null}
          </View>

          {plan && left != null ? (
            <View style={s.bar}>
              {/* 365 kunlik reja bo'yicha taxminiy ulush */}
              <View style={[s.barFill, { width: `${Math.min(100, (left / 365) * 100)}%` }]} />
            </View>
          ) : null}

          {Platform.OS === "ios" ? (
            /* iOS: narx, tugma va havola YO'Q — Guideline 3.1.1 */
            <Text style={s.iosNote}>{t("mob.profile.iosNote")}</Text>
          ) : (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <Text style={s.price}>
                {plan ? t("mob.profile.extendHint") : t("mob.profile.openPlan")}
              </Text>
              <Button
                title={plan ? t("mob.profile.extend") : t("mob.profile.openPlan")}
                onPress={() => Alert.alert(t("mob.common.soon"), t("mob.common.soon"))}
              />
            </View>
          )}
        </Card>

        {/* ══ MENING ROLLARIM ══
            Tarif kartasi «umumiy» holatni aytadi, bu esa HAR
            ROLNI alohida: qaysi biri faol, qaysi biri sinovda,
            qaysi birining muddati tugagan. Odamda bir necha rol
            bo'lishi mumkin va ular bir vaqtda bir xil holatda
            bo'lmaydi. */}
        <View>
          <View style={s.rolesHead}>
            <GroupLabel>
              {t("mob.profile.myRoles")}
              {roles.data?.live.length ? ` (${roles.data.live.length})` : ""}
            </GroupLabel>
            <Pressable onPress={() => router.push("/rollarim")} hitSlop={8}>
              <Text style={s.rolesAll}>{t("mob.home.all")}</Text>
            </Pressable>
          </View>

          <Card>
            {/* `last` doim `false`: rollardan keyin «qo'shish»
                qatori keladi, ya'ni chiziq baribir kerak. */}
            {(roles.data?.live ?? []).map((r) => (
              <RoleLine key={r.roleKey} role={r} last={false} />
            ))}
            {roles.data && roles.data.live.length === 0 ? (
              <Text style={s.noRoles}>{t("mob.profile.noRoles")}</Text>
            ) : null}
            <ListRow
              icon={<Badge icon="plus" />}
              title={t("mob.profile.addRole")}
              onPress={() => router.push("/rollarim")}
            />
          </Card>
        </View>

        {/* Menyu */}
        <View>
          <GroupLabel>{t("mob.profile.account")}</GroupLabel>
          <Card>
            <ListRow
              icon={<Badge icon="user" />}
              title={t("mob.profile.editTitle")}
              onPress={() => router.push("/profil/tahrir")}
            />
            <ListRow
              icon={<Badge icon="bell" />}
              title={t("mob.profile.notifications")}
              hint={t("mob.profile.notificationsHint")}
              onPress={() => router.push("/profil/bildirishnoma")}
            />
            <ListRow
              icon={<Badge icon="check" />}
              title={t("mob.profile.devices")}
              hint={t("mob.profile.devicesHint")}
              onPress={() => router.push("/profil/qurilmalar")}
              last
            />
          </Card>
        </View>

        <View>
          <GroupLabel>{t("mob.profile.myWork")}</GroupLabel>
          <Card>
            {/* Haydovchining ish markazi — reysi, haqi, hujjati bir joyda */}
            <ListRow
              icon={<Badge icon="user" />}
              title={t("mob.panel.title")}
              hint={t("mob.profile.panelHint")}
              onPress={() => router.push("/panelim")}
            />
            <ListRow
              icon={<Badge icon="border" />}
              title={t("mob.queue.title")}
              onPress={() => router.push("/navbat")}
            />
            <ListRow
              icon={<Badge icon="truck" />}
              title={t("mob.park.title")}
              hint={t("mob.profile.fleetHint")}
              onPress={() => router.push("/parkim")}
            />
            {/* Parkning YONIDA: haydovchi mashina bilan birga
                parkda, dispecher va ustaning mashinasi yo'q va
                ular shu ro'yxatda (TZ 13) */}
            <ListRow
              icon={<Badge icon="user" />}
              title={t("pgStaff.title")}
              hint={t("pgStaff.subtitle")}
              onPress={() => router.push("/xodimlarim")}
            />
            <ListRow
              icon={<Badge icon="chat" />}
              title={t("mob.deals.title")}
              hint={t("mob.deals.subtitle")}
              onPress={() => router.push("/kelishuvlar")}
            />
            <ListRow
              icon={<Badge icon="package" />}
              title={t("mob.profile.myListings")}
              onPress={() => router.push("/elonlarim")}
            />
            {/* Bozor — transport SOTUVI. Yuk/mashina e'lonlaridan
                boshqa narsa: u yerda bir reysga olinadi, bu yerda
                sotib olinadi. */}
            <ListRow
              icon={<Badge icon="truck" />}
              title={t("mob.market.title")}
              hint={t("mob.market.subtitle")}
              onPress={() => router.push("/bozor")}
            />
            <ListRow
              icon={<Badge icon="check" />}
              title={t("mob.sale.mine")}
              hint={t("mob.sale.mineSub")}
              onPress={() => router.push("/sotuvlarim")}
            />
            {/* Ustaxona: usta chaqirish HAMMAGA ochiq, usta bo'lish
                esa tarif ortida — bo'lim yashirilmaydi. */}
            <ListRow
              icon={<Badge icon="alert" />}
              title={t("mob.svc.title")}
              hint={t("mob.svc.subtitle")}
              onPress={() => router.push("/ustaxona")}
            />
            <ListRow
              icon={<Badge icon="package" />}
              title={t("mob.part.title")}
              hint={t("mob.part.subtitle")}
              onPress={() => router.push("/zapchast")}
            />
            <ListRow
              icon={<Badge icon="user" />}
              title={t("mob.job.title")}
              hint={t("mob.job.subtitle")}
              onPress={() => router.push("/ish")}
            />
            <ListRow
              icon={<Badge icon="doc" />}
              title={t("mob.fin.title")}
              hint={t("mob.fin.subtitle")}
              onPress={() => router.push("/moliya")}
            />
            <ListRow
              icon={<Badge icon="chart" />}
              title={t("mob.an.title")}
              hint={t("mob.an.subtitle")}
              onPress={() => router.push("/analitika")}
            />
            <ListRow
              icon={<Badge icon="doc" />}
              title={t("mob.ctr.title")}
              hint={t("mob.ctr.subtitle")}
              onPress={() => router.push("/shartnoma")}
            />
            <ListRow
              icon={<Badge icon="check" />}
              title={t("mob.trust.title")}
              hint={t("mob.trust.subtitle")}
              onPress={() => router.push("/reyting")}
            />
            <ListRow
              icon={<Badge icon="user" />}
              title={t("mob.roles.title")}
              hint={t("mob.roles.subtitle")}
              onPress={() => router.push("/rollarim")}
            />
            <ListRow
              icon={<Badge icon="alert" />}
              title={t("mob.notes.problem")}
              hint={t("mob.probs.hint")}
              /* Alohida ekran emas: bildirishnomalarning muammo
                 yorlig'i. Bir xil ro'yxatni ikki joyda chizish
                 ikkita tuzatiladigan joy demak edi. */
              onPress={() => router.push("/bildirishnomalar?tab=problem")}
            />
            <ListRow
              icon={<Badge icon="user" />}
              title={t("mob.disp.title")}
              hint={t("mob.disp.subtitle")}
              onPress={() => router.push("/dispetcherlar")}
            />
            <ListRow
              icon={<Badge icon="doc" />}
              title={t("mob.video.title")}
              hint={t("mob.video.subtitle")}
              onPress={() => router.push("/qollanma")}
            />
            <ListRow
              icon={<Badge icon="plus" />}
              title={t("mob.calc.title")}
              hint={t("mob.calc.subtitle")}
              onPress={() => router.push("/kalkulyator")}
            />
            <ListRow
              icon={<Badge icon="heart" />}
              title={t("mob.profile.saved")}
              onPress={() => router.push("/saqlanganlar")}
            />
            <ListRow
              icon={<Badge icon="doc" />}
              title={t("mob.profile.myDocs")}
              hint={t("mob.pdoc.subtitle")}
              onPress={() => router.push("/hujjatlarim")}
            />
            {/* Do'kon talabi: maxfiylik havolasi ilovada BO'LISHI shart */}
            <ListRow
              icon={<Badge icon="doc" />}
              title={t("mob.legal.title")}
              onPress={() => router.push("/huquqiy")}
              last
            />
          </Card>
        </View>

        {/* Chiqish va o'chirish */}
        <View style={{ gap: space.md, marginTop: space.sm }}>
          <Button title={t("mob.common.signOut")} variant="secondary" onPress={confirmLeave} />
          <Text style={s.delete} onPress={() => router.push("/profil/ochirish")}>
            {t("mob.delete.title")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <View style={[s.stat, !last && s.statLine]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Badge({ icon }: { icon: IconName }) {
  return (
    <View style={s.badge}>
      <Icon name={icon} size={18} stroke={color.brand} />
    </View>
  );
}


/**
 * Bitta rol qatori — nomi, izohi va holati.
 *
 * Holat rangi MUDDATGA qarab: besh kundan kam qolsa sariq.
 * «7 kun qoldi» degan raqam o'zi shoshirmaydi, rang esa
 * ko'zga tashlanadi.
 */
function RoleLine({ role, last }: { role: LiveRole; last: boolean }) {
  const trial = role.status === "TRIAL";
  const left = role.daysLeft;
  const soon = left != null && left <= 5;
  const tone = left == null ? color.mutedForeground : soon ? color.warning : color.success;

  return (
    <View style={[s.roleRow, !last && s.roleLine]}>
      <View style={[s.roleIcon, { backgroundColor: tone + "1a" }]}>
        <Icon name="user" size={17} stroke={tone} />
      </View>
      <View style={{ flexGrow: 1, minWidth: 0 }}>
        <Text style={s.roleName} numberOfLines={1}>
          {tOr(`mob.role.${role.roleKey}`, role.roleKey)}
        </Text>
        <Text style={s.roleHint} numberOfLines={1}>
          {tOr(`mob.roleHint.${role.roleKey}`, "")}
        </Text>
      </View>
      <View style={[s.roleChip, { backgroundColor: tone + "14" }]}>
        <Text style={[s.roleChipText, { color: tone }]} numberOfLines={1}>
          {left != null
            ? t("mob.roles.daysLeft", { n: Math.max(0, left) })
            : trial
              ? t("mob.roles.trial")
              : t("mob.profile.expired")}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  phone: { fontSize: 14, color: color.mutedForeground, marginTop: 3 },

  rolesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rolesAll: { fontSize: 13, fontWeight: "600", color: color.brand, marginBottom: 7 },
  noRoles: { fontSize: 13, color: color.mutedForeground, padding: space.md, lineHeight: 19 },

  roleRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  roleLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  roleIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  roleName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  roleHint: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  roleChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, maxWidth: 118 },
  roleChipText: { fontSize: 11.5, fontWeight: "700" },

  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card, flexDirection: "row", alignItems: "center",
    paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.md,
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  edit: { fontSize: font.body, fontWeight: "600", color: color.brand },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },

  person: { alignItems: "center", gap: 6, paddingTop: space.sm },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: color.logoBlue,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  name: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  role: { fontSize: font.caption, color: color.mutedForeground },
  idChip: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6,
    backgroundColor: color.card, borderWidth: 1, borderColor: color.border,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  idText: { fontSize: font.caption, fontWeight: "600", color: color.foreground },

  trustTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  trustLabel: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  band: {
    fontSize: 11, fontWeight: "700", color: color.success,
    backgroundColor: color.success + "1f", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: "hidden",
  },
  stats: { flexDirection: "row", marginTop: space.lg },
  stat: { flex: 1, alignItems: "center" },
  statLine: { borderRightWidth: 1, borderRightColor: color.border },
  statValue: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  statLabel: { fontSize: 11, color: color.mutedForeground, marginTop: 2, textAlign: "center" },

  planTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  planName: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  planHint: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  planBadge: {
    fontSize: 10, fontWeight: "700", color: color.brand,
    backgroundColor: color.brand + "1f", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: "hidden",
  },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.muted, marginTop: space.md, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: color.brand },
  iosNote: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: space.md },
  price: { fontSize: font.caption, color: color.mutedForeground },

  badge: {
    width: 34, height: 34, borderRadius: radius.control,
    backgroundColor: color.brand + "1f", alignItems: "center", justifyContent: "center",
  },
  soon: { fontSize: 11, color: color.mutedForeground },

  delete: {
    textAlign: "center", fontSize: font.caption, fontWeight: "600",
    color: color.danger, paddingVertical: space.md,
  },
});
