import { describe, expect, it } from 'vitest';
import {
	buildCopyMatchers,
	DEFAULT_BUILTIN_COPY_MATCHER_IDS,
	getCustomMatcherOrderId,
	getMatchInfo,
	normalizeMatcherOrder,
	unescapeTablePipe,
} from './copyMatcher';
import { ContextType, DEFAULT_SETTINGS } from './type';

describe('unescapeTablePipe', () => {
	it.each([
		['inline-code', '`foo(a\\|b).bar`', 'foo(a|b).bar'],
		['bold', '**a\\|b**', 'a|b'],
		['italic', '*a\\|b*', 'a|b'],
		['highlight', '==a\\|b==', 'a|b'],
		['strikethrough', '~~a\\|b~~', 'a|b'],
		['inline-latex', '$a\\|b$', 'a|b'],
		['custom:quotes', '"a\\|b"', 'a|b'],
	])('unescapes pipes captured by %s in a table row', (id, markup, expected) => {
		const settings = {
			...DEFAULT_SETTINGS,
			customMatchers: [{
				id: 'quotes',
				name: 'Quotes',
				pattern: '"([^"]+)"',
				flags: 'g',
				captureGroup: 1,
				enabled: true,
			}],
		};
		const curLine = `| Example | ${markup} |`;
		const matcher = buildCopyMatchers(settings, false).find(matcher => matcher.id === id)!;
		const match = getMatchInfo(curLine, curLine.indexOf(markup) + 2, matcher.regex, matcher.captureGroup)!;

		expect(unescapeTablePipe(match.content, curLine)).toBe(expected);
	});

	it.each(['|', '  |', '> |', '  > |', '> > |', '>>|', '\t>\t>\t|'])(
		'unescapes pipes with the table row prefix %j', prefix => {
			expect(unescapeTablePipe('a\\|b\\|c', `${prefix} \`a\\|b\\|c\` |`)).toBe('a|b|c');
		},
	);

	it.each(['`a\\|b`', '**a\\|b**', '> `a\\|b`', 'text | `a\\|b`', '\\| `a\\|b`', ''])(
		'preserves escaped pipes outside a leading-pipe table row: %j', curLine => {
			expect(unescapeTablePipe('a\\|b', curLine)).toBe('a\\|b');
		},
	);

	it('preserves other backslashes and literal pipes in a table cell', () => {
		const match = String.raw`\alpha a\|b | C:\temp \*`;
		expect(unescapeTablePipe(match, `| ${match} |`)).toBe(String.raw`\alpha a|b | C:\temp \*`);
	});

	it('preserves an empty match', () => {
		expect(unescapeTablePipe('', '| empty |')).toBe('');
	});
});

describe('normalizeMatcherOrder', () => {
	it('keeps saved order and appends missing built-in and custom matchers', () => {
		const customMatcher = {
			id: 'quotes',
			name: 'Quotes',
			pattern: '"([^"]+)"',
			flags: 'g',
			captureGroup: 1,
			enabled: true,
		};

		expect(normalizeMatcherOrder(['inline-code', 'bold'], [customMatcher])).toEqual([
			'inline-code',
			'bold',
			'italic',
			'highlight',
			'strikethrough',
			'inline-latex',
			'link',
			'wiki-link',
			getCustomMatcherOrderId(customMatcher),
		]);
	});

	it('drops unknown and duplicate matcher ids', () => {
		expect(normalizeMatcherOrder(['missing', 'bold', 'bold'], [])).toEqual(DEFAULT_BUILTIN_COPY_MATCHER_IDS);
	});
});

describe('buildCopyMatchers', () => {
	it('orders custom regex matchers with built-in matchers', () => {
		const customMatcher = {
			id: 'quotes',
			name: 'Quotes',
			pattern: '"([^"]+)"',
			flags: 'g',
			captureGroup: 1,
			enabled: true,
		};
		const settings = {
			...DEFAULT_SETTINGS,
			customMatchers: [customMatcher],
			matcherOrder: [getCustomMatcherOrderId(customMatcher), ...DEFAULT_BUILTIN_COPY_MATCHER_IDS],
		};

		const matchers = buildCopyMatchers(settings, false);

		expect(matchers[0]).toMatchObject({
			id: getCustomMatcherOrderId(customMatcher),
			type: ContextType.CUSTOM,
			enabled: true,
			captureGroup: 1,
			name: 'Quotes',
		});
		expect(matchers[0].regex.exec('copy "inside"')?.[1]).toBe('inside');
	});

	it('skips invalid custom regex without removing valid matchers', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			customMatchers: [{
				id: 'broken',
				name: 'Broken',
				pattern: '(',
				flags: 'g',
				captureGroup: 1,
				enabled: true,
			}],
			matcherOrder: ['custom:broken', ...DEFAULT_BUILTIN_COPY_MATCHER_IDS],
		};

		const matchers = buildCopyMatchers(settings, false);

		expect(matchers.some(matcher => matcher.id === 'custom:broken')).toBe(false);
		expect(matchers[0].id).toBe('bold');
	});

	it('keeps a disabled custom regex matcher inactive', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			customMatchers: [{
				id: 'quotes',
				name: 'Quotes',
				pattern: '"([^"]+)"',
				flags: 'g',
				captureGroup: 1,
				enabled: false,
			}],
			matcherOrder: ['custom:quotes', ...DEFAULT_BUILTIN_COPY_MATCHER_IDS],
		};

		const customMatcher = buildCopyMatchers(settings, false).find(matcher => matcher.id === 'custom:quotes');

		expect(customMatcher?.enabled).toBe(false);
	});
});
