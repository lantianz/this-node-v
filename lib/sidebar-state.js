const { TOOL_KEYS, TOOL_LABELS, TOOL_STATUSES } = require('../shared/sidebar-contract');

function createEmptySidebarState(overrides = {}) {
  return {
    workspace: {
      name: null,
      path: null,
      hasPackageJson: false,
      packageJsonPath: null,
      isMultiRoot: false,
      workspaceCount: 0,
      packageManager: null,
      lockfileManager: null
    },
    volta: {
      isAvailable: false,
      version: null,
      binaryPath: null
    },
    toolchain: TOOL_KEYS.reduce((accumulator, toolName) => {
      accumulator[toolName] = {
        key: toolName,
        label: TOOL_LABELS[toolName],
        pinnedVersion: null,
        expectedVersion: null,
        activeVersion: null,
        activePath: null,
        source: 'none',
        status: TOOL_STATUSES.PIN_MISSING
      };
      return accumulator;
    }, {}),
    inventory: {
      runtimes: [],
      packageManagers: [],
      packages: []
    },
    ui: {
      isLoading: false,
      lastUpdatedAt: null
    },
    ...overrides
  };
}

function buildSidebarState(snapshot, ui = {}) {
  if (!snapshot.workspace.exists) {
    return createEmptySidebarState({
      volta: snapshot.volta || {
        isAvailable: false,
        version: null,
        binaryPath: null
      },
      inventory: snapshot.inventory || {
        runtimes: [],
        packageManagers: [],
        packages: []
      },
      ui: {
        isLoading: Boolean(ui.isLoading),
        lastUpdatedAt: ui.lastUpdatedAt || null
      }
    });
  }

  return {
    workspace: {
      name: snapshot.workspace.name,
      path: snapshot.workspace.path,
      hasPackageJson: snapshot.manifest.hasPackageJson,
      packageJsonPath: snapshot.manifest.packageJsonPath,
      isMultiRoot: snapshot.workspace.isMultiRoot,
      workspaceCount: snapshot.workspace.workspaceCount,
      packageManager: snapshot.manifest.packageManager,
      lockfileManager: snapshot.manifest.lockfileManager
    },
    volta: snapshot.volta,
    toolchain: snapshot.toolchain,
    inventory: snapshot.inventory,
    ui: {
      isLoading: Boolean(ui.isLoading),
      lastUpdatedAt: ui.lastUpdatedAt || null
    }
  };
}

module.exports = {
  buildSidebarState,
  createEmptySidebarState
};
