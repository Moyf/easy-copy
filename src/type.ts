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
    addToMenu: boolean;
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
}

export const DEFAULT_SETTINGS: EasyCopySettings = {
    addToMenu: true,
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
}