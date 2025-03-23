import { Editor, MarkdownView, Notice, Plugin, Menu } from 'obsidian';
import { Language, TranslationKey, I18n } from './i18n';
import { ContextData, ContextType, DEFAULT_SETTINGS, EasyCopySettings, LinkFormat } from './type';
import { EasyCopySettingTab } from './settingTab';

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
	 * 获取当前行的上下文类型
	 * @param editor 
	 * @param view 
	 * @returns ContextData
	 */
	private determineContextType(editor: Editor, view: MarkdownView): ContextData {
		// 获取当前文件和光标信息
		const file = view.file;
		if (!file) {
			new Notice(this.t('no-file'));
			return { type: ContextType.NULL, curLine: '', match: null, range: null };
		}
	
		const cursor = editor.getCursor();
		const curLine = editor.getLine(cursor.line);
		const curCh = cursor.ch;
	
		// 根据光标位置解析内容类型
		const beforeCursor = curLine.slice(0, curCh); // 光标前的内容
		const afterCursor = curLine.slice(curCh); // 光标后的内容
		
		// 匹配优先级：加粗 > 斜体 > 高亮 > 删除线 > 行内代码 > 行内Latex > 块ID
		const matchers = [
			{ type: ContextType.BOLD, regex: /\*\*([^*]+)\*\*/g , enable: this.settings.enableBold},
			// 使用前后断言 (?<!\*) 和 (?!\*)，确保 * 不被包裹在 ** 中。
			{ type: ContextType.ITALIC, regex: /(?<!\*)\*([^*]+)\*(?!\*)/g , enable: this.settings.customizeTargets && this.settings.enableItalic},
			{ type: ContextType.HIGHLIGHT, regex: /==([^=]+)==/g , enable: this.settings.customizeTargets && this.settings.enableHighlight},
			{ type: ContextType.STRIKETHROUGH, regex: /~~([^~]+)~~/g , enable: this.settings.customizeTargets && this.settings.enableStrikethrough},
			{ type: ContextType.INLINECODE, regex: /`([^`]+)`/g , enable: this.settings.customizeTargets && this.settings.enableInlineCode},
			{ type: ContextType.INLINELATEX, regex: /\$([^$]*)\$/g , enable: this.settings.customizeTargets && this.settings.enableInlineLatex},
			{ type: ContextType.BLOCKID, regex: /\^([a-zA-Z0-9_-]+)/g , enable: true}, // 块ID不需要判断enable
		];
	
		for (const matcher of matchers) {
			if (!matcher.enable) continue; // 如果当前类型未启用，则跳过
			const matchInfo = this.getMatchInfo(beforeCursor, afterCursor, matcher.regex);
			if (matchInfo) {
				return {
					type: matcher.type,
					curLine,
					match: matchInfo.content, // 返回内容，不包括语法
					range: matchInfo.range,
				};
			}
		}

		// 检测链接
		if (this.settings.customizeTargets && this.settings.enableLink) {
			const linkInfo = this.isCursorInLink(beforeCursor, afterCursor);
			if (linkInfo) {
				return {
					type: linkInfo.type,
					curLine,
					match: linkInfo.content,
					range: linkInfo.range,
				};
			}
		}
	
		// 如果当前行是标题行，且光标不在其他 Markdown 语法范围内，则返回标题类型
		const headingRegex = /^(#+)\s/; // 标题正则表达式
		if (headingRegex.test(curLine)) {
			const match = curLine.match(headingRegex);
			const headingContent = curLine.replace(headingRegex, '').trim();
			return {
				type: ContextType.HEADING,
				curLine,
				match: headingContent, // 返回内容，不包括语法
				range: match ? [match[0].length, curLine.length] : null,
			};
		}
	
		// 默认返回空值
		return { type: ContextType.NULL, curLine, match: null, range: null };
	}
	
	/**
	 * 获取光标所在的匹配信息
	 * @param beforeCursor 光标前的文本
	 * @param afterCursor 光标后的文本
	 * @param regex 匹配的正则表达式
	 * @returns 匹配信息，包括匹配内容和范围
	 */
	private getMatchInfo(beforeCursor: string, afterCursor: string, regex: RegExp): { content: string; range: [number, number] } | null {
		let match;
		while ((match = regex.exec(beforeCursor + afterCursor)) !== null) {
			const matchStart = match.index;
			const matchEnd = match.index + match[0].length;
	
			// 判断光标是否在匹配范围内
			if (beforeCursor.length >= matchStart && beforeCursor.length <= matchEnd) {
				return {
					content: match[1], // 返回内容，不包括语法
					range: [matchStart, matchEnd],
				};
			}
		}
		return null;
	}

	private isCursorInLink(beforeCursor: string, afterCursor: string): {type: ContextType.LINKTITLE | ContextType.LINEURL, content: string, range: [number, number]} | null {
		// 匹配链接的正则表达式
		const linkRegex = /\[([^\]]*?)\]\(([^)]*?)\)/g;

		const fullText = beforeCursor + afterCursor;
		let match: RegExpExecArray | null;
		while ((match = linkRegex.exec(fullText)) !== null) {
			const linkStart = match.index; // 链接的起始位置
			const linkEnd = linkStart + match[0].length; // 链接的结束位置
	
			// 光标位置
			const cursorPos = beforeCursor.length;
	
			// 判断光标是否在当前链接范围内
			if (cursorPos >= linkStart && cursorPos <= linkEnd) {
				const bracketStart = linkStart + 1; // `[` 后的位置
				const bracketEnd = linkStart + match[1].length + 1; // `]` 的位置
				const parenStart = bracketEnd + 2; // `(` 后的位置
				const parenEnd = parenStart + match[2].length; // `)` 的位置
	
				// 判断光标在 [] 还是 ()
				if (cursorPos >= bracketStart && cursorPos <= bracketEnd) {
					return { type: ContextType.LINKTITLE, content: match[1], range: [bracketStart, bracketEnd] };
				} else if (cursorPos >= parenStart && cursorPos <= parenEnd) {
					return { type: ContextType.LINEURL, content: match[2], range: [parenStart, parenEnd] };
				}
			}
		}

		// 如果光标不在任何链接中，返回 null
		return null;
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
		
		// 获取文件名（去除.md后缀）
		const filename = file.basename;
    
		// 获取当前行的上下文类型
		const contextType = this.determineContextType(editor, view);
		console.log('contextType:', contextType);
		if (contextType.type == ContextType.NULL) {
			new Notice(this.t('no-content'));

			return;
		}

		switch (contextType.type) {
			case ContextType.BOLD:
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('bold-copied'));
				}
				return;
			case ContextType.ITALIC:
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('italic-copied'));
				}
				return;
			case ContextType.HIGHLIGHT:
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('highlight-copied'));
				}
				return;
			case ContextType.STRIKETHROUGH:
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('strikethrough-copied'));
				}
				return;
			case ContextType.INLINECODE:
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('inline-code-copied'));
				}
				return;
			case ContextType.INLINELATEX:
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('inline-latex-copied'));
				}
				return;
			
			case ContextType.LINKTITLE:
			case ContextType.LINEURL:
				// 复制链接标题或链接地址
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('link-copied'));
				}
				return;
			case ContextType.BLOCKID:
				{
					const blockIdLink = this.settings.linkFormat === LinkFormat.WIKILINK 
						? `[[${filename}#^${contextType.match!}]]` 
						: `[${contextType.match!}](${filename}#^${contextType.match!})`;
					navigator.clipboard.writeText(blockIdLink);
				}
				if (this.settings.showNotice) {
					new Notice(this.t('block-id-copied'));
				}
				return;
			case ContextType.HEADING:
				this.copyHeadingLink(contextType.match!, filename);
				return;
			default:
				break;
		}
	}
	
	/**
	 * 复制标题链接
	 */
	private copyHeadingLink(content: string, filename: string): void {
		// 提取标题文本和级别
		let selectedHeading = content;
		// 如果内容是[[内容]]，移除[[]]
		if (selectedHeading.startsWith('[[') && selectedHeading.endsWith(']]')) {
			selectedHeading = selectedHeading.slice(2, -2);
		}
		const linkAlias = selectedHeading;
		let noteFlag = 0;

		let headingReferenceLink = "";
		
		// 根据设置选择链接格式
		if (this.settings.linkFormat === LinkFormat.WIKILINK) {
			// Wiki链接格式
			headingReferenceLink = `[[${filename}#${selectedHeading}|${linkAlias}]]`;
			
			// 处理同名标题的特殊情况
			if (this.settings.useHeadingAsDisplayText && filename === linkAlias) {
				headingReferenceLink = `[[${filename}]]`;
				noteFlag = 1;
			}
		} else {
			// Markdown链接格式
			headingReferenceLink = `[${linkAlias}](${filename}#${selectedHeading})`;
		}
		
		// 复制到剪贴板
		navigator.clipboard.writeText(headingReferenceLink);
		
		// 显示通知
		if (this.settings.showNotice) {
			if (noteFlag) {
				new Notice(this.t('note-link-copied'));
			} else {
				new Notice(this.t('heading-copied'));
			}
		}
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
