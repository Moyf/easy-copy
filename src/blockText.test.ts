import { describe, it, expect } from 'vitest';
import { getBlockTextFromLines, stripTrailingBlockId, isListItemStart } from './blockText';

describe('isListItemStart', () => {
	it('recognizes bullet, asterisk, plus and ordered markers', () => {
		expect(isListItemStart('- item')).toBe(true);
		expect(isListItemStart('* item')).toBe(true);
		expect(isListItemStart('+ item')).toBe(true);
		expect(isListItemStart('1. item')).toBe(true);
		expect(isListItemStart('1) item')).toBe(true);
	});

	it('rejects non-marker lines and glued markers', () => {
		expect(isListItemStart('plain text')).toBe(false);
		expect(isListItemStart('-item')).toBe(false);
		expect(isListItemStart('1.item')).toBe(false);
	});
});

describe('stripTrailingBlockId', () => {
	it('strips a whitespace-separated trailing block id', () => {
		expect(stripTrailingBlockId('some text ^abc123')).toBe('some text');
	});

	it('strips a standalone block id line entirely', () => {
		expect(stripTrailingBlockId('^abc123')).toBe('');
	});

	it('keeps a mid-line caret expression intact', () => {
		expect(stripTrailingBlockId('value is 2^10 here')).toBe('value is 2^10 here');
	});

	it('keeps an end-of-line caret expression intact (block ids need a separator)', () => {
		expect(stripTrailingBlockId('the result is 2^10')).toBe('the result is 2^10');
		expect(stripTrailingBlockId('text^abc')).toBe('text^abc');
	});
});

describe('getBlockTextFromLines', () => {
	it('returns the whole soft-wrapped paragraph when the cursor is in the middle', () => {
		const lines = ['first line', 'second line', 'third line'];
		expect(getBlockTextFromLines(lines, 1)).toBe('first line\nsecond line\nthird line');
	});

	it('stops at blank lines in both directions', () => {
		const lines = ['para one a', 'para one b', '', 'para two'];
		expect(getBlockTextFromLines(lines, 1)).toBe('para one a\npara one b');
		expect(getBlockTextFromLines(lines, 3)).toBe('para two');
	});

	it('includes the bullet line when the cursor is on a soft-wrapped continuation', () => {
		const lines = ['- parent item', '  continuation', 'next para'];
		// `next para` 是列表项段落的 lazy continuation，仍属于同一个 block
		expect(getBlockTextFromLines(lines, 1)).toBe('- parent item\n  continuation\nnext para');
	});

	it('treats a nested list item as its own block', () => {
		const lines = ['- parent', '  - child', '  - sibling'];
		expect(getBlockTextFromLines(lines, 1)).toBe('  - child');
	});

	it('treats every ordered list item as its own block', () => {
		const lines = ['1. first', '2. second', '3. third'];
		expect(getBlockTextFromLines(lines, 1)).toBe('2. second');
	});

	it('keeps a heading as a single-line block and strips its id', () => {
		const lines = ['## Intro ^abc123', 'para below'];
		expect(getBlockTextFromLines(lines, 0)).toBe('## Intro');
	});

	it('does not treat a line-start tag as a heading boundary', () => {
		// `#tag` 是内联标签，不打断段落
		const lines = ['intro line', '#tag somewhere', 'more text'];
		expect(getBlockTextFromLines(lines, 2)).toBe('intro line\n#tag somewhere\nmore text');
	});

	it('still treats real headings as boundaries', () => {
		const lines = ['para', '# Heading', 'other'];
		expect(getBlockTextFromLines(lines, 0)).toBe('para');
	});

	it('starts the block below a heading, not at the heading itself', () => {
		const lines = ['# Title', 'para one', 'para two'];
		expect(getBlockTextFromLines(lines, 2)).toBe('para one\npara two');
	});

	it('jumps back to the block above a gap-separated standalone id line', () => {
		const lines = ['content line', '', '^abc123'];
		expect(getBlockTextFromLines(lines, 2)).toBe('content line');
	});

	it('returns empty for a standalone id line without content above', () => {
		expect(getBlockTextFromLines(['^abc123'], 0)).toBe('');
	});

	it('returns empty for table blocks', () => {
		const lines = ['| a | b |', '| c | d |'];
		expect(getBlockTextFromLines(lines, 0)).toBe('');
	});

	it('returns empty for fenced code blocks', () => {
		const lines = ['```js', 'const x = 1;', '```'];
		expect(getBlockTextFromLines(lines, 1)).toBe('');
	});

	it('returns empty for tilde-fenced code blocks', () => {
		const lines = ['~~~', 'code', '~~~'];
		expect(getBlockTextFromLines(lines, 1)).toBe('');
	});

	it('returns empty for indented fences inside list items', () => {
		const lines = ['- item', '  ```js', '  code', '  ```'];
		expect(getBlockTextFromLines(lines, 2)).toBe('');
	});

	it('returns empty for math blocks', () => {
		const lines = ['$$', 'x = y', '$$'];
		expect(getBlockTextFromLines(lines, 1)).toBe('');
	});

	it('strips trailing block ids from every line of the block', () => {
		const lines = ['- first part ^abc', '  second part ^def-456'];
		expect(getBlockTextFromLines(lines, 0)).toBe('- first part\n  second part');
	});
});
