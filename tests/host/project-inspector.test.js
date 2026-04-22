const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectPackageManagerFromFiles,
  parsePackageManagerString,
  parseVoltaToolchain
} = require('../../lib/project-inspector');
const { parseVoltaListAll } = require('../../lib/volta-service');

test('parsePackageManagerString extracts manager and version', () => {
  assert.deepEqual(parsePackageManagerString('npm@10.8.2'), {
    name: 'npm',
    version: '10.8.2',
    raw: 'npm@10.8.2',
    source: 'packageManager'
  });
});

test('parseVoltaToolchain normalizes only supported tools', () => {
  assert.deepEqual(
    parseVoltaToolchain({
      node: '20.12.2',
      npm: '10.5.2',
      yarn: '1.22.22',
      pnpm: '9.0.0'
    }),
    {
      node: '20.12.2',
      npm: '10.5.2',
      yarn: '1.22.22'
    }
  );
});

test('detectPackageManagerFromFiles prefers known lockfiles', () => {
  assert.deepEqual(detectPackageManagerFromFiles(['README.md', 'yarn.lock']), {
    name: 'yarn',
    version: null,
    raw: 'yarn.lock',
    source: 'lockfile',
    lockfile: 'yarn.lock'
  });
});

test('parseVoltaListAll extracts runtimes package managers and packages', () => {
  const inventory = parseVoltaListAll(`
runtime node@20.19.6
runtime node@24.12.0 (default)
package-manager yarn@4.12.0 (default)
package @openai/codex@0.118.0 / codex / node@24.12.0 npm@built-in (default)
  `);

  assert.equal(inventory.runtimes.length, 2);
  assert.equal(inventory.runtimes[0].isDefault, true);
  assert.equal(inventory.packageManagers[0].specifier, 'yarn@4.12.0');
  assert.deepEqual(inventory.packages[0].binaries, ['codex']);
  assert.equal(inventory.packages[0].runtime, 'node@24.12.0');
});
