const vscode = require('vscode');
const { exec } = require('child_process');

let statusBarItem;

/**
 * 插件激活时调用
 */
function activate(context) {
  console.log('this-node-v 插件已激活');

  // 创建状态栏项
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'this-node-v.refreshNodeVersion';
  statusBarItem.show();

  // 注册刷新命令
  const refreshCommand = vscode.commands.registerCommand(
    'this-node-v.refreshNodeVersion',
    async () => {
      statusBarItem.text = '$(sync~spin) 刷新中...';
      await updateNodeVersion();
    }
  );

  // 监听工作区变化
  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    updateNodeVersion();
  });

  // 初始化：获取并显示 Node 版本
  updateNodeVersion();

  // 注册到上下文，以便在插件停用时清理
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(refreshCommand);
  context.subscriptions.push(workspaceWatcher);
}

/**
 * 获取指定目录下的 Node.js 版本
 */
function getNodeVersion(workspaceFolder) {
  return new Promise((resolve) => {
    const options = {
      cwd: workspaceFolder,
      timeout: 5000
    };

    exec('node -v', options, (error, stdout, stderr) => {
      if (error) {
        console.error('获取 Node 版本失败:', error);
        resolve('未检测到');
        return;
      }

      if (stderr) {
        console.error('Node 命令错误:', stderr);
        resolve('未检测到');
        return;
      }

      const version = stdout.trim();
      resolve(version);
    });
  });
}

/**
 * 更新状态栏显示的 Node 版本
 */
async function updateNodeVersion() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // 没有打开工作区
  if (!workspaceFolders || workspaceFolders.length === 0) {
    statusBarItem.text = '$(circle-slash) 无工作区';
    statusBarItem.tooltip = '当前没有打开工作区';
    return;
  }

  // 获取第一个工作区的路径
  const workspacePath = workspaceFolders[0].uri.fsPath;
  
  // 获取 Node 版本
  const version = await getNodeVersion(workspacePath);

  // 更新状态栏
  if (version === '未检测到') {
    statusBarItem.text = '$(warning) Node 未检测到';
    statusBarItem.tooltip = '未检测到 Node.js\n点击刷新';
  } else {
    statusBarItem.text = `$(versions) Node ${version}`;
    statusBarItem.tooltip = `当前 Node 版本: ${version}\n工作区: ${workspacePath}\n点击刷新`;
  }
}

/**
 * 插件停用时调用
 */
function deactivate() {
  console.log('this-node-v 插件已停用');
}

module.exports = {
  activate,
  deactivate
};
