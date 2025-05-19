import { Editor, MarkdownView, Notice, Plugin, Menu, Platform } from 'obsidian';
import { Language, TranslationKey, I18n } from './i18n';
import { ContextData, ContextType, DEFAULT_SETTINGS, EasyCopySettings, LinkFormat } from './type';
import { EasyCopySettingTab } from './settingTab';
import { BlockIdInputModal } from './blockIdModal';

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
			editorCallback: (editor: Editor, view: MarkdownView) => {
				// 实现智能复制功能
				this.contextualCopy(editor, view);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EasyCopySettingTab(this.app, this));

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
	 * 检测是否是有效的一行连续文本
	 */
	private isContinuousText(line: string): boolean {
		// 去除首尾空格后，判断是否为空行、标题行或列表项
		return line.trim() !== '' && !line.trim().startsWith('#') && !line.trim().startsWith('- ');
	}

	/**
	 * 检测光标所在行末尾或下一行开头的 block ID
	 */
	private detectBlockRange(editor: Editor, cursorLine: number): { start: number, end: number } {
		// 如果当前行是列表，那么范围就是当前行（不对，要继续延伸到后面的……只能说开头是定了）
		if (editor.getLine(cursorLine).trim().startsWith('- ')) {
			let end = cursorLine;
			while (end < editor.lineCount() - 1 && this.isContinuousText(editor.getLine(end + 1))) {
				end++;
			}
			return { start: cursorLine, end };
		}

		const totalLines = editor.lineCount();
		let start = cursorLine;
		while (start > 0 && this.isContinuousText(editor.getLine(start - 1))) {
			start--;
		}
		let end = cursorLine;
		while (end < totalLines - 1 && this.isContinuousText(editor.getLine(end + 1))) {
			end++;
		}
		return { start, end };
	}

	private detectBlockId(editor: Editor, view: MarkdownView): ContextData | null {
		const cursor = editor.getCursor();
		const { end } = this.detectBlockRange(editor, cursor.line);
		const lastLine = editor.getLine(end);
		const match = lastLine.trimEnd().match(/\^([a-zA-Z0-9_-]+)$/);

		if (match) {
			return {
				type: ContextType.BLOCKID,
				curLine: lastLine,
				match: match[1],
				range: [lastLine.lastIndexOf('^'), lastLine.length]
			};
		}
		return null;
	}

	/**
	 * 获取当前行的上下文类型
	 * @param editor 
	 * @param view 
	 * @returns ContextData
	 */
	private determineContextType(editor: Editor, view: MarkdownView): ContextData {
		// Callout 检测函数
		const detectCallout = (): ContextData | null => {
			if (!this.settings.enableCalloutCopy) return null;
			const cursor = editor.getCursor();
			const totalLines = editor.lineCount();
			let start = cursor.line, end = cursor.line;

			// 当前行是否 callout
			if (!editor.getLine(cursor.line).trim().startsWith('>')) return null;

			// 向上收集 callout
			while (start > 0 && editor.getLine(start - 1).trim().startsWith('>')) start--;
			// 向下收集 callout
			while (end + 1 < totalLines && editor.getLine(end + 1).trim().startsWith('>')) end++;

			// 收集所有 callout 行
			let calloutLines: string[] = [];
			for (let i = start; i <= end; i++) {
				calloutLines.push(editor.getLine(i));
			}
			// 去掉 > 和 callout 头部
			const content = calloutLines.map(line => line.replace(/^>\s?/, '').replace(/^\[!.*?\]\s?/, '').trim()).join('\n');
			
			return {
				type: ContextType.CALLOUT,
				curLine: editor.getLine(cursor.line),
				match: content,
				range: [0, content.length]
			};
		};

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


		// iOS 16.4 之前不支持后视（Lookbehinds），但支持前视（Lookaheads）
		// 所以针对 iOS 平台使用只带前视的正则表达式，其他平台使用完整版本
		const italicRegex = Platform.isIosApp ? 
			/\*([^*]+)\*(?!\*)/g :  // iOS 版本：只使用前视，不使用后视
			/(?<!\*)\*([^*]+)\*(?!\*)/g;  // 其他平台：使用前视和后视
		
		// 匹配优先级：加粗 > 斜体 > 高亮 > 删除线 > 行内代码 > 行内Latex > 块ID > 双链
		const matchers = [
			{ type: ContextType.BOLD, regex: /\*\*([^*]+)\*\*/g , enable: !this.settings.customizeTargets || this.settings.enableBold},
			// 使用前后断言 (?<!\*) 和 (?!\*)，确保 * 不被包裹在 ** 中。
			// 但是匹配顺序反正在粗体之后，本来也不需要考虑吧？除非是「关闭了粗体检测」的情况……
			{ type: ContextType.ITALIC, regex: italicRegex , enable: !this.settings.customizeTargets || this.settings.enableItalic},
			{ type: ContextType.HIGHLIGHT, regex: /==([^=]+)==/g , enable: !this.settings.customizeTargets || this.settings.enableHighlight},
			{ type: ContextType.STRIKETHROUGH, regex: /~~([^~]+)~~/g , enable: !this.settings.customizeTargets || this.settings.enableStrikethrough},
			{ type: ContextType.INLINECODE, regex: /`([^`]+)`/g , enable: !this.settings.customizeTargets || this.settings.enableInlineCode},
			{ type: ContextType.INLINELATEX, regex: /\$([^$]*)\$/g , enable: !this.settings.customizeTargets || this.settings.enableInlineLatex},
			{ type: ContextType.WIKILINK, regex: /\[\[([^\]]+)\]\]/g, enable: !this.settings.customizeTargets || this.settings.enableWikiLink },
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
		if (!this.settings.customizeTargets || this.settings.enableLink) {
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

		// 检测 block ID
		const blockIdInfo = this.detectBlockId(editor, view);
		if (blockIdInfo) {
			return blockIdInfo;
		}

		// 检测 Callout
		if (this.settings.enableCalloutCopy && (!this.settings.autoAddBlockId || this.settings.calloutCopyPriority)) {
			const calloutInfo = detectCallout();
			if (calloutInfo) {
				return calloutInfo;
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
	private async contextualCopy(editor: Editor, view: MarkdownView): Promise<void> {
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
		// console.log('contextType:', contextType);

		// Generate Block ID （自动生成 Block ID）
		if (contextType.type == ContextType.NULL) {
			// 如果启用自动添加 Block ID
			if (this.settings.autoAddBlockId) {
				let blockId = '';
				const isManual = this.settings.allowManualBlockId;
				
				if (isManual) {
					// 用 Modal 弹窗获取 Block ID
					const modalBlockId = await new Promise<string | null>((resolve) => {
					new BlockIdInputModal(this.app, 
						this.t('modal-block-id'), this.t('modal-block-id-desc'), 
						this.t.bind(this), 
						(result: any) => {	
							resolve(result ?? null);
						}
					).open();
					});
					if (!modalBlockId) return;
					blockId = modalBlockId;
				} else {
					// 随机生成
					const randomId = Math.random().toString(36).substr(2, 6);
					blockId = `${randomId}`;
				}

				// —— 新逻辑：定位 block（段落）末尾 ——
				const cursor = editor.getCursor();
				const { start, end } = this.detectBlockRange(editor, cursor.line);
				const firstLine = editor.getLine(start);
				const lastLine = editor.getLine(end);

				// 检查 block 最后一行末是否已有块ID
				if (!/\^[a-zA-Z0-9_-]+$/.test(lastLine.trim())) {
					// 在 block 最后一行末尾插入块ID
					let insertText = '^'+blockId;
					
					if (lastLine.startsWith('> ') || lastLine.startsWith('``')) {
						insertText = '\n' + insertText;
					} else if (!lastLine.endsWith(' ')) {
						insertText = ' ' + insertText;
					}
					
					editor.replaceRange(insertText, { line: end, ch: lastLine.length });

					// 如果不是手动输入的，使用简短的显示文本
					const useBrief = !isManual;
					
					// 复制块ID链接
					this.copyBlockLink(blockId, filename, useBrief, firstLine);
					return;
				}
			}
			
			new Notice(this.t('no-content'));

			return;
		}

		switch (contextType.type) {
			case ContextType.BLOCKID:
				this.copyBlockLink(contextType.match!, filename, true, contextType.curLine);
				return;
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
				// 复制链接标题
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('link-text-copied'));
				}
				return;
			case ContextType.LINEURL:
				// 复制链接地址
				navigator.clipboard.writeText(contextType.match!);
				if (this.settings.showNotice) {
					new Notice(this.t('link-url-copied'));
				}
				return;
			case ContextType.HEADING:
				this.copyHeadingLink(contextType.match!, filename);
				return;
			case ContextType.WIKILINK:
				// 复制 [[双链]]，可选保留括号
				let wikiCopyText = contextType.match!;
				if (this.settings.keepWikiBrackets) {
					wikiCopyText = `[[${wikiCopyText}]]`;
				}
				navigator.clipboard.writeText(wikiCopyText);
				if (this.settings.showNotice) {
					new Notice(this.t('wiki-link-copied'));
				}
				return;
			case ContextType.CALLOUT:
				// 复制 Callout 区块纯文本
				const calloutText = contextType.match?.replace(/\n+/g, '\n').replace(/\s+$/g, '');
				navigator.clipboard.writeText(calloutText ?? '');
				if (this.settings.showNotice) {
					new Notice(this.t('callout-copied'));
				}
				return;
			default:
				break;
		}
	}
	
	/**
	 * 复制块链接
	 */
	private copyBlockLink(content: string, filename: string, useBrief: boolean, firstLine: string=''): void {
		const blockId = content;
		let text = firstLine;

		// 先去掉结尾的 ^ 及其后面的内容（如果有的话）
		text = text.replace(/\^.*\s*$/, '');
		text = text.trim().replace(/- \[.\]\s+/, '').replace('- ', '').replace(/=|\*|\[|\]|\(|\)|`|>\s+/g, '');

		let displayText = blockId;
		if (useBrief && text) {

			// 判断是否是纯英文，如果是纯英文（以及英文常用标点符号），提取前三个单词；否则，按下面的逻辑处理
			// 根据 ASCII 来判断“英文”
			const isEnglish = /^[a-zA-Z\s,.!?"()\[-\]_\^\-\~:;0-9]*$/.test(text);

			if (isEnglish) {
				let wordLimit = 3;
				displayText = text.trim().split(' ').slice(0, wordLimit).join(' ');
			} else {
				let charLimit = 5;

				let briefText = text;

				if (briefText.length > charLimit) {
					const seperatedText = text.trim().match(/(\S+?)[\~\,\.\-\=\[，。？！…：\n\s]/);
					let tempText: string | null = null;
					
					if (seperatedText) {
						tempText = seperatedText[1];
					} else {
						tempText = briefText;
					}

					if (tempText.length > charLimit) {
						displayText = tempText.slice(0, charLimit) + '...';
					} else if (tempText.length < 3) {
						displayText = briefText.slice(0, charLimit);
					} else {
						displayText = tempText;
					}
				}
			}
		}

		// displayText = "^"+displayText;

		let blockIdLink = this.settings.linkFormat === LinkFormat.WIKILINK
			? `[[${filename}#^${blockId}|${displayText}]]`
			: `[^${displayText}](${filename}#^${blockId})`;

		if (this.settings.autoEmbedBlockLink) {
			blockIdLink = `!${blockIdLink}`;
		}

		navigator.clipboard.writeText(blockIdLink);
		if (this.settings.showNotice) {
			new Notice(this.t('block-id-copied') + `\n^${displayText}`);
		}
		return;
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
