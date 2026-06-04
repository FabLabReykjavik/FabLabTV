// Automatic Global Pulse provider.
// Fetches public Fab ecosystem pages on startup and once per day, normalizes
// useful public events/announcements into TV cards, and caches results so the
// screen still has content when the network is offline.

import path from "node:path";
import { config } from "./config.js";
import { createTranslator } from "./i18n.js";
import { readJsonFile, writeJsonFile } from "./utils/filesystem.js";

const cacheFile = path.join(config.dataDir, "globalPulseCache.json");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

const sourceUrls = {
  fabAcademySchedule: (year) => `https://fabacademy.org/${year}/schedule`,
  fabAcademyHome: "https://fabacademy.org/",
  fabEvent: "https://fabevent.org/",
  fab26: "https://fab26.fabevent.org/",
  fabFoundation: "https://fabfoundation.org/",
  fabricademyProgram: "https://textile-academy.org/program/",
  fabricademyBootcamp: "https://bootcamp.textile-academy.org/",
  fabFutures: "https://futures.academany.org/",
  fabLearningAcademy: "https://fla.academany.org/program/schedule.html"
};

function createFallbackCache(t) {
  return {
    updatedAt: null,
    source: "fallback",
    errors: [],
    items: [
      {
        id: "global-pulse-connecting",
        type: "community",
        source: "FabLabTV",
        title: t("communityTitle", "Fab Lab Community"),
        value: "",
        body: t("communityBody", "Global community announcements will appear here.")
      }
    ]
  };
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ldquo;/gi, "“");
}

function htmlToText(html) {
  return decodeHtml(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|td|th|h1|h2|h3|h4)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .split("\n")
    .map(cleanText)
    .filter(Boolean)
    .join("\n");
}

function stableId(...parts) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || `global-${Date.now()}`;
}

function titleCaseSlug(value) {
  return cleanText(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseMonthName(value) {
  const month = String(value || "").slice(0, 3).toLowerCase();
  return {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  }[month];
}

function isoDate(year, monthIndex, day) {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateRange(year, startMonth, startDay, endMonth, endDay) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!Number.isFinite(startMonth) || !Number.isFinite(startDay)) return "";
  if (Number.isFinite(endDay)) {
    const endMonthName = monthNames[Number.isFinite(endMonth) ? endMonth : startMonth];
    const startMonthName = monthNames[startMonth];
    return startMonth === endMonth
      ? `${startMonthName} ${startDay}–${endDay}, ${year}`
      : `${startMonthName} ${startDay} – ${endMonthName} ${endDay}, ${year}`;
  }
  return `${monthNames[startMonth]} ${startDay}, ${year}`;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "FabLabTV/0.1 (+https://github.com/)"
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function isFutureOrRecent(item, now = new Date()) {
  if (!item.startsAt) return true;
  const date = new Date(`${item.startsAt}T23:59:59Z`);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= now.getTime() - 14 * 24 * 60 * 60 * 1000;
}

function parseDatedLines(text, { year, source, url, defaultTitlePrefix = "" }) {
  const items = [];
  const lines = String(text || "").split("\n").map(cleanText).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:\s*[–-]\s*(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*)?(\d{1,2}))?[:\s–-]+(.+)/i);

    if (!match) continue;

    const startMonth = parseMonthName(match[1]);
    const startDay = Number(match[2]);
    const endMonth = match[3] ? parseMonthName(match[3]) : startMonth;
    const endDay = match[4] ? Number(match[4]) : null;
    const rawTitle = cleanText(match[5]).replace(/\s*\(video\)\s*/i, "");

    if (!rawTitle || /^(video|recording)$/i.test(rawTitle)) continue;

    const startsAt = isoDate(year, startMonth, startDay);
    const dateRange = formatDateRange(year, startMonth, startDay, endMonth, endDay);
    const title = defaultTitlePrefix && !rawTitle.toLowerCase().includes(defaultTitlePrefix.toLowerCase())
      ? `${defaultTitlePrefix}: ${rawTitle}`
      : rawTitle;

    items.push({
      id: stableId(source, year, title, startsAt),
      type: "event",
      source,
      title,
      value: dateRange,
      body: source,
      startsAt,
      url
    });
  }

  return items;
}

function parseFabAcademySchedule(html, year) {
  const url = sourceUrls.fabAcademySchedule(year);
  const text = htmlToText(html);
  return parseDatedLines(text, {
    year,
    source: "Fab Academy",
    url
  }).filter((item) => !/recitation|bootcamp|review/i.test(item.title));
}

function parseFabricademyProgram(html) {
  const text = htmlToText(html);
  const items = parseDatedLines(text, {
    year: new Date().getFullYear(),
    source: "Fabricademy",
    url: sourceUrls.fabricademyProgram,
    defaultTitlePrefix: "Global lecture"
  });

  const unique = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.startsAt}-${item.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique.slice(0, 8);
}

function parseKnownFabEvent(html) {
  const text = htmlToText(html);
  const match = text.match(/(FAB\d{2})[\s\S]{0,240}?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\.?\s+\d{1,2}\s*[–-]\s*\d{1,2},?\s+20\d{2})[\s\S]{0,180}?((?:Boston|Cambridge|Massachusetts|USA|United States)[^\n.]*)/i);

  if (!match) return [];

  const dateMatch = match[2].match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})\s*[–-]\s*(\d{1,2}),?\s+(20\d{2})/i);
  const startsAt = dateMatch
    ? isoDate(Number(dateMatch[4]), parseMonthName(dateMatch[1]), Number(dateMatch[2]))
    : null;

  return [{
    id: stableId("fab-event", match[1], startsAt || match[2]),
    type: "event",
    source: "FABx",
    title: match[1].toUpperCase(),
    value: cleanText(match[2]),
    body: cleanText(match[3]) || "Annual global Fab Lab conference",
    startsAt,
    url: sourceUrls.fab26
  }];
}

function parseFabFoundation(html) {
  const text = htmlToText(html);
  const items = [];
  const networkMatch = text.match(/more than\s+([\d,]+)\s+worldwide Fab Labs/i);

  if (networkMatch) {
    items.push({
      id: "fab-foundation-network-count",
      type: "network",
      source: "Fab Foundation",
      title: "Fab Lab Network",
      value: `${networkMatch[1]}+ Fab Labs`,
      body: "A worldwide network of digital fabrication labs",
      url: sourceUrls.fabFoundation
    });
  }

  const fabEventItems = parseKnownFabEvent(html).map((item) => ({
    ...item,
    source: "Fab Foundation",
    url: sourceUrls.fabFoundation
  }));

  return [...fabEventItems, ...items];
}

function parseFabAcademyHome(html) {
  const text = htmlToText(html);
  const items = [];

  const nodeMatch = text.match(/Nodes registrations for\s+(20\d{2})\s+cycle are\s+([^\n.]+)/i);
  if (nodeMatch) {
    items.push({
      id: stableId("fabacademy", "nodes", nodeMatch[1]),
      type: "program",
      source: "Fab Academy",
      title: `Fab Academy ${nodeMatch[1]} nodes`,
      value: cleanText(nodeMatch[2]),
      body: "Node registration information",
      url: sourceUrls.fabAcademyHome
    });
  }

  const studentMatch = text.match(/Register for\s+(20\d{2})\s*[–-]?\s*([^\n]+)/i);
  if (studentMatch) {
    items.push({
      id: stableId("fabacademy", "register", studentMatch[1]),
      type: "program",
      source: "Fab Academy",
      title: `Fab Academy ${studentMatch[1]}`,
      value: "Registration",
      body: cleanText(studentMatch[2]) || "Registration information is available online",
      url: sourceUrls.fabAcademyHome
    });
  }

  return items;
}

function parseFabFutures(html) {
  const text = htmlToText(html);
  const title = text.match(/Fab Futures teaches[^\n.]+/i)?.[0] || "21st century vocational skills";
  return [{
    id: "fab-futures-program",
    type: "program",
    source: "Fab Futures",
    title: "Fab Futures",
    value: "Academany",
    body: cleanText(title),
    url: sourceUrls.fabFutures
  }];
}

function parseFabLearningAcademy(html) {
  const text = htmlToText(html);
  const items = parseDatedLines(text, {
    year: new Date().getFullYear(),
    source: "Fab Learning Academy",
    url: sourceUrls.fabLearningAcademy,
    defaultTitlePrefix: "Global class"
  });

  const scheduleMatch = text.match(/Fab Learning Academy will run\s+([^\n.]+)/i);
  if (scheduleMatch) {
    items.unshift({
      id: "fab-learning-academy-schedule",
      type: "program",
      source: "Fab Learning Academy",
      title: "Fab Learning Academy",
      value: "2025–2026",
      body: cleanText(scheduleMatch[1]),
      url: sourceUrls.fabLearningAcademy
    });
  }

  return items.slice(0, 6);
}

function parseFabricademyBootcamp(html) {
  const text = htmlToText(html);
  const match = text.match(/Bootcamp[^\n]{0,120}|Ireland[^\n]{0,120}|Dundalk[^\n]{0,120}/i);

  if (!match) return [];

  return [{
    id: "fabricademy-bootcamp",
    type: "event",
    source: "Fabricademy",
    title: "Fabricademy Bootcamp",
    value: "Textile Academy",
    body: cleanText(match[0]),
    url: sourceUrls.fabricademyBootcamp
  }];
}

function dedupeItems(items) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const key = stableId(item.source, item.title, item.startsAt || item.value || item.body);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...item, id: item.id || key });
  }

  return output;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aDate = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const bDate = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
    if (aDate !== bDate) return aDate - bDate;
    return String(a.source || "").localeCompare(String(b.source || ""));
  });
}

async function collectSource(name, url, parser, errors) {
  try {
    const html = await fetchText(url);
    return parser(html);
  } catch (error) {
    errors.push({ source: name, message: error.message, checkedAt: new Date().toISOString() });
    return [];
  }
}

export async function refreshGlobalPulse({ force = false } = {}) {
  const existing = await readJsonFile(cacheFile, null);
  const lastUpdated = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;

  if (!force && lastUpdated && Date.now() - lastUpdated < ONE_DAY_MS) {
    return existing;
  }

  const currentYear = new Date().getFullYear();
  const years = [...new Set([currentYear, currentYear + 1])];
  const errors = [];
  const collected = [];

  for (const year of years) {
    collected.push(...await collectSource(
      `Fab Academy ${year} schedule`,
      sourceUrls.fabAcademySchedule(year),
      (html) => parseFabAcademySchedule(html, year),
      errors
    ));
  }

  const sourceTasks = [
    collectSource("Fab Academy", sourceUrls.fabAcademyHome, parseFabAcademyHome, errors),
    collectSource("FABx", sourceUrls.fab26, parseKnownFabEvent, errors),
    collectSource("Fab Foundation", sourceUrls.fabFoundation, parseFabFoundation, errors),
    collectSource("Fabricademy", sourceUrls.fabricademyProgram, parseFabricademyProgram, errors),
    collectSource("Fabricademy Bootcamp", sourceUrls.fabricademyBootcamp, parseFabricademyBootcamp, errors),
    collectSource("Fab Futures", sourceUrls.fabFutures, parseFabFutures, errors),
    collectSource("Fab Learning Academy", sourceUrls.fabLearningAcademy, parseFabLearningAcademy, errors)
  ];

  const sourceResults = await Promise.all(sourceTasks);
  collected.push(...sourceResults.flat());

  const now = new Date();
  const items = sortItems(dedupeItems(collected).filter((item) => isFutureOrRecent(item, now))).slice(0, 18);
  const nextCache = {
    updatedAt: new Date().toISOString(),
    source: "online",
    refreshIntervalHours: 24,
    errors,
    items: items.length ? items : (existing?.items || [])
  };

  await writeJsonFile(cacheFile, nextCache);
  return nextCache;
}

export async function getGlobalPulse(_appConfig = {}, i18nConfig = null) {
  const t = createTranslator(i18nConfig);
  const cache = await readJsonFile(cacheFile, null);

  if (cache?.items?.length) {
    return {
      updatedAt: cache.updatedAt,
      source: cache.source || "cache",
      errors: cache.errors || [],
      items: cache.items
    };
  }

  return createFallbackCache(t);
}

export function startGlobalPulseRefresh({ onRefresh } = {}) {
  refreshGlobalPulse({ force: true })
    .then(async () => {
      if (onRefresh) await onRefresh();
    })
    .catch((error) => {
      console.warn("Global Pulse refresh failed:", error.message);
    });

  return setInterval(() => {
    refreshGlobalPulse({ force: true })
      .then(async () => {
        if (onRefresh) await onRefresh();
      })
      .catch((error) => {
        console.warn("Global Pulse refresh failed:", error.message);
      });
  }, ONE_DAY_MS);
}
