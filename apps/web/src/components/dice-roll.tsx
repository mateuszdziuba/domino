import { useEffect, useRef, useState } from "react";

export type DiceSpec = { sides: number; value: number };

const FILL = "#f6ead0";
const STROKE = "#a97e1f";

function d6Pips(value: number) {
  const pips: Record<number, [number, number][]> = {
    1: [[20, 20]],
    2: [[11, 11], [29, 29]],
    3: [[11, 11], [20, 20], [29, 29]],
    4: [[11, 11], [29, 11], [11, 29], [29, 29]],
    5: [[11, 11], [29, 11], [20, 20], [11, 29], [29, 29]],
    6: [[11, 11], [29, 11], [11, 20], [29, 20], [11, 29], [29, 29]],
  };
  return pips[value] ?? [];
}

function DieFace({ sides, value }: { sides: number; value: number }) {
  const shapes: Record<number, string> = {
    4: "20,5 36,35 4,35",
    6: "4,4 36,4 36,36 4,36",
    8: "20,2 38,20 20,38 2,20",
    10: "20,1 37,13 31,37 9,37 3,13",
    12: "20,1 36,11 32,36 8,36 4,11",
    20: "20,2 37,35 3,35",
  };
  const points = shapes[sides] ?? shapes[6]!;
  if (sides === 6) {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect x="4" y="4" width="32" height="32" rx="5" fill={FILL} stroke={STROKE} strokeWidth="2" />
        {d6Pips(value).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.4" fill="#7a4b1d" />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      <polygon points={points} fill={FILL} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="#7a4b1d"
        fontFamily="Georgia, serif"
      >
        {value}
      </text>
    </svg>
  );
}

export function DiceRollDisplay({
  dice,
  bonus = 0,
  total,
  className,
}: {
  dice: DiceSpec[];
  bonus?: number;
  total?: number;
  className?: string;
}) {
  const [phase, setPhase] = useState<"rolling" | "done">("rolling");
  const [faces, setFaces] = useState<number[]>(() => dice.map(() => 1));
  const finalRef = useRef(dice.map((d) => d.value));
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setPhase("rolling");
    setFaces(dice.map(() => 1 + Math.floor(Math.random() * dice[0]!.sides)));
    const interval = window.setInterval(() => {
      setFaces((prev) =>
        prev.map((_, i) => 1 + Math.floor(Math.random() * dice[i]!.sides)),
      );
    }, 70);
    timerRef.current = window.setTimeout(() => {
      window.clearInterval(interval);
      setFaces(finalRef.current);
      setPhase("done");
    }, 1000);
    return () => {
      window.clearInterval(interval);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [dice]);

  const showBonus = bonus !== 0;
  const showTotal = total !== undefined && phase === "done";

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <div className="flex items-center gap-1.5">
        {dice.map((die, i) => (
          <div
            key={i}
            className={`h-9 w-9 ${phase === "rolling" ? "animate-dice-tumble" : ""}`}
            style={{
              animationDuration: `${900 + i * 90}ms`,
              animationDelay: `${i * 60}ms`,
            }}
          >
            <DieFace sides={die.sides} value={faces[i] ?? 1} />
          </div>
        ))}
        {showTotal && (
          <span className="ml-1 font-display text-sm tracking-[0.06em] text-[#7a4b1d]">
            {showBonus ? `${faces[0] ?? 0} + ${bonus} = ` : ""}
            {total}
          </span>
        )}
      </div>
    </div>
  );
}
