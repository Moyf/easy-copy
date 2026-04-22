import { describe, it, expect } from 'vitest';
import { buildBlockCopyMetadata, buildHeadingCopyMetadata, buildFileCopyMetadata } from './copyMetadata';

// ---------------------------------------------------------------------------
// buildBlockCopyMetadata
// ---------------------------------------------------------------------------

describe('buildBlockCopyMetadata', () => {
	const base = {
		clipboardText: '[[note#^abc123]]',
		sourceFilePath: 'notes/note.md',
		blockId: 'abc123',
		useBrief: false,
		firstLine: '',
		autoBlockDisplayText: true,
		autoEmbedBlockLink: false,
		blockDisplayWordLimit: 5,
		blockDisplayCharLimit: 50,
	};

	it('passes through clipboardText and sourceFilePath', () => {
		const meta = buildBlockCopyMetadata(base);
		expect(meta.clipboardText).toBe('[[note#^abc123]]');
		expect(meta.sourceFilePath).toBe('notes/note.md');
	});

	it('builds subpath as #^<blockId>', () => {
		const meta = buildBlockCopyMetadata(base);
		expect(meta.subpath).toBe('#^abc123');
	});

	it('defaults alias to the blockId when useBrief is false', () => {
		const meta = buildBlockCopyMetadata(base);
		expect(meta.alias).toBe('abc123');
	});

	it('uses extracted display text when useBrief + firstLine are set', () => {
		const meta = buildBlockCopyMetadata({
			...base,
			useBrief: true,
			firstLine: 'The quick brown fox jumps over the lazy dog',
			blockDisplayWordLimit: 4,
		});
		// extractBlockDisplayText truncates to the word limit
		expect(meta.alias).not.toBe('abc123');
		expect(meta.alias.length).toBeGreaterThan(0);
	});

	it('keeps blockId alias when useBrief is true but firstLine is empty', () => {
		const meta = buildBlockCopyMetadata({ ...base, useBrief: true, firstLine: '' });
		expect(meta.alias).toBe('abc123');
	});

	it('clears alias when autoBlockDisplayText is false', () => {
		const meta = buildBlockCopyMetadata({ ...base, autoBlockDisplayText: false });
		expect(meta.alias).toBe('');
	});

	it('clears alias even when useBrief would otherwise populate it', () => {
		const meta = buildBlockCopyMetadata({
			...base,
			useBrief: true,
			firstLine: 'Some long first line of content here',
			autoBlockDisplayText: false,
		});
		expect(meta.alias).toBe('');
	});

	it('sets isEmbed from autoEmbedBlockLink', () => {
		expect(buildBlockCopyMetadata({ ...base, autoEmbedBlockLink: true }).isEmbed).toBe(true);
		expect(buildBlockCopyMetadata({ ...base, autoEmbedBlockLink: false }).isEmbed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// buildHeadingCopyMetadata
// ---------------------------------------------------------------------------

describe('buildHeadingCopyMetadata', () => {
	const base = {
		clipboardText: '[[note#Heading]]',
		sourceFilePath: 'notes/note.md',
		heading: 'Heading',
		filename: 'note',
		useHeadingAsDisplayText: true,
		headingLinkSeparator: '#',
		isNoteLink: false,
	};

	it('passes through clipboardText and sourceFilePath', () => {
		const meta = buildHeadingCopyMetadata(base);
		expect(meta.clipboardText).toBe('[[note#Heading]]');
		expect(meta.sourceFilePath).toBe('notes/note.md');
	});

	it('uses heading as alias by default', () => {
		const meta = buildHeadingCopyMetadata(base);
		expect(meta.alias).toBe('Heading');
	});

	it('strips [[ ]] wrapper from the heading', () => {
		const meta = buildHeadingCopyMetadata({ ...base, heading: '[[Wrapped Heading]]' });
		expect(meta.alias).toBe('Wrapped Heading');
		expect(meta.subpath).toBe('#Wrapped Heading');
	});

	it('builds subpath via sanitizeHeadingForLink', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			heading: 'Test | If # This ^ Heading : Works',
		});
		expect(meta.subpath).toBe('#Test If This Heading Works');
	});

	it('uses filename + separator + heading when useHeadingAsDisplayText is false', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			useHeadingAsDisplayText: false,
		});
		expect(meta.alias).toBe('note#Heading');
	});

	it('honors custom separator', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			useHeadingAsDisplayText: false,
			headingLinkSeparator: ' > ',
		});
		expect(meta.alias).toBe('note > Heading');
	});

	it('falls back to "#" when separator is empty', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			useHeadingAsDisplayText: false,
			headingLinkSeparator: '',
		});
		expect(meta.alias).toBe('note#Heading');
	});

	it('prefers frontmatter title over filename', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			useHeadingAsDisplayText: false,
			frontmatterTitle: 'Fancy Title',
		});
		expect(meta.alias).toBe('Fancy Title#Heading');
	});

	it('empty subpath when isNoteLink is true', () => {
		const meta = buildHeadingCopyMetadata({ ...base, isNoteLink: true });
		expect(meta.subpath).toBe('');
	});

	it('clears alias when isNoteLink and filename === heading', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			heading: 'note',
			isNoteLink: true,
		});
		expect(meta.alias).toBe('');
	});

	it('keeps alias when isNoteLink but filename !== heading', () => {
		const meta = buildHeadingCopyMetadata({
			...base,
			heading: 'Note',
			filename: 'note',
			isNoteLink: true,
		});
		expect(meta.alias).toBe('Note');
	});

	it('isEmbed is always false for headings', () => {
		expect(buildHeadingCopyMetadata(base).isEmbed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// buildFileCopyMetadata
// ---------------------------------------------------------------------------

describe('buildFileCopyMetadata', () => {
	it('uses displayText as alias when provided', () => {
		const meta = buildFileCopyMetadata({
			clipboardText: '[[note|Custom]]',
			sourceFilePath: 'notes/note.md',
			displayText: 'Custom',
		});
		expect(meta.alias).toBe('Custom');
	});

	it('sets alias to empty string when displayText is undefined', () => {
		const meta = buildFileCopyMetadata({
			clipboardText: '[[note]]',
			sourceFilePath: 'notes/note.md',
		});
		expect(meta.alias).toBe('');
	});

	it('sets alias to empty string when displayText is an empty string', () => {
		const meta = buildFileCopyMetadata({
			clipboardText: '[[note]]',
			sourceFilePath: 'notes/note.md',
			displayText: '',
		});
		expect(meta.alias).toBe('');
	});

	it('always has empty subpath and isEmbed=false', () => {
		const meta = buildFileCopyMetadata({
			clipboardText: '[[note]]',
			sourceFilePath: 'notes/note.md',
			displayText: 'x',
		});
		expect(meta.subpath).toBe('');
		expect(meta.isEmbed).toBe(false);
	});

	it('passes through clipboardText and sourceFilePath', () => {
		const meta = buildFileCopyMetadata({
			clipboardText: '[[a/b/c]]',
			sourceFilePath: 'a/b/c.md',
		});
		expect(meta.clipboardText).toBe('[[a/b/c]]');
		expect(meta.sourceFilePath).toBe('a/b/c.md');
	});
});
