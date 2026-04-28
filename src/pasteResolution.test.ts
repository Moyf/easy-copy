import { describe, it, expect } from 'vitest';
import { decidePasteResolution, PasteResolutionInput, shouldRegisterPasteHandler } from './pasteResolution';
import { CopyMetadata } from './copyMetadata';
import { LinkFormat } from './type';

describe('shouldRegisterPasteHandler', () => {
	it('returns true when toggle is on AND linkFormat is OBSIDIAN', () => {
		expect(shouldRegisterPasteHandler({
			resolveLinkPathOnPaste: true,
			linkFormat: LinkFormat.OBSIDIAN,
		})).toBe(true);
	});

	it('returns false when toggle is off', () => {
		expect(shouldRegisterPasteHandler({
			resolveLinkPathOnPaste: false,
			linkFormat: LinkFormat.OBSIDIAN,
		})).toBe(false);
	});

	it('returns false when linkFormat is MDLINK even if toggle is on', () => {
		expect(shouldRegisterPasteHandler({
			resolveLinkPathOnPaste: true,
			linkFormat: LinkFormat.MDLINK,
		})).toBe(false);
	});

	it('returns false when linkFormat is WIKILINK even if toggle is on', () => {
		expect(shouldRegisterPasteHandler({
			resolveLinkPathOnPaste: true,
			linkFormat: LinkFormat.WIKILINK,
		})).toBe(false);
	});

	it('returns false when both conditions fail', () => {
		expect(shouldRegisterPasteHandler({
			resolveLinkPathOnPaste: false,
			linkFormat: LinkFormat.MDLINK,
		})).toBe(false);
	});
});

const META: CopyMetadata = {
	clipboardText: '[[note#Heading]]',
	sourceFilePath: 'notes/note.md',
	subpath: '#Heading',
	alias: 'Heading',
	isEmbed: false,
	timestamp: 1_000_000,
};

const TTL = 5 * 60 * 1000;

const baseInput: PasteResolutionInput = {
	defaultPrevented: false,
	resolveLinkPathOnPaste: true,
	linkFormat: LinkFormat.OBSIDIAN,
	lastCopyMeta: META,
	clipboardText: META.clipboardText,
	now: META.timestamp + 1000,
	ttlMs: TTL,
};

describe('decidePasteResolution', () => {
	it('returns rewrite when all guards pass', () => {
		expect(decidePasteResolution(baseInput)).toBe('rewrite');
	});

	it('skips when another handler already preventDefault\'d', () => {
		expect(decidePasteResolution({ ...baseInput, defaultPrevented: true })).toBe('skip');
	});

	it('skips when the toggle is off', () => {
		expect(decidePasteResolution({ ...baseInput, resolveLinkPathOnPaste: false })).toBe('skip');
	});

	it('skips when linkFormat is not OBSIDIAN', () => {
		expect(decidePasteResolution({ ...baseInput, linkFormat: LinkFormat.MDLINK })).toBe('skip');
		expect(decidePasteResolution({ ...baseInput, linkFormat: LinkFormat.WIKILINK })).toBe('skip');
	});

	it('skips when there is no lastCopyMeta', () => {
		expect(decidePasteResolution({ ...baseInput, lastCopyMeta: null })).toBe('skip');
	});

	it('resets and skips when meta is older than TTL', () => {
		expect(decidePasteResolution({
			...baseInput,
			now: META.timestamp + TTL + 1,
		})).toBe('reset-and-skip');
	});

	it('does not consider meta stale at exactly the TTL boundary', () => {
		expect(decidePasteResolution({
			...baseInput,
			now: META.timestamp + TTL,
		})).toBe('rewrite');
	});

	it('resets and skips when clipboard text differs from copied text', () => {
		expect(decidePasteResolution({
			...baseInput,
			clipboardText: 'something else entirely',
		})).toBe('reset-and-skip');
	});

	it('resets and skips when clipboard text is undefined', () => {
		expect(decidePasteResolution({
			...baseInput,
			clipboardText: undefined,
		})).toBe('reset-and-skip');
	});

	it('defaultPrevented takes precedence over toggle and other state', () => {
		expect(decidePasteResolution({
			...baseInput,
			defaultPrevented: true,
			resolveLinkPathOnPaste: false,
			lastCopyMeta: null,
		})).toBe('skip');
	});

	it('toggle takes precedence over linkFormat and meta state', () => {
		expect(decidePasteResolution({
			...baseInput,
			resolveLinkPathOnPaste: false,
			linkFormat: LinkFormat.MDLINK,
			lastCopyMeta: null,
		})).toBe('skip');
	});

	it('TTL check runs before clipboard match', () => {
		// Stale meta with mismatched clipboard text — TTL should fire first,
		// resulting in reset-and-skip either way, but staleness is the cause.
		expect(decidePasteResolution({
			...baseInput,
			now: META.timestamp + TTL + 1,
			clipboardText: 'mismatch',
		})).toBe('reset-and-skip');
	});
});
