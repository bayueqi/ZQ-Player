<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 关于软件 </n-h3>
      <n-card class="set-item">
        <n-flex align="center" class="about">
          <SvgIcon name="ZQ-Player" size="26" />
          <n-text class="logo-name">ZQ-Player</n-text>
          <n-tag v-if="statusStore.isDeveloperMode" size="small" type="warning" round> DEV </n-tag>
          <n-tag size="small" type="primary" round @click="openDeveloperMode">
            {{ packageJson.version }}
          </n-tag>
        </n-flex>
        <n-flex>
          <n-button
            :loading="statusStore.updateCheck"
            type="primary"
            strong
            secondary
            @click="checkUpdate"
          >
            {{ statusStore.updateCheck ? "检查更新中" : "检查更新" }}
          </n-button>
          <n-button v-if="isElectron" type="primary" strong secondary @click="handleOpenLog">
            打开日志
          </n-button>
        </n-flex>
      </n-card>
      <n-collapse-transition :show="!!updateData">
        <n-card class="set-item update-data">
          <n-collapse arrow-placement="right">
            <n-collapse-item name="version">
              <template #header>
                <n-flex class="version">
                  <n-text>最新版本</n-text>
                  <n-tag :bordered="false" size="small" type="primary">
                    {{ newVersion?.version || "v0.0.0" }}
                  </n-tag>
                  <n-tag v-if="newVersion?.prerelease" class="test" size="small" type="warning">
                    测试版
                  </n-tag>
                  <n-text :depth="3" class="time">{{ newVersion?.time }}</n-text>
                </n-flex>
              </template>
              <div class="markdown-body" v-html="newVersion?.changelog" @click="jumpLink" />
            </n-collapse-item>
          </n-collapse>
        </n-card>
      </n-collapse-transition>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 历史版本 </n-h3>
      <n-collapse-transition :show="oldVersion?.length > 0">
        <n-collapse accordion>
          <n-collapse-item
            v-for="(item, index) in oldVersion"
            :key="index"
            :title="item.version"
            :name="item.version"
          >
            <n-card class="set-item update-data">
              <n-flex class="version" justify="space-between">
                <n-tag :bordered="false" size="small" type="primary">
                  {{ item?.version || "v0.0.0" }}
                </n-tag>
                <n-text :depth="3" class="time">{{ item?.time }}</n-text>
              </n-flex>
              <div class="markdown-body" v-html="item?.changelog" @click="jumpLink" />
            </n-card>
          </n-collapse-item>
        </n-collapse>
      </n-collapse-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UpdateLogType } from "@/types/main";
import { getUpdateLog } from "@/utils/helper";
import { debounce } from "lodash-es";
import { useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import packageJson from "@/../package.json";

const statusStore = useStatusStore();

// 打开日志文件
const handleOpenLog = () => {
  window.electron.ipcRenderer.send("open-log-file");
};

// 开发者模式点击次数
const developerModeClickCount = ref(0);

// 更新日志数据
const updateData = ref<UpdateLogType[] | null>(null);

// 最新版本
const newVersion = computed<UpdateLogType | undefined>(() => updateData.value?.[0]);

// 历史版本
const oldVersion = computed<UpdateLogType[]>(() => {
  const oldData = updateData.value?.slice(1);
  return oldData ? oldData : [];
});

// 检查更新
const checkUpdate = debounce(
  () => {
    if (!isElectron) {
      window.open(packageJson.github + "/releases", "_blank");
      return;
    }
    statusStore.updateCheck = true;
    window.electron.ipcRenderer.send("check-update", true);
  },
  300,
  { leading: true, trailing: false },
);

// 链接跳转
const jumpLink = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== "A") {
    return;
  }
  e.preventDefault();
  window.open((target as HTMLAnchorElement).href, "_blank");
};

// 获取更新日志
const getUpdateData = async () => (updateData.value = await getUpdateLog());

// 打开开发者模式
const openDeveloperMode = useThrottleFn(() => {
  developerModeClickCount.value++;
  const isEnabled = statusStore.developerMode;
  if (developerModeClickCount.value >= 5 && developerModeClickCount.value < 8) {
    const action = isEnabled ? "关闭" : "开启";
    window.$message.info(`再点击${8 - developerModeClickCount.value}次以${action}开发者模式`);
  } else if (developerModeClickCount.value >= 8) {
    developerModeClickCount.value = 0;
    statusStore.developerMode = !isEnabled;
    if (!isEnabled) {
      window.$message.warning("开发者模式已开启，请谨慎使用！");
    } else {
      window.$message.success("开发者模式已关闭");
    }
  }
}, 100);

onMounted(() => {
  getUpdateData();
});
</script>

<style lang="scss" scoped>
.about {
  .logo-name {
    font-size: 16px;
  }
  .n-tag {
    border-radius: 6px;
  }
}
.update-data {
  :deep(.n-card__content) {
    flex-direction: column !important;
    align-items: normal !important;
  }
  .version {
    padding-left: 4px;
    .n-tag {
      pointer-events: none;
      border-radius: 6px;
    }
    .time {
      margin-left: auto;
      font-size: 13px;
    }
  }
}
</style>
