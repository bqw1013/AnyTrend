// Category slug → WordPress category ID mapping (verified 2026-06-11)
const CATEGORY_MAP = {
  "artificial-intelligence": 577047203,
  startups: 20429,
  venture: 577030455,
  security: 21587494,
  apps: 577051039,
  climate: 576957003,
  "biotech-health": 577030454,
  commerce: 577052802,
  cryptocurrency: 576601119,
  enterprise: 449557044,
  fintech: 577030453,
  fundraising: 577234943,
  gadgets: 577052803,
  gaming: 577052804,
  "government-policy": 577065682,
  hardware: 449223024,
  "media-entertainment": 577030456,
  privacy: 426637499,
  "real-estate": 577303513,
  robotics: 577123751,
  social: 577055593,
  space: 174,
  transportation: 2401,
};

// Fields to request from WP API (minimize response size)
const FIELDS = "id,date,link,title,excerpt,jetpack_featured_media_url";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#8217;/g, "'").replace(/&#8230;/g, "…").trim();
}

export default async function (params) {
  const category = params.category || "";
  const perPage = parseInt(params.per_page, 10);
  const page = parseInt(params.page, 10);

  // Validate per_page
  if (isNaN(perPage) || perPage < 1 || perPage > 100) {
    const err = new Error("[INVALID_PARAM] per_page must be between 1 and 100");
    err.code = "INVALID_PARAM";
    throw err;
  }

  // Validate page
  if (isNaN(page) || page < 1) {
    const err = new Error("[INVALID_PARAM] page must be a positive integer");
    err.code = "INVALID_PARAM";
    throw err;
  }

  // Resolve category slug to ID
  let categoryId = null;
  if (category) {
    categoryId = CATEGORY_MAP[category];
    if (!categoryId) {
      const known = Object.keys(CATEGORY_MAP).join(", ");
      const err = new Error(`[INVALID_CATEGORY] Unknown category "${category}". Known categories: ${known}`);
      err.code = "INVALID_CATEGORY";
      throw err;
    }
  }

  // Build API URL
  const apiUrl = new URL("https://techcrunch.com/wp-json/wp/v2/posts");
  apiUrl.searchParams.set("per_page", String(perPage));
  apiUrl.searchParams.set("page", String(page));
  apiUrl.searchParams.set("_fields", FIELDS);
  if (categoryId) {
    apiUrl.searchParams.set("categories", String(categoryId));
  }

  // Pause briefly to keep request cadence moderate
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

  // Fetch from WP REST API
  let response;
  try {
    response = await fetch(apiUrl.toString());
  } catch (err) {
    const error = new Error(`[NETWORK_ERROR] Failed to fetch TechCrunch API: ${err.message}`);
    error.code = "NETWORK_ERROR";
    throw error;
  }

  if (!response.ok) {
    const err = new Error(`[API_ERROR] TechCrunch API returned ${response.status} ${response.statusText}`);
    err.code = "API_ERROR";
    throw err;
  }

  let posts;
  try {
    posts = await response.json();
  } catch (err) {
    const error = new Error(`[PARSE_ERROR] Failed to parse API response: ${err.message}`);
    error.code = "PARSE_ERROR";
    throw error;
  }

  if (!Array.isArray(posts)) {
    const err = new Error("[DRIFT_DETECTED] Unexpected API response format, expected an array");
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  // Transform to clean output
  const articles = posts.map((post) => ({
    id: post.id,
    title: stripHtml(post.title?.rendered || ""),
    url: post.link || "",
    date: post.date || "",
    excerpt: stripHtml(post.excerpt?.rendered || ""),
    image: post.jetpack_featured_media_url || "",
  }));

  return {
    articles,
    count: articles.length,
    page,
    perPage,
    category: category || null,
  };
}
