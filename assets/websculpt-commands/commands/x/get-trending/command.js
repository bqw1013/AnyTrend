// Helper functions can be defined above export default

// Random sleep between min and max milliseconds
async function randomSleep(min, max) {
  const duration = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(function (resolve) { setTimeout(resolve, duration); });
}

// Simulate conservative human-like interaction for X/Twitter.
// X has strong anti-bot measures, so keep movement moderate and pauses natural.
async function simulateHumanPresence(page) {
  try {
    const viewport = page.viewportSize();
    const w = viewport ? viewport.width : 1280;
    const h = viewport ? viewport.height : 800;

    // Initial reading pause
    await randomSleep(500, 1200);

    // Single moderate mouse move within the main content area
    const targetX = Math.floor(w * 0.35 + Math.random() * (w * 0.25));
    const targetY = Math.floor(h * 0.25 + Math.random() * (h * 0.35));
    await page.mouse.move(targetX, targetY, { steps: Math.floor(Math.random() * 3) + 2 });
    await randomSleep(400, 1000);

    // Small natural scroll
    await page.mouse.wheel(0, Math.floor(Math.random() * 120) + 60);
    await randomSleep(300, 800);

    // Final pause before extraction (0-3 seconds)
    await randomSleep(0, 3000);
  } catch {
    // Human simulation failures should not block data extraction
  }
}

export default async (page, params) => {
  const tab = params.tab || "trending";
  const region = params.region || null;
  const limit = parseInt(params.limit || "30", 10);

  // Validate tab parameter
  const validTabs = ["trending", "for-you", "news", "sports", "entertainment"];
  if (!validTabs.includes(tab)) {
    const err = new Error("[INVALID_PARAM] tab must be one of: " + validTabs.join(", "));
    err.code = "INVALID_PARAM";
    throw err;
  }

  // Navigate to the trending page
  await page.goto("https://x.com/explore/tabs/" + tab, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });

  // Wait for trend elements to appear
  try {
    await page.waitForSelector('[data-testid="trend"]', { timeout: 15000 });
  } catch {
    // Check if login wall is present
    const loginWall = await page.evaluate(() => {
      return !!document.querySelector('a[href="/login"]') ||
             !!document.querySelector('[data-testid="loginButton"]');
    });
    if (loginWall) {
      const err = new Error("[AUTH_REQUIRED] Login required. Please sign in to X.com in Chrome first.");
      err.code = "AUTH_REQUIRED";
      throw err;
    }
    const err = new Error("[EMPTY_RESULT] No trending items found. The page structure may have changed or trends are unavailable.");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Simulate human-like presence with conservative interactions
  await simulateHumanPresence(page);

  // Extract trends from DOM
  const trends = await page.evaluate(() => {
    const trendElements = document.querySelectorAll('[data-testid="trend"]');
    const results = [];

    trendElements.forEach(el => {
      // X trending DOM structure:
      // - div[dir="ltr"] with color rgb(231,233,234) (white) = trend name / promoted description
      // - div[dir="ltr"] with color rgb(113,118,123) (gray) = metadata (rank, category, location)
      // Non-promoted: gray-rank / gray-separator / gray-category / white-name
      // Promoted:     white-name / white-description / gray-"Promoted by..."

      const dirDivs = el.querySelectorAll('div[dir="ltr"]');
      const nameParts = [];
      const metaParts = [];

      dirDivs.forEach(div => {
        const style = div.getAttribute('style') || '';
        const text = div.textContent.trim();
        if (!text) return;

        if (style.includes('color: rgb(231, 233, 234)') || style.includes('color:rgb(231,233,234)')) {
          // White text = trend name or promoted description
          nameParts.push(text);
        } else if (style.includes('color: rgb(113, 118, 123)') || style.includes('color:rgb(113,118,123)')) {
          // Gray text = metadata
          metaParts.push(text);
        }
      });

      if (nameParts.length === 0) return;

      // The trend name is the first white-text element
      const name = nameParts[0];

      // Description is second white-text element (promoted trends only)
      const description = nameParts.length > 1 ? nameParts[1] : undefined;

      // Determine if promoted
      const allText = el.textContent;
      const isPromoted = allText.toLowerCase().includes('promoted by') ||
                         (description && description.toLowerCase().includes('promoted'));

      // Parse rank from metadata — first gray span usually contains the rank number
      let rank = results.length + 1;
      let domainContext = 'Unknown';

      if (metaParts.length >= 1) {
        // First meta part usually has the rank
        const rankMatch = metaParts[0].match(/^(\d+)$/);
        if (rankMatch) {
          rank = parseInt(rankMatch[1], 10);
          // Remaining meta parts form the domain context
          domainContext = metaParts.slice(1).join(' ');
        } else {
          // Rank might be embedded with other text
          const allMetaText = metaParts.join(' ');
          const rankMatch2 = allMetaText.match(/^(\d+)/);
          if (rankMatch2) {
            rank = parseInt(rankMatch2[1], 10);
            domainContext = allMetaText.replace(/^\d+\s*/, '').trim();
            // Remove separator dots
            domainContext = domainContext.replace(/^·\s*/, '');
          } else {
            domainContext = allMetaText;
          }
        }
      }

      // Clean up domain context
      domainContext = domainContext.replace(/^·\s*/, '').trim();
      if (!domainContext || domainContext === '·') {
        domainContext = 'Trending';
      }

      // For promoted trends, override domain_context to be clean
      if (isPromoted) {
        domainContext = 'Promoted';
      }

      // Build search URL
      const encodedName = encodeURIComponent(name);
      const searchUrl = "https://x.com/search?q=" + encodedName + "&src=trend_click&vertical=trends";

      const entry = {
        rank,
        name,
        domain_context: domainContext,
        search_url: searchUrl,
        is_promoted: isPromoted
      };

      if (description) {
        entry.description = description;
      }

      results.push(entry);
    });

    return results;
  });

  // Apply region filter if specified
  let filtered = trends;
  if (region) {
    const regionLower = region.toLowerCase();
    filtered = trends.filter(t => t.domain_context.toLowerCase().includes(regionLower));
  }

  // Apply limit
  const limited = filtered.slice(0, limit);

  return {
    tab,
    region: region || "all",
    count: limited.length,
    total_available: filtered.length,
    items: limited
  };
};
