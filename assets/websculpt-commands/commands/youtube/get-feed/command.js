export default async (page, params) => {
  const limit = parseInt(params.limit, 10) || 20;
  const tab = params.tab || "全部";

  // Human-like interaction helpers
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = (base, variance) => base + Math.floor(Math.random() * variance);

  const humanMove = async () => {
    try {
      const size = page.viewportSize() || { width: 1280, height: 720 };
      const x = Math.floor(size.width * 0.2 + Math.random() * size.width * 0.6);
      const y = Math.floor(size.height * 0.2 + Math.random() * size.height * 0.6);
      await page.mouse.move(x, y, { steps: 3 + Math.floor(Math.random() * 3) });
    } catch {
      // Ignore mouse move errors
    }
  };

  const humanScroll = async () => {
    try {
      await page.evaluate(() => {
        window.scrollBy({ top: 200 + Math.floor(Math.random() * 300), behavior: "smooth" });
      });
      await sleep(jitter(600, 600));
    } catch {
      // Ignore scroll errors
    }
  };

  // Navigate to YouTube homepage
  await page.goto("https://www.youtube.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Small random pause and mouse move after page load
  await sleep(jitter(200, 400));
  await humanMove();

  // If a non-default tab is requested, click it
  if (tab !== "全部") {
    try {
      const tabClicked = await page.evaluate((targetTab) => {
        const tabButtons = document.querySelectorAll('[role="tab"]');
        for (const btn of tabButtons) {
          if (btn.textContent?.trim() === targetTab) {
            btn.click();
            return true;
          }
        }
        return false;
      }, tab);

      if (tabClicked) {
        await sleep(jitter(1500, 1500));
        await humanMove();
      }
    } catch {
      // If tab click fails, continue with default content
    }
  }

  // Wait for ytInitialData to be available
  try {
    await page.waitForFunction(
      () => typeof window.ytInitialData === "object" && window.ytInitialData !== null,
      { timeout: 15000 }
    );
  } catch {
    // ytInitialData not available, will fall back to DOM
  }

  // Smooth scroll to mimic human browsing before extraction
  await humanScroll();

  // Extract video data from ytInitialData (supports both lockupViewModel and legacy videoRenderer)
  const videos = await page.evaluate(() => {
    const data = window.ytInitialData;
    if (!data) return [];

    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!tabs?.length) return [];

    const contents = tabs[0]?.tabRenderer?.content?.richGridRenderer?.contents;
    if (!contents?.length) return [];

    const results = [];
    for (const item of contents) {
      const renderer = item?.richItemRenderer?.content;
      if (!renderer) continue;

      // New format: lockupViewModel
      const lvm = renderer.lockupViewModel;
      if (lvm?.contentId) {
        const metadataRows = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
        const row0Parts = metadataRows?.[0]?.metadataParts;
        const row1Parts = metadataRows?.[1]?.metadataParts;
        const overlays = lvm.contentImage?.thumbnailViewModel?.overlays;

        let duration = "";
        if (overlays) {
          for (const overlay of overlays) {
            const badges = overlay?.thumbnailBottomOverlayViewModel?.badges;
            if (badges) {
              for (const badge of badges) {
                if (badge?.thumbnailBadgeViewModel?.text) {
                  duration = badge.thumbnailBadgeViewModel.text;
                  break;
                }
              }
            }
            if (duration) break;
          }
        }

        results.push({
          videoId: lvm.contentId,
          title: lvm.metadata?.lockupMetadataViewModel?.title?.content || "",
          channel: row0Parts?.[0]?.text?.content || "",
          channelUrl: row0Parts?.[0]?.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl || "",
          views: row1Parts?.[0]?.text?.content || "",
          publishedTime: row1Parts?.[1]?.text?.content || "",
          duration,
        });
        continue;
      }

      // Legacy format: videoRenderer
      const vr = renderer.videoRenderer;
      if (vr?.videoId) {
        results.push({
          videoId: vr.videoId,
          title: vr.title?.runs?.[0]?.text || "",
          channel: vr.ownerText?.runs?.[0]?.text || "",
          channelUrl: vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || "",
          views: vr.viewCountText?.simpleText || "",
          publishedTime: vr.publishedTimeText?.simpleText || "",
          duration: vr.lengthText?.simpleText || "",
        });
      }
    }
    return results;
  });

  // Fallback to DOM extraction if ytInitialData approach fails
  if (!videos.length) {
    const domVideos = await page.evaluate(() => {
      const items = document.querySelectorAll("ytd-rich-item-renderer");
      const results = [];

      for (const item of items) {
        if (item.querySelector("ytd-display-ad-renderer, ytd-ad-slot-renderer")) continue;

        const titleEl = item.querySelector("#video-title-link, a.ytd-rich-grid-video-renderer");
        const title = titleEl?.textContent?.trim() || "";
        const href = titleEl?.getAttribute("href") || "";
        const videoIdMatch = href.match(/watch\?v=([^&]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "";

        const channelEl = item.querySelector("ytd-channel-name yt-formatted-string a, ytd-channel-name a");
        const channel = channelEl?.textContent?.trim() || "";
        const channelUrl = channelEl?.getAttribute("href") || "";

        const metaEls = item.querySelectorAll("ytd-video-meta-block span");
        let views = "";
        let publishedTime = "";
        for (const el of metaEls) {
          const text = el.textContent?.trim() || "";
          if (!text || text === "•") continue;
          if (text.includes("次观看") || text.includes("view") || text.includes("万")) {
            if (!views) views = text;
          } else if (!publishedTime) {
            publishedTime = text;
          }
        }

        const durationEl = item.querySelector("ytd-thumbnail-overlay-time-status-renderer span, ytd-thumbnail-overlay-time-status-renderer");
        const duration = durationEl?.textContent?.trim() || "";

        if (!videoId && !title) continue;
        results.push({ videoId, title, channel, channelUrl, views, publishedTime, duration });
      }
      return results;
    });
    videos.push(...domVideos);
  }

  if (!videos.length) {
    const err = new Error("[EMPTY_RESULT] No video content found on YouTube homepage");
    err.code = "EMPTY_RESULT";
    throw err;
  }

  // Apply limit and add rank + videoUrl
  const result = videos.slice(0, limit).map((v, i) => ({
    rank: i + 1,
    ...v,
    videoUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
  }));

  // Final random wait before returning results
  await sleep(jitter(0, 3000));

  return { items: result, count: result.length };
};
