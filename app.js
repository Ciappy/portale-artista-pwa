const API_BASE_URL = "https://script.google.com/macros/s/AKfycbwBjmR-AFMSimrtPrNC3vCrrBPY4xlTcMKQzjhy0b12N_lhHjgwFbd5O3jHUXyPONjjEg/exec";

const artistNameEl = document.getElementById("artistName");
const subtitleEl = document.getElementById("subtitle");
const statusTextEl = document.getElementById("statusText");
const eventsListEl = document.getElementById("eventsList");

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(name) || "").trim();
}

function formatDate(dateStr) {
  if (!dateStr) return "Data da definire";

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEventCard(item) {
  const mapsLink = item.LINK_MAPS
    ? `<a class="maps-link" href="${escapeHtml(item.LINK_MAPS)}" target="_blank" rel="noopener noreferrer">Apri mappa</a>`
    : "";

  return `
    <article class="event-card">
      <div class="event-date">${escapeHtml(formatDate(item.DATA))}</div>
      <h3 class="event-title">${escapeHtml(item.NOME_EVENTO || "Evento")}</h3>
      <div class="event-meta">
        <div class="meta-line"><strong>Location:</strong> ${escapeHtml(item.LOCATION || "-")}</div>
        <div class="meta-line"><strong>Orario:</strong> ${escapeHtml(item.ORARIO || "-")}</div>
        <div class="meta-line"><strong>Info:</strong> ${escapeHtml(item.INFO_COMUNI || "-")}</div>
        <div class="meta-line"><strong>Note artista:</strong> ${escapeHtml(item.NOTE_ARTISTA || "-")}</div>
      </div>
      ${mapsLink}
    </article>
  `;
}

function buildSection(title, items, emptyText) {
  const content = items.length
    ? items.map(buildEventCard).join("")
    : `<div class="empty-state">${escapeHtml(emptyText)}</div>`;

  return `
    <section class="events-group">
      <div class="section-title-row">
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="events-list">
        ${content}
      </div>
    </section>
  `;
}

async function loadData() {
  try {
    const artist =
      getQueryParam("artist") ||
      getQueryParam("artista") ||
      "";

    const idArtista =
      getQueryParam("id_artista") ||
      getQueryParam("id") ||
      "";

    if (!artist && !idArtista) {
      artistNameEl.textContent = "Portale Artista";
      subtitleEl.textContent = "Nessun artista selezionato";
      statusTextEl.innerHTML = `<span class="error">Manca il parametro artist o id_artista nell'URL</span>`;
      eventsListEl.innerHTML = `<div class="empty-state">Apri questa app con un link tipo <strong>?id_artista=MUS001</strong> oppure <strong>?artist=Marco%20Caponi</strong>.</div>`;
      return;
    }

    let apiUrl = "";

    if (idArtista) {
      apiUrl = `${API_BASE_URL}?id_artista=${encodeURIComponent(idArtista)}`;
    } else {
      apiUrl = `${API_BASE_URL}?artist=${encodeURIComponent(artist)}`;
    }

    statusTextEl.textContent = "Recupero eventi in corso...";

    const response = await fetch(apiUrl, { method: "GET" });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Errore nel recupero dati");
    }

    const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
    const past = Array.isArray(data.past) ? data.past : [];
    const total = upcoming.length + past.length;

    const displayName = data.artist_name || artist || idArtista || "Portale Artista";

    if (total > 0) {
      subtitleEl.textContent = `${upcoming.length} prossimi • ${past.length} passati`;
      statusTextEl.innerHTML = `<span class="success">Dati caricati correttamente</span>`;
      artistNameEl.textContent = displayName;

      eventsListEl.innerHTML =
        buildSection("Prossimi", upcoming, "Nessun evento imminente.") +
        buildSection("Passati", past, "Nessun evento passato.");
    } else {
      artistNameEl.textContent = displayName;
      subtitleEl.textContent = "Nessun evento trovato";
      statusTextEl.innerHTML = `<span class="error">Nessun dato disponibile per questo artista</span>`;
      eventsListEl.innerHTML = `<div class="empty-state">Non risultano eventi visibili associati a questo artista.</div>`;
    }
  } catch (error) {
    artistNameEl.textContent = "Portale Artista";
    subtitleEl.textContent = "Errore di caricamento";
    statusTextEl.innerHTML = `<span class="error">${escapeHtml(error.message || "Errore sconosciuto")}</span>`;
    eventsListEl.innerHTML = `<div class="empty-state">Si è verificato un problema nel caricamento dei dati.</div>`;
    console.error(error);
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(err => {
      console.error("Service worker non registrato:", err);
    });
  });
}

loadData();
