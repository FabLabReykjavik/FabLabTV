// Media and catalog library helpers.
// Discovers local videos/staff images, loads saved staff metadata, and merges
// optional Fab Academy highlight streams into the randomized TV playlist.

import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { isLabOpenNow, loadLocalPulseConfig } from "./localPulse.js";

const videoSourcesPath = path.join(config.dataDir, "videoSources.json");
const videoSourcesExamplePath = path.join(config.dataDir, "videoSources.example.json");
const fabAcademyHighlightsPath = path.join(config.dataDir, "fabAcademyHighlights.json");

const staffProfilesPath = path.join(config.dataDir, "staffProfiles.json");
const staffProfilesExamplePath = path.join(config.dataDir, "staffProfiles.example.json");

const defaultVideoSources = {
  localVideos: true,
  fabAcademyHighlights: false,
  fabAcademyHighlightsAfterHours: false,
  localVideosPerCycle: 1,
  fabAcademyHighlightsPerCycle: 1
};

function stripExtension(filename) {
  return path.basename(filename, path.extname(filename));
}

function niceNameFromFilename(filename) {
  return stripExtension(filename)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeStaffProfiles(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([filename, profile]) => [
      filename,
      {
        note: String(profile?.note || profile?.message || "").trim(),
        statusLabel: String(profile?.statusLabel || profile?.tagline || "").trim()
      }
    ])
  );
}

export async function loadStaffProfiles() {
  const defaultProfiles = await readJsonFile(staffProfilesExamplePath, {});
  const runtimeProfiles = await readJsonFile(staffProfilesPath, defaultProfiles);
  return normalizeStaffProfiles(runtimeProfiles);
}

export async function saveStaffProfiles(value) {
  const normalized = normalizeStaffProfiles(value);
  await writeJsonFile(staffProfilesPath, normalized);
  return normalized;
}

export async function updateStaffProfile(filename, profile = {}) {
  const safeFilename = path.basename(String(filename || ""));
  if (!safeFilename) return await loadStaffProfiles();

  const profiles = await loadStaffProfiles();
  profiles[safeFilename] = {
    ...(profiles[safeFilename] || {}),
    note: String(profile.note || profile.message || "").trim(),
    statusLabel: String(profile.statusLabel || profile.tagline || "").trim()
  };

  return await saveStaffProfiles(profiles);
}

export async function deleteStaffProfile(filename) {
  const safeFilename = path.basename(String(filename || ""));
  const profiles = await loadStaffProfiles();
  delete profiles[safeFilename];
  return await saveStaffProfiles(profiles);
}

function normalizeCycleCount(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function normalizeVideoSourcesConfig(value = {}) {
  return {
    localVideos: value.localVideos !== false,
    fabAcademyHighlights: value.fabAcademyHighlights === true,
    fabAcademyHighlightsAfterHours: value.fabAcademyHighlightsAfterHours === true,
    localVideosPerCycle: normalizeCycleCount(value.localVideosPerCycle),
    fabAcademyHighlightsPerCycle: normalizeCycleCount(value.fabAcademyHighlightsPerCycle)
  };
}

export async function loadVideoSourcesConfig() {
  const defaultConfig = await readJsonFile(videoSourcesExamplePath, defaultVideoSources);
  const runtimeConfig = await readJsonFile(videoSourcesPath, defaultConfig);
  return normalizeVideoSourcesConfig(runtimeConfig);
}

export async function saveVideoSourcesConfig(value) {
  const normalized = normalizeVideoSourcesConfig(value);
  await writeJsonFile(videoSourcesPath, normalized);
  return normalized;
}

async function loadFabAcademyHighlightsCatalog() {
  const catalog = await readJsonFile(fabAcademyHighlightsPath, { items: [] });
  return Array.isArray(catalog.items) ? catalog.items : [];
}

export async function getFabAcademyHighlightsCatalog() {
  const items = await loadFabAcademyHighlightsCatalog();
  return items.map((item, index) => formatFabAcademyVideo(item, index));
}

export async function getFabAcademyHighlightsSummary() {
  const items = await getFabAcademyHighlightsCatalog();
  const years = [...new Set(items.map((item) => item.year).filter(Boolean))].sort((a, b) => b - a);
  const labs = [...new Set(items.map((item) => item.lab).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return { items, years, labs };
}

async function listFiles(dir, allowedExtensions) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .filter((entry) => allowedExtensions.includes(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function getLocalVideoLibrary() {
  const files = await listFiles(config.videosDir, config.videoExtensions);

  return files.map((file, index) => ({
    id: `video-${Buffer.from(file).toString("base64url")}`,
    source: "local",
    title: niceNameFromFilename(file),
    filename: file,
    url: `/media/videos/${encodeURIComponent(file)}`
  }));
}

export async function getLocalSlideLibrary() {
  const files = await listFiles(config.slidesDir, [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif"
  ]);

  return files.map((file) => ({
    id: `slide-${Buffer.from(file).toString("base64url")}`,
    source: "slide",
    title: niceNameFromFilename(file),
    filename: file,
    url: `/media/slides/${encodeURIComponent(file)}`
  }));
}

function formatFabAcademyVideo(item, index) {
  const labName = niceNameFromFilename(item.lab || "Fab Academy");
  const title = item.title || niceNameFromFilename(item.student || "Fab Academy Highlight");
  const year = Number(item.videoYear || item.sourcePageYear);

  return {
    id: `fabacademy-highlight-${item.id || index}`,
    source: "fabacademy-highlights",
    remote: true,
    title,
    subtitle: `${labName}${year ? ` • ${year}` : ""}`,
    detail: item.mention || item.section || "Fab Academy Highlight",
    url: item.url,
    lab: item.lab || "",
    labName,
    student: item.student || "",
    mention: item.mention || "",
    year
  };
}

export async function getFabAcademyHighlightById(id) {
  const items = await getFabAcademyHighlightsCatalog();
  return items.find((item) => item.id === id) || null;
}

let shuffledVideoCache = { signature: "", items: [] };

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildBalancedPlaylist(localVideos, highlightVideos, options = {}) {
  if (!localVideos.length) return shuffleItems(highlightVideos);
  if (!highlightVideos.length) return shuffleItems(localVideos);

  const localPerCycle = normalizeCycleCount(options.localVideosPerCycle);
  const highlightsPerCycle = normalizeCycleCount(options.fabAcademyHighlightsPerCycle);

  if (!localPerCycle && !highlightsPerCycle) {
    return [];
  }

  if (!localPerCycle) {
    return shuffleItems(highlightVideos);
  }

  if (!highlightsPerCycle) {
    return shuffleItems(localVideos);
  }

  const shuffledLocalVideos = shuffleItems(localVideos);
  const shuffledHighlightVideos = shuffleItems(highlightVideos);
  const playlist = [];
  let localIndex = 0;
  let highlightIndex = 0;

  while (
    localIndex < shuffledLocalVideos.length ||
    highlightIndex < shuffledHighlightVideos.length
  ) {
    for (let count = 0; count < localPerCycle && localIndex < shuffledLocalVideos.length; count += 1) {
      playlist.push(shuffledLocalVideos[localIndex]);
      localIndex += 1;
    }

    for (let count = 0; count < highlightsPerCycle && highlightIndex < shuffledHighlightVideos.length; count += 1) {
      playlist.push(shuffledHighlightVideos[highlightIndex]);
      highlightIndex += 1;
    }
  }

  return playlist;
}

function getVideoSignature(items) {
  return items.map((item) => item.id).join("|");
}

export async function getVideoLibrary() {
  const [videoSources, localPulseConfig] = await Promise.all([
    loadVideoSourcesConfig(),
    loadLocalPulseConfig()
  ]);

  const openingHoursStatus = isLabOpenNow(localPulseConfig, config.timezone || "Atlantic/Reykjavik");

  const localVideos = videoSources.localVideos ? await getLocalVideoLibrary() : [];
  const highlightsAllowed =
    openingHoursStatus.isOpen ||
    videoSources.fabAcademyHighlightsAfterHours;

  const highlightVideos =
    videoSources.fabAcademyHighlights && highlightsAllowed
      ? await getFabAcademyHighlightsCatalog()
      : [];


  const videos = buildBalancedPlaylist(localVideos, highlightVideos, videoSources);
  const signature = getVideoSignature(videos);

  if (signature !== shuffledVideoCache.signature) {
    shuffledVideoCache = {
      signature,
      items: videos
    };
  }

  return shuffledVideoCache.items;
}

export async function getStaffLibrary() {
  const [files, profiles] = await Promise.all([
    listFiles(config.staffDir, config.staffImageExtensions),
    loadStaffProfiles()
  ]);

  return files.map((file, index) => {
    const profile = profiles[file] || {};

    return {
      id: `staff-${index}-${Buffer.from(file).toString("base64url")}`,
      name: niceNameFromFilename(file),
      filename: file,
      imageUrl: `/media/staff/${encodeURIComponent(file)}`,
      note: profile.note || "",
      statusLabel: profile.statusLabel || ""
    };
  });
}
