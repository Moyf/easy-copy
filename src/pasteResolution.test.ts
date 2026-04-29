import { describe, it, expect } from 'vitest';
import {
	decidePasteResolution,
	PasteResolutionInput,
	shouldOmitAliasForSameFile,
	shouldRegisterPasteHandler,
} from './pasteResolution';
import { CopyMetadata } from './copyMetadata';
import { LinkFormat } from './type';

describe('shouldRegisterPasteHandler', () => {
	it('returns true when toggle is on', () => {
		expect(shouldRegisterPasteHandler({ resolveLinkPathOnPaste: true })).toBe(true);
	});

	it('returns false when toggle is off', () => {
		expect(shouldRegisterPasteHandler({ resolveLinkPathOnPaste: false })).toBe(false);
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

	it('toggle takes precedence over meta state', () => {
		expect(decidePasteResolution({
			...baseInput,
			resolveLinkPathOnPaste: false,
			lastCopyMeta: null,
		})).toBe('skip');
	});

	it('TTL check runs before clipboard match', () => {
		// 过期的 meta 加上不匹配的剪贴板文本——TTL 检查会先触发，
		// 两种情况下结果都是 reset-and-skip，但根因是过期。
		expect(decidePasteResolution({
			...baseInput,
			now: META.timestamp + TTL + 1,
			clipboardText: 'mismatch',
		})).toBe('reset-and-skip');
	});
});

describe('shouldOmitAliasForSameFile', () => {
	const sameFile = 'notes/SomeThing.md';
	const otherFile = 'notes/MyNote.md';

	const base = {
		effectiveLinkFormat: LinkFormat.WIKILINK,
		sourceFilePath: sameFile,
		destFilePath: sameFile,
		subpath: '#Other Heading',
		alias: 'Other Heading',
		useHeadingAsDisplayText: true,
	};

	it('omits when WIKI + same-file + heading subpath matches alias (sanitized)', () => {
		expect(shouldOmitAliasForSameFile(base)).toBe(true);
	});

	it('keeps alias when WIKI + same-file but alias does not match heading', () => {
		expect(shouldOmitAliasForSameFile({ ...base, alias: 'Different' })).toBe(false);
	});

	it('keeps alias when useHeadingAsDisplayText is false', () => {
		expect(shouldOmitAliasForSameFile({
			...base,
			useHeadingAsDisplayText: false,
			alias: 'SomeThing#Other Heading',
		})).toBe(false);
	});

	it('keeps alias on cross-file paste (WIKI)', () => {
		expect(shouldOmitAliasForSameFile({ ...base, destFilePath: otherFile })).toBe(false);
	});

	it('keeps alias for MD format even on same-file', () => {
		expect(shouldOmitAliasForSameFile({ ...base, effectiveLinkFormat: LinkFormat.MDLINK })).toBe(false);
	});

	it('keeps alias when subpath is empty', () => {
		expect(shouldOmitAliasForSameFile({ ...base, subpath: '' })).toBe(false);
	});

	it('keeps alias when alias is empty', () => {
		expect(shouldOmitAliasForSameFile({ ...base, alias: '' })).toBe(false);
	});

	it('keeps alias on block-link subpath (#^id)', () => {
		expect(shouldOmitAliasForSameFile({
			...base,
			subpath: '#^abc123',
			alias: 'The quick brown',
		})).toBe(false);
	});

	it('omits when sanitization round-trip collapses alias to subpath', () => {
		// alias 中的 | 会被 sanitizeHeadingForLink 折叠为空格
		expect(shouldOmitAliasForSameFile({
			...base,
			subpath: '#Some Heading',
			alias: 'Some|Heading',
		})).toBe(true);
	});

	it('keeps alias when OBSIDIAN is passed (helper expects already-resolved format)', () => {
		// 防御性检查：调用方不应在此传入 OBSIDIAN；
		// 即使误传，本函数也会安全地返回 false。
		expect(shouldOmitAliasForSameFile({ ...base, effectiveLinkFormat: LinkFormat.OBSIDIAN })).toBe(false);
	});
});
