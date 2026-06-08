// TV screen controller.
// Receives live status updates over Socket.io and updates the kiosk display
// without restarting the currently playing video unless the video changes.

const socket = io();

const video = document.querySelector("#mainVideo");
const videoEmpty = document.querySelector("#videoEmpty");
const slide = document.querySelector("#mainSlide");
const onCallCard = document.querySelector(".on-call-card");
const staffImage = document.querySelector("#staffImage");
const staffName = document.querySelector("#staffName");
const staffStatus = document.querySelector("#staffStatus");
const nowPlaying = document.querySelector("#nowPlaying");
const nowBox = document.querySelector(".now-box");

const newsCard = document.querySelector(".news-card");
const newsContent = document.querySelector("#newsContent");
const newsHeadline = document.querySelector("#newsHeadline");
const newsBody = document.querySelector("#newsBody");

const globalPulse = document.querySelector("#globalPulse");
const localPulse = document.querySelector("#localPulse");
const globalPulseLabel = document.querySelector("#globalPulse .pulse-label");
const localPulseLabel = document.querySelector("#localPulse .pulse-label");
const clock = document.querySelector("#clock");
const stationLogoImage = document.querySelector(".station-logo img");
const stationLogo = document.querySelector(".station-logo");
const audioEnableOverlay = document.querySelector("#audioEnableOverlay");
const enableAudioOnTv = document.querySelector("#enableAudioOnTv");

let statusCache = null;
let currentVideoIndex = 0;
let currentVideoUrl = "";
let isOneTimeVideo = false;
let newsIndex = 0;
let globalPulseIndex = 0;
let localPulseIndex = 0;

let currentSlideIndex = 0;
let slideTimer = null;

// The TV screen starts after one local click. That click unlocks browser audio.
let tvStarted = localStorage.getItem("fablabtv.tvStarted") === "true";
video.muted = !tvStarted;
video.defaultMuted = !tvStarted;
video.volume = 1;
audioEnableOverlay?.classList.toggle("is-hidden", tvStarted);

function setBlockVisibility(element, visible = true) {
  element?.classList.toggle("is-hidden", !visible);
}

function applyLayoutSettings(status) {
  const layout = status?.i18n?.layout || {};
  setBlockVisibility(clock, layout.showClock !== false);
  setBlockVisibility(newsCard, layout.showTechNews !== false);
  setBlockVisibility(onCallCard, layout.showStaff !== false);
  setBlockVisibility(globalPulse, layout.showGlobalPulse !== false);
  setBlockVisibility(localPulse, layout.showLocalPulse !== false);
  setBlockVisibility(nowBox, layout.showNowPlaying !== false);
  setBlockVisibility(stationLogo, layout.showLogo !== false);
}

const manualDateNames = {
  "is-IS": {
    weekdays: ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"],
    months: ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"]
  }
};

function getLocaleCandidates(language, locale) {
  const candidates = [locale, language];

  if (language === "is-IS" || locale === "is-IS" || language === "is" || locale === "is") {
    candidates.unshift("is", "is-IS");
  }

  return [...new Set(candidates.filter(Boolean))];
}

function formatLocalizedDate(now, options) {
  const { language, locale } = getI18n();
  const candidates = getLocaleCandidates(language, locale);

  for (const candidate of candidates) {
    try {
      const formatted = now.toLocaleDateString(candidate, options);

      if ((language === "is-IS" || locale === "is-IS" || candidate === "is") && /wednesday|june/i.test(formatted)) {
        break;
      }

      return formatted;
    } catch {
      // Try the next candidate.
    }
  }

  if (language === "is-IS" || locale === "is-IS" || language === "is" || locale === "is") {
    const names = manualDateNames["is-IS"];

    if (options.weekday === "long") {
      return names.weekdays[now.getDay()];
    }

    if (options.month === "long" && options.day === "numeric") {
      return `${names.months[now.getMonth()]} ${now.getDate()}`;
    }
  }

  return now.toLocaleDateString("en-US", options);
}

function getI18n(status = statusCache) {
  const i18n = status?.i18n || {};
  const language = i18n.language || "en-US";
  const locale = i18n.locale || language;
  const labels = i18n.labels || {};
  return {
    language,
    locale,
    labels: {
      ...(labels["en-US"] || {}),
      ...(labels[language] || {})
    }
  };
}

function t(key, fallback = key) {
  const { labels } = getI18n();
  return labels[key] || fallback;
}

function updateStaticLabels() {
  const onCallLabel = document.querySelector(".on-call-card .eyebrow");
  const newsLabel = document.querySelector(".news-card .eyebrow");
  const nowPlayingLabel = document.querySelector(".now-box .label");
  const nowPlayingType = document.querySelector("#nowPlayingType");

  if (onCallLabel) onCallLabel.textContent = t("onCall", "On Call");
  if (newsLabel) newsLabel.textContent = t("techNews", "Tech News");
  if (nowPlayingLabel) nowPlayingLabel.textContent = t("nowPlaying", "Now Playing");
  if (nowPlayingType) nowPlayingType.textContent = t("fabAcademyProjectShowcase", "Fab Academy Project Showcase");
  if (globalPulseLabel) globalPulseLabel.textContent = t("globalPulse", "Global Pulse");
  if (localPulseLabel) localPulseLabel.textContent = t("localPulse", "Local Pulse");
}

function getEmptyVideoMessage() {
  const videoSources = statusCache?.videoSources || {};
  const openingHours = statusCache?.openingHoursStatus;

  if (
    videoSources.fabAcademyHighlights &&
    !videoSources.fabAcademyHighlightsAfterHours &&
    openingHours?.enabled &&
    openingHours?.isOpen === false
  ) {
    return "Fab Academy Highlights are paused because the lab is currently closed. Enable after-hours highlights in Remote if staff are working late.";
  }

  return t("addVideosOrStreaming", "Add videos to videos/ or turn on streaming highlights in Remote.");
}



function renderNowPlayingItem(item) {
  if (!item) {
    nowPlaying.textContent = getEmptyVideoMessage();
    return;
  }

  if (item.source === "fabacademy-highlights") {
    nowPlaying.innerHTML = `
      <span>${escapeHtml(item.title)}</span>
      <small>${escapeHtml(item.subtitle || "Fab Academy Highlight")}</small>
      <small>${escapeHtml(item.detail || "")}</small>
    `;
  } else {
    nowPlaying.textContent = item.title;
  }
}

function startPlayback() {
  video.volume = 1;
  video.muted = !tvStarted;
  video.defaultMuted = !tvStarted;

  if (!tvStarted) {
    audioEnableOverlay?.classList.remove("is-hidden");
    return;
  }

  const playPromise = video.play();

  if (playPromise?.catch) {
    playPromise.catch(() => {
      audioEnableOverlay?.classList.remove("is-hidden");
    });
  }
}

function showVideoDisplay() {
  stopSlideRotation();
  slide.classList.add("is-hidden");
  video.classList.remove("is-hidden");
}

function showSlideDisplay(slideItem) {
  if (!slideItem?.url) return;

  video.pause();
  video.classList.add("is-hidden");

  slide.src = slideItem.url;
  slide.alt = slideItem.title || slideItem.filename || "";
  slide.classList.remove("is-hidden");

  renderNowPlayingItem({
    ...slideItem,
    source: "slide",
    subtitle: "Slide"
  });
}

function stopSlideRotation() {
  if (slideTimer) {
    clearInterval(slideTimer);
    slideTimer = null;
  }
}

function getSlideDurationMs() {
  const seconds = Number(statusCache?.i18n?.slides?.durationSeconds);
  return Number.isFinite(seconds)
    ? Math.max(1, seconds) * 1000
    : 10000;
}

function startSlideRotation() {
  stopSlideRotation();

  const slides = statusCache?.slides || [];

  if (!slides.length || statusCache?.videos?.length) {
    return;
  }

  showSlideDisplay(slides[currentSlideIndex % slides.length]);

  slideTimer = setInterval(() => {
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    showSlideDisplay(slides[currentSlideIndex]);
  }, getSlideDurationMs());
}

function playVideoItem(item, { oneTime = false } = {}) {
  if (!item?.url) return;

  showVideoDisplay();

  isOneTimeVideo = oneTime;
  currentVideoUrl = item.url;
  videoEmpty.style.display = "none";
  video.src = item.url;
  video.load();
  startPlayback();
  renderNowPlayingItem(item);
}

function notifyCurrentVideo(index) {
  fetch("/api/video/current", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index })
  }).catch(() => {});
}

function clearOneTimeVideo() {
  fetch("/api/video/clear-override", { method: "POST" }).catch(() => {});
}

function playVideo(index, { force = false, notify = false } = {}) {
  if (!statusCache || !statusCache.videos.length) {
    const firstSlide = statusCache?.slides?.[0];

    currentVideoUrl = "";
    isOneTimeVideo = false;
    video.removeAttribute("src");

    if (firstSlide) {
      videoEmpty.style.display = "none";
      startSlideRotation();
    } else {
      showVideoDisplay();
      videoEmpty.style.display = "grid";
      videoEmpty.textContent = getEmptyVideoMessage();
      nowPlaying.textContent = getEmptyVideoMessage();
    }

    return;
  }

  currentVideoIndex = ((index % statusCache.videos.length) + statusCache.videos.length) % statusCache.videos.length;
  const item = statusCache.videos[currentVideoIndex];

  if (!force && !isOneTimeVideo && currentVideoUrl === item.url) {
    renderNowPlayingItem(item);
    return;
  }

  playVideoItem(item);

  if (notify) {
    notifyCurrentVideo(currentVideoIndex);
  }
}

function renderStaff(status) {
  if (!status.selectedStaff) {
    staffImage.removeAttribute("src");
    staffName.textContent = t("noStaffFound", "No staff found");
    staffStatus.textContent = t("addStaffPhotos", "Add images to staff/");
    return;
  }

  staffImage.src = status.selectedStaff.imageUrl;
  const staffStatusLabel = status.selectedStaff.statusLabel || t("onCall", "On Call");
  staffName.textContent = `${status.selectedStaff.name} • ${staffStatusLabel}`;
  staffStatus.textContent = status.selectedStaff.note || t("availableForLabSupport", "Available for lab support");
}

function setNewsContent(headline, body) {
  if (!newsContent) {
    newsHeadline.textContent = headline;
    newsBody.textContent = body;
    return;
  }

  newsContent.classList.add("is-leaving");

  setTimeout(() => {
    newsHeadline.textContent = headline;
    newsBody.textContent = body;

    newsContent.classList.remove("is-leaving");
    newsContent.style.animation = "none";
    newsContent.offsetHeight;
    newsContent.style.animation = "";
  }, 420);
}

function renderNews(status) {
  const items = status.news || [];

  if (!items.length) {
    setNewsContent(t("noNews", "No news"), t("noStoriesFound", "No stories found"));
    return;
  }

  const item = items[newsIndex % items.length];

  if (typeof item === "string") {
    setNewsContent(item, "FabLabTV");
    return;
  }

  const headline = item.title || "Untitled story";
  const source = item.source || "News";

  let domain = "";

  try {
    domain = item.url
      ? new URL(item.url).hostname.replace("www.", "")
      : "";
  } catch {
    domain = "";
  }

  setNewsContent(headline, domain ? `${source} • ${domain}` : source);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setPulseContent(target, html) {
  if (!target) return;

  const contentTarget = target.querySelector(".pulse-content") || target;
  const existing = contentTarget.querySelector(".pulse-slide");

  if (!existing) {
    contentTarget.innerHTML = `<div class="pulse-slide">${html}</div>`;
    return;
  }

  existing.classList.add("is-leaving");

  setTimeout(() => {
    contentTarget.innerHTML = `<div class="pulse-slide">${html}</div>`;
  }, 420);
}

function renderGlobalPulse(status) {
  const pulseViews = status.globalPulse?.items || status.labPulse?.cards || [];

  if (!pulseViews.length) {
    setPulseContent(globalPulse, "");
    return;
  }

  const view = pulseViews[globalPulseIndex % pulseViews.length];

  if (view.type === "weather") {
    const weather = view.weather || view;
    const forecast = weather.forecast || [];

    if (weather.temperature == null) {
      setPulseContent(globalPulse, `
        <div class="pulse-card wide">
          <div class="label">${escapeHtml(t("globalPulse", "Global Pulse"))}</div>
          <div class="pulse-title">${escapeHtml(view.title || t("weatherToday", "Weather"))}</div>
          <div>${escapeHtml(weather.label || view.body || t("weatherUnavailable", "Weather unavailable"))}</div>
        </div>
      `);
      return;
    }

    setPulseContent(globalPulse, `
      <div class="weather-pulse">
        <div>
          <div class="label">${escapeHtml(t("globalPulse", "Global Pulse"))}</div>
          <div class="weather-current">
            <span class="weather-icon">${escapeHtml(weather.icon || "🌡️")}</span>
            <strong>${escapeHtml(weather.temperature ?? "—")}°C</strong>
            <span>${escapeHtml(weather.location || "")}</span>
            <span>${escapeHtml(t("wind", "Wind"))} ${escapeHtml(weather.windSpeed ?? "—")} km/h</span>
          </div>
        </div>

        <div class="forecast-row">
          ${forecast.map(day => `
            <div class="forecast-day">
              <div>${escapeHtml(new Date(day.date).toLocaleDateString([], { weekday: "short" }))}</div>
              <div class="forecast-icon">${escapeHtml(day.icon || "🌡️")}</div>
              <strong>${escapeHtml(day.max ?? "—")}°</strong>
              <span>${escapeHtml(day.min ?? "—")}°</span>
            </div>
          `).join("")}
        </div>
      </div>
    `);
    return;
  }

  if (view.type === "bars") {
    setPulseContent(globalPulse, `
      <div class="pulse-card wide">
        <div class="label">${escapeHtml(t("globalPulse", "Global Pulse"))}</div>
        <div class="pulse-title">${escapeHtml(view.title || view.label || t("statistics", "Statistics"))}</div>
        ${(view.items || []).slice(0, 4).map(item => `
          <div>${escapeHtml(item.name)}</div>
          <div class="bar">
            <span style="width:${Math.max(0, Math.min(100, Number(item.value) || 0))}%"></span>
          </div>
        `).join("")}
      </div>
    `);
    return;
  }

  setPulseContent(globalPulse, `
    <div class="pulse-card wide">
      <div class="label">${escapeHtml(t("globalPulse", "Global Pulse"))}</div>
      <div class="pulse-title">${escapeHtml(view.title || view.label || t("status", "Status"))}</div>
      <div class="value">${escapeHtml(view.value ?? "")}</div>
      <div>${escapeHtml(view.body || view.note || "")}</div>
    </div>
  `);
}

function renderLocalPulse(status) {
  const localItems = status.localPulse?.items || [];

  if (!localItems.length) {
    setPulseContent(localPulse, `
      <div class="pulse-card wide">
        <div class="label">${escapeHtml(t("localPulse", "Local Pulse"))}</div>
        <div class="local-message-title">${escapeHtml(t("localPulseFallbackTitle", "Welcome to the Lab"))}</div>
        <div class="local-message-body">${escapeHtml(t("localPulseFallbackBody", "Ask the on-call staff member if you need help."))}</div>
      </div>
    `);
    return;
  }

  const item = localItems[localPulseIndex % localItems.length];

  if (item.type === "weather" || item.type === "weather-today") {
    const weather = item.weather || {};
    setPulseContent(localPulse, `
      <div class="pulse-card wide">
        <div class="label">${escapeHtml(t("localPulse", "Local Pulse"))}</div>
        <div class="local-message-title">${escapeHtml(item.title || t("weatherToday", "Weather today"))}</div>
        <div class="weather-current compact">
          <span class="weather-icon">${escapeHtml(weather.icon || "🌡️")}</span>
          <strong>${escapeHtml(weather.temperature ?? "—")}°C</strong>
          <span>${escapeHtml(weather.location || "")}</span>
          <span>${escapeHtml(t("wind", "Wind"))} ${escapeHtml(weather.windSpeed ?? "—")} km/h</span>
        </div>
      </div>
    `);
    return;
  }

  if (item.type === "weather-forecast") {
    const days = item.forecast || [];
    setPulseContent(localPulse, `
      <div class="pulse-card wide">
        <div class="label">${escapeHtml(t("localPulse", "Local Pulse"))}</div>
        <div class="local-message-title">${escapeHtml(item.title || t("weatherForecast", "Weather forecast"))}</div>
        <div class="local-card-row weather-card-row">
          ${days.map(day => `
            <div class="mini-card forecast-mini-card">
              <div class="mini-card-title">${escapeHtml(day.label || "")}</div>
              <div class="mini-card-icon">${escapeHtml(day.icon || "🌡️")}</div>
              <div class="mini-card-value">${escapeHtml(day.max ?? "—")}°</div>
              <div class="mini-card-sub">${escapeHtml(t("low", "Low"))} ${escapeHtml(day.min ?? "—")}°</div>
            </div>
          `).join("")}
        </div>
      </div>
    `);
    return;
  }

  if (item.type === "opening-hours-week") {
    const days = item.days || [];
    setPulseContent(localPulse, `
      <div class="pulse-card wide">
        <div class="label">${escapeHtml(t("localPulse", "Local Pulse"))}</div>
        <div class="local-message-title">${escapeHtml(item.title || t("openingHoursWeek", "Opening hours this week"))}</div>
        <div class="local-card-row hours-card-row">
          ${days.map(day => `
            <div class="mini-card hours-mini-card">
              <div class="mini-card-title">${escapeHtml(day.label || "")}</div>
              <div class="mini-card-value hours-value">${escapeHtml(day.hours || "")}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `);
    return;
  }

  const imageHtml = item.imageUrl
    ? `<img class="local-message-image" src="${escapeHtml(item.imageUrl)}" alt="">`
    : "";

  setPulseContent(localPulse, `
    <div class="pulse-card wide local-message-layout ${item.imageUrl ? "has-image" : ""}">
      <div>
        <div class="label">${escapeHtml(t("localPulse", "Local Pulse"))}</div>
        <div class="local-message-title">${escapeHtml(item.title || t("localPulse", "Local Pulse"))}</div>
        <div class="local-message-body">${escapeHtml(item.body || "")}</div>
      </div>
      ${imageHtml}
    </div>
  `);
}

function renderStatus(status) {
  statusCache = status;
  updateStaticLabels();
  applyLayoutSettings(status);

  renderStaff(status);
  renderNews(status);
  renderGlobalPulse(status);
  renderLocalPulse(status);

  if (status.nowPlayingOverride?.url) {
    if (currentVideoUrl !== status.nowPlayingOverride.url) {
      playVideoItem(status.nowPlayingOverride, { oneTime: true });
    } else {
      renderNowPlayingItem(status.nowPlayingOverride);
    }
    return;
  }

  if (!currentVideoUrl || !video.src) {
    playVideo(status.currentVideoIndex || 0, { force: true });
  } else {
    const currentItem = status.videos?.find((item) => item.url === currentVideoUrl);
    if (currentItem) {
      renderNowPlayingItem(currentItem);
    } else {
      playVideo(status.currentVideoIndex || 0, { force: true });
    }
  }
}

video.addEventListener("ended", () => {
  if (isOneTimeVideo) {
    isOneTimeVideo = false;
  }

  playVideo(currentVideoIndex + 1, { notify: true });
});

video.addEventListener("error", () => {
  const failedUrl = currentVideoUrl;
  console.warn("FabLabTV video failed, skipping to next video:", failedUrl);

  setTimeout(() => {
    if (currentVideoUrl === failedUrl) {
      isOneTimeVideo = false;
      playVideo(currentVideoIndex + 1, { force: true, notify: true });
    }
  }, 1200);
});

socket.on("status", renderStatus);

socket.on("command", (command) => {
  if (command.type === "nextVideo") {
    isOneTimeVideo = false;
    playVideo(command.index ?? currentVideoIndex + 1, { force: true });
  }

  if (command.type === "playOnce" && command.video) {
    playVideoItem(command.video, { oneTime: true });
  }

  if (command.type === "pauseToggle") {
    if (video.paused) {
      startPlayback();
    } else {
      video.pause();
    }
  }

  if (command.type === "reloadLogo" && stationLogoImage) {
    stationLogoImage.src = `/branding/current-logo.png?v=${encodeURIComponent(command.version || Date.now())}`;
  }
});

enableAudioOnTv?.addEventListener("click", async () => {
  tvStarted = true;
  localStorage.setItem("fablabtv.tvStarted", "true");

  video.muted = false;
  video.defaultMuted = false;
  video.volume = 1;

  try {
    await video.play();
    audioEnableOverlay?.classList.add("is-hidden");
  } catch {
    tvStarted = false;
    localStorage.removeItem("fablabtv.tvStarted");
    video.muted = true;
    video.defaultMuted = true;
    audioEnableOverlay?.classList.remove("is-hidden");
  }
});

function updateClock() {
  const now = new Date();

  const dayText = formatLocalizedDate(now, {
    weekday: "long"
  });

  const dateText = formatLocalizedDate(now, {
    month: "long",
    day: "numeric"
  });

  const timeText = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  clock.innerHTML = `
    <div class="clock-day">${escapeHtml(dayText)}</div>
    <div class="clock-date">${escapeHtml(dateText)}</div>
    <div class="clock-time">${escapeHtml(timeText)}</div>
  `;
}

updateClock();
setInterval(updateClock, 1000);

setInterval(() => {
  newsIndex++;
  if (statusCache) renderNews(statusCache);
}, 15000);

setInterval(() => {
  globalPulseIndex++;
  if (statusCache) renderGlobalPulse(statusCache);
}, 20000);

setInterval(() => {
  localPulseIndex++;
  if (statusCache) renderLocalPulse(statusCache);
}, 18000);