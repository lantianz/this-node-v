<script setup lang="ts">
import type { GlobalPackageItem, GlobalToolItem } from '../types';

defineProps<{
  emptyText: string;
  items: Array<GlobalToolItem | GlobalPackageItem>;
  mode: 'runtime' | 'packageManager' | 'package';
}>();

const emit = defineEmits<{
  pin: [item: GlobalToolItem];
  makeDefault: [item: GlobalToolItem];
  update: [item: GlobalPackageItem];
  remove: [item: GlobalToolItem | GlobalPackageItem];
}>();

function isPackageItem(item: GlobalToolItem | GlobalPackageItem): item is GlobalPackageItem {
  return 'binaries' in item;
}
</script>

<template>
  <div v-if="items.length" class="inventory-list">
    <div
      v-for="item in items"
      :key="item.specifier"
      class="inventory-row"
    >
      <div class="inventory-main">
        <div class="inventory-title">
          <span>{{ item.specifier }}</span>
          <n-tag v-if="item.isDefault" size="small" type="success" :bordered="false">
            default
          </n-tag>
        </div>

        <div v-if="mode === 'package' && isPackageItem(item)" class="inventory-meta">
          <span v-if="item.binaries.length">{{ item.binaries.join(', ') }}</span>
          <span v-if="item.runtime">{{ item.runtime }}</span>
          <span v-if="item.packageManager">{{ item.packageManager }}</span>
        </div>
      </div>

      <div class="inventory-actions">
        <n-button
          v-if="mode !== 'package' && (item as GlobalToolItem).name !== 'pnpm'"
          size="tiny"
          quaternary
          @click="emit('pin', item as GlobalToolItem)"
        >
          Pin
        </n-button>
        <n-button
          v-if="mode !== 'package' && (item as GlobalToolItem).name !== 'pnpm'"
          size="tiny"
          quaternary
          @click="emit('makeDefault', item as GlobalToolItem)"
        >
          默认
        </n-button>
        <n-button
          v-if="mode === 'package' && isPackageItem(item)"
          size="tiny"
          quaternary
          @click="emit('update', item)"
        >
          更新
        </n-button>
        <n-button
          v-if="mode === 'package'"
          size="tiny"
          quaternary
          @click="emit('remove', item)"
        >
          卸载
        </n-button>
      </div>
    </div>
  </div>

  <n-empty v-else size="small" :description="emptyText" />
</template>

<style scoped>
.inventory-list {
  display: grid;
  gap: 6px;
}

.inventory-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--vscode-panel-border, transparent);
}

.inventory-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.inventory-main {
  min-width: 0;
}

.inventory-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--vscode-foreground);
  font-size: 11px;
  font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inventory-meta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--vscode-descriptionForeground);
  font-size: 10px;
}

.inventory-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  min-width: max-content;
}

.inventory-actions :deep(.n-button) {
  white-space: nowrap;
}

@media (max-width: 320px) {
  .inventory-row {
    grid-template-columns: 1fr;
  }

  .inventory-actions {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
