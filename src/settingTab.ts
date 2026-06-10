import { 
	App, 
	PluginSettingTab, 
	Setting,
	requireApiVersion,
	setIcon,
} from "obsidian";
import * as ObsidianModule from "obsidian";
import EasyCopy from "./main";
import { BuiltinCopyMatcherId, CustomCopyMatcherSetting, LinkFormat, BlockIdInsertPosition, CodeBlockBehavior } from "./type";
import { DEFAULT_BUILTIN_COPY_MATCHER_IDS, getCustomMatcherOrderId, normalizeMatcherOrder } from "./copyMatcher";

interface SettingsContainer {
	addSetting(cb: (setting: Setting) => void): void;
}

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

function createCustomMatcher(): CustomCopyMatcherSetting {
	const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	return {
		id,
		name: 'Double quotes',
		note: 'Copy text inside double quotes.',
		pattern: '"([^"]+)"',
		flags: 'g',
		captureGroup: 1,
		enabled: true,
	};
}

function createSettingsGroup(containerEl: HTMLElement, heading?: string): SettingsContainer {
	// Check if SettingGroup is available (API 1.11.0+)
	// requireApiVersion is the official Obsidian API method for version checking
	if (requireApiVersion('1.11.0')) {
		// Use SettingGroup - it's guaranteed to exist if requireApiVersion returns true
		// Access SettingGroup via type assertion since it may not be in type definitions
		// for older TypeScript versions, but exists at runtime in Obsidian 1.11.0+
		// Using unknown instead of any to satisfy eslint while maintaining type safety
		const SettingGroupClass = (ObsidianModule as unknown as { SettingGroup?: new (containerEl: HTMLElement) => {
			setHeading(heading: string): {
				addSetting(cb: (setting: Setting) => void): void;
			};
			addSetting(cb: (setting: Setting) => void): void;
		} }).SettingGroup;
		
		if (SettingGroupClass) {
			const group = heading 
				? new SettingGroupClass(containerEl).setHeading(heading)
				: new SettingGroupClass(containerEl);
			return {
				addSetting(cb: (setting: Setting) => void) {
					group.addSetting(cb);
				}
			};
		}
	}
	
	// Fallback path (either API < 1.11.0 or SettingGroup not found)
	{
		// Fallback: Create a heading manually for older API versions
		// Note: While best practice prefers Setting.setHeading(), the fallback path
		// is for versions that may not support it, so manual heading is appropriate here
		if (heading) {
			const headingEl = containerEl.createDiv('setting-group-heading');
			headingEl.createEl('h3', { text: heading });
		}
		
		return {
			addSetting(cb: (setting: Setting) => void) {
				const setting = new Setting(containerEl);
				cb(setting);
			}
		};
	}
}


export class EasyCopySettingTab extends PluginSettingTab {
	plugin: EasyCopy;
	private expandedCustomMatcherId: string | null = null;
	private expandedCustomMatcherEl: HTMLElement | null = null;
	private draggedMatcherId: string | null = null;

	icon: string = 'copy-plus';

	constructor(app: App, plugin: EasyCopy) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private getMatcherName(matcherId: string): string | null {
		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);
		if (customMatcher) return customMatcher.name || this.plugin.t('custom-matcher');

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

	private toggleCustomMatcherConfig(settingEl: HTMLElement, customMatcher: CustomCopyMatcherSetting): void {
		const existingConfigEl = this.containerEl.querySelector<HTMLElement>(`.easy-copy-matcher-config[data-matcher-id="${customMatcher.id}"]`);
		if (existingConfigEl) {
			existingConfigEl.remove();
			if (this.expandedCustomMatcherEl === existingConfigEl) this.expandedCustomMatcherEl = null;
			this.expandedCustomMatcherId = null;
			return;
		}

		if (this.expandedCustomMatcherId === customMatcher.id && this.expandedCustomMatcherEl) {
			this.expandedCustomMatcherEl.remove();
			this.expandedCustomMatcherEl = null;
			this.expandedCustomMatcherId = null;
			return;
		}

		this.expandedCustomMatcherEl?.remove();
		const configEl = activeDocument.createElement('div');
		configEl.addClass('easy-copy-matcher-config');
		configEl.dataset.matcherId = customMatcher.id;
		settingEl.insertAdjacentElement('afterend', configEl);
		this.renderCustomMatcherConfig(configEl, customMatcher);
		this.expandedCustomMatcherEl = configEl;
		this.expandedCustomMatcherId = customMatcher.id;
	}

	private persistMatcherOrderFromDom(): void {
		const matcherOrder = Array.from(this.containerEl.querySelectorAll<HTMLElement>('.easy-copy-matcher-row'))
			.map(row => row.dataset.matcherId)
			.filter((id): id is string => Boolean(id));

		this.plugin.settings.matcherOrder = normalizeMatcherOrder(matcherOrder, this.plugin.settings.customMatchers);
		void this.plugin.saveSettings();
	}

	private closeExpandedCustomMatcherConfig(): void {
		this.expandedCustomMatcherEl?.remove();
		this.expandedCustomMatcherEl = null;
		this.expandedCustomMatcherId = null;
	}

	private reorderMatcherRows(containerEl: HTMLElement): void {
		this.closeExpandedCustomMatcherConfig();
		for (const matcherId of this.plugin.settings.matcherOrder) {
			const rowEl = containerEl.querySelector<HTMLElement>(`.easy-copy-matcher-row[data-matcher-id="${matcherId}"]`);
			if (rowEl) containerEl.appendChild(rowEl);
		}
	}

	private moveDraggedMatcherPreview(targetEl: HTMLElement, targetMatcherId: string, pointerY: number): void {
		const sourceMatcherId = this.draggedMatcherId;
		if (!sourceMatcherId || sourceMatcherId === targetMatcherId) return;

		const sourceEl = this.containerEl.querySelector<HTMLElement>(`.easy-copy-matcher-row[data-matcher-id="${sourceMatcherId}"]`);
		if (!sourceEl) return;

		const targetRect = targetEl.getBoundingClientRect();
		const placeAfter = pointerY > targetRect.top + targetRect.height / 2;
		const referenceEl = placeAfter ? targetEl.nextElementSibling : targetEl;
		if (referenceEl === sourceEl) return;

		targetEl.parentElement?.insertBefore(sourceEl, referenceEl);
	}

	private isRegexValid(pattern: string, flags: string): boolean {
		try {
			new RegExp(pattern, flags);
			return true;
		} catch {
			return false;
		}
	}

	private focusNextConfigInput(inputEl: HTMLInputElement, direction: 1 | -1): void {
		const configEl = inputEl.closest('.easy-copy-matcher-config');
		if (!configEl) return;

		const inputs = Array.from(configEl.querySelectorAll<HTMLInputElement>('input'));
		const currentIndex = inputs.indexOf(inputEl);
		const nextInput = inputs[currentIndex + direction];
		if (!nextInput) return;

		nextInput.focus();
		nextInput.select();
	}

	private enableConfigInputTabNavigation(inputEl: HTMLInputElement): void {
		inputEl.addEventListener('keydown', event => {
			if (event.key !== 'Tab') return;

			const direction = event.shiftKey ? -1 : 1;
			const configEl = inputEl.closest('.easy-copy-matcher-config');
			const inputs = configEl ? Array.from(configEl.querySelectorAll<HTMLInputElement>('input')) : [];
			const currentIndex = inputs.indexOf(inputEl);
			const nextInput = inputs[currentIndex + direction];
			if (!nextInput) return;

			event.preventDefault();
			this.focusNextConfigInput(inputEl, direction);
		});
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		this.expandedCustomMatcherEl = null;

		const generalGroup = createSettingsGroup(containerEl);

		generalGroup.addSetting(setting => setting
			.setName(this.plugin.t('add-to-menu'))
			.setDesc(this.plugin.t('add-to-menu-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addToMenu)
				.onChange( value => {
					this.plugin.settings.addToMenu = value;
					void this.plugin.saveSettings();
				})));

		generalGroup.addSetting(setting => setting
			.setName(this.plugin.t('add-extra-commands'))
			.setDesc(this.plugin.t('add-extra-commands-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addExtraCommands)
				.onChange( value => {
					this.plugin.settings.addExtraCommands = value;
					void this.plugin.saveSettings();
				})));

		generalGroup.addSetting(setting => setting
			.setName(this.plugin.t('show-notice'))
			.setDesc(this.plugin.t('show-notice-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotice)
				.onChange( value => {
					this.plugin.settings.showNotice = value;
					void this.plugin.saveSettings();
				})));

		const formatGroup = createSettingsGroup(containerEl, this.plugin.t('format'));

		formatGroup.addSetting(setting => setting
			.setName(this.plugin.t('link-format'))
			.setDesc(this.plugin.t('link-format-desc'))
			.addDropdown(dropdown => dropdown
				.addOption(LinkFormat.OBSIDIAN, this.plugin.t('link-format-obsidian'))
				.addOption(LinkFormat.MDLINK, this.plugin.t('markdown-link'))
				.addOption(LinkFormat.WIKILINK, this.plugin.t('wiki-link'))
				.setValue(this.plugin.settings.linkFormat)
				.onChange( (value) => {
					this.plugin.settings.linkFormat = value as LinkFormat;
					void this.plugin.saveSettings();
					this.plugin.syncPasteHandlerRegistration();
					this.display();
				})));

		// 解析器在粘贴时拦截事件，根据目标文件重新生成链接。
		// 「跟随 Obsidian 设置」时遵循 vault 的路径风格（最短/相对/绝对）；
		// 选择明确的 Wiki/Markdown 格式时仅使用最短唯一路径。
		formatGroup.addSetting(setting => {
		const descFragment = activeDocument.createDocumentFragment();
		descFragment.append(this.plugin.t('resolve-link-path-on-paste-desc') + ' ');
		const infoIcon = descFragment.createEl('span', {
			attr: {
				'aria-label': this.plugin.t('resolve-link-path-on-paste-tooltip'),
				'class': 'setting-editor-extra-setting-button'
			},
		});
		setIcon(infoIcon, 'info');

			setting
				.setName(this.plugin.t('resolve-link-path-on-paste'))
				.setDesc(descFragment)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.resolveLinkPathOnPaste)
					.onChange( (value) => {
						this.plugin.settings.resolveLinkPathOnPaste = value;
						void this.plugin.saveSettings();
						this.plugin.syncPasteHandlerRegistration();
					}));
		});

		formatGroup.addSetting(setting => setting
			.setName(this.plugin.t('use-heading-as-display'))
			.setDesc(this.plugin.t('use-heading-as-display-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useHeadingAsDisplayText)
				.onChange( (value) => {
					this.plugin.settings.useHeadingAsDisplayText = value;
					void this.plugin.saveSettings();
					this.display();
				})));

		// 新增：标题链接连接符设置，仅在禁用"使用标题作为显示文本"时显示
		if (!this.plugin.settings.useHeadingAsDisplayText) {
			formatGroup.addSetting(setting => setting
				.setName(this.plugin.t('heading-link-separator'))
				.setDesc(this.plugin.t('heading-link-separator-desc'))
				.addText(text => text
					.setPlaceholder('#')
					.setValue(this.plugin.settings.headingLinkSeparator)
				.onChange( value => {
					this.plugin.settings.headingLinkSeparator = value || '#';
					void this.plugin.saveSettings();
				})
				));
		}

		// 后续新增：文件名包含标题时，简化为复制文件链接（通常用于复制一级标题时）
		// 「跟随 Obsidian 设置」时，格式与路径选择应交给 Obsidian——
		formatGroup.addSetting(setting => setting
			.setName(this.plugin.t('simplified-heading-to-note-link'))
			.setDesc(this.plugin.t('simplified-heading-to-note-link-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.simplifiedHeadingToNoteLink)
				.onChange( value => {
					this.plugin.settings.simplifiedHeadingToNoteLink = value;
					void this.plugin.saveSettings();
					this.display();
				})));

		if (this.plugin.settings.simplifiedHeadingToNoteLink) {
			formatGroup.addSetting(setting => setting
				.setName(this.plugin.t('strict-heading-match'))
				.setDesc(this.plugin.t('strict-heading-match-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.strictHeadingMatch)
				.onChange( value => {
					this.plugin.settings.strictHeadingMatch = value;
					void this.plugin.saveSettings();
				})));
		}


		// 新增：是否使用 frontmatter 属性作为显示文本
		formatGroup.addSetting(setting => setting
			.setName(this.plugin.t('use-frontmatter-as-display'))
			.setDesc(this.plugin.t('use-frontmatter-as-display-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useFrontmatterAsDisplay)
				.onChange( value => {
					this.plugin.settings.useFrontmatterAsDisplay = value;
					void this.plugin.saveSettings();
					this.display();
				})
			));

		// 新增：自定义 frontmatter 属性名，仅在上方开启时显示
		if (this.plugin.settings.useFrontmatterAsDisplay) {
			formatGroup.addSetting(setting => setting
				.setName(this.plugin.t('frontmatter-key'))
				.setDesc(this.plugin.t('frontmatter-key-desc'))
				.addText(text => text
					.setPlaceholder('title')
					.setValue(this.plugin.settings.frontmatterKey)
					.onChange( value => {
						this.plugin.settings.frontmatterKey = value || 'title';
						void this.plugin.saveSettings();
					})
				));
		}


		const codeBlockGroup = createSettingsGroup(containerEl, this.plugin.t('code-block'));

		codeBlockGroup.addSetting(setting => setting
			.setName(this.plugin.t('code-block-behavior'))
			.setDesc(this.plugin.t('code-block-behavior-desc'))
			.addDropdown(dropdown => dropdown
				.addOption(CodeBlockBehavior.COPY_CONTENT, this.plugin.t('code-block-copy-content'))
				.addOption(CodeBlockBehavior.COPY_WITH_FENCES, this.plugin.t('code-block-copy-with-fences'))
				.addOption(CodeBlockBehavior.GENERATE_BLOCK_LINK, this.plugin.t('code-block-generate-block-link'))
				.addOption(CodeBlockBehavior.DISABLED, this.plugin.t('code-block-disabled'))
				.setValue(this.plugin.settings.codeBlockBehavior)
				.onChange( value => {
					this.plugin.settings.codeBlockBehavior = value as CodeBlockBehavior;
					void this.plugin.saveSettings();
				})));

		const blockIdGroup = createSettingsGroup(containerEl, this.plugin.t('block-id'));

		blockIdGroup.addSetting(setting => setting
			.setName(this.plugin.t('auto-add-block-id'))
			.setDesc(this.plugin.t('auto-add-block-id-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoAddBlockId)
				.onChange( value => {
					this.plugin.settings.autoAddBlockId = value;
					void this.plugin.saveSettings();
					this.display();
				})));

		if (this.plugin.settings.autoAddBlockId) {
			// 新增：块ID插入位置设置
			blockIdGroup.addSetting(setting => setting
				.setName(this.plugin.t('block-id-insert-position'))
				.setDesc(this.plugin.t('block-id-insert-position-desc'))
				.addDropdown(dropdown => dropdown
					.addOption(BlockIdInsertPosition.END_OF_BLOCK, this.plugin.t('block-id-end-of-block'))
					.addOption(BlockIdInsertPosition.NEXT_LINE, this.plugin.t('block-id-next-line'))
					.setValue(this.plugin.settings.blockIdInsertPosition)
					.onChange( value => {
						this.plugin.settings.blockIdInsertPosition = value as BlockIdInsertPosition;
						void this.plugin.saveSettings();
					})));
		}

		if (this.plugin.settings.autoAddBlockId) {
			blockIdGroup.addSetting(setting => setting
				.setName(this.plugin.t('manual-block-id'))
				.setDesc(this.plugin.t('manual-block-id-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.allowManualBlockId)
					.onChange( value => {
						this.plugin.settings.allowManualBlockId = value;
						void this.plugin.saveSettings();
					})));
		}
		
		// 新增：自动为 Block 链接添加显示文本
		blockIdGroup.addSetting(setting => setting
			.setName(this.plugin.t('auto-block-display-text'))
			.setDesc(this.plugin.t('auto-block-display-text-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoBlockDisplayText)
				.onChange( value => {
					this.plugin.settings.autoBlockDisplayText = value;
					void this.plugin.saveSettings();
					this.display();
				})
			));

		// 新增：块显示文本限制设置，仅在启用 autoBlockDisplayText 时显示
		if (this.plugin.settings.autoBlockDisplayText) {
			blockIdGroup.addSetting(setting => setting
				.setName(this.plugin.t('block-display-word-limit'))
				.setDesc(this.plugin.t('block-display-word-limit-desc'))
				.addText(text => text
					.setPlaceholder('3')
					.setValue(String(this.plugin.settings.blockDisplayWordLimit))
					.onChange( value => {
						const numValue = parseInt(value) || 3;
						this.plugin.settings.blockDisplayWordLimit = Math.max(1, numValue);
						void this.plugin.saveSettings();
					})
				));

			blockIdGroup.addSetting(setting => setting
				.setName(this.plugin.t('block-display-char-limit'))
				.setDesc(this.plugin.t('block-display-char-limit-desc'))
				.addText(text => text
					.setPlaceholder('5')
					.setValue(String(this.plugin.settings.blockDisplayCharLimit))
					.onChange( value => {
						const numValue = parseInt(value) || 5;
						this.plugin.settings.blockDisplayCharLimit = Math.max(1, numValue);
						void this.plugin.saveSettings();
					})
				));
		}

		const targetGroup = createSettingsGroup(containerEl, this.plugin.t('target'));

		targetGroup.addSetting(setting => setting
			.setName(this.plugin.t('customize-targets'))
			.setDesc(this.plugin.t('customize-targets-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.customizeTargets)
				.onChange( value => {
					this.plugin.settings.customizeTargets = value;
					void this.plugin.saveSettings();
					this.display();
				})));

		if (this.plugin.settings.customizeTargets) {
			this.renderMatcherList(targetGroup);
		}

		targetGroup.addSetting(setting => setting
			.setName(this.plugin.t('enable-callout-copy'))
			.setDesc(this.plugin.t('enable-callout-copy-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCalloutCopy ?? true)
				.onChange( value => {
					this.plugin.settings.enableCalloutCopy = value;
					void this.plugin.saveSettings();
					this.display();
				})));
		// 优先复制 Callout 内容
		if (this.plugin.settings.enableCalloutCopy) {
			targetGroup.addSetting(setting => setting
				.setName(this.plugin.t('callout-copy-priority'))
				.setDesc(this.plugin.t('callout-copy-priority-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.calloutCopyPriority ?? true)
					.onChange( value => {
						this.plugin.settings.calloutCopyPriority = value;
						void this.plugin.saveSettings();
					})));
		}

		
		const specialFormatGroup = createSettingsGroup(containerEl, this.plugin.t('special-format'));
				
		// 块链接特殊格式选项
		specialFormatGroup.addSetting(setting => setting
			.setName(this.plugin.t('auto-embed-block-link'))
			.setDesc(this.plugin.t('auto-embed-block-link-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoEmbedBlockLink ?? false)
				.onChange( value => {
					this.plugin.settings.autoEmbedBlockLink = value;
					void this.plugin.saveSettings();
				})));

		// 仅当启用 Wiki 链接复制时显示
		if (this.plugin.settings.enableWikiLink) {
			specialFormatGroup.addSetting(setting => setting
				.setName(this.plugin.t('keep-wiki-brackets'))
				.setDesc(this.plugin.t('keep-wiki-brackets-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.keepWikiBrackets ?? true)
					.onChange( value => {
						this.plugin.settings.keepWikiBrackets = value;
						void this.plugin.saveSettings();
					})));
		}

		// 正则替换显示名称
		specialFormatGroup.addSetting(setting => setting
			.setName(this.plugin.t('enable-display-name-regex'))
			.setDesc(this.plugin.t('enable-display-name-regex-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDisplayNameRegex ?? false)
				.onChange( value => {
					this.plugin.settings.enableDisplayNameRegex = value;
					void this.plugin.saveSettings();
					this.display();
				})));

		if (this.plugin.settings.enableDisplayNameRegex) {
			specialFormatGroup.addSetting(setting => setting
				.setName(this.plugin.t('display-name-regex-from'))
				.setDesc(this.plugin.t('display-name-regex-from-desc'))
				.addText(text => text
					.setPlaceholder('e.g. ^\\d+\\.\\s*')
					.setValue(this.plugin.settings.displayNameRegexFrom ?? '')
					.onChange( value => {
						this.plugin.settings.displayNameRegexFrom = value;
						void this.plugin.saveSettings();
					})));

			specialFormatGroup.addSetting(setting => setting
				.setName(this.plugin.t('display-name-regex-to'))
				.setDesc(this.plugin.t('display-name-regex-to-desc'))
				.addText(text => text
					.setPlaceholder('e.g. $1')
					.setValue(this.plugin.settings.displayNameRegexTo ?? '')
					.onChange( value => {
						this.plugin.settings.displayNameRegexTo = value;
						void this.plugin.saveSettings();
					})));
		}
	}

	private renderMatcherList(targetGroup: SettingsContainer): void {
		this.plugin.settings.matcherOrder = normalizeMatcherOrder(this.plugin.settings.matcherOrder, this.plugin.settings.customMatchers);
		let listContainerEl: HTMLElement | null = null;

		targetGroup.addSetting(setting => setting
			.setName(this.plugin.t('matcher-priority'))
			.setDesc(this.plugin.t('matcher-priority-desc'))
			.addButton(button => button
				.setButtonText(this.plugin.t('reset-order'))
				.onClick(() => {
					if (!listContainerEl) return;
					this.plugin.settings.matcherOrder = normalizeMatcherOrder(DEFAULT_BUILTIN_COPY_MATCHER_IDS, this.plugin.settings.customMatchers);
					void this.plugin.saveSettings();
					this.reorderMatcherRows(listContainerEl);
				})));

		targetGroup.addSetting(setting => setting
			.setName(this.plugin.t('custom-matchers'))
			.setDesc(this.plugin.t('custom-matchers-desc'))
			.addButton(button => button
				.setButtonText(this.plugin.t('add-custom-matcher'))
				.onClick(() => {
					if (!listContainerEl) return;
					const customMatcher = createCustomMatcher();
					this.plugin.settings.customMatchers.push(customMatcher);
				this.plugin.settings.matcherOrder = normalizeMatcherOrder([...this.plugin.settings.matcherOrder, getCustomMatcherOrderId(customMatcher)], this.plugin.settings.customMatchers);
				void this.plugin.saveSettings();
					const settingEl = this.addMatcherSetting(listContainerEl, getCustomMatcherOrderId(customMatcher));
					if (settingEl) this.toggleCustomMatcherConfig(settingEl, customMatcher);
				})));

		listContainerEl = activeDocument.createElement('div');
		listContainerEl.addClass('easy-copy-matcher-list');
		this.containerEl.querySelector('.easy-copy-matcher-list')?.remove();
		const lastTargetSetting = this.containerEl.querySelectorAll('.setting-item');
		lastTargetSetting[lastTargetSetting.length - 1]?.insertAdjacentElement('afterend', listContainerEl);

		for (const matcherId of this.plugin.settings.matcherOrder) {
			this.addMatcherSetting(listContainerEl, matcherId);
		}
	}

	private addMatcherSetting(containerEl: HTMLElement, matcherId: string): HTMLElement | null {
		const matcherName = this.getMatcherName(matcherId);
		if (!matcherName) return null;

		const customMatcher = this.plugin.settings.customMatchers.find(matcher => getCustomMatcherOrderId(matcher) === matcherId);
		let settingEl: HTMLElement | null = null;
		new Setting(containerEl).then(setting => {
			settingEl = setting.settingEl;
			setting
				.setName(matcherName)
				.setDesc(this.getMatcherDesc(matcherId));

			setting.settingEl.addClass('easy-copy-matcher-row');
			const dragHandleEl = activeDocument.createElement('div');
			dragHandleEl.addClass('clickable-icon');
			dragHandleEl.addClass('extra-setting-button');
			dragHandleEl.addClass('mod-drag-handle');
			dragHandleEl.setAttr('aria-label', this.plugin.t('drag-copy-target'));
			dragHandleEl.setAttr('tabindex', '-1');
			setIcon(dragHandleEl, 'menu');
			setting.settingEl.insertBefore(dragHandleEl, setting.infoEl);

			setting.settingEl.setAttr('draggable', 'true');
			setting.settingEl.dataset.matcherId = matcherId;
			setting.settingEl.addEventListener('dragstart', event => {
				this.expandedCustomMatcherEl?.remove();
				this.expandedCustomMatcherEl = null;
				this.expandedCustomMatcherId = null;
				this.draggedMatcherId = matcherId;
				setting.settingEl.addClass('is-dragging');
				event.dataTransfer?.setData('text/plain', matcherId);
				if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
			});
			setting.settingEl.addEventListener('dragover', event => {
				event.preventDefault();
				this.moveDraggedMatcherPreview(setting.settingEl, matcherId, event.clientY);
			});
			setting.settingEl.addEventListener('drop', event => {
				event.preventDefault();
				this.persistMatcherOrderFromDom();
			});
			setting.settingEl.addEventListener('dragend', () => {
				setting.settingEl.removeClass('is-dragging');
				this.draggedMatcherId = null;
				this.persistMatcherOrderFromDom();
			});

			if (customMatcher) {
				setting.addExtraButton(button => button
					.setIcon('trash-2')
					.setTooltip(this.plugin.t('delete-custom-matcher'))
					.onClick(() => {
						this.deleteCustomMatcher(customMatcher.id, setting.settingEl);
					}));
				setting.addExtraButton(button => button
					.setIcon('settings')
					.setTooltip(this.plugin.t('configure-custom-matcher'))
					.onClick(() => {
						this.toggleCustomMatcherConfig(setting.settingEl, customMatcher);
					}));
			}

			setting.addToggle(toggle => toggle
				.setValue(this.isMatcherEnabled(matcherId))
				.onChange(value => {
					this.setMatcherEnabled(matcherId, value);
				}));

			if (customMatcher && this.expandedCustomMatcherId === customMatcher.id) {
				const configEl = activeDocument.createElement('div');
				configEl.addClass('easy-copy-matcher-config');
				configEl.dataset.matcherId = customMatcher.id;
				setting.settingEl.insertAdjacentElement('afterend', configEl);
				this.renderCustomMatcherConfig(configEl, customMatcher);
			}
		});
		return settingEl;
	}

	private renderCustomMatcherConfig(containerEl: HTMLElement, customMatcher: CustomCopyMatcherSetting): void {
		new Setting(containerEl)
			.setName(this.plugin.t('custom-matcher-name'))
			.setDesc(this.plugin.t('custom-matcher-name-desc'))
			.addText(text => {
				this.enableConfigInputTabNavigation(text.inputEl);
				text.setValue(customMatcher.name)
					.onChange(value => {
					customMatcher.name = value;
					this.updateMatcherRowText(getCustomMatcherOrderId(customMatcher), value || this.plugin.t('custom-matcher'), customMatcher.note ?? '');
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(this.plugin.t('custom-matcher-note'))
			.setDesc(this.plugin.t('custom-matcher-note-desc'))
			.addText(text => {
				this.enableConfigInputTabNavigation(text.inputEl);
				text.setValue(customMatcher.note ?? '')
					.onChange(value => {
					customMatcher.note = value;
					this.updateMatcherRowText(getCustomMatcherOrderId(customMatcher), customMatcher.name || this.plugin.t('custom-matcher'), value);
					void this.plugin.saveSettings();
				});
			});

		const patternSetting = new Setting(containerEl)
			.setName(this.plugin.t('custom-matcher-pattern'))
			.setDesc(this.plugin.t('custom-matcher-pattern-desc'));
		const regexErrorEl = patternSetting.infoEl.createDiv({ cls: 'easy-copy-regex-error' });
		const updateRegexError = (value: string) => {
			regexErrorEl.setText(value);
			regexErrorEl.toggleClass('is-visible', Boolean(value));
		};

		patternSetting.addText(text => {
			this.enableConfigInputTabNavigation(text.inputEl);
			text.setPlaceholder('"([^"]+)"')
				.setValue(customMatcher.pattern)
				.onChange(value => {
					if (!this.isRegexValid(value, customMatcher.flags)) {
						updateRegexError(this.plugin.t('invalid-regex'));
						return;
					}
					updateRegexError('');
					customMatcher.pattern = value;
					void this.plugin.saveSettings();
				});
		});

		new Setting(containerEl)
			.setName(this.plugin.t('custom-matcher-flags'))
			.setDesc(this.plugin.t('custom-matcher-flags-desc'))
			.addText(text => {
				this.enableConfigInputTabNavigation(text.inputEl);
				text.setPlaceholder('g')
					.setValue(customMatcher.flags)
					.onChange(value => {
					if (!this.isRegexValid(customMatcher.pattern, value)) {
						updateRegexError(this.plugin.t('invalid-regex'));
						return;
					}
					updateRegexError('');
					customMatcher.flags = value;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(this.plugin.t('custom-matcher-capture-group'))
			.setDesc(this.plugin.t('custom-matcher-capture-group-desc'))
			.addText(text => {
				this.enableConfigInputTabNavigation(text.inputEl);
				text.setPlaceholder('1')
					.setValue(String(customMatcher.captureGroup))
					.onChange(value => {
					customMatcher.captureGroup = Math.max(0, parseInt(value) || 0);
					void this.plugin.saveSettings();
				});
			});
	}

	private updateMatcherRowText(matcherId: string, name: string, desc: string): void {
		for (const row of Array.from(this.containerEl.querySelectorAll<HTMLElement>('.easy-copy-matcher-row'))) {
			if (row.dataset.matcherId !== matcherId) continue;
			row.querySelector('.setting-item-name')?.setText(name);
			row.querySelector('.setting-item-description')?.setText(desc);
		}
	}

	private deleteCustomMatcher(id: string, rowEl?: HTMLElement): void {
		this.plugin.settings.customMatchers = this.plugin.settings.customMatchers.filter(matcher => matcher.id !== id);
		this.plugin.settings.matcherOrder = normalizeMatcherOrder(this.plugin.settings.matcherOrder, this.plugin.settings.customMatchers);
		if (this.expandedCustomMatcherId === id) this.closeExpandedCustomMatcherConfig();
		rowEl?.remove();
		void this.plugin.saveSettings();
	}
}
