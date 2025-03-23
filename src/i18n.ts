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
	| 'format' | 'add-to-menu' | 'add-to-menu-desc' | 'show-notice' | 'show-notice-desc'
	| 'use-heading-as-display' | 'use-heading-as-display-desc' 
	| 'link-format'| 'link-format-desc' | 'markdown-link' | 'wiki-link' | 'contextual-copy'
	| 'target' | 'customize-targets' | 'customize-targets-desc' 
	| 'enable-bold' | 'enable-bold-desc' 
	| 'enable-highlight'| 'enable-highlight-desc' 
	| 'enable-italic' | 'enable-italic-desc'
	| 'enable-inline-code' | 'enable-inline-code-desc'
	| 'enable-strikethrough' | 'enable-strikethrough-desc'
	| 'enable-inline-latex' | 'enable-inline-latex-desc'
	| 'enable-link' | 'enable-link-desc';

// 本地化翻译字典
export const translations: Record<Language, Record<TranslationKey, string>> = {
	[Language.EN]: {
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
		
		// 设置界面
		'format': 'Format',
		'target': 'Target',
		'add-to-menu': 'Add to menu',
		'add-to-menu-desc': 'Add the command to the context menu',
		'show-notice': 'Show notice',
		'show-notice-desc': 'Show notification when content is copied',
		'use-heading-as-display': 'Use heading as display text',
		'use-heading-as-display-desc': 'Use the heading text as display text in links',
		'link-format': 'Link format',
		'link-format-desc': 'The format of the link when you copy heading link',
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
		
		// 命令名称
		'contextual-copy': 'Contextual Copy'
	},
	[Language.ZH]: {
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
		
		// 设置界面
		'format': '格式',
		'target': '复制对象',
		'add-to-menu': '添加到菜单',
		'add-to-menu-desc': '将命令添加到右键菜单',
		'show-notice': '显示通知',
		'show-notice-desc': '复制内容时显示通知提示',
		'use-heading-as-display': '使用标题作为显示文本',
		'use-heading-as-display-desc': '在链接中使用标题文本作为显示文本',
		'link-format': '链接格式',
		'link-format-desc': '复制标题链接时使用的格式',
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
		'enable-link-desc': '启用复制链接文本，如 [链接标题](链接地址) - 插件会根据当前光标所在的不同位置复制标题或者链接URL',
		
		// 命令名称
		'contextual-copy': '智能复制'
	},
	[Language.ZH_TW]: {
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
		
		// 設置界面
		'format': '格式',
		'target': '複製對象',
		'add-to-menu': '添加到菜單',
		'add-to-menu-desc': '將命令添加到右鍵菜單',
		'show-notice': '顯示通知',
		'show-notice-desc': '複製內容時顯示通知提示',
		'use-heading-as-display': '使用標題作為顯示文本',
		'use-heading-as-display-desc': '在連結中使用標題文本作為顯示文本',
		'link-format': '連結格式',
		'link-format-desc': '複製標題連結時使用的格式',
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
		'enable-link-desc': '啟用複製連結，如 [連結標題](連結地址) - 插件會根據當前光標所在的不同位置複製標題或者連結URL',
		
		// 命令名称
		'contextual-copy': '智能複製'
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
