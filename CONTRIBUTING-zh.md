# 贡献指南

[English](./CONTRIBUTING.md) | 中文文档

## 开发环境配置

```bash
npm install
```

## 构建

```bash
npm run build          # 类型检查 + 生产构建
npm run dev            # 监视模式（文件改动时自动重新构建）
npm run build:local    # 构建并复制到 Obsidian 库（需要 .env 中提供 VAULT_PATH）
```

如需使用 `build:local`，请在项目根目录创建 `.env` 文件：

```
VAULT_PATH=/path/to/your/obsidian/vault
```

## 测试

测试基于 [vitest](https://vitest.dev/)，覆盖 `src/linkBuilder.ts` 中的纯函数。

```bash
npm test               # 运行一次全部测试
npm run test:watch     # 监视模式（文件改动时重新运行）
```

测试文件与源文件并列存放，使用 `.test.ts` 后缀（例如 `src/linkBuilder.test.ts`）。

## Lint

```bash
npm run lint           # 检查 lint 错误
npm run lint:fix       # 自动修复 lint 错误
```
