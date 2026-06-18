// Medium Staff Picks — official editorial curation hot list
// Extracts 20 staff-curated articles from window.__APOLLO_STATE__
export default async (page, params) => {

  const rawLimit = parseInt(params.limit);
  const limit = isNaN(rawLimit) ? 20 : rawLimit;

  // Validate boundary: negative or zero are invalid
  if (limit <= 0) {
    const err = new Error(
      "[INVALID_PARAM] --limit must be a positive integer, got: " +
        (isNaN(parseInt(params.limit)) ? "non-numeric value" : limit)
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  // Validate maximum: > 20 is invalid (Medium exposes at most 20 items)
  if (limit > 20) {
    const err = new Error(
      "[INVALID_PARAM] --limit exceeds maximum (20). " +
      "Medium Staff Picks only exposes 20 items per query."
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  await page.goto(
    "https://medium.com/@MediumStaff/list/staff-picks-c7bc6e1ee00f",
    { waitUntil: "domcontentloaded" }
  );

  // Light human-like behavior: short pause, small mouse move, gentle scroll
  await page.waitForTimeout(300 + Math.random() * 500);
  await page.mouse.move(
    80 + Math.floor(Math.random() * 240),
    120 + Math.floor(Math.random() * 200)
  );
  await page.waitForTimeout(200 + Math.random() * 400);
  await page.evaluate(() => {
    window.scrollTo({
      top: Math.floor(window.innerHeight * 0.25 + Math.random() * 200),
      behavior: "smooth",
    });
  });
  await page.waitForTimeout(600 + Math.random() * 600);

  // Wait for Apollo Client state to hydrate (up to 15 seconds)
  try {
    await page.waitForFunction(
      () => window.__APOLLO_STATE__ && window.__APOLLO_STATE__.ROOT_QUERY,
      { timeout: 15000 }
    );
  } catch {
    const err = new Error("[PAGE_LOAD_FAILED] Apollo state did not hydrate within timeout");
    err.code = "PAGE_LOAD_FAILED";
    throw err;
  }

  const items = await page.evaluate((maxItems) => {
    const state = window.__APOLLO_STATE__;
    if (!state) return { __error: "APOLLO_STATE_NOT_FOUND" };

    const rootQuery = state.ROOT_QUERY;
    if (!rootQuery) return { __error: "APOLLO_STATE_NOT_FOUND" };

    // Locate the catalog reference in ROOT_QUERY
    const catalogKey = 'catalogById({"catalogId":"c7bc6e1ee00f"})';
    const catalogRef = rootQuery[catalogKey];
    if (!catalogRef || !catalogRef.__ref) return { __error: "CATALOG_NOT_FOUND" };

    const catalog = state[catalogRef.__ref];
    if (!catalog) return { __error: "CATALOG_DATA_NOT_FOUND" };

    // Navigate the items connection
    const connectionKey = "itemsConnection:(limit:20)";
    const itemsConnection = catalog[connectionKey];
    if (!itemsConnection || !Array.isArray(itemsConnection.items)) {
      return { __error: "ITEMS_NOT_FOUND" };
    }

    const itemRefs = itemsConnection.items.slice(0, maxItems);
    const results = [];

    for (let i = 0; i < itemRefs.length; i++) {
      const itemRef = itemRefs[i];
      if (!itemRef || !itemRef.__ref) continue;

      const catalogItem = state[itemRef.__ref];
      if (!catalogItem || catalogItem.entityType !== "POST") continue;

      const entityRef = catalogItem.entity;
      if (!entityRef || !entityRef.__ref) continue;

      const post = state[entityRef.__ref];
      if (!post || post.__typename !== "Post") continue;

      // Extract author
      let author = { name: "Unknown", username: "", url: "" };
      if (post.creator && post.creator.__ref) {
        const user = state[post.creator.__ref];
        if (user) {
          author = {
            name: user.name || "Unknown",
            username: user.username || "",
            url: user.username
              ? "https://medium.com/@" + user.username
              : "",
          };
        }
      }

      // Extract tags
      const tags = [];
      if (Array.isArray(post.tags)) {
        for (const tagRef of post.tags) {
          if (tagRef && tagRef.__ref) {
            const tagData = state[tagRef.__ref];
            if (tagData) {
              tags.push(tagData.displayTitle || tagData.id || "");
            }
          }
        }
      }

      // Extract preview image URL
      // previewImage is embedded (not a __ref): { __typename, id, focusPercentX, focusPercentY, alt }
      let previewImage = null;
      if (post.previewImage && post.previewImage.id) {
        previewImage = "https://miro.medium.com/v2/resize:fit:400/" + post.previewImage.id;
      }

      // Extract curator note
      let curatorNote = null;
      if (
        catalogItem.userAnnotation &&
        catalogItem.userAnnotation.annotation
      ) {
        curatorNote = catalogItem.userAnnotation.annotation;
      }

      results.push({
        rank: i + 1,
        title: post.title || "",
        subtitle:
          (post.extendedPreviewContent &&
            post.extendedPreviewContent.subtitle) ||
          "",
        url: post.mediumUrl || "",
        author,
        clapCount: typeof post.clapCount === "number" ? post.clapCount : 0,
        responseCount:
          post.postResponses && typeof post.postResponses.count === "number"
            ? post.postResponses.count
            : 0,
        readingTime:
          typeof post.readingTime === "number"
            ? Math.round(post.readingTime)
            : 0,
        publishedAt:
          typeof post.firstPublishedAt === "number"
            ? new Date(post.firstPublishedAt).toISOString()
            : "",
        tags,
        previewImage,
        curatorNote,
        isLocked: post.isLocked === true,
      });
    }

    return results;
  }, limit);

  // Handle evaluate-level errors
  if (items && items.__error) {
    const code = items.__error;
    const err = new Error("[" + code + "] Failed to extract Staff Picks data");
    err.code = code;
    throw err;
  }

  if (!items || items.length === 0) {
    const err = new Error("[EMPTY_RESULT] No Staff Picks items could be extracted");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Final human-like pause before returning
  await page.waitForTimeout(Math.random() * 3000);

  return { items, count: items.length };
};
