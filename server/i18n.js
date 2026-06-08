// Lightweight localization support.
// Dates/months use browser/Intl locales; app-owned labels use editable keys
// stored in data/i18n.json so the project can ship translations.
// The selected language is local runtime state stored in data/userSettings.json.

import path from "node:path";
import { config } from "./config.js";
import { readJsonFile, writeJsonFile } from "./utils/filesystem.js";

const i18nFile = path.join(config.dataDir, "i18n.json");
const userSettingsFile = path.join(config.dataDir, "userSettings.json");

export const supportedLanguages = [
  { code: "en-US", name: "English", locale: "en-US" },
  { code: "is-IS", name: "Icelandic", locale: "is" },
  { code: "es-ES", name: "Spanish", locale: "es-ES" },
  { code: "ja-JP", name: "Japanese", locale: "ja-JP" },
  { code: "da-DK", name: "Danish", locale: "da-DK" },
  { code: "fi-FI", name: "Finnish", locale: "fi-FI" },
  { code: "sv-SE", name: "Swedish", locale: "sv-SE" },
  { code: "nb-NO", name: "Norwegian", locale: "nb-NO" },
  { code: "de-DE", name: "German", locale: "de-DE" },
  { code: "fr-FR", name: "French", locale: "fr-FR" },
  { code: "it-IT", name: "Italian", locale: "it-IT" },
  { code: "nl-NL", name: "Dutch", locale: "nl-NL" },
  { code: "pl-PL", name: "Polish", locale: "pl-PL" },
  { code: "pt-PT", name: "Portuguese", locale: "pt-PT" },
  { code: "cs-CZ", name: "Czech", locale: "cs-CZ" },
  { code: "sk-SK", name: "Slovak", locale: "sk-SK" },
  { code: "sl-SI", name: "Slovenian", locale: "sl-SI" },
  { code: "hr-HR", name: "Croatian", locale: "hr-HR" },
  { code: "hu-HU", name: "Hungarian", locale: "hu-HU" },
  { code: "et-EE", name: "Estonian", locale: "et-EE" },
  { code: "lv-LV", name: "Latvian", locale: "lv-LV" },
  { code: "lt-LT", name: "Lithuanian", locale: "lt-LT" },
  { code: "el-GR", name: "Greek", locale: "el-GR" }
];

export const defaultLabels = {
  "en-US": {
    onCall: "On Call",
    techNews: "Tech News",
    nowPlaying: "Now Playing",
    globalPulse: "Global Pulse",
    localPulse: "Local Pulse",
    weatherToday: "Weather today",
    weatherForecast: "Weather forecast",
    openingHoursToday: "Opening hours today",
    openToday: "Open today",
    closedToday: "Closed today",
    openingHoursWeek: "Opening hours this week",
    wind: "Wind",
    closed: "Closed",
    low: "Low",
    noNews: "No news",
    noStoriesFound: "No stories found",
    noStaffFound: "No staff found",
    addStaffPhotos: "Add staff photos to staff/",
    availableForLabSupport: "Available for lab support",
    addVideos: "Add videos to videos/",
    addVideosOrStreaming: "Add videos to videos/ or turn on streaming highlights in Remote.",
    fabAcademyProjectShowcase: "Fab Academy Project Showcase",
    upcomingWorkshop: "Upcoming workshop",
    localPulseFallbackTitle: "Welcome to the Lab",
    localPulseFallbackBody: "Ask the on-call staff member if you need help.",
    communityTitle: "Fab Lab Community",
    communityBody: "Global community announcements will appear here.",
    weatherUnavailable: "Weather unavailable",
    localWeather: "Local weather",
    statistics: "Statistics",
    status: "Status"
  },
  "is-IS": {
    onCall: "Á vakt",
    techNews: "Fréttir",
    nowPlaying: "Í spilun",
    globalPulse: "Heimspúls",
    localPulse: "Staðarpúls",
    weatherToday: "Veður í dag",
    weatherForecast: "Veðurspá",
    openingHoursToday: "Opnunartími í dag",
    openToday: "Opið í dag",
    closedToday: "Lokað í dag",
    openingHoursWeek: "Opnunartími vikunnar",
    wind: "Vindur",
    closed: "Lokað",
    low: "Lægst",
    noNews: "Engar fréttir",
    noStoriesFound: "Engar fréttir fundust",
    noStaffFound: "Enginn starfsmaður fannst",
    addStaffPhotos: "Bættu myndum í staff/",
    availableForLabSupport: "Tilbúin(n) að aðstoða",
    addVideos: "Bættu myndböndum í videos/",
    fabAcademyProjectShowcase: "Fab Academy verkefni",
    upcomingWorkshop: "Námskeið framundan",
    localPulseFallbackTitle: "Velkomin í smiðjuna",
    localPulseFallbackBody: "Spyrðu starfsfólk á vakt ef þig vantar aðstoð.",
    communityTitle: "Fab Lab samfélagið",
    communityBody: "Tilkynningar frá Fab Lab samfélaginu birtast hér.",
    weatherUnavailable: "Veður ekki tiltækt",
    localWeather: "Staðbundið veður",
    statistics: "Tölfræði",
    status: "Staða"
  },
  "es-ES": {
    onCall: "De guardia",
    techNews: "Noticias",
    nowPlaying: "Reproduciendo",
    globalPulse: "Pulso global",
    localPulse: "Pulso local",
    weatherToday: "Tiempo de hoy",
    weatherForecast: "Pronóstico",
    openingHoursToday: "Horario de hoy",
    openToday: "Abierto hoy",
    closedToday: "Cerrado hoy",
    openingHoursWeek: "Horario de la semana",
    wind: "Viento",
    closed: "Cerrado",
    low: "Mín.",
    noNews: "Sin noticias",
    noStoriesFound: "No se encontraron noticias",
    noStaffFound: "No hay personal",
    addStaffPhotos: "Añade fotos a staff/",
    availableForLabSupport: "Disponible para ayudar",
    addVideos: "Añade vídeos a videos/",
    fabAcademyProjectShowcase: "Proyectos Fab Academy",
    upcomingWorkshop: "Próximo taller",
    localPulseFallbackTitle: "Bienvenido al Lab",
    localPulseFallbackBody: "Pregunta al personal de guardia si necesitas ayuda.",
    communityTitle: "Comunidad Fab Lab",
    communityBody: "Aquí aparecerán anuncios de la comunidad Fab Lab.",
    weatherUnavailable: "Tiempo no disponible",
    localWeather: "Tiempo local",
    statistics: "Estadísticas",
    status: "Estado"
  },
  "ja-JP": {
    onCall: "担当スタッフ",
    techNews: "ニュース",
    nowPlaying: "再生中",
    globalPulse: "グローバル情報",
    localPulse: "ローカル情報",
    weatherToday: "今日の天気",
    weatherForecast: "天気予報",
    openingHoursToday: "本日の開館時間",
    openToday: "本日開館",
    closedToday: "本日休館",
    openingHoursWeek: "今週の開館時間",
    wind: "風速",
    closed: "休館",
    low: "最低",
    noNews: "ニュースなし",
    noStoriesFound: "ニュースが見つかりません",
    noStaffFound: "スタッフが見つかりません",
    addStaffPhotos: "staff/ に写真を追加してください",
    availableForLabSupport: "ラボサポート対応中",
    addVideos: "videos/ に動画を追加してください",
    fabAcademyProjectShowcase: "Fab Academy プロジェクト",
    upcomingWorkshop: "今後のワークショップ",
    localPulseFallbackTitle: "ラボへようこそ",
    localPulseFallbackBody: "サポートが必要な場合は担当スタッフにお声がけください。",
    communityTitle: "Fab Lab コミュニティ",
    communityBody: "Fab Labコミュニティのお知らせがここに表示されます。",
    weatherUnavailable: "天気情報なし",
    localWeather: "地域の天気",
    statistics: "統計",
    status: "ステータス"
  }
};

const generatedLanguageLabels = {
  "da-DK": { onCall: "På vagt", techNews: "Nyheder", nowPlaying: "Afspilles nu", globalPulse: "Global puls", localPulse: "Lokal puls", weatherToday: "Vejret i dag", weatherForecast: "Vejrudsigt", openingHoursToday: "Åbningstider i dag", openToday: "Åbent i dag", closedToday: "Lukket i dag", openingHoursWeek: "Ugens åbningstider", wind: "Vind", closed: "Lukket", low: "Lav" },
  "fi-FI": { onCall: "Päivystys", techNews: "Uutiset", nowPlaying: "Nyt toistetaan", globalPulse: "Globaali pulssi", localPulse: "Paikallinen pulssi", weatherToday: "Sää tänään", weatherForecast: "Sääennuste", openingHoursToday: "Aukioloajat tänään", openToday: "Avoinna tänään", closedToday: "Suljettu tänään", openingHoursWeek: "Viikon aukioloajat", wind: "Tuuli", closed: "Suljettu", low: "Alin" },
  "sv-SE": { onCall: "Jour", techNews: "Nyheter", nowPlaying: "Spelas nu", globalPulse: "Global puls", localPulse: "Lokal puls", weatherToday: "Väder idag", weatherForecast: "Väderprognos", openingHoursToday: "Öppettider idag", openToday: "Öppet idag", closedToday: "Stängt idag", openingHoursWeek: "Veckans öppettider", wind: "Vind", closed: "Stängt", low: "Lägst" },
  "nb-NO": { onCall: "På vakt", techNews: "Nyheter", nowPlaying: "Spilles nå", globalPulse: "Global puls", localPulse: "Lokal puls", weatherToday: "Været i dag", weatherForecast: "Værvarsel", openingHoursToday: "Åpningstider i dag", openToday: "Åpent i dag", closedToday: "Stengt i dag", openingHoursWeek: "Ukens åpningstider", wind: "Vind", closed: "Stengt", low: "Laveste" },
  "de-DE": { onCall: "Bereitschaft", techNews: "Nachrichten", nowPlaying: "Läuft gerade", globalPulse: "Globaler Puls", localPulse: "Lokaler Puls", weatherToday: "Wetter heute", weatherForecast: "Wettervorhersage", openingHoursToday: "Öffnungszeiten heute", openToday: "Heute geöffnet", closedToday: "Heute geschlossen", openingHoursWeek: "Öffnungszeiten diese Woche", wind: "Wind", closed: "Geschlossen", low: "Tief" },
  "fr-FR": { onCall: "De service", techNews: "Actualités", nowPlaying: "En cours", globalPulse: "Pulse global", localPulse: "Pulse local", weatherToday: "Météo du jour", weatherForecast: "Prévisions météo", openingHoursToday: "Horaires aujourd’hui", openToday: "Ouvert aujourd’hui", closedToday: "Fermé aujourd’hui", openingHoursWeek: "Horaires de la semaine", wind: "Vent", closed: "Fermé", low: "Min." },
  "it-IT": { onCall: "Di turno", techNews: "Notizie", nowPlaying: "In riproduzione", globalPulse: "Pulse globale", localPulse: "Pulse locale", weatherToday: "Meteo oggi", weatherForecast: "Previsioni", openingHoursToday: "Orari di oggi", openToday: "Aperto oggi", closedToday: "Chiuso oggi", openingHoursWeek: "Orari della settimana", wind: "Vento", closed: "Chiuso", low: "Min." },
  "nl-NL": { onCall: "Dienst", techNews: "Nieuws", nowPlaying: "Nu afgespeeld", globalPulse: "Globale puls", localPulse: "Lokale puls", weatherToday: "Weer vandaag", weatherForecast: "Weersverwachting", openingHoursToday: "Openingstijden vandaag", openToday: "Vandaag open", closedToday: "Vandaag gesloten", openingHoursWeek: "Openingstijden deze week", wind: "Wind", closed: "Gesloten", low: "Laag" },
  "pl-PL": { onCall: "Dyżur", techNews: "Wiadomości", nowPlaying: "Teraz odtwarzane", globalPulse: "Puls globalny", localPulse: "Puls lokalny", weatherToday: "Pogoda dziś", weatherForecast: "Prognoza pogody", openingHoursToday: "Godziny otwarcia dziś", openToday: "Otwarte dziś", closedToday: "Zamknięte dziś", openingHoursWeek: "Godziny otwarcia w tym tygodniu", wind: "Wiatr", closed: "Zamknięte", low: "Min." },
  "pt-PT": { onCall: "De serviço", techNews: "Notícias", nowPlaying: "A reproduzir", globalPulse: "Pulso global", localPulse: "Pulso local", weatherToday: "Tempo hoje", weatherForecast: "Previsão do tempo", openingHoursToday: "Horário de hoje", openToday: "Aberto hoje", closedToday: "Fechado hoje", openingHoursWeek: "Horário da semana", wind: "Vento", closed: "Fechado", low: "Mín." },
  "cs-CZ": { onCall: "Služba", techNews: "Zprávy", nowPlaying: "Právě hraje", globalPulse: "Globální puls", localPulse: "Lokální puls", weatherToday: "Počasí dnes", weatherForecast: "Předpověď počasí", openingHoursToday: "Dnešní otevírací doba", openToday: "Dnes otevřeno", closedToday: "Dnes zavřeno", openingHoursWeek: "Otevírací doba tento týden", wind: "Vítr", closed: "Zavřeno", low: "Min." },
  "sk-SK": { onCall: "Služba", techNews: "Správy", nowPlaying: "Práve hrá", globalPulse: "Globálny pulz", localPulse: "Lokálny pulz", weatherToday: "Počasie dnes", weatherForecast: "Predpoveď počasia", openingHoursToday: "Dnešné otváracie hodiny", openToday: "Dnes otvorené", closedToday: "Dnes zatvorené", openingHoursWeek: "Otváracie hodiny tento týždeň", wind: "Vietor", closed: "Zatvorené", low: "Min." },
  "sl-SI": { onCall: "Dežurni", techNews: "Novice", nowPlaying: "Trenutno se predvaja", globalPulse: "Globalni utrip", localPulse: "Lokalni utrip", weatherToday: "Vreme danes", weatherForecast: "Vremenska napoved", openingHoursToday: "Današnji odpiralni čas", openToday: "Odprto danes", closedToday: "Zaprto danes", openingHoursWeek: "Odpiralni čas ta teden", wind: "Veter", closed: "Zaprto", low: "Najnižja" },
  "hr-HR": { onCall: "Dežurstvo", techNews: "Vijesti", nowPlaying: "Sada se reproducira", globalPulse: "Globalni puls", localPulse: "Lokalni puls", weatherToday: "Vrijeme danas", weatherForecast: "Vremenska prognoza", openingHoursToday: "Radno vrijeme danas", openToday: "Otvoreno danas", closedToday: "Zatvoreno danas", openingHoursWeek: "Radno vrijeme ovaj tjedan", wind: "Vjetar", closed: "Zatvoreno", low: "Najniža" },
  "hu-HU": { onCall: "Ügyelet", techNews: "Hírek", nowPlaying: "Most játszódik", globalPulse: "Globális pulzus", localPulse: "Helyi pulzus", weatherToday: "Mai időjárás", weatherForecast: "Időjárás-előrejelzés", openingHoursToday: "Mai nyitvatartás", openToday: "Ma nyitva", closedToday: "Ma zárva", openingHoursWeek: "Heti nyitvatartás", wind: "Szél", closed: "Zárva", low: "Min." },
  "et-EE": { onCall: "Valve", techNews: "Uudised", nowPlaying: "Hetkel mängib", globalPulse: "Globaalne pulss", localPulse: "Kohalik pulss", weatherToday: "Ilm täna", weatherForecast: "Ilmaprognoos", openingHoursToday: "Tänased lahtiolekuajad", openToday: "Täna avatud", closedToday: "Täna suletud", openingHoursWeek: "Selle nädala lahtiolekuajad", wind: "Tuul", closed: "Suletud", low: "Madal" },
  "lv-LV": { onCall: "Dežūra", techNews: "Ziņas", nowPlaying: "Pašlaik atskaņo", globalPulse: "Globālais pulss", localPulse: "Vietējais pulss", weatherToday: "Laikapstākļi šodien", weatherForecast: "Laika prognoze", openingHoursToday: "Darba laiks šodien", openToday: "Atvērts šodien", closedToday: "Slēgts šodien", openingHoursWeek: "Darba laiks šonedēļ", wind: "Vējš", closed: "Slēgts", low: "Min." },
  "lt-LT": { onCall: "Budintis", techNews: "Naujienos", nowPlaying: "Dabar rodoma", globalPulse: "Globalus pulsas", localPulse: "Vietinis pulsas", weatherToday: "Oras šiandien", weatherForecast: "Orų prognozė", openingHoursToday: "Darbo laikas šiandien", openToday: "Šiandien atidaryta", closedToday: "Šiandien uždaryta", openingHoursWeek: "Šios savaitės darbo laikas", wind: "Vėjas", closed: "Uždaryta", low: "Min." },
  "el-GR": { onCall: "Σε υπηρεσία", techNews: "Νέα", nowPlaying: "Παίζει τώρα", globalPulse: "Παγκόσμιος παλμός", localPulse: "Τοπικός παλμός", weatherToday: "Καιρός σήμερα", weatherForecast: "Πρόγνωση καιρού", openingHoursToday: "Ωράριο σήμερα", openToday: "Ανοιχτά σήμερα", closedToday: "Κλειστά σήμερα", openingHoursWeek: "Ωράριο εβδομάδας", wind: "Άνεμος", closed: "Κλειστά", low: "Χαμηλή" }
};

for (const [language, labels] of Object.entries(generatedLanguageLabels)) {
  defaultLabels[language] = {
    ...defaultLabels["en-US"],
    ...labels
  };
}

export const defaultI18nConfig = {
  labels: defaultLabels
};

export const defaultUserSettings = {
  language: "en-US",
  layout: {
    showClock: true,
    showTechNews: true,
    showStaff: true,
    showGlobalPulse: true,
    showLocalPulse: true,
    showNowPlaying: true,
    showLogo: true
  },
  slides: {
    enabled: true,
    durationSeconds: 10,
    slidesPerCycle: 1
  }
};

function isSupportedLanguage(code) {
  return supportedLanguages.some((language) => language.code === code);
}

export function normalizeLanguage(code) {
  return isSupportedLanguage(code) ? code : "en-US";
}

function mergeI18nConfig(userConfig = {}, userSettings = {}) {
  const userLabels = userConfig.labels || {};
  const labels = {};

  for (const language of supportedLanguages) {
    labels[language.code] = {
      ...defaultLabels["en-US"],
      ...(defaultLabels[language.code] || {}),
      ...(userLabels[language.code] || {})
    };
  }

  const language = normalizeLanguage(userSettings.language || userConfig.language);
  const locale = supportedLanguages.find((item) => item.code === language)?.locale || "en-US";

  return {
    language,
    locale,
    supportedLanguages,
    labels,
    layout: {
      ...defaultUserSettings.layout,
      ...(userSettings.layout || {})
    },
    slides: {
      ...defaultUserSettings.slides,
      ...(userSettings.slides || {})
    }
  };
}

async function loadUserSettings() {
  return readJsonFile(userSettingsFile, defaultUserSettings);
}

async function saveUserSettings(nextSettings = {}) {
  const currentSettings = await loadUserSettings();
  const language = normalizeLanguage(nextSettings.language || currentSettings.language);
  const settings = {
    ...defaultUserSettings,
    ...currentSettings,
    ...nextSettings,
    language,
    layout: {
      ...defaultUserSettings.layout,
      ...(currentSettings.layout || {}),
      ...(nextSettings.layout || {})
    }
  };
  await writeJsonFile(userSettingsFile, settings);
  return settings;
}

export async function loadI18nConfig() {
  const userConfig = await readJsonFile(i18nFile, {});
  const userSettings = await loadUserSettings();
  return mergeI18nConfig(userConfig, userSettings);
}

export async function saveI18nConfig(nextConfig = {}) {
  const userConfig = await readJsonFile(i18nFile, {});

  const userSettings = nextConfig.language || nextConfig.layout || nextConfig.slides
    ? await saveUserSettings({
        language: nextConfig.language,
        layout: nextConfig.layout,
        slides: nextConfig.slides
      })
    : await loadUserSettings();

  const shouldSaveLabels = Object.hasOwn(nextConfig, "labels");

  const merged = mergeI18nConfig(
    {
      ...userConfig,
      labels: shouldSaveLabels ? nextConfig.labels : userConfig.labels
    },
    userSettings
  );

  if (shouldSaveLabels) {
    await writeJsonFile(i18nFile, {
      labels: merged.labels
    });
  }

  return merged;
}

export function createTranslator(i18nConfig) {
  const language = normalizeLanguage(i18nConfig?.language);
  const labels = i18nConfig?.labels || defaultLabels;

  return function t(key) {
    return labels[language]?.[key] || labels["en-US"]?.[key] || key;
  };
}

export function getLocale(i18nConfig) {
  const language = normalizeLanguage(i18nConfig?.language);
  return supportedLanguages.find((item) => item.code === language)?.locale || "en-US";
}