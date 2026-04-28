import { CopyMetadata } from './copyMetadata';
import { EasyCopySettings, LinkFormat } from './type';

/**
 * Whether the editor-paste handler should be registered for the given settings.
 * The bridge between settings state and "is Easy Copy in the paste plugin chain."
 */
export function shouldRegisterPasteHandler(
	settings: Pick<EasyCopySettings, 'resolveLinkPathOnPaste' | 'linkFormat'>,
): boolean {
	return settings.resolveLinkPathOnPaste && settings.linkFormat === LinkFormat.OBSIDIAN;
}

export type PasteResolutionAction =
	| 'skip'           // do nothing, leave lastCopyMeta as-is
	| 'reset-and-skip' // null out lastCopyMeta, do nothing else
	| 'rewrite';       // proceed to regenerate and substitute the link

export interface PasteResolutionInput {
	defaultPrevented: boolean;
	resolveLinkPathOnPaste: boolean;
	linkFormat: LinkFormat;
	lastCopyMeta: CopyMetadata | null;
	clipboardText: string | undefined;
	now: number;
	ttlMs: number;
}

export function decidePasteResolution(input: PasteResolutionInput): PasteResolutionAction {
	if (input.defaultPrevented) return 'skip';
	if (!input.resolveLinkPathOnPaste) return 'skip';
	if (input.linkFormat !== LinkFormat.OBSIDIAN) return 'skip';
	if (!input.lastCopyMeta) return 'skip';
	if (input.now - input.lastCopyMeta.timestamp > input.ttlMs) return 'reset-and-skip';
	if (input.clipboardText !== input.lastCopyMeta.clipboardText) return 'reset-and-skip';
	return 'rewrite';
}
