import { isElectron } from "./env";

/** 音频代理接口路径 */
const AUDIO_PROXY_PATH = "/api/audio";

/**
 * 规整音频播放地址
 * 网页端统一走同源代理，规避 http 混合内容与跨域限制
 * @param url 原始播放地址
 */
export const normalizeAudioUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  // 桌面端与本地资源无需代理
  if (isElectron || /^(blob:|data:|file:)/i.test(url)) return url;
  // 已是代理地址则不重复包装
  if (url.startsWith(AUDIO_PROXY_PATH)) return url;
  return `${AUDIO_PROXY_PATH}?url=${encodeURIComponent(url)}`;
};
