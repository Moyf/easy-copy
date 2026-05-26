import { CodeBlockBehavior, ContextData, ContextType } from './type';

/**
 * 解析一行是否为有效的反引号围栏行，返回围栏长度；否则返回 0。
 * trimStart 后开头必须是 3 个或更多连续反引号。
 */
function parseFenceLength(line: string): number {
	const trimmed = line.trimStart();
	const match = trimmed.match(/^(`{3,})/);
	if (!match) return 0;
	return match[1].length;
}

/**
 * 判断某行是否为有效的结束围栏：
 * 反引号数量 >= minLen，且反引号后面只有空白。
 */
function isClosingFence(line: string, minLen: number): boolean {
	const trimmed = line.trimStart();
	const match = trimmed.match(/^(`+)\s*$/);
	if (!match) return false;
	return match[1].length >= minLen;
}

/**
 * 纯函数版本的代码块检测，符合 CommonMark 嵌套围栏规则：
 *   - 开始围栏：3 个或更多连续反引号，后可跟 info string
 *   - 结束围栏：反引号数量 >= 开始围栏，且行内只有空白
 *   - 内层较短的围栏不会关闭外层较长的围栏（如 ```` 内的 ``` 是内容）
 *
 * 当前只处理反引号围栏；波浪号 ~~~ 不在支持范围内。
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

	// 阶段一：从文件开头向下扫描到 cursorLine。
	// openLen = 0 → 不在块内；openLen > 0 → 在块内，值为开始围栏的反引号数。
	//
	// 不在块内时：遇到有效围栏行（parseFenceLength >= 3）→ 进入块
	// 在块内时：遇到 isClosingFence（长度 >= openLen 且纯反引号）→ 离开块
	//           其他反引号行（内层短围栏 / 带 info string）→ 忽略，视为内容

	let openLen = 0;
	let fenceStart = -1;

	for (let i = 0; i <= cursorLine; i++) {
		if (openLen === 0) {
			const len = parseFenceLength(lines[i]);
			if (len > 0) {
				openLen = len;
				fenceStart = i;
			}
		} else {
			if (isClosingFence(lines[i], openLen)) {
				openLen = 0;
				fenceStart = -1;
			}
		}
	}

	// 光标不在任何代码块内
	if (openLen === 0) return null;
	if (fenceStart === -1) return null;
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
	// 光标必须在两个围栏之间（不含两端）
	if (cursorLine >= fenceEnd) return null;

	if (behavior === CodeBlockBehavior.GENERATE_BLOCK_LINK) return null;

	// 收集代码块内容行（不含围栏行）
	const contentLines: string[] = [];
	for (let i = fenceStart + 1; i < fenceEnd; i++) {
		contentLines.push(lines[i]);
	}

	const curLineText = lines[cursorLine];

	if (behavior === CodeBlockBehavior.COPY_WITH_FENCES) {
		const fullBlock = [lines[fenceStart], ...contentLines, lines[fenceEnd]].join('\n');
		return { type: ContextType.CODEBLOCK, curLine: curLineText, match: fullBlock, range: null };
	}

	// 默认 COPY_CONTENT
	return { type: ContextType.CODEBLOCK, curLine: curLineText, match: contentLines.join('\n'), range: null };
}
