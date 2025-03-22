// 语言枚举
export enum Language {
	EN = 'en',
	ZH = 'zh',
	ZH_TW = 'zh-tw'
}

// 定义翻译键值类型
export type TranslationKey = 
	| 'no-file' | 'no-content' | 'inline-code-copied' | 'block-id-copied' 
	| 'note-link-copied' | 'heading-copied' | 'general' | 'format' 
	| 'add-to-menu' | 'add-to-menu-desc' | 'show-notice' | 'show-notice-desc'
	| 'use-heading-as-display' | 'use-heading-as-display-desc' | 'link-format'
	| 'link-format-desc' | 'markdown-link' | 'wiki-link' | 'contextual-copy';

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
		
		// 设置界面
		'general': 'General',
		'format': 'Format',
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
		
		// 设置界面
		'general': '常规',
		'format': '格式',
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
		
		// 設置界面
		'general': '常規',
		'format': '格式',
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
