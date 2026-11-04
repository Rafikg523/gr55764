/* CODEX: POCZĄTEK wykonanego fragmentu */
"use strict";

const API_KEY = "7e3b872ff195c4256fabe42fd3f9318e";
const API_BASE = "https://api.openweathermap.org/data/2.5/";
const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city");
const searchButton = document.querySelector("#search-button");
const status = document.querySelector("#status");
const forecastStatus = document.querySelector("#forecast-status");
const forecastGrid = document.querySelector("#forecast");
let requestNumber = 0;

function setText(id, value) {
    document.getElementById(id).textContent = value;
}
function apiUrl(endpoint, city) {
    const params = new URLSearchParams({ q: city, appid: API_KEY, units: "metric", lang: "pl" });
    return `${API_BASE}${endpoint}?${params}`;
}
function apiError(code) {
    if (Number(code) === 404) return "Nie znaleziono miejscowości. Sprawdź nazwę lub dodaj kod kraju, np. Łódź,PL.";
    if (Number(code) === 401) return "Klucz API jest nieaktywny lub nieprawidłowy. Sprawdź swój klucz OpenWeather.";
    if (Number(code) === 429) return "Przekroczono limit zapytań. Spróbuj ponownie za chwilę.";
    return "Nie udało się pobrać danych pogodowych. Spróbuj ponownie później.";
}

function getCurrentWeather(city) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", apiUrl("weather", city), true);
        xhr.responseType = "json";
        xhr.timeout = 15000;
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.main && xhr.response?.weather?.length) {
                console.log("Current Weather — odpowiedź XMLHttpRequest:", xhr.response);
                resolve(xhr.response);
            } else reject(new Error(apiError(xhr.status)));
        };
        xhr.onerror = () => reject(new Error("Brak połączenia z OpenWeather. Sprawdź dostęp do internetu i spróbuj ponownie."));
        xhr.ontimeout = () => reject(new Error("Serwer nie odpowiedział na czas. Spróbuj ponownie."));
        xhr.send();
    });
}

async function getForecast(city) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(apiUrl("forecast", city), { signal: controller.signal });
        if (!response.ok) throw new Error(apiError(response.status));
        const data = await response.json();
        if (!Array.isArray(data.list) || !data.list.length || !data.city) throw new Error("Serwer zwrócił niepełną prognozę. Spróbuj ponownie.");
        console.log("5 day forecast — odpowiedź Fetch API:", data);
        return data;
    } catch (error) {
        if (error.name === "AbortError") throw new Error("Serwer prognozy nie odpowiedział na czas. Spróbuj ponownie.");
        if (error instanceof TypeError) throw new Error("Nie można połączyć się z serwerem prognozy. Sprawdź dostęp do internetu.");
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function temperature(value) { return `${Math.round(value)}°`; }
function localDate(timestamp, offset) { return new Date((timestamp + offset) * 1000); }
function formatDate(timestamp, offset, options) {
    return new Intl.DateTimeFormat("pl-PL", { ...options, timeZone: "UTC" }).format(localDate(timestamp, offset));
}
function weatherSymbol(weather) {
    const code = Number(weather.id);
    if (code < 300) return "⛈";
    if (code < 600) return "☂";
    if (code < 700) return "❄";
    if (code < 800) return "≋";
    if (code === 800) return weather.icon?.endsWith("n") ? "☾" : "☀";
    return code === 801 ? "⛅" : "☁";
}
function renderCurrent(data) {
    const offset = data.timezone || 0;
    setText("location", `${data.name}${data.sys.country ? `, ${data.sys.country}` : ""}`);
    setText("current-date", formatDate(data.dt, offset, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));
    const temp = document.getElementById("temperature");
    temp.replaceChildren(document.createTextNode(String(Math.round(data.main.temp))));
    const unit = document.createElement("span"); unit.textContent = "°C"; temp.append(unit);
    setText("description", data.weather[0].description);
    setText("weather-art", weatherSymbol(data.weather[0]));
    setText("feels-like", temperature(data.main.feels_like));
    setText("temp-min", temperature(data.main.temp_min));
    setText("temp-max", temperature(data.main.temp_max));
    setText("wind", `${Math.round(data.wind.speed * 3.6)} km/h`);
    setText("humidity", `${data.main.humidity}%`);
    setText("pressure", `${data.main.pressure} hPa`);
    setText("visibility", Number.isFinite(data.visibility) ? `${(data.visibility / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km` : "Brak danych");
    for (const event of ["sunrise", "sunset"]) setText(event, data.sys[event] ? formatDate(data.sys[event], offset, { hour: "2-digit", minute: "2-digit" }) : "Brak danych");
}
function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function renderForecast(data) {
    const offset = data.city.timezone || 0;
    const today = localDate(Date.now() / 1000, offset).toISOString().slice(0, 10);
    const days = new Map();
    for (const item of data.list) {
        const day = localDate(item.dt, offset).toISOString().slice(0, 10);
        if (day <= today) continue;
        if (!days.has(day)) days.set(day, []);
        days.get(day).push(item);
    }
    forecastGrid.replaceChildren();
    for (const entries of [...days.values()].slice(0, 5)) {
        const noon = entries.reduce((best, item) => Math.abs(localDate(item.dt, offset).getUTCHours() - 12) < Math.abs(localDate(best.dt, offset).getUTCHours() - 12) ? item : best);
        const card = element("article", "forecast-card");
        const min = Math.min(...entries.map(item => item.main.temp_min));
        const max = Math.max(...entries.map(item => item.main.temp_max));
        const chance = Math.round(Math.max(...entries.map(item => item.pop || 0)) * 100);
        const icon = element("span", "forecast-icon", weatherSymbol(noon.weather[0])); icon.setAttribute("aria-hidden", "true");
        const temps = element("p", "forecast-temps", temperature(max)); temps.append(element("span", "", temperature(min)));
        temps.setAttribute("aria-label", `Maksymalnie ${Math.round(max)}°C, minimalnie ${Math.round(min)}°C`);
        const rain = element("div", "rain", "Szansa opadów"); rain.append(element("span", "", `${chance}%`));
        card.append(element("h3", "", formatDate(noon.dt, offset, { weekday: "long" })), element("p", "forecast-date", formatDate(noon.dt, offset, { day: "numeric", month: "long" })), icon, temps, element("p", "forecast-description", noon.weather[0].description), rain);
        forecastGrid.append(card);
    }
    const tbody = document.getElementById("hourly-body"); tbody.replaceChildren();
    for (const item of data.list) {
        const row = element("tr");
        for (const value of [formatDate(item.dt, offset, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), item.weather[0].description, `${temperature(item.main.temp)}C`, `${Math.round((item.pop || 0) * 100)}%`, `${Math.round(item.wind.speed * 3.6)} km/h`]) row.append(element("td", "", value));
        tbody.append(row);
    }
    document.getElementById("hourly-details").hidden = false;
    forecastStatus.textContent = "";
}
async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) { cityInput.setCustomValidity("Wpisz nazwę miejscowości."); cityInput.reportValidity(); return; }
    const currentRequest = ++requestNumber;
    searchButton.disabled = true;
    searchButton.textContent = "Ładowanie…";
    status.classList.remove("error"); status.textContent = `Sprawdzamy pogodę: ${city}…`;
    forecastStatus.textContent = "Pobieranie prognozy…";
    forecastGrid.replaceChildren();
    document.getElementById("hourly-details").hidden = true;
    document.getElementById("current-section").hidden = true;
    document.getElementById("current-section").setAttribute("aria-busy", "true");
    const [current, forecast] = await Promise.allSettled([getCurrentWeather(city), getForecast(city)]);
    if (currentRequest !== requestNumber) return;
    if (current.status === "fulfilled") {
        renderCurrent(current.value);
        document.getElementById("current-section").hidden = false;
        status.textContent = "";
    } else {
        status.textContent = current.reason.message;
        status.classList.add("error");
    }
    if (forecast.status === "fulfilled") {
        renderForecast(forecast.value);
        if (current.status === "rejected") forecastStatus.textContent = `Prognoza dla ${forecast.value.city.name}. ${forecastStatus.textContent}`;
    } else forecastStatus.textContent = `Prognoza niedostępna: ${forecast.reason.message}`;
    document.getElementById("current-section").setAttribute("aria-busy", "false");
    searchButton.disabled = false; searchButton.textContent = "Pogoda";

}
cityInput.addEventListener("input", () => cityInput.setCustomValidity(""));
form.addEventListener("submit", event => { event.preventDefault(); searchWeather(); });
searchWeather();
/* CODEX: KONIEC wykonanego fragmentu */
