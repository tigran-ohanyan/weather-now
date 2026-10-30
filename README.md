# Weather Now

Weather app in plain HTML, CSS and JavaScript. City search with suggestions, current conditions,
24-hour strip and 7-day forecast. Data comes from the free [Open-Meteo](https://open-meteo.com/) API,
so there is no API key to manage and nothing to deploy besides static files.

**Live:** https://tigran-ohanyan.github.io/weather-now/

## Features

- City search with debounced suggestions and keyboard navigation (↑ ↓ Enter Esc)
- "Use my location" via the Geolocation API
- Current temperature, feels-like, humidity, wind with direction, precipitation, UV index, sunrise and sunset
- Hourly forecast for the next 24 hours with precipitation probability
- 7-day forecast with min/max range bars scaled to the week
- °C / °F toggle, recent cities and unit remembered in `localStorage`
- Background changes with the weather: clear, cloudy, rain, snow, storm, night
- In-flight requests are cancelled with `AbortController` when you search again
- Shareable URL: the selected city is kept in the hash

## Structure

```
index.html
css/style.css     layout, weather themes via body[data-sky]
js/weather.js     Open-Meteo client: geocoding, forecast, WMO code → text/icon
js/app.js         UI state, search, rendering
```

## Run locally

Any static server works:

```bash
python -m http.server 8000
```

## License

MIT
