<script setup lang="ts">
import type { SidebarDiagnostic } from '../types';

defineProps<{
  items: SidebarDiagnostic[];
}>();

function resolveAlertType(severity: SidebarDiagnostic['severity']) {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}
</script>

<template>
  <n-card size="small" class="section-card">
    <div class="section-title">诊断</div>
    <div class="diagnostic-list">
      <n-alert
        v-for="item in items"
        :key="item.id"
        :type="resolveAlertType(item.severity)"
        :title="item.title"
        size="small"
      >
        {{ item.message }}
      </n-alert>
    </div>
  </n-card>
</template>

<style scoped>
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.diagnostic-list {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}
</style>
