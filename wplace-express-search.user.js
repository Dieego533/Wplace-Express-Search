// ==UserScript==
// @name         Wplace Quick Search Floating Side
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  Búsqueda rápida con historial, botón flotante lateral, iconos personalizados y gestión de historial
// @match        https://wplace.live/*
// @grant        GM_xmlhttpRequest
// @connect      nominatim.openstreetmap.org
// @license      MIT
// ==/UserScript==

(() => {
  "use strict";

  const STORAGE_KEY = "wqs_history_v3";
  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  };
  const saveHistory = (h) => localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 3)));

  const addToHistory = (item) => {
    const hist = loadHistory();
    const exists = hist.find(h =>
      (h.display_name && h.display_name === item.display_name) ||
      (h.lat === item.lat && h.lon === item.lon)
    );
    const next = [item, ...hist.filter(h => h !== exists)];
    saveHistory(next);
  };

  const removeFromHistory = (lat, lon) => {
    const hist = loadHistory().filter(h => !(String(h.lat) === String(lat) && String(h.lon) === String(lon)));
    saveHistory(hist);
    renderHistory();
  };

  const toast = (msg, tone = "error") => {
    const t = document.createElement("div");
    t.className = "wqs-toast";
    t.textContent = msg;
    t.dataset.tone = tone;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 200);
    }, 2600);
  };

  const navigateTo = ({ lat, lon, zoom = 12 }) => {
    window.location.href = `https://wplace.live/?lat=${lat}&lng=${lon}&zoom=${zoom}`;
  };

  const LATLON_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*@\s*(\d+(?:\.\d+)?))?\s*$/;
  const isLatLon = (txt) => LATLON_RE.test(txt);

  const fetchOSM = (q, cb) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`,
      headers: { "Accept": "application/json" },
      onload: (r) => {
        try {
          const data = JSON.parse(r.responseText || "[]");
          const items = (data || []).map(d => ({
            display_name: d.display_name,
            lat: d.lat, lon: d.lon
          }));
          cb(null, items);
        } catch (e) {
          cb(e);
        }
      },
      onerror: () => { cb(new Error("Error de red")); }
    });
  };

  const style = document.createElement("style");
  style.textContent = `
    .wqs-fab {
      position: fixed; top: 50%; left: 10px;
      transform: translateY(-50%);
      background: #2563eb; color: white;
      border-radius: 50%; width: 44px; height: 44px; /* más pequeño */
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      z-index: 999999;
      user-select: none;
    }
    .wqs-fab:hover { background: #1d4ed8; }

    .wqs-wrap {
      position: fixed; top: 50%; left: 64px;
      transform: translateY(-50%);
      background: #fff; padding: 10px;
      border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
      z-index: 999999; display: none; min-width: 280px; max-width: 400px;
      font-family: sans-serif;
    }
    .wqs-input {
      width: 100%; padding: 6px 8px; font-size: 14px;
      border: 1px solid #ccc; border-radius: 6px;
      outline: none; color: #000; background: #fff;
    }
    .wqs-list {
      list-style: none; padding: 0; margin-top: 14px;
      max-height: 200px; overflow-y: auto; position: relative;
    }

    .wqs-item {
      padding: 6px 8px; cursor: pointer;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px;
      max-width: 380px;
    }
    .wqs-item:hover { background: #f5f5f5; }
    .wqs-item-left {
      display: inline-flex; align-items: center; gap: 6px; min-width: 0;
    }
    .wqs-item-left span {
      display: inline-block; max-width: 300px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* Botón X por ítem */
    .wqs-remove {
      flex: 0 0 auto;
      width: 18px; height: 18px;
      line-height: 16px; text-align: center;
      border-radius: 5px;
      border: 1px solid #f87171;
      color: #b91c1c;
      background: #fee2e2;
      font-weight: 700; font-size: 12px;
      cursor: pointer; user-select: none;
    }
    .wqs-remove:hover { background: #fecaca; border-color: #ef4444; color: #991b1b; }

    .wqs-toast {
      position: fixed; top: 64px; left: 50%;
      transform: translateX(-50%);
      background: #ef4444; color: #fff;
      padding: 8px 14px; border-radius: 8px;
      box-shadow: 0 6px 18px rgba(0,0,0,.25);
      opacity: 0; transition: opacity .2s ease;
      z-index: 2147483647; font-size: 13px; font-weight: 600;
    }
    .wqs-toast[data-tone="ok"] { background: #16a34a; }
    .wqs-toast.show { opacity: 1; }
  `;
  document.head.appendChild(style);

  const fab = document.createElement("div");
  fab.className = "wqs-fab";
  fab.textContent = "🔍";
  document.body.appendChild(fab);

  const wrap = document.createElement("div");
  wrap.className = "wqs-wrap";
  wrap.innerHTML = `
    <input class="wqs-input" type="text" placeholder="Buscar lugar o 'lat,lng'..." />
    <ul class="wqs-list"></ul>
  `;
  document.body.appendChild(wrap);

  const input = wrap.querySelector(".wqs-input");
  const list = wrap.querySelector(".wqs-list");

  const renderHistory = () => {
    const hist = loadHistory();
    list.innerHTML = "";

    if (!hist.length) {
      list.innerHTML = `<li style="padding:4px;color:#777">Sin historial</li>`;
      return;
    }

    hist.forEach(h => {
      const li = document.createElement("li");
      li.className = "wqs-item";
      li.dataset.lat = h.lat;
      li.dataset.lon = h.lon;

      // Contenido izquierdo (icono + texto)
      const left = document.createElement("div");
      left.className = "wqs-item-left";
      left.innerHTML = `📍 <span>${h.display_name}</span>`;

      // Botón X
      const x = document.createElement("button");
      x.className = "wqs-remove";
      x.type = "button";
      x.textContent = "×";
      x.title = "Quitar de historial";

      // Quitar solo este
      x.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        removeFromHistory(h.lat, h.lon);
      });

      li.appendChild(left);
      li.appendChild(x);
      list.appendChild(li);
    });
  };

  const renderResults = (items) => {
    if (!items.length) {
      list.innerHTML = `<li style="padding:4px;color:#777">Sin resultados</li>`;
      return;
    }
    list.innerHTML = items.map(it => `
      <li class="wqs-item" data-lat="${it.lat}" data-lon="${it.lon}">
        <div class="wqs-item-left"><span>${it.display_name}</span></div>
      </li>
    `).join("");
  };

  fab.addEventListener("click", () => {
    wrap.style.display = wrap.style.display === "block" ? "none" : "block";
    if (wrap.style.display === "block") {
      input.focus();
      renderHistory();
    }
  });

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }
  let currentSearchId = 0;

  const buscar = (val) => {
    const searchId = ++currentSearchId;
    if (isLatLon(val)) {
      const [, lat, lon] = val.match(LATLON_RE);
      renderResults([{ display_name: `${lat}, ${lon}`, lat, lon }]);
      return;
    }
    fetchOSM(val, (err, items) => {
      if (searchId !== currentSearchId) return;
      if (err) {
        list.innerHTML = `<li style="padding:4px;color:#777">Error de búsqueda</li>`;
        return;
      }
      renderResults(items);
    });
  };

  input.addEventListener("input", debounce(e => {
    const val = e.target.value.trim();
    if (!val) {
      renderHistory();
      return;
    }
    buscar(val);
  }, 350));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (!val) return;
      if (isLatLon(val)) {
        const [, lat, lon, zoom] = val.match(LATLON_RE);
        addToHistory({ display_name: `${lat}, ${lon}`, lat, lon, zoom });
        navigateTo({ lat, lon, zoom });
        return;
      }
      fetchOSM(val, (err, items) => {
        if (err || !items.length) {
          toast("Sin resultados");
          return;
        }
        addToHistory({
          display_name: items[0].display_name,
          lat: items[0].lat,
          lon: items[0].lon
        });
        navigateTo({ lat: items[0].lat, lon: items[0].lon });
      });
    }
  });

  // Navegar al hacer click en un item
  list.addEventListener("click", (e) => {
    if ((e.target)?.classList?.contains("wqs-remove")) return;
    const item = e.target.closest(".wqs-item");
    if (!item) return;
    const lat = item.dataset.lat;
    const lon = item.dataset.lon;
    const histItem = loadHistory().find(h => String(h.lat) === String(lat) && String(h.lon) === String(lon)) || {
      display_name: item.textContent.trim(),
      lat,
      lon
    };
    addToHistory(histItem);
    navigateTo({ lat, lon });
  });

})();
