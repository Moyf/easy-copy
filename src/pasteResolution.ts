import { CopyMetadata } from './copyMetadata';
import { sanitizeHeadingForLink } from './linkBuilder';
import { EasyCopySettings, LinkFormat } from './type';

/**
 * Whether the editor-paste handler should be registered for the given settings.
 * The bridge between settings state and "is Easy Copy in the paste plugin chain."
 */
export function shouldRegisterPasteHandler(
	settings: Pick<EasyCopySettings, 'resolveLinkPathOnPaste'>,
): boolean {
	return settings.resolveLinkPathOnPaste;
}

export type PasteResolutionAction =
	| 'skip'           // do nothing, leave lastCopyMeta as-is
	| 'reset-and-skip' // null out lastCopyMeta, do nothing else
	| 'rewrite';       // proceed to regenerate and substitute the link

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
 * Whether a paste-time alias is redundant and should be dropped.
 *
 * Same-file wiki heading pastes naturally render as just the heading
 * text — `[[#Heading]]` displays "Heading" without a separate alias.
 * Cross-file wiki pastes need the alias (Obsidian otherwise renders
 * "Filename > Heading"). Markdown pastes always need the alias since
 * it IS the visible link text. Block links are out of scope: their
 * brief alias never matches the `#^id` literal and has its own setting.
 */
export function shouldOmitAliasForSameFile(input: ShouldOmitAliasInput): boolean {
	if (input.effectiveLinkFormat !== LinkFormat.WIKILINK) return false;
	if (input.sourceFilePath !== input.destFilePath) return false;
	if (!input.subpath || !input.alias) return false;
	if (!input.useHeadingAsDisplayText) return false;
	if (input.subpath.startsWith('#^')) return false;
	return input.subpath === `#${sanitizeHeadingForLink(input.alias)}`;
}
