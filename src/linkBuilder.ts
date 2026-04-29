import { LinkFormat } from './type';

// --- URL Encoding ---

export function encodeMarkdownLinkUrl(url: string): string {
	return url.replace(/ /g, '%20');
}

// --- Heading Sanitization ---

/**
 * Sanitize heading text for use in link targets.
 *
 * Obsidian's [[ autocomplete surprisingly strips # | ^ : %% [[ ]] from
 * heading link targets rather than URL-encoding them, replacing each
 * occurrence (and any surrounding whitespace) with a single space.
 * URL-encoding these characters does not work reliably in Obsidian.
 *
 * See: https://help.obsidian.md/Linking+notes+and+files/Internal+links
 */
export function sanitizeHeadingForLink(heading: string): string {
	return heading
		.replace(/\s*(?:%%|\[\[|]]|[#|^:])\s*/g, ' ')
		.replace(/ {2,}/g, ' ')
		.trim();
}

// --- Heading Link ---

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

export function buildHeadingLink(options: BuildHeadingLinkOptions): BuildHeadingLinkResult {
	const { filename, linkFormat, useHeadingAsDisplayText, headingLinkSeparator, strictHeadingMatch, simplifiedHeadingToNoteLink } = options;
	const filenameOrTitle = options.frontmatterTitle || filename;

	// 提取标题文本和级别
	// 如果内容是[[内容]]，移除[[]]
	let selectedHeading = options.heading;
	if (selectedHeading.startsWith('[[') && selectedHeading.endsWith(']]')) {
		selectedHeading = selectedHeading.slice(2, -2);
	}

	// 根据设置决定显示文本
	let displayText = selectedHeading;
	if (!useHeadingAsDisplayText) {
		// 如果不使用标题作为显示文本，则使用"文件名{连接符}标题名"格式
		const separator = headingLinkSeparator || '#';
		displayText = `${filenameOrTitle}${separator}${selectedHeading}`;
	}

	const sanitizedHeading = sanitizeHeadingForLink(selectedHeading);
	let linkContent = `${filename}#${sanitizedHeading}`;
	let isNoteLink = false;

	const compareIgnoreCase = (a: string, b: string): boolean =>
		strictHeadingMatch
			? a.toLowerCase() === b.toLowerCase()
			: a.toLowerCase() === b.toLowerCase() || a.toLowerCase().includes(b.toLowerCase());

	// 特殊情况：如果文件名包含标题，则不添加指向标题的 # 部分
	// 我自己的情况——会把 SomeThing 给拆成 Some Thing 来做标题，所以也考虑空格替换的部分
	// Also gated on useHeadingAsDisplayText: when the user wants "filename#heading" in the
	// display, dropping the heading anchor here would produce a misleading
	// [filename#heading](filename) — display promises a heading link the target doesn't deliver.
	// The WIKI exact-match special case below is exempt — [[filename]] renders cleanly.
	if (
		simplifiedHeadingToNoteLink &&
		useHeadingAsDisplayText &&
		selectedHeading &&
		(filename === selectedHeading ||
		compareIgnoreCase(filename, selectedHeading) ||
		compareIgnoreCase(filename, selectedHeading.replace(/\s+/g, '')))
	) {
		linkContent = filename;
		isNoteLink = true;
	}

	let link = '';

	// 根据设置选择链接格式
	if (linkFormat === LinkFormat.WIKILINK) {
		// Wiki链接格式
		if (simplifiedHeadingToNoteLink && filename === selectedHeading) {
			// 特殊情况：当文件名与标题相同时，直接链接到文件
			link = `[[${filename}]]`;
			isNoteLink = true;
		} else {
			if (displayText === linkContent) {
				// 特殊情况：当显示文本与 "文件名#标题" 相同时，省略显示文本
				link = `[[${linkContent}]]`;
			} else {
				link = `[[${linkContent}|${displayText}]]`;
			}
		}
	} else {
		// Markdown链接格式 — linkContent already reflects note-link simplification
		// (set to filename when simplifiedHeadingToNoteLink fires above), so a matching
		// filename/heading collapses [foo](foo#foo) → [foo](foo).
		link = `[${displayText}](${encodeMarkdownLinkUrl(linkContent)})`;
	}

	return { link, isNoteLink };
}

// --- Block Display Text ---

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

// --- Block Link ---

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

// --- Explicit Paste Link ---
//
// Used by the paste handler when the user has explicitly chosen Wiki/Markdown
// (not "Follow Obsidian settings"). Obsidian's app.fileManager.generateMarkdownLink
// honors the vault's useMarkdownLinks config which would override an explicit
// choice — so we build the link manually instead, with the path string already
// resolved by app.metadataCache.fileToLinktext.
//
// Pure string-producer: the caller decides `omitAlias` via shouldOmitAliasForSameFile.
// Formatter only consumes the flag — Strategy: caller owns policy, formatter owns syntax.

export interface BuildExplicitPasteLinkOptions {
	format: LinkFormat.WIKILINK | LinkFormat.MDLINK;
	path: string;       // from fileToLinktext (shortest unique vault path)
	subpath: string;    // '#Heading' or '#^blockid' or ''
	alias: string;      // display text or ''
	sameFile: boolean;  // sourcePath === destPath — drops path portion
	omitAlias: boolean; // true → render without alias (caller decision)
}

export function buildExplicitPasteLink(opts: BuildExplicitPasteLinkOptions): string {
	const linkTarget = opts.sameFile ? opts.subpath : `${opts.path}${opts.subpath}`;
	const aliasToUse = opts.omitAlias ? '' : opts.alias;

	if (opts.format === LinkFormat.WIKILINK) {
		return aliasToUse ? `[[${linkTarget}|${aliasToUse}]]` : `[[${linkTarget}]]`;
	}
	// MDLINK — alias IS the visible link text. When omitAlias forces it empty,
	// preserve the original alias as display so we never produce [](path#H).
	const display = aliasToUse || opts.alias || '';
	return `[${display}](${encodeMarkdownLinkUrl(linkTarget)})`;
}

// --- File Link ---

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
