import React from "react";

type TileProps = {
  tile: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
};

// 筒子（丸）の配置
const CIRCLE_POS: Record<number, [number, number][]> = {
  1: [[50, 54]],
  2: [
    [50, 30],
    [50, 76],
  ],
  3: [
    [50, 22],
    [50, 54],
    [50, 86],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 76],
    [70, 76],
  ],
  5: [
    [30, 22],
    [70, 22],
    [50, 54],
    [30, 86],
    [70, 86],
  ],
  6: [
    [30, 22],
    [70, 22],
    [30, 54],
    [70, 54],
    [30, 86],
    [70, 86],
  ],
  7: [
    [30, 17],
    [70, 17],
    [50, 37],
    [30, 57],
    [70, 57],
    [30, 77],
    [70, 77],
  ],
  8: [
    [25, 20],
    [50, 20],
    [75, 20],
    [25, 50],
    [75, 50],
    [25, 80],
    [50, 80],
    [75, 80],
  ],
  9: [
    [25, 17],
    [50, 17],
    [75, 17],
    [25, 47],
    [50, 47],
    [75, 47],
    [25, 77],
    [50, 77],
    [75, 77],
  ],
};

const MAN_CHARS: Record<number, string> = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
  7: "七",
  8: "八",
  9: "九",
};

// 索子の竹の描画
function renderSouzu(num: number) {
  if (num === 1) {
    // 1索は特徴的なデザイン（緑の太い竹1本）
    return (
      <g>
        <rect x="38" y="20" width="24" height="80" rx="12" fill="#2d7a27" />
        <rect x="33" y="42" width="34" height="8" rx="4" fill="#4caf50" />
        <rect x="33" y="62" width="34" height="8" rx="4" fill="#4caf50" />
      </g>
    );
  }

  // 竹の配置（列数と本数）
  const cols = num <= 3 ? 1 : num <= 6 ? 2 : 3;
  const rowsPerCol = Math.ceil(num / cols);
  const bambooW = 16;
  const bambooH = num <= 3 ? 72 / rowsPerCol - 6 : 50 / rowsPerCol - 4;
  const totalH = rowsPerCol * (bambooH + 4) - 4;
  const startY = (100 - totalH) / 2;

  const positions: [number, number][] = [];
  for (let i = 0; i < num; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const colSpacing = 100 / (cols + 1);
    positions.push([colSpacing * (col + 1), startY + row * (bambooH + 4)]);
  }

  return (
    <g>
      {positions.map(([x, y], i) => (
        <g key={i}>
          <rect
            x={x - bambooW / 2}
            y={y}
            width={bambooW}
            height={bambooH}
            rx={bambooW / 2}
            fill="#2d7a27"
          />
          <rect
            x={x - bambooW / 2 - 2}
            y={y + bambooH * 0.35}
            width={bambooW + 4}
            height={4}
            rx={2}
            fill="#4caf50"
          />
          <rect
            x={x - bambooW / 2 - 2}
            y={y + bambooH * 0.65}
            width={bambooW + 4}
            height={4}
            rx={2}
            fill="#4caf50"
          />
        </g>
      ))}
    </g>
  );
}

// 筒子の丸の描画
function renderPinzu(num: number) {
  const positions = CIRCLE_POS[num] ?? [[50, 54]];
  const r = num === 1 ? 28 : num <= 4 ? 16 : num <= 6 ? 13 : 11;
  const colors = ["#d32f2f", "#1565c0", "#2e7d32"];
  return (
    <g>
      {positions.map(([cx, cy], i) => {
        const color = colors[i % colors.length];
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={color} />
            <circle
              cx={cx}
              cy={cy}
              r={r * 0.6}
              fill="none"
              stroke="white"
              strokeWidth={r * 0.2}
            />
          </g>
        );
      })}
    </g>
  );
}

// 萬子の漢字の描画
function renderManzu(num: number) {
  return (
    <g>
      <text
        x={50}
        y={62}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={38}
        fontWeight="bold"
        fill="#d32f2f"
        fontFamily="serif"
      >
        {MAN_CHARS[num]}
      </text>
      <text
        x={50}
        y={92}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={18}
        fill="#222"
        fontFamily="serif"
      >
        萬
      </text>
    </g>
  );
}

// 字牌の描画
const HONOR_CHARS: Record<number, { char: string; color: string }> = {
  1: { char: "東", color: "#222" },
  2: { char: "南", color: "#222" },
  3: { char: "西", color: "#222" },
  4: { char: "北", color: "#222" },
  5: { char: "白", color: "#aaa" }, // 白はアウトラインのみ
  6: { char: "發", color: "#2d7a27" },
  7: { char: "中", color: "#d32f2f" },
};

function renderHonor(num: number) {
  const info = HONOR_CHARS[num];
  if (!info) return null;

  if (num === 5) {
    // 白：何も描画しない
    return null;
  }

  return (
    <g>
      <text
        x={50}
        y={75}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={52}
        fontWeight="bold"
        fill={info.color}
        fontFamily="serif"
      >
        {info.char}
      </text>
    </g>
  );
}

export default function TileImage({
  tile,
  className = "",
  onClick,
  style,
}: TileProps) {
  const num = parseInt(tile);
  const suit = tile[tile.length - 1];

  return (
    <svg
      width={48}
      height={64}
      viewBox="0 0 100 133"
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      {/* 牌の背景 */}
      <rect
        x="2"
        y="2"
        width="96"
        height="129"
        rx="8"
        ry="8"
        fill="#f5f0e0"
        stroke="#aaa"
        strokeWidth="2"
      />
      <rect
        x="6"
        y="6"
        width="88"
        height="121"
        rx="5"
        ry="5"
        fill="none"
        stroke="#ddd"
        strokeWidth="1"
      />

      {/* 左上の数字 */}
      <text
        x={10}
        y={20}
        fontSize={14}
        fill={
          suit === "m"
            ? "#d32f2f"
            : suit === "s"
              ? "#2d7a27"
              : suit === "z"
                ? "#555"
                : "#1565c0"
        }
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {suit !== "z" ? num : ""}
      </text>

      {suit === "p" && renderPinzu(num)}
      {suit === "s" && renderSouzu(num)}
      {suit === "m" && renderManzu(num)}
      {suit === "z" && renderHonor(num)}
    </svg>
  );
}
