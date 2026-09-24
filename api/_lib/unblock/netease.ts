import axios from "axios";
import type { SongUrlResult } from "./types";

/**
 * 通过 GD 音乐台获取网易云播放地址
 * @param id 网易云歌曲 ID
 */
const getNeteaseSongUrl = async (id: number | string): Promise<SongUrlResult> => {
  try {
    if (!id) return { code: 404, url: null };
    const result = await axios.get("https://music-api.gdstudio.xyz/api.php", {
      params: { types: "url", id, source: "netease" },
    });
    const songUrl = result.data?.url;
    if (!songUrl) return { code: 404, url: null };
    console.log("🔗 网易云播放地址:", songUrl);
    return { code: 200, url: songUrl };
  } catch (error) {
    console.error("❌ 获取网易云播放地址失败:", error);
    return { code: 404, url: null };
  }
};

export default getNeteaseSongUrl;
