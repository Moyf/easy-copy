import { describe, expect, it } from 'vitest';
import {
	buildCopyMatchers,
	DEFAULT_BUILTIN_COPY_MATCHER_IDS,
	getCustomMatcherOrderId,
	normalizeMatcherOrder,
} from './copyMatcher';
import { ContextType, DEFAULT_SETTINGS } from './type';

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
			customizeTargets: true,
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
			customizeTargets: true,
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

	it('disables custom regex matchers when target customization is off', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			customizeTargets: false,
			customMatchers: [{
				id: 'quotes',
				name: 'Quotes',
				pattern: '"([^"]+)"',
				flags: 'g',
				captureGroup: 1,
				enabled: true,
			}],
			matcherOrder: ['custom:quotes', ...DEFAULT_BUILTIN_COPY_MATCHER_IDS],
		};

		const customMatcher = buildCopyMatchers(settings, false).find(matcher => matcher.id === 'custom:quotes');

		expect(customMatcher?.enabled).toBe(false);
	});
});
