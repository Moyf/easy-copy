import {
	App,
	PluginSettingTab,
	setIcon,
} from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import EasyCopy from "./main";
import { LinkFormat, BlockIdInsertPosition, CodeBlockBehavior } from "./type";

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

			// Copy Targets 分组：组内两个一级子页面（Copy Targets / Block ID）
			{
				type: 'group',
				heading: this.plugin.t('copy-targets'),
				items: [
					// General elements 子页面：自定义复制对象、标注、代码块
					{
						type: 'page',
						name: this.plugin.t('general-elements'),
						desc: this.plugin.t('copy-targets-desc'),
						items: [
							{
								name: this.plugin.t('customize-targets'),
								desc: this.plugin.t('customize-targets-desc'),
								control: { type: 'toggle', key: 'customizeTargets' },
							},
							{
								name: this.plugin.t('enable-inline-code'),
								desc: this.plugin.t('enable-inline-code-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableInlineCode' },
							},
							{
								name: this.plugin.t('enable-bold'),
								desc: this.plugin.t('enable-bold-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableBold' },
							},
							{
								name: this.plugin.t('enable-highlight'),
								desc: this.plugin.t('enable-highlight-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableHighlight' },
							},
							{
								name: this.plugin.t('enable-italic'),
								desc: this.plugin.t('enable-italic-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableItalic' },
							},
							{
								name: this.plugin.t('enable-strikethrough'),
								desc: this.plugin.t('enable-strikethrough-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableStrikethrough' },
							},
							{
								name: this.plugin.t('enable-inline-latex'),
								desc: this.plugin.t('enable-inline-latex-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableInlineLatex' },
							},
							{
								name: this.plugin.t('enable-link'),
								desc: this.plugin.t('enable-link-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableLink' },
							},
							{
								name: this.plugin.t('enable-wikilink'),
								desc: this.plugin.t('enable-wikilink-desc'),
								visible: () => settings.customizeTargets,
								control: { type: 'toggle', key: 'enableWikiLink', defaultValue: true },
							},
							{
								name: this.plugin.t('enable-callout-copy'),
								desc: this.plugin.t('enable-callout-copy-desc'),
								control: { type: 'toggle', key: 'enableCalloutCopy', defaultValue: true },
							},
							{
								name: this.plugin.t('callout-copy-priority'),
								desc: this.plugin.t('callout-copy-priority-desc'),
								visible: () => settings.enableCalloutCopy,
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
					// Block ID 子页面：自动生成、手动输入、显示文本
					{
						type: 'page',
						name: this.plugin.t('block-id'),
						desc: this.plugin.t('block-id-desc'),
						items: [
							{
								name: this.plugin.t('auto-add-block-id'),
								desc: this.plugin.t('auto-add-block-id-desc'),
								control: { type: 'toggle', key: 'autoAddBlockId' },
							},
							{
								name: this.plugin.t('block-id-insert-position'),
								desc: this.plugin.t('block-id-insert-position-desc'),
								visible: () => settings.autoAddBlockId,
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
								visible: () => settings.autoAddBlockId,
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
									const infoIcon = setting.descEl.createEl('span', {
										attr: {
											'aria-label': this.plugin.t('resolve-link-path-on-paste-tooltip'),
											'class': 'easy-copy-info-icon',
										},
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
}
