export default async (page, params) => {
  const topicId = params.topic_id || null;
  const limit = parseInt(params.limit, 10);
  const API_BASE = "https://api.ruguoapp.com/1.0";

  // Human-like helpers to reduce bot signals
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const humanPause = (min = 400, max = 1200) => page.waitForTimeout(randomInt(min, max));
  const humanMove = async () => {
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    const x = randomInt(Math.floor(viewport.width * 0.15), Math.floor(viewport.width * 0.85));
    const y = randomInt(Math.floor(viewport.height * 0.15), Math.floor(viewport.height * 0.85));
    await page.mouse.move(x, y, { steps: randomInt(4, 8) });
  };

  let targetTopicId = topicId;
  let topicInfo = null;

  if (!targetTopicId) {
    // Navigate to search page, let SPA render results
    const keyword = params.keyword;
    await page.goto(`https://web.okjike.com/search?q=${encodeURIComponent(keyword)}`, {
      waitUntil: "domcontentloaded"
    });

    await humanMove();
    await humanPause(600, 1400);

    // Wait for topic links to appear
    try {
      await page.waitForSelector("a[href^='/topic/']", { timeout: 15000 });
    } catch {
      const err = new Error(`[NOT_FOUND] No topics found for keyword: ${keyword}`);
      err.code = "NOT_FOUND";
      throw err;
    }

    // Extract topic IDs from DOM
    const searchTopics = await page.evaluate(() => {
      const links = document.querySelectorAll("a[href^='/topic/']");
      const topics = [];
      const seen = new Set();
      for (const link of links) {
        const href = link.getAttribute("href");
        const match = href.match(/^\/topic\/([a-zA-Z0-9]+)/);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
          const nameText = link.textContent.trim();
          const subMatch = nameText.match(/([\d.]+万?)名?/);
          topics.push({
            id: match[1],
            name: nameText.replace(/([\d.]+万?)名?.*$/, "").trim(),
            subscriber_text: subMatch ? subMatch[1] : ""
          });
        }
      }
      return topics;
    });

    if (searchTopics.length === 0) {
      const err = new Error(`[NOT_FOUND] No topics found for keyword: ${keyword}`);
      err.code = "NOT_FOUND";
      throw err;
    }

    targetTopicId = searchTopics[0].id;
    topicInfo = {
      id: searchTopics[0].id,
      name: searchTopics[0].name,
      subscribers_count: 0,
      pic_url: ""
    };
  }

  // Navigate to topic page to warm up SPA and get token
  await page.goto(`https://web.okjike.com/topic/${targetTopicId}/selected`, {
    waitUntil: "domcontentloaded"
  });

  await humanMove();
  await humanPause(800, 1600);

  // Extract token and fetch data via API
  await humanMove();
  await humanPause(500, 1000);
  const result = await page.evaluate(async ({ apiBase, tid, lim, hasTopicInfo, tInfo }) => {
    const token = localStorage.getItem("JK_ACCESS_TOKEN");
    if (!token) {
      return { error: "AUTH_REQUIRED", message: "No access token found" };
    }

    const headers = {
      "Content-Type": "application/json",
      "x-jike-access-token": token
    };

    // Fetch topic detail if needed
    let topic = tInfo;
    if (!hasTopicInfo) {
      const detailRes = await fetch(`${apiBase}/topics/getDetail?id=${encodeURIComponent(tid)}`, { headers });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        if (detailData.success && detailData.data) {
          const d = detailData.data;
          topic = {
            id: d.id || tid,
            name: d.content || "",
            subscribers_count: d.subscribersCount || 0,
            pic_url: (d.squarePicture && d.squarePicture.picUrl) || ""
          };
        }
      }
    }

    // Fetch hot posts
    const feedRes = await fetch(`${apiBase}/topics/tabs/selected/feed`, {
      method: "POST",
      headers,
      body: JSON.stringify({ topicId: tid, limit: lim })
    });

    if (!feedRes.ok) {
      return { error: "NETWORK_ERROR", message: `HTTP ${feedRes.status}` };
    }

    const feedData = await feedRes.json();
    const posts = (feedData.data || []).filter(item => item.type === "ORIGINAL_POST");

    return {
      topic,
      posts: posts.map((post, index) => ({
        rank: index + 1,
        id: post.id || "",
        content: post.content || "",
        like_count: post.likeCount || 0,
        comment_count: post.commentCount || 0,
        repost_count: post.repostCount || 0,
        share_count: post.shareCount || 0,
        created_at: post.createdAt || "",
        user: {
          screen_name: (post.user && post.user.screenName) || "",
          username: (post.user && post.user.username) || "",
          brief_intro: (post.user && post.user.briefIntro) || "",
          avatar_url: (post.user && post.user.avatarImage && post.user.avatarImage.thumbnailUrl) || ""
        },
        topic: {
          id: (post.topic && post.topic.id) || (topic && topic.id) || tid,
          name: (post.topic && post.topic.content) || (topic && topic.name) || "",
          subscribers_count: (post.topic && post.topic.subscribersCount) || (topic && topic.subscribers_count) || 0,
          pic_url: (post.topic && post.topic.squarePicture && post.topic.squarePicture.picUrl) || (topic && topic.pic_url) || ""
        },
        pictures: (post.pictures || []).map(p => p.picUrl || "").filter(Boolean),
        url: `https://web.okjike.com/original-post/${post.id}`
      }))
    };
  }, {
    apiBase: API_BASE,
    tid: targetTopicId,
    lim: limit,
    hasTopicInfo: !!topicInfo,
    tInfo: topicInfo
  });

  if (result.error) {
    const err = new Error(`[${result.error}] ${result.message}`);
    err.code = result.error;
    throw err;
  }

  if (!result.posts || result.posts.length === 0) {
    const err = new Error("[EMPTY_RESULT] No hot posts found");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  await page.waitForTimeout(Math.random() * 3000);

  return {
    topic: result.topic,
    items: result.posts,
    count: result.posts.length
  };
};
