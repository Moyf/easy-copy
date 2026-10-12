import {
	App,
	PluginSettingTab,
	Setting,
	setIcon,
} from "obsidian";
import type { SettingDefinition, SettingDefinitionItem, SettingDefinitionList } from "obsidian";
import EasyCopy from "./main";
import { BuiltinCopyMatcherId, CustomCopyMatcherSetting, LinkFormat, BlockIdInsertPosition, CodeBlockBehavior, NoCopyAction } from "./type";
import { DEFAULT_BUILTIN_COPY_MATCHER_IDS, getCustomMatcherOrderId, normalizeMatcherOrder } from "./copyMatcher";
import { createCustomMatcher, CustomMatcherModal } from "./customMatcherModal";

// 内置复制对象 id → 设置界面文案 key / 开关设置 key 的映射
type BuiltinMatcherLabelKey = 'enable-bold' | 'enable-italic' | 'enable-highlight' | 'enable-strikethrough' | 'enable-inline-code' | 'enable-inline-latex' | 'enable-link' | 'enable-wikilink';
type BuiltinMatcherDescKey = 'enable-bold-desc' | 'enable-italic-desc' | 'enable-highlight-desc' | 'enable-strikethrough-desc' | 'enable-inline-code-desc' | 'enable-inline-latex-desc' | 'enable-link-desc' | 'enable-wikilink-desc';
type BuiltinMatcherSettingKey = 'enableBold' | 'enableItalic' | 'enableHighlight' | 'enableStrikethrough' | 'enableInlineCode' | 'enableInlineLatex' | 'enableLink' | 'enableWikiLink';

const BUILTIN_MATCHER_LABEL_KEYS: Record<BuiltinCopyMatcherId, BuiltinMatcherLabelKey> = {
	'bold': 'enable-bold',
	'italic': 'enable-italic',
	'highlight': 'enable-highlight',
	'strikethrough': 'enable-strikethrough',
	'inline-code': 'enable-inline-code',
	'inline-latex': 'enable-inline-latex',
	'link': 'enable-link',
	'wiki-link': 'enable-wikilink',
};

const BUILTIN_MATCHER_DESC_KEYS: Record<BuiltinCopyMatcherId, BuiltinMatcherDescKey> = {
	'bold': 'enable-bold-desc',
	'italic': 'enable-italic-desc',
	'highlight': 'enable-highlight-desc',
	'strikethrough': 'enable-strikethrough-desc',
	'inline-code': 'enable-inline-code-desc',
	'inline-latex': 'enable-inline-latex-desc',
	'link': 'enable-link-desc',
	'wiki-link': 'enable-wikilink-desc',
};

const BUILTIN_MATCHER_SETTING_KEYS: Record<BuiltinCopyMatcherId, BuiltinMatcherSettingKey> = {
	'bold': 'enableBold',
	'italic': 'enableItalic',
	'highlight': 'enableHighlight',
	'strikethrough': 'enableStrikethrough',
	'inline-code': 'enableInlineCode',
	'inline-latex': 'enableInlineLatex',
	'link': 'enableLink',
	'wiki-link': 'enableWikiLink',
};

export class EasyCopySettingTab extends PluginSettingTab {
	plugin: EasyCopy;

	icon: string = 'copy-plus';

	constructor(app: App, plugin: EasyCopy) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.plugin.settings;

		return [
			// General（首个分组不加标题）
			{
				name: this.plugin.t('add-to-menu'),
				desc: this.plugin.t('add-to-menu-desc'),
				control: { type: 'toggle', key: 'addToMenu' },
			},
			{
				name: this.plugin.t('add-extra-commands'),
				desc: this.plugin.t('add-extra-commands-desc'),
				control: { type: 'toggle', key: 'addExtraCommands' },
			},
			{
				name: this.plugin.t('show-notice'),
				desc: this.plugin.t('show-notice-desc'),
				control: { type: 'toggle', key: 'showNotice' },
			},

			// Copy Targets 分组：组内两个一级子页面（格式文本 / 特殊文本块）
			{
				type: 'group',
				heading: this.plugin.t('copy-targets'),
				items: [
					// 格式文本子页面：自定义复制对象开关 + 可拖拽排序的匹配器列表
					{
						type: 'page',
						name: this.plugin.t('formatted-text'),
						desc: this.plugin.t('formatted-text-desc'),
						items: [
							{
								name: this.plugin.t('customize-targets'),
								desc: this.plugin.t('customize-targets-desc'),
								control: { type: 'toggle', key: 'customizeTargets' },
							},
							this.buildMatcherListDefinition(),
						],
					},
					// 特殊文本块子页面：无可复制对象时的回退行为、多行文本（标注/代码块）、块ID
					{
						type: 'page',
						name: this.plugin.t('special-text-blocks'),
						desc: this.plugin.t('special-text-blocks-desc'),
						items: [
							// 未命名分组：无可复制对象时的回退行为
							{
								type: 'group',
								items: [
									{
										name: this.plugin.t('no-copy-action'),
										desc: this.plugin.t('no-copy-action-desc'),
										control: {
											type: 'dropdown',
											key: 'noCopyAction',
											options: {
												[NoCopyAction.NONE]: this.plugin.t('no-copy-action-none'),
												[NoCopyAction.BLOCK_LINK]: this.plugin.t('no-copy-action-block-link'),
												[NoCopyAction.FILE_LINK]: this.plugin.t('no-copy-action-file-link'),
											},
										},
									},
								],
							},
							// 多行文本分组：标注与代码块的复制行为
							{
								type: 'group',
								heading: this.plugin.t('multi-line-text'),
								items: [
									{
										name: this.plugin.t('enable-callout-copy'),
										desc: this.plugin.t('enable-callout-copy-desc'),
										control: { type: 'toggle', key: 'enableCalloutCopy', defaultValue: true },
									},
									{
										name: this.plugin.t('callout-copy-priority'),
										desc: this.plugin.t('callout-copy-priority-desc'),
										// 仅当标注复制启用且回退行为为块链接（存在冲突）时才有意义
										visible: () => settings.enableCalloutCopy && settings.noCopyAction === NoCopyAction.BLOCK_LINK,
										control: { type: 'toggle', key: 'calloutCopyPriority', defaultValue: true },
									},
									{
										name: this.plugin.t('code-block-behavior'),
										desc: this.plugin.t('code-block-behavior-desc'),
										control: {
											type: 'dropdown',
											key: 'codeBlockBehavior',
											options: {
												[CodeBlockBehavior.COPY_CONTENT]: this.plugin.t('code-block-copy-content'),
												[CodeBlockBehavior.COPY_WITH_FENCES]: this.plugin.t('code-block-copy-with-fences'),
												[CodeBlockBehavior.GENERATE_BLOCK_LINK]: this.plugin.t('code-block-generate-block-link'),
												[CodeBlockBehavior.DISABLED]: this.plugin.t('code-block-disabled'),
											},
										},
									},
								],
							},
							// Block ID 分组：仅在回退行为为「Block Link」时显示
							{
								type: 'group',
								heading: this.plugin.t('block-id'),
								visible: () => settings.noCopyAction === NoCopyAction.BLOCK_LINK,
								items: [
									{
										name: this.plugin.t('block-id-insert-position'),
										desc: this.plugin.t('block-id-insert-position-desc'),
										control: {
											type: 'dropdown',
											key: 'blockIdInsertPosition',
											options: {
												[BlockIdInsertPosition.END_OF_BLOCK]: this.plugin.t('block-id-end-of-block'),
												[BlockIdInsertPosition.NEXT_LINE]: this.plugin.t('block-id-next-line'),
											},
										},
									},
									{
										name: this.plugin.t('manual-block-id'),
										desc: this.plugin.t('manual-block-id-desc'),
										control: { type: 'toggle', key: 'allowManualBlockId' },
									},
									{
										name: this.plugin.t('auto-block-display-text'),
										desc: this.plugin.t('auto-block-display-text-desc'),
										control: { type: 'toggle', key: 'autoBlockDisplayText' },
									},
									{
										name: this.plugin.t('block-display-word-limit'),
										desc: this.plugin.t('block-display-word-limit-desc'),
										visible: () => settings.autoBlockDisplayText,
										control: {
											type: 'number',
											key: 'blockDisplayWordLimit',
											min: 1,
											placeholder: '3',
										},
									},
									{
										name: this.plugin.t('block-display-char-limit'),
										desc: this.plugin.t('block-display-char-limit-desc'),
										visible: () => settings.autoBlockDisplayText,
										control: {
											type: 'number',
											key: 'blockDisplayCharLimit',
											min: 1,
											placeholder: '5',
										},
									},
								],
							},
						],
					},
				],
			},

			// Format 分组：Link format / Advanced options 两个子页面
			{
				type: 'group',
				heading: this.plugin.t('format'),
				items: [
					// Link format 子页面：链接格式、粘贴路径解析 + Heading link / Note link 两个分组
					{
						type: 'page',
						name: this.plugin.t('link-format'),
						desc: this.plugin.t('link-format-page-desc'),
						items: [
							{
								name: this.plugin.t('link-format'),
								desc: this.plugin.t('link-format-desc'),
								// 需要 syncPasteHandlerRegistration，无法用 control 绑定
								render: (setting) => {
									setting.addDropdown(dropdown => dropdown
										.addOption(LinkFormat.OBSIDIAN, this.plugin.t('link-format-obsidian'))
										.addOption(LinkFormat.MDLINK, this.plugin.t('markdown-link'))
										.addOption(LinkFormat.WIKILINK, this.plugin.t('wiki-link'))
										.setValue(settings.linkFormat)
										.onChange(value => {
											settings.linkFormat = value as LinkFormat;
											void this.plugin.saveSettings();
											this.plugin.syncPasteHandlerRegistration();
										}));
								},
							},
							{
								name: this.plugin.t('resolve-link-path-on-paste'),
								desc: this.plugin.t('resolve-link-path-on-paste-desc') + ' ',
								// 需要 syncPasteHandlerRegistration 和 desc 里的 info 提示图标
								render: (setting) => {
									setting.addToggle(toggle => toggle
										.setValue(settings.resolveLinkPathOnPaste)
										.onChange(value => {
											settings.resolveLinkPathOnPaste = value;
											void this.plugin.saveSettings();
											this.plugin.syncPasteHandlerRegistration();
										}));
									const infoIcon = setting.descEl.createSpan({
										attr: {
											'aria-label': this.plugin.t('resolve-link-path-on-paste-tooltip'),
										},
										cls: 'easy-copy-info-icon',
									});
									setIcon(infoIcon, 'info');
								},
							},
							// Heading link 分组：显示文本、连接符、简化为笔记链接
							{
								type: 'group',
								heading: this.plugin.t('heading-link'),
								items: [
									{
										name: this.plugin.t('use-heading-as-display'),
										desc: this.plugin.t('use-heading-as-display-desc'),
										control: { type: 'toggle', key: 'useHeadingAsDisplayText' },
									},
									{
										name: this.plugin.t('heading-link-separator'),
										desc: this.plugin.t('heading-link-separator-desc'),
										visible: () => !settings.useHeadingAsDisplayText,
										// 空值回退到 '#'，无法用 control 绑定表达
										render: (setting) => {
											setting.addText(text => text
												.setPlaceholder('#')
												.setValue(settings.headingLinkSeparator)
												.onChange(value => {
													settings.headingLinkSeparator = value || '#';
													void this.plugin.saveSettings();
												}));
										},
									},
									{
										name: this.plugin.t('simplified-heading-to-note-link'),
										desc: this.plugin.t('simplified-heading-to-note-link-desc'),
										control: { type: 'toggle', key: 'simplifiedHeadingToNoteLink' },
									},
									{
										name: this.plugin.t('strict-heading-match'),
										desc: this.plugin.t('strict-heading-match-desc'),
										visible: () => settings.simplifiedHeadingToNoteLink,
										control: { type: 'toggle', key: 'strictHeadingMatch' },
									},
								],
							},
							// Note link 分组：frontmatter 属性作为显示文本
							{
								type: 'group',
								heading: this.plugin.t('note-link'),
								items: [
									{
										name: this.plugin.t('use-frontmatter-as-display'),
										desc: this.plugin.t('use-frontmatter-as-display-desc'),
										control: { type: 'toggle', key: 'useFrontmatterAsDisplay' },
									},
									{
										name: this.plugin.t('frontmatter-key'),
										desc: this.plugin.t('frontmatter-key-desc'),
										visible: () => settings.useFrontmatterAsDisplay,
										// 空值回退到 'title'，无法用 control 绑定表达
										render: (setting) => {
											setting.addText(text => text
												.setPlaceholder('title')
												.setValue(settings.frontmatterKey)
												.onChange(value => {
													settings.frontmatterKey = value || 'title';
													void this.plugin.saveSettings();
												}));
										},
									},
								],
							},
						],
					},
					// Advanced options 子页面：嵌入、Wiki 括号、显示文本正则
					{
						type: 'page',
						name: this.plugin.t('special-format'),
						desc: this.plugin.t('special-format-desc'),
						items: [
							{
								name: this.plugin.t('auto-embed-block-link'),
								desc: this.plugin.t('auto-embed-block-link-desc'),
								control: { type: 'toggle', key: 'autoEmbedBlockLink', defaultValue: false },
							},
							{
								name: this.plugin.t('keep-wiki-brackets'),
								desc: this.plugin.t('keep-wiki-brackets-desc'),
								visible: () => settings.enableWikiLink,
								control: { type: 'toggle', key: 'keepWikiBrackets', defaultValue: true },
							},
							{
								name: this.plugin.t('enable-display-name-regex'),
								desc: this.plugin.t('enable-display-name-regex-desc'),
								control: { type: 'toggle', key: 'enableDisplayNameRegex', defaultValue: false },
							},
							{
								name: this.plugin.t('display-name-regex-from'),
								desc: this.plugin.t('display-name-regex-from-desc'),
								visible: () => settings.enableDisplayNameRegex,
								control: {
									type: 'text',
									key: 'displayNameRegexFrom',
									defaultValue: '',
									placeholder: 'e.g. ^\\d+\\.\\s*',
								},
							},
							{
								name: this.plugin.t('display-name-regex-to'),
								desc: this.plugin.t('display-name-regex-to-desc'),
								visible: () => settings.enableDisplayNameRegex,
								control: {
									type: 'text',
									key: 'displayNameRegexTo',
									defaultValue: '',
									placeholder: 'e.g. $1',
								},
							},
						],
					},
				],
			},
		];
	}

	// 匹配器列表：内置 + 自定义复制对象共用同一排序（即匹配优先级），
	// 使用声明式 list 获得拖拽排序手柄；每行渲染启用开关，自定义行附加配置/删除按钮
	private buildMatcherListDefinition(): SettingDefinitionList {
		const settings = this.plugin.settings;

		return {
			type: 'list',
			heading: this.plugin.t('matcher-priority'),
			visible: () => settings.customizeTargets,
			extraButtons: [
				button => button
					.setIcon('rotate-ccw')
					.setTooltip(this.plugin.t('reset-order'))
					.onClick(() => {
						settings.matcherOrder = normalizeMatcherOrder(DEFAULT_BUILTIN_COPY_MATCHER_IDS, settings.customMatchers);
						void this.plugin.saveSettings();
						this.update();
					}),
			],
			onReorder: (oldIndex, newIndex) => {
				const order = normalizeMatcherOrder(settings.matcherOrder, settings.customMatchers);
				const [moved] = order.splice(oldIndex, 1);
				order.splice(newIndex, 0, moved);
				settings.matcherOrder = order;
				void this.plugin.saveSettings();
			},
			addItem: {
				name: this.plugin.t('add-custom-matcher'),
				action: () => {
					const draft = createCustomMatcher(key => this.plugin.t(key));
					this.openCustomMatcherModal(draft, true);
				},
			},
			items: settings.matcherOrder.map(matcherId => this.buildMatcherRowDefinition(matcherId)),
		};
	}

	private buildMatcherRowDefinition(matcherId: string): SettingDefinition {
		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);

		return {
			name: this.getMatcherName(matcherId) ?? matcherId,
			desc: this.getMatcherDesc(matcherId),
			searchable: false,
			render: (setting: Setting) => {
				// 标记行元素：拖拽预览会把行移出分组容器，样式需跟随行本身
				setting.settingEl.addClass('easy-copy-matcher-row');
				if (customMatcher) {
					setting.addExtraButton(button => button
						.setIcon('trash-2')
						.setTooltip(this.plugin.t('delete-custom-matcher'))
						.onClick(() => this.deleteCustomMatcher(customMatcher.id)));
					setting.addExtraButton(button => button
						.setIcon('settings')
						.setTooltip(this.plugin.t('configure-custom-matcher'))
						.onClick(() => this.openCustomMatcherModal(customMatcher, false)));
				}
				setting.addToggle(toggle => toggle
					.setValue(this.isMatcherEnabled(matcherId))
					.onChange(value => this.setMatcherEnabled(matcherId, value)));
			},
		};
	}

	private getMatcherName(matcherId: string): string | null {
		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);
		if (customMatcher) return customMatcher.name || this.plugin.t('custom-matcher-default-name');

		const builtinKey = BUILTIN_MATCHER_LABEL_KEYS[matcherId as BuiltinCopyMatcherId];
		return builtinKey ? this.plugin.t(builtinKey) : null;
	}

	private getMatcherDesc(matcherId: string): string {
		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);
		if (customMatcher) return customMatcher.note ?? '';

		const builtinDescKey = BUILTIN_MATCHER_DESC_KEYS[matcherId as BuiltinCopyMatcherId];
		return builtinDescKey ? this.plugin.t(builtinDescKey) : '';
	}

	private isMatcherEnabled(matcherId: string): boolean {
		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);
		if (customMatcher) return customMatcher.enabled;

		const settingKey = BUILTIN_MATCHER_SETTING_KEYS[matcherId as BuiltinCopyMatcherId];
		return settingKey ? Boolean(this.plugin.settings[settingKey]) : false;
	}

	private setMatcherEnabled(matcherId: string, enabled: boolean): void {
		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);
		if (customMatcher) {
			customMatcher.enabled = enabled;
			void this.plugin.saveSettings();
			return;
		}

		const settingKey = BUILTIN_MATCHER_SETTING_KEYS[matcherId as BuiltinCopyMatcherId];
		if (!settingKey) return;
		this.plugin.settings[settingKey] = enabled;
		void this.plugin.saveSettings();
	}

	private openCustomMatcherModal(matcher: CustomCopyMatcherSetting, isNew: boolean): void {
		new CustomMatcherModal(
			this.app,
			key => this.plugin.t(key),
			matcher,
			isNew,
			saved => {
				const settings = this.plugin.settings;
				if (isNew) {
					settings.customMatchers.push(saved);
					settings.matcherOrder = normalizeMatcherOrder([...settings.matcherOrder, getCustomMatcherOrderId(saved)], settings.customMatchers);
				} else {
					// 弹窗编辑的是副本，需写回数组中的原条目
					const index = settings.customMatchers.findIndex(matcher => matcher.id === saved.id);
					if (index !== -1) settings.customMatchers[index] = saved;
				}
				void this.plugin.saveSettings();
				// 新增/删除/改名都会改变列表行集，需整体重建定义
				this.update();
			},
		).open();
	}

	private deleteCustomMatcher(id: string): void {
		const settings = this.plugin.settings;
		settings.customMatchers = settings.customMatchers.filter(matcher => matcher.id !== id);
		settings.matcherOrder = normalizeMatcherOrder(settings.matcherOrder, settings.customMatchers);
		void this.plugin.saveSettings();
		this.update();
	}
}
