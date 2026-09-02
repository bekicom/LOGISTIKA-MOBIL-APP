/**
 * Transport turlari — har biriga O'Z shakli.
 *
 * Nega bitta umumiy mashina emas: haydovchi shaklni so'zdan tez taniydi,
 * va bu 8 tilda ham ishlaydi — «Ref» ni o'qimasdan muzlatgichni ko'radi.
 * Kalitlar bazadagi `VehicleType.key` bilan bir xil.
 */
import Svg, { Circle, Path } from "react-native-svg";

type Props = { type: string; size?: number; color?: string };

export function TruckIcon({ type, size = 30, color = "#64748b" }: Props) {
  const p = { stroke: color, strokeWidth: 1.7, strokeLinejoin: "round" as const, fill: "none" };
  const w = size;
  const h = Math.round((size * 24) / 40);

  return (
    <Svg width={w} height={h} viewBox="0 0 40 24" fill="none">
      {/* Kichik yuk mashinalari — ochiq kuzov */}
      {(type === "labo" || type === "bongo") && (
        <>
          <Path {...p} d="M3 18V8h12l4 5h4v5" />
          <Path {...p} d="M23 18h6v-5l-3-4h-3" />
          <Circle {...p} cx={10} cy={19} r={2.6} />
          <Circle {...p} cx={28} cy={19} r={2.6} />
        </>
      )}

      {/* Yopiq furgon */}
      {type === "furgon" && (
        <>
          <Path {...p} d="M4 18V6h24l6 6v6" />
          <Circle {...p} cx={12} cy={19} r={2.6} />
          <Circle {...p} cx={29} cy={19} r={2.6} />
        </>
      )}

      {/* Isuzu — kabina + qutili kuzov */}
      {(type === "isuzu" || type === "isuzu10") && (
        <>
          <Path {...p} d="M3 18V9h8l3 4v5" />
          <Path {...p} d={type === "isuzu10" ? "M14 4h23v14H14z" : "M14 5h23v13H14z"} />
          <Circle {...p} cx={9} cy={19} r={2.6} />
          <Circle {...p} cx={28} cy={19} r={2.6} />
          {type === "isuzu10" && <Circle {...p} cx={34} cy={19} r={2.6} />}
        </>
      )}

      {/* Tent — yumshoq usti, tepasida chiziq */}
      {type === "tent" && (
        <>
          <Path {...p} d="M2 18V10h7l3 4v4" />
          <Path {...p} d="M12 18V7c0-1 1-2 2-2h20c1 0 2 1 2 2v11" />
          <Path {...p} d="M12 9h26" />
          <Circle {...p} cx={8} cy={19} r={2.6} />
          <Circle {...p} cx={28} cy={19} r={2.6} />
          <Circle {...p} cx={34} cy={19} r={2.6} />
        </>
      )}

      {/* Fura — uzun tirkama */}
      {type === "fura" && (
        <>
          <Path {...p} d="M2 18V9h6l3 4v5" />
          <Path {...p} d="M12 4h26v14H12z" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={27} cy={19} r={2.6} />
          <Circle {...p} cx={34} cy={19} r={2.6} />
        </>
      )}

      {/* Izoterm — devorida qatlam chizig'i */}
      {type === "izoterm" && (
        <>
          <Path {...p} d="M2 18V9h6l3 4v5" />
          <Path {...p} d="M12 4h26v14H12z" />
          <Path {...p} d="M17 8h5M17 12h5" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={30} cy={19} r={2.6} />
        </>
      )}

      {/* Ref — muzlatgich, qor belgisi */}
      {type === "ref" && (
        <>
          <Path {...p} d="M2 18V9h6l3 4v5" />
          <Path {...p} d="M12 4h26v14H12z" />
          <Path {...p} d="M25 7v8M21 11h8M22.5 8.5l5 5M27.5 8.5l-5 5" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={30} cy={19} r={2.6} />
        </>
      )}

      {/* Konteyner — vertikal qovurg'alar */}
      {type === "konteyner" && (
        <>
          <Path {...p} d="M2 18V9h6l3 4v5" />
          <Path {...p} d="M12 5h26v13H12z" />
          <Path {...p} d="M17 5v13M22 5v13M27 5v13M32 5v13" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={30} cy={19} r={2.6} />
        </>
      )}

      {/* Avtovoz — ikki qavatli */}
      {type === "avtovoz" && (
        <>
          <Path {...p} d="M2 18V10h6l3 4v4" />
          <Path {...p} d="M12 18v-4h26v4M12 14l4-5h18l4 5" />
          <Path {...p} d="M18 14V9M28 14V9" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={30} cy={19} r={2.6} />
        </>
      )}

      {/* Platforma — tekis, devorsiz */}
      {type === "platforma" && (
        <>
          <Path {...p} d="M2 18V10h6l3 4v4" />
          <Path {...p} d="M12 14h26v4H12z" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={27} cy={19} r={2.6} />
          <Circle {...p} cx={34} cy={19} r={2.6} />
        </>
      )}

      {/* Tral — o'rtasi past */}
      {type === "tral" && (
        <>
          <Path {...p} d="M2 18V10h6l3 4v4" />
          <Path {...p} d="M12 14h6l3-4h10l3 4h2v4H12z" />
          <Circle {...p} cx={7} cy={19} r={2.6} />
          <Circle {...p} cx={25} cy={19} r={2.6} />
          <Circle {...p} cx={32} cy={19} r={2.6} />
        </>
      )}

      {/* Boshqa — savol belgisi */}
      {(type === "boshqa" || !KNOWN.includes(type)) && (
        <>
          <Circle {...p} cx={20} cy={12} r={9} />
          <Path {...p} strokeLinecap="round" d="M17 9.5a3 3 0 1 1 3 3.5v1.5M20 17.5h.01" />
        </>
      )}
    </Svg>
  );
}

const KNOWN = [
  "labo", "bongo", "furgon", "isuzu", "isuzu10", "tent", "fura",
  "izoterm", "ref", "konteyner", "avtovoz", "platforma", "tral", "boshqa",
];
