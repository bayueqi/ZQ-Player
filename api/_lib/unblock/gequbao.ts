import axios from "axios";
import { randomBytes } from "crypto";
import type { SongUrlResult } from "./types";

/**
 * 搜索歌曲获取 ID
 * @param keyword 搜索关键词
 */
const search = async (keyword: string): Promise<string | null> => {
  try {
    const searchUrl = `https://www.gequbao.com/s/${encodeURIComponent(keyword)}`;
    const { data } = await axios.get(searchUrl);
    // 匹配歌曲卡片链接，形如 <a href="/music/4188" class="hover-zoom ..." title="晴天 - 周杰伦">
    const match = String(data).match(/<a\s+href="\/music\/(\d+)"[^>]*title="([^"]*)"/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error("❌ 获取歌曲宝歌曲 ID 失败:", error);
    return null;
  }
};

/**
 * 获取播放 ID
 * @param id 歌曲 ID
 */
const getPlayId = async (id: string): Promise<string | null> => {
  try {
    const url = `https://www.gequbao.com/music/${id}`;
    const { data } = await axios.get(url);
    // 页面把引号转义成了 \u0022，先还原再匹配 window.appData 中的 play_id
    const normalized = String(data).replace(/\\u0022/g, '"');
    const match = normalized.match(/"play_id":"(.*?)"/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error("❌ 获取歌曲宝播放 ID 失败:", error);
    return null;
  }
};

/**
 * 获取歌曲宝播放地址
 * @param keyword 搜索关键词
 */
const getGequbaoSongUrl = async (keyword: string): Promise<SongUrlResult> => {
  try {
    if (!keyword) return { code: 404, url: null };
    // 1. 获取歌曲 ID
    const id = await search(keyword);
    if (!id) return { code: 404, url: null };
    // 2. 获取 play_id
    const playId = await getPlayId(id);
    if (!playId) return { code: 404, url: null };
    // 3. 换取真实播放链接
    const url = "https://www.gequbao.com/api/play-url";
    const headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      cookie: `server_name_session=${randomBytes(16).toString("hex")}`,
      Referer: `https://www.gequbao.com/music/${id}`,
    };
    const { data } = await axios.get(`${url}?id=${encodeURIComponent(playId)}`, { headers });
    if (data.code === 1 && data.data && data.data.url) {
      console.log("🔗 歌曲宝播放地址:", data.data.url);
      return { code: 200, url: data.data.url };
    }
    return { code: 404, url: null };
  } catch (error) {
    console.error("❌ 获取歌曲宝播放地址失败:", error);
    return { code: 404, url: null };
  }
};

export default getGequbaoSongUrl;
