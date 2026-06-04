import { getHackerNewsStories } from "../../integrations/news/hackerNews.js";

let cache = {
  updatedAt: 0,
  items: []
};

export async function getNewsItems(appConfig = {}) {
  if (appConfig.enableNews === false) return [];

  const newsConfig = appConfig.news || {};
  const refreshMinutes = newsConfig.refreshMinutes || 20;
  const refreshMs = refreshMinutes * 60 * 1000;
  const maxHistoryItems = newsConfig.maxHistoryItems || 20;

  const cacheIsFresh =
    cache.items.length > 0 &&
    Date.now() - cache.updatedAt < refreshMs;

  if (cacheIsFresh) {
    return cache.items.slice(0, maxHistoryItems);
  }

  const items = await getHackerNewsStories({
    maxItems: newsConfig.maxItems || maxHistoryItems,
    minScore: newsConfig.minScore || 20,
    scanLimit: newsConfig.scanLimit || 40
  });

  if (items.length > 0) {
    cache = {
      updatedAt: Date.now(),
      items: items.slice(0, maxHistoryItems)
    };

    return cache.items;
  }

  const fallbackItems = (
    newsConfig.fallbackHeadlines ||
    appConfig.newsHeadlines ||
    []
  ).map((title, index) => ({
    id: `fallback-${index}`,
    title,
    source: "FabLabTV",
    url: null,
    score: null,
    comments: null
  }));

  return fallbackItems.slice(0, maxHistoryItems);
}