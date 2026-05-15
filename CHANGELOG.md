# Changelog

All notable changes to Easy Copy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.3] - 2026-05-15

### 🔧 Maintenance

- Updated pnpm lockfile after removing `builtin-modules` and `dotenv` dependencies

<details>
<summary>改动内容（点击展开中文说明）</summary>

### 🔧 维护

- 移除 `builtin-modules` 和 `dotenv` 依赖后同步更新 pnpm lockfile

</details>

---

## [1.6.2] - 2026-05-15

### 🔧 Maintenance

- Added GitHub artifact attestations for `main.js` and `styles.css` release assets
- Fixed all Obsidian plugin linter warnings.

<details>
<summary>中文说明（点击展开）</summary>

### 🔧 维护

- 为 release 产物 `main.js` 和 `styles.css` 添加 GitHub Artifact Attestation（加密溯源证明）
- 修复所有 Obsidian 插件 linter 警告

</details>

---

## [1.6.1] - 2026-05-12

### ✨ Added

- **Code block copy**: When the cursor is inside a fenced code block (` ``` `), the smart copy command now copies the block content directly — no more accidentally triggering block ID generation.
- **Code block copy behavior setting**: A new "Code Block" settings group lets you choose what happens when copying from inside a code block:
  - **Copy plain text** (default) — copies the code content without the surrounding ` ``` ` fence lines
  - **Copy code block (with fences)** — copies the full block including the opening ` ```lang ` and closing ` ``` ` lines
  - **Generate block link** — falls through to the existing block ID generation behavior (same as before this feature)
  - **Disabled** — skips code block detection entirely

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新增

- **复制代码块**：当光标位于代码块（` ``` `）内时，智能复制命令现在会直接复制代码块内容，不再误触发块ID生成。
- **代码块复制行为设置**：新增「代码块」设置分组，可自定义在代码块内按下智能复制时的行为：
  - **复制纯文本**（默认）—— 复制代码内容，不含前后的 ` ``` ` 围栏行
  - **复制代码块（含 ` ``` `）** —— 复制完整代码块，包括开头的 ` ```lang ` 和结尾的 ` ``` ` 行
  - **生成块链接** —— 沿用原有的块ID生成逻辑（与此功能上线前行为一致）
  - **禁用** —— 跳过代码块检测，不做任何特殊处理

</details>

---

## [1.6.0] - 2026-05-09

### ✨ Added

- **Paste-time link path resolution**: When "Resolve link path on paste" is enabled, Easy Copy regenerates link paths based on the destination file's location at paste time.
  - Under "Follow Obsidian settings", uses your vault's configured path style (shortest / relative / absolute)
  - Under explicit Wiki/Markdown format, uses shortest-unique paths only
  - Same-file heading paste simplifies automatically (e.g. `[[#Setup]]` instead of `[[MyProject#Setup]]`)

### 🐛 Fixed

- `simplifiedHeadingToNoteLink` setting now correctly controls link simplification (previously had no effect in some configurations)

### ♻️ Changed

- Extracted `copyMetadata.ts` and `pasteResolution.ts` as pure-function modules with full test coverage
- Added 98 new tests (total: 184)

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新增

- **粘贴时解析链接路径**：启用「粘贴时解析链接路径」后，Easy Copy 会在粘贴时根据目标文件位置重新生成链接路径。
  - 使用「跟随 Obsidian 设置」时，沿用软件设置中的路径风格（最短/相对/绝对）
  - 使用明确的 Wiki/Markdown 格式时，仅使用最短唯一路径
  - 同一文件内粘贴标题自动简化（如 `[[#Setup]]` 而非 `[[MyProject#Setup]]`）

### 🐛 修复

- `simplifiedHeadingToNoteLink` 设置现在正确控制链接简化逻辑（之前在某些配置下无效）

### ♻️ 变更

- 提取 `copyMetadata.ts` 和 `pasteResolution.ts` 为纯函数模块，完整测试覆盖
- 新增 98 个测试（总计 184 个）

</details>

---

## [1.5.3] - 2026-04-22

### ✨ Added

- **Strict heading match** option: When disabled (default), filenames containing the heading as a substring will also be simplified. When enabled, only exact filename-heading matches are simplified.

### 🐛 Fixed

- Heading links now correctly handle special characters (`#`, `|`, `^`, `:`, `%%`, `[[`, `]]`) — matching Obsidian's autocomplete behavior
- Fixed false-positive note-link simplification when filename contains heading as substring (e.g. "JavaScript" filename + "Java" heading)

### ♻️ Changed

- Extracted link-building logic into pure functions; added vitest with 86 tests

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新增

- **严格匹配**选项：关闭时（默认），文件名包含标题子串也会简化（如 "260422_note" 匹配标题 "note"）；开启时，仅完全匹配才会简化。

### 🐛 修复

- 标题链接现在正确处理特殊字符（`#`、`|`、`^`、`:`、`%%`、`[[`、`]]`）——与 Obsidian 自动补全行为一致
- 修复文件名包含标题子串时的误判（如文件名 "JavaScript" + 标题 "Java" 不再被错误简化）

### ♻️ 变更

- 将链接构建逻辑提取为纯函数，新增 vitest 测试框架，86 个测试用例

</details>

---

## [1.5.2] - 2026-04-02

### ✨ Added

- **Wiki link copy**: When the cursor is inside a `[[wikilink]]`, copy the link text (with optional `[[ ]]` brackets via setting)
- **Callout copy**: When the cursor is inside a callout (`>` block), copy the callout content as plain text; configurable priority vs. block ID generation

### 🐛 Fixed

- Inline code, bold, highlight, italic, strikethrough, inline LaTeX detection improvements

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新增

- **Wiki 链接复制**：光标在 `[[双链]]` 内时，复制链接文本（可通过设置选择是否保留 `[[ ]]` 括号）
- **标注复制**：光标在标注（`>` 块）内时，复制标注纯文本内容；可配置与块ID生成的优先级

### 🐛 修复

- 行内代码、加粗、高亮、斜体、删除线、行内LaTeX 检测改进

</details>

---

## [1.5.1] - 2025-12-11

### ✨ Added

- **Frontmatter display text**: Use a note property (e.g. `title`) as the display text for note links
- **Auto block display text**: Automatically generate display text for block ID links, with configurable word/character limits

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新增

- **Frontmatter 显示文本**：使用笔记属性（如 `title`）作为笔记链接的显示文本
- **块链接自动显示文本**：自动为块ID链接生成显示文本，可配置单词数/字符数限制

</details>

---

## [1.5.0] - 2025-11-05

### ✨ Added

- **Block ID generation**: Automatically insert a block ID (`^xxxx`) and copy the block link when there is no other copyable content at the cursor
- **Manual block ID input**: Optionally prompt for a custom block ID via modal
- **Block ID insert position**: Choose between end-of-block or next-line insertion
- **Extra commands**: "Copy current file link" and "Generate & copy current block link" commands added to command palette

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新增

- **块ID生成**：当光标处没有其他可复制内容时，自动插入块ID（`^xxxx`）并复制块链接
- **手动输入块ID**：可通过弹窗手动输入自定义块ID
- **块ID插入位置**：可选择在块末尾或下一行插入
- **拓展命令**：命令面板新增「复制当前文件链接」和「生成并复制当前块链接」命令

</details>

---

[1.6.1]: https://github.com/Moyf/easy-copy/compare/1.6.0...1.6.1
[1.6.0]: https://github.com/Moyf/easy-copy/compare/1.5.3...1.6.0
[1.5.3]: https://github.com/Moyf/easy-copy/compare/1.5.2...1.5.3
[1.5.2]: https://github.com/Moyf/easy-copy/compare/1.5.1...1.5.2
[1.5.1]: https://github.com/Moyf/easy-copy/compare/1.5.0...1.5.1
[1.5.0]: https://github.com/Moyf/easy-copy/releases/tag/1.5.0
