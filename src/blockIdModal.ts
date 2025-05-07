import { App, Modal } from 'obsidian';
import { TranslationKey } from './i18n';

export class BlockIdInputModal extends Modal {
    private onSubmit: (blockId: string | null) => void;
    private inputEl: HTMLInputElement;
    private errorEl: HTMLElement;
    private title: string;
    private desc: string;
    private t: (key: TranslationKey) => string;

    constructor(app: App, title: string, desc: string, t: (key: TranslationKey) => string, onSubmit: (blockId: string | null) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.title = title;
        this.desc = desc;
        this.t = t;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // contentEl.createEl('div', { text: this.title, cls: 'modal-title' });
        this.setTitle(this.title);

        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Block ID...'
        });
        this.inputEl.style.width = '100%';
        this.inputEl.style.marginTop = '1em';
        this.inputEl.focus();

        // 说明文本
        const descEl = contentEl.createEl('div', {
            text: this.desc,
            cls: 'blockid-modal-desc'
        });
        descEl.style.fontSize = 'var(--font-ui-smaller)';
        descEl.style.color = 'var(--text-muted)';
        descEl.style.marginTop = '0.5em';
        descEl.style.marginBottom = '0.2em';

        this.errorEl = contentEl.createEl('div', { text: '', cls: 'blockid-modal-error' });
        this.errorEl.style.color = 'var(--text-error)';
        this.errorEl.style.fontSize = 'var(--font-ui-smaller)';
        this.errorEl.style.marginTop = '0.25em';

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.submit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.close();
                this.onSubmit(null);
            }
        });
    }

    private submit() {
        let value = this.inputEl.value.trim();

        if (!value) {
            this.errorEl.textContent = this.t('error-block-id-empty');
            return;
        }
        if (!/^[-_a-zA-Z0-9]+$/.test(value)) {
            this.errorEl.textContent = this.t('error-block-id-invalid');
            return;
        }
        
        value = value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '');

        this.close();
        this.onSubmit(value);
    }
}
