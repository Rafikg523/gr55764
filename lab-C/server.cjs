// Uruchom z katalogu projektu: node lab-C/server.cjs
// Następnie otwórz http://localhost:8080
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const files = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/index.html": ["index.html", "text/html; charset=utf-8"],
    "/scripts.js": ["scripts.js", "text/javascript; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
    "/vendor/leaflet-image.js": ["vendor/leaflet-image.js", "text/javascript; charset=utf-8"],
    "/vendor/leaflet-providers.js": ["vendor/leaflet-providers.js", "text/javascript; charset=utf-8"]
};

http.createServer((request, response) => {
    const file = files[new URL(request.url, "http://localhost:8080").pathname];
    if (!file) {
        response.writeHead(404);
        return response.end("Nie znaleziono pliku");
    }
    fs.readFile(path.join(__dirname, file[0]), (error, content) => {
        if (error) {
            response.writeHead(500);
            return response.end("Nie mozna odczytac pliku");
        }
        response.writeHead(200, {
            "Content-Type": file[1],
            "Referrer-Policy": "strict-origin-when-cross-origin"
        });
        response.end(content);
    });
}).listen(8080, "127.0.0.1", () => console.log("Otworz http://localhost:8080"));
