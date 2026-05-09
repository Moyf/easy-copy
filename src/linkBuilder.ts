import { LinkFormat } from './type';

// --- URL 编码 ---

export function encodeMarkdownLinkUrl(url: string): string {
	return url.replace(/ /g, '%20');
}

// --- 去除 Wiki 链接外层括号 ---

/**
 * 去除字符串外层的 [[…]]。当从编辑器中捕获的「标题」本身已是
 * 一个 wiki 链接引用时使用。
 */
export function stripWikiBrackets(s: string): string {
	if (s.startsWith('[[') && s.endsWith(']]')) return s.slice(2, -2);
	return s;
}

// --- 标题净化 ---

/**
 * 净化标题文本，使其可作为链接目标。
 *
 * Obsidian 的 [[ 自动补全在生成标题链接目标时，会出乎意料地
 * 直接「剥除」# | ^ : %% [[ ]] 等字符（连同周围的空白），
 * 用单个空格替换，而不是 URL 编码。Obsidian 对这些字符的
 * URL 编码支持并不可靠。
 *
 * 参考：https://help.obsidian.md/Linking+notes+and+files/Internal+links
 */
export function sanitizeHeadingForLink(heading: string): string {
	return heading
		.replace(/\s*(?:%%|\[\[|]]|[#|^:])\s*/g, ' ')
		.replace(/ {2,}/g, ' ')
		.trim();
}

// --- 标题链接 ---

export interface BuildHeadingLinkOptions {
	heading: string;
	filename: string;
	frontmatterTitle?: string;
	linkFormat: LinkFormat;
	useHeadingAsDisplayText: boolean;
	headingLinkSeparator: string;
	strictHeadingMatch?: boolean;
	simplifiedHeadingToNoteLink: boolean;
}

export interface BuildHeadingLinkResult {
	link: string;
	isNoteLink: boolean;
}

interface ComputeDisplayTextOptions {
	heading: string;
	filename: string;
	frontmatterTitle?: string;
	useHeadingAsDisplayText: boolean;
	headingLinkSeparator: string;
}

function computeDisplayText(o: ComputeDisplayTextOptions): string {
	if (o.useHeadingAsDisplayText) return o.heading;
	const separator = o.headingLinkSeparator || '#';
	const filenameOrTitle = o.frontmatterTitle || o.filename;
	return `${filenameOrTitle}${separator}${o.heading}`;
}

interface ShouldSimplifyHeadingOptions {
	simplifiedHeadingToNoteLink: boolean;
	useHeadingAsDisplayText: boolean;
	selectedHeading: string;
	filename: string;
	strictHeadingMatch?: boolean;
}

/**
 * 判断是否触发提前简化分支（linkContent → filename，isNoteLink → true）。
 *
 * 受 useHeadingAsDisplayText 约束：当用户希望显示文本是「文件名#标题」时，
 * 若把目标的标题锚点丢掉，会出现「显示承诺一个标题链接、但目标其实只是
 * 文件链接」的错位。WIKI 精确匹配（filename === heading）的特例由
 * 调度层另行处理，不受该约束。
 */
function shouldSimplifyHeading(o: ShouldSimplifyHeadingOptions): boolean {
	if (!o.simplifiedHeadingToNoteLink) return false;
	if (!o.useHeadingAsDisplayText) return false;
	if (!o.selectedHeading) return false;

	const compareIgnoreCase = (a: string, b: string): boolean =>
		o.strictHeadingMatch
			? a.toLowerCase() === b.toLowerCase()
			: a.toLowerCase() === b.toLowerCase() || a.toLowerCase().includes(b.toLowerCase());

	return (
		o.filename === o.selectedHeading ||
		compareIgnoreCase(o.filename, o.selectedHeading) ||
		compareIgnoreCase(o.filename, o.selectedHeading.replace(/\s+/g, ''))
	);
}

interface FormatWikiHeadingLinkOptions {
	linkContent: string;
	displayText: string;
	wikiExactMatch: boolean;
}

function formatWikiHeadingLink(o: FormatWikiHeadingLinkOptions): string {
	if (o.wikiExactMatch || o.displayText === o.linkContent) {
		return `[[${o.linkContent}]]`;
	}
	return `[[${o.linkContent}|${o.displayText}]]`;
}

interface FormatMarkdownHeadingLinkOptions {
	linkContent: string;
	displayText: string;
}

function formatMarkdownHeadingLink(o: FormatMarkdownHeadingLinkOptions): string {
	return `[${o.displayText}](${encodeMarkdownLinkUrl(o.linkContent)})`;
}

export function buildHeadingLink(options: BuildHeadingLinkOptions): BuildHeadingLinkResult {
	const selectedHeading = stripWikiBrackets(options.heading);

	const displayText = computeDisplayText({
		heading: selectedHeading,
		filename: options.filename,
		frontmatterTitle: options.frontmatterTitle,
		useHeadingAsDisplayText: options.useHeadingAsDisplayText,
		headingLinkSeparator: options.headingLinkSeparator,
	});

	const simplify = shouldSimplifyHeading({
		simplifiedHeadingToNoteLink: options.simplifiedHeadingToNoteLink,
		useHeadingAsDisplayText: options.useHeadingAsDisplayText,
		selectedHeading,
		filename: options.filename,
		strictHeadingMatch: options.strictHeadingMatch,
	});

	// A1.5 例外：WIKI 精确匹配（filename === heading）无论
	// useHeadingAsDisplayText 如何，都简化为 [[filename]]——
	// Obsidian 渲染时 [[filename]] 直接显示为文件名，干净利落。
	// 该策略由调度层持有，使各个格式化函数保持为纯字符串生成器。
	const wikiExactMatch =
		options.linkFormat === LinkFormat.WIKILINK &&
		options.simplifiedHeadingToNoteLink &&
		options.filename === selectedHeading;

	const isNoteLink = simplify || wikiExactMatch;
	const linkContent = isNoteLink
		? options.filename
		: `${options.filename}#${sanitizeHeadingForLink(selectedHeading)}`;

	const link = options.linkFormat === LinkFormat.WIKILINK
		? formatWikiHeadingLink({ linkContent, displayText, wikiExactMatch })
		: formatMarkdownHeadingLink({ linkContent, displayText });

	return { link, isNoteLink };
}

// --- 块显示文本 ---

export function extractBlockDisplayText(
	firstLine: string,
	blockId: string,
	wordLimit: number,
	charLimit: number,
): string {
	let text = firstLine;
	// 先去掉结尾的 ^ 及其后面的内容（如果有的话）
	text = text.replace(/\^.*\s*$/, '');
	text = text.trim().replace(/- \[.\]\s+/, '').replace('- ', '').replace(/=|\*|\[|\]|\(|\)|`|>\s+/g, '');

	if (!text) return blockId;

	// 判断是否是纯英文，如果是纯英文（以及英文常用标点符号），提取前几个单词；否则，按下面的逻辑处理
	// 根据 ASCII 来判断"英文"
	const isEnglish = /^[a-zA-Z\s,.!?"()[\]_^-~:;0-9]*$/.test(text);

	if (isEnglish) {
		const limit = wordLimit || 3;
		return text.trim().split(' ').slice(0, limit).join(' ');
	}

	// CJK / 非英文语言
	const limit = charLimit || 5;

	if (text.length > limit) {
		const separated = text.trim().match(/(\S+?)[~,.\-=[，。？！…：\n\s]/);
		const tempText = separated ? separated[1] : text;

		if (tempText.length > limit) {
			return tempText.slice(0, limit) + '...';
		} else if (tempText.length < 3) {
			return text.slice(0, limit);
		} else {
			return tempText;
		}
	}

	return text;
}

// --- 块链接 ---

export interface BuildBlockLinkOptions {
	blockId: string;
	filename: string;
	useBrief: boolean;
	firstLine: string;
	linkFormat: LinkFormat;
	autoBlockDisplayText: boolean;
	autoEmbedBlockLink: boolean;
	blockDisplayWordLimit: number;
	blockDisplayCharLimit: number;
}

export function buildBlockLink(options: BuildBlockLinkOptions): string {
	const {
		blockId, filename, useBrief, firstLine,
		linkFormat, autoBlockDisplayText, autoEmbedBlockLink,
		blockDisplayWordLimit, blockDisplayCharLimit,
	} = options;

	let displayText = blockId;
	if (useBrief && firstLine) {
		displayText = extractBlockDisplayText(firstLine, blockId, blockDisplayWordLimit, blockDisplayCharLimit);
	}

	let link: string;

	if (autoBlockDisplayText) {
		link = linkFormat === LinkFormat.WIKILINK
			? `[[${filename}#^${blockId}|${displayText}]]`
			: `[${displayText}](${encodeMarkdownLinkUrl(filename)}#^${blockId})`; // markdown 格式不能加 ^，不然会变成内联脚注语法 [^xxx]
	} else {
		link = linkFormat === LinkFormat.WIKILINK
			? `[[${filename}#^${blockId}]]`
			: `[](${encodeMarkdownLinkUrl(filename)}#^${blockId})`;
	}

	// 自动生成嵌入块
	if (autoEmbedBlockLink) {
		link = '!' + link;
	}

	return link;
}

// --- 明确格式的粘贴链接 ---
//
// 当用户明确选择 Wiki / Markdown（而非「跟随 Obsidian 设置」）时，
// 粘贴处理器会调用此函数。Obsidian 的 app.fileManager.generateMarkdownLink
// 会遵循 vault 的 useMarkdownLinks 配置，会覆盖用户的明确格式选择——
// 因此这里改为手动拼接链接，路径部分由 app.metadataCache.fileToLinktext
// 预先解析。
//
// 纯字符串生成器：是否省略 alias 由调用方通过 shouldOmitAliasForSameFile
// 决定，本函数只消费该布尔值——Strategy 模式：调用方持有策略，
// 格式化函数只负责语法。

export interface BuildExplicitPasteLinkOptions {
	format: LinkFormat.WIKILINK | LinkFormat.MDLINK;
	path: string;       // 来自 fileToLinktext（vault 内最短唯一路径）
	subpath: string;    // '#Heading'、'#^blockid' 或 ''
	alias: string;      // 显示文本，或 ''
	sameFile: boolean;  // sourcePath === destPath——同文件粘贴时去掉路径段
	omitAlias: boolean; // true → 渲染时省略 alias（由调用方决定）
}

export function buildExplicitPasteLink(opts: BuildExplicitPasteLinkOptions): string {
	const linkTarget = opts.sameFile ? opts.subpath : `${opts.path}${opts.subpath}`;
	const aliasToUse = opts.omitAlias ? '' : opts.alias;

	if (opts.format === LinkFormat.WIKILINK) {
		return aliasToUse ? `[[${linkTarget}|${aliasToUse}]]` : `[[${linkTarget}]]`;
	}
	// MDLINK——alias 就是用户看到的链接文本。当 omitAlias 把它清空时，
	// 用原始 alias 作为显示文本，避免出现 [](path#H) 这样的空显示链接。
	const display = aliasToUse || opts.alias || '';
	return `[${display}](${encodeMarkdownLinkUrl(linkTarget)})`;
}

// --- 文件链接 ---

export interface BuildFileLinkOptions {
	filename: string;
	filePath: string;
	displayText?: string;
	linkFormat: LinkFormat;
}

export function buildFileLink(options: BuildFileLinkOptions): string {
	const { filename, linkFormat } = options;
	const display = options.displayText || filename;

	if (linkFormat === LinkFormat.WIKILINK) {
		return `[[${filename}|${display}]]`;
	}

	let path = options.filePath.replace(/\\/g, '/');
	if (path.endsWith('.md')) path = path.slice(0, -3);
	return `[${display}](${encodeMarkdownLinkUrl(path)})`;
}
