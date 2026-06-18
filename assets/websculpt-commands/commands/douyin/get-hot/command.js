export default async (page, params) => {
  // ===== 1. Parameter parsing =====
  // Defaults are supplied by manifest.json; do not duplicate them here.
  const type = params.type;
  const tagName = params.tag;
  const order = params.order;
  const period = params.period;
  const limit = parseInt(params.limit);

  // ===== Human-like interaction helpers =====
  // Best-effort only: never let a helper failure abort the command.
  const randBetween = (min, max) => Math.random() * (max - min) + min;

  const humanPause = async (min = 300, max = 700) => {
    await new Promise((r) => setTimeout(r, randBetween(min, max)));
  };

  const humanMove = async () => {
    try {
      const vw = page.viewportSize();
      const w = vw ? vw.width : 1280;
      const h = vw ? vw.height : 800;
      const startX = randBetween(w * 0.3, w * 0.7);
      const startY = randBetween(h * 0.2, h * 0.6);
      const endX = startX + randBetween(-120, 120);
      const endY = startY + randBetween(-80, 80);
      await page.mouse.move(startX, startY);
      await page.mouse.move(
        Math.max(0, Math.min(w, endX)),
        Math.max(0, Math.min(h, endY)),
        { steps: Math.floor(randBetween(4, 10)) }
      );
    } catch {}
  };

  const humanScroll = async () => {
    try {
      const steps = Math.floor(randBetween(2, 4));
      const totalDelta = randBetween(150, 500);
      const stepDelta = totalDelta / steps;
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, stepDelta);
        await new Promise((r) => setTimeout(r, randBetween(50, 150)));
      }
      await new Promise((r) => setTimeout(r, randBetween(150, 400)));
      // Occasionally scroll back up a little, as a real user might.
      if (Math.random() < 0.3) {
        await page.mouse.wheel(0, -randBetween(50, 180));
      }
    } catch {}
  };

  // ===== 2. Map user-friendly values to API codes =====
  const TYPE_MAP = {
    video: 1,
    hotspot: 2,
    topic: 3,
    challenge: 5,
    prop: 4,
    music: 6,
  };

  const ORDER_MAP = {
    play: 1,
    like: 2,
    comment: 3,
    hot: 4,
  };

  const PERIOD_MAP = {
    "24h": 1,
    "7d": 2,
    "30d": 3,
  };

  const billboard_type = TYPE_MAP[type];
  if (!billboard_type) {
    const err = new Error(
      `[INVALID_PARAM] Invalid type "${type}". Valid values: video, hotspot, topic, challenge, prop, music`
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  // For types other than video, order and period are not applicable
  const includeOrderAndPeriod = billboard_type === 1;

  const order_key = includeOrderAndPeriod ? ORDER_MAP[order] : undefined;
  if (includeOrderAndPeriod && !order_key) {
    const err = new Error(
      `[INVALID_PARAM] Invalid order "${order}". Valid values: play, like, comment, hot`
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  const time_filter = includeOrderAndPeriod ? PERIOD_MAP[period] : undefined;
  if (includeOrderAndPeriod && !time_filter) {
    const err = new Error(
      `[INVALID_PARAM] Invalid period "${period}". Valid values: 24h, 7d, 30d`
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  // ===== 3. Navigate to creator page to establish session =====
  await page.goto(
    "https://creator.douyin.com/creator-micro/creative-guidance",
    { waitUntil: "domcontentloaded", timeout: 20000 }
  );

  // Small idle gestures after the page context is available.
  await humanPause();
  await humanMove();
  if (Math.random() < 0.5) await humanScroll();

  // Probe for SDK in background (non-blocking) — used as bonus if available
  const sdkAccessor = await page.evaluate(() => {
    if (typeof window.byted_acrawler !== "undefined") return "byted_acrawler";
    if (typeof window._byted_acrawler !== "undefined") return "_byted_acrawler";
    return null;
  });

  // Another brief pause before the API section.
  if (Math.random() < 0.5) await humanPause();

  // ===== 4. Fetch data via page.evaluate (in browser context, with auth cookies and SDK) =====
  const result = await page.evaluate(
    async ({
      billboard_type,
      tagName,
      order_key,
      time_filter,
      limit,
      includeOrderAndPeriod,
      sdkAccessor,
    }) => {
      // Get SDK signer function, if available
      const getSigner = () => {
        if (sdkAccessor && window[sdkAccessor]) {
          const sdk = window[sdkAccessor];
          // The SDK might have .sign() method or be callable directly
          if (typeof sdk.sign === "function") return (url) => sdk.sign({ url });
          if (typeof sdk === "function") return (url) => sdk({ url });
        }
        return null;
      };

      const signUrl = (baseUrl) => {
        const signer = getSigner();
        if (signer) {
          try {
            return signer(baseUrl);
          } catch {
            // signing failed, return unsigned
          }
        }
        return baseUrl;
      };

      // Helper: get msToken — try multiple sources
      const getMsToken = () => {
        // Try localStorage first
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if (val && val.length > 40 && key && key.toLowerCase().includes("token")) {
              return val;
            }
          }
        } catch {}
        // Try window.__INITIAL_STATE__
        if (
          window.__INITIAL_STATE__ &&
          window.__INITIAL_STATE__.msToken
        ) {
          return window.__INITIAL_STATE__.msToken;
        }
        return null;
      };

      // Helper: build query string
      const buildQuery = (obj) => {
        const parts = [];
        for (const [key, val] of Object.entries(obj)) {
          if (val !== undefined && val !== null) {
            parts.push(
              encodeURIComponent(key) + "=" + encodeURIComponent(val)
            );
          }
        }
        return parts.join("&");
      };

      // Step 1: Fetch config API to get tag mapping and msToken
      let msToken = getMsToken();
      let userId = null;

      // Try to call config API first to get fresh msToken and category lookup
      const browserName = (() => {
        const ua = navigator.userAgent;
        if (ua.includes("Edg")) return "Edge";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari")) return "Safari";
        if (ua.includes("Firefox")) return "Firefox";
        return "Mozilla";
      })();

      const deviceInfo = {
        aid: "2906",
        app_name: "aweme_creator_platform",
        device_platform: "web",
        referer: "https://creator.douyin.com/creator-micro/creative-guidance",
        user_agent: navigator.userAgent,
        cookie_enabled: navigator.cookieEnabled ? "true" : "false",
        screen_width: screen.width,
        screen_height: screen.height,
        browser_language: navigator.language,
        browser_platform: navigator.platform,
        browser_name: browserName,
        browser_version: navigator.userAgent,
        browser_online: navigator.onLine ? "true" : "false",
        timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Build config URL and sign it
      let configBaseUrl =
        "https://creator.douyin.com/web/api/creator/material/center/config/?" +
        buildQuery(deviceInfo);
      if (msToken) {
        configBaseUrl += "&msToken=" + encodeURIComponent(msToken);
      }

      const configSignedUrl = signUrl(configBaseUrl);

      let tagCode = 0; // default: 全部
      let userInfo = null;

      try {
        const configRes = await fetch(configSignedUrl, {
          credentials: "include",
        });
        if (configRes.ok) {
          const configData = await configRes.json();
          // Extract new msToken from response header
          const newToken = configRes.headers.get("x-ms-token");
          if (newToken) msToken = newToken;

          // Look up tag code from hot_word_tag_list
          const tagList =
            configData.hot_word_tag_list || configData.tag_list || [];
          const found = tagList.find(
            (t) => t.name === tagName
          );
          if (found) {
            tagCode = found.code;
          } else if (tagName !== "全部") {
            // tag not found — will still use 0 (all)
          }
        }
      } catch {
        // Config API failed, try without it (will use tagCode=0 and no msToken)
      }

      // Also try to get user_id from user info API
      try {
        const userInfoBaseUrl =
          "https://creator.douyin.com/aweme/v1/creator/pc/user/info/?" +
          buildQuery(deviceInfo);
        let userInfoSignedUrl = userInfoBaseUrl;
        if (msToken) {
          userInfoSignedUrl += "&msToken=" + encodeURIComponent(msToken);
        }
        userInfoSignedUrl = signUrl(userInfoSignedUrl);
        const userRes = await fetch(userInfoSignedUrl, {
          credentials: "include",
        });
        if (userRes.ok) {
          userInfo = await userRes.json();
          if (userInfo && userInfo.user && userInfo.user.uid) {
            userId = userInfo.user.uid;
          }
          const newToken = userRes.headers.get("x-ms-token");
          if (newToken) msToken = newToken;
        }
      } catch {
        // User info API failed, continue without userId
      }

      // Step 2: Build and call the billboard API
      const billboardParams = {
        ...deviceInfo,
        billboard_type: billboard_type,
        billboard_tag: tagCode,
      };

      if (userId) {
        billboardParams.user_id = userId;
      }

      if (includeOrderAndPeriod) {
        billboardParams.order_key = order_key;
        billboardParams.time_filter = time_filter;
      } else if (billboard_type === 2) {
        // Creation hotspots uses hot_search_type
        billboardParams.hot_search_type = 1;
      }

      let billboardBaseUrl =
        "https://creator.douyin.com/web/api/creator/material/center/billboard/?" +
        buildQuery(billboardParams);

      if (msToken) {
        billboardBaseUrl += "&msToken=" + encodeURIComponent(msToken);
      }

      let billboardSignedUrl = billboardBaseUrl;
      billboardSignedUrl = signUrl(billboardSignedUrl);

      const billboardRes = await fetch(billboardSignedUrl, {
        credentials: "include",
      });

      if (!billboardRes.ok) {
        if (billboardRes.status === 403 || billboardRes.status === 401) {
          throw new Error(
            "[AUTH_REQUIRED] Login required. Please log in to creator.douyin.com in your browser first."
          );
        }
        throw new Error(
          `[API_ERROR] Billboard API returned status ${billboardRes.status}`
        );
      }

      const billboardData = await billboardRes.json();

      if (billboardData.status_code !== 0) {
        throw new Error(
          `[API_ERROR] Billboard API returned non-zero status_code: ${billboardData.status_code}, msg: ${billboardData.status_msg || "unknown"}`
        );
      }

      return {
        items: (billboardData.item_list || []).slice(0, limit),
        total: (billboardData.item_list || []).length,
        tag_used: tagCode,
        tag_name: tagName,
        type_used: billboard_type,
      };
    },
    {
      billboard_type,
      tagName,
      order_key,
      time_filter,
      limit,
      includeOrderAndPeriod,
      sdkAccessor,
    }
  );

  // Brief idle gestures after data fetch, as if browsing results.
  await humanScroll();
  await humanPause();
  // Final randomized wait before returning the result.
  await new Promise((r) => setTimeout(r, randBetween(0, 3000)));

  // ===== 5. Process and return =====
  if (!result.items || result.items.length === 0) {
    const err = new Error(
      "[EMPTY_RESULT] No items returned. The category or time range may have no data, or authentication is required."
    );
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Map to clean output
  const items = result.items.map((item, idx) => ({
    rank: idx + 1,
    title: item.title || "",
    author_name: item.author_name || "",
    author_link: item.author_link || "",
    play_count: item.play_count || 0,
    like_count: item.like_count || 0,
    comment_count: item.comment_count || 0,
    share_count: item.share_count || 0,
    hot_score: item.hot_score || 0,
    duration: item.duration || 0,
    key_words: item.key_words || [],
    cover_url:
      (item.cover && item.cover.url_list && item.cover.url_list[0]) || "",
    item_id: item.item_id || "",
  }));

  return {
    items,
    count: items.length,
    total_available: result.total,
  };
};
