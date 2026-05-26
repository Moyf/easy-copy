import { describe, it, expect } from 'vitest';
import { detectCodeBlockFromLines } from './codeBlockDetect';
import { CodeBlockBehavior, ContextType } from './type';

// 辅助函数：把多行字符串转成行数组
function lines(text: string): string[] {
	return text.split('\n');
}

// ─── 复现场景：两个代码块之间有标题，光标在标题行 ─────────────────────────────
//
// 结构（行号）：
//   0: ---
//   1: chisel: true
//   2: ---
//   3: (空行)
//   4: ```css
//   5: body { color: red !important; }
//   6: ```            ← 第一个代码块的结束围栏
//   7: (空行)
//   8: 思考，是一种储存 CSS 代码块到 MD 的插件？
//   9: 暂时没搞懂做啥的……
//  10: (空行)
//  11: ### 某个独立标题   ← 光标在这里
//  12: ```sync          ← 第二个代码块的开始围栏
//  13: 别的内容。
//  14: ```

const twoBlocksWithHeading = lines(
	`---
chisel: true
---

\`\`\`css
body { color: red !important; }
\`\`\`

思考，是一种储存 CSS 代码块到 MD 的插件？
暂时没搞懂做啥的……

### 某个独立标题
\`\`\`sync
别的内容。
\`\`\``
);

describe('detectCodeBlockFromLines — bug 复现：两块之间的标题行', () => {
	it('光标在两个代码块之间的标题行（行11），不应识别为代码块', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 11, CodeBlockBehavior.COPY_CONTENT);
		expect(result).toBeNull();
	});

	it('光标在两个代码块之间的空行（行10），不应识别为代码块', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 10, CodeBlockBehavior.COPY_CONTENT);
		expect(result).toBeNull();
	});

	it('光标在两个代码块之间的正文行（行8），不应识别为代码块', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 8, CodeBlockBehavior.COPY_CONTENT);
		expect(result).toBeNull();
	});
});

// ─── 正常情况：光标确实在代码块内 ─────────────────────────────────────────────

describe('detectCodeBlockFromLines — 正常识别代码块', () => {
	it('光标在第一个代码块内容行（行5），应识别并返回代码内容', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 5, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
		expect(result!.match).toBe('body { color: red !important; }');
	});

	it('光标在第二个代码块内容行（行13），应识别并返回代码内容', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 13, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
		expect(result!.match).toBe('别的内容。');
	});

	it('COPY_WITH_FENCES：光标在块内，返回含围栏的完整代码块', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 5, CodeBlockBehavior.COPY_WITH_FENCES);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('```css\nbody { color: red !important; }\n```');
	});
});

// ─── 围栏行本身 ────────────────────────────────────────────────────────────────

describe('detectCodeBlockFromLines — 光标在围栏行上', () => {
	it('光标在开始围栏行（行4），不应识别为代码块内', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 4, CodeBlockBehavior.COPY_CONTENT);
		expect(result).toBeNull();
	});

	it('光标在结束围栏行（行6），不应识别为代码块内', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 6, CodeBlockBehavior.COPY_CONTENT);
		expect(result).toBeNull();
	});

	it('光标在第二个代码块开始围栏行（行12），不应识别为代码块内', () => {
		const result = detectCodeBlockFromLines(twoBlocksWithHeading, 12, CodeBlockBehavior.COPY_CONTENT);
		expect(result).toBeNull();
	});
});

// ─── DISABLED 模式 ─────────────────────────────────────────────────────────────

describe('detectCodeBlockFromLines — DISABLED 行为', () => {
	it('任意位置都返回 null', () => {
		expect(detectCodeBlockFromLines(twoBlocksWithHeading, 5, CodeBlockBehavior.DISABLED)).toBeNull();
		expect(detectCodeBlockFromLines(twoBlocksWithHeading, 13, CodeBlockBehavior.DISABLED)).toBeNull();
	});
});

// ─── GENERATE_BLOCK_LINK 模式 ──────────────────────────────────────────────────

describe('detectCodeBlockFromLines — GENERATE_BLOCK_LINK 行为', () => {
	it('光标在代码块内也返回 null（交给块ID逻辑处理）', () => {
		expect(
			detectCodeBlockFromLines(twoBlocksWithHeading, 5, CodeBlockBehavior.GENERATE_BLOCK_LINK)
		).toBeNull();
	});
});

// ─── 未闭合代码块 ──────────────────────────────────────────────────────────────

describe('detectCodeBlockFromLines — 未闭合代码块', () => {
	it('代码块没有结束围栏，光标在其中，返回 null', () => {
		const doc = lines('```js\nconsole.log("hi")\n// no closing fence');
		expect(detectCodeBlockFromLines(doc, 1, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});
});

// ─── 单一代码块（无 frontmatter / 无其他内容）─────────────────────────────────

describe('detectCodeBlockFromLines — 单一简单代码块', () => {
	const simple = lines('```\nhello world\n```');

	it('光标在行1（内容行），返回内容', () => {
		const result = detectCodeBlockFromLines(simple, 1, CodeBlockBehavior.COPY_CONTENT);
		expect(result?.match).toBe('hello world');
	});

	it('光标在行0（开始围栏），返回 null', () => {
		expect(detectCodeBlockFromLines(simple, 0, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在行2（结束围栏），返回 null', () => {
		expect(detectCodeBlockFromLines(simple, 2, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});
});

// ─── 嵌套场景：较长围栏包裹较短围栏 ──────────────────────────────────────────
//
// CommonMark 规则：结束围栏必须与开始围栏字符相同，且长度 ≥ 开始围栏。
// 因此 ```` 内的 ``` 是内容，不是结束围栏。
//
// 场景 A：4 个反引号包裹一个完整的 3 反引号代码块
//   行0: ````markdown
//   行1: ```js
//   行2: console.log("hi")
//   行3: ```
//   行4: ````
//
// 光标在行2，应识别为在外层块内（行0~4），match 包含行1~3。
// 光标在行3（内层 ```），这行是内容，不是结束围栏，也应识别为块内。
// 光标在行1（内层 ```js），同理是内容行，应识别为块内。

const nestedThreeInFour = lines(
	'````markdown\n' +
	'```js\n' +
	'console.log("hi")\n' +
	'```\n' +
	'````'
);

describe('detectCodeBlockFromLines — 嵌套：4个反引号包裹3个反引号', () => {
	it('光标在内层代码内容行（行2），应识别为外层块内', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
	});

	it('光标在内层结束围栏行（行3，是外层块的内容），应识别为外层块内', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 3, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
	});

	it('光标在内层开始围栏行（行1，是外层块的内容），应识别为外层块内', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 1, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
	});

	it('光标在外层开始围栏行（行0），不应识别为块内', () => {
		expect(detectCodeBlockFromLines(nestedThreeInFour, 0, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在外层结束围栏行（行4），不应识别为块内', () => {
		expect(detectCodeBlockFromLines(nestedThreeInFour, 4, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('COPY_WITH_FENCES：返回含外层围栏的完整内容', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 2, CodeBlockBehavior.COPY_WITH_FENCES);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('````markdown\n```js\nconsole.log("hi")\n```\n````');
	});
});

// 场景 B：5 个反引号 + 外层嵌套，光标在外层块之外的普通行不误判
//   行0: ````
//   行1: 内容
//   行2: ````
//   行3: 普通行
//   行4: `````
//   行5: 另一内容
//   行6: `````

const twoLongBlocks = lines(
	'````\n' +
	'内容A\n' +
	'````\n' +
	'普通行\n' +
	'`````\n' +
	'内容B\n' +
	'`````'
);

describe('detectCodeBlockFromLines — 不同长度围栏的独立块', () => {
	it('光标在行1（第一个4反引号块内），应识别为块内', () => {
		const result = detectCodeBlockFromLines(twoLongBlocks, 1, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('内容A');
	});

	it('光标在行3（两个块之间的普通行），不应识别为块内', () => {
		expect(detectCodeBlockFromLines(twoLongBlocks, 3, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在行5（第二个5反引号块内），应识别为块内', () => {
		const result = detectCodeBlockFromLines(twoLongBlocks, 5, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('内容B');
	});
});

// 场景 C：开始用3个，内容里有4个反引号行（不应关闭外层块）
//   行0: ```
//   行1: ````这行是内容
//   行2: 普通内容
//   行3: ```
//
// 根据 CommonMark：开始围栏是3个，结束围栏必须 >= 3 且是纯反引号行。
// 行1 的 ```` 后面跟了文字，不是有效围栏（开始或结束都不算）。
// 行3 的 ``` 是有效结束围栏（= 开始长度3）。

const threeWithLongerContentLine = lines(
	'```\n' +
	'````这行是内容\n' +
	'普通内容\n' +
	'```'
);

describe('detectCodeBlockFromLines — 内容行含更长反引号但带文字（非围栏）', () => {
	it('光标在行1（内容行，虽以4个反引号开头但后跟文字），应识别为块内', () => {
		const result = detectCodeBlockFromLines(threeWithLongerContentLine, 1, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
	});

	it('光标在行2（普通内容），应识别为块内', () => {
		const result = detectCodeBlockFromLines(threeWithLongerContentLine, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
	});
});

// ─── 嵌套：外层用更长的围栏包裹内层 ``` ──────────────────────────────────────
//
// CommonMark 规范：结束围栏必须 >= 开始围栏的长度，且使用相同字符。
// 所以 ```` 内的 ``` 是普通内容，不是结束围栏。
//
// 典型场景：在 Obsidian 里用 ```` 或 ````` 包裹含 ``` 的代码块示例。
//
// 文档结构（行号）：
//   0: ````markdown          ← 4个反引号，开始围栏
//   1: ```js                 ← 3个反引号，是内容，不是结束围栏
//   2: console.log("hi")    ← 内容
//   3: ```                   ← 3个反引号，是内容，不是结束围栏
//   4: ````                  ← 4个反引号，真正的结束围栏
//
// 光标在行2，应识别为「在外层代码块内」

const nestedFence = [
	'````markdown',
	'```js',
	'console.log("hi")',
	'```',
	'````',
];

describe('detectCodeBlockFromLines — 嵌套围栏（外长内短）', () => {
	it('光标在内层 ``` 内容行（行2），应识别为在外层代码块内', () => {
		const result = detectCodeBlockFromLines(nestedFence, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
	});

	it('内容不应包含外层围栏行，COPY_CONTENT 只返回行1-3', () => {
		const result = detectCodeBlockFromLines(nestedFence, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result!.match).toBe('```js\nconsole.log("hi")\n```');
	});

	it('COPY_WITH_FENCES 应返回含外层围栏的完整块', () => {
		const result = detectCodeBlockFromLines(nestedFence, 2, CodeBlockBehavior.COPY_WITH_FENCES);
		expect(result!.match).toBe('````markdown\n```js\nconsole.log("hi")\n```\n````');
	});

	it('光标在内层开始围栏行（行1），仍属于外层代码块内', () => {
		const result = detectCodeBlockFromLines(nestedFence, 1, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
	});

	it('光标在内层结束围栏行（行3），仍属于外层代码块内', () => {
		const result = detectCodeBlockFromLines(nestedFence, 3, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
	});

	it('光标在外层开始围栏行（行0），返回 null', () => {
		expect(detectCodeBlockFromLines(nestedFence, 0, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在外层结束围栏行（行4），返回 null', () => {
		expect(detectCodeBlockFromLines(nestedFence, 4, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});
});

// ─── 嵌套：5个反引号包裹含 ``` 和 ```` 的内容 ────────────────────────────────
//
//   0: `````
//   1: ````js         ← 4个，内容
//   2: code here
//   3: ````           ← 4个，内容（不够长，不是结束围栏）
//   4: `````          ← 5个，真正的结束围栏

const deepNested = [
	'`````',
	'````js',
	'code here',
	'````',
	'`````',
];

describe('detectCodeBlockFromLines — 5个反引号嵌套', () => {
	it('光标在行2（内容），识别为在块内', () => {
		const result = detectCodeBlockFromLines(deepNested, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('````js\ncode here\n````');
	});

	it('光标在行1（内层4个反引号开头行），识别为在块内', () => {
		expect(detectCodeBlockFromLines(deepNested, 1, CodeBlockBehavior.COPY_CONTENT)).not.toBeNull();
	});

	it('光标在行3（内层4个反引号结束行），识别为在块内', () => {
		expect(detectCodeBlockFromLines(deepNested, 3, CodeBlockBehavior.COPY_CONTENT)).not.toBeNull();
	});
});

// ─── 波浪号围栏：~~~ 不受反引号计数影响 ─────────────────────────────────────
//
// CommonMark 规范同样支持 ~ 作为围栏字符，且两者不互相关闭。
// 本插件目前只处理反引号（原始实现也只用 /^```/），
// 所以波浪号围栏不在支持范围内，光标在其中应返回 null。

const tildeFence = [
	'~~~js',
	'const x = 1;',
	'~~~',
];

describe('detectCodeBlockFromLines — 波浪号围栏（不支持）', () => {
	it('光标在波浪号围栏内，返回 null（未支持）', () => {
		expect(detectCodeBlockFromLines(tildeFence, 1, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});
});
