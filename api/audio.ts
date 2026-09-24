/** 需要原样转发给浏览器的响应头 */
const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
  "cache-control",
];

/** 单次返回的最大字节数（2MB），避免长时间占用函数触发超时 */
const MAX_CHUNK = 2 * 1024 * 1024;

/** 解析 Range 请求头，返回起始位置与结束位置 */
const parseRange = (rangeHeader: string | null): { start: number; end: number | null } => {
  if (!rangeHeader) return { start: 0, end: null };
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) return { start: 0, end: null };
  return {
    start: match[1] ? Number(match[1]) : 0,
    end: match[2] ? Number(match[2]) : null,
  };
};

/**
 * 音频同源代理
 *
 * 音源返回的播放地址多为 http 协议且不带 CORS 头，
 * https 页面直接加载会被混合内容与跨域策略拦截，故统一经由本接口转发。
 * 用法：/api/audio?url=<encodeURIComponent(原始地址)>
 * @param request 请求对象
 */
export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  if (!target) {
    return new Response("缺少 url 参数", { status: 400 });
  }
  if (!/^https?:\/\//i.test(target)) {
    return new Response("仅支持 http/https 地址", { status: 400 });
  }

  // 计算受限的 Range，让单次请求只取一小段，浏览器会自动续取下一段
  const { start, end } = parseRange(request.headers.get("range"));
  const limitedEnd = end !== null && end - start + 1 <= MAX_CHUNK ? end : start + MAX_CHUNK - 1;

  const headers: Record<string, string> = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    range: `bytes=${start}-${limitedEnd}`,
  };

  try {
    const upstream = await fetch(target, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers,
      redirect: "follow",
    });
    const responseHeaders = new Headers();
    for (const key of PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    // 放开 CORS，配合播放器的 crossOrigin="anonymous"
    responseHeaders.set("access-control-allow-origin", "*");
    responseHeaders.set("access-control-allow-headers", "*");
    responseHeaders.set("access-control-expose-headers", "*");
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("❌ 音频代理失败:", target, error);
    return new Response("音频代理失败", { status: 502 });
  }
}
