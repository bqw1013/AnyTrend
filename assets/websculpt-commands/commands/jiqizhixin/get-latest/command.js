// jiqizhixin/get-latest — Fetch the latest AI articles from Jiqizhixin (机器之心).
//
// Naming note: the command is called get-latest rather than get-hot because
// Jiqizhixin has no traditional "hot" ranking. The article-library API accepts
// sort values such as hot/popular, but the backend always returns the same
// reverse-chronological list. The homepage therefore presents "latest as hottest".
// This command provides a stable source of the newest Chinese AI articles.

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanize(page) {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth || 1280,
    height: window.innerHeight || 720,
  }));

  const x = randomBetween(20, Math.max(21, viewport.width - 20));
  const y = randomBetween(20, Math.max(21, viewport.height - 20));
  await page.mouse.move(x, y);
  await page.waitForTimeout(randomBetween(100, 500));

  // Small smooth scroll to mimic a user scanning the page.
  const scrollDistance = randomBetween(80, 300);
  const steps = randomBetween(2, 5);
  await page.evaluate(
    ({ distance, steps }) => {
      return new Promise((resolve) => {
        let current = 0;
        const step = distance / steps;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          current += 1;
          if (current >= steps) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    },
    { distance: scrollDistance, steps }
  );
  await page.waitForTimeout(randomBetween(200, 600));
}

export default async function (page, params) {
  const BASE_URL = "https://www.jiqizhixin.com";
  const API_PATH = "/api/article_library/articles.json";

  // --- Navigate to homepage to establish session and extract CSRF token ---
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  // Light human-like behavior before issuing the API call.
  await humanize(page);

  const csrfToken = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute("content");
    // Fallback: try the XSRF-TOKEN cookie.
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });

  if (!csrfToken) {
    const err = new Error("[CSRF_MISSING] Could not extract CSRF token from homepage");
    err.code = "CSRF_MISSING";
    throw err;
  }

  // --- Build request ---
  // Manifest already declares defaults; params values are always strings.
  const limit = parseInt(params.limit, 10);
  if (Number.isNaN(limit) || limit < 1 || limit > 20) {
    const err = new Error("[INVALID_PARAM] limit must be an integer between 1 and 20");
    err.code = "INVALID_PARAM";
    throw err;
  }

  // Execute the API call inside the browser so session cookies are reused.
  // Note: the API accepts a "page" query parameter but currently ignores it
  // and always returns the first page. Pagination is therefore not exposed.
  const data = await page.evaluate(
    async ({ baseUrl, apiPath, csrfToken }) => {
      const url = new URL(apiPath, baseUrl);
      url.searchParams.set("sort", "time");
      url.searchParams.set("page", "1");
      url.searchParams.set("per", "20");

      const resp = await fetch(url.toString(), {
        headers: {
          accept: "application/json",
          "x-csrf-token": csrfToken,
          "x-requested-with": "XMLHttpRequest",
          referer: `${baseUrl}/`,
        },
      });

      if (!resp.ok) {
        throw new Error(`API returned status ${resp.status}`);
      }
      return resp.json();
    },
    { baseUrl: BASE_URL, apiPath: API_PATH, csrfToken }
  );

  if (!data.success) {
    const err = new Error("[API_ERROR] Article API returned success=false");
    err.code = "API_ERROR";
    throw err;
  }

  if (!data.articles || data.articles.length === 0) {
    const err = new Error("[EMPTY_RESULT] No articles found");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // The API ignores the "per" parameter and always returns ~20 items;
  // enforce the caller's limit via client-side truncation.
  const articles = data.articles.slice(0, limit);

  // Light final pause before returning, consistent with casual browsing.
  await page.waitForTimeout(randomBetween(0, 3000));

  return {
    totalCount: data.totalCount,
    hasNextPage: data.hasNextPage,
    publishedArticlesCount: data.publishedArticlesCount,
    elapsedDays: data.elapsedDays,
    limit,
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      coverImageUrl: a.coverImageUrl,
      category: a.category,
      slug: a.slug,
      tagList: a.tagList,
      author: a.author,
      publishedAt: a.publishedAt,
      content: a.content,
      source: a.source,
    })),
    tags: data.tags,
  };
}
