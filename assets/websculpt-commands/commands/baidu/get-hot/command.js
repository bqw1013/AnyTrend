const VALID_TABS = ["realtime", "homepage", "novel", "movie", "teleplay"];
const TAG_MAP = {
  "0": "",
  "1": "新",
  "3": "热",
};

export default async function (params) {
  const tab = params.tab;
  const limit = parseInt(params.limit, 10);

  if (!VALID_TABS.includes(tab)) {
    const err = new Error(`[INVALID_PARAM] tab must be one of ${VALID_TABS.join(", ")}, got "${tab}"`);
    err.code = "INVALID_PARAM";
    throw err;
  }

  const url = `https://top.baidu.com/api/board?tab=${encodeURIComponent(tab)}`;

  await new Promise(r => setTimeout(r, Math.random() * 1000));

  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
      },
    });
  } catch (e) {
    const err = new Error(`[NETWORK_ERROR] Failed to fetch Baidu hot list: ${e.message}`);
    err.code = "NETWORK_ERROR";
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`[API_ERROR] Baidu API returned ${res.status} ${res.statusText}`);
    err.code = "API_ERROR";
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    const err = new Error(`[PARSE_ERROR] Failed to parse API response: ${e.message}`);
    err.code = "PARSE_ERROR";
    throw err;
  }

  if (!data || data.success !== true) {
    const err = new Error(`[API_ERROR] Baidu API returned success=false or invalid structure`);
    err.code = "API_ERROR";
    throw err;
  }

  const cards = data.data?.cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    const err = new Error(`[DRIFT_DETECTED] API response missing cards array; structure may have changed`);
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  const content = cards[0]?.content;
  if (!Array.isArray(content)) {
    const err = new Error(`[DRIFT_DETECTED] API response missing content array; structure may have changed`);
    err.code = "DRIFT_DETECTED";
    throw err;
  }

  const items = content.slice(0, limit).map((item) => ({
    rank: (item.index ?? 0) + 1,
    title: item.word ?? "",
    heatIndex: item.hotScore ?? "",
    description: item.desc ?? "",
    tag: TAG_MAP[item.hotTag] ?? "",
    tagImg: item.hotTagImg ?? "",
    image: item.img ?? "",
    url: item.url ?? item.rawUrl ?? item.appUrl ?? "",
    trend: item.hotChange ?? "same",
  }));

  return {
    tab,
    total: content.length,
    count: items.length,
    items,
  };
}
