import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu } from 'obsidian';
import { Language, TranslationKey, I18n } from './i18n';

enum LinkFormat {
	MDLINK = 'markdown-link',
	WIKILINK = 'wiki-link'
}

interface EasyCopySettings {
	addToMenu: boolean;
	showNotice: boolean;
	useHeadingAsDisplayText: boolean;
	linkFormat: LinkFormat;
	customizeTargets: boolean;
	enableInlineCode: boolean;
	enableBold: boolean;
	enableHighlight: boolean;
	enableItalic: boolean;
}

const DEFAULT_SETTINGS: EasyCopySettings = {
	addToMenu: true,
	showNotice: true,
	useHeadingAsDisplayText: true,
	linkFormat: LinkFormat.WIKILINK,
	customizeTargets: false,
	enableInlineCode: true,
	enableBold: true,
	enableHighlight: true,
	enableItalic: false
}

export default class EasyCopy extends Plugin {
	settings: EasyCopySettings;
	i18n: I18n;

	async onload() {
		await this.loadSettings();
		
		// 初始化i18n，使用Obsidian的语言设置
		this.initializeI18n();

		/**
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('copy', 'Easy Copy', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('easy-copy-ribbon-class');
		 */

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'contextual-copy',
			name: this.t('contextual-copy'),
			hotkeys: [{
				modifiers: ['Mod', 'Alt'],
				key: 'c'
			}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				// 实现智能复制功能
				this.contextualCopy(editor, view);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EasyCopySettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// 注册右键菜单
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				// 只有当设置中的 addToMenu 为 true 时才添加菜单项
				if (this.settings.addToMenu) {
					menu.addItem(item => {
						item
							.setTitle(this.t('contextual-copy'))
							.setIcon('copy-slash')
							.onClick(async () => {
								this.contextualCopy(editor, view);
							});
					})
				}
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 获取本地化文本
	 * @param key 翻译键值
	 * @returns 翻译后的文本
	 */
	public t(key: TranslationKey): string {
		return this.i18n.t(key);
	}

	/**
	 * 智能复制功能：根据光标位置复制不同类型的内容
	 * 支持复制行内代码、块ID链接和标题链接
	 */
	private contextualCopy(editor: Editor, view: MarkdownView): void {
		// 获取当前文件和光标信息
		const file = view.file;
		if (!file) {
			new Notice(this.t('no-file'));
			return;
		}

		const cursor = editor.getCursor();
		const curLine = editor.getLine(cursor.line);
		const curCh = cursor.ch;
		
		// 获取文件名（去除.md后缀）
		const filename = file.basename;
		
		// 1. 检查是否是标题行
		if (curLine.startsWith('#')) {
			this.copyHeadingLink(curLine, filename);
			return;
		}
		
		// 2. 检查是否包含行内代码
		if ((!this.settings.customizeTargets || this.settings.enableInlineCode) && curLine.includes('`')) {
			// 尝试提取行内代码
			const inlineCode = this.getInlineCode(curLine, curCh);
			if (inlineCode) {
				navigator.clipboard.writeText(inlineCode);
				if (this.settings.showNotice) {
					new Notice(this.t('inline-code-copied'));
				}
				return;
			}
		}
		
		// 3. 检查是否包含块ID
		if (curLine.includes('^')) {
			// 尝试提取块ID
			const blockId = this.getBlockId(curLine);
			if (blockId) {
				const blockIdLink = this.settings.linkFormat === LinkFormat.WIKILINK 
					? `[[${filename}#^${blockId}]]` 
					: `[${blockId}](${filename}#^${blockId})`;
				
				navigator.clipboard.writeText(blockIdLink);
				if (this.settings.showNotice) {
					new Notice(this.t('block-id-copied'));
				}
				return;
			}
		}
		
		// 4. 检查是否包含加粗文本
		if ((!this.settings.customizeTargets || this.settings.enableBold) && curLine.includes('**')) {
			const boldText = this.getBoldText(curLine, curCh);
			if (boldText) {
				navigator.clipboard.writeText(boldText);
				if (this.settings.showNotice) {
					new Notice(this.t('bold-copied'));
				}
				return;
			}
		}
		
		// 5. 检查是否包含高亮文本
		if ((!this.settings.customizeTargets || this.settings.enableHighlight) && curLine.includes('==')) {
			const highlightText = this.getHighlightText(curLine, curCh);
			if (highlightText) {
				navigator.clipboard.writeText(highlightText);
				if (this.settings.showNotice) {
					new Notice(this.t('highlight-copied'));
				}
				return;
			}
		}
		
		// 6. 检查是否包含斜体文本
		if ((!this.settings.customizeTargets || this.settings.enableItalic) && (curLine.includes('*') || curLine.includes('_'))) {
			const italicText = this.getItalicText(curLine, curCh);
			if (italicText) {
				navigator.clipboard.writeText(italicText);
				if (this.settings.showNotice) {
					new Notice(this.t('italic-copied'));
				}
				return;
			}
		}
		
		// 如果没有找到可复制的内容
		new Notice(this.t('no-content'));
	}
	
	/**
	 * 提取行内代码
	 */
	private getInlineCode(str: string, cursor: number): string | null {
		const start = str.lastIndexOf('`', cursor - 1);
		const end = str.indexOf('`', cursor);
		
		if (start === -1 || end === -1) {
			return null;
		}
		
		return str.substring(start + 1, end);
	}
	
	/**
	 * 提取块ID
	 */
	private getBlockId(str: string): string | null {
		// 提取当前光标所在行的像是 ^block-id-123 这样的 block id
		const regex = /(?:^|\s+)\^([a-zA-Z0-9_-]+)(?:\s*|$)/;
		const match = str.match(regex);
		
		if (match) {
			return match[1];
		}
		
		return null;
	}
	
	/**
	 * 复制标题链接
	 */
	private copyHeadingLink(headingLine: string, filename: string): void {
		// 提取标题文本和级别
		const selectedHeading = headingLine.replace(/#+\s+/, "#");
		const linkAlias = selectedHeading.replace(/#+\s*/, "");
		
		let headingReferenceLink = "";
		
		// 根据设置选择链接格式
		if (this.settings.linkFormat === LinkFormat.WIKILINK) {
			// Wiki链接格式
			headingReferenceLink = `[[${filename}${selectedHeading}|${linkAlias}]]`;
			
			// 处理同名标题的特殊情况
			if (this.settings.useHeadingAsDisplayText && filename === linkAlias) {
				headingReferenceLink = `[[${filename}]]`;
			}
		} else {
			// Markdown链接格式
			headingReferenceLink = `[${linkAlias}](${filename}${selectedHeading})`;
		}
		
		// 复制到剪贴板
		navigator.clipboard.writeText(headingReferenceLink);
		
		// 显示通知
		if (this.settings.showNotice) {
			if (headingLine.startsWith("# ")) {
				new Notice(this.t('note-link-copied'));
			} else {
				new Notice(this.t('heading-copied'));
			}
		}
	}

	/**
	 * 提取加粗文本
	 */
	private getBoldText(str: string, cursor: number): string | null {
		// 查找光标前后的 ** 标记
		const start = str.lastIndexOf('**', cursor - 1);
		const end = str.indexOf('**', cursor);
		
		if (start === -1 || end === -1) {
			return null;
		}
		
		return str.substring(start + 2, end);
	}
	
	/**
	 * 提取高亮文本
	 */
	private getHighlightText(str: string, cursor: number): string | null {
		// 查找光标前后的 == 标记
		const start = str.lastIndexOf('==', cursor - 1);
		const end = str.indexOf('==', cursor);
		
		if (start === -1 || end === -1) {
			return null;
		}
		
		return str.substring(start + 2, end);
	}
	
	/**
	 * 提取斜体文本
	 */
	private getItalicText(str: string, cursor: number): string | null {
		// 尝试查找使用 * 的斜体
		let start = str.lastIndexOf('*', cursor - 1);
		if (start > 0 && str.charAt(start - 1) === '*') {
			// 这可能是加粗文本的一部分，跳过
			start = str.lastIndexOf('*', start - 2);
		}
		
		let end = str.indexOf('*', cursor);
		if (end > 0 && end + 1 < str.length && str.charAt(end + 1) === '*') {
			// 这可能是加粗文本的一部分，跳过
			end = str.indexOf('*', end + 2);
		}
		
		if (start !== -1 && end !== -1) {
			return str.substring(start + 1, end);
		}
		
		// 尝试查找使用 _ 的斜体
		start = str.lastIndexOf('_', cursor - 1);
		end = str.indexOf('_', cursor);
		
		if (start !== -1 && end !== -1) {
			return str.substring(start + 1, end);
		}
		
		return null;
	}

	/**
	 * 初始化国际化设置，使用Obsidian的语言设置
	 */
	private initializeI18n(): void {
		// 获取Obsidian的语言设置
		const obsidianLang = this.getObsidianLanguage();
		
		// 根据Obsidian语言设置选择合适的语言
		let language = Language.EN;
		
		if (obsidianLang.startsWith('zh')) {
			// 区分简体中文和繁体中文
			if (obsidianLang === 'zh-tw') {
				language = Language.ZH_TW;
			} else {
				language = Language.ZH;
			}
		}
		
		// 初始化i18n实例
		this.i18n = new I18n(language);
	}
	
	/**
	 * 获取Obsidian的语言设置
	 * @returns Obsidian的语言代码
	 */
	private getObsidianLanguage(): string {
		// 从 localStorage 中获取 Obsidian 的语言设置
		const lang = window.localStorage.getItem("language") || 'en';
		return lang;
	}
}

class EasyCopySettingTab extends PluginSettingTab {
	plugin: EasyCopy;

	constructor(app: App, plugin: EasyCopy) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// 加一个二级标题
		containerEl.createEl('h2', {text: this.plugin.t('general')});

		new Setting(containerEl)
			.setName(this.plugin.t('add-to-menu'))
			.setDesc(this.plugin.t('add-to-menu-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addToMenu)
				.onChange(async (value) => {
				this.plugin.settings.addToMenu = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName(this.plugin.t('show-notice'))
			.setDesc(this.plugin.t('show-notice-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotice)
				.onChange(async (value) => {
					this.plugin.settings.showNotice = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: this.plugin.t('format')});

		new Setting(containerEl)
			.setName(this.plugin.t('use-heading-as-display'))
			.setDesc(this.plugin.t('use-heading-as-display-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useHeadingAsDisplayText)
				.onChange(async (value) => {
					this.plugin.settings.useHeadingAsDisplayText = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.plugin.t('link-format'))
			.setDesc(this.plugin.t('link-format-desc'))
			.addDropdown(dropdown => dropdown
				.addOption(LinkFormat.MDLINK, this.plugin.t('markdown-link'))
				.addOption(LinkFormat.WIKILINK, this.plugin.t('wiki-link'))
				.setValue(this.plugin.settings.linkFormat)
				.onChange(async (value) => {
					this.plugin.settings.linkFormat = value as LinkFormat;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: this.plugin.t('target')});

		new Setting(containerEl)
			.setName(this.plugin.t('customize-targets'))
			.setDesc(this.plugin.t('customize-targets-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.customizeTargets)
				.onChange(async (value) => {
					this.plugin.settings.customizeTargets = value;
					await this.plugin.saveSettings();
					// 重新渲染设置界面以显示或隐藏目标选项
					this.display();
				}));

		// 只有当自定义复制对象选项开启时才显示具体的复制对象选项
		if (this.plugin.settings.customizeTargets) {
			new Setting(containerEl)
				.setName(this.plugin.t('enable-inline-code'))
				.setDesc(this.plugin.t('enable-inline-code-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableInlineCode)
					.onChange(async (value) => {
						this.plugin.settings.enableInlineCode = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(this.plugin.t('enable-bold'))
				.setDesc(this.plugin.t('enable-bold-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableBold)
					.onChange(async (value) => {
						this.plugin.settings.enableBold = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(this.plugin.t('enable-highlight'))
				.setDesc(this.plugin.t('enable-highlight-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableHighlight)
					.onChange(async (value) => {
						this.plugin.settings.enableHighlight = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(this.plugin.t('enable-italic'))
				.setDesc(this.plugin.t('enable-italic-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableItalic)
					.onChange(async (value) => {
						this.plugin.settings.enableItalic = value;
						await this.plugin.saveSettings();
					}));
		}
	}
}
