import { CopyMetadata } from './copyMetadata';
import { sanitizeHeadingForLink } from './linkBuilder';
import { EasyCopySettings, LinkFormat } from './type';

/**
 * 根据当前设置判断是否需要注册 editor-paste 处理器。
 * 即设置状态与「Easy Copy 是否处于粘贴插件链中」之间的桥梁。
 */
export function shouldRegisterPasteHandler(
	settings: Pick<EasyCopySettings, 'resolveLinkPathOnPaste'>,
): boolean {
	return settings.resolveLinkPathOnPaste;
}

export type PasteResolutionAction =
	| 'skip'           // 什么都不做，保留 lastCopyMeta 不变
	| 'reset-and-skip' // 清空 lastCopyMeta，再让粘贴流程继续
	| 'rewrite';       // 重新生成链接并替换粘贴内容

export interface PasteResolutionInput {
	defaultPrevented: boolean;
	resolveLinkPathOnPaste: boolean;
	lastCopyMeta: CopyMetadata | null;
	clipboardText: string | undefined;
	now: number;
	ttlMs: number;
}

export function decidePasteResolution(input: PasteResolutionInput): PasteResolutionAction {
	if (input.defaultPrevented) return 'skip';
	if (!input.resolveLinkPathOnPaste) return 'skip';
	if (!input.lastCopyMeta) return 'skip';
	if (input.now - input.lastCopyMeta.timestamp > input.ttlMs) return 'reset-and-skip';
	if (input.clipboardText !== input.lastCopyMeta.clipboardText) return 'reset-and-skip';
	return 'rewrite';
}

export interface ShouldOmitAliasInput {
	effectiveLinkFormat: LinkFormat;
	sourceFilePath: string;
	destFilePath: string;
	subpath: string;
	alias: string;
	useHeadingAsDisplayText: boolean;
}

/**
 * 判断粘贴时的 alias 是否冗余、应当省略。
 *
 * 同文件标题 wiki 粘贴时，链接渲染本就只显示标题文本——
 * `[[#Heading]]` 会显示为「Heading」，无需额外的 alias。
 * 跨文件 wiki 粘贴必须保留 alias（否则 Obsidian 会显示成
 * 「Filename > Heading」）。Markdown 粘贴永远需要 alias，
 * 因为 alias 就是用户看到的链接文本。
 * 块链接不在本预判范围内：其简短 alias 永远不会与 `#^id`
 * 字面量相同，且块链接有自己的显示设置。
 */
export function shouldOmitAliasForSameFile(input: ShouldOmitAliasInput): boolean {
	if (input.effectiveLinkFormat !== LinkFormat.WIKILINK) return false;
	if (input.sourceFilePath !== input.destFilePath) return false;
	if (!input.subpath || !input.alias) return false;
	if (!input.useHeadingAsDisplayText) return false;
	if (input.subpath.startsWith('#^')) return false;
	return input.subpath === `#${sanitizeHeadingForLink(input.alias)}`;
}
