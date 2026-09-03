/**
 * Aloqa holati.
 *
 * NEGA `expo-network`, alohida kutubxona emas: SDK 54 bilan birga
 * keladi va bizga faqat ikkita savol kerak — internet bormi va
 * Wi-Fi'dami. Ikkinchisi og'ir suratlarni ushlab turish uchun:
 * chegarada mobil internet qimmat va sekin, 3 MB surat butun
 * navbatni to'sib qo'yardi.
 *
 * ⚠️ «Ulangan» ≠ «internet bor». Wi-Fi'ga ulanib turib ham internet
 * bo'lmasligi mumkin (mehmonxona, chegara postidagi ochiq tarmoq).
 * `isInternetReachable` aynan shuni tekshiradi; u `null` qaytarsa
 * (hali aniqlanmagan) BOR deb hisoblaymiz — yuborib ko'rish
 * yuborishdan bosh tortishdan yaxshi.
 */
import * as Network from "expo-network";

export async function isOnline(): Promise<boolean> {
  try {
    const s = await Network.getNetworkStateAsync();
    if (!s.isConnected) return false;
    return s.isInternetReachable !== false;
  } catch {
    // Holatni bilib bo'lmadi — urinib ko'ramiz
    return true;
  }
}

export async function isWifi(): Promise<boolean> {
  try {
    const s = await Network.getNetworkStateAsync();
    return s.type === Network.NetworkStateType.WIFI;
  } catch {
    return false;
  }
}

/** Ekranlar uchun: holat va u o'zgarganda xabar */
export type NetState = { online: boolean; wifi: boolean };

export async function netState(): Promise<NetState> {
  return { online: await isOnline(), wifi: await isWifi() };
}
