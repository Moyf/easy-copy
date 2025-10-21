import { Editor, MarkdownView, Notice, Plugin, Menu, Platform, MarkdownFileInfo } from 'obsidian';
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
			icon: 'copy-plus',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				// 实现智能复制功能
				this.contextualCopy(editor, view);
			}
		});

		if (this.settings.addExtraCommands){
			// 新增：复制当前文件链接命令
			this.addCommand({
				id: 'copy-current-file-link',
				name: this.t('copy-current-file-link'),
				icon: 'clipboard-copy',
				callback: () => {
					this.copyCurrentFileLink();
				}
			});

			// 新增：生成当前 Block 的链接
			this.addCommand({
				id: 'generate-current-block-link-auto',
				name: this.t('generate-current-block-link-auto'),
				icon: 'clipboard-pen',
				editorCallback: (editor: Editor, fileInfo: MarkdownFileInfo) => {
					const file = fileInfo.file;
					if (!file){
						new Notice(this.t('no-file'));
						return;
					}
					const filename = file.basename;
					// 自动生成名称
					this.insertBlockIdAndCopyLink(editor, filename, false);
				}
			});
			
			// 新增：生成当前 Block 的链接
			this.addCommand({
				id: 'generate-current-block-link-manual',
				name: this.t('generate-current-block-link-manual'),
				icon: 'clipboard-pen-line',
				editorCallback: (editor: Editor, fileInfo: MarkdownFileInfo) => {
					const file = fileInfo.file;
					if (!file){
						new Notice(this.t('no-file'));
						return;
					}
					const filename = file.basename;
					// 手动输入名称
					this.insertBlockIdAndCopyLink(editor, filename, true);
				}
			});
			
		}
		

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

	/*
	 * 从给定的块里查找 Block ID（最多延伸至下一个空行+下第二行）
	*/
	private detectBlockId(editor: Editor, view: MarkdownView): ContextData | null {
		const cursor = editor.getCursor();
		const { end } = this.detectBlockRange(editor, cursor.line);
		let lastLine = editor.getLine(end);

		// 检查下两行是否为单独的块ID行
		if (end <= editor.lineCount() - 2) {
			const lineAfterBlock = editor.getLine(end + 1);
			if (lineAfterBlock.trim() === '') {
				const possibleBlockIdLine = editor.getLine(end + 2);
				// 判断该行是否为合法的 block ID 行：前面可有空格，必须以 ^ 开头，后面只能是 block id，不允许有其他字符或空格
				if (/^\s*\^[a-zA-Z0-9_-]+$/.test(possibleBlockIdLine)) {
					lastLine = possibleBlockIdLine;
				}
			}
		}

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
			/(?:\*([^*]+)\*(?!\*)|_([^_]+)_(?!_))/g :  // iOS 版本：支持 * 和 _ 格式，只使用前视
			/(?:(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_))/g;  // 其他平台：支持 * 和 _ 格式，使用前视和后视
		
		const boldRegex = /(?:\*\*([^*]+)\*\*|__([^_]+)__)/g;  // 粗体：支持 ** 和 __ 格式
		
		// 匹配优先级：加粗 > 斜体 > 高亮 > 删除线 > 行内代码 > 行内Latex > 块ID > 双链
		const matchers = [
			{ type: ContextType.BOLD, regex: boldRegex , enable: !this.settings.customizeTargets || this.settings.enableBold},
			// 使用前后断言确保不被包裹在更长的语法中，同时支持 * 和 _ 两种格式
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
				// 找到第一个非空且非整体匹配的捕获组作为内容
				let content = '';
				for (let i = 1; i < match.length; i++) {
					if (match[i] !== undefined) {
						content = match[i];
						break;
					}
				}
				
				return {
					content: content, // 返回内容，不包括语法
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
				const isManual = this.settings.allowManualBlockId;

				await this.insertBlockIdAndCopyLink(editor, filename, isManual);

				return;
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
				} else {
					// 如果有 |别名，去掉|后面的内容
					wikiCopyText = wikiCopyText.split('|')[0];
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
		
		const autoDisplayText = this.settings.autoBlockDisplayText;

		// 先去掉结尾的 ^ 及其后面的内容（如果有的话）
		text = text.replace(/\^.*\s*$/, '');
		text = text.trim().replace(/- \[.\]\s+/, '').replace('- ', '').replace(/=|\*|\[|\]|\(|\)|`|>\s+/g, '');

		let displayText = blockId;
		if (useBrief && text) {

			// 判断是否是纯英文，如果是纯英文（以及英文常用标点符号），提取前三个单词；否则，按下面的逻辑处理
			// 根据 ASCII 来判断“英文”
			const isEnglish = /^[a-zA-Z\s,.!?"()\[-\]_\^\-\~:;0-9]*$/.test(text);

			if (isEnglish) {
				const wordLimit = this.settings.blockDisplayWordLimit || 3;
				displayText = text.trim().split(' ').slice(0, wordLimit).join(' ');
			} else {
				const charLimit = this.settings.blockDisplayCharLimit || 5;

				const briefText = text;

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
				} else {
					displayText = briefText;
				}
			}
		}

		// displayText = "^"+displayText;
		let blockIdLink = this.settings.linkFormat === LinkFormat.WIKILINK
			? `[[${filename}#^${blockId}|${displayText}]]`
			: `[${displayText}](${filename}#^${blockId})`;	 	// markdown 格式不能加，不然会变成内联脚注语法 [^xxx]

		if (!autoDisplayText) {
			blockIdLink = this.settings.linkFormat === LinkFormat.WIKILINK
			? `[[${filename}#^${blockId}]]`
			: `[](${filename}#^${blockId})`;
		}

		// 自动生成嵌入块
		if (this.settings.autoEmbedBlockLink) {
			blockIdLink = "!" + blockIdLink;
		}

		navigator.clipboard.writeText(blockIdLink);

		if (this.settings.showNotice) {
			new Notice(this.t('block-id-copied') + `\n^${displayText}...`);
		}
		return;
	}
	
	/**
	 * 复制标题链接
	 */
	private copyHeadingLink(content: string, filename: string): void {

		let filenameOrTitle = filename;
		let title = '';
		if (this.settings.useFrontmatterAsDisplay) {
			const file = this.app.workspace.getActiveFile?.() ?? (this.app.workspace.getActiveViewOfType?.(MarkdownView)?.file ?? null);
			if (file) {
				const fileCache = this.app.metadataCache.getFileCache(file);
				const frontmatter = fileCache?.frontmatter;
				const key = this.settings.frontmatterKey || 'title';
				if (frontmatter && typeof frontmatter[key] === 'string' && frontmatter[key].trim()) {
					title = frontmatter[key].trim();
					filenameOrTitle = title;
				}
			}
		}

		// 提取标题文本和级别
		let selectedHeading = content;
		// 如果内容是[[内容]]，移除[[]]
		if (selectedHeading.startsWith('[[') && selectedHeading.endsWith(']]')) {
			selectedHeading = selectedHeading.slice(2, -2);
		}
		
		// 根据设置决定显示文本
		let displayText = selectedHeading;
		if (!this.settings.useHeadingAsDisplayText) {
			// 如果不使用标题作为显示文本，则使用"文件名{连接符}标题名"格式
			const separator = this.settings.headingLinkSeparator || '#';
			displayText = `${filenameOrTitle}${separator}${selectedHeading}`;
		}
		
		let headingReferenceLink = "";
		let noteFlag = 0;

		let linkContent = `${filename}#${selectedHeading}`;

		function compareIgnoreCase(a: string, b: string): boolean {
			return a.toLowerCase() === b.toLowerCase() || a.toLowerCase().includes(b.toLowerCase());
		}

		// 特殊情况：如果文件名包含标题，则不添加指向标题的 # 部分
		// 我自己的情况——会把 SomeThing 给拆成 Some Thing 来做标题，所以也考虑空格替换的部分
		if (filename === selectedHeading || compareIgnoreCase(filename, selectedHeading) || compareIgnoreCase(filename, selectedHeading.replace(/\s+/g, ''))) {
			linkContent = filename;
			new Notice(this.t('note-link-simplified'));
			noteFlag = 1;
		}
		
		// 根据设置选择链接格式
		if (this.settings.linkFormat === LinkFormat.WIKILINK) {
			// Wiki链接格式
			if (filename === selectedHeading) {
				// 特殊情况：当文件名与标题相同时，直接链接到文件
				headingReferenceLink = `[[${filename}]]`;
				noteFlag = 1;
			} else {
				if (displayText === linkContent) {
					// 特殊情况：当显示文本与 "文件名#标题" 相同时，省略显示文本
					headingReferenceLink = `[[${linkContent}]]`;
				} else {
					headingReferenceLink = `[[${linkContent}|${displayText}]]`;
				}
			}
		} else {
			// Markdown链接格式
			headingReferenceLink = `[${displayText}](${filename}#${selectedHeading})`;
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
	* 复制当前文件链接（支持 Wiki/Markdown 格式）
	*/
	private copyCurrentFileLink(): void {
		// 新增：优先使用 frontmatter 属性作为显示文本
		let displayText: string | undefined = undefined;
		if (this.settings.useFrontmatterAsDisplay) {
			const file = this.app.workspace.getActiveFile?.() ?? (this.app.workspace.getActiveViewOfType?.(MarkdownView)?.file ?? null);
			if (file) {
				const fileCache = this.app.metadataCache.getFileCache(file);
				const frontmatter = fileCache?.frontmatter;
				const key = this.settings.frontmatterKey || 'title';
				if (frontmatter && typeof frontmatter[key] === 'string' && frontmatter[key].trim()) {
					displayText = frontmatter[key].trim();
				}
			}
		}
		// 获取当前激活文件
		const file = this.app.workspace.getActiveFile?.() ?? (this.app.workspace.getActiveViewOfType?.(MarkdownView)?.file ?? null);
		if (!file) {
			new Notice(this.t('no-file'));
			return;
		}
		const filename = file.basename;
		let link = '';
		const display = displayText || filename;
		if (this.settings.linkFormat === LinkFormat.WIKILINK) {
			link = `[[${filename}|${display}]]`;
		} else {
			let path = file.path.replace(/\\/g, '/');
			if (path.endsWith('.md')) path = path.slice(0, -3);
			link = `[${display}](${path})`;
		}
		navigator.clipboard.writeText(link);
		if (this.settings.showNotice) {
			new Notice(this.t('file-link-copied'));
		}
	}

	/**
	 * 插入 Block ID 并复制块链接
	 * @param editor 编辑器实例
	 * @param filename 当前文件名
	 */
	private async insertBlockIdAndCopyLink(editor: Editor, filename: string, isManual=false): Promise<void> {
		let blockId = '';

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
			let insertText = '^' + blockId;

			if (lastLine.startsWith('> ') || lastLine.startsWith('``')) {
				insertText = '\n' + insertText;
			} else if ( lastLine.trim().length > 0 && !lastLine.endsWith(' ')) {
				insertText = ' ' + insertText;
			}

			editor.replaceRange(insertText, { line: end, ch: lastLine.length });

			// 如果不是手动输入的，使用简短的显示文本
			const useBrief = !isManual;

			// （生成之后）复制块ID链接
			this.copyBlockLink(blockId, filename, useBrief, firstLine);
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
