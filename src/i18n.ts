// 语言枚举
export enum Language {
	EN = 'en',
	ZH = 'zh',
	ZH_TW = 'zh-tw'
}

// 定义翻译键值类型
export type TranslationKey = 
	| 'no-file' | 'no-content' 
	| 'inline-code-copied' | 'block-id-copied' | 'note-link-copied' | 'heading-copied' | 'strikethrough-copied' 
	| 'inline-latex-copied' | 'bold-copied' | 'highlight-copied' | 'italic-copied' | 'link-text-copied' | 'link-url-copied'
	| 'wiki-link-copied' | 'callout-copied'
	| 'format' | 'add-to-menu' | 'add-to-menu-desc' | 'show-notice' | 'show-notice-desc'
	| 'add-extra-commands' | 'add-extra-commands-desc'
	| 'use-heading-as-display' | 'use-heading-as-display-desc' | 'heading-link-separator' | 'heading-link-separator-desc' | 'block-id'
	| 'use-frontmatter-as-display' | 'use-frontmatter-as-display-desc' | 'frontmatter-key' | 'frontmatter-key-desc'
	| 'link-format'| 'link-format-desc' | 'markdown-link' | 'wiki-link' | 'contextual-copy'
	| 'copy-current-file-link' | 'file-link-copied'
	| 'target' | 'customize-targets' | 'customize-targets-desc' 
	| 'enable-bold' | 'enable-bold-desc' 
	| 'enable-highlight'| 'enable-highlight-desc' 
	| 'enable-italic' | 'enable-italic-desc'
	| 'enable-inline-code' | 'enable-inline-code-desc'
	| 'enable-strikethrough' | 'enable-strikethrough-desc'
	| 'enable-inline-latex' | 'enable-inline-latex-desc'
	| 'enable-link' | 'enable-link-desc'
	| 'enable-wikilink' | 'enable-wikilink-desc'
	| 'keep-wiki-brackets' | 'keep-wiki-brackets-desc'
	| 'special-format'
	| 'auto-embed-block-link' | 'auto-embed-block-link-desc'
	| 'enable-callout-copy' | 'enable-callout-copy-desc'
	| 'callout-copy-priority' | 'callout-copy-priority-desc'
    | 'auto-add-block-id' | 'auto-add-block-id-desc'
    | 'manual-block-id' | 'manual-block-id-desc'
    | 'modal-block-id' | 'modal-block-id-desc'
	| 'auto-block-display-text' | 'auto-block-display-text-desc' 
	| 'generate-current-block-link-auto' | 'generate-current-block-link-manual'
    | 'error-block-id-empty' | 'error-block-id-invalid';

// 本地化翻译字典
export const translations: Record<Language, Record<TranslationKey, string>> = {
	[Language.EN]: {
		// 复制 Block ID
        'auto-add-block-id': 'Auto generate block ID',
        'auto-add-block-id-desc': 'When enabled, if there is no copyable content, a random block ID (^xxxx) will be automatically added to the end of the current line.' ,
		'manual-block-id': 'Manually enter Block ID',
        'manual-block-id-desc': 'If enabled, you will be prompted to enter a block ID manually.',
        'modal-block-id': 'Enter block ID',
        'modal-block-id-desc': 'Allowed: letters, numbers, hyphens (-), underscores (_). Spaces will be converted to hyphens.',
        'error-block-id-empty': 'Block ID cannot be empty',
        'error-block-id-invalid': 'Only letters, numbers, hyphens and underscores are allowed',
        
		// 通知信息
		'no-file': 'Cannot get current file',
		'no-content': 'No content to copy at current cursor position',
		'inline-code-copied': 'Inline code copied!',
		'block-id-copied': 'Block ID link copied!',
		'note-link-copied': 'Note link copied!',
		'heading-copied': 'Heading link copied!',
		'bold-copied': 'Bold text copied!',
		'highlight-copied': 'Highlighted text copied!',
		'italic-copied': 'Italic text copied!',
		'inline-latex-copied': 'Inline LaTeX copied!',
		'strikethrough-copied': 'Strikethrough text copied!',
		'link-text-copied': 'Link text copied!',
		'link-url-copied': 'Link URL copied!',
		'wiki-link-copied': 'Wiki link copied!',
		'callout-copied': 'Callout copied!',
		
		// 设置界面
		'format': 'Format',
		'use-frontmatter-as-display': 'Note Link: Use specific property as display text',
		'use-frontmatter-as-display-desc': 'If enabled, use the value of the specified note property as the display text for note links',
		'frontmatter-key': 'Note property name',
		'frontmatter-key-desc': 'The property name used as display text (default: title)',
		'block-id': 'Block ID',
		'target': 'Target',
		'add-to-menu': 'Add to menu',
		'add-to-menu-desc': 'Add the command to the context menu',
		'add-extra-commands': 'Add extra commands',
		'add-extra-commands-desc': 'Enable to add "Copy current note link" and "Generate & copy current block link" commands to the command palette',
		'show-notice': 'Show notice',
		'show-notice-desc': 'Show notification when content is copied',
		'use-heading-as-display': 'Heading Link: Use heading as display text',
		'use-heading-as-display-desc': 'Use the heading text as display text in copied heading links',
		'heading-link-separator': 'Heading Link: Separator between filename and heading',
		'heading-link-separator-desc': 'Customize the separator symbol between filename and heading (only shown when "Use heading as display text" is disabled)',
		'link-format': 'Link format',
		'link-format-desc': 'The format used when copying various types of links',
		'markdown-link': 'Markdown link',
		'wiki-link': 'Wiki link',
		'customize-targets': 'Customize targets',
		'customize-targets-desc': 'Enable to customize which elements can be copied (disable to copy all elements)',
		'enable-inline-code': 'Enable inline code',
		'enable-inline-code-desc': 'Enable copying inline code like `code example`',
		'enable-bold': 'Enable bold text',
		'enable-bold-desc': 'Enable copying bold text like **bold example**',
		'enable-highlight': 'Enable highlighted text',
		'enable-highlight-desc': 'Enable copying highlighted text like ==highlight example==',
		'enable-italic': 'Enable italic text',
		'enable-italic-desc': 'Enable copying italic text like *italic example*',
		'enable-strikethrough': 'Enable strikethrough text',
		'enable-strikethrough-desc': 'Enable copying strikethrough text like ~~strikethrough example~~',
		'enable-inline-latex': 'Enable inline LaTeX',
		'enable-inline-latex-desc': 'Enable copying inline LaTeX like $latex example$',
		'enable-link': 'Enable link title/url',
		'enable-link-desc': 'Enable copying link like [linktitle](linkurl) - the plugin will copy the title or the URL of the link based on the current cursor position.',
		'auto-block-display-text': 'Generate display text for block links',
		'auto-block-display-text-desc': 'If enabled, display text will be automatically added to generated block ID links',
		'enable-wikilink': 'Enable Wiki Link',
		'enable-wikilink-desc': 'Enable copying of [[Wiki]] links',
		
		'special-format': 'Special copy format options',
		'auto-embed-block-link': 'Block link: Add ! for embed',
		'auto-embed-block-link-desc': 'When copying block links, automatically add ! to embed the block',
		'enable-callout-copy': 'Copy callout text',
		'enable-callout-copy-desc': 'When the cursor is inside a callout (">" block), copy the callout content as plain text',
		'callout-copy-priority': 'Prioritize callout copy',
		'callout-copy-priority-desc': 'When the cursor is inside a callout, prioritize copying the callout content instead of generating a block ID link',
		'keep-wiki-brackets': 'Wikilink: Keep [[ ]] brackets',
		'keep-wiki-brackets-desc': 'When copying wiki links, keep the surrounding [[ ]] brackets',
		
		// 命令名称
		'contextual-copy': 'Contextual copy',
		'copy-current-file-link': 'Copy current file link',
		'generate-current-block-link-auto': 'Copy current block link (auto-generate ID)',
		'generate-current-block-link-manual': 'Copy current block link (manual ID input)',
		'file-link-copied': 'File link copied!',
	},
	[Language.ZH]: {
		// 复制 Block ID
        'auto-add-block-id': '自动生成块ID',
        'auto-add-block-id-desc': '启用后，如果没有可复制内容时会自动在当前文本末尾添加一个随机生成的块ID（^xxxx）',
		'manual-block-id': '手动输入块ID',
        'manual-block-id-desc': '启用后，可以在弹窗中手动输入块ID',
        'modal-block-id': '输入块ID',
        'modal-block-id-desc': '仅允许字母、数字、短横线（-）、下划线（_），空格会自动转为短横线。',
        'error-block-id-empty': '块ID不能为空',
        'error-block-id-invalid': '只允许字母、数字、-、_' ,
		// 通知信息
		'no-file': '无法获取当前文件',
		'no-content': '当前光标处没有可复制的内容',
		'inline-code-copied': '行内代码已复制！',
		'block-id-copied': '块ID链接已复制！',
		'note-link-copied': '笔记链接已复制！',
		'heading-copied': '标题链接已复制！',
		'bold-copied': '加粗文本已复制！',
		'highlight-copied': '高亮文本已复制！',
		'italic-copied': '斜体文本已复制！',
		'inline-latex-copied': '行内LaTeX已复制！',
		'strikethrough-copied': '删除线文本已复制！',
		'link-text-copied': '链接文本已复制！',
		'link-url-copied': '链接地址已复制！',
		'wiki-link-copied': 'Wiki链接已复制！',
		'callout-copied': '标注内容已复制！',
		
		// 设置界面
		'format': '格式',
		'block-id': '块ID',
		'target': '复制对象',
		'add-to-menu': '添加到菜单',
		'add-to-menu-desc': '将命令添加到右键菜单',
		'add-extra-commands': '添加拓展命令',
		'add-extra-commands-desc': '启用后，将在命令面板中添加“复制当前笔记的链接”和“生成并复制当前块的链接”命令',
		'show-notice': '显示通知',
		'show-notice-desc': '复制内容时显示通知提示',
		'use-heading-as-display': '标题链接：使用标题作为显示文本',
		'use-heading-as-display-desc': '在复制的标题链接中，使用标题文本作为显示文本',
		'heading-link-separator': '标题链接：文件名与标题间的连接符',
		'heading-link-separator-desc': '自定义文件名与标题之间的连接符号（仅在禁用"使用标题作为显示文本"时显示）',
		'link-format': '链接格式',
		'link-format-desc': '复制各种链接时使用的格式',
		'markdown-link': 'Markdown链接',
		'wiki-link': 'Wiki链接',
		'customize-targets': '自定义复制对象',
		'customize-targets-desc': '启用后可以自定义哪些元素可以被复制（不启用则默认可复制所有元素）',
		'enable-inline-code': '启用行内代码',
		'enable-inline-code-desc': '启用复制行内代码，如 `代码示例`',
		'enable-bold': '启用加粗文本',
		'enable-bold-desc': '启用复制加粗文本，如 **加粗示例**',
		'enable-highlight': '启用高亮文本',
		'enable-highlight-desc': '启用复制高亮文本，如 ==高亮示例==',
		'enable-italic': '启用斜体文本',
		'enable-italic-desc': '启用复制斜体文本，如 *斜体示例*',
		'enable-strikethrough': '启用删除线文本',
		'enable-strikethrough-desc': '启用复制删除线文本，如 ~~删除线示例~~',
		'enable-inline-latex': '启用行内LaTeX',
		'enable-inline-latex-desc': '启用复制行内LaTeX，如 $latex 示例$',
		'enable-link': '启用链接文本',
		'enable-link-desc': '启用复制 Markdown 链接',
		'enable-wikilink': '启用 Wiki 链接',
		'enable-wikilink-desc': '启用复制 [[Wiki]] 链接',
		'special-format': '特殊复制格式选项',
		'auto-embed-block-link': '块链接：自动添加 ! 符号（嵌入块）',
		'auto-embed-block-link-desc': '复制块链接时自动在前面添加 !，用于嵌入块',
		'enable-callout-copy': '复制标注内文本',
		'enable-callout-copy-desc': '当光标在 ">" 标注块内时，复制该标注的纯文本内容',
		'callout-copy-priority': '优先复制标注内内容',
		'callout-copy-priority-desc': '当光标位于标注内时，优先复制标注内内容而不是生成该标注的块ID链接',
		'keep-wiki-brackets': 'Wiki 链接：保留 [[ ]] 括号',
		'keep-wiki-brackets-desc': '复制 wiki 链接时保留两侧 [[ ]] 括号',
		
		// 命令名称
		'contextual-copy': '智能复制',
		'copy-current-file-link': '复制当前文件链接',
		'generate-current-block-link-auto': '复制当前块链接（自动生成ID）',
		'generate-current-block-link-manual': '复制当前块链接（手动输入ID）',
		'file-link-copied': '当前文件链接已复制！',
		'use-frontmatter-as-display': '笔记链接：使用特定属性作为显示文本',
		'use-frontmatter-as-display-desc': '启用后，使用指定的笔记属性的值作为笔记链接的显示文本',
		'frontmatter-key': '笔记属性名',
		'frontmatter-key-desc': '用于显示文本的笔记属性名（默认：title）',
		'auto-block-display-text': '生成块链接的显示文本',
		'auto-block-display-text-desc': '启用后，会自动为生成的块ID链接添加显示文本',
	},
	[Language.ZH_TW]: {
		// 复制 Block ID
		'auto-add-block-id': '自動新增塊ID',
		'auto-add-block-id-desc': '啟用後，若沒有可複製內容時，會自動在當前文本末尾新增一個隨機的塊ID（^xxxx）',
		'add-extra-commands': '添加擴展命令',
		'add-extra-commands-desc': '啟用後，會在命令面板中新增「複製當前筆記鏈接」和「生成並複製當前塊鏈接」命令',
		'auto-block-display-text': '生成塊連結的顯示文本',
		'auto-block-display-text-desc': '啟用後，會自動為生成的塊ID連結添加顯示文本',
		'manual-block-id': '手動輸入塊ID',
		'manual-block-id-desc': '啟用後，可以在彈窗中手動輸入塊ID',
		'modal-block-id': '輸入塊ID',
		'modal-block-id-desc': '僅允許字母、數字、連字號（-）、底線（_），空格會自動轉為連字號。',
		'error-block-id-empty': '塊ID 不能為空',
		'error-block-id-invalid': '只允許字母、數字、-、_',
        
		// 通知信息
		'no-file': '無法獲取當前文件',
		'no-content': '當前光標處沒有可複製的內容',
		'inline-code-copied': '行內代碼已複製！',
		'block-id-copied': '塊ID連結已複製！',
		'note-link-copied': '筆記連結已複製！',
		'heading-copied': '標題連結已複製！',
		'bold-copied': '加粗文本已複製！',
		'highlight-copied': '高亮文本已複製！',
		'italic-copied': '斜體文本已複製！',
		'inline-latex-copied': '行內LaTeX已複製！',
		'strikethrough-copied': '刪除線文本已複製！',
		'link-text-copied': '連結文本已複製！',
		'link-url-copied': '連結地址已複製！',
		'wiki-link-copied': 'Wiki連結已複製！',
		'callout-copied': '标注内容已複製！',
		
		// 設置界面
		'format': '格式',
		'block-id': '塊ID',
		'target': '複製對象',
		'add-to-menu': '添加到菜單',
		'add-to-menu-desc': '將命令添加到右鍵菜單',
		'show-notice': '顯示通知',
		'show-notice-desc': '複製內容時顯示通知提示',
		'use-heading-as-display': '標題連結：使用標題作為顯示文本',
		'use-heading-as-display-desc': '在複製的標題連結中，使用標題文本作為顯示文本',
		'heading-link-separator': '標題連結：檔案名與標題間的連接符',
		'heading-link-separator-desc': '自定義檔案名與標題之間的連接符號（僅在禁用「使用標題作為顯示文本」時顯示）',
		'link-format': '連結格式',
		'link-format-desc': '複製各種連結時使用的格式',
		'markdown-link': 'Markdown連結',
		'wiki-link': 'Wiki連結',
		'customize-targets': '自定義複製對象',
		'customize-targets-desc': '啟用後可以自定義哪些元素可以被複製（不啟用則默认可複製所有元素）',
		'enable-inline-code': '啟用行內代碼',
		'enable-inline-code-desc': '啟用複製行內代碼，如 `代碼示例`',
		'enable-bold': '啟用加粗文本',
		'enable-bold-desc': '啟用複製加粗文本，如 **加粗示例**',
		'enable-highlight': '啟用高亮文本',
		'enable-highlight-desc': '啟用複製高亮文本，如 ==高亮示例==',
		'enable-italic': '啟用斜體文本',
		'enable-italic-desc': '啟用複製斜體文本，如 *斜體示例*',
		'enable-strikethrough': '啟用刪除線文本',
		'enable-strikethrough-desc': '啟用複製刪除線文本，如 ~~刪除線示例~~',
		'enable-inline-latex': '啟用行內LaTeX',
		'enable-inline-latex-desc': '啟用複製行內LaTeX，如 $latex 示例$',
		'enable-link': '啟用連結文本',
		'enable-link-desc': '啟用複製 Markdown 連結',
		'enable-wikilink': '啟用 Wiki 連結',
		'enable-wikilink-desc': '啟用複製 [[Wiki]] 連結',
		'special-format': '特殊複製格式選項',
		'auto-embed-block-link': '塊連結：自動添加 ! 符號（嵌入塊）',
		'auto-embed-block-link-desc': '複製塊連結時自動在前面添加 !，用於嵌入塊',
		'enable-callout-copy': '複製標註內文本',
		'enable-callout-copy-desc': '當游標在 ">" 標註塊內時，複製該標註的純文本內容',
		'callout-copy-priority': '優先複製標註內容',
		'callout-copy-priority-desc': '當游標位於標註內時，優先複製標註內容而不是生成該標註的塊ID連結',
		'keep-wiki-brackets': 'Wiki連結：保留 [[ ]] 括號',
		'keep-wiki-brackets-desc': '複製 wiki 連結時保留兩側 [[ ]] 括號',
		
		// 命令名称
		'contextual-copy': '智能複製',
		'copy-current-file-link': '複製當前文件連結',
		'generate-current-block-link-auto': '複製當前塊連結（自動生成ID）',
		'generate-current-block-link-manual': '複製當前塊連結（手動輸入ID）',
		'file-link-copied': '當前文件連結已複製！',
		'use-frontmatter-as-display': '筆記連結：使用特定屬性作為顯示文本',
		'use-frontmatter-as-display-desc': '啟用後，使用指定的筆記屬性的值作為筆記連結的顯示文本',
		'frontmatter-key': '筆記屬性名',
		'frontmatter-key-desc': '用於顯示文本的筆記屬性名（默認：title）',
	}
};

/**
 * 本地化翻译类
 */
export class I18n {
	private language: Language;

	constructor(language: Language = Language.EN) {
		this.language = language;
	}

	/**
	 * 设置当前语言
	 */
	setLanguage(language: Language): void {
		this.language = language;
	}

	/**
	 * 获取本地化文本
	 * @param key 翻译键值
	 * @returns 翻译后的文本
	 */
	t(key: TranslationKey): string {
		return translations[this.language][key] || translations[Language.EN][key] || key;
	}
}
