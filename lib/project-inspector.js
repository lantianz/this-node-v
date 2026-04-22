const fs = require('fs/promises');
const path = require('path');

const LOCKFILE_MANAGER_BY_NAME = Object.freeze({
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm'
});

function pickVersion(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseVoltaToolchain(voltaConfig) {
  if (!voltaConfig || typeof voltaConfig !== 'object') {
    return { node: null, npm: null, yarn: null };
  }

  return {
    node: pickVersion(voltaConfig.node),
    npm: pickVersion(voltaConfig.npm),
    yarn: pickVersion(voltaConfig.yarn)
  };
}

function parsePackageManagerString(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null;
  }

  const normalized = rawValue.trim();
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0) {
    return {
      name: normalized,
      version: null,
      raw: normalized,
      source: 'packageManager'
    };
  }

  return {
    name: normalized.slice(0, atIndex),
    version: normalized.slice(atIndex + 1) || null,
    raw: normalized,
    source: 'packageManager'
  };
}

function detectPackageManagerFromFiles(fileNames) {
  const matchedFile = fileNames.find((fileName) => LOCKFILE_MANAGER_BY_NAME[fileName]);

  if (!matchedFile) {
    return null;
  }

  return {
    name: LOCKFILE_MANAGER_BY_NAME[matchedFile],
    version: null,
    raw: matchedFile,
    source: 'lockfile',
    lockfile: matchedFile
  };
}

async function detectExistingFiles(workspacePath, fileNames) {
  const existingFiles = [];

  for (const fileName of fileNames) {
    try {
      await fs.access(path.join(workspacePath, fileName));
      existingFiles.push(fileName);
    } catch {
      continue;
    }
  }

  return existingFiles;
}

async function readWorkspaceManifest(workspacePath) {
  const packageJsonPath = path.join(workspacePath, 'package.json');
  const lockfileNames = Object.keys(LOCKFILE_MANAGER_BY_NAME);

  let rawPackageJson = null;
  let hasPackageJson = false;
  let packageJson = null;
  let parseError = null;

  try {
    rawPackageJson = await fs.readFile(packageJsonPath, 'utf8');
    hasPackageJson = true;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      parseError = error.message;
      hasPackageJson = true;
    }
  }

  if (rawPackageJson !== null) {
    try {
      packageJson = JSON.parse(rawPackageJson);
    } catch (error) {
      parseError = error.message;
    }
  }

  const existingFiles = await detectExistingFiles(workspacePath, lockfileNames);
  const lockfileManager = detectPackageManagerFromFiles(existingFiles);

  return {
    hasPackageJson,
    packageJson,
    packageJsonPath,
    parseError,
    packageManager: parsePackageManagerString(packageJson && packageJson.packageManager),
    lockfileManager,
    volta: parseVoltaToolchain(packageJson && packageJson.volta)
  };
}

module.exports = {
  detectPackageManagerFromFiles,
  parsePackageManagerString,
  parseVoltaToolchain,
  readWorkspaceManifest
};
