const vscode = require('vscode');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let statusBarItem;

function activate(context) {
  console.log('this-node-v 插件已激活');

  statusBarItem = vscode.window.createStatusBarItem(
    'this-node-v.statusBar',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'this-node-v.openPanel';
  statusBarItem.show();

  const openPanelCommand = vscode.commands.registerCommand(
    'this-node-v.openPanel',
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('当前没有打开工作区');
        return;
      }
      const workspacePath = workspaceFolders[0].uri.fsPath;
      const voltaPin = await getVoltaPin(workspacePath);

      const items = voltaPin
        ? [
            { label: '$(edit) 修改 pin', description: `当前: node@${voltaPin}`, action: 'pin' },
            { label: '$(sync) 刷新', action: 'refresh' }
          ]
        : [
            { label: '$(add) 添加 pin', action: 'pin' },
            { label: '$(sync) 刷新', action: 'refresh' }
          ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: voltaPin ? `volta pin: node@${voltaPin}` : '未设置 volta pin'
      });

      if (!selected) return;

      if (selected.action === 'pin') {
        const version = await vscode.window.showInputBox({
          prompt: voltaPin ? '修改版本号' : '输入要 pin 的版本号',
          placeHolder: '例如: 18.17.0 或 20',
          value: voltaPin || ''
        });
        if (version && version.trim()) {
          await executeVoltaPin(workspacePath, version.trim());
          statusBarItem.text = '$(sync~spin) 刷新中...';
          await updateNodeVersion();
        }
      } else {
        statusBarItem.text = '$(sync~spin) 刷新中...';
        await updateNodeVersion();
      }
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'this-node-v.refreshNodeVersion',
    async () => {
      statusBarItem.text = '$(sync~spin) 刷新中...';
      await updateNodeVersion();
    }
  );

  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    updateNodeVersion();
  });

  updateNodeVersion();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(openPanelCommand);
  context.subscriptions.push(refreshCommand);
  context.subscriptions.push(workspaceWatcher);
}

function getVoltaPin(workspacePath) {
  return new Promise((resolve) => {
    const pkgPath = path.join(workspacePath, 'package.json');
    fs.readFile(pkgPath, 'utf8', (err, data) => {
      if (err) { resolve(null); return; }
      try {
        const pkg = JSON.parse(data);
        resolve(pkg.volta && pkg.volta.node ? pkg.volta.node : null);
      } catch {
        resolve(null);
      }
    });
  });
}

function executeVoltaPin(workspacePath, version) {
  return new Promise((resolve, reject) => {
    exec(`volta pin node@${version}`, { cwd: workspacePath, timeout: 10000 }, (error) => {
      if (error) {
        vscode.window.showErrorMessage(`volta pin 失败: ${error.message}`);
        reject(error);
        return;
      }
      vscode.window.showInformationMessage(`已成功 pin node@${version}`);
      resolve();
    });
  });
}

function getNodeVersion(workspaceFolder) {
  return new Promise((resolve) => {
    exec('node -v', { cwd: workspaceFolder, timeout: 5000 }, (error, stdout) => {
      if (error) { resolve('未检测到'); return; }
      resolve(stdout.trim());
    });
  });
}

async function updateNodeVersion() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    statusBarItem.text = '$(circle-slash) 无工作区';
    statusBarItem.tooltip = '当前没有打开工作区';
    return;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;
  const version = await getNodeVersion(workspacePath);
  if (version === '未检测到') {
    statusBarItem.text = '$(warning) Node 未检测到';
    statusBarItem.tooltip = '未检测到 Node.js\n点击操作';
  } else {
    statusBarItem.text = `$(versions) Node ${version}`;
    statusBarItem.tooltip = `当前 Node 版本: ${version}\n工作区: ${workspacePath}\n点击操作`;
  }
}

function deactivate() {
  console.log('this-node-v 插件已停用');
}

module.exports = { activate, deactivate };
