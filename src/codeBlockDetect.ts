import { CodeBlockBehavior, ContextData, ContextType } from './type';

function parseFenceLength(line: string): number {
	const trimmed = line.trimStart();
	const match = trimmed.match(/^(`{3,})/);
	if (!match) return 0;
	return match[1].length;
}

function isClosingFence(line: string, minLen: number): boolean {
	const trimmed = line.trimStart();
	const match = trimmed.match(/^(`+)\s*$/);
	if (!match) return false;
	return match[1].length >= minLen;
}

/**
 * 纯函数版本的代码块检测。
 *
 * 符合 CommonMark 规范的围栏规则：
 *   - 开始围栏：3 个或更多连续反引号，后可跟 info string
 *   - 结束围栏：反引号数量 >= 开始围栏长度，且行内只有空白
 *
 * 嵌套语义：返回光标所在的**最内层**围栏块。
 *   例如 ```` 包裹 ``` 时，光标在内层 ``` 的内容行 → 返回内层块；
 *   光标在内层的围栏行上（属于外层内容）→ 返回外层块。
 *
 * 注意：仅处理反引号围栏，波浪号 ~~~ 不在支持范围内。
 *
 * @param lines      文件所有行（按行号索引）
 * @param cursorLine 光标所在行号（0-based）
 * @param behavior   代码块行为设置
 * @returns ContextData（命中代码块）或 null
 */
export function detectCodeBlockFromLines(
	lines: string[],
	cursorLine: number,
	behavior: CodeBlockBehavior,
): ContextData | null {
	if (behavior === CodeBlockBehavior.DISABLED) return null;

	const totalLines = lines.length;

	// 阶段一：用栈追踪嵌套层级，找到光标所在的最内层开始围栏。
	//
	// 栈为空（不在任何块内）：
	//   遇到有效围栏行（parseFenceLength >= 3）→ push 进栈
	// 栈非空（在某块内）：
	//   遇到满足 isClosingFence（长度 >= 栈顶 openLen 的纯反引号行）→ pop
	//   遇到带 info string 的围栏行（不是结束围栏）→ push（进入内层块）
	//   遇到短于 openLen 的纯反引号行 → 视为内容，忽略

	const stack: Array<{ fenceStart: number; openLen: number }> = [];

	for (let i = 0; i <= cursorLine; i++) {
		const len = parseFenceLength(lines[i]);
		if (len === 0) continue;

		if (stack.length === 0) {
			stack.push({ fenceStart: i, openLen: len });
		} else {
			const { openLen } = stack[stack.length - 1];
			if (isClosingFence(lines[i], openLen)) {
				// 满足关闭当前层的条件
				stack.pop();
			} else if (!isClosingFence(lines[i], len)) {
				// 有反引号开头，但后面跟了 info string（不是纯围栏行）
				// → 内层块的开始围栏
				stack.push({ fenceStart: i, openLen: len });
			}
			// 其他情况：纯反引号行但长度不足以关闭当前层 → 内容，忽略
		}
	}

	if (stack.length === 0) return null;

	const { fenceStart, openLen } = stack[stack.length - 1];

	// 光标正好在开始围栏行上，不算「块内」
	if (fenceStart === cursorLine) return null;

	// 阶段二：从 fenceStart+1 向下找匹配的结束围栏
	let fenceEnd = -1;
	for (let i = fenceStart + 1; i < totalLines; i++) {
		if (isClosingFence(lines[i], openLen)) {
			fenceEnd = i;
			break;
		}
	}
	if (fenceEnd === -1) return null;
	if (cursorLine >= fenceEnd) return null;

	if (behavior === CodeBlockBehavior.GENERATE_BLOCK_LINK) return null;

	const contentLines: string[] = [];
	for (let i = fenceStart + 1; i < fenceEnd; i++) {
		contentLines.push(lines[i]);
	}

	const curLineText = lines[cursorLine];

	if (behavior === CodeBlockBehavior.COPY_WITH_FENCES) {
		const fullBlock = [lines[fenceStart], ...contentLines, lines[fenceEnd]].join('\n');
		return { type: ContextType.CODEBLOCK, curLine: curLineText, match: fullBlock, range: null };
	}

	return { type: ContextType.CODEBLOCK, curLine: curLineText, match: contentLines.join('\n'), range: null };
}
