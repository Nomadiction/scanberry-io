interface CircularGaugeProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
}

/**
 * Круговой индикатор: дуга и число в центре берутся из одного `value`
 * (например из useCountUp), поэтому заполнение и проценты всегда совпадают.
 */
export function CircularGauge({
  value,
  size = 100,
  strokeWidth = 6,
  color,
  label,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const strokeDashoffset = circumference * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/40"
            strokeWidth={strokeWidth - 1}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold text-foreground tracking-tight">
            {pct.toFixed(1)}
            <span className="text-[10px] font-semibold text-muted-foreground">%</span>
          </span>
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground font-medium tracking-wide">{label}</span>
    </div>
  );
}
