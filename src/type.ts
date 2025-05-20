export enum LinkFormat {
	MDLINK = 'markdown-link',
	WIKILINK = 'wiki-link'
}

export enum ContextType {
    NULL = 'null',
    HEADING = 'heading',
    INLINECODE = 'inline-code',
    BOLD = 'bold',
    ITALIC = 'italic',
    HIGHLIGHT = 'highlight',
    STRIKETHROUGH = 'strikethrough',
    BLOCKID = 'block-id',
    INLINELATEX = 'inline-latex',
    LINKTITLE = 'link-title',
    LINEURL = 'line-url',
}

export interface ContextData {
    type: ContextType;
    curLine: string;
    match: string | null;
    range: [number, number] | null;
}

export interface EasyCopySettings {
    useFrontmatterAsDisplay: boolean; // 是否使用 frontmatter 属性作为显示文本
    frontmatterKey: string; // frontmatter 属性名
    addToMenu: boolean;
    addExtraCommands: boolean;
    showNotice: boolean;
    useHeadingAsDisplayText: boolean;
    linkFormat: LinkFormat;
    customizeTargets: boolean;
    enableInlineCode: boolean;
    enableBold: boolean;
    enableHighlight: boolean;
    enableItalic: boolean;
    enableStrikethrough: boolean;
    enableInlineLatex: boolean;
    enableLink: boolean;
    autoAddBlockId: boolean; // 是否自动添加 Block ID
    allowManualBlockId: boolean; // 是否允许手动输入 Block ID
    autoBlockDisplayText: boolean; // 自动为 Block 添加显示文本
}

export const DEFAULT_SETTINGS: EasyCopySettings = {
    useFrontmatterAsDisplay: false,
    frontmatterKey: 'title',
    addToMenu: true,
    addExtraCommands: true,
    showNotice: true,
    useHeadingAsDisplayText: true,
    linkFormat: LinkFormat.WIKILINK,
    customizeTargets: false,
    enableInlineCode: true,
    enableBold: true,
    enableHighlight: true,
    enableItalic: true,
    enableStrikethrough: true,
    enableInlineLatex: true,
    enableLink: true,
    autoAddBlockId: false, // 默认关闭
    allowManualBlockId: false, // 默认关闭
    autoBlockDisplayText: true,
}