import { app } from "electron";
import { createRequire } from "module";
import path from "path";
import { processLog } from "../logger";

const requireNative = createRequire(import.meta.url);

/**
 * 加载一个原生插件
 * @param fileName 编译后的文件名 (例如: "external-media-integration.node")
 * @param devDirName 开发环境下的目录名 (例如: "external-media-integration")，必须位于项目根目录的 native/ 下
 */
export function loadNativeModule(fileName: string, devDirName: string) {
  // 兼容两种落盘结构，逐个尝试，直到加载成功：
  // 1) 扁平结构：resources/native/<fileName>（打包配置 extraResources 平铺后的结果）
  // 2) 带模块子目录：resources/native/<devDirName>/<fileName>
  // 3) 开发模式：process.cwd()/native/<devDirName>/<fileName>
  const candidates: string[] = [];

  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "native", fileName));
    candidates.push(path.join(process.resourcesPath, "native", devDirName, fileName));
  } else {
    // 适配 tools 模块的路径结构 (native/tools/tools.node)
    // 其他模块可能是 (native/xxx/xxx.node) 或者 (native/xxx/index.node)
    candidates.push(path.join(process.cwd(), "native", devDirName, fileName));
  }

  for (const nativeModulePath of candidates) {
    try {
      return requireNative(nativeModulePath);
    } catch (error) {
      processLog.warn(`[NativeLoader] 尝试加载 ${nativeModulePath} 失败:`, error);
    }
  }

  processLog.error(`[NativeLoader] 加载 ${fileName} 失败：所有候选路径均未命中`);
  return null;
}
