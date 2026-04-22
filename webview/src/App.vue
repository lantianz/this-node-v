<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import GlobalInventoryList from "./components/GlobalInventoryList.vue";
import ToolchainCard from "./components/ToolchainCard.vue";
import { getVsCodeApi, postAction } from "./bridge";
import { useNaiveTheme } from "./composables/useNaiveTheme";
import {
  createEmptySidebarState,
  SIDEBAR_ACTIONS,
  type GlobalPackageItem,
  type GlobalToolItem,
  type SidebarState,
} from "./types";

const state = ref<SidebarState>(
  getVsCodeApi().getState() || createEmptySidebarState(),
);
const { theme, themeOverrides } = useNaiveTheme();

const activeInventoryTab = ref<"runtimes" | "packageManagers" | "packages">(
  "runtimes",
);

const pinForm = reactive({
  show: false,
  toolName: "node" as "node" | "npm" | "yarn",
  selectedVersion: "",
  customVersion: "",
});

const installForm = reactive({
  show: false,
  category: "runtime" as "runtime" | "packageManager" | "package",
  toolName: "node",
  selectedVersion: "",
  customVersion: "",
  packageName: "",
});

const uninstallForm = reactive({
  show: false,
  specifier: "",
  title: "",
});

const toolchainItems = computed(() => [
  state.value.toolchain.node,
  state.value.toolchain.npm,
  state.value.toolchain.yarn,
]);

const packageManagerLabel = computed(() => {
  if (state.value.workspace.packageManager) {
    return state.value.workspace.packageManager.raw;
  }

  if (state.value.workspace.lockfileManager) {
    return state.value.workspace.lockfileManager.raw;
  }

  return null;
});

const summaryVoltaLabel = computed(() => {
  if (!state.value.volta.isAvailable) {
    return "Volta 缺失";
  }

  return state.value.volta.version
    ? `Volta ${state.value.volta.version}`
    : "Volta 已安装";
});

const summaryTitle = computed(() =>
  state.value.workspace.path || state.value.workspace.name
    ? state.value.workspace.name || "当前工作区"
    : "未打开工作区",
);

const summaryPath = computed(
  () => state.value.workspace.path || "可直接查看和管理当前 Volta 默认环境",
);

const defaultRuntime = computed(
  () =>
    state.value.inventory.runtimes.find(
      (item) => item.isDefault && item.name === "node",
    ) || null,
);

const defaultPackageManager = computed(
  () =>
    state.value.inventory.packageManagers.find((item) => item.isDefault) ||
    null,
);

const nodeVersionOptions = computed(() =>
  state.value.inventory.runtimes
    .filter((item) => item.name === "node" && item.version)
    .map((item) => ({
      label: item.isDefault ? `${item.version} · default` : item.version || "",
      value: item.version || "",
    })),
);

const selectedPackageManager = computed<"npm" | "yarn">(() => {
  const currentManager =
    state.value.workspace.packageManager &&
    state.value.workspace.packageManager.name;
  return currentManager === "npm" ? "npm" : "yarn";
});

const packageManagerToolOptions = computed(() => [
  { label: "npm", value: "npm" },
  { label: "Yarn", value: "yarn" },
]);

const currentPinOptions = computed(() => {
  if (pinForm.toolName === "node") {
    return nodeVersionOptions.value;
  }

  return state.value.inventory.packageManagers
    .filter((item) => item.name === pinForm.toolName && item.version)
    .map((item) => ({
      label: item.isDefault ? `${item.version} · default` : item.version || "",
      value: item.version || "",
    }));
});

const currentInstallOptions = computed(() => {
  if (installForm.category === "runtime") {
    return nodeVersionOptions.value;
  }

  if (installForm.category === "packageManager") {
    return state.value.inventory.packageManagers
      .filter((item) => item.name === installForm.toolName && item.version)
      .map((item) => ({
        label: item.isDefault
          ? `${item.version} · default`
          : item.version || "",
        value: item.version || "",
      }));
  }

  return [];
});

const inventoryActionLabel = computed(() => {
  if (activeInventoryTab.value === "runtimes") {
    return "安装/设默认 Node";
  }

  if (activeInventoryTab.value === "packageManagers") {
    return "安装/设默认 包管理器";
  }

  return "安装全局包";
});

function handleMessage(
  event: MessageEvent<{ type?: string; payload?: SidebarState }>,
) {
  if (event.data.type !== "state" || !event.data.payload) {
    return;
  }

  state.value = event.data.payload;
  getVsCodeApi().setState(event.data.payload);
}

function openPinDialog(toolName: "node" | "npm" | "yarn", presetVersion = "") {
  pinForm.show = true;
  pinForm.toolName = toolName;
  pinForm.selectedVersion = presetVersion || suggestToolVersion(toolName);
  pinForm.customVersion = "";
}

function closePinDialog() {
  pinForm.show = false;
  pinForm.selectedVersion = "";
  pinForm.customVersion = "";
}

function submitPin() {
  const version = (pinForm.customVersion || pinForm.selectedVersion).trim();

  if (!version) {
    return;
  }

  postAction(SIDEBAR_ACTIONS.SUBMIT_PIN, {
    toolName: pinForm.toolName,
    version,
  });
  closePinDialog();
}

function openInstallDialog(category: "runtime" | "packageManager" | "package") {
  installForm.show = true;
  installForm.category = category;
  installForm.packageName = "";
  installForm.customVersion = "";
  installForm.selectedVersion = "";

  if (category === "runtime") {
    installForm.toolName = "node";
    installForm.selectedVersion = suggestInstalledVersion("node");
    return;
  }

  if (category === "packageManager") {
    installForm.toolName = selectedPackageManager.value;
    installForm.selectedVersion = suggestInstalledVersion(installForm.toolName);
  }
}

function closeInstallDialog() {
  installForm.show = false;
  installForm.packageName = "";
  installForm.selectedVersion = "";
  installForm.customVersion = "";
}

function submitInstall() {
  if (installForm.category === "package") {
    const packageName = installForm.packageName.trim();
    const version = installForm.customVersion.trim();

    if (!packageName) {
      return;
    }

    postAction(SIDEBAR_ACTIONS.SUBMIT_INSTALL, {
      category: "package",
      packageName,
      version,
    });
    closeInstallDialog();
    return;
  }

  const version = (
    installForm.customVersion || installForm.selectedVersion
  ).trim();

  if (!version) {
    return;
  }

  postAction(SIDEBAR_ACTIONS.SUBMIT_INSTALL, {
    category: installForm.category,
    toolName: installForm.toolName,
    version,
  });
  closeInstallDialog();
}

function normalizeVersion(version: string | null) {
  return version ? version.replace(/^v/, "") : "";
}

function suggestToolVersion(toolName: "node" | "npm" | "yarn") {
  const tool = state.value.toolchain[toolName];

  return (
    normalizeVersion(tool.pinnedVersion) ||
    normalizeVersion(tool.expectedVersion) ||
    normalizeVersion(tool.activeVersion) ||
    suggestInstalledVersion(toolName)
  );
}

function suggestInstalledVersion(toolName: string) {
  if (toolName === "node") {
    return nodeVersionOptions.value[0]?.value || "";
  }

  return (
    state.value.inventory.packageManagers.find(
      (item) => item.name === toolName && item.version,
    )?.version || ""
  );
}

function openInventoryAction() {
  if (activeInventoryTab.value === "runtimes") {
    openInstallDialog("runtime");
    return;
  }

  if (activeInventoryTab.value === "packageManagers") {
    openInstallDialog("packageManager");
    return;
  }

  openInstallDialog("package");
}

function quickPinFromInventory(item: GlobalToolItem) {
  if (item.name === "node") {
    openPinDialog("node", item.version || "");
    return;
  }

  if (item.name === "npm" || item.name === "yarn") {
    openPinDialog(item.name, item.version || "");
  }
}

function makeDefaultTool(item: GlobalToolItem) {
  if (!item.version || item.name === "pnpm") {
    return;
  }

  postAction(SIDEBAR_ACTIONS.SUBMIT_INSTALL, {
    category: item.type === "runtime" ? "runtime" : "packageManager",
    toolName: item.name,
    version: item.version,
  });
}

function requestPackageUpdate(item: GlobalPackageItem) {
  if (!item.name) {
    return;
  }

  postAction(SIDEBAR_ACTIONS.UPDATE_GLOBAL_PACKAGE, {
    packageName: item.name,
  });
}

function requestUninstall(item: GlobalToolItem | GlobalPackageItem) {
  uninstallForm.show = true;
  uninstallForm.specifier = item.specifier;
  uninstallForm.title = item.specifier;
}

function confirmUninstall() {
  if (!uninstallForm.specifier) {
    return;
  }

  postAction(SIDEBAR_ACTIONS.UNINSTALL_GLOBAL_ITEM, {
    specifier: uninstallForm.specifier,
  });
  uninstallForm.show = false;
  uninstallForm.specifier = "";
  uninstallForm.title = "";
}

function closeUninstallDialog() {
  uninstallForm.show = false;
  uninstallForm.specifier = "";
  uninstallForm.title = "";
}

onMounted(() => {
  window.addEventListener("message", handleMessage);
  postAction(SIDEBAR_ACTIONS.READY);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<template>
  <n-config-provider
    style="width: 100%"
    :theme="theme"
    :theme-overrides="themeOverrides"
  >
    <div class="app-shell">
      <n-spin :show="state.ui.isLoading" class="app-spin">
        <div class="content-stack">
          <n-card size="small" class="section-card">
            <div class="summary-row">
              <div class="summary-main">
                <div class="summary-title">{{ summaryTitle }}</div>
                <div class="summary-path" :title="summaryPath">
                  {{ summaryPath }}
                </div>
              </div>

              <div class="action-strip">
                <n-button
                  size="tiny"
                  quaternary
                  @click="postAction(SIDEBAR_ACTIONS.REFRESH)"
                >
                  刷新
                </n-button>
                <n-button
                  v-if="state.workspace.path"
                  size="tiny"
                  quaternary
                  @click="postAction(SIDEBAR_ACTIONS.FOCUS_WORKSPACE)"
                >
                  定位
                </n-button>
              </div>
            </div>

            <div class="summary-tags">
              <n-tag
                size="small"
                :type="state.volta.isAvailable ? 'success' : 'error'"
                :bordered="false"
              >
                {{ summaryVoltaLabel }}
              </n-tag>
              <n-tag
                v-if="packageManagerLabel"
                size="small"
                type="default"
                :bordered="false"
              >
                {{ packageManagerLabel }}
              </n-tag>
              <n-tag
                v-else-if="defaultPackageManager"
                size="small"
                type="default"
                :bordered="false"
              >
                默认 {{ defaultPackageManager.specifier }}
              </n-tag>
              <n-tag
                v-if="defaultRuntime"
                size="small"
                type="info"
                :bordered="false"
              >
                默认 Node {{ defaultRuntime.version }}
              </n-tag>
              <n-tag
                v-if="state.workspace.isMultiRoot"
                size="small"
                type="warning"
                :bordered="false"
              >
                {{ state.workspace.workspaceCount }} roots
              </n-tag>
            </div>
          </n-card>

          <n-card v-if="state.workspace.path" size="small" class="section-card">
            <div class="section-head">
              <div class="section-title">工作区</div>
              <div class="action-strip">
                <n-button size="tiny" quaternary @click="openPinDialog('node')">
                  Pin Node
                </n-button>
                <n-button
                  size="tiny"
                  quaternary
                  @click="openPinDialog(selectedPackageManager)"
                >
                  Pin 包管理器
                </n-button>
                <n-button
                  size="tiny"
                  quaternary
                  @click="postAction(SIDEBAR_ACTIONS.OPEN_FILE)"
                >
                  package.json
                </n-button>
              </div>
            </div>

            <div class="tool-list">
              <ToolchainCard
                v-for="item in toolchainItems"
                :key="item.key"
                :tool="item"
              />
            </div>
          </n-card>

          <n-card v-else size="small" class="section-card">
            <div class="section-head">
              <div class="section-title">默认环境</div>
              <div class="action-strip">
                <n-button
                  size="tiny"
                  quaternary
                  @click="openInstallDialog('runtime')"
                >
                  设默认 Node
                </n-button>
                <n-button
                  size="tiny"
                  quaternary
                  @click="openInstallDialog('packageManager')"
                >
                  设默认包管理器
                </n-button>
              </div>
            </div>

            <div class="default-grid">
              <div class="default-item">
                <div class="default-item__label">Node</div>
                <div class="default-item__value">
                  {{ defaultRuntime ? `v${defaultRuntime.version}` : "--" }}
                </div>
              </div>
              <div class="default-item">
                <div class="default-item__label">包管理器</div>
                <div class="default-item__value">
                  {{
                    defaultPackageManager
                      ? defaultPackageManager.specifier
                      : "--"
                  }}
                </div>
              </div>
            </div>
          </n-card>

          <n-card size="small" class="section-card section-card--inventory">
            <div class="section-head">
              <div class="section-title">全局</div>
              <div class="action-strip">
                <n-button
                  size="tiny"
                  type="primary"
                  @click="openInventoryAction"
                >
                  {{ inventoryActionLabel }}
                </n-button>
              </div>
            </div>

            <div class="inventory-body">
              <n-tabs v-model:value="activeInventoryTab" size="small" animated>
                <n-tab-pane name="runtimes" tab="Runtime">
                  <div class="inventory-scroll custom-scrollbar">
                    <GlobalInventoryList
                      empty-text="未安装运行时"
                      :items="state.inventory.runtimes"
                      mode="runtime"
                      @pin="quickPinFromInventory"
                      @make-default="makeDefaultTool"
                      @update="requestPackageUpdate"
                      @remove="requestUninstall"
                    />
                  </div>
                </n-tab-pane>
                <n-tab-pane name="packageManagers" tab="包管理器">
                  <div class="inventory-scroll custom-scrollbar">
                    <GlobalInventoryList
                      empty-text="未安装包管理器"
                      :items="state.inventory.packageManagers"
                      mode="packageManager"
                      @pin="quickPinFromInventory"
                      @make-default="makeDefaultTool"
                      @update="requestPackageUpdate"
                      @remove="requestUninstall"
                    />
                  </div>
                </n-tab-pane>
                <n-tab-pane name="packages" tab="全局包">
                  <div class="inventory-scroll custom-scrollbar">
                    <GlobalInventoryList
                      empty-text="未安装全局包"
                      :items="state.inventory.packages"
                      mode="package"
                      @pin="quickPinFromInventory"
                      @make-default="makeDefaultTool"
                      @update="requestPackageUpdate"
                      @remove="requestUninstall"
                    />
                  </div>
                </n-tab-pane>
              </n-tabs>
            </div>
          </n-card>
        </div>
      </n-spin>
    </div>

    <n-modal
      v-model:show="pinForm.show"
      preset="card"
      class="dialog-card"
      title="Pin 工作区工具"
      size="small"
      :mask-closable="false"
    >
      <div class="dialog-stack">
        <div class="field">
          <div class="field__label">工具</div>
          <n-select
            v-model:value="pinForm.toolName"
            size="small"
            :options="[
              { label: 'Node.js', value: 'node' },
              { label: 'npm', value: 'npm' },
              { label: 'Yarn', value: 'yarn' },
            ]"
          />
        </div>

        <div class="field">
          <div class="field__label">已安装版本</div>
          <n-select
            v-model:value="pinForm.selectedVersion"
            size="small"
            clearable
            :options="currentPinOptions"
            placeholder="从已安装版本中选择"
          />
        </div>

        <div class="field">
          <div class="field__label">自定义版本</div>
          <n-input
            v-model:value="pinForm.customVersion"
            size="small"
            placeholder="优先使用自定义输入"
          />
        </div>

        <div class="dialog-actions">
          <n-button size="small" @click="closePinDialog">取消</n-button>
          <n-button size="small" type="primary" @click="submitPin"
            >提交</n-button
          >
        </div>
      </div>
    </n-modal>

    <n-modal
      v-model:show="installForm.show"
      preset="card"
      class="dialog-card"
      :title="inventoryActionLabel"
      size="small"
      :mask-closable="false"
    >
      <div class="dialog-stack">
        <template v-if="installForm.category === 'package'">
          <div class="field">
            <div class="field__label">包名</div>
            <n-input
              v-model:value="installForm.packageName"
              size="small"
              placeholder="例如 @vscode/vsce"
            />
          </div>
          <div class="field">
            <div class="field__label">版本</div>
            <n-input
              v-model:value="installForm.customVersion"
              size="small"
              placeholder="留空则安装最新"
            />
          </div>
        </template>

        <template v-else>
          <div v-if="installForm.category === 'packageManager'" class="field">
            <div class="field__label">工具</div>
            <n-select
              v-model:value="installForm.toolName"
              size="small"
              :options="packageManagerToolOptions"
            />
          </div>

          <div class="field">
            <div class="field__label">已安装版本</div>
            <n-select
              v-model:value="installForm.selectedVersion"
              size="small"
              clearable
              :options="currentInstallOptions"
              placeholder="可选择已有版本"
            />
          </div>
          <div class="field">
            <div class="field__label">自定义版本</div>
            <n-input
              v-model:value="installForm.customVersion"
              size="small"
              placeholder="优先使用自定义输入"
            />
          </div>
        </template>

        <div class="dialog-actions">
          <n-button size="small" @click="closeInstallDialog">取消</n-button>
          <n-button size="small" type="primary" @click="submitInstall"
            >提交</n-button
          >
        </div>
      </div>
    </n-modal>

    <n-modal
      v-model:show="uninstallForm.show"
      preset="card"
      class="dialog-card dialog-card--confirm"
      title="卸载"
      size="small"
      :mask-closable="false"
    >
      <div class="dialog-stack">
        <div class="confirm-text">{{ uninstallForm.title }}</div>
        <div class="dialog-actions">
          <n-button size="small" @click="closeUninstallDialog">取消</n-button>
          <n-button size="small" type="error" @click="confirmUninstall"
            >卸载</n-button
          >
        </div>
      </div>
    </n-modal>
  </n-config-provider>
</template>

<style scoped>
.app-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 6px;
  overflow: hidden;
  background: var(--vscode-sideBar-background);
}

.app-spin {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.app-spin :deep(.n-spin-content) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.content-stack {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 8px;
  min-height: 0;
}

.section-card {
  min-width: 0;
}

.section-card :deep(.n-card-content) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.summary-row,
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.summary-main {
  min-width: 0;
  flex: 1;
}

.summary-title,
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
  white-space: nowrap;
}

.summary-path {
  margin-top: 3px;
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.action-strip {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: max-content;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.action-strip :deep(.n-button) {
  white-space: nowrap;
}

.summary-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.summary-tags :deep(.n-tag) {
  white-space: nowrap;
}

.tool-list {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 6px;
}

.default-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.default-item {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--vscode-editorWidget-background, var(--vscode-sideBar-background)) 72%,
    transparent
  );
}

.default-item__label {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
}

.default-item__value {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-card--inventory {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.section-card--inventory :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.inventory-body {
  margin-top: 8px;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.inventory-body :deep(.n-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.inventory-body :deep(.n-tabs-nav) {
  flex: none;
}

.inventory-body :deep(.n-tabs-pane-wrapper),
.inventory-body :deep(.n-tabs-content) {
  flex: 1 1 auto;
  min-height: 0;
}

.inventory-body :deep(.n-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.inventory-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.dialog-card {
  width: min(100vw - 20px, 360px);
}

.dialog-card :deep(.n-card-header) {
  padding-bottom: 4px;
}

.dialog-stack {
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 4px;
}

.field__label {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.dialog-actions :deep(.n-button) {
  white-space: nowrap;
}

.confirm-text {
  font-size: 11px;
  color: var(--vscode-foreground);
  word-break: break-all;
}

@media (max-width: 420px) {
  .app-shell {
    padding: 4px;
  }

  .tool-list,
  .default-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 300px) {
  .summary-row,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .action-strip {
    width: 100%;
  }

  .section-title,
  .summary-title {
    white-space: normal;
  }
}
</style>
