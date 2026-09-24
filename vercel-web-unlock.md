# Vercel 网页版：音乐解锁接入说明

## 一、为什么桌面端能放，Vercel 不能

桌面端能放歌，是因为它把浏览器的两道安全检查关掉了：

- `electron/main/windows/index.ts:24` → `webSecurity: false`
- `electron/main/windows/index.ts:26` → `allowRunningInsecureContent: true`

Vercel 是正经网页，这两道检查一定生效，而实测音源给的地址恰好同时踩中两个雷：

1. 地址是 `http://`，页面是 `https://` → 浏览器拒收（混合内容拦截）
2. 音源响应不带跨域许可，而播放器强制要求（`AudioElementPlayer.ts:37` 的 `crossOrigin="anonymous"`）→ 再拦一次

## 二、这次改了什么

**让 Vercel 自己当"二传手"，并解开网页端的锁。**

| 改动 | 文件 |
| --- | --- |
| 新增解锁接口（向国内音源要地址） | `api/unblock/[source].ts` + `api/_lib/unblock/*` |
| 新增音频同源代理（把音频转发回来） | `api/audio.ts` |
| 新增地址规整工具，网页端自动走代理 | `src/utils/audioUrl.ts` |
| 解开"只有桌面端能解锁"的写死限制 | `src/core/player/SongManager.ts`（4 处） |
| 设置里「音乐解锁」对网页端显示 | `src/components/Setting/config/play.ts` |
| 函数配置（香港节点、60 秒上限） | `vercel.json` |

前端调用路径没变：解锁仍是 `/api/unblock/音源名`，在 Vercel 上会命中新函数。

## 三、你必须做的一步（不做则不生效）

到 Vercel 项目 → **Settings → Environment Variables**，添加：

| 名称 | 值 |
| --- | --- |
| `VITE_API_URL` | 你的网易云 API 地址，公网可访问，**结尾不要加 /** |

例如 `https://api.你的域名.com`。

⚠️ **不能填 `/api/netease`** —— 那是本地 Docker 用的相对路径，Vercel 上没有对应的服务，填了会全部 404。

⚠️ **填完必须重新部署** —— 这个变量只在构建时读取，改完不重新部署不生效。

## 四、出问题怎么自查

打开 Vercel 站点 → F12 → Network，搜 `song/url`：

| 现象 | 原因 |
| --- | --- |
| URL 里出现 `/undefined/` | `VITE_API_URL` 没配 |
| `/api/unblock/kuwo` 返回 404 | 函数没部署成功 |
| 取到地址但播不出声 | 音频代理没生效，或音源地址已过期 |

## 五、音源现状（2026-09-24 本机实测）

| 音源 | 状态 | 说明 |
| --- | --- | --- |
| 波点 `bodian` | ✅ 可用 | 实测精确匹配到《晴天》，推荐优先 |
| 酷我 `kuwo` | ✅ 可用 | 可取址，但搜索排序差，可能匹配到翻唱或串烧 |
| 歌曲宝 `gequbao` | ⚠️ 部分可用 | 搜索与 play_id 已修好，但换链接口改版，暂取不到地址 |
| 网易云 `netease`（GD音乐台） | ❌ 不可用 | 接口返回空 url，疑似失效 |

默认启用顺序是 波点 → 歌曲宝 → 网易云。**建议在设置里调整为 波点 → 酷我**（另两个暂不可用）。

## 六、已知限制（务必知情）

1. **Vercel 条款**：明确禁止把 Serverless 函数当作大流量代理或流媒体中转，音频代理正属此列。
2. **流量**：免费版 100GB/月，无损单曲约 30MB，正常听歌容易超。
3. **节点位置**：Vercel 函数在海外，拉国内 CDN 慢，首次缓冲会比较明显。
4. **函数时长**：单次最长 60 秒，因此代理做成了 2MB 一段的续传，长歌不会被一次掐断。

如果以上限制难以接受，可改用「前端留 Vercel + 后端放国内服务器」的方案：不碰条款、音频不走 Vercel 流量、国内拉国内 CDN 快，改动量更少。

## 七、想反悔怎么办

删掉 `api/` 目录，并把 `src/core/player/SongManager.ts`、`src/components/Setting/config/play.ts`、`src/utils/audioUrl.ts`、`vercel.json` 的改动还原即可，桌面端行为不受影响。
