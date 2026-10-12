/**
 * 块文本提取的纯函数实现。
 *
 * 与 detectCodeBlockFromLines 相同的模式：main.ts 里的方法只做薄封装，
 * 把「从行数组中走出光标所在 block」的逻辑隔离出来，便于单元测试。
 */

/** 列表项的起始行（`- ` / `* ` / `+ ` / `1. ` / `1) `），即一个新 block 的开头。入参应已 trim。 */
export function isListItemStart(trimmedLine: string): boolean {
	return /^(?:[-*+]|\d+[.)])\s/.test(trimmedLine);
}

/** ATX 标题行（`#`~`######` 后跟空格）。行首的 `#tag` 是内联标签，不算标题。入参应已 trim。 */
function isHeadingLine(trimmedLine: string): boolean {
	return /^#{1,6}\s/.test(trimmedLine);
}

/**
 * 剥离行尾的块 ID。块 ID 前必须有空白（或独占一行）才是真正的 ID——
 * 行尾的 2^10 这类插入语不能被当作块 ID 去掉。
 */
export function stripTrailingBlockId(line: string): string {
	return line.replace(/(?:^|\s+)\^[a-zA-Z0-9_-]+\s*$/, '');
}

/** 有效的一行连续文本：非空、非标题行、非 `- ` 列表项。 */
function isContinuousText(line: string): boolean {
	const trimmed = line.trim();
	return trimmed !== '' && !isHeadingLine(trimmed) && !trimmed.startsWith('- ');
}

/**
 * 取出行数组中 cursorLine 所在 block 的完整文本：向上走到 block 的第一行
 * （列表项行或段落开头），向下延伸到所有软换行的后续行；每行去掉行尾的
 * 块 ID 后用换行拼接。显示文本由 extractBlockDisplayText 合并为一行
 * （换行 → 空格），这样多行块的链接别名不再被截断成单独一行。
 * 每个列表项（含有序列表）都是独立的 block，所以列表项行是边界。
 * 表格/代码块/数学块等非纯文本块返回空字符串——调用方会回退到
 * 块 ID 作为显示文本（与旧版对这类块的兜底行为一致）。
 */
export function getBlockTextFromLines(lines: string[], cursorLine: number): string {
	// 独立成行的块 ID（与内容隔一个空行）属于上面那个 block——
	// 先跳回上面的 block 再展开，别名才能取到真正的块内容
	if (
		cursorLine >= 2 &&
		/^\^[a-zA-Z0-9_-]+$/.test(lines[cursorLine].trim()) &&
		lines[cursorLine - 1].trim() === '' &&
		lines[cursorLine - 2].trim() !== ''
	) {
		cursorLine -= 2;
	}
	let start = cursorLine;
	while (start > 0) {
		const line = lines[start].trim();
		if (line === '' || isListItemStart(line) || isHeadingLine(line)) {
			break; // 本行自己就是 block 的开头
		}
		const prev = lines[start - 1].trim();
		if (prev === '' || isHeadingLine(prev)) {
			break; // 上一行是空行或标题：本行是段落开头
		}
		start--;
	}
	let end = start;
	// 标题自成一个（单行）block，不向下延伸
	const startIsHeading = isHeadingLine(lines[start].trim());
	while (
		!startIsHeading &&
		end < lines.length - 1 &&
		isContinuousText(lines[end + 1]) &&
		!isListItemStart(lines[end + 1].trim())
	) {
		end++;
	}
	const blockLines: string[] = [];
	for (let i = start; i <= end; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		// 围栏代码块（``` 和 ~~~）、表格、数学块不做文本展开，回退到块 ID
		if (trimmed.startsWith('|') || trimmed.startsWith('```') || trimmed.startsWith('~~~') || trimmed.startsWith('$$')) {
			return '';
		}
		blockLines.push(stripTrailingBlockId(line));
	}
	return blockLines.join('\n');
}
