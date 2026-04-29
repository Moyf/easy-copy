import { describe, it, expect } from 'vitest';
import {
	buildBlockLink,
	buildExplicitPasteLink,
	buildFileLink,
	buildHeadingLink,
	encodeMarkdownLinkUrl,
	extractBlockDisplayText,
	sanitizeHeadingForLink,
} from './linkBuilder';
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
// sanitizeHeadingForLink
// ---------------------------------------------------------------------------

describe('sanitizeHeadingForLink', () => {
	it('strips # | ^ : with surrounding whitespace', () => {
		expect(sanitizeHeadingForLink('Test | If # This ^ Heading : Works'))
			.toBe('Test If This Heading Works');
	});

	it('strips special chars without surrounding whitespace', () => {
		expect(sanitizeHeadingForLink('Test|If#This^Heading:Works, Too'))
			.toBe('Test If This Heading Works, Too');
	});

	it('strips only the special chars that are present', () => {
		expect(sanitizeHeadingForLink('Test | If This ^ Heading Works (No Hash or Colon)'))
			.toBe('Test If This Heading Works (No Hash or Colon)');
	});

	it('strips %% (comment marker)', () => {
		expect(sanitizeHeadingForLink('Before %% comment %% After'))
			.toBe('Before comment After');
	});

	it('strips [[ and ]]', () => {
		expect(sanitizeHeadingForLink('See [[Other Note]] here'))
			.toBe('See Other Note here');
	});

	it('returns heading unchanged when no special chars', () => {
		expect(sanitizeHeadingForLink('Normal Heading Text'))
			.toBe('Normal Heading Text');
	});

	it('handles empty string', () => {
		expect(sanitizeHeadingForLink('')).toBe('');
	});

	it('handles heading that is only special chars', () => {
		expect(sanitizeHeadingForLink('# | ^')).toBe('');
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
		simplifiedHeadingToNoteLink: true,
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

		it('simplifies to file link when filename equals heading exactly', () => {
			const result = buildHeadingLink({
				...md,
				heading: 'MyNote',
				filename: 'MyNote',
			});
			// simplifiedHeadingToNoteLink (default true) collapses MyNote#MyNote → MyNote
			expect(result.link).toBe('[MyNote](MyNote)');
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

		// -- simplifiedHeadingToNoteLink in markdown format --------------------
		// Mirror of the wiki "filename-heading matching" suite below.

		describe('simplifiedHeadingToNoteLink (default: includes match)', () => {
			it('simplifies on case-insensitive exact match', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'mynote',
					filename: 'MyNote',
				});
				// Display preserves heading casing, target preserves filename casing
				expect(result.link).toBe('[mynote](MyNote)');
				expect(result.isNoteLink).toBe(true);
			});

			it('simplifies on space-removed match', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Some Thing',
					filename: 'SomeThing',
				});
				expect(result.link).toBe('[Some Thing](SomeThing)');
				expect(result.isNoteLink).toBe(true);
			});

			it('simplifies when filename contains heading as substring', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Java',
					filename: 'JavaScript',
				});
				expect(result.link).toBe('[Java](JavaScript)');
				expect(result.isNoteLink).toBe(true);
			});

			it('simplifies for date-prefixed filenames containing heading', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'note',
					filename: '260422_note',
				});
				expect(result.link).toBe('[note](260422_note)');
				expect(result.isNoteLink).toBe(true);
			});

			it('does not simplify when heading contains filename (asymmetric)', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Notebook',
					filename: 'Note',
				});
				expect(result.link).toBe('[Notebook](Note#Notebook)');
				expect(result.isNoteLink).toBe(false);
			});

			it('encodes spaces in target when not simplified', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Some Heading',
					filename: 'My Note',
				});
				// No simplification triggers, so target keeps the heading fragment
				expect(result.link).toBe('[Some Heading](My%20Note#Some%20Heading)');
				expect(result.isNoteLink).toBe(false);
			});

			it('encodes spaces in target when simplified to filename', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'My Note',
					filename: 'My Note',
				});
				expect(result.link).toBe('[My Note](My%20Note)');
				expect(result.isNoteLink).toBe(true);
			});
		});

		describe('simplifiedHeadingToNoteLink (strict mode)', () => {
			const strictMd = { ...md, strictHeadingMatch: true };

			it('does not simplify on substring match', () => {
				const result = buildHeadingLink({
					...strictMd,
					heading: 'Java',
					filename: 'JavaScript',
				});
				expect(result.link).toBe('[Java](JavaScript#Java)');
				expect(result.isNoteLink).toBe(false);
			});

			it('still simplifies on case-insensitive exact match', () => {
				const result = buildHeadingLink({
					...strictMd,
					heading: 'mynote',
					filename: 'MyNote',
				});
				expect(result.link).toBe('[mynote](MyNote)');
				expect(result.isNoteLink).toBe(true);
			});

			it('still simplifies on space-removed exact match', () => {
				const result = buildHeadingLink({
					...strictMd,
					heading: 'Some Thing',
					filename: 'SomeThing',
				});
				expect(result.link).toBe('[Some Thing](SomeThing)');
				expect(result.isNoteLink).toBe(true);
			});
		});

		describe('simplifiedHeadingToNoteLink gated on useHeadingAsDisplayText=true (A1.5)', () => {
			// When the user wants "filename#heading" in the display, dropping the heading
			// anchor would produce a misleading [filename#heading](filename). The gate
			// preserves the heading link so display intent and target stay aligned.

			it('does NOT simplify on exact match when useHeadingAsDisplayText is false', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'MyNote',
					filename: 'MyNote',
					useHeadingAsDisplayText: false,
					headingLinkSeparator: '#',
				});
				expect(result.link).toBe('[MyNote#MyNote](MyNote#MyNote)');
				expect(result.isNoteLink).toBe(false);
			});

			it('does NOT simplify on space-removed match when useHeadingAsDisplayText is false', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Some Thing',
					filename: 'SomeThing',
					useHeadingAsDisplayText: false,
					headingLinkSeparator: '#',
				});
				expect(result.link).toBe('[SomeThing#Some Thing](SomeThing#Some%20Thing)');
				expect(result.isNoteLink).toBe(false);
			});

			it('does NOT simplify on substring match when useHeadingAsDisplayText is false', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Java',
					filename: 'JavaScript',
					useHeadingAsDisplayText: false,
					headingLinkSeparator: '#',
				});
				expect(result.link).toBe('[JavaScript#Java](JavaScript#Java)');
				expect(result.isNoteLink).toBe(false);
			});

			it('honors custom separator in display text when not simplified', () => {
				const result = buildHeadingLink({
					...md,
					heading: 'Some Thing',
					filename: 'SomeThing',
					useHeadingAsDisplayText: false,
					headingLinkSeparator: ' > ',
				});
				expect(result.link).toBe('[SomeThing > Some Thing](SomeThing#Some%20Thing)');
				expect(result.isNoteLink).toBe(false);
			});
		});
	});

	// -- Special character sanitization in link targets ----------------------

	describe('special character sanitization', () => {
		it('wiki format: strips special chars from link target, preserves display text', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Test | If # This ^ Heading : Works',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#Test If This Heading Works|Test | If # This ^ Heading : Works]]');
		});

		it('markdown format: strips special chars from URL target', () => {
			const result = buildHeadingLink({
				...defaults,
				linkFormat: LinkFormat.MDLINK,
				heading: 'Test | If # This ^ Heading : Works',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[Test | If # This ^ Heading : Works](MyNote#Test%20If%20This%20Heading%20Works)');
		});

		it('wiki format: strips chars without surrounding whitespace', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Test|If#This^Heading:Works, Too',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#Test If This Heading Works, Too|Test|If#This^Heading:Works, Too]]');
		});

		it('markdown format: display text preserves original heading', () => {
			const result = buildHeadingLink({
				...defaults,
				linkFormat: LinkFormat.MDLINK,
				heading: 'Test|If#This^Heading:Works, Too',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[Test|If#This^Heading:Works, Too](MyNote#Test%20If%20This%20Heading%20Works,%20Too)');
		});
	});

	// -- compareIgnoreCase: default (includes) vs strict matching -----------

	describe('filename-heading matching (default: includes)', () => {
		it('simplifies when filename contains heading as substring', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Java',
				filename: 'JavaScript',
			});
			expect(result.link).toBe('[[JavaScript|Java]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('does not simplify when heading contains filename as substring', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Notebook',
				filename: 'Note',
			});
			expect(result.link).toBe('[[Note#Notebook|Notebook]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('simplifies on space-removed substring match', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'Some Thing',
				filename: 'SomeThingElse',
			});
			expect(result.link).toBe('[[SomeThingElse|Some Thing]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('simplifies when filename contains heading (e.g. date-prefixed notes)', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'note',
				filename: '260422_note',
			});
			expect(result.link).toBe('[[260422_note|note]]');
			expect(result.isNoteLink).toBe(true);
		});
	});

	describe('filename-heading matching (strict mode)', () => {
		const strict = { ...defaults, strictHeadingMatch: true };

		it('does not simplify when filename contains heading as substring', () => {
			const result = buildHeadingLink({
				...strict,
				heading: 'Java',
				filename: 'JavaScript',
			});
			expect(result.link).toBe('[[JavaScript#Java|Java]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('does not simplify on space-removed substring match', () => {
			const result = buildHeadingLink({
				...strict,
				heading: 'Some Thing',
				filename: 'SomeThingElse',
			});
			expect(result.link).toBe('[[SomeThingElse#Some Thing|Some Thing]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('still simplifies on exact case-insensitive match', () => {
			const result = buildHeadingLink({
				...strict,
				heading: 'mynote',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote|mynote]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('still simplifies on space-removed exact match', () => {
			const result = buildHeadingLink({
				...strict,
				heading: 'Some Thing',
				filename: 'SomeThing',
			});
			expect(result.link).toBe('[[SomeThing|Some Thing]]');
			expect(result.isNoteLink).toBe(true);
		});
	});

	// -- A1.5 gate: simplification gated on useHeadingAsDisplayText (wiki side) -----

	describe('simplifiedHeadingToNoteLink gated on useHeadingAsDisplayText=true (A1.5, wiki side)', () => {
		// Mirrors the markdown-side suite. When the user has asked for "filename#heading"
		// in the display, the early simplification block is skipped so the heading link
		// survives. Exception: the WIKI exact-match special case [[filename]] is preserved
		// regardless, since it renders cleanly as just the filename in Obsidian.

		const wikiNoDisplay = {
			...defaults,
			useHeadingAsDisplayText: false,
			headingLinkSeparator: '#',
		};

		it('PRESERVES the [[filename]] special case on exact match (the A1.5 exception)', () => {
			const result = buildHeadingLink({
				...wikiNoDisplay,
				heading: 'MyNote',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote]]');
			expect(result.isNoteLink).toBe(true);
		});

		it('does NOT simplify on case-insensitive match', () => {
			const result = buildHeadingLink({
				...wikiNoDisplay,
				heading: 'mynote',
				filename: 'MyNote',
			});
			// displayText === linkContent → alias collapses, but the heading fragment survives
			expect(result.link).toBe('[[MyNote#mynote]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('does NOT simplify on space-removed match', () => {
			const result = buildHeadingLink({
				...wikiNoDisplay,
				heading: 'Some Thing',
				filename: 'SomeThing',
			});
			expect(result.link).toBe('[[SomeThing#Some Thing]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('does NOT simplify on substring match', () => {
			const result = buildHeadingLink({
				...wikiNoDisplay,
				heading: 'Java',
				filename: 'JavaScript',
			});
			expect(result.link).toBe('[[JavaScript#Java]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('honors custom separator alias when not simplified', () => {
			const result = buildHeadingLink({
				...wikiNoDisplay,
				heading: 'Some Thing',
				filename: 'SomeThing',
				headingLinkSeparator: ' > ',
			});
			// displayText "SomeThing > Some Thing" !== linkContent "SomeThing#Some Thing"
			expect(result.link).toBe('[[SomeThing#Some Thing|SomeThing > Some Thing]]');
			expect(result.isNoteLink).toBe(false);
		});
	});

	// -- simplifiedHeadingToNoteLink: false ---------------------------------

	describe('when simplifiedHeadingToNoteLink is false', () => {
		const noSimplify = { ...defaults, simplifiedHeadingToNoteLink: false };

		it('keeps full heading link when filename equals heading exactly (wiki)', () => {
			const result = buildHeadingLink({
				...noSimplify,
				heading: 'MyNote',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#MyNote|MyNote]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('keeps full heading link on case-insensitive match (wiki)', () => {
			const result = buildHeadingLink({
				...noSimplify,
				heading: 'mynote',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#mynote|mynote]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('keeps full heading link on space-removed match (wiki)', () => {
			const result = buildHeadingLink({
				...noSimplify,
				heading: 'Some Thing',
				filename: 'SomeThing',
			});
			expect(result.link).toBe('[[SomeThing#Some Thing|Some Thing]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('keeps full heading link on filename-includes-heading match (wiki)', () => {
			const result = buildHeadingLink({
				...noSimplify,
				heading: 'note',
				filename: '260422_note',
			});
			expect(result.link).toBe('[[260422_note#note|note]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('does not affect non-matching filename/heading (sanity check)', () => {
			const result = buildHeadingLink({
				...noSimplify,
				heading: 'Getting Started',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#Getting Started|Getting Started]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('markdown format keeps heading fragment when simplification is off (sanity check)', () => {
			const result = buildHeadingLink({
				...noSimplify,
				linkFormat: LinkFormat.MDLINK,
				heading: 'MyNote',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[MyNote](MyNote#MyNote)');
			expect(result.isNoteLink).toBe(false);
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

		it('frontmatterTitle + heading link kept under useHeadingAsDisplayText=false (wiki, A1.5)', () => {
			const result = buildHeadingLink({
				...defaults,
				heading: 'myNote',
				filename: 'MyNote',
				frontmatterTitle: 'My Pretty Title',
				useHeadingAsDisplayText: false,
				headingLinkSeparator: '#',
			});
			// Pre-A1.5 this simplified to [[MyNote|My Pretty Title#myNote]] (target=file, display=heading-style).
			// A1.5 keeps the heading anchor so the target matches the display intent.
			expect(result.link).toBe('[[MyNote#myNote|My Pretty Title#myNote]]');
			expect(result.isNoteLink).toBe(false);
		});

		it('empty heading produces a heading link with empty fragment (known bug)', () => {
			// Empty heading is an edge case from Obsidian's UI. The link target
			// is technically malformed (MyNote#) but this matches current behavior.
			// Should be addressed in a future PR.
			const result = buildHeadingLink({
				...defaults,
				heading: '',
				filename: 'MyNote',
			});
			expect(result.link).toBe('[[MyNote#|]]');
			expect(result.isNoteLink).toBe(false);
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

// ---------------------------------------------------------------------------
// buildExplicitPasteLink
// ---------------------------------------------------------------------------

describe('buildExplicitPasteLink', () => {
	describe('wiki format', () => {
		it('cross-file with subpath + alias produces [[path#H|alias]]', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: false,
				omitAlias: false,
			})).toBe('[[SomeThing#Other Heading|Other Heading]]');
		});

		it('cross-file with subpath, omitAlias=true produces [[path#H]]', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: false,
				omitAlias: true,
			})).toBe('[[SomeThing#Other Heading]]');
		});

		it('same-file with subpath drops path portion to [[#H|alias]]', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: true,
				omitAlias: false,
			})).toBe('[[#Other Heading|Other Heading]]');
		});

		it('same-file with subpath + omitAlias produces [[#H]]', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: true,
				omitAlias: true,
			})).toBe('[[#Other Heading]]');
		});

		it('cross-file file link (empty subpath) with alias', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '',
				alias: 'Some Thing',
				sameFile: false,
				omitAlias: false,
			})).toBe('[[SomeThing|Some Thing]]');
		});

		it('cross-file file link with empty alias yields [[path]]', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '',
				alias: '',
				sameFile: false,
				omitAlias: false,
			})).toBe('[[SomeThing]]');
		});

		it('block-link cross-file: omitAlias=false (caller-decided) keeps alias', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '#^abc123',
				alias: 'The quick brown',
				sameFile: false,
				omitAlias: false,
			})).toBe('[[SomeThing#^abc123|The quick brown]]');
		});

		it('block-link same-file produces [[#^id|alias]]', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'SomeThing',
				subpath: '#^abc123',
				alias: 'The quick brown',
				sameFile: true,
				omitAlias: false,
			})).toBe('[[#^abc123|The quick brown]]');
		});

		it('does not encode spaces in path (wiki-link convention)', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.WIKILINK,
				path: 'My Note',
				subpath: '#Some Heading',
				alias: 'Some Heading',
				sameFile: false,
				omitAlias: false,
			})).toBe('[[My Note#Some Heading|Some Heading]]');
		});
	});

	describe('markdown format', () => {
		it('cross-file with subpath + alias produces [alias](path#H)', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: false,
				omitAlias: false,
			})).toBe('[Other Heading](SomeThing#Other%20Heading)');
		});

		it('same-file produces [alias](#H) with no path', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: true,
				omitAlias: false,
			})).toBe('[Other Heading](#Other%20Heading)');
		});

		it('omitAlias=true preserves alias as display (MD never produces empty [])', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'SomeThing',
				subpath: '#Other Heading',
				alias: 'Other Heading',
				sameFile: true,
				omitAlias: true,
			})).toBe('[Other Heading](#Other%20Heading)');
		});

		it('cross-file file link (empty subpath) with alias', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'SomeThing',
				subpath: '',
				alias: 'Some Thing',
				sameFile: false,
				omitAlias: false,
			})).toBe('[Some Thing](SomeThing)');
		});

		it('encodes spaces in path as %20', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'My Note',
				subpath: '#Some Heading',
				alias: 'Some Heading',
				sameFile: false,
				omitAlias: false,
			})).toBe('[Some Heading](My%20Note#Some%20Heading)');
		});

		it('encodes spaces in same-file fragment', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'irrelevant',
				subpath: '#Some Heading',
				alias: 'Some Heading',
				sameFile: true,
				omitAlias: false,
			})).toBe('[Some Heading](#Some%20Heading)');
		});

		it('block-link cross-file', () => {
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'SomeThing',
				subpath: '#^abc123',
				alias: 'The quick brown',
				sameFile: false,
				omitAlias: false,
			})).toBe('[The quick brown](SomeThing#^abc123)');
		});

		it('empty alias yields []() — caller is expected to provide non-empty alias', () => {
			// Documenting boundary: buildHeadingCopyMetadata clears alias when
			// isNoteLink+filename===heading. handlePaste should treat that as
			// the degenerate self-ref case (skip) before reaching here.
			expect(buildExplicitPasteLink({
				format: LinkFormat.MDLINK,
				path: 'SomeThing',
				subpath: '',
				alias: '',
				sameFile: false,
				omitAlias: false,
			})).toBe('[](SomeThing)');
		});
	});
});
