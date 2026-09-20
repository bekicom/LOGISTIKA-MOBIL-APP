/**
 * Kirish nuqtasi — hech narsa chizmaydi, faqat yo'naltiradi.
 *
 * Sessiya tekshirilgunicha bo'sh to'q ekran turadi: bu splash bilan bir
 * xil rangda, shuning uchun foydalanuvchi «miltillash» ko'rmaydi.
 */
import { useCallback, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { t } from "@/lib/i18n";
import { color, space, themed } from "@/lib/theme";

/** Server javob bermaganda o'zi qayta urinish oralig'i */
const QAYTA_MS = 10_000;

export default function Index() {
  const { user, loading, aloqaYoq } = useAuth();

  if (loading) {
    return (
      <View style={s.ekran}>
        <ActivityIndicator color={color.brand} />
      </View>
    );
  }

  /* MEHMON YUKLARGA TUSHADI, bosh sahifaga emas: `/api/home`
     kirish talab qiladi va bosh sahifa mehmonda bo'sh chiqardi.
     Yuklar ro'yxati esa ilovaning ochiq o'zagi. */
  if (user) return <Redirect href="/bosh" />;
  /* Token bor, server javob bermadi — kirish ekraniga EMAS
     (`auth-context.tsx` dagi izoh) */
  if (aloqaYoq) return <AloqaYoq />;
  if (isGuest()) return <Redirect href="/yuklar" />;
  return <Redirect href="/til" />;
}

function AloqaYoq() {
  const { refresh } = useAuth();
  const [urinmoqda, setUrinmoqda] = useState(false);

  const urin = useCallback(async () => {
    setUrinmoqda(true);
    try {
      await refresh();
    } finally {
      setUrinmoqda(false);
    }
  }, [refresh]);

  /* O'zi ham urinadi: deploy tugashi yoki internet qaytishi odam
     tugma bosishini kutib turmasin */
  useEffect(() => {
    const id = setInterval(() => void urin(), QAYTA_MS);
    return () => clearInterval(id);
  }, [urin]);

  return (
    <View style={[s.ekran, s.aloqa]}>
      <Text style={s.sarlavha}>{t("mob.outbox.offline")}</Text>
      <Text style={s.izoh}>{t("mob.err.network")}</Text>
      <Button title={t("mob.ui.retry")} onPress={urin} loading={urinmoqda} />
    </View>
  );
}

/* `themed` — `StyleSheet.create` EMAS: ranglar modul yuklanganda
   muzlab qolmasin, rejim o'zgarganda yangilansin (`test-dark-mobile`) */
const s = themed(() => ({
  ekran: { flex: 1, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  aloqa: { paddingHorizontal: space.xl, gap: space.md },
  sarlavha: { color: color.navyForeground, fontSize: 18, fontWeight: "700", textAlign: "center" },
  izoh: { color: color.navyForeground, opacity: 0.75, fontSize: 15, textAlign: "center", marginBottom: space.sm },
}));
