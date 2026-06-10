import { BuiltinCopyMatcherId, ContextType, CustomCopyMatcherSetting, EasyCopySettings } from './type';

export const DEFAULT_BUILTIN_COPY_MATCHER_IDS: BuiltinCopyMatcherId[] = [
	'bold',
	'italic',
	'highlight',
	'strikethrough',
	'inline-code',
	'inline-latex',
	'link',
	'wiki-link',
];

export interface CopyMatcher {
	id: string;
	type: ContextType;
	enabled: boolean;
	regex: RegExp;
	captureGroup?: number;
	name?: string;
}

export interface CopyMatchInfo {
	content: string;
	range: [number, number];
}

export function getCustomMatcherOrderId(matcher: CustomCopyMatcherSetting): string {
	return `custom:${matcher.id}`;
}

export function normalizeBuiltinMatcherOrder(order: readonly string[] | undefined): BuiltinCopyMatcherId[] {
	const knownIds = new Set<string>(DEFAULT_BUILTIN_COPY_MATCHER_IDS);
	const orderedIds: BuiltinCopyMatcherId[] = [];

	for (const id of order ?? []) {
		if (knownIds.has(id) && !orderedIds.includes(id as BuiltinCopyMatcherId)) {
			orderedIds.push(id as BuiltinCopyMatcherId);
		}
	}

	for (const id of DEFAULT_BUILTIN_COPY_MATCHER_IDS) {
		if (!orderedIds.includes(id)) orderedIds.push(id);
	}

	return orderedIds;
}

export function normalizeMatcherOrder(order: readonly string[] | undefined, customMatchers: readonly CustomCopyMatcherSetting[]): string[] {
	const customIds = new Set(customMatchers.map(getCustomMatcherOrderId));
	const knownIds = new Set<string>([...DEFAULT_BUILTIN_COPY_MATCHER_IDS, ...customIds]);
	const orderedIds: string[] = [];

	for (const id of order ?? []) {
		if (knownIds.has(id) && !orderedIds.includes(id)) orderedIds.push(id);
	}

	for (const id of DEFAULT_BUILTIN_COPY_MATCHER_IDS) {
		if (!orderedIds.includes(id)) orderedIds.push(id);
	}

	for (const id of customIds) {
		if (!orderedIds.includes(id)) orderedIds.push(id);
	}

	return orderedIds;
}

function buildCustomCopyMatcher(setting: CustomCopyMatcherSetting, enabled: boolean): CopyMatcher | null {
	if (!setting.pattern.trim()) return null;

	try {
		const flags = Array.from(new Set(`${setting.flags || ''}g`)).join('');
		return {
			id: getCustomMatcherOrderId(setting),
			type: ContextType.CUSTOM,
			regex: new RegExp(setting.pattern, flags),
			enabled: enabled && setting.enabled,
			captureGroup: setting.captureGroup,
			name: setting.name.trim() || 'Custom matcher',
		};
	} catch {
		return null;
	}
}

export function getMatcherContent(match: RegExpExecArray, captureGroup?: number): string {
	if (captureGroup !== undefined) return match[captureGroup] ?? match[0];

	for (let i = 1; i < match.length; i++) {
		if (match[i] !== undefined) return match[i];
	}

	return match[0];
}

export function getMatchInfo(fullText: string, cursorPosition: number, regex: RegExp, captureGroup?: number): CopyMatchInfo | null {
	let match: RegExpExecArray | null;
	regex.lastIndex = 0;
	while ((match = regex.exec(fullText)) !== null) {
		const matchStart = match.index;
		const matchEnd = match.index + match[0].length;

		if (cursorPosition >= matchStart && cursorPosition <= matchEnd) {
			return {
				content: getMatcherContent(match, captureGroup),
				range: [matchStart, matchEnd],
			};
		}

		if (match[0].length === 0) regex.lastIndex++;
	}

	return null;
}

export function buildBuiltinCopyMatchers(settings: EasyCopySettings, isIosApp: boolean): CopyMatcher[] {
	// iOS 16.4 之前不支持后视（Lookbehinds），但支持前视（Lookaheads）
	// 所以针对 iOS 平台使用只带前视的正则表达式，其他平台使用完整版本
	const italicRegex = isIosApp ?
		/(?:\*([^*]+)\*(?!\*)|_([^_]+)_(?!_))/g :
		/(?:(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_))/g;

	const boldRegex = /(?:\*\*([^*]+)\*\*|__([^_]+)__)/g;

	const matchers: CopyMatcher[] = [
		{ id: 'bold', type: ContextType.BOLD, regex: boldRegex, enabled: !settings.customizeTargets || settings.enableBold },
		{ id: 'italic', type: ContextType.ITALIC, regex: italicRegex, enabled: !settings.customizeTargets || settings.enableItalic },
		{ id: 'highlight', type: ContextType.HIGHLIGHT, regex: /==([^=]+)==/g, enabled: !settings.customizeTargets || settings.enableHighlight },
		{ id: 'strikethrough', type: ContextType.STRIKETHROUGH, regex: /~~([^~]+)~~/g, enabled: !settings.customizeTargets || settings.enableStrikethrough },
		{ id: 'inline-code', type: ContextType.INLINECODE, regex: /`([^`]+)`/g, enabled: !settings.customizeTargets || settings.enableInlineCode },
		{ id: 'inline-latex', type: ContextType.INLINELATEX, regex: /\$([^$]+)\$/g, enabled: !settings.customizeTargets || settings.enableInlineLatex },
		{ id: 'wiki-link', type: ContextType.WIKILINK, regex: /\[\[([^\]]+)\]\]/g, enabled: !settings.customizeTargets || settings.enableWikiLink },
	];

	const matcherById = new Map(matchers.map(matcher => [matcher.id, matcher]));
	return normalizeBuiltinMatcherOrder(settings.matcherOrder)
		.map(id => matcherById.get(id))
		.filter((matcher): matcher is CopyMatcher => Boolean(matcher));
}

export function buildCopyMatchers(settings: EasyCopySettings, isIosApp: boolean): CopyMatcher[] {
	const matchers = [
		...buildBuiltinCopyMatchers(settings, isIosApp),
		...settings.customMatchers.map(matcher => buildCustomCopyMatcher(matcher, settings.customizeTargets)).filter(matcher => matcher !== null),
	];
	const matcherById = new Map(matchers.map(matcher => [matcher.id, matcher]));

	return normalizeMatcherOrder(settings.matcherOrder, settings.customMatchers)
		.map(id => matcherById.get(id))
		.filter(matcher => matcher !== undefined);
}
