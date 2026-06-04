// Weather service for Local Pulse.
// Keeps weather polite and reliable for signage use:
// - in-memory cache for normal operation
// - persistent cache so restarts/offline days still show last good weather
// - throttled warnings so temporary API errors do not spam the console

import path from "node:path";
import { config } from "../config.js";
import { getOpenMeteoWeather } from "../../integrations/weather/openMeteo.js";
import { readJsonFile, writeJsonFile } from "../utils/filesystem.js";

const weatherCacheFile = path.join(config.dataDir, "weatherCache.json");
const warningCooldownMs = 60 * 60 * 1000;

let cache = {
  key: null,
  updatedAt: 0,
  item: null
};

let lastWarningAt = 0;
let lastWarningMessage = "";

function getCacheKey(appConfig = {}) {
  const weatherConfig = appConfig.weather || {};
  return JSON.stringify({
    latitude: Number(weatherConfig.latitude),
    longitude: Number(weatherConfig.longitude),
    timezone: appConfig.timezone,
    location: weatherConfig.location
  });
}

function isFresh(updatedAt, refreshMs) {
  return updatedAt && Date.now() - updatedAt < refreshMs;
}

function getFallbackWeather(weatherConfig = {}) {
  return {
    source: "Weather",
    location: weatherConfig.location,
    label: "Weather unavailable"
  };
}

function logWeatherWarning(message) {
  const now = Date.now();

  if (message !== lastWarningMessage || now - lastWarningAt > warningCooldownMs) {
    console.warn(`[OpenMeteo] ${message}. Using cached weather if available.`);
    lastWarningAt = now;
    lastWarningMessage = message;
  }
}

async function readPersistentCache(cacheKey) {
  const stored = await readJsonFile(weatherCacheFile, null);

  if (!stored || stored.key !== cacheKey || !stored.item) {
    return null;
  }

  return stored;
}

async function savePersistentCache(cacheKey, item) {
  const stored = {
    key: cacheKey,
    updatedAt: Date.now(),
    item
  };

  await writeJsonFile(weatherCacheFile, stored);
  return stored;
}

export async function getWeather(appConfig = {}) {
  if (appConfig.enableWeather === false) return null;

  const weatherConfig = appConfig.weather || {};
  const refreshMinutes = weatherConfig.refreshMinutes || 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const cacheKey = getCacheKey(appConfig);

  if (cache.item && cache.key === cacheKey && isFresh(cache.updatedAt, refreshMs)) {
    return cache.item;
  }

  const persistentCache = await readPersistentCache(cacheKey);

  if (persistentCache && isFresh(persistentCache.updatedAt, refreshMs)) {
    cache = persistentCache;
    return persistentCache.item;
  }

  const item = await getOpenMeteoWeather({
    latitude: weatherConfig.latitude,
    longitude: weatherConfig.longitude,
    timezone: appConfig.timezone,
    location: weatherConfig.location
  });

  if (item) {
    cache = await savePersistentCache(cacheKey, item);
    return item;
  }

  logWeatherWarning("weather refresh failed");

  if (cache.item && cache.key === cacheKey) {
    return cache.item;
  }

  if (persistentCache?.item) {
    cache = persistentCache;
    return persistentCache.item;
  }

  return getFallbackWeather(weatherConfig);
}
