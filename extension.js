const vscode = require('vscode');
const { VoltaSidebarProvider } = require('./lib/sidebar-provider');
const { buildSidebarState, createEmptySidebarState } = require('./lib/sidebar-state');
const {
  inspectTool,
  inspectVolta,
  installPackage,
  installTool,
  listVoltaInventory,
  pinTool,
  updatePackage,
  uninstallGlobalItem
} = require('./lib/volta-service');
const { resolveWorkspaceContext } = require('./lib/workspace-context');
const { SIDEBAR_ACTIONS, TOOL_KEYS, TOOL_LABELS } = require('./shared/sidebar-contract');

let currentState = createEmptySidebarState();
let refreshSequence = 0;
let sidebarProvider;
let statusBarItem;

async function activate(context) {
  console.log('this-node-v 插件已激活');

  statusBarItem = vscode.window.createStatusBarItem(
    'this-node-v.statusBar',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'this-node-v.focusSidebar';
  statusBarItem.show();

  sidebarProvider = new VoltaSidebarProvider(context.extensionUri, {
    onAction: (message) => handleSidebarAction(message)
  });

  const sidebarViewProvider = vscode.window.registerWebviewViewProvider(
    'this-node-v.sidebar',
    sidebarProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }
  );

  const openPanelCommand = vscode.commands.registerCommand('this-node-v.openPanel', async () => {
    await focusSidebar();
  });

  const focusSidebarCommand = vscode.commands.registerCommand('this-node-v.focusSidebar', async () => {
    await focusSidebar();
  });

  const refreshCommand = vscode.commands.registerCommand('this-node-v.refreshNodeVersion', async () => {
    await refreshSidebarState();
  });

  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    refreshSidebarState();
  });

  const activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor(() => {
    refreshSidebarState();
  });

  const manifestWatcher = vscode.workspace.createFileSystemWatcher(
    '**/{package.json,package-lock.json,npm-shrinkwrap.json,yarn.lock,pnpm-lock.yaml}'
  );

  const manifestChangeWatcher = manifestWatcher.onDidChange(() => refreshSidebarState());
  const manifestCreateWatcher = manifestWatcher.onDidCreate(() => refreshSidebarState());
  const manifestDeleteWatcher = manifestWatcher.onDidDelete(() => refreshSidebarState());

  context.subscriptions.push(
    statusBarItem,
    sidebarViewProvider,
    openPanelCommand,
    focusSidebarCommand,
    refreshCommand,
    workspaceWatcher,
    activeEditorWatcher,
    manifestWatcher,
    manifestChangeWatcher,
    manifestCreateWatcher,
    manifestDeleteWatcher
  );

  await refreshSidebarState();
}

async function handleSidebarAction(message) {
  if (!message || typeof message.type !== 'string') {
    return;
  }

  switch (message.type) {
    case SIDEBAR_ACTIONS.READY:
      await sidebarProvider.postState(currentState);
      return;
    case SIDEBAR_ACTIONS.REFRESH:
      await refreshSidebarState();
      return;
    case SIDEBAR_ACTIONS.SUBMIT_PIN:
      await handlePinSubmit(message.payload);
      return;
    case SIDEBAR_ACTIONS.SUBMIT_INSTALL:
      await handleInstallSubmit(message.payload);
      return;
    case SIDEBAR_ACTIONS.UPDATE_GLOBAL_PACKAGE:
      await handleUpdatePackage(message.payload);
      return;
    case SIDEBAR_ACTIONS.UNINSTALL_GLOBAL_ITEM:
      await handleUninstallSubmit(message.payload);
      return;
    case SIDEBAR_ACTIONS.OPEN_FILE:
      await openPackageJson();
      return;
    case SIDEBAR_ACTIONS.FOCUS_WORKSPACE:
      await focusWorkspace();
      return;
    default:
      return;
  }
}

async function handlePinSubmit(payload) {
  const toolName = payload && typeof payload.toolName === 'string' ? payload.toolName : null;
  const version = payload && typeof payload.version === 'string' ? payload.version : null;
  const workspace = await getWorkspaceStateOrWarn();

  if (!workspace || !toolName || !version || !(await ensureVoltaAvailable(workspace.path))) {
    return;
  }

  const normalizedVersion = await pinTool(workspace.path, toolName, version);
  vscode.window.showInformationMessage(`已成功 pin ${toolName}@${normalizedVersion}`);
  await refreshSidebarState();
}

async function handleInstallSubmit(payload) {
  const category = payload && typeof payload.category === 'string' ? payload.category : null;
  const operationContext = await getOperationContext();

  if (!operationContext || !category || !(await ensureVoltaAvailable(operationContext.cwd))) {
    return;
  }

  if (category === 'runtime' || category === 'packageManager') {
    const toolName = typeof payload.toolName === 'string' ? payload.toolName : null;
    const version = typeof payload.version === 'string' ? payload.version : null;

    if (!toolName || !version) {
      return;
    }

    const normalizedVersion = await installTool(operationContext.cwd, toolName, version);
    vscode.window.showInformationMessage(`已成功安装并设为默认 ${toolName}@${normalizedVersion}`);
    await refreshSidebarState();
    return;
  }

  if (category === 'package') {
    const packageName = typeof payload.packageName === 'string' ? payload.packageName : null;
    const version = typeof payload.version === 'string' ? payload.version : '';

    if (!packageName) {
      return;
    }

    const result = await installPackage(operationContext.cwd, packageName, version);
    vscode.window.showInformationMessage(`已成功安装 ${result.specifier}`);
    await refreshSidebarState();
  }
}

async function handleUpdatePackage(payload) {
  const packageName = payload && typeof payload.packageName === 'string' ? payload.packageName : null;
  const operationContext = await getOperationContext();

  if (!operationContext || !packageName || !(await ensureVoltaAvailable(operationContext.cwd))) {
    return;
  }

  const normalizedPackageName = await updatePackage(operationContext.cwd, packageName);
  vscode.window.showInformationMessage(`已更新 ${normalizedPackageName}`);
  await refreshSidebarState();
}

async function handleUninstallSubmit(payload) {
  const specifier = payload && typeof payload.specifier === 'string' ? payload.specifier : null;
  const operationContext = await getOperationContext();

  if (!operationContext || !specifier || !(await ensureVoltaAvailable(operationContext.cwd))) {
    return;
  }

  const normalizedSpecifier = await uninstallGlobalItem(operationContext.cwd, specifier);
  vscode.window.showInformationMessage(`已卸载 ${normalizedSpecifier}`);
  await refreshSidebarState();
}

async function focusSidebar() {
  await sidebarProvider.reveal();

  if (!currentState.ui.lastUpdatedAt) {
    await refreshSidebarState();
  }
}

function createLoadingState() {
  return {
    ...currentState,
    ui: {
      ...currentState.ui,
      isLoading: true
    }
  };
}

async function refreshSidebarState() {
  const sequence = ++refreshSequence;
  const loadingState = createLoadingState();

  currentState = loadingState;
  updateStatusBar(loadingState);
  await sidebarProvider.postState(loadingState);

  try {
    const nextState = await collectSidebarState();

    if (sequence !== refreshSequence) {
      return;
    }

    currentState = nextState;
    updateStatusBar(nextState);
    await sidebarProvider.postState(nextState);
  } catch (error) {
    if (sequence !== refreshSequence) {
      return;
    }

    currentState = {
      ...currentState,
      ui: {
        isLoading: false,
        lastUpdatedAt: new Date().toISOString()
      }
    };

    updateStatusBar(currentState);
    await sidebarProvider.postState(currentState);
    vscode.window.showErrorMessage(`刷新 Volta 状态失败: ${error.message}`);
  }
}

async function collectSidebarState() {
  const workspace = await resolveWorkspaceContext(vscode);
  const commandCwd = getCommandCwd(workspace);
  const volta = await inspectVolta(commandCwd);
  const inventory = await listVoltaInventory(commandCwd, volta);

  if (!workspace.exists) {
    return buildSidebarState(
      {
        workspace,
        manifest: workspace.manifest,
        volta,
        toolchain: createEmptySidebarState().toolchain,
        inventory
      },
      {
        isLoading: false,
        lastUpdatedAt: new Date().toISOString()
      }
    );
  }

  const preferredPackageManager = workspace.manifest.packageManager || workspace.manifest.lockfileManager;
  const toolchain = {};

  for (const toolName of TOOL_KEYS) {
    toolchain[toolName] = await inspectTool(toolName, workspace.path, {
      volta,
      pinnedVersion: workspace.manifest.volta[toolName],
      expectedVersion:
        preferredPackageManager && preferredPackageManager.name === toolName
          ? preferredPackageManager.version
          : null
    });
  }

  return buildSidebarState(
    {
      workspace,
      manifest: workspace.manifest,
      volta,
      toolchain,
      inventory
    },
    {
      isLoading: false,
      lastUpdatedAt: new Date().toISOString()
    }
  );
}

function updateStatusBar(state) {
  if (state.ui.isLoading) {
    statusBarItem.text = '$(sync~spin) Volta';
    statusBarItem.tooltip = '正在刷新 Volta 工作区状态';
    return;
  }

  if (!state.workspace.path) {
    const defaultRuntime = state.inventory.runtimes.find((item) => item.isDefault && item.name === 'node');

    if (state.volta.isAvailable && defaultRuntime && defaultRuntime.version) {
      statusBarItem.text = `$(tools) Node v${defaultRuntime.version}`;
      statusBarItem.tooltip = buildTooltip(state);
      return;
    }

    statusBarItem.text = '$(circle-slash) 无工作区';
    statusBarItem.tooltip = buildTooltip(state);
    return;
  }

  if (!state.volta.isAvailable) {
    statusBarItem.text = '$(warning) Volta 未安装';
    statusBarItem.tooltip = buildTooltip(state);
    return;
  }

  if (state.toolchain.node.pinnedVersion) {
    statusBarItem.text = `$(tools) Node ${state.toolchain.node.pinnedVersion}`;
    statusBarItem.tooltip = buildTooltip(state);
    return;
  }

  if (state.toolchain.node.activeVersion) {
    statusBarItem.text = `$(versions) Node ${state.toolchain.node.activeVersion}`;
    statusBarItem.tooltip = buildTooltip(state);
    return;
  }

  statusBarItem.text = '$(warning) Node 未 pin';
  statusBarItem.tooltip = buildTooltip(state);
}

function buildTooltip(state) {
  const lines = [];

  if (state.workspace.path) {
    lines.push(`工作区: ${state.workspace.name}`);
    lines.push(state.workspace.path);
  } else {
    lines.push('当前没有打开工作区');
  }

  if (state.volta.isAvailable) {
    lines.push(`Volta: ${state.volta.version || '已安装'}`);
  } else {
    lines.push('Volta: 未检测到');
  }

  if (state.workspace.path) {
    for (const toolName of TOOL_KEYS) {
      const tool = state.toolchain[toolName];
      lines.push(
        `${TOOL_LABELS[toolName]}: pin ${tool.pinnedVersion || '未设置'} / active ${tool.activeVersion || '未检测到'}`
      );
    }
  } else {
    const defaultRuntime = state.inventory.runtimes.find((item) => item.isDefault && item.name === 'node');
    const defaultPackageManager = state.inventory.packageManagers.find((item) => item.isDefault);

    if (defaultRuntime) {
      lines.push(`默认 Node: ${defaultRuntime.version || '--'}`);
    }

    if (defaultPackageManager) {
      lines.push(`默认包管理器: ${defaultPackageManager.specifier}`);
    }
  }

  if (state.inventory.packages.length) {
    lines.push(`全局包: ${state.inventory.packages.length}`);
  }

  lines.push('');
  lines.push('点击打开 Volta 侧边栏');

  return lines.join('\n');
}

async function getWorkspaceStateOrWarn() {
  const workspace = await resolveWorkspaceContext(vscode);

  if (!workspace.exists) {
    vscode.window.showWarningMessage('当前没有打开工作区');
    return null;
  }

  return workspace;
}

async function getOperationContext() {
  const workspace = await resolveWorkspaceContext(vscode);

  return {
    workspace: workspace.exists ? workspace : null,
    cwd: getCommandCwd(workspace)
  };
}

function getCommandCwd(workspace) {
  return workspace && workspace.exists && workspace.path ? workspace.path : process.cwd();
}

async function ensureVoltaAvailable(workspacePath) {
  const volta = await inspectVolta(workspacePath);

  if (!volta.isAvailable) {
    vscode.window.showErrorMessage('未检测到 Volta，请先安装后再执行相关操作');
    return false;
  }

  return true;
}

async function openPackageJson() {
  const workspace = await getWorkspaceStateOrWarn();

  if (!workspace) {
    return;
  }

  if (!workspace.manifest.hasPackageJson) {
    vscode.window.showWarningMessage('当前工作区未找到 package.json');
    return;
  }

  const document = await vscode.workspace.openTextDocument(workspace.manifest.packageJsonPath);
  await vscode.window.showTextDocument(document, { preview: false });
}

async function focusWorkspace() {
  const workspace = await getWorkspaceStateOrWarn();

  if (!workspace) {
    return;
  }

  try {
    await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(workspace.path));
  } catch {
    if (!workspace.manifest.hasPackageJson) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(workspace.manifest.packageJsonPath);
    await vscode.window.showTextDocument(document, { preview: false });
  }
}

function deactivate() {
  console.log('this-node-v 插件已停用');
}

module.exports = { activate, deactivate };
