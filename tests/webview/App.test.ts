import { mount } from '@vue/test-utils';
import {
  NButton,
  NCard,
  NConfigProvider,
  NEmpty,
  NInput,
  NModal,
  NSelect,
  NSpin,
  NTabPane,
  NTabs,
  NTag
} from 'naive-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../webview/src/App.vue';
import { createEmptySidebarState, type SidebarState } from '../../webview/src/types';

function createState(overrides: Partial<SidebarState> = {}): SidebarState {
  const base = createEmptySidebarState();
  return {
    ...base,
    ...overrides,
    workspace: {
      ...base.workspace,
      ...(overrides.workspace || {})
    },
    volta: {
      ...base.volta,
      ...(overrides.volta || {})
    },
    toolchain: {
      ...base.toolchain,
      ...(overrides.toolchain || {})
    },
    inventory: {
      ...base.inventory,
      ...(overrides.inventory || {})
    },
    ui: {
      ...base.ui,
      ...(overrides.ui || {})
    }
  };
}

function mountApp() {
  return mount(App, {
    global: {
      components: {
        NButton,
        NCard,
        NConfigProvider,
        NEmpty,
        NInput,
        NModal,
        NSelect,
        NSpin,
        NTabPane,
        NTabs,
        NTag
      }
    }
  });
}

describe('App', () => {
  beforeEach(() => {
    window.__THIS_NODE_V_VSCODE__ = {
      getState: vi.fn(),
      postMessage: vi.fn(),
      setState: vi.fn()
    };
  });

  it('renders workspace summary and global inventory actions', () => {
    window.__THIS_NODE_V_VSCODE__!.getState = vi.fn(() =>
      createState({
        workspace: {
          name: 'demo',
          path: 'D:/demo',
          hasPackageJson: true,
          packageJsonPath: 'D:/demo/package.json',
          packageManager: {
            name: 'yarn',
            version: '4.12.0',
            raw: 'yarn@4.12.0',
            source: 'packageManager'
          },
          lockfileManager: null,
          isMultiRoot: false,
          workspaceCount: 1
        },
        volta: {
          isAvailable: true,
          version: '2.0.2',
          binaryPath: 'volta'
        },
        inventory: {
          runtimes: [
            {
              type: 'runtime',
              name: 'node',
              label: 'Node.js',
              version: '24.12.0',
              specifier: 'node@24.12.0',
              isDefault: true
            }
          ],
          packageManagers: [],
          packages: [
            {
              name: '@openai/codex',
              version: '0.118.0',
              specifier: '@openai/codex@0.118.0',
              binaries: ['codex'],
              runtime: 'node@24.12.0',
              packageManager: 'npm@built-in',
              isDefault: true
            }
          ]
        }
      })
    );

    const wrapper = mountApp();

    expect(wrapper.text()).toContain('demo');
    expect(wrapper.text()).toContain('Volta 2.0.2');
    expect(wrapper.text()).toContain('Pin Node');
    expect(wrapper.text()).toContain('安装/设默认 Node');
    expect(window.__THIS_NODE_V_VSCODE__!.postMessage).toHaveBeenCalledWith({ type: 'ready' });
  });

  it('renders minimal empty state without diagnostics copy', () => {
    window.__THIS_NODE_V_VSCODE__!.getState = vi.fn(() =>
      createState({
        volta: {
          isAvailable: true,
          version: '2.0.2',
          binaryPath: 'volta'
        },
        inventory: {
          runtimes: [
            {
              type: 'runtime',
              name: 'node',
              label: 'Node.js',
              version: '24.12.0',
              specifier: 'node@24.12.0',
              isDefault: true
            }
          ],
          packageManagers: [
            {
              type: 'packageManager',
              name: 'yarn',
              label: 'Yarn',
              version: '4.12.0',
              specifier: 'yarn@4.12.0',
              isDefault: true
            }
          ],
          packages: []
        }
      })
    );

    const wrapper = mountApp();

    expect(wrapper.text()).toContain('未打开工作区');
    expect(wrapper.text()).toContain('默认 Node 24.12.0');
    expect(wrapper.text()).toContain('yarn@4.12.0');
  });
});
