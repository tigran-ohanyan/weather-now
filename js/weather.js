// Open-Meteo helpers: geocoding, forecast and WMO code descriptions. No API key needed.
window.Weather = (function () {
  const GEO = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST = "https://api.open-meteo.com/v1/forecast";

  const CODES = {
    0: ["Clear sky", "☀️", "clear"], 1: ["Mainly clear", "🌤️", "clear"], 2: ["Partly cloudy", "⛅", "cloudy"], 3: ["Overcast", "☁️", "cloudy"],
    45: ["Fog", "🌫️", "cloudy"], 48: ["Rime fog", "🌫️", "cloudy"],
    51: ["Light drizzle", "🌦️", "rain"], 53: ["Drizzle", "🌦️", "rain"], 55: ["Heavy drizzle", "🌧️", "rain"],
    56: ["Freezing drizzle", "🌧️", "rain"], 57: ["Freezing drizzle", "🌧️", "rain"],
    61: ["Light rain", "🌧️", "rain"], 63: ["Rain", "🌧️", "rain"], 65: ["Heavy rain", "🌧️", "rain"],
    66: ["Freezing rain", "🌧️", "rain"], 67: ["Freezing rain", "🌧️", "rain"],
    71: ["Light snow", "🌨️", "snow"], 73: ["Snow", "🌨️", "snow"], 75: ["Heavy snow", "❄️", "snow"], 77: ["Snow grains", "🌨️", "snow"],
    80: ["Rain showers", "🌦️", "rain"], 81: ["Rain showers", "🌧️", "rain"], 82: ["Violent showers", "⛈️", "rain"],
    85: ["Snow showers", "🌨️", "snow"], 86: ["Snow showers", "❄️", "snow"],
    95: ["Thunderstorm", "⛈️", "storm"], 96: ["Thunderstorm, hail", "⛈️", "storm"], 99: ["Thunderstorm, hail", "⛈️", "storm"],
  };

  function describe(code, isDay = true) {
    const [text, icon, sky] = CODES[code] || ["Unknown", "🌡️", "cloudy"];
    const nightIcon = !isDay && (code === 0 || code === 1) ? "🌙" : icon;
    return { text, icon: nightIcon, sky: isDay ? sky : "night" };
  }

  async function getJson(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
    return res.json();
  }

  async function searchCities(query, signal) {
    const url = `${GEO}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
    const data = await getJson(url, signal);
    return (data.results || []).map((r) => ({
      id: r.id, name: r.name, country: r.country, admin: r.admin1,
      lat: r.latitude, lon: r.longitude, timezone: r.timezone,
      label: [r.name, r.admin, r.country].filter(Boolean).join(", "),
    }));
  }

  async function reverseName(lat, lon) {
    // Open-Meteo has no reverse geocoding; use the forecast timezone as a readable fallback.
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }

  async function getForecast({ lat, lon }, unit = "c", signal) {
    const params = new URLSearchParams({
      latitude: lat, longitude: lon, timezone: "auto",
      temperature_unit: unit === "f" ? "fahrenheit" : "celsius",
      wind_speed_unit: unit === "f" ? "mph" : "kmh",
      precipitation_unit: unit === "f" ? "inch" : "mm",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day,uv_index",
      hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
      forecast_days: 7,
    });
    return getJson(`${FORECAST}?${params}`, signal);
  }

  function compass(deg) {
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
  }

  return { searchCities, getForecast, describe, compass, reverseName };
})();
