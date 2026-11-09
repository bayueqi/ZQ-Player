import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { encryptQuery } from "../electron/server/unblock/kwDES.js";

const PORT = Number(process.env.UNBLOCK_PORT || 3081);
const GD_MUSIC_API = "https://music-api.gdstudio.xyz/api.php";
const KW_PACKAGE = "kwplayer_ar_5.1.0.0_B_jiakong_vh.apk";

const deviceId = String(Math.floor(Math.random() * 100000000001));

const sendJson = (res, body, status = 200) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
};

const fetchText = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
};

const fetchJson = async (url, init) => {
  const text = await fetchText(url, init);
  return JSON.parse(text);
};

// 网易云：经由 GD 音乐台取云盘地址
const neteaseSongUrl = async (id) => {
  if (!id) return { code: 404, url: null };
  const data = await fetchJson(`${GD_MUSIC_API}?types=url&id=${encodeURIComponent(id)}`);
  console.log("🔗 NeteaseSongUrl:", data.url);
  return data.url ? { code: 200, url: data.url } : { code: 404, url: null };
};

// 酷我：搜索歌曲 ID 后换取播放地址
const kuwoSongUrl = async (keyword) => {
  if (!keyword) return { code: 404, url: null };
  const searchUrl =
    "http://search.kuwo.cn/r.s?&correct=1&stype=comprehensive&encoding=utf8&rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all=" +
    encodeURI(keyword);
  const search = await fetchJson(searchUrl);
  const list = search?.content?.[1]?.musicpage?.abslist;
  if (!list || list.length < 1) return { code: 404, url: null };

  const songName = list[0]?.SONGNAME;
  const originalName = keyword.split("-");
  if (songName && !songName.includes(originalName[0])) return { code: 404, url: null };

  const songId = String(list[0].MUSICRID).slice("MUSIC_".length);
  const query = encryptQuery(
    `corp=kuwo&source=${KW_PACKAGE}&p2p=1&type=convert_url2&sig=0&format=mp3&rid=${songId}`,
  );
  const text = await fetchText(`http://mobi.kuwo.cn/mobi.s?f=kuwo&q=${query}`, {
    headers: { "user-agent": "okhttp/3.10.0" },
  });
  const matched = text.match(/http[^\s$"]+/);
  if (!matched) return { code: 404, url: null };
  console.log("🔗 KuwoSongUrl:", matched[0]);
  return { code: 200, url: matched[0] };
};

// 波点：搜索 ID、签名取地址，请求前先领一次广告免费额度
const bodianSign = (raw) => {
  const url = new URL(raw);
  const signed = `${raw}&timestamp=${Date.now()}`;
  const chars = signed
    .substring(signed.indexOf("?") + 1)
    .replace(/[^a-zA-Z0-9]/g, "")
    .split("")
    .sort()
    .join("");
  const md5 = createHash("md5").update(`kuwotest${chars}${url.pathname}`).digest("hex");
  return `${signed}&sign=${md5}`;
};

const bodianHeaders = () => ({
  "user-agent": "Dart/2.19 (dart:io)",
  plat: "ar",
  channel: "aliopen",
  devid: deviceId,
  ver: "3.9.0",
  host: "bd-api.kuwo.cn",
});

const bodianSongUrl = async (keyword) => {
  if (!keyword) return { code: 404, url: null };
  const searchUrl =
    "http://search.kuwo.cn/r.s?&correct=1&vipver=1&stype=comprehensive&encoding=utf8" +
    "&rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all=" +
    encodeURIComponent(keyword.replace(" - ", " "));
  const search = await fetchJson(searchUrl);
  const list = search?.content?.[1]?.musicpage?.abslist;
  if (!list || list.length < 1) return { code: 404, url: null };
  const songId = String(list[0].MUSICRID).split("_").pop();
  if (!songId) return { code: 404, url: null };

  await fetch("http://bd-api.kuwo.cn/api/service/advert/watch?uid=-1&token=&timestamp=1724306124436&sign=15a676d66285117ad714e8c8371691da", {
    method: "POST",
    headers: {
      ...bodianHeaders(),
      qimei36: "1e9970cbcdc20a031dee9f37100017e1840e",
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ type: 5, subType: 5, musicId: 0, adToken: "" }),
  }).catch(() => null);

  const audioUrl = bodianSign(`http://bd-api.kuwo.cn/api/play/music/v2/audioUrl?&br=320kmp3&musicId=${songId}`);
  const data = await fetchJson(audioUrl, {
    headers: { ...bodianHeaders(), "X-Forwarded-For": "1.0.1.114" },
  });
  const url = data?.data?.audioUrl;
  if (!url) return { code: 404, url: null };
  console.log("🔗 BodianSongUrl:", url);
  return { code: 200, url };
};

// 歌曲宝：搜索页取 ID、详情页取 play_id，再换播放地址
const gequbaoSongUrl = async (keyword) => {
  if (!keyword) return { code: 404, url: null };

  const searchPage = await fetchText(`https://www.gequbao.com/s/${encodeURIComponent(keyword)}`);
  const id = searchPage.match(/href="\/music\/(\d+)"/)?.[1];
  if (!id) return { code: 404, url: null };

  const detailPage = await fetchText(`https://www.gequbao.com/music/${id}`);
  const playId =
    detailPage.match(/"play_id":"(.*?)"/)?.[1] ??
    detailPage.match(/\\u0022play_id\\u0022:\\u0022(.*?)\\u0022/)?.[1];
  if (!playId) return { code: 404, url: null };

  const data = await fetchJson("https://www.gequbao.com/member/common-play-url", {
    method: "POST",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "zh-CN,zh;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      cookie: `server_name_session=${randomBytes(16).toString("hex")}`,
      referer: `https://www.gequbao.com/music/${id}`,
    },
    body: `id=${encodeURIComponent(playId)}&purpose=play`,
  });
  const url = data?.code === 1 ? data?.data?.url : null;
  if (!url) return { code: 404, url: null };
  console.log("🔗 GequbaoSongUrl:", url);
  return { code: 200, url };
};

const handlers = {
  netease: (params) => neteaseSongUrl(params.get("id")),
  kuwo: (params) => kuwoSongUrl(params.get("keyword")),
  bodian: (params) => bodianSongUrl(params.get("keyword")),
  gequbao: (params) => gequbaoSongUrl(params.get("keyword")),
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/unblock" || url.pathname === "/api/unblock/") {
    return sendJson(res, { name: "UnblockAPI", sources: Object.keys(handlers) });
  }

  const source = url.pathname.replace(/^\/api\/unblock\/?/, "").replace(/\/$/, "");
  const handler = handlers[source];
  if (!handler) return sendJson(res, { code: 404, url: null }, 404);

  try {
    sendJson(res, await handler(url.searchParams));
  } catch (error) {
    console.error(`❌ 解锁接口异常 [${source}]:`, error);
    sendJson(res, { code: 404, url: null });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`🌐 UnblockAPI listening on 127.0.0.1:${PORT}`);
});
