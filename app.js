const API_BASE_URL = "https://script.google.com/macros/s/AKfycbwBjmR-AFMSimrtPrNC3vCrrBPY4xlTcMKQzjhy0b12N_lhHjgwFbd5O3jHUXyPONjjEg/exec";

const artistNameEl = document.getElementById("artistName");
const subtitleEl = document.getElementById("subtitle");
const statusTextEl = document.getElementById("statusText");
const upcomingEventsEl = document.getElementById("upcoming-events");
const pastEventsEl = document.getElementById("past-events");
const tabUpcomingEl = document.getElementById("tab-upcoming");
const tabPastEl = document.getElementById("tab-past");

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

function buildMetaLine(label, value) {
  if (!value) return "";
  return `<div class="meta-line"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`;
}

function getEventStatus(item) {
  return String(
    item.STATO ||
    item.stato ||
    item.Status ||
    item.status ||
    ""
  ).trim();
}

function getStatusBadge(statusRaw) {
  const status = statusRaw.toLowerCase();

  if (status === "confermato") {
    return `<div class="event-status confirmed">CONFERMATO</div>`;
  }

  if (status === "in attesa") {
    return `<div class="event-status pending">IN ATTESA</div>`;
  }

  return "";
}

function buildEventCard(item) {
  const mapsLink = item.LINK_MAPS
    ? `<a class="maps-link" href="${escapeHtml(item.LINK_MAPS)}" target="_blank" rel="noopener noreferrer">Apri mappa</a>`
    : "";

  const eventStatus = getEventStatus(item);
  const normalizedStatus = eventStatus.toLowerCase();

  const cardStatusClass =
    normalizedStatus === "confermato"
      ? "confirmed"
      : normalizedStatus === "in attesa"
        ? "pending"
        : "";

  const statusBadge = getStatusBadge(eventStatus);

  return `
    <article class="event-card ${cardStatusClass}">
      ${statusBadge}
      <div class="event-date">${escapeHtml(formatDate(item.DATA))}</div>
      <h3 class="event-title">${escapeHtml(item.NOME_EVENTO || "Evento")}</h3>
      <div class="event-meta">
        ${buildMetaLine("Stato", eventStatus)}
        ${buildMetaLine("Location", item.LOCATION)}
        ${buildMetaLine("Orario", item.ORARIO)}
        ${buildMetaLine("Info", item.INFO_COMUNI)}
        ${buildMetaLine("Note artista", item.NOTE_ARTISTA)}
      </div>
      ${mapsLink}
    </article>
  `;
}

function buildEventsContent(items, emptyText) {
  if (!items.length) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return items.map(buildEventCard).join("");
}

function activateTab(tabName) {
  const isUpcoming = tabName === "upcoming";

  tabUpcomingEl.classList.toggle("active", isUpcoming);
  tabPastEl.classList.toggle("active", !isUpcoming);

  upcomingEventsEl.classList.toggle("active", isUpcoming);
  pastEventsEl.classList.toggle("active", !isUpcoming);
}

function setupTabs() {
  if (!tabUpcomingEl || !tabPastEl || !upcomingEventsEl || !pastEventsEl) return;

  tabUpcomingEl.addEventListener("click", () => {
    activateTab("upcoming");
  });

  tabPastEl.addEventListener("click", () => {
    activateTab("past");
  });

  activateTab("upcoming");
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
      upcomingEventsEl.innerHTML = `<div class="empty-state">Apri questa app con un link tipo <strong>?id_artista=MUS001</strong> oppure <strong>?artist=Marco%20Caponi</strong>.</div>`;
      pastEventsEl.innerHTML = `<div class="empty-state">Nessun evento passato da mostrare.</div>`;
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

    artistNameEl.textContent = displayName;

    if (total > 0) {
      subtitleEl.textContent = `${upcoming.length} prossimi • ${past.length} passati`;
      statusTextEl.innerHTML = `<span class="success">Dati caricati correttamente</span>`;

      upcomingEventsEl.innerHTML = buildEventsContent(upcoming, "Nessun evento imminente.");
      pastEventsEl.innerHTML = buildEventsContent(past, "Nessun evento passato.");
    } else {
      subtitleEl.textContent = "Nessun evento trovato";
      statusTextEl.innerHTML = `<span class="error">Nessun dato disponibile per questo artista</span>`;
      upcomingEventsEl.innerHTML = `<div class="empty-state">Non risultano eventi imminenti associati a questo artista.</div>`;
      pastEventsEl.innerHTML = `<div class="empty-state">Non risultano eventi passati associati a questo artista.</div>`;
    }
  } catch (error) {
    artistNameEl.textContent = "Portale Artista";
    subtitleEl.textContent = "Errore di caricamento";
    statusTextEl.innerHTML = `<span class="error">${escapeHtml(error.message || "Errore sconosciuto")}</span>`;
    upcomingEventsEl.innerHTML = `<div class="empty-state">Si è verificato un problema nel caricamento dei dati.</div>`;
    pastEventsEl.innerHTML = `<div class="empty-state">Si è verificato un problema nel caricamento dei dati.</div>`;
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

setupTabs();
loadData();
