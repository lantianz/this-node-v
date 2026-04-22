const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

class VoltaSidebarProvider {
  constructor(extensionUri, options = {}) {
    this.extensionUri = extensionUri;
    this.onAction = options.onAction || (() => {});
    this.view = null;
    this.state = null;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview-dist')]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => this.onAction(message));

    if (this.state) {
      await this.postState(this.state);
    }
  }

  async postState(state) {
    this.state = state;

    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage({
      type: 'state',
      payload: state
    });
  }

  async reveal() {
    await vscode.commands.executeCommand('workbench.view.extension.this-node-v-volta');

    if (this.view && typeof this.view.show === 'function') {
      this.view.show(false);
    }
  }

  getHtml(webview) {
    const assets = resolveBuiltAssets(this.extensionUri.fsPath);

    if (!assets) {
      return this.getFallbackHtml(webview);
    }

    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(assets.scriptPath));
    const styleUri = webview.asWebviewUri(vscode.Uri.file(assets.stylePath));

    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}" />
    <title>Volta Sidebar</title>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${nonce}">
      window.process = window.process || { env: { NODE_ENV: 'production' } };
      window.__THIS_NODE_V_VSCODE__ = acquireVsCodeApi();
    </script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  getFallbackHtml(webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline';"
    />
    <style>
      body {
        margin: 0;
        padding: 16px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        font-family: var(--vscode-font-family);
      }
    </style>
  </head>
  <body>
    <p>Webview 资源未构建，请先执行 <code>npm run build:webview</code>。</p>
  </body>
</html>`;
  }
}

function getNonce() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return text;
}

function resolveBuiltAssets(extensionFsPath) {
  const distPath = path.join(extensionFsPath, 'webview-dist');
  const assetsPath = path.join(distPath, 'assets');
  const scriptPath = path.join(distPath, 'sidebar.js');

  if (!fs.existsSync(scriptPath)) {
    return null;
  }

  const candidateStylePaths = [
    path.join(distPath, 'sidebar.css'),
    ...readCssFiles(assetsPath)
  ];

  const stylePath = candidateStylePaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (!stylePath) {
    return null;
  }

  return {
    scriptPath,
    stylePath
  };
}

function readCssFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith('.css'))
    .map((fileName) => path.join(directoryPath, fileName));
}

module.exports = {
  VoltaSidebarProvider
};
