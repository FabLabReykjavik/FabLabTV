// Main FabLabTV server.
// This file owns the HTTP API, static file serving, Socket.io live updates,
// and upload endpoints used by the Remote page. Feature-specific data shaping
// lives in smaller modules such as library.js, localPulse.js, and globalPulse.js.

import express from "express";
import cors from "cors";
import path from "node:path";
import http from "node:http";
import fs from "node:fs";
import { Server } from "socket.io";
import chokidar from "chokidar";

import { getNewsItems } from "./services/newsService.js";
import { loadAppConfig, saveAppConfig } from "./models/configModel.js";

import tzLookup from "tz-lookup";

import { config } from "./config.js";
import {
  getVideoLibrary,
  getLocalSlideLibrary,
  getStaffLibrary,
  loadVideoSourcesConfig,
  saveVideoSourcesConfig,
  getFabAcademyHighlightsSummary,
  getFabAcademyHighlightById,
  getNeilProjectPicksSummary,
  getNeilProjectPickById,
  updateStaffProfile,
  deleteStaffProfile
} from "./library.js";
import { loadState, saveState } from "./state.js";
import { getGlobalPulse, startGlobalPulseRefresh } from "./globalPulse.js";
import { getLocalPulse, loadLocalPulseConfig, saveLocalPulseConfig, isLabOpenNow } from "./localPulse.js";
import { loadI18nConfig, saveI18nConfig, normalizeLanguage } from "./i18n.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(config.clientDir));
app.use("/branding", express.static(config.brandingDir));

app.get("/branding/current-logo.png", async (_req, res) => {
  // Use a lab-uploaded logo when available, otherwise fall back to the bundled generic FabLab logo.
  const customLogo = path.join(config.brandingDir, "logo.png");
  const defaultLogo = path.join(config.brandingDir, "fablab.png");

  try {
    await fs.promises.access(customLogo);
    res.setHeader("Cache-Control", "no-store");
    return res.sendFile(customLogo);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.sendFile(defaultLogo);
  }
});
app.use("/media/local-pulse", express.static(config.localPulseMediaDir, {
  fallthrough: true,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));

app.use("/media/videos", express.static(config.videosDir, {
  fallthrough: true,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));

app.use("/media/slides", express.static(config.slidesDir, {
  fallthrough: true,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));

app.use("/media/slide-cache", express.static(config.slideCacheDir, {
  fallthrough: true,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));

app.use("/media/staff", express.static(config.staffDir, {
  fallthrough: true,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));


function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeTimeRanges(ranges) {
  if (!Array.isArray(ranges)) return [];
  return ranges
    .map((range) => ({ open: cleanText(range.open), close: cleanText(range.close) }))
    .filter((range) => range.open && range.close);
}

function sanitizeUploadFilename(filename, fallbackBase) {
  const original = cleanText(filename);
  const parsed = path.parse(original);
  const safeBase = (parsed.name || fallbackBase)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || fallbackBase;
  const safeExt = parsed.ext.toLowerCase();
  return `${safeBase}${safeExt}`;
}

async function getAvailableFilePath(directory, filename) {
  await fs.promises.mkdir(directory, { recursive: true });

  const parsed = path.parse(filename);
  let candidate = path.join(directory, filename);
  let index = 1;

  while (true) {
    try {
      await fs.promises.access(candidate);
      candidate = path.join(directory, `${parsed.name}-${index}${parsed.ext}`);
      index += 1;
    } catch {
      return candidate;
    }
  }
}

function uploadFileToFolder({ directory, allowedExtensions, fallbackBase, afterUpload }) {
  return async (req, res) => {
    const filename = sanitizeUploadFilename(req.query.filename, fallbackBase);
    const ext = path.extname(filename).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: `Unsupported file type. Allowed: ${allowedExtensions.join(", ")}`
      });
    }

    const targetPath = await getAvailableFilePath(directory, filename);
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);

    req.on("aborted", () => {
      writeStream.destroy();
      fs.promises.unlink(targetPath).catch(() => {});
    });

    writeStream.on("error", (error) => {
      res.status(500).json({ error: error.message });
    });

    writeStream.on("finish", async () => {
      const savedFilename = path.basename(targetPath);

      if (afterUpload) {
        await afterUpload({ filename: savedFilename, req });
      }

      await broadcastStatus();
      res.json({
        filename: savedFilename,
        status: await buildStatus()
      });
    });
  };
}

async function buildStatus() {
  const [staff, state, appConfig, i18n, videoSources, fabAcademyHighlights, neilProjectPicks, localPulseConfig] = await Promise.all([
    getStaffLibrary(),
    loadState(),
    loadAppConfig(),
    loadI18nConfig(),
    loadVideoSourcesConfig(),
    getFabAcademyHighlightsSummary(),
    getNeilProjectPicksSummary(),
    loadLocalPulseConfig()
  ]);

  const openingHoursStatus = isLabOpenNow(
    localPulseConfig,
    appConfig.timezone || "Atlantic/Reykjavik"
  );

  const [videos, slides] = await Promise.all([
    getVideoLibrary(),
    getLocalSlideLibrary()
  ]);

  const [globalPulse, localPulse] = await Promise.all([
    getGlobalPulse(appConfig, i18n),
    getLocalPulse(appConfig, i18n)
  ]);

  const selectedStaff =
    staff.find((person) => person.filename === state.selectedStaffFilename) ||
    staff[0] ||
    null;

  const safeVideoIndex = videos.length
    ? Math.max(0, Math.min(state.currentVideoIndex, videos.length - 1))
    : 0;
  const nowPlayingOverride = state.nowPlayingOverride || null;

  return {
    app: "FabLabTV",
    version: "0.1.0",
    config: appConfig,
    i18n,
    videoSources,
    openingHoursStatus,
    fabAcademyHighlights,
    neilProjectPicks,
    videos,
    slides,
    staff,
    selectedStaff,
    currentVideoIndex: safeVideoIndex,
    nowPlayingOverride,
    audio: state.audio || { requested: false, enabled: false, muted: true },
    announcement: state.announcement,
    news: await getNewsItems(appConfig),
    globalPulse,
    localPulse,
    labPulse: {
      updatedAt: globalPulse.updatedAt,
      cards: globalPulse.items
    }
  };
}

async function broadcastStatus() {
  io.emit("status", await buildStatus());
}

app.get("/", (_req, res) => res.redirect("/screen"));
app.get("/screen", (_req, res) => res.sendFile(path.join(config.clientDir, "screen.html")));
app.get("/remote", (_req, res) => res.sendFile(path.join(config.clientDir, "remote.html")));


app.get("/api/status", async (_req, res) => {
  res.json(await buildStatus());
});

app.post("/api/upload/video", uploadFileToFolder({
  directory: config.videosDir,
  allowedExtensions: [".mp4", ".webm", ".mov", ".m4v"],
  fallbackBase: "video"
}));

app.post("/api/upload/slide", uploadFileToFolder({
  directory: config.slidesDir,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".pdf"],
  fallbackBase: "slide"
}));

app.post("/api/upload/staff", uploadFileToFolder({
  directory: config.staffDir,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  fallbackBase: "staff",
  afterUpload: async ({ filename, req }) => {
    await updateStaffProfile(filename, {
      note: cleanText(req.query.note),
      statusLabel: cleanText(req.query.statusLabel)
    });
  }
}));

app.post("/api/upload/logo", async (req, res) => {
  // Branding is intentionally simple: custom uploads always replace branding/logo.png.
  // The bundled branding/fablab.png remains as the safe default/fallback.
  const rawFilename = sanitizeUploadFilename(req.query.filename, "logo.png");
  const ext = path.extname(rawFilename).toLowerCase();

  if (ext !== ".png") {
    return res.status(400).json({ error: "Unsupported logo type. Use a transparent PNG logo." });
  }

  await fs.promises.mkdir(config.brandingDir, { recursive: true });
  const targetPath = path.join(config.brandingDir, "logo.png");
  const writeStream = fs.createWriteStream(targetPath);

  req.pipe(writeStream);

  req.on("aborted", () => {
    writeStream.destroy();
  });

  writeStream.on("error", (error) => {
    res.status(500).json({ error: error.message });
  });

  writeStream.on("finish", async () => {
    io.emit("command", { type: "reloadLogo", version: Date.now() });
    await broadcastStatus();
    res.json({ filename: "logo.png", logoUrl: `/branding/current-logo.png?v=${Date.now()}`, status: await buildStatus() });
  });
});

app.post("/api/upload/local-pulse-image", uploadFileToFolder({
  directory: config.localPulseMediaDir,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  fallbackBase: "local-pulse-image"
}));



app.get("/api/video-sources", async (_req, res) => {
  res.json(await loadVideoSourcesConfig());
});

app.get("/api/fabacademy-highlights", async (_req, res) => {
  res.json(await getFabAcademyHighlightsSummary());
});

app.get("/api/neil-project-picks", async (_req, res) => {
  res.json(await getNeilProjectPicksSummary());
});

app.put("/api/video-sources", async (req, res) => {
  await saveVideoSourcesConfig({
    localVideos: req.body.localVideos !== false,
    fabAcademyHighlights: req.body.fabAcademyHighlights === true,
    neilProjectPicks: req.body.neilProjectPicks === true,
    slides: req.body.slides !== false,
    fabAcademyHighlightsAfterHours: req.body.fabAcademyHighlightsAfterHours === true,
    localVideosPerCycle: req.body.localVideosPerCycle,
    fabAcademyHighlightsPerCycle: req.body.fabAcademyHighlightsPerCycle,
    neilProjectPicksPerCycle: req.body.neilProjectPicksPerCycle,
    slidesPerCycle: req.body.slidesPerCycle
  });

  await broadcastStatus();
  res.json(await buildStatus());
});


app.get("/api/news", async (_req, res) => {
  const appConfig = await loadAppConfig();
  const news = await getNewsItems(appConfig);
  res.json(news);
});

app.get("/api/local-pulse", async (_req, res) => {
  res.json(await loadLocalPulseConfig());
});


app.get("/api/i18n", async (_req, res) => {
  res.json(await loadI18nConfig());
});

app.put("/api/i18n/language", async (req, res) => {
  await saveI18nConfig({
    language: normalizeLanguage(req.body.language)
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/settings/location", async (req, res) => {
  const current = await loadAppConfig();
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: "Location latitude and longitude are required numbers" });
  }

  await saveAppConfig({
    timezone: cleanText(req.body.timezone) || current.timezone,
    weather: {
      ...(current.weather || {}),
      location: cleanText(req.body.location) || current.weather?.location || "Local weather",
      latitude,
      longitude
    }
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/settings/layout", async (req, res) => {
  const current = await loadI18nConfig();

  await saveI18nConfig({
    language: current.language,
    layout: {
      ...(current.layout || {}),
      ...(req.body || {})
    }
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/settings/slides", async (req, res) => {
  const current = await loadI18nConfig();

  await saveI18nConfig({
    language: current.language,
    slides: {
      ...(current.slides || {}),
      ...(req.body || {})
    }
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/i18n/labels/:language", async (req, res) => {
  const current = await loadI18nConfig();
  const language = normalizeLanguage(req.params.language);
  const labels = req.body.labels || {};

  const cleanedLabels = Object.fromEntries(
    Object.entries(labels)
      .map(([key, value]) => [key, cleanText(value)])
      .filter(([key]) => key)
  );

  await saveI18nConfig({
    ...current,
    labels: {
      ...(current.labels || {}),
      [language]: {
        ...((current.labels || {})[language] || {}),
        ...cleanedLabels
      }
    }
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/local-pulse/weather", async (req, res) => {
  const current = await loadLocalPulseConfig();
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: "Weather latitude and longitude are required numbers" });
  }

  await saveLocalPulseConfig({
    ...current,
    weather: {
      enabled: req.body.enabled !== false,
      location: cleanText(req.body.location) || "Local weather",
      latitude,
      longitude
    }
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/local-pulse/opening-hours", async (req, res) => {
  const current = await loadLocalPulseConfig();
  const weekly = {};
  const sourceWeekly = req.body.weekly || {};

  for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]) {
    weekly[day] = normalizeTimeRanges(sourceWeekly[day]);
  }

  await saveLocalPulseConfig({
    ...current,
    openingHours: {
      ...current.openingHours,
      enabled: req.body.enabled !== false,
      weekly
    }
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/local-pulse/messages", async (req, res) => {
  const current = await loadLocalPulseConfig();
  const title = cleanText(req.body.title);
  const body = cleanText(req.body.body);

  if (!title && !body) {
    return res.status(400).json({ error: "Message title or body is required" });
  }

  await saveLocalPulseConfig({
    ...current,
    messages: [
      ...(current.messages || []),
      { id: createId("message"), title: title || "Announcement", body, imageUrl: cleanText(req.body.imageUrl), enabled: true }
    ]
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.delete("/api/local-pulse/messages/:id", async (req, res) => {
  const current = await loadLocalPulseConfig();
  await saveLocalPulseConfig({
    ...current,
    messages: (current.messages || []).filter((item) => item.id !== req.params.id)
  });

  await broadcastStatus();
  res.json(await buildStatus());
});

app.put("/api/staff/:filename/profile", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const staff = await getStaffLibrary();

  if (!staff.some((person) => person.filename === filename)) {
    return res.status(400).json({ error: "Unknown staff image filename" });
  }

  await updateStaffProfile(filename, {
    note: cleanText(req.body.note),
    statusLabel: cleanText(req.body.statusLabel)
  });
  await broadcastStatus();
  res.json(await buildStatus());
});


app.delete("/api/staff/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const staff = await getStaffLibrary();

  if (!staff.some((person) => person.filename === filename)) {
    return res.status(400).json({ error: "Unknown staff image filename" });
  }

  await fs.promises.unlink(path.join(config.staffDir, filename)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await deleteStaffProfile(filename);

  const state = await loadState();
  if (state.selectedStaffFilename === filename) {
    await saveState({ selectedStaffFilename: null });
  }

  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/on-call", async (req, res) => {
  const { filename } = req.body;
  const staff = await getStaffLibrary();

  if (!staff.some((person) => person.filename === filename)) {
    return res.status(400).json({ error: "Unknown staff image filename" });
  }

  await saveState({ selectedStaffFilename: filename });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/previous", async (_req, res) => {
  const [videos, state] = await Promise.all([getVideoLibrary(), loadState()]);
  const previousIndex = videos.length ? (state.currentVideoIndex - 1 + videos.length) % videos.length : 0;
  await saveState({ currentVideoIndex: previousIndex, nowPlayingOverride: null });
  io.emit("command", { type: "nextVideo", index: previousIndex });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/next", async (_req, res) => {
  const [videos, state] = await Promise.all([getVideoLibrary(), loadState()]);
  const nextIndex = videos.length ? (state.currentVideoIndex + 1) % videos.length : 0;
  await saveState({ currentVideoIndex: nextIndex, nowPlayingOverride: null });
  io.emit("command", { type: "nextVideo", index: nextIndex });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/current", async (req, res) => {
  const videos = await getVideoLibrary();
  const index = Number(req.body.index);
  const safeIndex = videos.length && Number.isFinite(index)
    ? Math.max(0, Math.min(index, videos.length - 1))
    : 0;

  await saveState({ currentVideoIndex: safeIndex, nowPlayingOverride: null });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/play-highlight", async (req, res) => {
  const highlight = await getFabAcademyHighlightById(cleanText(req.body.id));

  if (!highlight || !highlight.url) {
    return res.status(404).json({ error: "Highlight video not found" });
  }

  await saveState({ nowPlayingOverride: highlight });
  io.emit("command", { type: "playOnce", video: highlight });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/play-neil-project-pick", async (req, res) => {
  const pick = await getNeilProjectPickById(cleanText(req.body.id));

  if (!pick || !pick.url) {
    return res.status(404).json({ error: "Neil Project Pick video not found" });
  }

  await saveState({ nowPlayingOverride: pick });
  io.emit("command", { type: "playOnce", video: pick });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/clear-override", async (_req, res) => {
  await saveState({ nowPlayingOverride: null });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/video/pause-toggle", async (_req, res) => {
  io.emit("command", { type: "pauseToggle" });
  res.json({ ok: true });
});

app.post("/api/announcement", async (req, res) => {
  await saveState({ announcement: String(req.body.announcement || "").trim() });
  await broadcastStatus();
  res.json(await buildStatus());
});

app.post("/api/settings/location/timezone", (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: "Latitude and longitude are required numbers" });
  }

  try {
    const timezone = tzLookup(latitude, longitude);
    res.json({ timezone });
  } catch (error) {
    res.status(400).json({ error: "Could not determine timezone for this location" });
  }
});

io.on("connection", async (socket) => {
  socket.emit("status", await buildStatus());
});

chokidar.watch([config.videosDir, config.staffDir, config.slidesDir], { ignoreInitial: true })
  .on("all", async () => {
    await broadcastStatus();
  });

startGlobalPulseRefresh({
  onRefresh: broadcastStatus
});

server.listen(config.port, () => {
  console.log(`FabLabTV is running`);
  console.log(`TV screen:    http://localhost:${config.port}/screen`);
  console.log(`Staff remote: http://localhost:${config.port}/remote`);
  console.log(`Status:       http://localhost:${config.port}/api/status`);
});
