const { execFile } = require('child_process');
const { promisify } = require('util');
const { TOOL_LABELS, TOOL_STATUSES } = require('../shared/sidebar-contract');

const execFileAsync = promisify(execFile);
const VERSION_ARGS = Object.freeze({
  node: ['--version'],
  npm: ['--version'],
  yarn: ['--version']
});

function createEmptyInventory() {
  return {
    runtimes: [],
    packageManagers: [],
    packages: []
  };
}

async function runProcess(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd,
      timeout: options.timeout || 8000,
      windowsHide: true,
      shell: process.platform === 'win32'
    });

    return {
      ok: true,
      stdout: (result.stdout || '').trim(),
      stderr: (result.stderr || '').trim()
    };
  } catch (error) {
    return {
      ok: false,
      stdout: (error.stdout || '').trim(),
      stderr: (error.stderr || '').trim(),
      error
    };
  }
}

async function findBinaryPath(binaryName) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = await runProcess(locator, [binaryName], { timeout: 4000 });

  if (!result.ok || !result.stdout) {
    return null;
  }

  return result.stdout.split(/\r?\n/)[0].trim() || null;
}

function normalizeVersion(toolName, rawVersion) {
  if (!rawVersion) {
    return null;
  }

  const normalized = rawVersion.split(/\r?\n/)[0].trim();

  if (!normalized) {
    return null;
  }

  if (toolName === 'node' && !normalized.startsWith('v')) {
    return `v${normalized}`;
  }

  return normalized;
}

function deriveToolStatus({ expectedVersion, pinnedVersion, activeVersion, volta }) {
  if (expectedVersion === 'experimental') {
    return TOOL_STATUSES.UNSUPPORTED;
  }

  if (!volta.isAvailable) {
    return activeVersion ? TOOL_STATUSES.RUNTIME_ONLY : TOOL_STATUSES.VOLTA_MISSING;
  }

  if (expectedVersion && pinnedVersion && expectedVersion !== pinnedVersion) {
    return TOOL_STATUSES.MISMATCH;
  }

  if (pinnedVersion && activeVersion) {
    return TOOL_STATUSES.READY;
  }

  if (pinnedVersion && !activeVersion) {
    return TOOL_STATUSES.INSTALL_REQUIRED;
  }

  if (expectedVersion && !pinnedVersion) {
    return TOOL_STATUSES.MISMATCH;
  }

  if (!pinnedVersion) {
    return TOOL_STATUSES.PIN_MISSING;
  }

  return TOOL_STATUSES.RUNTIME_ONLY;
}

async function inspectVolta(workspacePath) {
  const versionResult = await runProcess('volta', ['--version'], {
    cwd: workspacePath,
    timeout: 5000
  });

  if (!versionResult.ok) {
    return {
      isAvailable: false,
      version: null,
      binaryPath: await findBinaryPath('volta')
    };
  }

  return {
    isAvailable: true,
    version: versionResult.stdout || null,
    binaryPath: await findBinaryPath('volta')
  };
}

async function resolveToolPath(toolName, workspacePath, volta) {
  if (volta.isAvailable) {
    const whichResult = await runProcess('volta', ['which', toolName], {
      cwd: workspacePath,
      timeout: 5000
    });

    if (whichResult.ok && whichResult.stdout) {
      return whichResult.stdout.split(/\r?\n/)[0].trim();
    }
  }

  return findBinaryPath(toolName);
}

async function inspectTool(toolName, workspacePath, options) {
  const { expectedVersion = null, pinnedVersion = null, volta } = options;
  const activePath = await resolveToolPath(toolName, workspacePath, volta);

  let activeVersion = null;
  let source = 'none';

  if (activePath) {
    const versionResult = await runProcess(activePath, VERSION_ARGS[toolName], {
      cwd: workspacePath,
      timeout: 5000
    });

    if (versionResult.ok) {
      activeVersion = normalizeVersion(toolName, versionResult.stdout);
      source = volta.isAvailable && activePath.toLowerCase().includes('volta') ? 'volta' : 'system';
    }
  }

  return {
    key: toolName,
    label: TOOL_LABELS[toolName],
    pinnedVersion,
    expectedVersion,
    activeVersion,
    activePath,
    source,
    status: deriveToolStatus({ expectedVersion, pinnedVersion, activeVersion, volta })
  };
}

function ensureVersionInput(version) {
  const normalized = typeof version === 'string' ? version.trim() : '';

  if (!normalized) {
    throw new Error('版本号不能为空');
  }

  if (!/^[0-9A-Za-z._-]+$/.test(normalized)) {
    throw new Error('版本号格式不受支持');
  }

  return normalized;
}

function ensurePackageName(packageName) {
  const normalized = typeof packageName === 'string' ? packageName.trim() : '';

  if (!normalized) {
    throw new Error('包名不能为空');
  }

  return normalized;
}

function splitSpecifier(rawSpecifier) {
  if (typeof rawSpecifier !== 'string' || !rawSpecifier.trim()) {
    return {
      name: null,
      version: null
    };
  }

  const normalized = rawSpecifier.trim();
  const separatorIndex = normalized.lastIndexOf('@');

  if (separatorIndex <= 0) {
    return {
      name: normalized,
      version: null
    };
  }

  return {
    name: normalized.slice(0, separatorIndex),
    version: normalized.slice(separatorIndex + 1) || null
  };
}

function stripDefaultFlag(rawLine) {
  const normalized = rawLine.trim();
  const isDefault = normalized.endsWith(' (default)');

  return {
    text: isDefault ? normalized.slice(0, -10).trim() : normalized,
    isDefault
  };
}

function parseVoltaPackageLine(rawLine) {
  const { text, isDefault } = stripDefaultFlag(rawLine);
  const segments = text.split(' / ');
  const packageSpecifier = segments[0];
  const binaries = (segments[1] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const metadata = segments[2] || '';
  const runtimeMatch = metadata.match(/\bnode@([^\s]+)/);
  const packageManagerMatch = metadata.match(/\b(npm|yarn|pnpm)@([^\s]+)/);
  const { name, version } = splitSpecifier(packageSpecifier);

  return {
    name,
    version,
    specifier: packageSpecifier,
    binaries,
    runtime: runtimeMatch ? `node@${runtimeMatch[1]}` : null,
    packageManager: packageManagerMatch ? `${packageManagerMatch[1]}@${packageManagerMatch[2]}` : null,
    isDefault
  };
}

function parseVoltaListAll(stdout) {
  const inventory = createEmptyInventory();
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('runtime ')) {
      const { text, isDefault } = stripDefaultFlag(line.slice('runtime '.length));
      const { name, version } = splitSpecifier(text);

      inventory.runtimes.push({
        type: 'runtime',
        name,
        label: TOOL_LABELS[name] || name,
        version,
        specifier: text,
        isDefault
      });
      continue;
    }

    if (line.startsWith('package-manager ')) {
      const { text, isDefault } = stripDefaultFlag(line.slice('package-manager '.length));
      const { name, version } = splitSpecifier(text);

      inventory.packageManagers.push({
        type: 'packageManager',
        name,
        label: TOOL_LABELS[name] || name,
        version,
        specifier: text,
        isDefault
      });
      continue;
    }

    if (line.startsWith('package ')) {
      inventory.packages.push(parseVoltaPackageLine(line.slice('package '.length)));
    }
  }

  inventory.runtimes.sort(sortVersionsByDefault);
  inventory.packageManagers.sort(sortVersionsByDefault);
  inventory.packages.sort((left, right) => {
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  return inventory;
}

function sortVersionsByDefault(left, right) {
  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1;
  }

  return `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`);
}

async function executeVoltaCommand(workspacePath, args) {
  const result = await runProcess('volta', args, {
    cwd: workspacePath,
    timeout: 15000
  });

  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || 'Volta 命令执行失败');
  }

  return result.stdout;
}

async function listVoltaInventory(workspacePath, volta) {
  if (!volta.isAvailable) {
    return createEmptyInventory();
  }

  const stdout = await executeVoltaCommand(workspacePath, ['list', 'all', '--format', 'plain']);
  return parseVoltaListAll(stdout);
}

async function pinTool(workspacePath, toolName, version) {
  const normalizedVersion = ensureVersionInput(version);
  await executeVoltaCommand(workspacePath, ['pin', `${toolName}@${normalizedVersion}`]);
  return normalizedVersion;
}

async function installTool(workspacePath, toolName, version) {
  const normalizedVersion = ensureVersionInput(version);
  await executeVoltaCommand(workspacePath, ['install', `${toolName}@${normalizedVersion}`]);
  return normalizedVersion;
}

async function installPackage(workspacePath, packageName, version) {
  const normalizedPackageName = ensurePackageName(packageName);
  const normalizedVersion = typeof version === 'string' && version.trim() ? ensureVersionInput(version) : null;
  const specifier = normalizedVersion ? `${normalizedPackageName}@${normalizedVersion}` : normalizedPackageName;

  await executeVoltaCommand(workspacePath, ['install', specifier]);

  return {
    packageName: normalizedPackageName,
    version: normalizedVersion,
    specifier
  };
}

async function updatePackage(workspacePath, packageName) {
  const normalizedPackageName = ensurePackageName(packageName);
  await executeVoltaCommand(workspacePath, ['install', `${normalizedPackageName}@latest`]);
  return normalizedPackageName;
}

async function uninstallGlobalItem(workspacePath, specifier) {
  const normalizedSpecifier = ensurePackageName(specifier);
  const { name } = splitSpecifier(normalizedSpecifier);
  const targetName = ensurePackageName(name || normalizedSpecifier);

  await executeVoltaCommand(workspacePath, ['uninstall', targetName]);
  return targetName;
}

module.exports = {
  inspectTool,
  inspectVolta,
  installPackage,
  installTool,
  listVoltaInventory,
  parseVoltaListAll,
  pinTool,
  updatePackage,
  uninstallGlobalItem
};
