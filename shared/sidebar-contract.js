const SIDEBAR_ACTIONS = Object.freeze({
  READY: 'ready',
  REFRESH: 'refresh',
  SUBMIT_PIN: 'submitPin',
  SUBMIT_INSTALL: 'submitInstall',
  UPDATE_GLOBAL_PACKAGE: 'updateGlobalPackage',
  UNINSTALL_GLOBAL_ITEM: 'uninstallGlobalItem',
  OPEN_FILE: 'openFile',
  FOCUS_WORKSPACE: 'focusWorkspace'
});

const TOOL_KEYS = Object.freeze(['node', 'npm', 'yarn']);
const PACKAGE_MANAGER_KEYS = Object.freeze(['npm', 'yarn', 'pnpm']);

const TOOL_LABELS = Object.freeze({
  node: 'Node.js',
  npm: 'npm',
  yarn: 'Yarn',
  pnpm: 'pnpm'
});

const TOOL_STATUSES = Object.freeze({
  READY: 'ready',
  PIN_MISSING: 'pinMissing',
  INSTALL_REQUIRED: 'installRequired',
  MISMATCH: 'mismatch',
  RUNTIME_ONLY: 'runtimeOnly',
  VOLTA_MISSING: 'voltaMissing',
  UNSUPPORTED: 'unsupported'
});

module.exports = {
  PACKAGE_MANAGER_KEYS,
  SIDEBAR_ACTIONS,
  TOOL_KEYS,
  TOOL_LABELS,
  TOOL_STATUSES
};
