export default async function (page, params) {
  const type = params.type || "models";
  const sort = params.sort || "trending";
  const limit = parseInt(params.limit, 10) || 20;

  const allowedTypes = ["models", "datasets", "spaces"];
  if (!allowedTypes.includes(type)) {
    const err = new Error(`[INVALID_PARAM] type must be one of ${allowedTypes.join(", ")}`);
    err.code = "INVALID_PARAM";
    throw err;
  }

  const allowedSorts = ["trending", "likes", "downloads", "created", "modified", "params_desc", "params_asc"];
  if (!allowedSorts.includes(sort)) {
    const err = new Error(`[INVALID_PARAM] sort must be one of ${allowedSorts.join(", ")}`);
    err.code = "INVALID_PARAM";
    throw err;
  }

  const urlSortMap = {
    trending: "trending",
    likes: "likes",
    downloads: "downloads",
    created: "created",
    modified: "modified",
    params_desc: "most_params",
    params_asc: "least_params",
  };

  let url = `https://huggingface.co/${type}`;
  const urlSort = urlSortMap[sort];
  if (type === "spaces" && sort === "trending") {
    url += `?sort=${urlSort}`;
  } else if (sort !== "trending" || type === "spaces") {
    url += `?sort=${urlSort}`;
  }

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("article", { timeout: 15000 });

  // Light human-like behavior
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth || 1280,
    height: window.innerHeight || 720,
  }));
  await page.mouse.move(randomInt(80, viewport.width - 80), randomInt(80, viewport.height - 80));
  await sleep(randomInt(300, 1200));
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: "smooth" }));
  await sleep(randomInt(400, 1500));

  const items = await page.evaluate((args) => {
    const maxItems = args.maxItems;
    const contentType = args.contentType;
    const knownTypes = new Set([
      "Text Generation", "Image-Text-to-Text", "Image-to-Text", "Image-to-Image",
      "Text-to-Image", "Text-to-Video", "Text-to-Speech", "Image-Text-to-Video",
      "Video-Text-to-Text", "Any-to-Any", "Audio-to-Audio", "Automatic Speech Recognition",
      "Feature Extraction", "Fill-Mask", "Question Answering", "Sentence Similarity",
      "Summarization", "Table Question Answering", "Text Classification", "Text-to-Audio",
      "Token Classification", "Translation", "Zero-Shot Classification", "Text Retrieval",
      "Object Detection", "Image Classification", "Video Classification", "Depth Estimation",
      "Document Question Answering", "Mask Generation", "Audio Classification",
      "Reinforcement Learning", "Robotics", "Tabular Classification", "Tabular Regression",
      "Viewer", "Relevance", "Natural Language Processing", "Computer Vision", "Audio",
      "Tabular", "Multimodal", "Other"
    ]);

    const articles = document.querySelectorAll("article");
    const results = [];
    let rank = 1;

    const parseNum = (str) => {
      const s = str.trim().replace(/,/g, "");
      if (s.includes("M")) return parseFloat(s.replace(/M/, "")) * 1000000;
      if (s.includes("k")) return parseFloat(s.replace(/k/, "")) * 1000;
      const n = parseInt(s, 10);
      return isNaN(n) ? 0 : n;
    };

    for (const article of articles) {
      if (results.length >= maxItems) break;

      let name = "";
      let url = "";

      if (contentType === "spaces") {
        const h = article.querySelector("h3, h4");
        name = h ? h.textContent.trim() : "";
        const a = article.closest("a") || article.querySelector("a[href^='/spaces']");
        if (a) {
          const href = a.getAttribute("href") || "";
          url = href.startsWith("http") ? href : `https://huggingface.co${href}`;
        }
      } else {
        const linkEl = article.querySelector("a[href^='/']");
        if (!linkEl) continue;
        const href = linkEl.getAttribute("href") || "";
        url = href.startsWith("http") ? href : `https://huggingface.co${href}`;
      }

      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
      const texts = [];
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t && t !== "•" && t.length < 100) texts.push(t);
      }

      let itemType = "";
      let params = "";
      let updated = "";
      let downloads = 0;
      let likes = 0;

      if (contentType === "spaces") {
        const numTexts = texts.filter((t) => t.match(/^\d+[kM]?$/));
        if (numTexts.length >= 1) likes = parseNum(numTexts[0]);
        const timeText = texts.find((t) => t.match(/^(\d+\s+(day|hour|minute|month|year)|yesterday|today)s?\s+ago$/i));
        if (timeText) updated = timeText;
      } else {
        if (texts.length > 0) {
          name = texts[0];
        }
        if (texts.length > 1 && knownTypes.has(texts[1])) {
          itemType = texts[1];
        }

        let idx = itemType ? 2 : 1;
        if (texts[idx] && texts[idx].match(/^\d+[BKMGTP]?(\.\d+)?[BKMGTP]?$/i)) {
          params = texts[idx];
          idx++;
        }

        for (let i = idx; i < texts.length; i++) {
          if (texts[i].match(/^Updated\s/i) || texts[i].match(/^Created\s/i)) {
            updated = texts[i];
            if (texts[i + 1] && !texts[i + 1].match(/^(Updated|Created)/i)) {
              updated += " " + texts[i + 1];
              i++;
            }
            idx = i + 1;
            break;
          }
        }

        const numTexts = texts.slice(idx).filter((t) => t.match(/^[\d,.]+[kM]?$/));
        if (numTexts.length >= 1) downloads = parseNum(numTexts[0]);
        if (numTexts.length >= 2) likes = parseNum(numTexts[1]);
      }

      if (!name || !url) continue;

      results.push({
        rank: rank++,
        name,
        url,
        type: itemType || undefined,
        params: params || undefined,
        updated: updated || undefined,
        downloads,
        likes,
      });
    }

    return results;
  }, { maxItems: limit, contentType: type });

  if (items.length === 0) {
    const err = new Error("[EMPTY_RESULT] No trending items found on the page");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Final random wait before returning
  await sleep(randomInt(0, 3000));

  return { items, count: items.length };
}
