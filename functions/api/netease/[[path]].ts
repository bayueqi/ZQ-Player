/**
 * 网易云 API 反代（Cloudflare Pages Function）
 *
 * 前端固定请求同源的 /api/netease/*，这里转发到外部 API 地址，
 * 真实地址只在 Pages 环境变量里，浏览器看不到，也不存在跨域问题。
 * 运行时变量：NETEASE_API = https://你的网易云API地址（结尾不加 /）
 */

/** 不转发给上游的请求头 */
const SKIP_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "cookie",
  "origin",
  "referer",
]);

type Ctx = { request: Request; env: Record<string, string | undefined> };

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const base = (env.NETEASE_API || "").replace(/\/+$/, "");
  if (!base) return new Response("未配置 NETEASE_API 环境变量", { status: 500 });

  const url = new URL(request.url);
  const rest = url.pathname.replace(/^\/api\/netease/, "");
  const target = base + (rest || "/") + url.search;

  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (!SKIP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }

  const init: RequestInit = { method: request.method, headers, redirect: "follow" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    // 接口结果不缓存，避免登录态/歌单串号
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error("❌ 接口代理失败:", target, error);
    return new Response("接口代理失败", { status: 502 });
  }
};
