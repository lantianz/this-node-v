# Node Version Display (this-node-v)

一个简洁的 VSCode 插件，在状态栏显示当前工作区的 Node.js 版本。

## 功能特性

- ✅ 自动检测当前工作区的 Node.js 版本
- ✅ 在 VSCode 底部状态栏实时显示版本信息
- ✅ 支持工作区切换时自动更新版本
- ✅ 点击状态栏项可手动刷新版本
- ✅ 优雅处理未安装 Node.js 的情况

## 使用方法

### 安装插件

1. 在 VSCode 中打开此项目目录
2. 按 `F5` 启动扩展开发宿主
3. 在新打开的 VSCode 窗口中，插件会自动激活

### 查看版本

- 打开任意包含 Node.js 项目的工作区
- 查看底部状态栏左侧，会显示类似 `🔖 Node v18.17.0` 的信息
- 鼠标悬停在状态栏项上可查看详细信息

### 手动刷新

- 点击状态栏的 Node 版本项
- 或使用命令面板（`Ctrl+Shift+P`）执行 `刷新 Node 版本` 命令

## 开发调试

### 环境要求

- Node.js >= 14.0.0
- VSCode >= 1.75.0

### 调试步骤

1. 克隆或打开此项目
2. 在 VSCode 中打开项目目录
3. 按 `F5` 启动调试
4. 在新窗口中测试插件功能

### 项目结构

```
this-node-v/
├── .vscode/
│   └── launch.json          # 调试配置
├── extension.js             # 插件主文件
├── package.json             # 插件配置
├── README.md                # 说明文档
├── .vscodeignore           # 打包忽略文件
└── .gitignore              # Git 忽略文件
```

## 打包发布

```bash
# 安装 vsce 工具
npm install -g @vscode/vsce

# 打包插件
vsce package

# 发布到 VSCode 市场（需要配置 publisher token）
vsce publish
```

## 技术实现

- 使用 `child_process.exec` 执行 `node -v` 命令
- 使用 `vscode.window.createStatusBarItem` 创建状态栏项
- 监听 `vscode.workspace.onDidChangeWorkspaceFolders` 事件

## 许可证

MIT License

## 更新日志

### 1.0.0 (2026-01-04)

- 初始版本发布
- 支持基本的 Node 版本检测和显示功能
