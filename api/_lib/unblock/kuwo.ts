import axios from "axios";
import { encryptQuery } from "./kwDES.js";
import type { SongUrlResult } from "./types";

/** 需要排除的版本关键词，避免取到伴奏/翻唱 */
const EXCLUDE_WORDS = ["伴奏", "KTV", "翻唱", "cover", "remix", "纯音乐"];

/**
 * 搜索酷我歌曲 ID
 * @param keyword 搜索关键词，格式为「歌名-歌手」
 */
const getKuwoSongId = async (keyword: string): Promise<string | null> => {
  try {
    const url =
      "http://search.kuwo.cn/r.s?&correct=1&stype=comprehensive&encoding=utf8&rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all=" +
      keyword;
    const result = await axios.get(url);
    const list = result.data?.content?.[1]?.musicpage?.abslist;
    if (!Array.isArray(list) || list.length < 1) {
      return null;
    }
    // 原曲名，用于校验搜索结果是否吻合
    const originalName = keyword?.split("-")?.[0] ?? keyword;
    // 先剔除伴奏、翻唱等版本
    const candidates = list.filter(
      (item: any) =>
        item?.SONGNAME?.includes(originalName) &&
        !EXCLUDE_WORDS.some((word) => item?.SONGNAME?.includes(word)),
    );
    // 依次偏好：完全同名 > 同名前缀里名称最短的 > 首个非伴奏 > 原始首个
    const picked =
      candidates.find((item: any) => item.SONGNAME.trim() === originalName) ??
      candidates
        .filter((item: any) => item.SONGNAME.trim().startsWith(originalName))
        .sort((a: any, b: any) => a.SONGNAME.length - b.SONGNAME.length)[0] ??
      candidates[0] ??
      list[0];
    if (!picked?.MUSICRID) return null;
    return String(picked.MUSICRID).slice("MUSIC_".length);
  } catch (error) {
    console.error("❌ 获取酷我歌曲 ID 失败:", error);
    return null;
  }
};

/**
 * 获取酷我音乐播放地址
 * @param keyword 搜索关键词
 */
const getKuwoSongUrl = async (keyword: string): Promise<SongUrlResult> => {
  try {
    if (!keyword) return { code: 404, url: null };
    const songId = await getKuwoSongId(keyword);
    if (!songId) return { code: 404, url: null };
    const PackageName = "kwplayer_ar_5.1.0.0_B_jiakong_vh.apk";
    const url =
      "http://mobi.kuwo.cn/mobi.s?f=kuwo&q=" +
      encryptQuery(
        `corp=kuwo&source=${PackageName}&p2p=1&type=convert_url2&sig=0&format=mp3` + "&rid=" + songId,
      );
    const result = await axios.get(url, {
      headers: { "User-Agent": "okhttp/3.10.0" },
    });
    if (result.data) {
      const urlMatch = String(result.data).match(/http[^\s$"]+/)?.[0];
      if (urlMatch) {
        console.log("🔗 酷我播放地址:", urlMatch);
        return { code: 200, url: urlMatch };
      }
    }
    return { code: 404, url: null };
  } catch (error) {
    console.error("❌ 获取酷我播放地址失败:", error);
    return { code: 404, url: null };
  }
};

export default getKuwoSongUrl;
