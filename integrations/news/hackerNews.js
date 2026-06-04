const HN_BASE_URL = "https://hacker-news.firebaseio.com/v0";

export async function getHackerNewsStories(options = {}) {
  const {
    maxItems = 8,
    minScore = 20,
    scanLimit = 40
  } = options;

  try {
    const idsResponse = await fetch(`${HN_BASE_URL}/topstories.json`);

    if (!idsResponse.ok) {
      throw new Error(`HN topstories failed: ${idsResponse.status}`);
    }

    const storyIds = await idsResponse.json();
    const stories = [];

    for (const id of storyIds.slice(0, scanLimit)) {
      const itemResponse = await fetch(`${HN_BASE_URL}/item/${id}.json`);

      if (!itemResponse.ok) continue;

      const item = await itemResponse.json();

      if (!item) continue;
      if (item.type !== "story") continue;
      if ((item.score || 0) < minScore) continue;

      stories.push({
        id: item.id,
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: "Hacker News",
        score: item.score || 0,
        comments: item.descendants || 0,
        author: item.by || null,
        publishedAt: item.time ? new Date(item.time * 1000).toISOString() : null
      });

      if (stories.length >= maxItems) break;
    }

    return stories;
  } catch (error) {
    console.error("[HackerNews]", error.message);
    return [];
  }
}