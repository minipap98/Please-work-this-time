import {
  useWeather,
  type BoatingCondition,
  type DailyForecast,
  getDayCondition,
} from "@/hooks/use-weather";

// ─── Condition helpers ───────────────────────────────────────

const CONDITION_CONFIG: Record<
  BoatingCondition,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  good: {
    label: "Good to Go",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  caution: {
    label: "Use Caution",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  "stay-in": {
    label: "Stay In",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
};

function conditionDot(condition: BoatingCondition) {
  return CONDITION_CONFIG[condition].dot;
}

// ─── Day name helper ─────────────────────────────────────────

function shortDay(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// ─── Icons (inline SVG) ─────────────────────────────────────

function ThermometerIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9V3m0 6a3 3 0 100 6 3 3 0 000-6zm0 6v6"
      />
    </svg>
  );
}

function WindIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"
      />
    </svg>
  );
}

function WaveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2 12c1.5-2 3-3 5-3s3.5 1 5 3 3 3 5 3 3.5-1 5-3"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2 17c1.5-2 3-3 5-3s3.5 1 5 3 3 3 5 3 3.5-1 5-3"
      />
    </svg>
  );
}

function WrenchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      />
    </svg>
  );
}

// ─── Forecast mini-day ──────────────────────────────────────

function ForecastDay({ day, index }: { day: DailyForecast; index: number }) {
  const cond = getDayCondition(day);
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[11px] text-muted-foreground font-medium">{shortDay(day.date, index)}</span>
      <div className={`w-2 h-2 rounded-full ${conditionDot(cond)}`} />
      <span className="text-xs font-semibold text-foreground">{day.tempMax}°</span>
      <span className="text-[10px] text-muted-foreground">{day.tempMin}°</span>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────

function WeatherSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-20 h-4 bg-muted rounded" />
        <div className="ml-auto w-24 h-5 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex-1 h-14 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────

export default function WeatherWidget() {
  const { data, isLoading, isError } = useWeather();

  if (isLoading) return <WeatherSkeleton />;
  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground">Unable to load weather data. Check your connection.</p>
      </div>
    );
  }

  const { current, daily, boatingCondition, goodForMaintenance } = data;
  const condCfg = CONDITION_CONFIG[boatingCondition];

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="text-sm font-semibold text-foreground">Marine Weather</span>
        <span className="text-xs text-muted-foreground">Miami, FL</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${condCfg.bg} ${condCfg.border} ${condCfg.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${condCfg.dot}`} />
            {condCfg.label}
          </span>
        </div>
      </div>

      {/* Current conditions */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
          <ThermometerIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-foreground leading-tight">{current.temperature}°F</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Temp</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
          <WindIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-foreground leading-tight">{current.windSpeed} mph</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Wind</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
          <WaveIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-foreground leading-tight">{current.waveHeight} ft</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Waves</div>
          </div>
        </div>
      </div>

      {/* Maintenance indicator */}
      <div
        className={`flex items-center gap-2 mx-4 mb-3 px-3 py-2 rounded-lg border ${
          goodForMaintenance
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <WrenchIcon
          className={`w-3.5 h-3.5 flex-shrink-0 ${
            goodForMaintenance ? "text-green-600" : "text-amber-600"
          }`}
        />
        <span
          className={`text-xs font-medium ${
            goodForMaintenance ? "text-green-700" : "text-amber-700"
          }`}
        >
          {goodForMaintenance
            ? "Good conditions for outdoor maintenance"
            : "Consider postponing outdoor maintenance (wind/rain)"}
        </span>
      </div>

      {/* 7-day forecast */}
      <div className="border-t border-border px-4 py-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          7-Day Forecast
        </div>
        <div className="flex justify-between">
          {daily.map((day, i) => (
            <ForecastDay key={day.date} day={day} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
