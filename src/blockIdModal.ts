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
            placeholder: 'Block ID...',
            cls: 'blockid-modal-input'
        });
        this.inputEl.focus();

        // 说明文本
        contentEl.createEl('div', {
            text: this.desc,
            cls: 'blockid-modal-desc'
        });

        // 样式已交由 style.css 控制
        this.errorEl = contentEl.createEl('div', { text: '', cls: 'blockid-modal-error' });

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
        if (!/^[-_a-zA-Z0-9\s]+$/.test(value)) {
            this.errorEl.textContent = this.t('error-block-id-invalid');
            return;
        }
        
        value = value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '');

        this.close();
        this.onSubmit(value);
    }
}
