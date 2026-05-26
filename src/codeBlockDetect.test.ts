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
// 因此 ```` 内的 ``` 是开始围栏或结束围栏（看它是否纯反引号）。
//
// 新语义：返回光标所在的最内层块。
//
// 场景 A：4 个反引号包裹一个完整的 3 反引号代码块
//   行0: ````markdown   ← 外层开始围栏
//   行1: ```js           ← 内层开始围栏（带 info string）
//   行2: console.log("hi")
//   行3: ```             ← 内层结束围栏（纯 ```，关闭内层）
//   行4: ````            ← 外层结束围栏
//
// 光标在行2 → 在内层块（行1~3）内，match = console.log("hi")
// 光标在行1 → 在内层块的开始围栏上 → null（不算块内）
// 光标在行3 → 内层结束围栏，pop 后在外层块内；但行3 >= 内层 fenceEnd → 属于外层内容
//             外层 fenceStart=0, fenceEnd=4, cursorLine=3 < 4 → 在外层块内

const nestedThreeInFour = lines(
	'````markdown\n' +
	'```js\n' +
	'console.log("hi")\n' +
	'```\n' +
	'````'
);

describe('detectCodeBlockFromLines — 嵌套：4个反引号包裹3个反引号', () => {
	it('光标在内层代码内容行（行2），应识别为内层块内，match 仅内层内容', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
		expect(result!.match).toBe('console.log("hi")');
	});

	it('光标在内层结束围栏行（行3），pop 出内层后在外层块内，应识别为外层块内', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 3, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
		// 在外层块内，match 包含行1~3
		expect(result!.match).toBe('```js\nconsole.log("hi")\n```');
	});

	it('光标在内层开始围栏行（行1），恰好在内层 fenceStart 上，返回 null', () => {
		// 行1 是内层块的开始围栏行，fenceStart === cursorLine → null
		expect(detectCodeBlockFromLines(nestedThreeInFour, 1, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在外层开始围栏行（行0），不应识别为块内', () => {
		expect(detectCodeBlockFromLines(nestedThreeInFour, 0, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在外层结束围栏行（行4），不应识别为块内', () => {
		expect(detectCodeBlockFromLines(nestedThreeInFour, 4, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('COPY_WITH_FENCES：光标在行2（内层块内），返回内层围栏的完整内容', () => {
		const result = detectCodeBlockFromLines(nestedThreeInFour, 2, CodeBlockBehavior.COPY_WITH_FENCES);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('```js\nconsole.log("hi")\n```');
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
// 行1 的 ```` 后面跟了文字 → 是内层块的开始围栏（push 进栈）
// 行2 普通内容 → 在内层块内（fenceStart=1）
// 行3 的 ``` 长度3 >= 内层 openLen 4？不，3 < 4，不满足 isClosingFence → 不关闭内层
//   但行3 也满足 isClosingFence(line, 3)（它本身是3个纯反引号） → 先检查外层？不，
//   此时栈顶是内层（openLen=4），行3 的 3 < 4 → 不关闭内层，也不是内层的结束围栏
//   → 继续扫描，内层未闭合 → 光标在行2 时内层的阶段二找不到结束围栏 → null
//
// 注意：这个场景本质上是"内层块未闭合"，行3 的 ``` 关闭的是外层（但我们先进入内层）
// 实际上是个格式有歧义的文档。新实现的行为是：
//   光标在行1 → 在内层 fenceStart 上 → null
//   光标在行2 → 在内层块内，但内层找不到结束围栏（行3 不够长）→ null

const threeWithLongerContentLine = lines(
	'```\n' +
	'````这行是内容\n' +
	'普通内容\n' +
	'```'
);

describe('detectCodeBlockFromLines — 内容行含更长反引号但带文字（内层开始围栏）', () => {
	it('光标在行1（````带文字，被视为内层开始围栏行），返回 null（在围栏行上）', () => {
		// 行1 是内层块的 fenceStart，fenceStart === cursorLine → null
		expect(detectCodeBlockFromLines(threeWithLongerContentLine, 1, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在行2（在内层块内，但内层未闭合），返回 null', () => {
		// 内层 openLen=4，行3 的 ``` 长度3 < 4，无法关闭内层 → 未闭合 → null
		expect(detectCodeBlockFromLines(threeWithLongerContentLine, 2, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});
});

// ─── 嵌套：外层用更长的围栏包裹内层 ``` ──────────────────────────────────────
//
// 文档结构（行号）：
//   0: ````markdown   ← 外层开始围栏（4个）
//   1: ```js           ← 内层开始围栏（3个，带 info string）
//   2: console.log("hi")
//   3: ```             ← 内层结束围栏（3个纯反引号，关闭内层）
//   4: ````            ← 外层结束围栏（4个）
//
// 光标在行2 → 最内层块（行1~3），match = console.log("hi")
// 光标在行1 → 内层 fenceStart → null
// 光标在行3 → 内层结束后在外层块内，外层 match = 行1~3

const nestedFence = [
	'````markdown',
	'```js',
	'console.log("hi")',
	'```',
	'````',
];

describe('detectCodeBlockFromLines — 嵌套围栏（外长内短）', () => {
	it('光标在内层 ``` 内容行（行2），应识别为内层块，match 仅内层内容', () => {
		const result = detectCodeBlockFromLines(nestedFence, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.type).toBe(ContextType.CODEBLOCK);
		expect(result!.match).toBe('console.log("hi")');
	});

	it('COPY_CONTENT：光标在行2，match 仅内层内容（不含外层围栏）', () => {
		const result = detectCodeBlockFromLines(nestedFence, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result!.match).toBe('console.log("hi")');
	});

	it('COPY_WITH_FENCES：光标在行2，返回内层围栏的完整块', () => {
		const result = detectCodeBlockFromLines(nestedFence, 2, CodeBlockBehavior.COPY_WITH_FENCES);
		expect(result!.match).toBe('```js\nconsole.log("hi")\n```');
	});

	it('光标在内层开始围栏行（行1），在内层 fenceStart 上，返回 null', () => {
		expect(detectCodeBlockFromLines(nestedFence, 1, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在内层结束围栏行（行3），pop 出内层后在外层块内，识别为外层块', () => {
		const result = detectCodeBlockFromLines(nestedFence, 3, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('```js\nconsole.log("hi")\n```');
	});

	it('光标在外层开始围栏行（行0），返回 null', () => {
		expect(detectCodeBlockFromLines(nestedFence, 0, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在外层结束围栏行（行4），返回 null', () => {
		expect(detectCodeBlockFromLines(nestedFence, 4, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});
});

// ─── 嵌套：5个反引号包裹含 ```` 开始/结束围栏 ────────────────────────────────
//
//   0: `````            ← 外层开始（5个）
//   1: ````js           ← 内层开始（4个，带 info string）
//   2: code here
//   3: ````             ← 内层结束（4个纯反引号，关闭内层）
//   4: `````            ← 外层结束（5个）
//
// 光标在行2 → 最内层块（行1~3），match = "code here"
// 光标在行1 → 在内层 fenceStart 上 → null
// 光标在行3 → 内层结束后在外层块内，match = 行1~3

const deepNested = [
	'`````',
	'````js',
	'code here',
	'````',
	'`````',
];

describe('detectCodeBlockFromLines — 5个反引号嵌套', () => {
	it('光标在行2（内层内容），识别为内层块内，match 仅内层内容', () => {
		const result = detectCodeBlockFromLines(deepNested, 2, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('code here');
	});

	it('光标在行1（内层开始围栏行），返回 null', () => {
		expect(detectCodeBlockFromLines(deepNested, 1, CodeBlockBehavior.COPY_CONTENT)).toBeNull();
	});

	it('光标在行3（内层结束围栏），pop 后在外层块内，识别为外层块', () => {
		const result = detectCodeBlockFromLines(deepNested, 3, CodeBlockBehavior.COPY_CONTENT);
		expect(result).not.toBeNull();
		expect(result!.match).toBe('````js\ncode here\n````');
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
