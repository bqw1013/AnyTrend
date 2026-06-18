// Replicate Explore trending models extractor
// Extracts model data from Featured, Official, and Latest sections on /explore

export default async (page, params) => {
  // --- Parameter parsing ---
  const sectionsParam = params.sections;
  const requestedSections = sectionsParam
    ? sectionsParam.split(",").map(s => s.trim().toLowerCase())
    : ["featured", "latest"];
  const limit = parseInt(params.limit) || 12;
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  // --- Human-like behavior helpers ---
  const randomDelay = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const humanPause = (min, max) => page.waitForTimeout(randomDelay(min, max));
  const smallMouseMove = async () => {
    try {
      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }));
      const x = Math.floor(Math.random() * Math.min(viewport.width || 800, 600));
      const y = Math.floor(Math.random() * Math.min(viewport.height || 600, 400));
      await page.mouse.move(x, y);
    } catch {
      // ignore mouse-move failures
    }
  };

  // --- Navigation ---
  await page.goto("https://replicate.com/explore", {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });

  // Wait for main content to render
  try {
    await page.waitForSelector("h1", { timeout: 15000 });
  } catch {
    const err = new Error("[DRIFT_DETECTED] Page heading not found — page structure may have changed");
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  // Small extra wait for React hydration
  await page.waitForTimeout(2000);
  await smallMouseMove();
  await humanPause(300, 800);

  // --- Section name matching (lenient, case-insensitive) ---
  const SECTION_PATTERNS = {
    featured: /featured\s*models?/i,
    official: /official\s*models?/i,
    latest: /latest\s*models?/i
  };

  // --- Extraction ---
  const data = await page.evaluate(
    ({ requestedSections, SECTION_PATTERNS, limit }) => {
      const results = [];
      const h2Elements = document.querySelectorAll("h2");

      for (const h2 of h2Elements) {
        const h2Text = h2.textContent?.trim() || "";

        // Determine which section this h2 belongs to
        let sectionKey = null;
        let sectionLabel = null;
        for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
          if (pattern.test(h2Text) && requestedSections.includes(key)) {
            sectionKey = key;
            sectionLabel = h2Text;
            break;
          }
        }
        if (!sectionKey) continue;

        // Find the card container: walk up from h2, at each level check
        // only the IMMEDIATE next sibling (not all following siblings).
        // Validate it has >=2 model card links with images.
        // Featured/Latest: found at level 0 (h2.nextElementSibling)
        // Official: may be deeper (level 2+), walk up to 12 levels
        let container = null;
        let walker = h2;
        for (let level = 0; level < 12; level++) {
          const sibling = walker.nextElementSibling;
          if (sibling) {
            const imgLinks = sibling.querySelectorAll(
              'a[href^="/"][href*="/"] img'
            );
            if (imgLinks.length >= 2) {
              container = sibling;
              break;
            }
          }
          walker = walker.parentElement;
          if (!walker) break;
        }
        // Fallback: if walk-up didn't find container, search the ancestor
        // subtree for any descendant element with model card images
        if (!container) {
          let ancestor = h2.parentElement;
          for (let i = 0; i < 10 && ancestor && !container; i++) {
            const kids = ancestor.children;
            for (let j = 0; j < kids.length; j++) {
              const imgs = kids[j].querySelectorAll(
                'a[href^="/"][href*="/"] img'
              );
              if (imgs.length >= 2) {
                container = kids[j];
                break;
              }
            }
            ancestor = ancestor.parentElement;
          }
        }
        if (!container) continue;

        // Extract model cards from this container
        const linkElements = container.querySelectorAll("a[href]");
        const models = [];
        const seenHrefs = new Set();

        for (const a of linkElements) {
          const href = a.getAttribute("href");
          if (!href) continue;

          // Match model URLs: /owner/name (not collections, playground, _next)
          const match = href.match(/^\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
          if (!match) continue;
          if (
            href.startsWith("/collections/") ||
            href.startsWith("/playground") ||
            href.startsWith("/_next")
          ) continue;

          const owner = match[1];
          const name = match[2];
          if (seenHrefs.has(href)) continue;
          seenHrefs.add(href);

          // Extract data from card
          const img = a.querySelector("img");
          const h2Child = a.querySelector("h2, h3");
          const fullText = a.textContent?.trim() || "";

          // Run count: must start with a digit
          const runMatch = fullText.match(/([0-9][0-9,.]*[KMB]?)\s*runs?/i);
          const runs = runMatch ? runMatch[1] : null;
          const isOfficial = /official/i.test(fullText);
          const coverImage = img?.getAttribute("src") || "";
          const imgAlt = img?.getAttribute("alt") || "";
          const displayName = h2Child?.textContent?.trim() || "";

          // Extract description: remove known pieces from full text.
          // Text formats vary by section:
          //   Featured: "owner/name description runs Official?"
          //   Official: "displayName owner / name description runs Official?"
          //   Latest:   "displayName? owner / name description runs Official?"
          let desc = fullText;
          // Remove "owner / name" (with spaces around slash) — position independent
          desc = desc.replace(new RegExp(`${owner}\\s*/\\s*${name}`, "g"), "");
          // Remove displayName if it appears at the start
          if (displayName) {
            desc = desc.replace(displayName, "");
          }
          // Remove runs text
          if (runs) {
            desc = desc.replace(
              new RegExp(`[0-9][0-9,.]*[KMB]?\\s*runs?`, "i"),
              ""
            );
          }
          // Remove "Official" badge — handle both spaced and concatenated cases
          desc = desc.replace(/\s*Official\s*/gi, " ");
          desc = desc.replace(/\s+/g, " ").trim();

          // Skip bare links — require at least one meaningful data field
          const hasData = coverImage || desc.trim() || runs;
          if (!hasData) continue;

          models.push({
            owner,
            name,
            displayName: displayName || imgAlt || name,
            description: desc.substring(0, 300),
            runs: runs ? `${runs} runs` : "",
            isOfficial,
            coverImage,
            url: `https://replicate.com${href}`
          });

          if (models.length >= limit) break;
        }

        if (models.length > 0) {
          results.push({
            name: sectionKey,
            label: sectionLabel,
            models
          });
        }
      }

      return results;
    },
    { requestedSections, SECTION_PATTERNS, limit: clampedLimit }
  );

  // --- Handle "Load more" for Latest section ---
  if (requestedSections.includes("latest")) {
    const latestSection = data.find(s => s.name === "latest");
    if (latestSection && latestSection.models.length < clampedLimit) {
      let loadMoreClicks = 0;
      const maxClicks = Math.ceil(clampedLimit / 12);

      while (loadMoreClicks < maxClicks) {
        try {
          const buttons = await page.$$("button");
          let loadMoreBtn = null;
          for (const btn of buttons) {
            const text = await btn.textContent();
            if (text && /load\s*more/i.test(text.trim())) {
              loadMoreBtn = btn;
              break;
            }
          }

          if (!loadMoreBtn) break;

          await loadMoreBtn.scrollIntoViewIfNeeded();
          await humanPause(200, 600);
          await loadMoreBtn.click();
          await humanPause(1200, 1800);

          // Re-extract the latest section
          const newData = await page.evaluate(
            ({ SECTION_PATTERNS, limit }) => {
              const h2Elements = document.querySelectorAll("h2");
              for (const h2 of h2Elements) {
                const h2Text = h2.textContent?.trim() || "";
                if (!SECTION_PATTERNS.latest.test(h2Text)) continue;

                // Find card container: walk up to 12 levels
                let container = null;
                let walker = h2;
                for (let level = 0; level < 12; level++) {
                  const sibling = walker.nextElementSibling;
                  if (sibling) {
                    const imgLinks = sibling.querySelectorAll(
                      'a[href^="/"][href*="/"] img'
                    );
                    if (imgLinks.length >= 2) {
                      container = sibling;
                      break;
                    }
                  }
                  walker = walker.parentElement;
                  if (!walker) break;
                }
                // Fallback: search ancestor subtree
                if (!container) {
                  let ancestor = h2.parentElement;
                  for (let i = 0; i < 10 && ancestor && !container; i++) {
                    const kids = ancestor.children;
                    for (let j = 0; j < kids.length; j++) {
                      const imgs = kids[j].querySelectorAll(
                        'a[href^="/"][href*="/"] img'
                      );
                      if (imgs.length >= 2) {
                        container = kids[j];
                        break;
                      }
                    }
                    ancestor = ancestor.parentElement;
                  }
                }
                if (!container) return [];

                const linkElements = container.querySelectorAll("a[href]");
                const models = [];
                const seenHrefs = new Set();

                for (const a of linkElements) {
                  const href = a.getAttribute("href");
                  if (!href) continue;
                  const match = href.match(
                    /^\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/
                  );
                  if (!match) continue;
                  if (
                    href.startsWith("/collections/") ||
                    href.startsWith("/playground") ||
                    href.startsWith("/_next")
                  ) continue;
                  if (seenHrefs.has(href)) continue;
                  seenHrefs.add(href);

                  const owner = match[1];
                  const name = match[2];
                  const img = a.querySelector("img");
                  const fullText = a.textContent?.trim() || "";
                  const runMatch = fullText.match(
                    /([0-9][0-9,.]*[KMB]?)\s*runs?/i
                  );
                  const runs = runMatch ? runMatch[1] : null;
                  const isOfficial = /official/i.test(fullText);
                  const coverImage = img?.getAttribute("src") || "";
                  const imgAlt = img?.getAttribute("alt") || "";

                  let desc = fullText;
                  desc = desc.replace(
                    new RegExp(`${owner}\\s*/\\s*${name}`, "g"),
                    ""
                  );
                  if (runs) {
                    desc = desc.replace(
                      new RegExp(`[0-9][0-9,.]*[KMB]?\\s*runs?`, "i"),
                      ""
                    );
                  }
                  desc = desc.replace(/\s*Official\s*/gi, " ");
                  desc = desc.replace(/\s+/g, " ").trim();

                  // Skip bare links
                  const hasData = coverImage || desc.trim() || runs;
                  if (!hasData) continue;

                  models.push({
                    owner,
                    name,
                    displayName: imgAlt || name,
                    description: desc.substring(0, 300),
                    runs: runs ? `${runs} runs` : "",
                    isOfficial,
                    coverImage,
                    url: `https://replicate.com${href}`
                  });

                  if (models.length >= limit) break;
                }
                return models;
              }
              return [];
            },
            { SECTION_PATTERNS, limit: clampedLimit }
          );

          latestSection.models = newData.slice(0, clampedLimit);
          loadMoreClicks++;

          if (newData.length >= clampedLimit) break;
        } catch {
          break;
        }
      }
    }
  }

  // --- Validate results ---
  const totalModels = data.reduce((sum, s) => sum + s.models.length, 0);
  if (totalModels === 0) {
    const err = new Error(
      "[EMPTY_RESULT] No model cards found in any requested section"
    );
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Final human-like wait before returning
  await humanPause(0, 3000);

  return { sections: data };
};
