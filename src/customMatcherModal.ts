import { App, ButtonComponent, Modal, Notice, Setting, setIcon } from 'obsidian';
import { TranslationKey } from './i18n';
import { CustomCopyMatcherSetting } from './type';

// 新建自定义规则时的默认值：中英文双引号内的文本
export function createCustomMatcher(t: (key: TranslationKey) => string): CustomCopyMatcherSetting {
	const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	return {
		id,
		name: t('custom-matcher-default-name'),
		note: t('custom-matcher-default-note'),
		pattern: '[“"]([^"]+)["”]',
		flags: 'g',
		captureGroup: 1,
		enabled: true,
	};
}

function isRegexValid(pattern: string, flags: string): boolean {
	if (!pattern.trim()) return false;
	try {
		new RegExp(pattern, flags);
		return true;
	} catch {
		return false;
	}
}

/**
 * 自定义规则的编辑表单（新增/配置共用）。
 * 编辑的是传入规则的副本，点击保存后才由回调持久化；取消则不产生任何变更。
 */
export class CustomMatcherModal extends Modal {
	private readonly t: (key: TranslationKey) => string;
	private readonly matcher: CustomCopyMatcherSetting;
	private readonly isNew: boolean;
	private readonly onSave: (matcher: CustomCopyMatcherSetting) => void;

	private firstInputEl: HTMLInputElement | null = null;
	private regexErrorEl!: HTMLElement;
	private saveButton!: ButtonComponent;

	constructor(
		app: App,
		t: (key: TranslationKey) => string,
		matcher: CustomCopyMatcherSetting,
		isNew: boolean,
		onSave: (matcher: CustomCopyMatcherSetting) => void,
	) {
		super(app);
		this.t = t;
		// 副本隔离：编辑过程中只改副本，保存时一次性写回
		this.matcher = { ...matcher };
		this.isNew = isNew;
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle(this.t(this.isNew ? 'add-custom-matcher' : 'configure-custom-matcher'));

		this.addTextField('custom-matcher-name', 'custom-matcher-name-desc', this.matcher.name, value => this.matcher.name = value);
		this.addTextField('custom-matcher-note', 'custom-matcher-note-desc', this.matcher.note ?? '', value => this.matcher.note = value);
		this.addPatternField();
		this.addFlagsField();
		this.addCaptureGroupField();

		this.regexErrorEl = contentEl.createDiv({ cls: 'easy-copy-regex-error' });

		const buttonsEl = contentEl.createDiv({ cls: 'modal-button-container' });
		this.saveButton = new ButtonComponent(buttonsEl)
			.setButtonText(this.t('save'))
			.setCta()
			.onClick(() => this.submit());
		new ButtonComponent(buttonsEl)
			.setButtonText(this.t('cancel'))
			.onClick(() => this.close());

		this.refreshValidation();
		this.firstInputEl?.focus();
	}

	private addTextField(nameKey: TranslationKey, descKey: TranslationKey, value: string, onChange: (value: string) => void): void {
		new Setting(this.contentEl)
			.setName(this.t(nameKey))
			.setDesc(this.t(descKey))
			.addText(text => {
				text.setValue(value).onChange(onChange);
				this.bindEnterKey(text.inputEl);
				this.rememberFirstInput(text.inputEl);
			});
	}

	// 正则输入 + AI 提示词助手：点击说明中的图标复制提示词，交给 AI 生成正则
	private addPatternField(): void {
		const desc = createFragment();
		desc.append(this.t('custom-matcher-pattern-desc') + ' ');
		const infoIcon = desc.createSpan({
			attr: { 'aria-label': this.t('custom-matcher-pattern-tooltip') },
			cls: 'easy-copy-info-icon',
		});
		setIcon(infoIcon, 'info');
		infoIcon.addEventListener('click', () => {
			void navigator.clipboard.writeText(this.t('custom-matcher-ai-prompt'));
			new Notice(this.t('custom-matcher-ai-prompt-copied'));
		});

		new Setting(this.contentEl)
			.setName(this.t('custom-matcher-pattern'))
			.setDesc(desc)
			.addText(text => {
				text.setPlaceholder('[“"]([^"]+)["”]')
					.setValue(this.matcher.pattern)
					.onChange(value => {
						this.matcher.pattern = value;
						this.refreshValidation();
					});
				this.bindEnterKey(text.inputEl);
				this.rememberFirstInput(text.inputEl);
			});
	}

	private addFlagsField(): void {
		new Setting(this.contentEl)
			.setName(this.t('custom-matcher-flags'))
			.setDesc(this.t('custom-matcher-flags-desc'))
			.addText(text => {
				text.setPlaceholder('g')
					.setValue(this.matcher.flags)
					.onChange(value => {
						this.matcher.flags = value;
						this.refreshValidation();
					});
				this.bindEnterKey(text.inputEl);
			});
	}

	private addCaptureGroupField(): void {
		new Setting(this.contentEl)
			.setName(this.t('custom-matcher-capture-group'))
			.setDesc(this.t('custom-matcher-capture-group-desc'))
			.addText(text => {
				text.setPlaceholder('1')
					.setValue(String(this.matcher.captureGroup))
					.onChange(value => {
						this.matcher.captureGroup = Math.max(0, parseInt(value) || 0);
					});
				this.bindEnterKey(text.inputEl);
			});
	}

	private rememberFirstInput(inputEl: HTMLInputElement): void {
		this.firstInputEl ??= inputEl;
	}

	private bindEnterKey(inputEl: HTMLInputElement): void {
		inputEl.addEventListener('keydown', event => {
			// isComposing：避免 CJK 输入法确认候选词的回车被误判为提交
			if (!event.isComposing && event.key === 'Enter') {
				event.preventDefault();
				this.submit();
			}
		});
	}

	// 正则实时校验：非法时展示错误并禁用保存
	private refreshValidation(): void {
		const valid = isRegexValid(this.matcher.pattern, this.matcher.flags);
		this.regexErrorEl?.setText(valid ? '' : this.t('invalid-regex'));
		this.saveButton?.setDisabled(!valid);
	}

	private submit(): void {
		if (!isRegexValid(this.matcher.pattern, this.matcher.flags)) return;

		this.matcher.name = this.matcher.name.trim() || this.t('custom-matcher-default-name');
		this.close();
		this.onSave(this.matcher);
	}
}
