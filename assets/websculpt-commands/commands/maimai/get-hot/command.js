function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomSleep(maxMs) {
  return sleep(Math.floor(Math.random() * maxMs));
}

async function moderateMouseMove(page) {
  const x = 200 + Math.random() * 600;
  const y = 150 + Math.random() * 400;
  await page.mouse.move(x, y);
}

export default async (page, params) => {
  const query = params.query ? String(params.query).trim() : "";

  const limitRaw = parseInt(params.limit, 10);
  const offsetRaw = parseInt(params.offset, 10);

  if (query) {
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    await page.goto("https://maimai.cn/community/hot-rank", { waitUntil: "domcontentloaded" });
    await randomSleep(1000);
    await moderateMouseMove(page);
    await randomSleep(500);
    await moderateMouseMove(page);

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/webs/platform/login")) {
      const err = new Error("[AUTH_REQUIRED] Please log in to maimai.cn in your browser first.");
      err.code = "AUTH_REQUIRED";
      throw err;
    }

    const encodedQuery = encodeURIComponent(query);
    const apiUrl = `https://maimai.cn/search/feeds?query=${encodedQuery}&limit=${limit}&offset=${offset}&highlight=true&sortby=heat&jsononly=1`;

    const result = await page.evaluate(async (url) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }, apiUrl);

    if (!result || result.result !== "ok") {
      const err = new Error(`[API_ERROR] ${result?.error || "search API failed"}`);
      err.code = "API_ERROR";
      throw err;
    }

    const feeds = result.data?.feeds || [];
    const items = feeds.map((item) => {
      const feed = item.feed || {};
      const contact = item.contact || {};
      const text = feed.text || "";
      const summary = feed.summary || "";
      const display = summary || text;
      return {
        fid: item.fid || feed.id || "",
        title: display.split("\n")[0].substring(0, 200),
        summary,
        text,
        author: contact.name || "",
        author_title: contact.line1 || "",
        avatar: contact.avatar || "",
        company: contact.company || "",
        position: contact.position || "",
        published_at: feed.crtime || "",
        likes: Number(feed.likes) || 0,
        shares: Number(feed.spreads) || 0,
        comments: Number(feed.total_cnt) || 0,
        url: `https://maimai.cn/web/feed_detail?fid=${item.fid || feed.id || ""}`
      };
    });

    await randomSleep(3000);

    return { mode: "search", query, limit, offset, count: items.length, items };
  }

  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 15) : 15;

  await page.goto("https://maimai.cn/community/hot-rank", { waitUntil: "domcontentloaded" });
  await randomSleep(1000);
  await moderateMouseMove(page);
  await randomSleep(500);
  await moderateMouseMove(page);

  const currentUrl = page.url();
  if (currentUrl.includes("/login") || currentUrl.includes("/webs/platform/login")) {
    const err = new Error("[AUTH_REQUIRED] Please log in to maimai.cn in your browser first.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  const selector = "main ul > li";
  await page.waitForSelector(selector, { timeout: 15000 });

  const items = await page.$$eval(selector, (els, max) => {
    return els.slice(0, max).map((el) => {
      const btn = el.querySelector("button");
      const text = btn ? btn.innerText.trim() : el.innerText.trim();
      const lines = text.split("\n").filter((l) => l.trim());
      return {
        rank: lines[0] ? parseInt(lines[0], 10) : null,
        title: lines[1] || "",
        tag: lines[2] || "",
        url: "https://maimai.cn/community/hot-rank"
      };
    });
  }, limit);

  if (!items.length) {
    const err = new Error("[DRIFT_DETECTED] Hot rank list not found; page structure may have changed.");
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  await randomSleep(3000);

  return { mode: "hot-rank", count: items.length, items };
};
