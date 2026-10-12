import { extractBlockDisplayText, sanitizeHeadingForLink, stripWikiBrackets } from './linkBuilder';

export interface CopyMetadata {
	clipboardText: string;
	sourceFilePath: string;
	subpath: string;
	alias: string;
	isEmbed: boolean;
	timestamp: number;
}

export interface BuildBlockCopyMetadataInput {
	clipboardText: string;
	sourceFilePath: string;
	blockId: string;
	useBrief: boolean;
	/** 块的完整文本（可多行，行尾块 ID 会被清理） */
	blockText: string;
	autoBlockDisplayText: boolean;
	autoEmbedBlockLink: boolean;
	blockDisplayWordLimit: number;
	blockDisplayCharLimit: number;
}

export function buildBlockCopyMetadata(input: BuildBlockCopyMetadataInput): CopyMetadata {
	const {
		clipboardText,
		sourceFilePath,
		blockId,
		useBrief,
		blockText,
		autoBlockDisplayText,
		autoEmbedBlockLink,
		blockDisplayWordLimit,
		blockDisplayCharLimit,
	} = input;

	let alias = blockId;
	if (useBrief && blockText) {
		alias = extractBlockDisplayText(blockText, blockId, blockDisplayWordLimit, blockDisplayCharLimit);
	}
	if (!autoBlockDisplayText) {
		alias = '';
	}

	return {
		clipboardText,
		sourceFilePath,
		subpath: `#^${blockId}`,
		alias,
		isEmbed: autoEmbedBlockLink,
		timestamp: Date.now(),
	};
}

export interface BuildHeadingCopyMetadataInput {
	clipboardText: string;
	sourceFilePath: string;
	heading: string;
	filename: string;
	frontmatterTitle?: string;
	useHeadingAsDisplayText: boolean;
	headingLinkSeparator: string;
	isNoteLink: boolean;
}

export function buildHeadingCopyMetadata(input: BuildHeadingCopyMetadataInput): CopyMetadata {
	const {
		clipboardText,
		sourceFilePath,
		heading: rawHeading,
		filename,
		frontmatterTitle,
		useHeadingAsDisplayText,
		headingLinkSeparator,
		isNoteLink,
	} = input;

	const heading = stripWikiBrackets(rawHeading);

	let alias = heading;
	if (!useHeadingAsDisplayText) {
		const separator = headingLinkSeparator || '#';
		const filenameOrTitle = frontmatterTitle || filename;
		alias = `${filenameOrTitle}${separator}${heading}`;
	}
	if (isNoteLink && filename === heading) {
		alias = '';
	}

	return {
		clipboardText,
		sourceFilePath,
		subpath: isNoteLink ? '' : `#${sanitizeHeadingForLink(heading)}`,
		alias,
		isEmbed: false,
		timestamp: Date.now(),
	};
}

export interface BuildFileCopyMetadataInput {
	clipboardText: string;
	sourceFilePath: string;
	displayText?: string;
}

export function buildFileCopyMetadata(input: BuildFileCopyMetadataInput): CopyMetadata {
	return {
		clipboardText: input.clipboardText,
		sourceFilePath: input.sourceFilePath,
		subpath: '',
		alias: input.displayText || '',
		isEmbed: false,
		timestamp: Date.now(),
	};
}
