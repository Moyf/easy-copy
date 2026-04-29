import { LinkFormat } from './type';

// --- URL Encoding ---

export function encodeMarkdownLinkUrl(url: string): string {
	return url.replace(/ /g, '%20');
}

// --- Wiki Bracket Stripping ---

/**
 * Strip outer [[…]] from a string. Used when a heading captured from
 * the editor is itself a wiki-link reference.
 */
export function stripWikiBrackets(s: string): string {
	if (s.startsWith('[[') && s.endsWith(']]')) return s.slice(2, -2);
	return s;
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
 * Whether the early simplification block fires (linkContent → filename, isNoteLink → true).
 *
 * Gated on useHeadingAsDisplayText: when the user wants "filename#heading" in the
 * display, dropping the heading anchor would produce a misleading link where the
 * display text promises a heading the target doesn't deliver. The WIKI exact-match
 * special case (filename === heading) is handled separately and is exempt.
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

	// A1.5 exception: WIKI exact match (filename === heading) collapses to
	// [[filename]] regardless of useHeadingAsDisplayText, since [[filename]]
	// renders cleanly as just the filename in Obsidian. Owned by the
	// orchestrator so formatters stay pure string-producers.
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
