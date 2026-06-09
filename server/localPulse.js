// Local Pulse builder.
// Turns staff-managed localPulse.json data plus weather into normalized cards
// for the TV rotation. Staff can edit this content from /remote.

import path from "node:path";
import { config } from "./config.js";
import { readJsonFile, writeJsonFile } from "./utils/filesystem.js";
import { getWeather } from "./services/weatherService.js";
import { createTranslator, getLocale } from "./i18n.js";

const localPulseFile = path.join(config.dataDir, "localPulse.json");
const localPulseExampleFile = path.join(config.dataDir, "localPulse.example.json");

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

export const defaultLocalPulse = {
  weather: {
    enabled: true,
    location: "Reykjavik",
    latitude: 64.1466,
    longitude: -21.9426
  },
  openingHours: {
    enabled: true,
    weekly: {
      monday: [{ open: "09:00", close: "17:00" }],
      tuesday: [{ open: "09:00", close: "17:00" }],
      wednesday: [{ open: "09:00", close: "17:00" }],
      thursday: [{ open: "09:00", close: "17:00" }],
      friday: [{ open: "09:00", close: "17:00" }],
      saturday: [],
      sunday: []
    },
    exceptions: []
  },
  messages: [
    {
      id: "welcome",
      title: "Welcome to the Lab",
      body: "Ask the on-call staff member if you need help.",
      enabled: true
    }
  ]
};

function mergeLocalPulseConfig(userConfig = {}) {
  return {
    ...defaultLocalPulse,
    ...userConfig,
    weather: {
      ...defaultLocalPulse.weather,
      ...(userConfig.weather || {})
    },
    openingHours: {
      ...defaultLocalPulse.openingHours,
      ...(userConfig.openingHours || {}),
      weekly: {
        ...defaultLocalPulse.openingHours.weekly,
        ...(userConfig.openingHours?.weekly || {})
      },
      exceptions: userConfig.openingHours?.exceptions || defaultLocalPulse.openingHours.exceptions
    },
    messages: userConfig.messages || userConfig.announcements || defaultLocalPulse.messages
  };
}

export async function loadLocalPulseConfig() {
  const defaultConfig = await readJsonFile(localPulseExampleFile, defaultLocalPulse);
  const runtimeConfig = await readJsonFile(localPulseFile, defaultConfig);
  return mergeLocalPulseConfig(runtimeConfig);
}

export async function saveLocalPulseConfig(nextConfig) {
  const merged = mergeLocalPulseConfig(nextConfig);
  await writeJsonFile(localPulseFile, merged);
  return merged;
}

export function getLocalDateParts(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  }).formatToParts(new Date());

  const value = (type) => parts.find((part) => part.type === type)?.value;

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday")?.toLowerCase()
  };
}

function getLocalTimeParts(timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const value = (type) => parts.find((part) => part.type === type)?.value;

  return {
    hour: value("hour") || "00",
    minute: value("minute") || "00",
    minutes: Number(value("hour") || 0) * 60 + Number(value("minute") || 0)
  };
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || "").split(":").map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function isTimeWithinRange(nowMinutes, range) {
  const openMinutes = timeToMinutes(range?.open);
  const closeMinutes = timeToMinutes(range?.close);

  if (openMinutes == null || closeMinutes == null) return false;

  if (openMinutes === closeMinutes) return true;

  if (openMinutes < closeMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}

export function isLabOpenNow(localPulseConfig, timezone = "Atlantic/Reykjavik") {
  const openingHours = localPulseConfig?.openingHours;

  if (!openingHours?.enabled) {
    return { enabled: false, isOpen: true, reason: "opening-hours-disabled" };
  }

  const { date, weekday } = getLocalDateParts(timezone);
  const { ranges, note } = getOpeningHoursForDate(openingHours, date, weekday);
  const time = getLocalTimeParts(timezone);
  const isOpen = ranges.some((range) => isTimeWithinRange(time.minutes, range));

  return {
    enabled: true,
    isOpen,
    date,
    weekday,
    time: `${time.hour}:${time.minute}`,
    ranges,
    note: note || null
  };
}

function formatTimeRange(ranges = [], t = (key) => key) {
  if (!ranges.length) return t("closed");
  return ranges.map((range) => `${range.open}–${range.close}`).join(", ");
}

function getOpeningHoursForDate(openingHours, date, weekday) {
  const exception = (openingHours.exceptions || []).find((item) => item.date === date);

  if (exception?.closed) {
    return { ranges: [], note: exception.note || null };
  }

  return {
    ranges: exception?.hours || openingHours.weekly?.[weekday] || [],
    note: exception?.note || null
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatWeekday(date, timezone, length = "short", locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: length
  }).format(date);
}

function getOpeningHoursTodayItem(openingHours, timezone, t) {
  if (!openingHours?.enabled) return null;

  const { date, weekday } = getLocalDateParts(timezone);
  const { ranges, note } = getOpeningHoursForDate(openingHours, date, weekday);

  return {
    id: `opening-hours-today-${date}`,
    type: "opening-hours-today",
    title: ranges.length ? t("openToday") : t("closedToday"),
    body: note || formatTimeRange(ranges, t),
    priority: 20
  };
}

function getWeekStartMonday(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function getOpeningHoursWeekItem(openingHours, timezone, locale, t) {
  if (!openingHours?.enabled) return null;

  const { date: todayKey } = getLocalDateParts(timezone);
  const monday = getWeekStartMonday(todayKey);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const dateKey = formatDateKey(date, timezone);
    const weekday = formatWeekday(date, timezone, "long", "en-US").toLowerCase();
    const label = formatWeekday(date, timezone, "short", locale);
    const { ranges, note } = getOpeningHoursForDate(openingHours, dateKey, weekday);

    if (!ranges.length) return null;

    return {
      date: dateKey,
      label,
      hours: note || formatTimeRange(ranges, t)
    };
  }).filter(Boolean);

  if (!days.length) return null;

  return {
    id: "opening-hours-week",
    type: "opening-hours-week",
    title: t("openingHoursWeek"),
    body: days.map((day) => `${day.label}: ${day.hours}`).join(" · "),
    days,
    priority: 21
  };
}

function formatForecastDate(date, locale = "en-US") {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(parsed);
}

async function getWeatherItems(localPulseConfig, appConfig, locale, t) {
  if (!localPulseConfig.weather?.enabled) return [];

  const weather = await getWeather({
    ...appConfig,
    enableWeather: true,
    weather: {
      ...(appConfig.weather || {}),
      ...localPulseConfig.weather
    }
  });

  if (!weather) return [];

  if (weather.temperature == null && (!weather.label || weather.label === "Weather unavailable")) {
    weather.label = t("weatherUnavailable");
  }

  const todayItem = {
    id: "local-weather-today",
    type: "weather-today",
    title: t("weatherToday"),
    body: weather.label || t("weatherUnavailable"),
    weather,
    priority: 10
  };

  const forecastDays = (weather.forecast || []).slice(1, 5).map((day) => ({
    ...day,
    label: formatForecastDate(day.date, locale)
  }));

  const forecastItem = forecastDays.length
    ? {
        id: "local-weather-forecast",
        type: "weather-forecast",
        title: t("weatherForecast"),
        body: forecastDays.map((day) => `${day.label}: ${day.icon} ${day.min}–${day.max}°C`).join(" · "),
        forecast: forecastDays,
        priority: 11
      }
    : null;

  return [todayItem, forecastItem].filter(Boolean);
}

function isActive(item, now = new Date()) {
  if (item.enabled === false) return false;
  if (item.startsAt && new Date(item.startsAt) > now) return false;
  if (item.endsAt && new Date(item.endsAt) < now) return false;
  return true;
}

function normalizeItem(item, type) {
  return {
    id: item.id || `${type}-${item.title || item.body || Date.now()}`,
    type,
    title: item.title || item.label || "Local Pulse",
    body: item.body || item.message || item.note || item.when || "",
    imageUrl: item.imageUrl || "",
    startsAt: item.startsAt || null,
    endsAt: item.endsAt || null,
    priority: item.priority || 50
  };
}

export async function getLocalPulse(appConfig = {}, i18nConfig = null) {
  const localPulseConfig = await loadLocalPulseConfig();

  const timezone = appConfig.timezone || "Atlantic/Reykjavik";
  const locale = getLocale(i18nConfig);
  const t = createTranslator(i18nConfig);

  const [weatherItems, openingHoursTodayItem, openingHoursWeekItem] = await Promise.all([
    getWeatherItems(localPulseConfig, appConfig, locale, t),
    Promise.resolve(getOpeningHoursTodayItem(localPulseConfig.openingHours, timezone, t)),
    Promise.resolve(getOpeningHoursWeekItem(localPulseConfig.openingHours, timezone, locale, t))
  ]);

  const managedItems = [
    ...(localPulseConfig.messages || []).map((item) => normalizeItem(item, "message"))
  ].filter(isActive);

  const items = [...weatherItems, openingHoursTodayItem, openingHoursWeekItem, ...managedItems]
    .filter(Boolean)
    .sort((a, b) => (a.priority || 50) - (b.priority || 50));

  return {
    updatedAt: new Date().toISOString(),
    config: localPulseConfig,
    items
  };
}
