# Changelog

All notable changes to Easy Copy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


---

## [1.8.0] - 2026-09-04

### ⚠️ Breaking Changes

- **Minimum Obsidian version is now 1.13.0**: the settings tab is rebuilt on Obsidian 1.13's declarative settings API. Update your Obsidian app before updating the plugin.

### ✨ New Features

- **Settings reorganized into sub-pages**:
  - **Copy targets**: a "General elements" sub-page (copyable markup targets, callout copy, code block behavior) and a "Block ID" sub-page
  - **Copy format**: a "Link format" sub-page with new **Heading link** / **Note link** groups, and an "Advanced options" sub-page
- **Declarative settings API**: migrated to `getSettingDefinitions()` — dependent settings now show/hide instantly via visibility predicates instead of a full re-render, and every sub-page entry carries its own description

### 🐛 Fixed

- **Settings description rendering**: the info icon in "Resolve link path on paste" no longer renders as `[object DocumentFragment]`; the tooltip icon is now attached directly to the description element
- **Descriptions punctuation**: all setting descriptions now end with a period, matching Obsidian core style

<details>
<summary>中文说明（点击展开）</summary>

### ⚠️ 破坏性变更

- **最低 Obsidian 版本提升至 1.13.0**：设置页基于 Obsidian 1.13 的声明式设置 API 重构。更新插件前请先升级 Obsidian。

### ✨ 新功能

- **设置页重组为子页面**：
  - **复制目标**：「通用元素」子页面（可复制的标记对象、标注复制、代码块行为）与「块ID」子页面
  - **复制格式**：「链接格式」子页面（内含全新的**标题链接** / **笔记链接**分组）与「进阶选项」子页面
- **声明式设置 API**：迁移到 `getSettingDefinitions()`——依赖设置项通过可见性谓词即时显示/隐藏，无需整页刷新；每个子页面入口都带有说明

### 🐛 修复

- **设置描述渲染**：「粘贴时解析链接路径」的 info 图标不再显示为 `[object DocumentFragment]`，tooltip 图标现在直接挂载到描述元素上
- **描述标点**：所有设置描述统一以句号结尾，与 Obsidian 官方风格一致

</details>

---

## [1.7.1] - 2026-05-28

### ✨ New Features

- **Display name regex replacement** (closes [#37](https://github.com/Moyf/easy-copy/issues/37)): added a "Display name: Regex replacement" option under Special copy format options. When enabled, a find-and-replace (with full regex support including capture groups like `$1`) is applied to the display text of copied heading/note links. Useful for stripping leading numbers (e.g. `^\d+\.\s*`) or other prefixes from headings.

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 新功能

- **显示名称正则替换**（修复 [#37](https://github.com/Moyf/easy-copy/issues/37)）：在「特殊复制格式选项」中新增「显示名称：正则替换」选项。启用后，可对复制的标题/笔记链接的显示文本进行正则查找替换，支持 `$1` 等捕获组引用。适合去除标题前的序号（如 `^\d+\.\s*`）等场景。

</details>

---

## [1.7.0] - 2026-05-26

### ✨ Improvements

- **Code block detection — innermost block semantics**: when the cursor is inside nested fenced code blocks (e.g. a ```````` block wrapping a ` ``` ` block), the command now copies the **innermost** block the cursor is in, rather than the outermost. Placing the cursor on an inner fence line (which belongs to the outer block's content) correctly returns the outer block.

### 🔧 Maintenance

- **Settings tab**: replace `async/await` with `void` in all `onChange` handlers, following the Obsidian plugin coding guidelines
- **Settings tab**: apply SettingGroup grouping updates
- **package.json**: fix `name` field from `obsidian-sample-plugin` to `easy-copy`

<details>
<summary>中文说明（点击展开）</summary>

### ✨ 改进

- **代码块检测——最内层语义**：光标在嵌套代码块内时（如 ```````` 包裹 ` ``` `），智能复制现在复制**最内层**的代码块，而不是最外层。光标停在内层围栏行上（属于外层块的内容）时，则正确返回外层块。

### 🔧 维护

- **设置页**：将所有 `onChange` 回调中的 `async/await` 改为 `void`，符合 Obsidian 插件编码规范
- **设置页**：更新 SettingGroup 分组
- **package.json**：修正 `name` 字段，从 `obsidian-sample-plugin` 更正为 `easy-copy`

</details>

---

## [1.6.5] - 2026-05-26

### 🐛 Bug Fixes

- **Code block detection**: fix false positive when cursor is on a heading/paragraph between two fenced code blocks. The old implementation searched upward for the nearest `` ``` `` line without distinguishing opening from closing fences — a closing fence of the previous block was mistakenly treated as an opening fence.
- **Nested fence support**: the detector now correctly handles fences of different lengths (e.g. ```` ```` ```` wrapping ` ``` `). Per CommonMark spec, a closing fence must be at least as long as its opening fence, so a shorter inner fence is treated as content, not as a closing fence.

### 🧪 Tests

- Extract core detection logic into a pure function `detectCodeBlockFromLines` in `src/codeBlockDetect.ts`, making it independently testable
- Add 37 unit tests covering: the reported bug scenario, nested fences, unclosed blocks, all `CodeBlockBehavior` modes, and fence-line edge cases

<details>
<summary>中文说明（点击展开）</summary>

### 🐛 Bug 修复

- **代码块检测误判**：修复了光标在两个代码块之间的标题行或段落时，被错误识别为「在代码块内」的问题。原实现向上搜索第一个 ` ``` ` 行时，无法区分开始围栏和结束围栏，导致上方代码块的结束围栏被当成开始围栏。
- **嵌套围栏支持**：检测逻辑现在正确处理不同长度的嵌套围栏（如 ```` ```` ```` 包裹 ` ``` `）。依照 CommonMark 规范，结束围栏长度必须 ≥ 开始围栏，较短的内层围栏视为内容行而非结束围栏。

### 🧪 测试

- 将核心检测逻辑提取为纯函数 `detectCodeBlockFromLines`（位于 `src/codeBlockDetect.ts`），使其可独立进行单元测试
- 新增 37 个单元测试，覆盖：问题复现场景、嵌套围栏、未闭合块、所有 `CodeBlockBehavior` 模式、围栏行边界情况

</details>

---

## [1.6.4] - 2026-05-15

### 🔧 Maintenance

- Updated pnpm lockfile after removing `builtin-modules` and `dotenv` dependencies

<details>
<summary>中文说明（点击展开）</summary>

### 🔧 维护

- 移除 `builtin-modules` 和 `dotenv` 依赖后同步更新 pnpm lockfile

</details>

---

## [1.6.3] - 2026-05-15

### 🔧 Maintenance

- Updated pnpm lockfile after removing `builtin-modules` and `dotenv` dependencies

<details>
<summary>中文说明（点击展开）</summary>

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
