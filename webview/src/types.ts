export interface PackageManagerInfo {
  name: string;
  version: string | null;
  raw: string;
  source: 'packageManager' | 'lockfile';
  lockfile?: string;
}

export interface ToolchainItem {
  key: 'node' | 'npm' | 'yarn';
  label: string;
  pinnedVersion: string | null;
  expectedVersion: string | null;
  activeVersion: string | null;
  activePath: string | null;
  source: 'volta' | 'system' | 'none';
  status:
    | 'ready'
    | 'pinMissing'
    | 'installRequired'
    | 'mismatch'
    | 'runtimeOnly'
    | 'voltaMissing'
    | 'unsupported';
}

export interface GlobalToolItem {
  type: 'runtime' | 'packageManager';
  name: string;
  label: string;
  version: string | null;
  specifier: string;
  isDefault: boolean;
}

export interface GlobalPackageItem {
  name: string | null;
  version: string | null;
  specifier: string;
  binaries: string[];
  runtime: string | null;
  packageManager: string | null;
  isDefault: boolean;
}

export interface SidebarState {
  workspace: {
    name: string | null;
    path: string | null;
    hasPackageJson: boolean;
    packageJsonPath: string | null;
    isMultiRoot: boolean;
    workspaceCount: number;
    packageManager: PackageManagerInfo | null;
    lockfileManager: PackageManagerInfo | null;
  };
  volta: {
    isAvailable: boolean;
    version: string | null;
    binaryPath: string | null;
  };
  toolchain: Record<'node' | 'npm' | 'yarn', ToolchainItem>;
  inventory: {
    runtimes: GlobalToolItem[];
    packageManagers: GlobalToolItem[];
    packages: GlobalPackageItem[];
  };
  ui: {
    isLoading: boolean;
    lastUpdatedAt: string | null;
  };
}

export const SIDEBAR_ACTIONS = {
  READY: 'ready',
  REFRESH: 'refresh',
  SUBMIT_PIN: 'submitPin',
  SUBMIT_INSTALL: 'submitInstall',
  UPDATE_GLOBAL_PACKAGE: 'updateGlobalPackage',
  UNINSTALL_GLOBAL_ITEM: 'uninstallGlobalItem',
  OPEN_FILE: 'openFile',
  FOCUS_WORKSPACE: 'focusWorkspace'
} as const;

export type SidebarActionType = (typeof SIDEBAR_ACTIONS)[keyof typeof SIDEBAR_ACTIONS];

export interface SidebarActionPayloadMap {
  ready: undefined;
  refresh: undefined;
  submitPin: {
    toolName: 'node' | 'npm' | 'yarn';
    version: string;
  };
  submitInstall:
    | {
        category: 'runtime' | 'packageManager';
        toolName: string;
        version: string;
      }
    | {
        category: 'package';
        packageName: string;
        version: string;
      };
  updateGlobalPackage: {
    packageName: string;
  };
  uninstallGlobalItem: {
    specifier: string;
  };
  openFile: undefined;
  focusWorkspace: undefined;
}

export function createEmptySidebarState(): SidebarState {
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
    toolchain: {
      node: {
        key: 'node',
        label: 'Node.js',
        pinnedVersion: null,
        expectedVersion: null,
        activeVersion: null,
        activePath: null,
        source: 'none',
        status: 'pinMissing'
      },
      npm: {
        key: 'npm',
        label: 'npm',
        pinnedVersion: null,
        expectedVersion: null,
        activeVersion: null,
        activePath: null,
        source: 'none',
        status: 'pinMissing'
      },
      yarn: {
        key: 'yarn',
        label: 'Yarn',
        pinnedVersion: null,
        expectedVersion: null,
        activeVersion: null,
        activePath: null,
        source: 'none',
        status: 'pinMissing'
      }
    },
    inventory: {
      runtimes: [],
      packageManagers: [],
      packages: []
    },
    ui: {
      isLoading: false,
      lastUpdatedAt: null
    }
  };
}
