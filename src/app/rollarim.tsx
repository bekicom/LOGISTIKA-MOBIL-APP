/**
 * Rl1 — «Men kimman?» (rollarim).
 *
 * ── ROL — TANLOV EMAS, HOLAT ────────────────────────────────────
 *
 * Bir odamda bir necha rol bo'lishi mumkin va har birining o'z
 * tarifi bor. Shuning uchun bu «tarif tanlash» emas, «rollarimni
 * boshqarish» ekrani: amaldagilari tepada, qo'shish mumkinlari
 * ostida.
 *
 * ── MUDDAT CHIZIQ BILAN ─────────────────────────────────────────
 *
 * «14 kun qoldi» degan raqam shoshirmaydi, tugab borayotgan
 * chiziq esa ko'rinadi.
 *
 * ── TUGAGANDA NIMA BO'LADI ──────────────────────────────────────
 *
 * TZ 25-band: ma'lumot o'chirilmaydi, faqat yangi ish to'xtaydi.
 * Buni aytmasak odam «hammasi yo'qoladi» deb qo'rqadi va shu
 * qo'rquv bilan qaror qiladi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Header } from "@/components/ui";
import { RolePicker, RolTanlangan } from "@/components/RolePicker";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isRoyxatRol, ROL_IKONKA, ROYXAT_ROLLARI, type RoyxatRol } from "@/lib/rollar";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

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

export default function Rollarim() {
  const insets = useSafeAreaInsets();
  /* Apple 3.1.1 — narx va to'lov yo'nalishi iOS'da ko'rsatilmaydi */
  const iosDa = Platform.OS === "ios";

  const { refresh: authYangila } = useAuth();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    live: Live[];
    expired?: { roleKey: string }[];
    offers?: Offer[];
  }>("/api/roles");

  const live = data?.live ?? [];

  /* ══ ROL QO'SHISH (TZ-04, 2026-09-19) ══
     Ilgari bu ekranda rolni OCHIB BO'LMASDI: Android'da narxli ro'yxat
     (bosilmaydigan), iOS'da esa umuman hech narsa. Rolsiz odam uchun bu
     boshi berk ko'cha edi — «Tarifingizga kirmaydi → Rolni tanlang»
     shu yerga olib kelardi (brauzerda bosib sinalganda ko'rindi).

     Endi rol tanlanadi va SINOV muddati shu zahoti ochiladi
     (`POST /api/roles` → `chooseRole`). Bu sotuv emas — narx va to'lov
     yo'q, shuning uchun ikkala platformada bir xil. Ilgari olingan
     (muddati tugagan) rol qayta taklif qilinmaydi: server takror
     sinov bermaydi (`EXISTS`). */
  const band = new Set([...live.map((l) => l.roleKey), ...(data?.expired ?? []).map((e) => e.roleKey)]);
  const qoshsaBoladi = ROYXAT_ROLLARI.filter((r) => !band.has(r));
  /* Android'da narx — MA'LUMOT sifatida (Play to'lovni tashqariga
     yo'naltirishni taqiqlaydi, narxni ko'rsatishni emas). iOS'da yo'q:
     Apple 3.1.1 */
  const narxlar: Partial<Record<RoyxatRol, string>> = {};
  if (!iosDa) {
    for (const o of data?.offers ?? []) {
      if (isRoyxatRol(o.roleKey)) {
        narxlar[o.roleKey] = t("mob.roles.priceDays", { sum: fmtNum(o.price), n: o.days });
      }
    }
  }

  const [tanlov, setTanlov] = useState<RoyxatRol | null>(null);
  const [ochilmoqda, setOchilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  /* ── AI TUGMASI OLIB KELGAN ROL (TZ-09 §9.4, 2026-09-19) ──
     «Bu amal uchun yuk egasi roli kerak» → `/rollarim?rol=CARGO_OWNER`.
     Rol TANLANGAN holda ochiladi va ekran unga suriladi: ro'yxat uzun,
     odam nega bu yerga kelganini qidirib yurmasin (webdagi `tanlangan`).
     Faqat hali olinmagan rol tanlanadi — amaldagi yoki muddati tugagan
     rolni «ochish» tugmasi yo'q.

     O'n bitta kartochka o'rniga BITTA — tanlangan rol va «Boshqa rol»
     (ro'yxatdan o'tish ekranidagi naqsh): tanlangan kartochka ro'yxat
     o'rtasida ekran ostida qolib ketardi (brauzerda bosib sinalganda
     ko'rindi), «ochish» tugmasi esa undan ham pastda edi. */
  const { rol: kerakli } = useLocalSearchParams<{ rol?: string }>();
  const [royxatOchiq, setRoyxatOchiq] = useState(false);
  /* Holat (ref emas): chizishda o'qiladi — bitta kartochka yoki ro'yxat */
  const [oldindan, setOldindan] = useState(false);
  /* Effekt bir marta ishlasin — `oldindan` yangilanguncha ikkinchi
     `data` kelsa ham qayta tanlamasin */
  const qoyildi = useRef(false);
  const surildi = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  /* Ro'yxat joyi — `onLayout` effektdan OLDIN ham, KEYIN ham kelishi
     mumkin; surish ikkala tomondan chaqiriladi va bir marta bajariladi */
  const qoshishY = useRef<number | null>(null);
  const suril = useCallback(() => {
    if (!qoyildi.current || surildi.current || qoshishY.current === null) return;
    surildi.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, qoshishY.current - space.sm), animated: true });
  }, []);
  useEffect(() => {
    if (qoyildi.current || !data || !isRoyxatRol(kerakli)) return;
    const olingan = new Set([...data.live.map((l) => l.roleKey), ...(data.expired ?? []).map((e) => e.roleKey)]);
    if (olingan.has(kerakli)) return;
    qoyildi.current = true;
    setTanlov(kerakli);
    setOldindan(true);
    suril();
  }, [data, kerakli, suril]);

  async function rolniOch() {
    if (!tanlov || ochilmoqda) return;
    setOchilmoqda(true);
    setXato(null);
    try {
      await api("/api/roles", { method: "POST", body: { roleKey: tanlov } });
      setTanlov(null);
      /* Huquqlar ro'yxati (`can()`) ham yangilanadi — aks holda bo'limlar
         ilova qayta ochilguncha qulf ko'rinib turardi */
      await authYangila();
      reload();
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.err.generic"));
    } finally {
      setOchilmoqda(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.roles.title")} subtitle={t("mob.roles.subtitle")} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {live.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.roles.liveGroup")}</Text>
                <View style={{ gap: 9 }}>
                  {live.map((r) => {
                    const trial = r.status === "TRIAL";
                    const left = r.daysLeft;
                    /* Chiziq muddatning O'Z uzunligiga nisbatan: sinov
                       tarifning `trialDays` i (TZ-04 dan beri 10 kun),
                       to'lovli davr — tarifning `days` i. Qattiq
                       yozilgan 7 kun 10 kunlik sinovni birinchi uch
                       kun «to'la» ko'rsatardi. */
                    const tarif = data?.offers?.find((o) => o.roleKey === r.roleKey);
                    const span = Math.max(1, trial ? (tarif?.trialDays ?? 10) : (tarif?.days ?? 30));
                    const pct = left == null ? 0 : Math.max(2, Math.min(100, (left / span) * 100));
                    const soon = left != null && left <= 5;

                    return (
                      <View key={r.roleKey} style={[s.card, soon && s.cardWarn]}>
                        <View style={s.row}>
                          <View
                            style={[
                              s.icon,
                              { backgroundColor: (soon ? color.warning : color.success) + "1a" },
                            ]}
                          >
                            <Icon
                              name={isRoyxatRol(r.roleKey) ? ROL_IKONKA[r.roleKey] : "user"}
                              size={21}
                              stroke={soon ? color.warning : color.success}
                            />
                          </View>
                          <View style={{ flexGrow: 1, minWidth: 0 }}>
                            <Text style={s.roleName}>{t(`mob.role.${r.roleKey}`)}</Text>
                            <Text
                              style={[
                                s.roleMeta,
                                { color: soon ? color.warning : color.success },
                              ]}
                            >
                              {[
                                left != null ? t("mob.roles.daysLeft", { n: Math.max(0, left) }) : null,
                                trial ? t("mob.roles.trial") : r.tariff,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          </View>
                        </View>

                        <View style={s.bar}>
                          <View
                            style={[
                              s.barFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: soon ? color.warning : color.success,
                              },
                            ]}
                          />
                        </View>

                        {soon && (
                          <>
                            {/* TUGAGANDA NIMA BO'LADI — TZ 25-band */}
                            <Text style={s.endNote}>{t("mob.roles.endNote")}</Text>
                            {/* «Uzaytirish» tugmasi OLIB TASHLANDI (2026-09-17,
                                A22): `onPress` bo'sh edi — bosilganda hech
                                narsa bo'lmasdi. Apple 2.1 ishlamaydigan
                                boshqaruvni rad sababi qiladi. To'lov oqimi
                                qurilganda qaytariladi. */}
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {qoshsaBoladi.length > 0 && (
              <View
                onLayout={(e) => {
                  qoshishY.current = e.nativeEvent.layout.y;
                  suril();
                }}
              >
                <Text style={s.group}>
                  {live.length === 0 ? t("mob.roles.noneTitle") : t("mob.roles.addGroup")}
                </Text>
                <Text style={s.pickHint}>{t("mob.roles.noneHint")}</Text>
                {oldindan && tanlov && !royxatOchiq ? (
                  <RolTanlangan rol={tanlov} qator={narxlar[tanlov]} onChange={() => setRoyxatOchiq(true)} />
                ) : (
                  <RolePicker
                    value={tanlov}
                    onChange={setTanlov}
                    faqat={qoshsaBoladi}
                    qoshimcha={narxlar}
                  />
                )}
                {xato ? <Text style={s.err}>{xato}</Text> : null}
                <View style={{ marginTop: space.md }}>
                  <Button
                    title={t("mob.roles.openRole")}
                    onPress={rolniOch}
                    loading={ochilmoqda}
                    disabled={!tanlov}
                  />
                </View>
              </View>
            )}

            {/* Ilgari bu yerda «to'lov brauzerda, ilova ichidagi to'lov
                do'kon komissiyasiga tushadi» degan izoh turardi — Apple
                3.1.1 va Play to'lov siyosati ikkisi ham buni rad qiladi.
                O'rniga savol bo'lsa yordamga yo'naltiramiz. */}
            <View style={s.note}>
              <Icon name="alert" size={16} stroke={color.mutedForeground} />
              <Text style={s.noteText}>{t("mob.roles.planNote")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  pickHint: { fontSize: 12.5, lineHeight: 18, color: color.mutedForeground, marginBottom: space.md, marginLeft: 4 },
  err: { fontSize: 12.5, color: color.danger, marginTop: space.sm },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardWarn: { borderColor: color.warning + "66" },

  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  roleName: { fontSize: 15, fontWeight: "600", color: color.foreground },
  roleMeta: { fontSize: 12, marginTop: 1 },

  bar: { height: 5, borderRadius: 3, backgroundColor: color.muted, marginTop: 11, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  endNote: { fontSize: 12, color: color.mutedForeground, marginTop: 9, lineHeight: 18 },



  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
}));
