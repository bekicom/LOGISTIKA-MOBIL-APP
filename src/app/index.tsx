/**
 * Kirish nuqtasi — hech narsa chizmaydi, faqat yo'naltiradi.
 *
 * Sessiya tekshirilgunicha bo'sh to'q ekran turadi: bu splash bilan bir
 * xil rangda, shuning uchun foydalanuvchi «miltillash» ko'rmaydi.
 */
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { color } from "@/lib/theme";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={color.brand} />
      </View>
    );
  }

  return <Redirect href={user ? "/bosh" : "/til"} />;
}
