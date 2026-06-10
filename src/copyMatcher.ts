import { ContextType, EasyCopySettings } from './type';

export type BuiltinCopyMatcherId =
	| 'bold'
	| 'italic'
	| 'highlight'
	| 'strikethrough'
	| 'inline-code'
	| 'inline-latex'
	| 'wiki-link';

export interface CopyMatcher {
	id: BuiltinCopyMatcherId;
	type: ContextType;
	regex: RegExp;
	enabled: boolean;
}

export function buildBuiltinCopyMatchers(settings: EasyCopySettings, isIosApp: boolean): CopyMatcher[] {
	// iOS 16.4 之前不支持后视（Lookbehinds），但支持前视（Lookaheads）
	// 所以针对 iOS 平台使用只带前视的正则表达式，其他平台使用完整版本
	const italicRegex = isIosApp ?
		/(?:\*([^*]+)\*(?!\*)|_([^_]+)_(?!_))/g :
		/(?:(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_))/g;

	const boldRegex = /(?:\*\*([^*]+)\*\*|__([^_]+)__)/g;

	return [
		{ id: 'bold', type: ContextType.BOLD, regex: boldRegex, enabled: !settings.customizeTargets || settings.enableBold },
		{ id: 'italic', type: ContextType.ITALIC, regex: italicRegex, enabled: !settings.customizeTargets || settings.enableItalic },
		{ id: 'highlight', type: ContextType.HIGHLIGHT, regex: /==([^=]+)==/g, enabled: !settings.customizeTargets || settings.enableHighlight },
		{ id: 'strikethrough', type: ContextType.STRIKETHROUGH, regex: /~~([^~]+)~~/g, enabled: !settings.customizeTargets || settings.enableStrikethrough },
		{ id: 'inline-code', type: ContextType.INLINECODE, regex: /`([^`]+)`/g, enabled: !settings.customizeTargets || settings.enableInlineCode },
		{ id: 'inline-latex', type: ContextType.INLINELATEX, regex: /\$([^$]+)\$/g, enabled: !settings.customizeTargets || settings.enableInlineLatex },
		{ id: 'wiki-link', type: ContextType.WIKILINK, regex: /\[\[([^\]]+)\]\]/g, enabled: !settings.customizeTargets || settings.enableWikiLink },
	];
}
