export default async (page, params) => {
  // --- Resolve parameters ---
  const sort = params.sort || "hot";
  const parsedLimit = parseInt(params.limit);
  const limit = isNaN(parsedLimit) ? 25 : parsedLimit;
  const parsedPage = parseInt(params.page);
  const pageNum = isNaN(parsedPage) ? 1 : parsedPage;
  const topPeriod = params.top_period || "1w";

  // --- Validate parameters ---
  const VALID_SORTS = ["hot", "new", "active", "top"];
  if (!VALID_SORTS.includes(sort)) {
    const err = new Error(`[INVALID_SORT] Unknown sort value "${sort}". Valid: ${VALID_SORTS.join(", ")}`);
    err.code = "INVALID_SORT";
    throw err;
  }

  const VALID_PERIODS = ["1w", "1m", "1y"];
  if (sort === "top" && !VALID_PERIODS.includes(topPeriod)) {
    const err = new Error(`[INVALID_PERIOD] Unknown top_period "${topPeriod}". Valid: ${VALID_PERIODS.join(", ")}`);
    err.code = "INVALID_PERIOD";
    throw err;
  }

  // --- Build URL ---
  let path;
  if (sort === "hot") path = "";
  else if (sort === "new") path = "/newest";
  else if (sort === "active") path = "/active";
  else if (sort === "top") path = `/top/${topPeriod}`;

  let url = `https://lobste.rs${path}`;
  if (pageNum > 1) {
    url += `/page/${pageNum}`;
  }

  // --- Navigate ---
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (e) {
    const err = new Error(`[NAVIGATION_FAILED] Failed to load ${url}: ${e.message}`);
    err.code = "NAVIGATION_FAILED";
    throw err;
  }

  // --- Light human-like behavior ---
  const randomDelay = (min, max) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
  await randomDelay(200, 800);
  await page.mouse.move(
    80 + Math.floor(Math.random() * 400),
    120 + Math.floor(Math.random() * 300)
  );
  await randomDelay(300, 700);
  await page.evaluate(() => {
    window.scrollBy({ top: 120 + Math.floor(Math.random() * 240), behavior: "smooth" });
  });
  await randomDelay(400, 900);

  // --- Extract stories ---
  const stories = await page.evaluate(() => {
    const items = document.querySelectorAll("li.story");
    return Array.from(items).map((s) => {
      const titleEl = s.querySelector(".link a.u-url");
      const voteEl = s.querySelector(".voters a.upvoter");
      const domainEl = s.querySelector(".domain");
      const tagEls = s.querySelectorAll(".tags a");
      const authorEl = s.querySelector(".byline a.user_is_author");
      const commentEl = s.querySelector(".comments_label a");
      const timeEl = s.querySelector(".byline time");

      const commentText = commentEl ? commentEl.textContent : "";

      return {
        id: s.getAttribute("data-shortid") || "",
        title: titleEl ? titleEl.textContent.trim() : "",
        url: titleEl ? titleEl.href : "",
        votes: voteEl ? parseInt(voteEl.textContent) || 0 : 0,
        domain: domainEl ? domainEl.textContent.trim() : "",
        tags: Array.from(tagEls).map((a) => a.textContent.trim()),
        author: authorEl ? authorEl.textContent.trim() : "",
        commentCount: parseInt(commentText) || 0,
        time: timeEl ? timeEl.getAttribute("title") || "" : "",
        timeAgo: timeEl ? timeEl.textContent.trim() : ""
      };
    });
  });

  // --- Detect structural drift ---
  if (stories.length === 0) {
    const err = new Error(`[DRIFT_DETECTED] No story elements found on ${url}. The page structure may have changed.`);
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  // --- Final human-like wait ---
  await randomDelay(0, 3000);

  // --- Apply limit and return ---
  const items = stories.slice(0, Math.min(limit, 25));
  return { items, count: items.length, page: pageNum, sort };
};
