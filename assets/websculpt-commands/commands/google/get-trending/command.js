// google/get-trending — Fetch Google Trends daily trending searches
export default async (page, params) => {
  const geo = params.geo || "US";

  // Google Trends does not serve data for some regions. Reject unsupported
  // codes early to avoid a misleading page-load timeout.
  if (geo.toUpperCase() === "CN") {
    const err = new Error(
      "[INVALID_PARAM] Geo code 'CN' is not supported. Use a supported region such as US, JP, HK, or GB."
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  const limit = params.limit ? parseInt(params.limit, 10) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
    const err = new Error("[INVALID_PARAM] --limit must be a positive integer");
    err.code = "INVALID_PARAM";
    throw err;
  }

  const url = `https://trends.google.com/trending?geo=${encodeURIComponent(geo)}`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Light humanization: pause briefly after the initial page frame is ready.
  await page.waitForTimeout(300 + Math.floor(Math.random() * 400));

  // Small random mouse movement to mimic a real visitor.
  try {
    const viewport = await page.viewportSize();
    if (viewport) {
      const x = Math.floor(Math.random() * viewport.width * 0.6) + 20;
      const y = Math.floor(Math.random() * viewport.height * 0.6) + 20;
      await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 5) });
    }
  } catch {
    // Mouse movement is non-essential; continue on failure.
  }

  await page.waitForSelector("table", { timeout: 15000 });

  // Wait for data rows to be populated (Google loads data asynchronously).
  try {
    await page.waitForFunction(
      () => document.querySelectorAll("table tr").length > 2,
      { timeout: 15000 }
    );
  } catch {
    const err = new Error("[DRIFT_DETECTED] Table found but data rows never loaded");
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  // Smooth scrolling to mimic reading behavior and help lazy-loaded content settle.
  try {
    await page.evaluate(async () => {
      const step = 120 + Math.floor(Math.random() * 80);
      const delay = 60 + Math.floor(Math.random() * 60);
      const scrollTo = async (target) => {
        const start = window.scrollY;
        const distance = target - start;
        const steps = Math.max(1, Math.floor(Math.abs(distance) / step));
        for (let i = 1; i <= steps; i++) {
          window.scrollTo(0, start + (distance * i) / steps);
          await new Promise((r) => setTimeout(r, delay));
        }
      };
      await scrollTo(document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 300)));
      await scrollTo(0);
    });
    await page.waitForTimeout(200 + Math.floor(Math.random() * 300));
  } catch {
    // Scrolling is non-essential; continue on failure.
  }

  // Extract data from the rendered table rows.
  const results = await page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return { error: "DRIFT_DETECTED", detail: "No table element found" };

    const rows = table.querySelectorAll("tr");
    if (rows.length < 3) return { error: "DRIFT_DETECTED", detail: "Too few rows in table" };

    const items = [];
    for (let i = 2; i < rows.length; i++) {
      const tds = rows[i].querySelectorAll("td");
      if (tds.length < 5) continue;

      const titleEl = tds[1].firstElementChild;
      const title = titleEl ? titleEl.textContent.trim() : tds[1].textContent.trim();
      if (!title || title.length === 0) continue;

      const volText = tds[2].textContent.trim().replace(/\s+/g, " ");
      const volMatch = volText.match(/^([\d,]+[万+]?)/);
      const searchVolume = volMatch ? volMatch[1] : "";
      const changeMatch = volText.match(/([\d,]+%)/);
      const changePct = changeMatch ? changeMatch[1] : "";

      const timeText = tds[3].textContent.trim().replace(/\s+/g, " ");
      const timeMatch = timeText.match(
        /(\d+小时前|\d+天前|\d+分钟前|\d+h\s*ago|\d+d\s*ago|\d+m\s*ago|\d+hours?\s*ago|\d+days?\s*ago|\d+minutes?\s*ago)/i
      );
      const timeAgo = timeMatch ? timeMatch[1] : "";
      const isActive =
        timeText.includes("活跃") ||
        timeText.includes("Active") ||
        timeText.includes("trending_up");

      const btns = tds[4].querySelectorAll("button");
      const relatedTopics = [];
      btns.forEach((b) => {
        const t = b.textContent.trim();
        if (
          t &&
          !t.includes("查看另外") &&
          !t.includes("more") &&
          !t.includes("还有另外") &&
          t.length > 1
        ) {
          relatedTopics.push(t);
        }
      });

      items.push({ title, searchVolume, changePct, timeAgo, isActive, relatedTopics });
    }

    return { items, count: items.length };
  });

  if (results.error) {
    const err = new Error(`[${results.error}] ${results.detail}`);
    err.code = results.error;
    throw err;
  }

  if (results.count === 0) {
    const err = new Error("[EMPTY_RESULT] No trending items found on page");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  if (limit !== null && limit < results.items.length) {
    results.items = results.items.slice(0, limit);
    results.count = results.items.length;
  }

  // Final humanization: random short pause before returning the result.
  await page.waitForTimeout(Math.floor(Math.random() * 3000));

  return results;
};
