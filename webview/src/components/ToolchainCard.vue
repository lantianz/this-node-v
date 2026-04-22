<script setup lang="ts">
import { computed } from 'vue';
import type { ToolchainItem } from '../types';

const props = defineProps<{
  tool: ToolchainItem;
}>();

const statusMeta = computed(() => {
  switch (props.tool.status) {
    case 'ready':
      return { label: '就绪', type: 'success' as const };
    case 'installRequired':
      return { label: '待安装', type: 'warning' as const };
    case 'mismatch':
      return { label: '不一致', type: 'warning' as const };
    case 'runtimeOnly':
      return { label: '仅运行时', type: 'info' as const };
    case 'voltaMissing':
      return { label: '缺失', type: 'error' as const };
    case 'unsupported':
      return { label: '实验', type: 'info' as const };
    default:
      return { label: '未 pin', type: 'default' as const };
  }
});
</script>

<template>
  <n-card size="small" class="tool-card" :bordered="true">
    <div class="tool-card__header">
      <div class="tool-card__title">{{ tool.label }}</div>
      <n-tag size="small" :type="statusMeta.type" :bordered="false">
        {{ statusMeta.label }}
      </n-tag>
    </div>

    <div class="tool-card__rows">
      <div class="tool-card__row">
        <span class="tool-card__label">Pin</span>
        <span class="tool-card__value">{{ tool.pinnedVersion || '--' }}</span>
      </div>
      <div class="tool-card__row">
        <span class="tool-card__label">Run</span>
        <span class="tool-card__value">{{ tool.activeVersion || '--' }}</span>
      </div>
      <div v-if="tool.expectedVersion" class="tool-card__row">
        <span class="tool-card__label">Expect</span>
        <span class="tool-card__value">{{ tool.expectedVersion }}</span>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.tool-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tool-card__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.tool-card__rows {
  margin-top: 6px;
  display: grid;
  gap: 4px;
}

.tool-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.tool-card__label {
  color: var(--vscode-descriptionForeground);
  font-size: 10px;
}

.tool-card__value {
  min-width: 0;
  text-align: right;
  font-size: 10px;
  font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
  color: var(--vscode-foreground);
  word-break: break-all;
}
</style>
