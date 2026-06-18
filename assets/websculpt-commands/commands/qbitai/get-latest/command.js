export default async (page, params) => {
  const limit = parseInt(params.limit, 10) || 20;
  const includeFeatured = params.includeFeatured === "true";

  // Human-like warm-up: small random mouse move and a short pause
  await page.mouse.move(
    80 + Math.floor(Math.random() * 240),
    120 + Math.floor(Math.random() * 180)
  );
  await page.waitForTimeout(200 + Math.floor(Math.random() * 400));

  await page.goto("https://www.qbitai.com/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".text_box", { timeout: 15000 });

  // Light human-like behavior before extraction
  await page.mouse.move(
    100 + Math.floor(Math.random() * 200),
    200 + Math.floor(Math.random() * 200)
  );
  await page.waitForTimeout(300 + Math.floor(Math.random() * 500));

  // Smooth scroll to mimic natural reading
  await page.evaluate(() => {
    window.scrollBy({ top: 150 + Math.floor(Math.random() * 250), behavior: "smooth" });
  });
  await page.waitForTimeout(400 + Math.floor(Math.random() * 600));

  const result = await page.evaluate((opts) => {
    const { limit, includeFeatured } = opts;
    const boxes = document.querySelectorAll(".text_box");
    if (!boxes || boxes.length === 0) {
      const err = new Error("[DRIFT_DETECTED] Expected result selector was not found");
      err.code = "DRIFT_DETECTED";
      throw err;
    }

    const articles = Array.from(boxes).map((box, i) => {
      const titleA = box.querySelector("h4 a");
      const ps = box.querySelectorAll("p");
      const summary = Array.from(ps)
        .map((p) => p.innerText.trim())
        .filter((t) => t)[0] || "";
      const authorA = box.querySelector(".info .author a");
      const timeEl = box.querySelector(".info .time");
      const tagEls = box.querySelectorAll(".info .tags_s a");

      return {
        rank: i + 1,
        title: titleA ? titleA.innerText.trim() : "",
        url: titleA ? titleA.href : "",
        summary: summary.slice(0, 200),
        author: authorA ? authorA.innerText.trim() : "",
        authorUrl: authorA ? authorA.href : "",
        time: timeEl ? timeEl.innerText.trim() : "",
        tags: Array.from(tagEls).map((a) => ({
          name: a.innerText.trim(),
          url: a.href,
        })),
      };
    }).filter((x) => x.title);

    const output = {
      articles: articles.slice(0, limit),
    };

    if (includeFeatured) {
      const slides = document.querySelectorAll(".swiper-slide");
      const seen = new Set();
      const featured = [];
      slides.forEach((slide) => {
        const a = slide.querySelector("a");
        const img = slide.querySelector("img");
        if (!a || !img) return;
        const title = a.getAttribute("title") || a.innerText.trim();
        const href = a.href;
        if (!title || !href || seen.has(href)) return;
        seen.add(href);
        featured.push({
          rank: featured.length + 1,
          title: title.slice(0, 200),
          url: href,
          coverImage: img.src,
        });
      });
      output.featured = featured;
    }

    return output;
  }, { limit, includeFeatured });

  if (!result.articles || result.articles.length === 0) {
    const err = new Error("[EMPTY_RESULT] No articles found on the page");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Final random wait (0-3s) before returning
  await page.waitForTimeout(Math.floor(Math.random() * 3000));

  return result;
};
