// toutiao/get-hot — Fetch trending content from a Toutiao channel.
//
// Two data sources:
//   热点 channel → hot-board API (ranked hot list with hot values)
//   Other channels → feed API (article feed, supports cursor pagination)

const CHANNEL_MAP = {
  "推荐": { type: "feed", channelId: 0, category: "pc_profile_recommend" },
  "北京": { type: "feed", channelId: 3202164529, category: "pc_profile_channel" },
  "视频": { type: "feed", channelId: 3431225546, category: "pc_profile_channel" },
  "财经": { type: "feed", channelId: 3189399007, category: "pc_profile_channel" },
  "科技": { type: "feed", channelId: 3189398999, category: "pc_profile_channel" },
  "热点": { type: "hotboard" },
  "军事": { type: "feed", channelId: 3189398996, category: "pc_profile_channel" },
  "国际": { type: "feed", channelId: 3189398960, category: "pc_profile_channel" },
  "体育": { type: "feed", channelId: 3189398968, category: "pc_profile_channel" },
  "娱乐": { type: "feed", channelId: 3189398957, category: "pc_profile_channel" },
  "历史": { type: "feed", channelId: 3189398972, category: "pc_profile_channel" },
  "美食": { type: "feed", channelId: 3189398965, category: "pc_profile_channel" },
  "直播": { type: "feed", channelId: 3189399002, category: "pc_profile_channel" },
  "旅游": { type: "feed", channelId: 3189398983, category: "pc_profile_channel" },
};

const VALID_CHANNELS = Object.keys(CHANNEL_MAP);
const TOUTIAO_BASE = "https://www.toutiao.com";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function shortPause() {
  await new Promise((r) => setTimeout(r, randomInt(200, 700)));
}

async function smallMouseMove(page) {
  try {
    const viewport = await page.viewportSize();
    if (!viewport) return;
    const x = randomInt(10, Math.max(11, Math.floor(viewport.width * 0.8)));
    const y = randomInt(10, Math.max(11, Math.floor(viewport.height * 0.8)));
    await page.mouse.move(x, y, { steps: randomInt(3, 8) });
  } catch (_) {
    // Ignore non-critical mouse move failures.
  }
}

async function smoothScroll(page) {
  try {
    const distance = randomInt(80, 320);
    await page.evaluate(async (d) => {
      window.scrollBy({ top: d, behavior: "smooth" });
      await new Promise((res) => setTimeout(res, 300));
    }, distance);
  } catch (_) {
    // Ignore non-critical scroll failures.
  }
}

export default async function (page, params) {
  // ===== 1. Parameter parsing =====
  const channel = params.channel;
  const limit = parseInt(params.limit, 10);
  const cursor = params.cursor ? parseInt(params.cursor, 10) : 0;

  if (!channel || !VALID_CHANNELS.includes(channel)) {
    const err = new Error(
      `[INVALID_PARAM] channel must be one of ${VALID_CHANNELS.join(", ")}, got "${channel}"`
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  const channelConfig = CHANNEL_MAP[channel];

  // ===== 2. Navigate to establish session cookies =====
  await page.goto(TOUTIAO_BASE, { waitUntil: "domcontentloaded" });

  // Moderate humanization to reduce bot-detection risk.
  await shortPause();
  await smallMouseMove(page);
  await smoothScroll(page);
  await shortPause();

  // ===== 3. Fetch data via page.evaluate =====
  const result = await page.evaluate(
    async ({ baseUrl, channelConfig, limit, cursor }) => {
      // --- Hot-board API (热点 channel) ---
      if (channelConfig.type === "hotboard") {
        const url = `${baseUrl}/hot-event/hot-board/?origin=toutiao_pc`;
        const resp = await fetch(url, { credentials: "include" });

        if (!resp.ok) {
          return {
            error: `[API_ERROR] Hot-board API returned status ${resp.status}`,
          };
        }

        const data = await resp.json();
        if (!data || !Array.isArray(data.data)) {
          return {
            error:
              "[DRIFT_DETECTED] Hot-board API response missing data array; structure may have changed",
          };
        }

        const items = data.data.slice(0, limit).map((item, idx) => ({
          rank: idx + 1,
          title: item.Title || "",
          hotValue: item.HotValue || "",
          label: (item.Label || "").toLowerCase(),
          url: item.Url || "",
          clusterId: String(item.ClusterId || ""),
        }));

        return { items, count: items.length };
      }

      // --- Feed API (all other channels) ---
      const queryParams = new URLSearchParams();
      queryParams.set("channel_id", String(channelConfig.channelId));
      queryParams.set("min_behot_time", String(cursor));
      queryParams.set("offset", "0");
      queryParams.set("refresh_count", "1");
      queryParams.set("category", channelConfig.category);
      queryParams.set("aid", "24");
      queryParams.set("app_name", "toutiao_web");

      if (channelConfig.category !== "pc_profile_recommend") {
        queryParams.set(
          "client_extra_params",
          JSON.stringify({ short_video_item: "filter" })
        );
      }

      const url = `${baseUrl}/api/pc/list/feed?${queryParams.toString()}`;
      const resp = await fetch(url, { credentials: "include" });

      if (!resp.ok) {
        return {
          error: `[API_ERROR] Feed API returned status ${resp.status}`,
        };
      }

      const data = await resp.json();

      if (!data || !Array.isArray(data.data)) {
        return {
          error:
            "[DRIFT_DETECTED] Feed API response missing data array; structure may have changed",
        };
      }

      const items = data.data.slice(0, limit).map((article) => ({
        title: article.title || "",
        abstract: article.Abstract || "",
        url:
          article.article_url ||
          article.display_url ||
          (article.group_id ? `https://toutiao.com/group/${article.group_id}/` : "") ||
          "",
        source: article.source || article.media_name || "",
        mediaName: article.media_name || "",
        behotTime: article.behot_time || 0,
        publishTime: article.publish_time || 0,
        commentCount: article.comment_count || 0,
        diggCount: article.digg_count || 0,
        readCount: article.read_count || 0,
        shareCount: article.share_count || 0,
        hasVideo: !!article.has_video,
        videoDuration: article.video_duration || 0,
        keywords: article.keywords || "",
        tag: article.tag || "",
        label: article.label || "",
        groupId: String(article.group_id || ""),
        itemId: String(article.item_id || ""),
        imageUrl: (article.middle_image && article.middle_image.url) || "",
        imageCount: (article.image_list && article.image_list.length) || 0,
      }));

      // Extract next cursor from last item
      let nextCursor = 0;
      if (items.length > 0) {
        const lastRaw = data.data[Math.min(items.length - 1, data.data.length - 1)];
        if (lastRaw && lastRaw.cursor) {
          nextCursor = lastRaw.cursor;
        } else if (lastRaw && lastRaw.behot_time) {
          nextCursor = lastRaw.behot_time;
        }
      }

      return {
        items,
        count: items.length,
        hasMore: !!data.has_more,
        nextCursor,
      };
    },
    { baseUrl: TOUTIAO_BASE, channelConfig, limit, cursor }
  );

  // Handle errors returned from page.evaluate
  if (result.error) {
    const errMsg = result.error;
    let code = "API_ERROR";
    if (errMsg.startsWith("[DRIFT_DETECTED]")) code = "DRIFT_DETECTED";
    else if (errMsg.startsWith("[API_ERROR]")) code = "API_ERROR";

    const err = new Error(errMsg);
    err.code = code;
    throw err;
  }

  if (!result.items || result.items.length === 0) {
    const err = new Error(
      `[EMPTY_RESULT] No content found for channel "${channel}"`
    );
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Final human-like wait before returning data.
  await new Promise((r) => setTimeout(r, randomInt(0, 3000)));

  return {
    channel,
    items: result.items,
    count: result.count,
    hasMore: result.hasMore || false,
    nextCursor: result.nextCursor || 0,
  };
}
