(function () {
  const W = window.Weather;
  const $ = (s) => document.querySelector(s);
  const state = { unit: localStorage.getItem("wn:unit") || "c", place: null, data: null, recent: JSON.parse(localStorage.getItem("wn:recent") || "[]") };
  let searchAbort, forecastAbort;

  const unitLabel = () => (state.unit === "f" ? "°F" : "°C");
  const deg = (n) => `${Math.round(n)}°`;
  const hourOf = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dayOf = (iso, i) => (i === 0 ? "Today" : new Date(iso + "T12:00").toLocaleDateString("en-GB", { weekday: "short" }));

  function setState(html) { const el = $("#state"); el.hidden = !html; el.innerHTML = html || ""; }
  function showPanels(show) { ["#current", "#hourly-panel", "#daily-panel"].forEach((s) => ($(s).hidden = !show)); }

  // search + suggestions -------------------------------------------------
  const input = $("#search"), list = $("#suggestions");
  let active = -1, items = [];
  input.addEventListener("input", debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) return hideSuggestions();
    searchAbort?.abort(); searchAbort = new AbortController();
    try { items = await W.searchCities(q, searchAbort.signal); renderSuggestions(); }
    catch (err) { if (err.name !== "AbortError") hideSuggestions(); }
  }, 250));
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); highlight(); }
    if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); highlight(); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
    if (e.key === "Escape") hideSuggestions();
  });
  $("#search-form").addEventListener("submit", (e) => { e.preventDefault(); if (items[0]) choose(items[0]); });
  list.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) choose(items[Number(li.dataset.i)]); });
  input.addEventListener("blur", () => setTimeout(hideSuggestions, 120));
  function renderSuggestions() {
    if (!items.length) return hideSuggestions();
    active = -1;
    list.innerHTML = items.map((c, i) => `<li role="option" data-i="${i}">${esc(c.name)}<small>${esc([c.admin, c.country].filter(Boolean).join(", "))}</small></li>`).join("");
    list.hidden = false;
  }
  function highlight() { [...list.children].forEach((li, i) => li.classList.toggle("active", i === active)); }
  function hideSuggestions() { list.hidden = true; active = -1; }

  function choose(place) {
    hideSuggestions(); input.value = ""; input.blur();
    load(place);
  }

  // recent --------------------------------------------------------------
  function renderRecent() {
    $("#recent").innerHTML = state.recent.map((p, i) => `<button data-recent="${i}">${esc(p.name)}</button>`).join("");
  }
  $("#recent").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) load(state.recent[Number(b.dataset.recent)]); });
  function remember(place) {
    state.recent = [place, ...state.recent.filter((p) => p.label !== place.label)].slice(0, 6);
    localStorage.setItem("wn:recent", JSON.stringify(state.recent));
    renderRecent();
  }

  // geolocation ---------------------------------------------------------
  $("#geo-btn").addEventListener("click", () => {
    if (!navigator.geolocation) return setState("<p>Geolocation is not available in this browser.</p>");
    setState('<p class="loading">Finding your location…</p>');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => load({ name: "My location", label: "My location", lat: coords.latitude, lon: coords.longitude }),
      () => setState("<p>Could not get your location. Search for a city instead.</p>"),
      { timeout: 8000 }
    );
  });

  // unit ----------------------------------------------------------------
  $("#unit-toggle").addEventListener("click", () => {
    state.unit = state.unit === "c" ? "f" : "c";
    localStorage.setItem("wn:unit", state.unit);
    renderUnit();
    if (state.place) load(state.place);
  });
  function renderUnit() { document.querySelectorAll("#unit-toggle span").forEach((s) => s.classList.toggle("on", s.dataset.u === state.unit)); }

  // load + render -------------------------------------------------------
  async function load(place) {
    state.place = place;
    forecastAbort?.abort(); forecastAbort = new AbortController();
    setState('<p class="loading">Loading forecast…</p>');
    try {
      const data = await W.getForecast(place, state.unit, forecastAbort.signal);
      state.data = data;
      remember(place);
      render();
      setState("");
      showPanels(true);
      history.replaceState(null, "", `#${encodeURIComponent(place.label)}`);
    } catch (err) {
      if (err.name === "AbortError") return;
      showPanels(false);
      setState(`<p>Could not load the forecast. ${esc(err.message)}</p>`);
    }
  }

  function render() {
    const { current: c, hourly: h, daily: d, current_units: cu } = state.data;
    const cond = W.describe(c.weather_code, c.is_day === 1);
    document.body.dataset.sky = cond.sky;

    $("#place").textContent = state.place.label;
    $("#updated").textContent = `Updated ${hourOf(c.time)} local time`;
    $("#cond-icon").textContent = cond.icon; $("#cond-text").textContent = cond.text;
    $("#temp").innerHTML = `${Math.round(c.temperature_2m)}<sup>${unitLabel()}</sup>`;
    $("#feels").textContent = deg(c.apparent_temperature);
    $("#humidity").textContent = `${c.relative_humidity_2m}%`;
    $("#wind").textContent = `${Math.round(c.wind_speed_10m)} ${cu.wind_speed_10m} ${W.compass(c.wind_direction_10m)}`;
    $("#precip").textContent = `${c.precipitation} ${cu.precipitation}`;
    $("#uv").textContent = Math.round(c.uv_index ?? 0);
    $("#sun").textContent = `${hourOf(d.sunrise[0])} / ${hourOf(d.sunset[0])}`;

    const start = Math.max(0, h.time.findIndex((t) => t >= c.time));
    $("#hourly").innerHTML = h.time.slice(start, start + 24).map((t, i) => {
      const idx = start + i, hc = W.describe(h.weather_code[idx], h.is_day[idx] === 1);
      return `<div class="hour"><span>${i === 0 ? "Now" : hourOf(t)}</span><span class="hour-icon" title="${hc.text}">${hc.icon}</span><strong>${deg(h.temperature_2m[idx])}</strong><small>${h.precipitation_probability[idx] ? `💧${h.precipitation_probability[idx]}%` : "&nbsp;"}</small></div>`;
    }).join("");

    const min = Math.min(...d.temperature_2m_min), max = Math.max(...d.temperature_2m_max), span = Math.max(1, max - min);
    $("#daily").innerHTML = d.time.map((t, i) => {
      const dc = W.describe(d.weather_code[i]);
      const left = ((d.temperature_2m_min[i] - min) / span) * 100, width = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / span) * 100;
      return `<li>
        <span class="day">${dayOf(t, i)}</span>
        <span class="day-icon" title="${dc.text}">${dc.icon}</span>
        <span class="day-rain">${d.precipitation_probability_max[i] ? `💧 ${d.precipitation_probability_max[i]}%` : ""}</span>
        <span class="lo">${deg(d.temperature_2m_min[i])}</span>
        <span class="range"><i style="left:${left}%;width:${Math.max(width, 4)}%"></i></span>
        <span class="hi">${deg(d.temperature_2m_max[i])}</span>
      </li>`;
    }).join("");
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]); }

  // init ----------------------------------------------------------------
  renderUnit(); renderRecent();
  const fromHash = decodeURIComponent(location.hash.slice(1));
  const start = state.recent.find((p) => p.label === fromHash) || state.recent[0];
  if (start) load(start);
})();
