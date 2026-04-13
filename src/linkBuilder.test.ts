import { describe, it, expect } from 'vitest';
import { buildHeadingLink, buildBlockLink, buildFileLink, extractBlockDisplayText, encodeMarkdownLinkUrl } from './linkBuilder';
import { LinkFormat } from './type';

// ---------------------------------------------------------------------------
// encodeMarkdownLinkUrl
// ---------------------------------------------------------------------------

describe('encodeMarkdownLinkUrl', () => {
	it('encodes spaces as %20', () => {
		expect(encodeMarkdownLinkUrl('My Note')).toBe('My%20Note');
	});

	it('encodes multiple spaces', () => {
		expect(encodeMarkdownLinkUrl('a b c')).toBe('a%20b%20c');
	});

	it('returns string unchanged when no spaces', () => {
		expect(encodeMarkdownLinkUrl('MyNote#Heading')).toBe('MyNote#Heading');
	});

	it('does not encode other special characters', () => {
		expect(encodeMarkdownLinkUrl('Note#Head^id')).toBe('Note#Head^id');
	});
});

// ---------------------------------------------------------------------------
// buildHeadingLink
// ---------------------------------------------------------------------------

describe('buildHeadingLink', () => {
	const defaults = {
		linkFormat: LinkFormat.WIKILINK,
		useHeadingAsDisplayText: true,
		headingLinkSeparator: '#',
	};

	// -- Wiki format ---------------------------------------------------------

	describe('wiki format', () => {
		it('creates a basic heading link with display text', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Getting Started',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#Getting Started|Getting Started]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('simplifies to [[filename]] when heading equals filename exactly', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'MyNote',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('simplifies linkContent when heading matches filename case-insensitively', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'mynote',
				filename: 'MyNote',
			});
			// linkContent simplified to filename, but since filename !== heading,
			// it falls to the else branch with displayText vs linkContent
			expect(result.link).toBe('[[MyNote|mynote]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('simplifies when heading matches filename with spaces removed', () => {
			// e.g. filename "SomeThing" heading "Some Thing"
			const result = buildHeadingLink({
				...defaults,
				heading: 'Some Thing',
				filename: 'SomeThing',
			});
			expect(result.link).toBe('[[SomeThing|Some Thing]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('omits display text alias when displayText equals linkContent', () => {
			// When useHeadingAsDisplayText is false AND separator is '#',
			// displayText = "filename#heading" which equals linkContent
			const result = buildHeadingLink({
				...defaults,
				heading: 'Intro',
				filename: 'MyNote',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: '#',
			});
			expect(result.link).toBe('[[MyNote#Intro]]');
		});

		it('includes alias when using non-default separator', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Intro',
				filename: 'MyNote',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: ' > ',
			});
			expect(result.link).toBe('[[MyNote#Intro|MyNote > Intro]]');
		});

		it('uses frontmatter title in display text when heading-as-display is off', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Setup',
				filename: 'my-note',
				frontmatterTitle: 'My Note',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: '#',
			});
			// displayText = "My Note#Setup", linkContent = "my-note#Setup"
			expect(result.link).toBe('[[my-note#Setup|My Note#Setup]]');
		});

		it('strips [[ ]] wrapper from heading', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: '[[Inner Link]]',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#Inner Link|Inner Link]]');
		});

		it('falls back separator to # when headingLinkSeparator is empty', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Intro',
				filename: 'MyNote',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: '',
			});
			expect(result.link).toBe('[[MyNote#Intro]]');
		});
	});

	// -- Markdown format ------------------------------------------------------

	describe('markdown format', () => {
		const md = { ...defaults, linkFormat: LinkFormat.MDLINK };

		it('creates a basic markdown heading link', () => {
			const result = buildHeadingLink({
				...md,
				heading: 'Getting Started',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[Getting Started](MyNote#Getting%20Started)');
		});

		it('always includes #heading even when filename matches heading', () => {
			const result = buildHeadingLink({
				...md,
				heading: 'MyNote',
				filename: 'MyNote',
			});
			// Markdown format always uses filename#heading; no spaces so no encoding
			expect(result.link).toBe('[MyNote](MyNote#MyNote)');
			expect(result.isNoteLink).toBe(true);
		});

		it('uses filename+separator+heading when heading-as-display is off', () => {
			const result = buildHeadingLink({
				...md,
				heading: 'Intro',
				filename: 'MyNote',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: ' - ',
			});
			// Display text is not encoded, only the URL portion is
			expect(result.link).toBe('[MyNote - Intro](MyNote#Intro)');
		});

		it('uses frontmatter title in display text', () => {
			const result = buildHeadingLink({
				...md,
				heading: 'Setup',
				filename: 'my-note',
				frontmatterTitle: 'My Note',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: '#',
			});
			// No spaces in filename or heading, so no encoding needed
			expect(result.link).toBe('[My Note#Setup](my-note#Setup)');
		});
	});

	// -- compareIgnoreCase `includes` behavior --------------------------------
	// BUG: compareIgnoreCase uses filename.includes(heading), which causes
	// false-positive note-link simplification when the filename merely contains
	// the heading as a substring. Should be fixed in a future PR (invert these
	// tests when fixing).

	describe('filename-heading substring matching (known bug)', () => {
		it('false-positive: simplifies when filename contains heading as substring', () => {
			// BUG: "JavaScript".includes("Java") → true, incorrectly simplifies.
			// Expected correct behavior: should NOT simplify (not an exact or
			// derived-name match).
			const result = buildHeadingLink({
				...defaults,
				heading: 'Java',
				filename: 'JavaScript',
			});
			expect(result.link).toBe('[[JavaScript|Java]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('does NOT simplify when heading contains filename as substring', () => {
			// The includes check is directional: filename.includes(heading)
			// "Note".includes("Notebook") → false
			const result = buildHeadingLink({
				...defaults,
				heading: 'Notebook',
				filename: 'Note',
			});
			expect(result.link).toBe('[[Note#Notebook|Notebook]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('false-positive: simplifies on space-removed substring match', () => {
			// BUG: "SomeThingElse".includes("SomeThing") → true, incorrectly
			// simplifies. The intended behavior (SomeThing/Some Thing) works,
			// but non-exact substring matches like this are false positives.
			const result = buildHeadingLink({
				...defaults,
				heading: 'Some Thing',
				filename: 'SomeThingElse',
			});
			expect(result.link).toBe('[[SomeThingElse|Some Thing]]');
			expect(result.isNoteLink).toBe(true);
		});
	});

	// -- Combinatorial --------------------------------------------------------

	describe('combinatorial', () => {
		it('frontmatterTitle has no effect when useHeadingAsDisplayText is true', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Setup',
				filename: 'my-note',
				frontmatterTitle: 'My Custom Title',
				useHeadingAsDisplayText: true,
			});
			// Display text is the heading, not the frontmatter title
			expect(result.link).toBe('[[my-note#Setup|Setup]]');
		});

		it('frontmatterTitle + note-link simplification (wiki)', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'myNote',
				filename: 'MyNote',
				frontmatterTitle: 'My Pretty Title',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: '#',
			});
			// linkContent simplified to "MyNote", display = "My Pretty Title#myNote"
			expect(result.link).toBe('[[MyNote|My Pretty Title#myNote]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('empty heading triggers false note-link simplification (known bug)', () => {
			// BUG: ''.includes('') is always true in JS, so compareIgnoreCase
			// falsely matches any filename. Should produce a heading link with
			// an empty fragment instead. Fix alongside compareIgnoreCase in a
			// future PR.
			const result = buildHeadingLink({
				...defaults,
				heading: '',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote|]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('markdown format URL-encodes spaces in link URL', () => {
			const result = buildHeadingLink({
				...defaults,
				linkFormat: LinkFormat.MDLINK,
				heading: 'My Heading',
				filename: 'My Note',
			});
			expect(result.link).toBe('[My Heading](My%20Note#My%20Heading)');
		});
	});
});

// ---------------------------------------------------------------------------
// extractBlockDisplayText
// ---------------------------------------------------------------------------

describe('extractBlockDisplayText', () => {
	describe('text cleaning', () => {
		it('removes block ID suffix (^...)', () => {
			const result = extractBlockDisplayText('Some text ^abc123', 'fallback', 3, 5);
			expect(result).toBe('Some text');
		});

		it('removes checkbox prefix (- [x] )', () => {
			const result = extractBlockDisplayText('- [x] Task done', 'fallback', 3, 5);
			expect(result).toBe('Task done');
		});

		it('removes list prefix (- )', () => {
			const result = extractBlockDisplayText('- List item here today', 'fallback', 3, 5);
			expect(result).toBe('List item here');
		});

		it('removes markdown syntax characters', () => {
			const result = extractBlockDisplayText('**bold** and `code`', 'fallback', 5, 5);
			expect(result).toBe('bold and code');
		});

		it('returns blockId for empty/whitespace-only text', () => {
			expect(extractBlockDisplayText('', 'myId', 3, 5)).toBe('myId');
			expect(extractBlockDisplayText('   ', 'myId', 3, 5)).toBe('myId');
		});

		it('removes callout prefix (> )', () => {
			const result = extractBlockDisplayText('> Some quoted text here', 'fallback', 3, 5);
			expect(result).toBe('Some quoted text');
		});
	});

	describe('English text', () => {
		it('extracts first 3 words by default', () => {
			const result = extractBlockDisplayText('The quick brown fox jumps', 'fallback', 3, 5);
			expect(result).toBe('The quick brown');
		});

		it('respects custom word limit', () => {
			const result = extractBlockDisplayText('The quick brown fox jumps', 'fallback', 5, 5);
			expect(result).toBe('The quick brown fox jumps');
		});

		it('handles text with fewer words than limit', () => {
			const result = extractBlockDisplayText('Hello world', 'fallback', 3, 5);
			expect(result).toBe('Hello world');
		});

		it('handles single word', () => {
			const result = extractBlockDisplayText('Hello', 'fallback', 3, 5);
			expect(result).toBe('Hello');
		});

		it('defaults word limit to 3 if zero is passed', () => {
			const result = extractBlockDisplayText('one two three four', 'fallback', 0, 5);
			expect(result).toBe('one two three');
		});
	});

	describe('CJK text', () => {
		it('returns text as-is when within char limit', () => {
			const result = extractBlockDisplayText('Hello', 'fallback', 3, 5);
			// "Hello" is ASCII / English, so it hits the English branch
			expect(result).toBe('Hello');
		});

		it('truncates with ellipsis when text exceeds char limit and no separator found', () => {
			const result = extractBlockDisplayText('这是一段很长的中文文本没有标点', 'fallback', 3, 5);
			expect(result).toBe('这是一段很...');
		});

		it('uses punctuation as separator when match is 3+ chars', () => {
			// '三个字' is 3 chars (>= 3 and <= charLimit), so separator match is used
			const result = extractBlockDisplayText('三个字，后面还有很多内容', 'fallback', 3, 5);
			expect(result).toBe('三个字');
		});

		it('falls back to char limit slice when separator match is too short (< 3 chars)', () => {
			// '短语' is 2 chars (< 3), falls back to text.slice(0, charLimit)
			const result = extractBlockDisplayText('短语，后面还有很多内容', 'fallback', 3, 5);
			expect(result).toBe('短语，后面');
		});

		it('returns full text when within char limit', () => {
			const result = extractBlockDisplayText('短い文', 'fallback', 3, 5);
			expect(result).toBe('短い文');
		});

		it('defaults char limit to 5 if zero is passed', () => {
			const result = extractBlockDisplayText('这是一段很长的中文文本', 'fallback', 3, 0);
			expect(result).toBe('这是一段很...');
		});
	});

	// -- Boundary values ------------------------------------------------------

	describe('boundary values', () => {
		it('English: exactly wordLimit words returns all words', () => {
			const result = extractBlockDisplayText('one two three', 'fallback', 3, 5);
			expect(result).toBe('one two three');
		});

		it('English: wordLimit + 1 words truncates', () => {
			const result = extractBlockDisplayText('one two three four', 'fallback', 3, 5);
			expect(result).toBe('one two three');
		});

		it('English: word limit of 1', () => {
			const result = extractBlockDisplayText('Hello world', 'fallback', 1, 5);
			expect(result).toBe('Hello');
		});

		it('CJK: exactly charLimit chars returns text as-is', () => {
			const result = extractBlockDisplayText('这是一段文', 'fallback', 3, 5);
			expect(result).toBe('这是一段文');
		});

		it('CJK: charLimit + 1 chars with no separator triggers truncation', () => {
			const result = extractBlockDisplayText('这是一段文本', 'fallback', 3, 5);
			expect(result).toBe('这是一段文...');
		});

		it('CJK: char limit of 1 truncates with ellipsis', () => {
			const result = extractBlockDisplayText('很长的文本', 'fallback', 3, 1);
			expect(result).toBe('很...');
		});
	});

	// -- Mixed content --------------------------------------------------------

	describe('mixed content', () => {
		it('mixed English/CJK is treated as non-English', () => {
			// The ASCII regex fails if any non-ASCII char is present
			const result = extractBlockDisplayText('Hello 世界 and more text', 'fallback', 3, 5);
			expect(result).toBe('Hello');
		});

		it('text that is all markdown syntax becomes empty after cleaning', () => {
			const result = extractBlockDisplayText('**[]**', 'myId', 3, 5);
			expect(result).toBe('myId');
		});

		it('checkbox with different state markers', () => {
			expect(extractBlockDisplayText('- [>] Deferred task here', 'id', 3, 5))
				.toBe('Deferred task here');
			expect(extractBlockDisplayText('- [ ] Unchecked task here', 'id', 3, 5))
				.toBe('Unchecked task here');
		});
	});
});

// ---------------------------------------------------------------------------
// buildBlockLink
// ---------------------------------------------------------------------------

describe('buildBlockLink', () => {
	const defaults = {
		filename: 'MyNote',
		useBrief: true,
		firstLine: 'The quick brown fox',
		linkFormat: LinkFormat.WIKILINK,
		autoBlockDisplayText: true,
		autoEmbedBlockLink: false,
		blockDisplayWordLimit: 3,
		blockDisplayCharLimit: 5,
	};

	describe('wiki format', () => {
		it('creates a block link with brief display text', () => {
			const result = buildBlockLink({ ...defaults, blockId: 'abc123' });
			expect(result).toBe('[[MyNote#^abc123|The quick brown]]');
		});

		it('uses blockId as display text when useBrief is false', () => {
			const result = buildBlockLink({ ...defaults, blockId: 'abc123', useBrief: false });
			expect(result).toBe('[[MyNote#^abc123|abc123]]');
		});

		it('omits display text when autoBlockDisplayText is false', () => {
			const result = buildBlockLink({
				...defaults,
				blockId: 'abc123',
				autoBlockDisplayText: false,
			});
			expect(result).toBe('[[MyNote#^abc123]]');
		});

		it('adds ! embed prefix', () => {
			const result = buildBlockLink({
				...defaults,
				blockId: 'abc123',
				autoEmbedBlockLink: true,
			});
			expect(result).toBe('![[MyNote#^abc123|The quick brown]]');
		});
	});

	describe('markdown format', () => {
		const md = { ...defaults, linkFormat: LinkFormat.MDLINK };

		it('creates a markdown block link with display text', () => {
			const result = buildBlockLink({ ...md, blockId: 'abc123' });
			expect(result).toBe('[The quick brown](MyNote#^abc123)');
		});

		it('omits display text when autoBlockDisplayText is false', () => {
			const result = buildBlockLink({
				...md,
				blockId: 'abc123',
				autoBlockDisplayText: false,
			});
			expect(result).toBe('[](MyNote#^abc123)');
		});

		it('adds ! embed prefix in markdown format', () => {
			const result = buildBlockLink({
				...md,
				blockId: 'abc123',
				autoEmbedBlockLink: true,
			});
			expect(result).toBe('![The quick brown](MyNote#^abc123)');
		});
	});

	it('uses blockId as display when firstLine is empty', () => {
		const result = buildBlockLink({
			...defaults,
			blockId: 'abc123',
			firstLine: '',
		});
		expect(result).toBe('[[MyNote#^abc123|abc123]]');
	});

	// -- Combinatorial --------------------------------------------------------

	describe('combinatorial', () => {
		it('embed + no display text (wiki) produces ![[...]]', () => {
			const result = buildBlockLink({
				...defaults,
				blockId: 'abc123',
				autoBlockDisplayText: false,
				autoEmbedBlockLink: true,
			});
			expect(result).toBe('![[MyNote#^abc123]]');
		});

		it('embed + no display text (markdown) produces image-like syntax', () => {
			// ![](path) is technically an image embed in standard markdown —
			// documenting that this combo produces that syntax
			const result = buildBlockLink({
				...defaults,
				linkFormat: LinkFormat.MDLINK,
				blockId: 'abc123',
				autoBlockDisplayText: false,
				autoEmbedBlockLink: true,
			});
			expect(result).toBe('![](MyNote#^abc123)');
		});

		it('block ID with hyphens and underscores', () => {
			const result = buildBlockLink({
				...defaults,
				blockId: 'quote-of_the-day',
			});
			expect(result).toBe('[[MyNote#^quote-of_the-day|The quick brown]]');
		});

		it('markdown format encodes spaces in filename', () => {
			const result = buildBlockLink({
				...defaults,
				linkFormat: LinkFormat.MDLINK,
				blockId: 'abc123',
				filename: 'My Note',
			});
			expect(result).toBe('[The quick brown](My%20Note#^abc123)');
		});

		it('wiki format does NOT encode spaces in filename', () => {
			const result = buildBlockLink({
				...defaults,
				blockId: 'abc123',
				filename: 'My Note',
			});
			expect(result).toBe('[[My Note#^abc123|The quick brown]]');
		});
	});
});

// ---------------------------------------------------------------------------
// buildFileLink
// ---------------------------------------------------------------------------

describe('buildFileLink', () => {
	describe('wiki format', () => {
		it('creates a wiki file link', () => {
			const result = buildFileLink({
				filename: 'MyNote',
				filePath: 'folder/MyNote.md',
				linkFormat: LinkFormat.WIKILINK,
			});
			expect(result).toBe('[[MyNote|MyNote]]');
		});

		it('uses custom display text', () => {
			const result = buildFileLink({
				filename: 'my-note',
				filePath: 'folder/my-note.md',
				displayText: 'My Note',
				linkFormat: LinkFormat.WIKILINK,
			});
			expect(result).toBe('[[my-note|My Note]]');
		});
	});

	describe('markdown format', () => {
		it('creates a markdown file link and strips .md', () => {
			const result = buildFileLink({
				filename: 'MyNote',
				filePath: 'folder/MyNote.md',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[MyNote](folder/MyNote)');
		});

		it('normalizes backslashes in path', () => {
			const result = buildFileLink({
				filename: 'MyNote',
				filePath: 'folder\\subfolder\\MyNote.md',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[MyNote](folder/subfolder/MyNote)');
		});

		it('uses custom display text', () => {
			const result = buildFileLink({
				filename: 'my-note',
				filePath: 'folder/my-note.md',
				displayText: 'My Note',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[My Note](folder/my-note)');
		});

		it('handles paths without .md extension', () => {
			const result = buildFileLink({
				filename: 'MyNote',
				filePath: 'folder/MyNote',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[MyNote](folder/MyNote)');
		});

		it('encodes spaces as %20 in path', () => {
			const result = buildFileLink({
				filename: 'My Note',
				filePath: 'my folder/My Note.md',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[My Note](my%20folder/My%20Note)');
		});

		it('root-level file with no directory prefix', () => {
			const result = buildFileLink({
				filename: 'MyNote',
				filePath: 'MyNote.md',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[MyNote](MyNote)');
		});
	});

	// -- Edge cases -----------------------------------------------------------

	describe('edge cases', () => {
		it('wiki format without displayText produces redundant alias', () => {
			// [[name|name]] — the alias duplicates the filename
			const result = buildFileLink({
				filename: 'MyNote',
				filePath: 'folder/MyNote.md',
				linkFormat: LinkFormat.WIKILINK,
			});
			expect(result).toBe('[[MyNote|MyNote]]');
		});

		it('filename with parentheses in markdown format', () => {
			// Parentheses can break [text](path) syntax in strict parsers
			const result = buildFileLink({
				filename: 'Note (draft)',
				filePath: 'folder/Note (draft).md',
				linkFormat: LinkFormat.MDLINK,
			});
			expect(result).toBe('[Note (draft)](folder/Note%20(draft))');
		});

		it('filename with pipe in wiki format', () => {
			// | is the alias separator — pipe in filename creates ambiguity
			const result = buildFileLink({
				filename: 'Pros | Cons',
				filePath: 'Pros | Cons.md',
				displayText: 'Comparison',
				linkFormat: LinkFormat.WIKILINK,
			});
			expect(result).toBe('[[Pros | Cons|Comparison]]');
		});
	});
});
