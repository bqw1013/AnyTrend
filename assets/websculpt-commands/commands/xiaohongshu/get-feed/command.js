export default async (page, params) => {
  // ===== 1. Parameter parsing =====
  const category = params.category || "推荐";
  const limit = parseInt(params.limit) || 20;

  // ===== 2. Channel ID mapping =====
  const CHANNEL_MAP = {
    "推荐": "homefeed_recommend",
    "穿搭": "homefeed.fashion_v3",
    "美食": "homefeed.food_v3",
    "彩妆": "homefeed.cosmetics_v3",
    "影视": "homefeed.movie_and_tv_v3",
    "职场": "homefeed.career_v3",
    "情感": "homefeed.emotion_v3",
    "家居": "homefeed.home_v3",
    "游戏": "homefeed.game_v3",
    "旅行": "homefeed.travel_v3",
    "健身": "homefeed.fitness_v3"
  };

  const channelId = CHANNEL_MAP[category];
  if (!channelId) {
    const err = new Error(
      `[INVALID_PARAM] Unknown category "${category}". Valid values: ${Object.keys(CHANNEL_MAP).join(", ")}`
    );
    err.code = "INVALID_PARAM";
    throw err;
  }

  // ===== Helper: extract notes from SSR state =====
  const extractNotes = () => page.evaluate(() => {
    const scripts = document.querySelectorAll("script");
    let jsonText = "";
    for (let i = 0; i < scripts.length; i++) {
      const text = scripts[i].textContent || "";
      if (text.indexOf("window.__INITIAL_STATE__=") !== -1) {
        jsonText = text.replace("window.__INITIAL_STATE__=", "");
        break;
      }
    }
    if (!jsonText) return null;

    const data = (0, eval)("(" + jsonText + ")");
    const feedsObj = data.feed?.feeds || {};
    const keys = Object.keys(feedsObj);
    const notes = [];

    for (let k = 0; k < keys.length; k++) {
      const item = feedsObj[keys[k]];
      if (!item || !item.noteCard) continue;
      const nc = item.noteCard;

      const xsec = item.xsecToken || "";
      notes.push({
        note_id: item.id || "",
        xsec_token: xsec,
        title: nc.displayTitle || nc.display_title || "",
        type: nc.type || "normal",
        author: {
          nickname: nc.user?.nickName || nc.user?.nickname || "",
          user_id: nc.user?.userId || nc.user?.user_id || "",
          avatar: nc.user?.avatar || ""
        },
        likes: nc.interactInfo?.likedCount || nc.interact_info?.liked_count || "0",
        cover: {
          url: nc.cover?.urlDefault || nc.cover?.url_default || "",
          width: nc.cover?.width || 0,
          height: nc.cover?.height || 0
        },
        duration: nc.video?.capa?.duration || 0,
        note_url: item.id
          ? `https://www.xiaohongshu.com/explore/${item.id}?xsec_token=${encodeURIComponent(xsec)}&xsec_source=pc_feed`
          : ""
      });
    }

    return { notes, total: notes.length };
  });

  // ===== 3. Human-like: small random mouse move =====
  try {
    const vw = page.viewportSize();
    if (vw) {
      const mx = Math.floor(Math.random() * vw.width * 0.6 + vw.width * 0.2);
      const my = Math.floor(Math.random() * vw.height * 0.4 + vw.height * 0.1);
      await page.mouse.move(mx, my, { steps: 3 + Math.floor(Math.random() * 5) });
    }
  } catch {
    // Non-critical, continue
  }

  // ===== 4. Navigate to explore page with channel =====
  const targetUrl = `https://www.xiaohongshu.com/explore?channel_id=${encodeURIComponent(channelId)}`;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  // ===== 5. Wait for SSR data =====
  await page.waitForFunction(
    () => {
      const scripts = document.querySelectorAll("script");
      for (let i = 0; i < scripts.length; i++) {
        if ((scripts[i].textContent || "").indexOf("window.__INITIAL_STATE__=") !== -1) {
          return true;
        }
      }
      return false;
    },
    { timeout: 15000 }
  );

  // Small human-like pause after page load
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

  // Additional small mouse move after page load
  try {
    const vw2 = page.viewportSize();
    if (vw2) {
      const mx2 = Math.floor(Math.random() * vw2.width * 0.5 + vw2.width * 0.25);
      const my2 = Math.floor(Math.random() * vw2.height * 0.4 + vw2.height * 0.2);
      await page.mouse.move(mx2, my2, { steps: 2 + Math.floor(Math.random() * 3) });
    }
  } catch {
    // Non-critical, continue
  }

  // ===== 6. Extract initial SSR feed =====
  let result = await extractNotes();

  if (!result) {
    const err = new Error(
      "[DRIFT_DETECTED] Could not find __INITIAL_STATE__ script tag. Page structure may have changed."
    );
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  if (result.total === 0) {
    const err = new Error(
      "[EMPTY_RESULT] No notes found in feed. The channel may be empty, or login is required."
    );
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // ===== 7. Proportionate smooth scroll to trigger lazy-load =====
  let scrollSteps;
  if (limit <= 3) {
    scrollSteps = Math.random() < 0.5 ? 0 : 1;
  } else if (limit <= 6) {
    scrollSteps = 1 + Math.floor(Math.random() * 2);
  } else if (limit <= 12) {
    scrollSteps = 2 + Math.floor(Math.random() * 2);
  } else if (limit <= 20) {
    scrollSteps = 3 + Math.floor(Math.random() * 3);
  } else {
    scrollSteps = 4 + Math.floor(Math.random() * 4);
  }

  if (scrollSteps > 0) {
    const currentY = await page.evaluate(() => window.scrollY);
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const maxScrollRatio = limit <= 3 ? 0.25 : limit <= 10 ? 0.5 : limit <= 20 ? 0.7 : 0.85;
    const scrollRange = pageHeight * maxScrollRatio;

    for (let s = 1; s <= scrollSteps; s++) {
      await new Promise(r => setTimeout(r, 100 + Math.random() * 400));

      const targetY = currentY + (scrollRange / scrollSteps) * s;
      await page.evaluate(
        ({ target, steps }) => {
          return new Promise(resolve => {
            let step = 0;
            const startY = window.scrollY;
            function tick() {
              step++;
              const progress = step / steps;
              const ease =
                progress < 0.5
                  ? 2 * progress * progress
                  : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              window.scrollTo(0, startY + (target - startY) * ease);
              if (step >= steps) {
                setTimeout(resolve, 50);
                return;
              }
              setTimeout(tick, 80 + Math.random() * 150);
            }
            tick();
          });
        },
        { target: targetY, steps: 2 + Math.floor(Math.random() * 3) }
      );
    }

    // Wait for lazy-load API calls to complete
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
  }

  // ===== 8. Re-extract after scrolling (may have loaded more) =====
  const refreshed = await extractNotes();

  if (refreshed && refreshed.total > result.total) {
    result = refreshed;
  }

  // ===== 9. Proportionate delay before returning =====
  const endDelay = limit <= 3
    ? 400 + Math.random() * 600
    : limit <= 10
    ? 600 + Math.random() * 1000
    : 800 + Math.random() * 2200;
  await new Promise(r => setTimeout(r, endDelay));

  // ===== 10. Return =====
  return {
    channel: category,
    channel_id: channelId,
    notes: result.notes.slice(0, limit).map((note, idx) => ({
      ...note,
      rank: idx + 1
    })),
    count: Math.min(limit, result.notes.length),
    total_available: result.total
  };
};
