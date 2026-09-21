/**
 * C3 — yuk tafsiloti.
 *
 * Mehmon ham ko'ra oladi (web'dagidek), lekin telefon raqam yopiq turadi.
 * Uni ochish alohida amal: `/api/contact-reveal`. Bu yerda faqat
 * «ochilganmi» degan javob keladi.
 */
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Icon } from "@/components/Icon";
import { TruckImage } from "@/components/TruckImage";
import { Chip, ago, davlatNomi, elonNomi } from "@/components/cards";
import type { IconName } from "@/components/Icon";
import { Button, Field, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { currentLocale, t } from "@/lib/i18n";
import { guestBlocked } from "@/lib/guest-gate";
import { ShareButton } from "@/components/ShareSheet";
import { ReportRow, ReportSheet } from "@/components/ReportSheet";
import { Sheet } from "@/components/Sheet";
import { InviteOwner } from "@/components/InviteOwner";
import { ContactLinks, type Links } from "@/components/ContactLinks";
import { TakeLoad } from "@/components/TakeLoad";

type Load = {
  id: string; slug: string | null; title: string | null; description: string | null;
  isMine: boolean; isTaken: boolean; isTop: boolean;
  /* Serverning qarori: «Egasini chaqirish» ma'noli bo'ladigan
     yagona holat — Telegram e'loni va matnida raqam bor */
  canInviteOwner: boolean;
  /** Ochiq manbadan (Telegram) — yukni olishda narx so'raladi */
  ochiqManba?: boolean;
  views: number; createdAt: string;
  route: { from: string; fromCountry: string; to: string; toCountry: string };
  cargo: {
    weightT: number | null; volumeM3: number | null; vehicleCount: number;
    isExtraLoad: boolean; isReadyNow: boolean; loadingDate: string | null;
    vehicleType: { key: string; name: string };
    altVehicleTypes: { key: string; name: string }[];
  };
  price: {
    amount: number | null; currency: string; isNegotiable: boolean;
    advance: number | null; paymentType: string;
  };
  owner: {
    id: string; name: string; company: string | null; furamId: number;
    isVerified: boolean; memberSince: string;
    rating: number | null; ratingCount: number;
  } | null;
  contact: string | null;
  /* Bog'lanish yo'llari — QAROR SERVERDA (`lib/contact-links.ts`).
     Mehmonga telefonli havola kelmaydi, u yerda kesiladi. */
  links: Links | null;
  /** Asl Telegram e'lonida raqam bormi */
  hasPhone: boolean;
};

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function pay(): Record<string, string> {
  return { CASH: t("mob.load.cash"), TRANSFER: t("mob.load.transfer"), MIXED: t("mob.load.mixed") };
}

function money(n: number, cur: string) {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ${cur}`;
}

export default function YukTafsiloti() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [offer, setOffer] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealErr, setRevealErr] = useState<string | null>(null);
  /* Shikoyat varaqasi — do'kon talabi (2026-09-18, A12) */
  const [report, setReport] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<Load>(
    id ? `/api/loads/${id}` : null,
    [id],
  );

  async function reveal() {
    setRevealErr(null);
    setRevealing(true);
    try {
      await api("/api/contact-reveal", { method: "POST", body: { kind: "load", id: String(id) } });
      reload();
    } catch (e) {
      setRevealErr((e as FuramError).message ?? t("mob.load.contactFailed"));
    } finally {
      setRevealing(false);
    }
  }

  const c = data?.cargo;

  /* ── TELEGRAM E'LONI: ASL POST KO'RSATILMAYDI (2026-09-21, Bekzod) ──
     `description` ga guruhdagi xabar butunlay tushadi: «📱 Tel: • • •»,
     guruh reklamasi («O'zbekiston ichidagi yuklar»), bot havolasi —
     FURAM ekranida begona matn. Kerakli qismi (yo'nalish, og'irlik,
     tur) allaqachon ajratilib, yuqorida o'z joyida turibdi.
     Nom ham shu matndan ajratiladi va ba'zan havola bo'lib qoladi
     («lar: https://t») — bunday nom ham chiqmaydi. Odamlar o'zi
     yozgan e'lonlarga tegilmaydi. */
  const tg = !!data?.ochiqManba;
  const izoh = tg ? null : data?.description ?? null;
  const nom = elonNomi(data?.title, tg);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Sarlavha o'rtada (raqobatchi namunasi). ♡ OLIB TASHLANDI — u
          tugma emas edi: `onPress` yo'q, bosilganda hech narsa bo'lmasdi */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={s.back}
          accessibilityRole="button"
          accessibilityLabel={t("mob.common.back")}
        >
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>
          {t("mob.load.detailTitle")}
        </Text>
        <View style={s.headerRight}>
          {data ? <ShareButton kind="load" id={data.id} href={data.slug ? `/loads/${data.slug}` : null} compact /> : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton rows={2} /> : null}
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data && c ? (
          <>
            {/* ── ASOSIY (dizayn, 2026-09-21) ─────────────────────────
                Bekzod raqobatchi ilovadagi «Transport ma'lumotlari»
                ekranini ko'rsatdi: «bu ro'yxat juda xunuk, shunday
                qil». Ilgari: ikki ustunli yo'nalish, to'rt katakli jadval
                va alohida narx kartasi. Endi: tur rasmi + ikonkali
                yo'nalish + «Narx» qutisi bitta kartada, qolgani ikonkali
                ro'yxatda. */}
            <View style={s.card}>
              <View style={s.heroTop}>
                <View style={s.heroThumb}>
                  <TruckImage typeKey={c.vehicleType.key} style={s.heroImg} />
                </View>
                <View style={s.heroInfo}>
                  <View style={s.typeRow}>
                    <View style={s.typeChip}>
                      <Icon name="truck" size={15} stroke={color.foreground} />
                      <Text style={s.typeChipText} numberOfLines={1}>
                        {c.vehicleType.name}
                      </Text>
                    </View>
                    {c.altVehicleTypes.map((a) => (
                      <View key={a.key} style={s.typeAlt}>
                        <Text style={s.typeAltText}>{a.name}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.meta}>
                    {ago(data.createdAt)} · {t("mob.trucks.viewed", { n: data.views })}
                  </Text>
                </View>
                {data.isTop ? <Chip text="TOP" tone="brand" /> : null}
              </View>

              <View style={s.route}>
                <Bekat
                  icon="package"
                  city={data.route.from}
                  country={davlatNomi(data.route.fromCountry)}
                  right={c.isReadyNow ? t("mob.loads.readyNow") : c.loadingDate ? date(c.loadingDate) : undefined}
                  rightTone={c.isReadyNow ? color.successText : undefined}
                />
                <View style={s.routeDots}>
                  <View style={s.routeDot} />
                  <View style={s.routeDot} />
                  <View style={s.routeDot} />
                </View>
                <Bekat icon="border" city={data.route.to} country={davlatNomi(data.route.toCountry)} />
              </View>

              {nom ? (
                <View style={s.cargoRow}>
                  <Icon name="doc" size={16} stroke={color.mutedForeground} />
                  <Text style={s.cargoName}>{nom}</Text>
                </View>
              ) : null}

              <View style={s.priceBox}>
                <View style={s.priceIcon}>
                  <Icon name="wallet" size={20} stroke={color.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.priceLabel}>{t("mob.load.price")}</Text>
                  {data.price.isNegotiable || data.price.amount == null ? (
                    <Text style={s.priceNego}>{t("mob.loads.negotiable")}</Text>
                  ) : (
                    <Text style={s.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {money(data.price.amount, data.price.currency)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* ── Ma'lumotlar — ikonkali ro'yxat ── */}
            <View style={[s.card, s.listCard]}>
              <Qator icon="package" label={t("mob.load.weight")} value={c.weightT != null ? `${c.weightT} t` : "—"} />
              <Qator icon="grid" label={t("mob.last.volume")} value={c.volumeM3 != null ? `${c.volumeM3} m³` : "—"} />
              <Qator icon="truck" label={t("mob.last.truckCount")} value={String(c.vehicleCount)} />
              <Qator
                icon="clock"
                label={t("mob.load.loading")}
                value={c.isReadyNow ? t("mob.loads.readyNow") : c.loadingDate ? date(c.loadingDate) : "—"}
                tone={c.isReadyNow ? color.successText : undefined}
              />
              <Qator
                icon="wallet"
                label={t("mob.post.payType")}
                value={[
                  pay()[data.price.paymentType] ?? data.price.paymentType,
                  data.price.advance
                    ? t("mob.load.advance", { sum: money(data.price.advance, data.price.currency) ?? "" })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                last={!c.isExtraLoad && !izoh}
              />
              {c.isExtraLoad ? (
                <View style={[s.extraNote, !izoh && { borderBottomWidth: 0 }]}>
                  <Icon name="plus" size={15} stroke={color.blue} />
                  <Text style={s.extraText}>{t("mob.post2.extraHint")}</Text>
                </View>
              ) : null}
              {izoh ? (
                <View style={s.noteBox}>
                  <Text style={s.noteLabel}>{t("mob.exp.note")}</Text>
                  <Text style={s.desc}>{izoh}</Text>
                </View>
              ) : null}
            </View>

            {/* E'lon beruvchi */}
            {data.owner ? (
              <View style={s.card}>
                <View style={s.ownerRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{data.owner.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.ownerName} numberOfLines={1}>
                        {data.owner.company || data.owner.name}
                      </Text>
                      {data.owner.isVerified ? (
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                          <Path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" fill={color.info} />
                          <Path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                      ) : null}
                    </View>
                    <Text style={s.meta}>FURAM ID {data.owner.furamId}</Text>
                  </View>
                </View>

                {data.owner.rating != null ? (
                  <View style={s.trust}>
                    <Svg width={15} height={15} viewBox="0 0 24 24">
                      <Path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" fill={color.brand} />
                    </Svg>
                    <Text style={s.trustValue}>{data.owner.rating.toFixed(1)}</Text>
                    <Text style={s.meta}>· {t("mob.load.ratingsN", { n: data.owner.ratingCount })}</Text>
                  </View>
                ) : null}

                {/* Kontakt */}
                {data.contact ? (
                  <Pressable style={s.contactOpen} onPress={() => Linking.openURL(`tel:${data.contact}`)}>
                    <Icon name="check" size={19} stroke={color.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.contactPhone}>{data.contact}</Text>
                      <Text style={s.contactNote}>{t("mob.load.tapToCall")}</Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={s.contactLocked}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                      <View style={s.lockIcon}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path d="M3 11h18v11H3z" fill="none" stroke={color.mutedForeground} strokeWidth={2} strokeLinejoin="round" />
                          <Path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={color.mutedForeground} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.hiddenPhone}>+998 ** *** ** **</Text>
                        <Text style={s.meta}>{t("mob.load.phoneLocked")}</Text>
                      </View>
                    </View>

                    {revealErr ? <Text style={s.err}>{revealErr}</Text> : null}

                    <View style={{ marginTop: space.md }}>
                      <Button
                        title={t("mob.post2.openContact")}
                        onPress={() => {
                          if (guestBlocked()) return;
                          void reveal();
                        }}
                        loading={revealing}
                      />
                    </View>
                    <Pressable style={s.freeAlt} hitSlop={6}>
                      <Icon name="chat" size={15} stroke={color.brand} />
                      <Text style={s.freeAltText}>{t("mob.load.orMessage")}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}

            {/* «Bu yukni olaman» — reys ochish.
                O'z e'loniga va band yukka chiqmaydi; qolgan
                shartlarni (Telegram e'loni, holat) server hal
                qiladi va ro'yxat bo'sh kelsa oyna shuni aytadi. */}
            {!data.isMine && !data.isTaken ? <TakeLoad loadId={data.id} ochiqManba={!!data.ochiqManba} /> : null}

            {/* Bog'lanish yo'llari: Telegram / WhatsApp / SMS.
                Raqamsiz Telegram e'lonida asl postga havola —
                2026-09-10 dan bunday e'lonlar ham lentaga
                chiqadi va ularga boshqa yo'l yo'q. */}
            <ContactLinks links={data.links} hasPhone={data.hasPhone} />

            {/* Telegram e'loni: egasini FURAM'ga chaqirish.
                Shart SERVERDA hisoblangan — bu yerda takrorlansa,
                ikkita bir-biriga mos kelmaydigan qoida bo'lardi. */}
            {data.canInviteOwner ? <InviteOwner loadId={data.id} /> : null}

            {/* O'z e'loni: kim olib keta oladi */}
            {data.isMine && !data.isTaken ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/moslar/[kind]/[id]", params: { kind: "yuk", id: data.id } })
                }
                style={({ pressed }) => [s.matchLink, pressed && { opacity: 0.85 }]}
              >
                <View style={s.matchIcon}>
                  <Icon name="sparkle" size={19} stroke={color.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.matchTitle}>{t("mob.match.trucksTitle")}</Text>
                  <Text style={s.matchHint}>{t("mob.match.lead")}</Text>
                </View>
                <Icon name="chevron" size={17} stroke={color.iconFaint} />
              </Pressable>
            ) : null}

            {data.isTaken ? (
              <Notice tone="warning">{t("mob.load.alreadyTrip")}</Notice>
            ) : null}

            {/* Shikoyat — do'kon talabi (2026-09-18, A12). O'z e'loniga
                ko'rsatilmaydi: server ham `SELF` bilan rad qiladi. */}
            {!data.isMine && data.owner ? (
              <ReportRow onPress={() => setReport(true)} label={t("mob.abuse.listing")} />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {report && data?.owner ? (
        <ReportSheet
          open
          onClose={() => setReport(false)}
          target="load"
          targetId={String(id)}
          blockUserId={data.owner.id}
          onDone={(blocked) => {
            /* Bloklangan bo'lsa e'lon lentada ham ko'rinmaydi —
               ekranda qolishning ma'nosi yo'q */
            if (blocked) router.back();
          }}
        />
      ) : null}

      {/* Pastki panel */}
      {data && !data.isMine && !data.isTaken ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + space.lg }]}>
          <Pressable
            style={({ pressed }) => [s.primary, pressed && { backgroundColor: color.brandHover }]}
            onPress={() => {
              if (guestBlocked()) return;
              setOffer(true);
            }}
          >
            <Text style={s.primaryText}>{t("mob.load.offer")}</Text>
          </Pressable>
          {/* 💬 OLIB TASHLANDI — `View` edi, bosilmasdi */}
        </View>
      ) : null}

      <OfferSheet
        open={offer}
        loadId={String(id)}
        suggested={data?.price.amount ?? null}
        currency={data?.price.currency ?? "UZS"}
        onClose={() => setOffer(false)}
        onDone={() => { setOffer(false); reload(); }}
      />
    </View>
  );
}

/* Oy nomi tizimdan, tanlangan tilda — ilgari o'zbekcha ro'yxat
   qotib turardi va ruscha ekranda ham «sent» chiqardi */
function date(iso: string) {
  return new Date(iso).toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
}

/** Yo'nalish bekati: belgi · shahar (qalin) · davlat (xira) · o'ngda sana */
function Bekat({
  icon,
  city,
  country,
  right,
  rightTone,
}: {
  icon: IconName;
  city: string;
  country: string;
  right?: string;
  rightTone?: string;
}) {
  return (
    <View style={s.stop}>
      <View style={s.stopIcon}>
        <Icon name={icon} size={19} stroke={color.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.stopCity}>{city}</Text>
        <Text style={s.stopCountry}>{country}</Text>
      </View>
      {right ? <Text style={[s.stopRight, rightTone ? { color: rightTone } : null]}>{right}</Text> : null}
    </View>
  );
}

/**
 * Ma'lumot qatori: rangli katakdagi belgi · nom · qiymat.
 *
 * Ilgari to'rt katakli jadval edi: qiymat nomdan kattaroq, belgisiz —
 * ko'z qaysi raqam nima ekanini har safar pastdagi yozuvdan qidirardi.
 */
function Qator({
  icon,
  label,
  value,
  tone,
  last,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: string;
  last?: boolean;
}) {
  return (
    <View style={[s.row, !last && s.rowDivider]}>
      <View style={s.rowIcon}>
        <Icon name={icon} size={17} stroke={color.brand} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, tone ? { color: tone } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── taklif */

function OfferSheet({ open, loadId, suggested, currency, onClose, onDone }: {
  open: boolean; loadId: string; suggested: number | null; currency: string;
  onClose: () => void; onDone: () => void;
}) {
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const num = Number(fee.replace(/\s/g, "").replace(",", "."));

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await api("/api/deals", {
        method: "POST",
        body: { kind: "LOAD", id: loadId, fee: num, currency, note: note.trim() || undefined },
      });
      setOk(true);
      setTimeout(() => { setOk(false); setFee(""); setNote(""); onDone(); }, 1200);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.load.offerFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    /* ⚠️ UMUMIY `Sheet` GA O'TKAZILDI (2026-09-13).

       Ilgari bu qo'lda yozilgan `Modal` edi: yopish faqat pastdagi
       «Bekor qilish» tugmasi bilan bo'lardi. Narx maydoniga
       bosilganda klaviatura chiqib o'sha tugmani BOSIB QOLARDI va
       odam oynadan chiqolmasdi — Bekzod telefonda aynan shunga
       urildi.

       `Sheet` da yopishning uchta yo'li bor (surish, ✕, parda) va
       klaviatura kontentni bosmaydi. */
    <Sheet open={open} onClose={onClose} title={ok ? undefined : t("mob.load.offer")}>
      {ok ? (
        <View style={{ alignItems: "center", paddingVertical: space.xl }}>
          <View style={s.okCircle}>
            <Icon name="check" size={28} stroke={color.success} />
          </View>
          <Text style={s.okText}>{t("mob.load.offerSent")}</Text>
        </View>
      ) : (
        <>
          <Text style={s.sheetSub}>{t("mob.load.offerHint")}</Text>

          <View style={{ marginTop: space.lg }}>
            <Field
              label={t("mob.load.yourPrice", { cur: currency })}
              placeholder={suggested ? new Intl.NumberFormat("ru-RU").format(suggested) : "0"}
              keyboardType="numeric"
              value={fee}
              onChangeText={setFee}
            />
            {suggested ? (
              <Text style={s.hint}>
                {t("mob.loads.postedPrice", { sum: money(suggested, currency) })}
              </Text>
            ) : null}
          </View>

          <View style={{ marginTop: space.md }}>
            <Field
              label={t("mob.exp.note")}
              hint={t("mob.exp.optional")}
              placeholder={t("mob.post2.offerPh")}
              value={note}
              onChangeText={setNote}
            />
          </View>

          {err ? (
            <View style={{ marginTop: space.md }}>
              <Notice tone="danger">{err}</Notice>
            </View>
          ) : null}

          <View style={{ marginTop: space.lg }}>
            <Button
              title={t("mob.tripDocs.send")}
              onPress={submit}
              loading={busy}
              disabled={!(num > 0)}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}

const s = themed(() => ({
  matchLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  matchIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: color.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  matchTitle: { fontSize: 14.5, fontWeight: "700", color: color.foreground },
  matchHint: { fontSize: 12, color: color.mutedForeground, marginTop: 2, lineHeight: 17 },

  root: { flex: 1, backgroundColor: color.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: color.foreground },
  /* Chapdagi tugma bilan teng kenglik — sarlavha haqiqatan o'rtada tursin */
  headerRight: { width: 44, alignItems: "center", justifyContent: "center" },

  /* Asosiy karta */
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  heroThumb: {
    width: 96, height: 66, borderRadius: 18, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  heroImg: { width: 86, height: 54 },
  heroInfo: { flex: 1, minWidth: 0, gap: 7 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    height: 30, paddingHorizontal: 10, borderRadius: radius.control, backgroundColor: color.muted,
  },
  typeChipText: { fontSize: 14, fontWeight: "700", color: color.foreground, flexShrink: 1 },

  route: {
    marginTop: space.lg, paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border,
  },
  stop: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  stopIcon: { width: 26, height: 24, alignItems: "center", justifyContent: "center" },
  stopCity: { fontSize: 17, lineHeight: 23, fontWeight: "800", color: color.foreground, letterSpacing: -0.3 },
  stopCountry: { fontSize: 13, color: color.mutedForeground, marginTop: 1 },
  stopRight: { fontSize: 13, fontWeight: "600", color: color.mutedForeground, marginTop: 3 },
  routeDots: { width: 26, alignItems: "center", gap: 4, paddingVertical: 5 },
  routeDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.iconFaint },

  cargoRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: space.lg },

  priceBox: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.lg, padding: space.md, borderRadius: radius.control,
    backgroundColor: color.brandSoft,
  },
  priceIcon: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: color.card,
    alignItems: "center", justifyContent: "center",
  },
  priceLabel: { fontSize: 12.5, color: color.mutedForeground },
  priceNego: { fontSize: 19, fontWeight: "800", color: color.brandText, marginTop: 1 },

  /* Ma'lumotlar ro'yxati */
  listCard: { paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: color.brandSoft,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 14, color: color.mutedForeground },
  rowValue: { maxWidth: "55%", textAlign: "right", fontSize: 15, fontWeight: "700", color: color.foreground },
  extraNote: {
    flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border,
  },
  extraText: { flex: 1, fontSize: 13, fontWeight: "600", color: color.blue },
  noteBox: { paddingTop: 13, paddingBottom: 12, gap: 6 },
  noteLabel: { fontSize: 13, color: color.mutedForeground },

  body: { padding: space.lg, gap: space.md },
  card: {
    backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, ...shadow.card,
  },
  cardTitle: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginBottom: 8 },
  meta: { fontSize: 12, color: color.mutedForeground },

  cargoName: { flex: 1, fontSize: font.bodyLg, fontWeight: "600", color: color.foreground, lineHeight: 22 },


  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  typeAlt: { height: 34, paddingHorizontal: 12, borderRadius: radius.control, backgroundColor: color.muted, justifyContent: "center" },
  typeAltText: { fontSize: 13, fontWeight: "500", color: color.icon },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 8 },

  price: { fontSize: 24, fontWeight: "800", color: color.brand, letterSpacing: -0.5, marginTop: 1 },
  desc: { fontSize: 14, color: color.icon, lineHeight: 22 },

  ownerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "600", color: color.mutedForeground },
  ownerName: { fontSize: font.bodyLg, fontWeight: "600", color: color.foreground },
  trust: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },
  trustValue: { fontSize: 14, fontWeight: "700", color: color.foreground },

  contactOpen: {
    flexDirection: "row", alignItems: "center", gap: 11, marginTop: 14,
    padding: 13, borderRadius: radius.control, backgroundColor: "#16a34a12",
  },
  contactPhone: { fontSize: 16, fontWeight: "700", color: color.foreground },
  contactNote: { fontSize: 12, color: color.successText, marginTop: 1 },

  contactLocked: { marginTop: 14, padding: 16, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  lockIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.border, alignItems: "center", justifyContent: "center" },
  hiddenPhone: { fontSize: 17, fontWeight: "700", color: color.faintText, letterSpacing: 1 },
  freeAlt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12 },
  freeAltText: { fontSize: 13, fontWeight: "600", color: color.brandText },
  err: { fontSize: 12, color: color.danger, marginTop: 10 },

  actions: {
    flexDirection: "row", gap: 8, backgroundColor: color.card,
    paddingHorizontal: space.lg, paddingTop: space.md, ...shadow.bar },
  primary: { flex: 1, height: 52, borderRadius: radius.control, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: font.body, fontWeight: "600", color: "#fff" },

  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  sheetSub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 5, lineHeight: 20 },

  okCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#16a34a1f", alignItems: "center", justifyContent: "center" },
  okText: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground, marginTop: space.md },
}));
