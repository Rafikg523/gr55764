// POCZĄTEK kodu wygenerowanego przez Codex.
const referrerPolicy = document.createElement("meta");
referrerPolicy.name = "referrer";
referrerPolicy.content = "strict-origin-when-cross-origin";
document.head.append(referrerPolicy);

const size = 400;
const part = size / 4;
const imageryCredit = "Esri, Vantor, Earthstar Geographics, GIS User Community";
const statusText = document.getElementById("status");
const table = document.getElementById("pieces");
const board = document.getElementById("board");
const photo = document.getElementById("photo");
const captureButton = document.getElementById("capture");
let map;
let tiles;
let marker;
let selected = null;
let completed = false;

function message(text) { statusText.textContent = text; }

for (let i = 0; i < 16; i++) {
    const cell = document.createElement("div");
    cell.dataset.index = i;
    cell.tabIndex = 0;
    cell.setAttribute("aria-label", "Pole " + (i + 1));
    Object.assign(cell.style, { border: "1px solid #ccc", boxSizing: "border-box" });
    cell.addEventListener("dragover", event => event.preventDefault());
    cell.addEventListener("drop", event => {
        event.preventDefault();
        placePiece(document.getElementById(event.dataTransfer.getData("text/plain")), cell);
    });
    cell.addEventListener("click", () => placePiece(selected, cell));
    cell.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            placePiece(selected, cell);
        }
    });
    board.append(cell);
}

function scatter(piece, x, y) {
    table.append(piece);
    Object.assign(piece.style, {
        position: "absolute", left: x + "px", top: y + "px"
    });
}

function placePiece(piece, cell) {
    if (!piece || !piece.classList.contains("puzzle") || piece.parentElement === cell) return;
    const previous = piece.parentElement;
    const occupied = cell.firstElementChild;
    if (occupied) {
        if (previous === table) scatter(occupied, parseFloat(piece.style.left), parseFloat(piece.style.top));
        else previous.append(occupied);
    }
    cell.append(piece);
    Object.assign(piece.style, { position: "static", outline: "none" });
    selected = null;
    checkBoard();
}

function checkBoard() {
    const correct = [...board.children].filter(cell =>
        cell.firstElementChild?.dataset.index === cell.dataset.index).length;
    message("Poprawnie ułożone puzzle: " + correct + "/16.");
    if (correct === 16 && !completed) {
        completed = true;
        message("Gratulacje! Wszystkie 16 puzzli jest na swoim miejscu.");
        console.debug("Puzzle ułożone poprawnie: 16/16");
        if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification("Puzzle ułożone!", { body: "Wszystkie 16 elementów jest na swoim miejscu." }); }
            catch { message("Puzzle ułożone! Przeglądarka nie mogła wyświetlić powiadomienia systemowego."); }
        }
    }
    if (correct < 16) completed = false;
}

table.addEventListener("dragover", event => event.preventDefault());
table.addEventListener("drop", event => {
    event.preventDefault();
    const piece = document.getElementById(event.dataTransfer.getData("text/plain"));
    if (!piece || !piece.classList.contains("puzzle")) return;
    const rect = table.getBoundingClientRect();
    scatter(piece, Math.max(0, Math.min(size - part, event.clientX - rect.left - part / 2)),
        Math.max(0, Math.min(size - part, event.clientY - rect.top - part / 2)));
    piece.style.outline = "none";
    selected = null;
    checkBoard();
});

function makePuzzle(image) {
    table.replaceChildren();
    for (const cell of board.children) cell.replaceChildren();
    selected = null;
    completed = false;
    const order = Array.from({ length: 16 }, (_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((index, position) => {
        const piece = document.createElement("canvas");
        piece.width = part;
        piece.height = part;
        piece.id = "piece-" + index;
        piece.className = "puzzle";
        piece.dataset.index = index;
        piece.draggable = true;
        piece.tabIndex = 0;
        piece.setAttribute("aria-label", "Puzzel " + (index + 1));
        Object.assign(piece.style, { width: "100px", height: "100px",
            border: "1px solid #777", boxSizing: "border-box", display: "block" });
        piece.getContext("2d").drawImage(image, index % 4 * part, Math.floor(index / 4) * part,
            part, part, 0, 0, part, part);
        piece.addEventListener("dragstart", event => {
            piece.classList.add("is-dragging");
            event.dataTransfer.setData("text/plain", piece.id);
            event.dataTransfer.effectAllowed = "move";
        });
        piece.addEventListener("dragend", () => {
            piece.classList.remove("is-dragging");
        });
        function select() {
            if (selected) selected.style.outline = "none";
            selected = piece;
            piece.style.outline = "3px solid blue";
        }
        piece.addEventListener("click", event => { event.stopPropagation(); select(); });
        piece.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault(); event.stopPropagation(); select();
            }
        });
        // Losowa kolejność, ale równa siatka 4 × 4 bez przesunięć.
        scatter(piece, position % 4 * part, Math.floor(position / 4) * part);
    });
    message("Mapa pobrana. Ułóż 16 puzzli na planszy.");
}

document.getElementById("notifications").addEventListener("click", async () => {
    if (!("Notification" in window)) return message("Ta przeglądarka nie obsługuje powiadomień.");
    try {
        const permission = await Notification.requestPermission();
        message(permission === "granted" ? "Powiadomienia włączone." :
            "Brak zgody na powiadomienia. Wynik będzie widoczny na stronie.");
    } catch { message("Nie można włączyć powiadomień. Uruchom stronę przez localhost lub HTTPS."); }
});

document.getElementById("location").addEventListener("click", () => {
    if (!map) return message("Poczekaj na załadowanie mapy.");
    if (!navigator.geolocation) return message("Przeglądarka nie obsługuje geolokalizacji.");
    message("Pobieranie lokalizacji…");
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 15);
        if (marker) marker.remove();
        marker = L.circleMarker([latitude, longitude], { radius: 7, color: "red" }).addTo(map);
        message("Twoja lokalizacja: " + latitude.toFixed(6) + ", " + longitude.toFixed(6));
    }, error => message(error.code === 1 ? "Nie udzielono zgody na lokalizację." :
        "Nie udało się pobrać lokalizacji. Spróbuj ponownie."), { timeout: 15000 });
});

// Zapis mapy jak w przykładzie 26-maps-leaflet/leaflet.html.
captureButton.addEventListener("click", function () {
    captureButton.disabled = true;
    message("Pobieranie obrazu mapy…");
    leafletImage(map, function (error, canvas) {
        captureButton.disabled = false;
        if (error) {
            message("Nie udało się pobrać mapy. Spróbuj ponownie.");
            return;
        }
        const rasterContext = photo.getContext("2d");
        rasterContext.clearRect(0, 0, size, size);
        rasterContext.drawImage(canvas, 0, 0, size, size);
        rasterContext.fillStyle = "white";
        rasterContext.fillRect(0, size - 18, size, 18);
        rasterContext.fillStyle = "black";
        rasterContext.font = "11px Arial";
        rasterContext.fillText(imageryCredit, 5, size - 5, size - 10);
        makePuzzle(photo);
    });
});


const leafletStyle = document.createElement("link");
leafletStyle.rel = "stylesheet";
leafletStyle.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
document.head.append(leafletStyle);
const leafletScript = document.createElement("script");
leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
function initializeMap() {
    if (window.location.protocol === "file:") {
        message("Otwórz stronę przez http://localhost:8080 (uruchom: node lab-C/server.cjs).");
        return;
    }
    map = L.map("map", { preferCanvas: true, zoomAnimation: false, fadeAnimation: false }).setView([52.2297, 21.0122], 13);
    tiles = L.tileLayer.provider("Esri.WorldImagery", {
        attribution: 'Źródło: <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">' + imageryCredit + '</a>',
        maxZoom: 19, crossOrigin: true
    }).addTo(map);
    captureButton.disabled = false;
    tiles.on("tileerror", () => message("Nie udało się wczytać kafelka mapy. Sprawdź połączenie."));
    message("Wybierz obszar mapy i kliknij „Pobierz mapę”.");
}
leafletScript.onload = async () => {
    try {
        await loadScript("vendor/leaflet-providers.js");
        await loadScript("vendor/leaflet-image.js");
        initializeMap();
    } catch { message("Nie udało się załadować bibliotek mapy."); }
};
leafletScript.onerror = () => message("Nie udało się załadować Leaflet. Sprawdź połączenie z internetem.");
document.head.append(leafletScript);

function loadScript(source) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
    });
}
// KONIEC kodu wygenerowanego przez Codex.
