const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSidebarState, createEmptySidebarState } = require('../../lib/sidebar-state');

test('createEmptySidebarState returns stable empty state', () => {
  const state = createEmptySidebarState();

  assert.equal(state.workspace.path, null);
  assert.equal(state.toolchain.node.pinnedVersion, null);
  assert.deepEqual(state.inventory, {
    runtimes: [],
    packageManagers: [],
    packages: []
  });
});

test('buildSidebarState keeps inventory and workspace summary', () => {
  const state = buildSidebarState(
    {
      workspace: {
        exists: true,
        name: 'demo',
        path: 'D:/demo',
        isMultiRoot: false,
        workspaceCount: 1
      },
      manifest: {
        hasPackageJson: true,
        packageJsonPath: 'D:/demo/package.json',
        packageManager: {
          name: 'yarn',
          version: '1.22.22',
          raw: 'yarn@1.22.22',
          source: 'packageManager'
        },
        lockfileManager: null
      },
      volta: {
        isAvailable: true,
        version: '2.0.2',
        binaryPath: 'volta'
      },
      toolchain: {
        node: {
          key: 'node',
          label: 'Node.js',
          pinnedVersion: '20.12.2',
          expectedVersion: null,
          activeVersion: 'v20.12.2',
          activePath: 'node',
          source: 'volta',
          status: 'ready'
        },
        npm: {
          key: 'npm',
          label: 'npm',
          pinnedVersion: null,
          expectedVersion: null,
          activeVersion: '10.5.2',
          activePath: 'npm',
          source: 'system',
          status: 'runtimeOnly'
        },
        yarn: {
          key: 'yarn',
          label: 'Yarn',
          pinnedVersion: '1.22.22',
          expectedVersion: '1.22.22',
          activeVersion: '1.22.22',
          activePath: 'yarn',
          source: 'volta',
          status: 'ready'
        }
      },
      inventory: {
        runtimes: [
          {
            type: 'runtime',
            name: 'node',
            label: 'Node.js',
            version: '20.12.2',
            specifier: 'node@20.12.2',
            isDefault: true
          }
        ],
        packageManagers: [],
        packages: []
      }
    },
    {
      isLoading: false,
      lastUpdatedAt: '2026-04-22T12:00:00.000Z'
    }
  );

  assert.equal(state.workspace.packageManager.raw, 'yarn@1.22.22');
  assert.equal(state.inventory.runtimes[0].specifier, 'node@20.12.2');
  assert.equal(state.ui.lastUpdatedAt, '2026-04-22T12:00:00.000Z');
});

test('buildSidebarState keeps volta inventory without workspace', () => {
  const state = buildSidebarState(
    {
      workspace: {
        exists: false
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
        packages: []
      }
    },
    {
      isLoading: false,
      lastUpdatedAt: '2026-04-22T12:00:00.000Z'
    }
  );

  assert.equal(state.workspace.path, null);
  assert.equal(state.volta.version, '2.0.2');
  assert.equal(state.inventory.runtimes[0].specifier, 'node@24.12.0');
});
