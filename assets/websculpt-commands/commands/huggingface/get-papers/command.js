const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const humanPause = async (page, min = 300, max = 700) => {
  await page.waitForTimeout(randomInt(min, max));
};

const humanMove = async (page) => {
  const size = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const x = Math.max(0, Math.min(size.w, Math.floor(size.w / 2 + (Math.random() - 0.5) * 160)));
  const y = Math.max(0, Math.min(size.h, Math.floor(size.h / 2 + (Math.random() - 0.5) * 160)));
  await page.mouse.move(x, y);
};

const humanScroll = async (page) => {
  const distance = 80 + Math.floor(Math.random() * 120);
  await page.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), distance);
};

export default async (page, params) => {
  const period = params.period;
  const limit = parseInt(params.limit);

  if (!["daily", "weekly", "monthly"].includes(period)) {
    const err = new Error("[INVALID_PARAM] period must be daily, weekly, or monthly");
    err.code = "INVALID_PARAM";
    throw err;
  }

  // Navigate to the public papers page and switch the period via the UI tabs.
  // URL query parameters do not trigger tab changes, so the target tab is clicked explicitly.
  await page.goto("https://huggingface.co/papers", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("article", { timeout: 15000 });

  await humanPause(page);
  await humanMove(page);
  await humanScroll(page);
  await humanPause(page);

  const capitalized = period.charAt(0).toUpperCase() + period.slice(1);
  const tab = page.locator(`button:has-text("${capitalized}")`);
  if (await tab.count() === 0) {
    const err = new Error("[DRIFT_DETECTED] Could not find period tab button: " + period);
    err.code = "DRIFT_DETECTED";
    throw err;
  }
  await tab.first().click();

  // Wait for tab content to reload after click
  await page.waitForTimeout(2000);
  await page.waitForSelector("article", { timeout: 15000 });
  await humanPause(page);

  const papers = await page.evaluate((maxCount) => {
    const articles = document.querySelectorAll("article");
    const results = [];

    for (let i = 0; i < Math.min(articles.length, maxCount); i++) {
      const article = articles[i];

      // Title and URL — h3>a works for both daily and weekly/monthly layouts
      const titleLink = article.querySelector("h3 a");
      const title = titleLink ? titleLink.innerText.trim() : "";
      const paperUrl = titleLink ? titleLink.href : "";
      if (!title) continue;

      // Abstract — only present in daily layout (article > p)
      const abstractEl = article.querySelector("p");
      const abstract = abstractEl ? abstractEl.innerText.trim() : "";

      // Authors — daily: ul>li, weekly: a tags with org/author names
      const authorUl = article.querySelector("ul");
      const authors = [];
      if (authorUl) {
        const authorItems = authorUl.querySelectorAll("li");
        authorItems.forEach(li => {
          const text = li.getAttribute("title") || li.innerText.trim();
          if (text && !/^\d+ authors?$/.test(text)) {
            authors.push(text);
          }
        });
      }
      if (authors.length === 0) {
        const orgLink = [...article.querySelectorAll("a")].find(l => {
          const h = l.href || "";
          return !h.includes("papers") && !h.includes("github.com") && !h.includes("arxiv.org");
        });
        const orgText = orgLink ? orgLink.innerText.trim() : "";
        if (orgText) authors.push(orgText);
      }

      // Published date — only present in daily layout
      const publishedMatch = article.textContent.match(/Published on ([A-Za-z]+ \d{1,2}, \d{4})/);
      const published = publishedMatch ? publishedMatch[1].trim() : "";

      // Upvotes — daily: "Upvote N" text, weekly: label > div.leading-none
      let upvotes = 0;
      const upvoteMatch = article.textContent.match(/Upvote\s*(\d+)/);
      if (upvoteMatch) {
        upvotes = parseInt(upvoteMatch[1]);
      } else {
        const upvoteDiv = article.querySelector("label div.leading-none");
        if (upvoteDiv) {
          upvotes = parseInt(upvoteDiv.innerText.trim()) || 0;
        }
      }

      // GitHub link — daily: a[href*="github.com"], weekly: not rendered
      const githubLink = article.querySelector('a[href*="github.com"]');
      const githubUrl = githubLink ? githubLink.href : null;
      const githubStarsMatch = githubLink ? githubLink.textContent.match(/GitHub\s+([\d.kmKM]+)/i) : null;
      const githubStars = githubStarsMatch ? githubStarsMatch[1] : null;

      // arXiv link — daily: a[href*="arxiv.org"], weekly: not rendered
      const arxivLink = article.querySelector('a[href*="arxiv.org"]');
      const arxiv = arxivLink ? arxivLink.href : null;

      results.push({
        rank: i + 1,
        title,
        url: paperUrl,
        abstract,
        authors,
        published,
        upvotes,
        github: githubUrl ? { url: githubUrl, stars: githubStars } : null,
        arxiv
      });
    }

    return results;
  }, limit);

  if (limit <= 0) {
    await page.waitForTimeout(Math.random() * 3000);
    return { papers: [], count: 0, period };
  }

  if (papers.length === 0) {
    const err = new Error("[EMPTY_RESULT] No papers found on the page");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  await page.waitForTimeout(Math.random() * 3000);
  return { papers, count: papers.length, period };
};
