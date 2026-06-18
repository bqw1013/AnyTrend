// Medium Tag Trending — popular articles by tag/topic
// Primary: Apollo recommendedPostsFeed (has engagement metrics, tags, author)
// Fallback: JSON-LD structured data (has 20 articles but no engagement metrics)
export default async (page, params) => {

  const tag = (params.tag || "").trim().toLowerCase();
  if (!tag) {
    const err = new Error("[MISSING_PARAM] Required parameter 'tag' is missing or empty");
    err.code = "MISSING_PARAM";
    throw err;
  }

  const rawLimit = parseInt(params.limit);
  const limit = isNaN(rawLimit) ? 20 : Math.min(rawLimit, 20);

  const tagUrl = "https://medium.com/tag/" + encodeURIComponent(tag);
  await page.goto(tagUrl, { waitUntil: "domcontentloaded" });

  // Light human-like behavior for Medium
  const humanDelay = (min, max) => page.waitForTimeout(min + Math.random() * (max - min));
  try {
    const viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    if (viewport && viewport.w > 0 && viewport.h > 0) {
      const x = Math.floor(Math.random() * Math.max(1, viewport.w - 20));
      const y = Math.floor(Math.random() * Math.max(1, viewport.h - 20));
      await page.mouse.move(Math.max(0, x), Math.max(0, y));
      await humanDelay(150, 600);
      await page.evaluate(() => {
        window.scrollBy({ top: 200 + Math.floor(Math.random() * 300), behavior: "smooth" });
      });
      await humanDelay(300, 900);
    }
  } catch (_) {
    // Ignore harmless interaction errors; do not block data extraction
  }

  // Wait for Apollo state to hydrate — ROOT_QUERY for tag data, plus Post objects for enrichment
  try {
    await page.waitForFunction(
      () => {
        const s = window.__APOLLO_STATE__;
        if (!s || !s.ROOT_QUERY) return false;
        const postKeys = Object.keys(s).filter(function (k) { return k.startsWith("Post:"); });
        return postKeys.length >= 5;
      },
      { timeout: 20000 }
    );
  } catch {
    const err = new Error("[PAGE_LOAD_FAILED] Apollo state did not hydrate within timeout");
    err.code = "PAGE_LOAD_FAILED";
    throw err;
  }

  const result = await page.evaluate(({ tagSlug, maxItems }) => {
    const state = window.__APOLLO_STATE__;
    if (!state) return { __error: "APOLLO_STATE_NOT_FOUND" };

    const rootQuery = state.ROOT_QUERY;
    if (!rootQuery) return { __error: "APOLLO_STATE_NOT_FOUND" };

    // Locate tag data via ROOT_QUERY
    const tagQueryKey = 'tagFromSlug({"tagSlug":"' + tagSlug + '"})';
    const tagRef = rootQuery[tagQueryKey];
    if (!tagRef || !tagRef.__ref) return { __error: "TAG_NOT_FOUND" };

    const tagData = state[tagRef.__ref];
    if (!tagData) return { __error: "TAG_DATA_NOT_FOUND" };

    // ----- Attempt primary: Apollo recommendedPostsFeed -----
    var feedItems = null;
    var useFallback = false;
    try {
      var veRef = tagData.viewerEdge;
      if (veRef && veRef.__ref) {
        var veObj = state[veRef.__ref];
        if (veObj) {
          var feedRef = veObj["recommendedPostsFeed:(limit:15)"];
          if (feedRef && Array.isArray(feedRef.items)) {
            feedItems = feedRef.items;
          }
        }
      }
    } catch (_) { /* will fall back to JSON-LD */ }

    if (!feedItems || feedItems.length === 0) {
      // Fallback: JSON-LD
      useFallback = true;
    }

    // ---- JSON-LD fallback path ----
    var jsonLdArticles = [];
    if (useFallback || feedItems === null) {
      var seoMeta = tagData.seoMetaTags;
      if (!seoMeta || !seoMeta.jsonLd) return { __error: "JSON_LD_NOT_FOUND" };

      try {
        var jsonLd = JSON.parse(seoMeta.jsonLd);
      } catch (_) {
        return { __error: "JSON_LD_PARSE_FAILED" };
      }

      var mainEntity = jsonLd.mainEntity;
      if (!Array.isArray(mainEntity) || mainEntity.length === 0) {
        return { __error: "NO_ARTICLES_IN_JSON_LD" };
      }
      jsonLdArticles = mainEntity;
    }

    // --- Shared helpers ---

    // Build Apollo post lookup by post ID (for JSON-LD fallback enrichment attempt)
    var apolloPosts = {};
    var postKeys = Object.keys(state).filter(function (k) {
      return k.startsWith("Post:");
    });
    for (var i = 0; i < postKeys.length; i++) {
      var post = state[postKeys[i]];
      if (post && post.id) {
        apolloPosts[post.id] = post;
      }
    }

    // Resolve tag names from __ref array
    function resolveTags(tagRefs) {
      var result = [];
      if (Array.isArray(tagRefs)) {
        for (var ti = 0; ti < tagRefs.length; ti++) {
          var tRef = tagRefs[ti];
          if (tRef && tRef.__ref) {
            var tagObj = state[tRef.__ref];
            if (tagObj) {
              result.push(tagObj.displayTitle || tagObj.id || "");
            }
          }
        }
      }
      return result;
    }

    // Resolve creator from __ref
    function resolveCreator(creatorRef) {
      if (creatorRef && creatorRef.__ref) {
        var c = state[creatorRef.__ref];
        if (c) {
          return {
            name: c.name || "Unknown",
            username: c.username || "",
            url: "https://medium.com/@" + (c.username || ""),
          };
        }
      }
      return { name: "Unknown", username: "", url: "" };
    }

    // Build preview image from Apollo previewImage object
    function buildPreviewImage(pImg) {
      if (pImg && typeof pImg.id === "string") {
        return "https://miro.medium.com/v2/" + pImg.id;
      }
      return null;
    }

    // Filter valid JSON-LD image URLs
    function pickJsonLdImage(imageArr) {
      if (Array.isArray(imageArr)) {
        for (var imi = 0; imi < imageArr.length; imi++) {
          var img = imageArr[imi];
          if (img && typeof img === "string") {
            try {
              var u = new URL(img);
              if (u.pathname && u.pathname !== "/") {
                return img;
              }
            } catch (_) { /* skip malformed */ }
          }
        }
      }
      return null;
    }

    // ----- Build items -----
    var items = [];

    if (useFallback) {
      // JSON-LD fallback: limited enrichment, no engagement data
      var jCount = Math.min(jsonLdArticles.length, maxItems);
      for (var jIdx = 0; jIdx < jCount; jIdx++) {
        var article = jsonLdArticles[jIdx];
        if (!article) continue;

        var author = { name: "Unknown", username: "", url: "" };
        var articleAuthor = article.author;
        if (articleAuthor) {
          author = {
            name: articleAuthor.name || "Unknown",
            username: articleAuthor.identifier || "",
            url: articleAuthor.url || "",
          };
        }

        items.push({
          rank: jIdx + 1,
          title: article.headline || article.name || "",
          subtitle: article.description || "",
          url: article.url || "",
          author: author,
          clapCount: 0,
          responseCount: 0,
          readingTime: 0,
          publishedAt: article.datePublished || "",
          tags: [],
          previewImage: pickJsonLdImage(article.image),
          isLocked: !article.isAccessibleForFree,
        });
      }
    } else {
      // Apollo recommendedPostsFeed: full data
      var aCount = Math.min(feedItems.length, maxItems);
      for (var aIdx = 0; aIdx < aCount; aIdx++) {
        var feedItem = feedItems[aIdx];
        if (!feedItem || !feedItem.post || !feedItem.post.__ref) continue;

        var apolloPost = state[feedItem.post.__ref];
        if (!apolloPost) continue;

        var author2 = resolveCreator(apolloPost.creator);
        var tags2 = resolveTags(apolloPost.tags);
        var previewImage2 = buildPreviewImage(apolloPost.previewImage);

        var subtitle2 = "";
        if (apolloPost.extendedPreviewContent && apolloPost.extendedPreviewContent.subtitle) {
          subtitle2 = apolloPost.extendedPreviewContent.subtitle;
        }

        // Convert firstPublishedAt (timestamp in ms) to ISO string
        var publishedAt = "";
        if (typeof apolloPost.firstPublishedAt === "number") {
          try {
            publishedAt = new Date(apolloPost.firstPublishedAt).toISOString();
          } catch (_) {
            publishedAt = String(apolloPost.firstPublishedAt);
          }
        }

        items.push({
          rank: aIdx + 1,
          title: apolloPost.title || "",
          subtitle: subtitle2,
          url: apolloPost.mediumUrl || "",
          author: author2,
          clapCount: typeof apolloPost.clapCount === "number" ? apolloPost.clapCount : 0,
          responseCount:
            apolloPost.postResponses && typeof apolloPost.postResponses.count === "number"
              ? apolloPost.postResponses.count
              : 0,
          readingTime:
            typeof apolloPost.readingTime === "number"
              ? Math.max(1, Math.round(apolloPost.readingTime))
              : 0,
          publishedAt: publishedAt,
          tags: tags2,
          previewImage: previewImage2,
          isLocked: apolloPost.isLocked === true,
        });
      }
    }

    return {
      items: items,
      tag: {
        slug: tagData.id || tagSlug,
        displayTitle: tagData.displayTitle || tagSlug,
        postCount: tagData.postCount || 0,
      },
    };
  }, { tagSlug: tag, maxItems: limit });

  if (result && result.__error) {
    var code = result.__error;
    var err2 = new Error("[" + code + "] Failed to extract tag trending data for '" + tag + "'");
    err2.code = code;
    throw err2;
  }

  if (!result || !result.items || result.items.length === 0) {
    var err3 = new Error("[EMPTY_RESULT] No articles found for tag '" + tag + "'");
    err3.code = "EMPTY_RESULT";
    throw err3;
  }

  // Final random pause before returning
  await page.waitForTimeout(Math.floor(Math.random() * 3000));

  return {
    tag: result.tag,
    items: result.items,
    count: result.items.length,
  };
};
