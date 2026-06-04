const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const weatherIcons = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌦️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "🌨️",
  80: "🌦️",
  81: "🌧️",
  82: "🌧️",
  95: "⛈️"
};

export async function getOpenMeteoWeather(options = {}) {
  const {
    latitude = 64.1466,
    longitude = -21.9426,
    timezone = "Atlantic/Reykjavik",
    location = "Reykjavik"
  } = options;

  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("timezone", timezone);

  url.searchParams.set("current", [
    "temperature_2m",
    "apparent_temperature",
    "weather_code",
    "wind_speed_10m"
  ].join(","));

  url.searchParams.set("daily", [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min"
  ].join(","));

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo failed: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const daily = data.daily || {};

    const forecast = (daily.time || []).slice(0, 4).map((date, index) => ({
      date,
      icon: weatherIcons[daily.weather_code?.[index]] || "🌡️",
      max: Math.round(daily.temperature_2m_max?.[index]),
      min: Math.round(daily.temperature_2m_min?.[index])
    }));

    return {
      source: "Open-Meteo",
      location,
      icon: weatherIcons[current.weather_code] || "🌡️",
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      windSpeed: Math.round(current.wind_speed_10m),
      weatherCode: current.weather_code,
      updatedAt: current.time,
      forecast,
      label: `${Math.round(current.temperature_2m)}°C · wind ${Math.round(current.wind_speed_10m)} km/h`
    };
  } catch {
    return null;
  }
}