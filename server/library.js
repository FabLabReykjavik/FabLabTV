// Media and catalog library helpers.
// Discovers local videos/staff images, loads saved staff metadata, and merges
// optional Fab Academy highlight streams into the randomized TV playlist.

import fs from "node:fs/promises";
import path from "node:path";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

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
  slides: true,
  fabAcademyHighlightsAfterHours: false,
  localVideosPerCycle: 1,
  fabAcademyHighlightsPerCycle: 1,
  slidesPerCycle: 1
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
    slides: value.slides !== false,
    fabAcademyHighlightsAfterHours: value.fabAcademyHighlightsAfterHours === true,
    localVideosPerCycle: normalizeCycleCount(value.localVideosPerCycle),
    fabAcademyHighlightsPerCycle: normalizeCycleCount(value.fabAcademyHighlightsPerCycle),
    slidesPerCycle: normalizeCycleCount(value.slidesPerCycle)
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

function safeCacheName(filename) {
  return stripExtension(filename)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "pdf-slide";
}

function getPdfCacheDir(filename) {
  return path.join(config.slideCacheDir, safeCacheName(filename));
}

async function listCachedPdfPages(filename) {
  const cacheDir = getPdfCacheDir(filename);

  try {
    const files = await listFiles(cacheDir, [".jpg", ".jpeg"]);
    return files.map((file) => ({
      file,
      cacheDir
    }));
  } catch {
    return [];
  }
}

const pdfRenderJobs = new Map();

async function renderPdfToCache(filename) {
  if (pdfRenderJobs.has(filename)) {
    return await pdfRenderJobs.get(filename);
  }

  const renderJob = renderPdfToCacheUncached(filename);
  pdfRenderJobs.set(filename, renderJob);

  try {
    return await renderJob;
  } finally {
    pdfRenderJobs.delete(filename);
  }
}

async function renderPdfToCacheUncached(filename) {
  const sourcePath = path.join(config.slidesDir, filename);
  const cacheDir = getPdfCacheDir(filename);

  await fs.mkdir(cacheDir, { recursive: true });

  console.log(`[Slides] Generating PDF cache: ${filename}`);

  try {
    const data = await fs.readFile(sourcePath);
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(data),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true
    }).promise;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      const outputPath = path.join(cacheDir, `page-${pageNumber}.jpg`);
      await fs.writeFile(outputPath, canvas.toBuffer("image/jpeg", 85));
    }

    console.log(`[Slides] Cached ${pdf.numPages} pages from ${filename}`);

    return await listCachedPdfPages(filename);
  } catch (error) {
    console.error(`[Slides] Failed to cache PDF ${filename}: ${error.message}`);
    return [];
  }
}

export async function getLocalSlideLibrary() {
  const files = await listFiles(config.slidesDir, [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".svg"
  ]);

  const imageFiles = files.filter(
    (file) => path.extname(file).toLowerCase() !== ".pdf"
  );

  const pdfFiles = files.filter(
    (file) => path.extname(file).toLowerCase() === ".pdf"
  );

  const imageSlides = imageFiles.map((file) => ({
    id: `slide-${Buffer.from(file).toString("base64url")}`,
    source: "slide",
    title: niceNameFromFilename(file),
    filename: file,
    url: `/media/slides/${encodeURIComponent(file)}`
  }));

  const pdfSlides = [];

  for (const pdfFile of pdfFiles) {
    let pages = await listCachedPdfPages(pdfFile);

    if (!pages.length) {
      pages = await renderPdfToCache(pdfFile);
    }

    for (const [index, page] of pages.entries()) {
      pdfSlides.push({
        id: `slide-pdf-${Buffer.from(`${pdfFile}-${page.file}`).toString("base64url")}`,
        source: "slide",
        title: `${niceNameFromFilename(pdfFile)} — Page ${index + 1}`,
        filename: pdfFile,
        url: `/media/slide-cache/${encodeURIComponent(safeCacheName(pdfFile))}/${encodeURIComponent(page.file)}`
      });
    }
  }

  return [...imageSlides, ...pdfSlides];
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

function buildBalancedPlaylist(localVideos, highlightVideos, slides = [], options = {}) {
  const groups = [
    {
      count: normalizeCycleCount(options.localVideosPerCycle),
      items: shuffleItems(localVideos)
    },
    {
      count: normalizeCycleCount(options.fabAcademyHighlightsPerCycle),
      items: shuffleItems(highlightVideos)
    },
    {
      count: normalizeCycleCount(options.slidesPerCycle),
      items: shuffleItems(slides)
    }
  ].filter((group) => group.count > 0 && group.items.length > 0);

  if (!groups.length) {
    return [];
  }

  const maxItems = groups.reduce(
    (total, group) => total + group.items.length * group.count,
    0
  );

  const playlist = [];
  const indexes = new Array(groups.length).fill(0);

  while (playlist.length < maxItems) {
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];

      for (let count = 0; count < group.count; count += 1) {
        const item = group.items[indexes[groupIndex] % group.items.length];

        playlist.push(item);
        indexes[groupIndex] += 1;

        if (playlist.length >= maxItems) {
          break;
        }
      }

      if (playlist.length >= maxItems) {
        break;
      }
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
  const slides = videoSources.slides ? await getLocalSlideLibrary() : [];

  const highlightsAllowed =
    openingHoursStatus.isOpen ||
    videoSources.fabAcademyHighlightsAfterHours;

  const highlightVideos =
    videoSources.fabAcademyHighlights && highlightsAllowed
      ? await getFabAcademyHighlightsCatalog()
      : [];

  const signature = [
    getVideoSignature([
      ...localVideos,
      ...highlightVideos,
      ...slides
    ]),
    videoSources.localVideosPerCycle,
    videoSources.fabAcademyHighlightsPerCycle,
    videoSources.slidesPerCycle
  ].join("|");

  if (signature !== shuffledVideoCache.signature) {
    shuffledVideoCache = {
      signature,
      items: buildBalancedPlaylist(localVideos, highlightVideos, slides, videoSources)
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
