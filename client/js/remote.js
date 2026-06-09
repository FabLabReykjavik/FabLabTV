// Remote control UI.
// This page is designed for non-technical staff: upload media, choose on-call
// staff, edit Local Pulse data, set language labels, and control playback.

const socket = io();

const staffList = document.querySelector("#staffList");
const logoUpload = document.querySelector("#logoUpload");
const uploadLogo = document.querySelector("#uploadLogo");
const logoUploadStatus = document.querySelector("#logoUploadStatus");
const brandingLogoPreview = document.querySelector("#brandingLogoPreview");
const previousVideo = document.querySelector("#previousVideo");
const nextVideo = document.querySelector("#nextVideo");
const pauseVideo = document.querySelector("#pauseVideo");
const videoCount = document.querySelector("#videoCount");
const remoteNowPlaying = document.querySelector("#remoteNowPlaying");

const videoUpload = document.querySelector("#videoUpload");
const uploadVideo = document.querySelector("#uploadVideo");
const videoUploadStatus = document.querySelector("#videoUploadStatus");

const slideUpload = document.querySelector("#slideUpload");
const uploadSlide = document.querySelector("#uploadSlide");
const slideUploadStatus = document.querySelector("#slideUploadStatus");

const localVideosEnabled = document.querySelector("#localVideosEnabled");
const fabHighlightsEnabled = document.querySelector("#fabHighlightsEnabled");
const fabHighlightsAfterHoursEnabled = document.querySelector("#fabHighlightsAfterHoursEnabled");
const localVideosPerCycle = document.querySelector("#localVideosPerCycle");
const fabHighlightsPerCycle = document.querySelector("#fabHighlightsPerCycle");
const fabVideoSearch = document.querySelector("#fabVideoSearch");
const fabVideoCatalog = document.querySelector("#fabVideoCatalog");
const fabPlaylistSummary = document.querySelector("#fabPlaylistSummary");
const videoSourcesStatus = document.querySelector("#videoSourcesStatus");
const staffUpload = document.querySelector("#staffUpload");
const staffUploadName = document.querySelector("#staffUploadName");
const staffUploadNote = document.querySelector("#staffUploadNote");
const staffUploadStatusLabel = document.querySelector("#staffUploadStatusLabel");
const uploadStaff = document.querySelector("#uploadStaff");
const staffUploadStatus = document.querySelector("#staffUploadStatus");
const showAddStaff = document.querySelector("#showAddStaff");
const addStaffPanel = document.querySelector("#addStaffPanel");
const newsHistory = document.querySelector("#newsHistory");

const highlightPlaybackStatus = document.querySelector("#highlightPlaybackStatus");
const playlistMixStatus = document.querySelector("#playlistMixStatus");
const playlistInventoryStatus = document.querySelector("#playlistInventoryStatus");
const slideInventoryStatus = document.querySelector("#slideInventoryStatus");

const languageSelect = document.querySelector("#languageSelect");
const saveLanguage = document.querySelector("#saveLanguage");
const labelEditor = document.querySelector("#labelEditor");
const saveLabels = document.querySelector("#saveLabels");

const showClockToggle = document.querySelector("#showClockToggle");
const showTechNewsToggle = document.querySelector("#showTechNewsToggle");
const showStaffToggle = document.querySelector("#showStaffToggle");
const showGlobalPulseToggle = document.querySelector("#showGlobalPulseToggle");
const showLocalPulseToggle = document.querySelector("#showLocalPulseToggle");
const showNowPlayingToggle = document.querySelector("#showNowPlayingToggle");
const showLogoToggle = document.querySelector("#showLogoToggle");

const slideDurationSeconds = document.querySelector("#slideDurationSeconds");
const slidesEnabled = document.querySelector("#slidesEnabled");
const slidesPerCycle = document.querySelector("#slidesPerCycle");

const slides = status.slides || [];
const slideSettings = status.i18n?.slides || {};

const weatherLocation = document.querySelector("#weatherLocation");
const weatherLatitude = document.querySelector("#weatherLatitude");
const weatherLongitude = document.querySelector("#weatherLongitude");
const saveWeather = document.querySelector("#saveWeather");

const openingHoursEditor = document.querySelector("#openingHoursEditor");
const saveOpeningHours = document.querySelector("#saveOpeningHours");

const openingHoursStatusState = document.querySelector("#openingHoursStatusState");
const openingHoursStatusTime = document.querySelector("#openingHoursStatusTime");

const messageList = document.querySelector("#messageList");
const messageTitle = document.querySelector("#messageTitle");
const messageBody = document.querySelector("#messageBody");
const addMessage = document.querySelector("#addMessage");

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const editableLabelKeys = [
  ["onCall", "On Call"],
  ["techNews", "Tech News"],
  ["nowPlaying", "Now Playing"],
  ["globalPulse", "Global Pulse"],
  ["localPulse", "Local Pulse"],
  ["weatherToday", "Weather today"],
  ["weatherForecast", "Weather forecast"],
  ["openingHoursToday", "Opening hours today"],
  ["openToday", "Open today"],
  ["closedToday", "Closed today"],
  ["openingHoursWeek", "Opening hours this week"],
  ["wind", "Wind"],
  ["closed", "Closed"],
  ["low", "Low"],
  ["noNews", "No news"],
  ["noStoriesFound", "No stories found"],
  ["noStaffFound", "No staff found"],
  ["availableForLabSupport", "Available for lab support"],
  ["addVideos", "Add videos to videos/"],
  ["fabAcademyProjectShowcase", "Fab Academy Project Showcase"],
  ["communityTitle", "Fab Lab Community"],
  ["communityBody", "Global community announcements will appear here."]
];

let latestStatus = null;

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function postJson(url, body = {}) {
  return requestJson(url, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

function putJson(url, body = {}) {
  return requestJson(url, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

function deleteJson(url) {
  return requestJson(url, { method: "DELETE" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getSelectedOptions(select) {
  return Array.from(select?.selectedOptions || []).map((option) => option.value);
}

function setSelectedOptions(select, values) {
  if (!select) return;
  const selected = new Set((values || []).map(String));
  for (const option of select.options) {
    option.selected = selected.has(option.value);
  }
}

function titleCaseSlug(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderRemoteNowPlaying(status) {
  if (!remoteNowPlaying) return;


  const videos = status.videos || [];
  const slides = status.slides || []; 
  const item = status.nowPlayingOverride || videos[status.currentVideoIndex || 0];

  if (!item) {
    remoteNowPlaying.innerHTML = `<span class="muted">No video playing</span>`;
    return;
  }

  const sourceLabel = item.source === "fabacademy-highlights"
    ? "Fab Academy Highlight"
    : "Local video";

  remoteNowPlaying.innerHTML = `
    <div class="remote-now-label">Now playing on TV</div>
    <strong>${escapeHtml(item.title || "Untitled video")}</strong>
    <span>${escapeHtml(item.subtitle || sourceLabel)}</span>
    ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}
    <span class="now-playing-meta">${escapeHtml(sourceLabel)}</span>
  `;
}

function extensionFromFilename(filename) {
  const match = String(filename || "").match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : "";
}

function safeUploadBaseName(value, fallback) {
  return String(value || fallback || "upload")
    .replace(/[^a-zA-Z0-9 _.-]/g, "")
    .replace(/\s+/g, " ")
    .trim() || fallback || "upload";
}

async function uploadFile({ endpoint, fileInput, statusElement, button, filename }) {
  const file = fileInput?.files?.[0];

  if (!file) {
    statusElement.textContent = "Choose a file first.";
    return;
  }

  const uploadName = filename || file.name;
  button.disabled = true;
  statusElement.textContent = `Uploading ${uploadName}...`;

  try {
    const uploadUrl = new URL(endpoint, window.location.origin);
    uploadUrl.searchParams.set("filename", uploadName);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    fileInput.value = "";
    statusElement.textContent = `Uploaded ${result.filename}.`;
    return result;
  } catch (error) {
    statusElement.textContent = `Upload failed: ${error.message}`;
    throw error;
  } finally {
    button.disabled = false;
  }
}


function renderVideoSources(status) {
  if (!localVideosEnabled && !fabHighlightsEnabled) return;

  const sources = status.videoSources || {};

  if (localVideosEnabled) {
    localVideosEnabled.checked = sources.localVideos !== false;
  }

  if (fabHighlightsEnabled) {
    fabHighlightsEnabled.checked = sources.fabAcademyHighlights === true;
  }

  if (fabHighlightsAfterHoursEnabled) {
    fabHighlightsAfterHoursEnabled.checked = sources.fabAcademyHighlightsAfterHours === true;
    fabHighlightsAfterHoursEnabled.disabled = sources.fabAcademyHighlights !== true;
  }

  if (slidesEnabled) {
    slidesEnabled.checked = sources.slides !== false;
  }

  if (slidesPerCycle) {
    slidesPerCycle.value = sources.slidesPerCycle ?? 1;
    slidesPerCycle.disabled = sources.slides === false;
  }

  if (localVideosPerCycle) {
    localVideosPerCycle.value = sources.localVideosPerCycle ?? 1;
  }

  if (fabHighlightsPerCycle) {
    fabHighlightsPerCycle.value = sources.fabAcademyHighlightsPerCycle ?? 1;
  }

  renderFabVideoCatalog(status.fabAcademyHighlights?.items || []);
}

function renderHighlightPlaybackStatus(status) {
  if (!highlightPlaybackStatus) return;

  const sources = status.videoSources || {};
  const openingHours = status.openingHoursStatus || {};
  const highlightsEnabled = sources.fabAcademyHighlights === true;
  const afterHoursOverride = sources.fabAcademyHighlightsAfterHours === true;
  const labIsOpen = openingHours.isOpen === true;

  if (!highlightsEnabled) {
    highlightPlaybackStatus.innerHTML = `
      <strong>Highlights Off</strong>
      <small>Streaming highlights are disabled in the normal TV playlist.</small>
    `;
    return;
  }

  if (labIsOpen) {
    highlightPlaybackStatus.innerHTML = `
      <strong>Highlights Active</strong>
      <small>The lab is open, so Fab Academy Highlights may appear in the normal playlist.</small>
    `;
    return;
  }

  if (afterHoursOverride) {
    highlightPlaybackStatus.innerHTML = `
      <strong>Highlights Active After Hours</strong>
      <small>The lab is closed, but after-hours highlight streaming is enabled.</small>
    `;
    return;
  }

  highlightPlaybackStatus.innerHTML = `
    <strong>Highlights Paused</strong>
    <small>The lab is closed and after-hours highlight streaming is off.</small>
  `;
}

function renderPlaylistMixStatus(status) {
  if (!playlistMixStatus) return;

  const sources = status.videoSources || {};
  const localPerCycle = sources.localVideosPerCycle ?? 1;
  const highlightsPerCycle = sources.fabAcademyHighlightsPerCycle ?? 1;

  playlistMixStatus.innerHTML = `
    <strong>Playlist Mix</strong>
    <small>${escapeHtml(localPerCycle)} local video${Number(localPerCycle) === 1 ? "" : "s"} → ${escapeHtml(highlightsPerCycle)} highlight${Number(highlightsPerCycle) === 1 ? "" : "s"}</small>
  `;
}

function renderPlaylistInventoryStatus(status) {
  if (!playlistInventoryStatus) return;

  const videos = status.videos || [];
  const slides = status.slides || [];
  const slideSettings = status.i18n?.slides || {};

  const localCount = videos.filter(
    (video) => video.source === "local"
  ).length;

  const highlightCount = videos.filter(
    (video) => video.source === "fabacademy-highlights"
  ).length;

  playlistInventoryStatus.innerHTML = `
    <strong>Active Playlist</strong>
    <small>
      Local videos: ${localCount}<br>
      Highlights: ${highlightCount}<br>
      Total video items: ${videos.length}<br>
      ${
        slideSettings.enabled === false
          ? "Slides: disabled"
          : `Slides available: ${slides.length}<br>Slide duration: ${escapeHtml(slideSettings.durationSeconds ?? 10)}s`
      }
    </small>
  `;
}

function renderSlideInventoryStatus(status) {
  if (!slideInventoryStatus) return;

  const slides = status.slides || [];

  if (!slides.length) {
    slideInventoryStatus.innerHTML = `
      <strong>Slides</strong>
      <small>No slides found. Add images to slides/.</small>
    `;
    return;
  }

  slideInventoryStatus.innerHTML = `
    <strong>Slides</strong>
    <small>${slides.map((slide) => escapeHtml(slide.title || slide.filename)).join("<br>")}</small>
  `;
}

function renderFabVideoCatalog(items = latestStatus?.fabAcademyHighlights?.items || []) {
  if (!fabVideoCatalog || !fabPlaylistSummary) return;

  const query = String(fabVideoSearch?.value || "").trim().toLowerCase();

  if (!query) {
    fabPlaylistSummary.textContent = "";
    fabVideoCatalog.innerHTML = `<div class="empty-state">Type to search Fab Academy highlight videos.</div>`;
    return;
  }

  const visibleItems = items.filter((item) => {
    const haystack = [item.title, item.labName, item.lab, item.student, item.detail, item.mention, item.year]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  fabPlaylistSummary.innerHTML = `
    <strong>${escapeHtml(visibleItems.length)}</strong>
    <span>matching highlight video${visibleItems.length === 1 ? "" : "s"}</span>
  `;

  if (!visibleItems.length) {
    fabVideoCatalog.innerHTML = `<div class="empty-state">No highlight videos match this search.</div>`;
    return;
  }

  fabVideoCatalog.innerHTML = visibleItems.slice(0, 24).map((item) => `
    <article class="fab-video-item">
      <span class="fab-video-main">
        <strong>${escapeHtml(item.title || "Untitled")}</strong>
        <small>${escapeHtml(item.labName || titleCaseSlug(item.lab))} • ${escapeHtml(item.year || "")}</small>
        ${item.detail || item.mention ? `<small>${escapeHtml(item.detail || item.mention)}</small>` : ""}
      </span>
      <button class="small play-highlight" type="button" data-id="${escapeHtml(item.id)}">Play now</button>
    </article>
  `).join("");

  for (const button of fabVideoCatalog.querySelectorAll(".play-highlight")) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Playing...";

      try {
        await postJson("/api/video/play-highlight", { id: button.dataset.id });
      } catch (error) {
        button.textContent = "Failed";
        setTimeout(() => {
          button.disabled = false;
          button.textContent = "Play now";
        }, 1200);
      }
    });
  }
}

function renderLanguageControls(status) {
  if (!languageSelect || !labelEditor) return;

  const i18n = status.i18n || {};
  const selectedLanguage = i18n.language || "en-US";
  const supportedLanguages = i18n.supportedLanguages || [];
  const labels = i18n.labels || {};
  const selectedLabels = {
    ...(labels["en-US"] || {}),
    ...(labels[selectedLanguage] || {})
  };

  languageSelect.innerHTML = supportedLanguages.map((language) => `
    <option value="${escapeHtml(language.code)}" ${language.code === selectedLanguage ? "selected" : ""}>
      ${escapeHtml(language.name)}
    </option>
  `).join("");

  labelEditor.innerHTML = editableLabelKeys.map(([key, fallback]) => `
    <label>
      ${escapeHtml(fallback)}
      <input class="label-input" data-key="${escapeHtml(key)}" value="${escapeHtml(selectedLabels[key] || fallback)}" />
    </label>
  `).join("");

  if (showClockToggle) {
    showClockToggle.checked = i18n.layout?.showClock !== false;
  }

  if (showTechNewsToggle) {
    showTechNewsToggle.checked = i18n.layout?.showTechNews !== false;
  }

  if (showStaffToggle) {
    showStaffToggle.checked = i18n.layout?.showStaff !== false;
  }

  if (showGlobalPulseToggle) {
    showGlobalPulseToggle.checked = i18n.layout?.showGlobalPulse !== false;
  }

  if (showLocalPulseToggle) {
    showLocalPulseToggle.checked = i18n.layout?.showLocalPulse !== false;
  }

  if (showNowPlayingToggle) {
    showNowPlayingToggle.checked = i18n.layout?.showNowPlaying !== false;
  }

  if (showLogoToggle) {
    showLogoToggle.checked = i18n.layout?.showLogo !== false;
  }

  if (slidesEnabled) {
    slidesEnabled.checked = i18n.slides?.enabled !== false;
  }

  if (slideDurationSeconds) {
    slideDurationSeconds.value = i18n.slides?.durationSeconds ?? 10;
    slideDurationSeconds.disabled = i18n.slides?.enabled === false;
  }

  if (slidesPerCycle) {
    slidesPerCycle.value = i18n.slides?.slidesPerCycle ?? 1;
    slidesPerCycle.disabled = i18n.slides?.enabled === false;
  }
}

function renderNewsHistory(newsItems) {
  if (!newsHistory) return;

  newsHistory.innerHTML = "";

  if (!newsItems.length) {
    newsHistory.innerHTML = "<p>No news loaded yet.</p>";
    return;
  }

  for (const item of newsItems.slice(0, 20)) {
    const title = typeof item === "string" ? item : item.title;
    const url = typeof item === "string" ? null : item.url;
    const source = typeof item === "string" ? "FabLabTV" : item.source;

    const card = document.createElement("article");
    card.className = "news-history-item";

    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(source || "")}</p>
      ${
        url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open article</a>`
          : ""
      }
    `;

    newsHistory.appendChild(card);
  }
}

function renderWeather(localConfig) {
  const weather = localConfig.weather || {};
  weatherLocation.value = weather.location || "";
  weatherLatitude.value = weather.latitude ?? "";
  weatherLongitude.value = weather.longitude ?? "";
}

function renderOpeningHoursStatus(status) {
  if (!openingHoursStatusState || !openingHoursStatusTime) return;

  const info = status.openingHoursStatus;

  if (!info) {
    openingHoursStatusState.textContent = "Unknown";
    openingHoursStatusTime.textContent = "";
    return;
  }

  openingHoursStatusState.textContent = info.isOpen ? "🟢 OPEN" : "🔴 CLOSED";
  openingHoursStatusTime.textContent = `Current time: ${info.time || "--:--"}`;
}

function renderOpeningHours(localConfig) {
  const weekly = localConfig.openingHours?.weekly || {};
  openingHoursEditor.innerHTML = "";

  for (const day of days) {
    const range = weekly[day]?.[0] || {};
    const row = document.createElement("div");
    row.className = "hours-row";
    row.dataset.day = day;
    row.innerHTML = `
      <strong>${day[0].toUpperCase()}${day.slice(1)}</strong>
      <input class="open-time" type="time" value="${escapeHtml(range.open || "")}" />
      <span>to</span>
      <input class="close-time" type="time" value="${escapeHtml(range.close || "")}" />
      <button class="small secondary clear-day" type="button">Closed</button>
    `;
    row.querySelector(".clear-day").addEventListener("click", () => {
      row.querySelector(".open-time").value = "";
      row.querySelector(".close-time").value = "";
    });
    openingHoursEditor.appendChild(row);
  }
}

function renderEditableList(container, items, onDelete) {
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = "<p>No items yet.</p>";
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = `editable-item ${item.imageUrl ? "has-image" : ""}`;
    row.innerHTML = `
      ${item.imageUrl ? `<img class="editable-item-image" src="${escapeHtml(item.imageUrl)}" alt="">` : ""}
      <div>
        <strong>${escapeHtml(item.title || "Untitled")}</strong>
        <p>${escapeHtml(item.body || "")}</p>
      </div>
      <button class="small danger" type="button">Delete</button>
    `;
    row.querySelector("button").addEventListener("click", () => onDelete(item.id));
    container.appendChild(row);
  }
}

function renderLocalPulseControls(status) {
  const localConfig = status.localPulse?.config || {};
  renderWeather(localConfig);
  renderOpeningHours(localConfig);
  renderEditableList(messageList, localConfig.messages || [], async (id) => {
    await deleteJson(`/api/local-pulse/messages/${encodeURIComponent(id)}`);
  });
}

function render(status) {
  latestStatus = status;
  videoCount.textContent = `${status.videos.length} video(s) in the active playlist`;
  renderRemoteNowPlaying(status);
  renderVideoSources(status);
  renderHighlightPlaybackStatus(status);
  renderPlaylistMixStatus(status);
  renderPlaylistInventoryStatus(status);
  renderSlideInventoryStatus(status);

  staffList.innerHTML = "";
  for (const person of status.staff) {
    const card = document.createElement("article");
    card.className = "staff-card";
    if (status.selectedStaff?.filename === person.filename) {
      card.classList.add("active");
    }

    card.innerHTML = `
      <button class="staff-button staff-select-button" type="button">
        <img src="${escapeHtml(person.imageUrl)}" alt="">
        <span>
          <strong>${escapeHtml(person.name)}</strong>
          <small>${status.selectedStaff?.filename === person.filename ? "Currently on call" : "Set as on call"}</small>
        </span>
      </button>
      <label class="staff-note-label">
        Small label next to name
        <input class="staff-status-label-input" placeholder="On Call, she/her, they/them, Electronics..." value="${escapeHtml(person.statusLabel || "")}" />
      </label>
      <label class="staff-note-label">
        Staff profile text
        <textarea class="staff-note-input" placeholder="Specialties, support notes, short bio...">${escapeHtml(person.note || "")}</textarea>
      </label>
      <div class="staff-card-actions">
        <button class="secondary small save-staff-note" type="button">Save staff text</button>
        <button class="small danger delete-staff" type="button">Remove staff member</button>
      </div>
      <p class="upload-status staff-note-status"></p>
    `;

    card.querySelector(".staff-select-button")?.addEventListener("click", async () => {
      await postJson("/api/on-call", { filename: person.filename });
    });

    card.querySelector(".save-staff-note")?.addEventListener("click", async () => {
      const statusElement = card.querySelector(".staff-note-status");
      const noteInput = card.querySelector(".staff-note-input");
      const statusLabelInput = card.querySelector(".staff-status-label-input");

      if (statusElement) statusElement.textContent = "Saving...";

      try {
        await putJson(`/api/staff/${encodeURIComponent(person.filename)}/profile`, {
          note: noteInput?.value || "",
          statusLabel: statusLabelInput?.value || ""
        });
        if (statusElement) statusElement.textContent = "Saved.";
      } catch (error) {
        if (statusElement) statusElement.textContent = `Save failed: ${error.message}`;
      }
    });

    card.querySelector(".delete-staff")?.addEventListener("click", async () => {
      const statusElement = card.querySelector(".staff-note-status");
      const confirmed = window.confirm(`Remove ${person.name} from FabLabTV? This deletes the staff image from the local staff/ folder.`);
      if (!confirmed) return;

      if (statusElement) statusElement.textContent = "Removing...";

      try {
        await deleteJson(`/api/staff/${encodeURIComponent(person.filename)}`);
      } catch (error) {
        if (statusElement) statusElement.textContent = `Remove failed: ${error.message}`;
      }
    });

    staffList.appendChild(card);
  }

  renderLanguageControls(status);
  renderLocalPulseControls(status);
  renderOpeningHoursStatus(status);
  renderNewsHistory(status.news || []);

  if (!status.staff.length) {
    staffList.innerHTML = "<p>Add staff photos to staff/</p>";
  }
}


saveLanguage?.addEventListener("click", async () => {
  await putJson("/api/i18n/language", {
    language: languageSelect.value
  });
});

saveLabels?.addEventListener("click", async () => {
  const labels = {};

  for (const input of labelEditor.querySelectorAll(".label-input")) {
    labels[input.dataset.key] = input.value;
  }

  await putJson(`/api/i18n/labels/${encodeURIComponent(languageSelect.value)}`, {
    labels
  });
});

languageSelect?.addEventListener("change", () => {
  if (!latestStatus) return;
  latestStatus = {
    ...latestStatus,
    i18n: {
      ...latestStatus.i18n,
      language: languageSelect.value
    }
  };
  renderLanguageControls(latestStatus);
});

showClockToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showClock: showClockToggle.checked
  });
});

showTechNewsToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showTechNews: showTechNewsToggle.checked
  });
});

showStaffToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showStaff: showStaffToggle.checked
  });
});

showGlobalPulseToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showGlobalPulse: showGlobalPulseToggle.checked
  });
});

showLocalPulseToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showLocalPulse: showLocalPulseToggle.checked
  });
});

showNowPlayingToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showNowPlaying: showNowPlayingToggle.checked
  });
});

showLogoToggle?.addEventListener("change", async () => {
  await putJson("/api/settings/layout", {
    showLogo: showLogoToggle.checked
  });
});

slidesEnabled?.addEventListener("change", async () => {
  await putJson("/api/settings/slides", {
    enabled: slidesEnabled.checked
  });
});

slideDurationSeconds?.addEventListener("change", async () => {
  await putJson("/api/settings/slides", {
    durationSeconds: Number(slideDurationSeconds.value) || 10
  });
});

slidesPerCycle?.addEventListener("change", async () => {
  await putJson("/api/settings/slides", {
    slidesPerCycle: Number(slidesPerCycle.value) || 0
  });
});

showAddStaff?.addEventListener("click", () => {
  if (!addStaffPanel) return;

  const isHidden = addStaffPanel.classList.toggle("is-hidden");
  showAddStaff.textContent = isHidden ? "Add staff member" : "Hide add staff form";
});

previousVideo?.addEventListener("click", async () => {
  await postJson("/api/video/previous");
});

nextVideo?.addEventListener("click", async () => {
  await postJson("/api/video/next");
});

pauseVideo?.addEventListener("click", async () => {
  await postJson("/api/video/pause-toggle");
});

let videoSourcesSaveTimer = null;

async function saveVideoSourcesNow() {
  if (!videoSourcesStatus) return;

  videoSourcesStatus.textContent = "Saving video source settings...";

  try {
    await putJson("/api/video-sources", {
      localVideos: localVideosEnabled ? localVideosEnabled.checked : true,
      fabAcademyHighlights: fabHighlightsEnabled ? fabHighlightsEnabled.checked : false,
      fabAcademyHighlightsAfterHours: fabHighlightsAfterHoursEnabled
        ? fabHighlightsAfterHoursEnabled.checked
        : false,
      localVideosPerCycle: localVideosPerCycle
        ? Number(localVideosPerCycle.value) || 0
        : 1,
      fabAcademyHighlightsPerCycle: fabHighlightsPerCycle
        ? Number(fabHighlightsPerCycle.value) || 0
        : 1,
      slides: slidesEnabled ? slidesEnabled.checked : true,
      slidesPerCycle: slidesPerCycle
        ? Number(slidesPerCycle.value) || 0
        : 1
    });
    videoSourcesStatus.textContent = "Saved automatically.";
  } catch (error) {
    videoSourcesStatus.textContent = `Save failed: ${error.message}`;
  }
}

function scheduleVideoSourcesSave() {
  clearTimeout(videoSourcesSaveTimer);
  videoSourcesSaveTimer = setTimeout(saveVideoSourcesNow, 500);
}

uploadLogo?.addEventListener("click", async () => {
  const result = await uploadFile({
    endpoint: "/api/upload/logo",
    fileInput: logoUpload,
    statusElement: logoUploadStatus,
    button: uploadLogo,
    filename: logoUpload?.files?.[0]?.name || "logo.png"
  });

  if (brandingLogoPreview) {
    brandingLogoPreview.src = result?.logoUrl || `/branding/current-logo.png?v=${Date.now()}`;
  }
});

uploadVideo?.addEventListener("click", async () => {
  await uploadFile({
    endpoint: "/api/upload/video",
    fileInput: videoUpload,
    statusElement: videoUploadStatus,
    button: uploadVideo
  });
});

uploadSlide?.addEventListener("click", async () => {
  await uploadFile({
    endpoint: "/api/upload/slide",
    fileInput: slideUpload,
    statusElement: slideUploadStatus,
    button: uploadSlide
  });
});

uploadStaff?.addEventListener("click", async () => {
  const file = staffUpload?.files?.[0];
  const extension = extensionFromFilename(file?.name) || ".png";
  const baseName = safeUploadBaseName(staffUploadName?.value, file?.name?.replace(/\.[^.]+$/, "") || "staff");

  await uploadFile({
    endpoint: `/api/upload/staff?note=${encodeURIComponent(staffUploadNote?.value || "")}&statusLabel=${encodeURIComponent(staffUploadStatusLabel?.value || "")}`,
    fileInput: staffUpload,
    statusElement: staffUploadStatus,
    button: uploadStaff,
    filename: `${baseName}${extension}`
  });

  if (staffUploadName) staffUploadName.value = "";
  if (staffUploadStatusLabel) staffUploadStatusLabel.value = "";
  if (staffUploadNote) staffUploadNote.value = "";
});

saveWeather.addEventListener("click", async () => {
  await putJson("/api/local-pulse/weather", {
    location: weatherLocation.value,
    latitude: weatherLatitude.value,
    longitude: weatherLongitude.value
  });
});

saveOpeningHours.addEventListener("click", async () => {
  const weekly = {};

  for (const row of openingHoursEditor.querySelectorAll(".hours-row")) {
    const open = row.querySelector(".open-time").value;
    const close = row.querySelector(".close-time").value;
    weekly[row.dataset.day] = open && close ? [{ open, close }] : [];
  }

  await putJson("/api/local-pulse/opening-hours", { enabled: true, weekly });
});

addMessage.addEventListener("click", async () => {
  let imageUrl = "";

  if (messageImage?.files?.[0]) {
    const baseName = safeUploadBaseName(messageTitle?.value, "local-message");
    const extension = extensionFromFilename(messageImage.files[0].name) || ".png";
    const result = await uploadFile({
      endpoint: "/api/upload/local-pulse-image",
      fileInput: messageImage,
      statusElement: messageUploadStatus,
      button: addMessage,
      filename: `${baseName}${extension}`
    });

    if (result?.filename) {
      imageUrl = `/media/local-pulse/${encodeURIComponent(result.filename)}`;
    }
  }

  await postJson("/api/local-pulse/messages", {
    title: messageTitle.value,
    body: messageBody.value,
    imageUrl
  });
  messageTitle.value = "";
  messageBody.value = "";
  if (messageImage) messageImage.value = "";
  if (messageUploadStatus) messageUploadStatus.textContent = imageUrl ? "Message image uploaded." : "";
});

localVideosEnabled?.addEventListener("change", scheduleVideoSourcesSave);
fabHighlightsEnabled?.addEventListener("change", scheduleVideoSourcesSave);
fabHighlightsAfterHoursEnabled?.addEventListener("change", scheduleVideoSourcesSave);
slidesEnabled?.addEventListener("change", scheduleVideoSourcesSave);

localVideosPerCycle?.addEventListener("change", scheduleVideoSourcesSave);
fabHighlightsPerCycle?.addEventListener("change", scheduleVideoSourcesSave);
slidesPerCycle?.addEventListener("change", scheduleVideoSourcesSave);

fabVideoSearch?.addEventListener("input", () => renderFabVideoCatalog());

socket.on("status", render);

fetch("/api/status")
  .then((response) => response.json())
  .then(render);
