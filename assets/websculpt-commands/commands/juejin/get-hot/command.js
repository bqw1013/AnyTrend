export default async function(params) {
  const limit = parseInt(params.limit, 10);
  const sortType = parseInt(params.sort_type, 10);

  await new Promise(r => setTimeout(r, Math.random() * 1000));

  const body = JSON.stringify({
    id_type: 2,
    client_type: 2608,
    sort_type: sortType,
    cursor: "0",
    limit: limit
  });

  const response = await fetch("https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Agent": "Juejin/Web"
    },
    body: body
  });

  if (!response.ok) {
    const error = new Error(`[NETWORK_ERROR] HTTP ${response.status}: ${response.statusText}`);
    error.code = "NETWORK_ERROR";
    throw error;
  }

  const result = await response.json();

  if (result.err_no !== 0) {
    const error = new Error(`[API_ERROR] ${result.err_msg}`);
    error.code = "API_ERROR";
    throw error;
  }

  const articles = result.data || [];

  const items = articles
    .filter(item => item.item_type === 2)
    .map((item, index) => {
      const info = item.item_info || {};
      const art = info.article_info || {};
      const author = info.author_user_info || {};
      const tags = (info.tags || []).map(t => t.tag_name || "");

      return {
        rank: index + 1,
        title: art.title || "",
        url: `https://juejin.cn/post/${art.article_id || ""}`,
        author: author.user_name || "",
        author_title: author.job_title || "",
        brief: art.brief_content || "",
        tags: tags,
        view_count: art.view_count || 0,
        digg_count: art.digg_count || 0,
        collect_count: art.collect_count || 0,
        comment_count: art.comment_count || 0,
        hot_index: art.hot_index || 0,
        read_time: art.read_time || "",
        cover_image: art.cover_image || ""
      };
    });

  if (items.length === 0) {
    const error = new Error("[EMPTY_RESULT] No articles found in the response");
    error.code = "EMPTY_RESULT";
    throw error;
  }

  return { items, count: items.length };
}
