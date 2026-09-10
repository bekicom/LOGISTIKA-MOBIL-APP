/**
 * «BUGUN SIZ UCHUN» — bosh sahifadagi vazifalar.
 *
 * ── VAZIFA BO'LMASA — KARTOCHKA HAM YO'Q ────────────────────────
 *
 * Bo'sh «Bugun siz uchun» eng yomon variant: u har kuni o'sha
 * joyda turadi, hech narsa aytmaydi va odam uni ko'rmay qo'yadi.
 * Keyin haqiqiy vazifa chiqqanda ham ko'rmaydi. Web ham shunday
 * qiladi (`home/today-card`).
 *
 * ── TARTIBNI SERVER BELGILAYDI ──────────────────────────────────
 *
 * `weight` — qanchalik shoshilinch. Muddati tugayotgan hujjat
 * chegarada mashinani to'xtatadi, o'qilmagan xabar esa
 * kutaveradi. Saralash serverda bo'ladi va ilova uni
 * TAKRORLAMAYDI: aks holda web bilan ilovada tartib boshqacha
 * bo'lardi.
 *
 * ── MATN KALIT BILAN KELADI ─────────────────────────────────────
 *
 * Server `key` va `n` yuboradi, ilova esa o'z tilida yozadi
 * (1-qoida). `text` — zaxira: kalit lug'atga tushmagan bo'lsa
 * bo'sh qator ko'rinmasin.
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/use-api";
import { isGuest } from "@/lib/guest";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

type Task = { key: string; text: string; href: string; n: number; weight: number };

/* Uchtadan ko'p ko'rsatilmaydi: bosh sahifa vazifalar ro'yxati
   emas. Web ham shu chegarani ishlatadi. */
const MAX = 3;

/**
 * Vazifa matni: lug'atdan, bo'lmasa serverning zaxira matni.
 *
 * `tOr` o'rin almashtirishni QABUL QILMAYDI (`{n}`), `t` esa kalit
 * yo'q bo'lsa «[missing …]» qaytaradi. Shuning uchun ikki qadam:
 * avval bor-yo'qligi, keyin sonli chaqiruv. Server yangi vazifa
 * turi qo'shsa (lug'at hali ko'chirilmagan bo'lsa) odam
 * «[missing todayCard.x]» emas, o'zbekcha jumlani ko'radi.
 */
function taskText(key: string, fallback: string, n: number): string {
  const k = `todayCard.${key}`;
  return tOr(k, "") ? t(k, { n }) : fallback;
}

export function TodayCard() {
  const router = useRouter();
  /* Mehmonga so'rov YUBORILMAYDI: uning vazifasi ham yo'q va
     javob 401 bo'lardi */
  const { data } = useApi<{ tasks: Task[] }>(isGuest() ? null : "/api/today");

  const tasks = (data?.tasks ?? []).slice(0, MAX);
  if (tasks.length === 0) return null;

  return (
    <View style={s.card}>
      <Text style={s.head}>{t("todayCard.title")}</Text>

      <View style={{ gap: 7, marginTop: 10 }}>
        {tasks.map((x) => (
          <Pressable
            key={x.key}
            onPress={() => {
              const to = webToApp(x.href);
              if (to) router.push(to as Parameters<typeof router.push>[0]);
            }}
            style={({ pressed }) => [s.row, pressed && { backgroundColor: color.muted }]}
          >
            <View style={s.dot} />
            <Text style={s.text} numberOfLines={2}>
              {taskText(x.key, x.text, x.n)}
            </Text>
            <Icon name="chevron" size={15} stroke={color.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginTop: space.md,
    ...shadow.card,
  },
  head: { fontSize: 13.5, fontWeight: "800", color: color.foreground },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.control,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.brand },
  text: { flex: 1, fontSize: 13, color: color.foreground, lineHeight: 18 },
}));
