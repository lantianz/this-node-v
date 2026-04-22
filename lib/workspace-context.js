const { readWorkspaceManifest } = require('./project-inspector');

function getPrimaryWorkspaceFolder(vscode) {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];

  if (!workspaceFolders.length) {
    return null;
  }

  const activeEditor = vscode.window.activeTextEditor;
  const activeUri = activeEditor && activeEditor.document && activeEditor.document.uri;
  const activeWorkspaceFolder = activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : null;

  return activeWorkspaceFolder || workspaceFolders[0];
}

async function resolveWorkspaceContext(vscode) {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  const primaryWorkspaceFolder = getPrimaryWorkspaceFolder(vscode);

  if (!primaryWorkspaceFolder) {
    return {
      exists: false,
      folder: null,
      hasPackageJson: false,
      isMultiRoot: false,
      name: null,
      packageJsonPath: null,
      packageManager: null,
      lockfileManager: null,
      path: null,
      workspaceCount: 0,
      manifest: {
        hasPackageJson: false,
        packageJson: null,
        packageJsonPath: null,
        parseError: null,
        packageManager: null,
        lockfileManager: null,
        volta: { node: null, npm: null, yarn: null }
      }
    };
  }

  const manifest = await readWorkspaceManifest(primaryWorkspaceFolder.uri.fsPath);

  return {
    exists: true,
    folder: primaryWorkspaceFolder,
    hasPackageJson: manifest.hasPackageJson,
    isMultiRoot: workspaceFolders.length > 1,
    name: primaryWorkspaceFolder.name,
    packageJsonPath: manifest.packageJsonPath,
    packageManager: manifest.packageManager,
    lockfileManager: manifest.lockfileManager,
    path: primaryWorkspaceFolder.uri.fsPath,
    workspaceCount: workspaceFolders.length,
    manifest
  };
}

module.exports = {
  getPrimaryWorkspaceFolder,
  resolveWorkspaceContext
};
