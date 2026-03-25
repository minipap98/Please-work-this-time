import { useQuery } from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────

export interface CurrentWeather {
  temperature: number; // °F
  windSpeed: number; // mph
  precipitation: number; // mm
  waveHeight: number; // ft
  wavePeriod: number; // seconds
}

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  tempMax: number; // °F
  tempMin: number; // °F
  windSpeedMax: number; // mph
  precipitationSum: number; // mm
  waveHeightMax: number; // ft
}

export type BoatingCondition = "good" | "caution" | "stay-in";

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  /** Overall boating condition based on current weather */
  boatingCondition: BoatingCondition;
  /** Whether conditions are suitable for maintenance work (no rain, low wind) */
  goodForMaintenance: boolean;
}

// ─── Condition logic ─────────────────────────────────────────

export function getBoatingCondition(
  windSpeed: number,
  waveHeight: number,
  precipitation: number,
): BoatingCondition {
  if (windSpeed > 25 || waveHeight > 6 || precipitation > 5) return "stay-in";
  if (windSpeed > 15 || waveHeight > 3 || precipitation > 1) return "caution";
  return "good";
}

export function getDayCondition(day: DailyForecast): BoatingCondition {
  return getBoatingCondition(day.windSpeedMax, day.waveHeightMax, day.precipitationSum);
}

export function isGoodForMaintenance(windSpeed: number, precipitation: number): boolean {
  return windSpeed <= 12 && precipitation < 0.5;
}

// ─── Fetcher ─────────────────────────────────────────────────

interface ForecastResponse {
  current: {
    temperature_2m: number;
    windspeed_10m: number;
    precipitation: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
  };
}

interface MarineResponse {
  current: {
    wave_height: number;
    wave_period: number;
  };
  daily: {
    time: string[];
    wave_height_max: number[];
  };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const [forecastRes, marineRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max` +
        `&current=temperature_2m,windspeed_10m,precipitation` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph` +
        `&timezone=America/New_York&forecast_days=7`,
    ),
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
        `&daily=wave_height_max` +
        `&current=wave_height,wave_period` +
        `&length_unit=imperial` +
        `&timezone=America/New_York&forecast_days=7`,
    ),
  ]);

  if (!forecastRes.ok) throw new Error(`Forecast API error: ${forecastRes.status}`);
  if (!marineRes.ok) throw new Error(`Marine API error: ${marineRes.status}`);

  const forecast: ForecastResponse = await forecastRes.json();
  const marine: MarineResponse = await marineRes.json();

  const current: CurrentWeather = {
    temperature: Math.round(forecast.current.temperature_2m),
    windSpeed: Math.round(forecast.current.windspeed_10m),
    precipitation: forecast.current.precipitation,
    waveHeight: Math.round(marine.current.wave_height * 10) / 10,
    wavePeriod: Math.round(marine.current.wave_period),
  };

  const daily: DailyForecast[] = forecast.daily.time.map((date, i) => ({
    date,
    tempMax: Math.round(forecast.daily.temperature_2m_max[i]),
    tempMin: Math.round(forecast.daily.temperature_2m_min[i]),
    windSpeedMax: Math.round(forecast.daily.windspeed_10m_max[i]),
    precipitationSum: Math.round(forecast.daily.precipitation_sum[i] * 10) / 10,
    waveHeightMax: marine.daily.wave_height_max[i]
      ? Math.round(marine.daily.wave_height_max[i] * 10) / 10
      : 0,
  }));

  return {
    current,
    daily,
    boatingCondition: getBoatingCondition(current.windSpeed, current.waveHeight, current.precipitation),
    goodForMaintenance: isGoodForMaintenance(current.windSpeed, current.precipitation),
  };
}

// ─── Hook ────────────────────────────────────────────────────

export function useWeather(lat = 25.7617, lon = -80.1918) {
  return useQuery<WeatherData>({
    queryKey: ["weather", lat, lon],
    queryFn: () => fetchWeather(lat, lon),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
