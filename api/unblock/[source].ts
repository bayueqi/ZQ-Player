import getNeteaseSongUrl from "../_lib/unblock/netease.js";
import getKuwoSongUrl from "../_lib/unblock/kuwo.js";
import getBodianSongUrl from "../_lib/unblock/bodian.js";
import getGequbaoSongUrl from "../_lib/unblock/gequbao.js";
import type { SongUrlResult } from "../_lib/unblock/types.js";

/** 音源名到处理函数的映射 */
const handlers: Record<string, (value: string) => Promise<SongUrlResult>> = {
  netease: (value) => getNeteaseSongUrl(value),
  kuwo: (value) => getKuwoSongUrl(value),
  bodian: (value) => getBodianSongUrl(value),
  gequbao: (value) => getGequbaoSongUrl(value),
};

/** 统一响应头，允许跨域调用 */
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
};

/**
 * 解锁接口入口，对应路径 /api/unblock/:source
 * 用法与 Electron 主进程版本保持一致：网易云传 id，其余传 keyword
 * @param request 请求对象
 */
export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // 取路径最后一段作为音源名
  const segments = url.pathname.split("/").filter(Boolean);
  const source = segments[segments.length - 1] ?? "";
  const handle = handlers[source];
  if (!handle) {
    return new Response(JSON.stringify({ code: 404, url: null }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }
  const value =
    source === "netease"
      ? (url.searchParams.get("id") ?? "")
      : (url.searchParams.get("keyword") ?? "");
  try {
    const result = await handle(value);
    return new Response(JSON.stringify(result), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    console.error(`❌ 解锁接口异常 [${source}]:`, error);
    return new Response(JSON.stringify({ code: 404, url: null }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }
}
