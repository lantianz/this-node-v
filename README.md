# Volta Workspace Assistant (this-node-v)

在 VS Code 侧边栏可视化管理当前工作区的 Volta / Node 工具链。

## 功能

- 独立 Activity Bar 入口，集中展示当前 workspace 的 Volta 状态
- 概览 Node / npm / Yarn 的 pinned version、active version 和风险状态
- 提供 `刷新`、`Pin Node`、`Pin 包管理器`、`安装工具`、`打开 package.json` 等常用操作
- 状态栏保留轻量摘要，点击后直接聚焦到 Volta 侧边栏
- 自动跟随活动编辑器所属 workspace，兼容多根工作区

## 使用

1. 在 VS Code 中打开此项目目录
2. 执行 `npm install`
3. 执行 `npm run build:webview`
4. 按 `F5` 启动扩展开发宿主

启动后：

- Activity Bar 会出现 `Volta` 入口
- 左下状态栏会显示当前 Volta / Node 摘要
- 侧边栏会同步显示工具链概览、操作区和诊断信息

## 开发

### 环境要求

- Node.js >= 18
- VS Code >= 1.75.0

### 常用命令

```bash
# 构建侧边栏前端
npm run build:webview

# 运行测试
npm test
```

### 目录概览

```text
this-node-v/
├── extension.js            # 扩展宿主入口
├── lib/                    # workspace / volta / sidebar 状态逻辑
├── shared/                 # 宿主与 Webview 共用常量
├── webview/                # Vue 3 + Naive UI 侧边栏源码
├── tests/                  # 宿主与 Webview 测试
└── webview-dist/           # Vite 构建产物（运行时生成）
```

## 打包发布

```bash
# 安装 vsce 工具
npm install -g @vscode/vsce

# 打包插件
vsce package

# 发布到 VS Code 市场
vsce publish
```

`vsce package` / `vsce publish` 会先执行 `npm run build:webview`，确保侧边栏资源是最新的。

## 许可证

MIT License
