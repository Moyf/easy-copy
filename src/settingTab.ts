import { App, PluginSettingTab, Setting } from "obsidian";
import EasyCopy from "./main";
import { LinkFormat } from "./type";


export class EasyCopySettingTab extends PluginSettingTab {
	plugin: EasyCopy;

	constructor(app: App, plugin: EasyCopy) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(this.plugin.t('add-to-menu'))
			.setDesc(this.plugin.t('add-to-menu-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addToMenu)
				.onChange(async (value) => {
				this.plugin.settings.addToMenu = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName(this.plugin.t('show-notice'))
			.setDesc(this.plugin.t('show-notice-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotice)
				.onChange(async (value) => {
					this.plugin.settings.showNotice = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: this.plugin.t('format')});

		new Setting(containerEl)
			.setName(this.plugin.t('use-heading-as-display'))
			.setDesc(this.plugin.t('use-heading-as-display-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useHeadingAsDisplayText)
				.onChange(async (value) => {
					this.plugin.settings.useHeadingAsDisplayText = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.plugin.t('link-format'))
			.setDesc(this.plugin.t('link-format-desc'))
			.addDropdown(dropdown => dropdown
				.addOption(LinkFormat.MDLINK, this.plugin.t('markdown-link'))
				.addOption(LinkFormat.WIKILINK, this.plugin.t('wiki-link'))
				.setValue(this.plugin.settings.linkFormat)
				.onChange(async (value) => {
					this.plugin.settings.linkFormat = value as LinkFormat;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: this.plugin.t('block-id')});

		new Setting(containerEl)
			.setName(this.plugin.t('auto-add-block-id'))
			.setDesc(this.plugin.t('auto-add-block-id-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoAddBlockId)
				.onChange(async (value) => {
					this.plugin.settings.autoAddBlockId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.plugin.t('manual-block-id'))
			.setDesc(this.plugin.t('manual-block-id-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.allowManualBlockId)
				.onChange(async (value) => {
					this.plugin.settings.allowManualBlockId = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: this.plugin.t('target')});

		new Setting(containerEl)
			.setName(this.plugin.t('customize-targets'))
			.setDesc(this.plugin.t('customize-targets-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.customizeTargets)
				.onChange(async (value) => {
					this.plugin.settings.customizeTargets = value;
					await this.plugin.saveSettings();
					// 重新渲染设置界面以显示或隐藏目标选项
					this.display();
				}));

		// 只有当自定义复制对象选项开启时才显示具体的复制对象选项
		if (this.plugin.settings.customizeTargets) {
			new Setting(containerEl)
				.setName(this.plugin.t('enable-inline-code'))
				.setDesc(this.plugin.t('enable-inline-code-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableInlineCode)
					.onChange(async (value) => {
						this.plugin.settings.enableInlineCode = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(this.plugin.t('enable-bold'))
				.setDesc(this.plugin.t('enable-bold-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableBold)
					.onChange(async (value) => {
						this.plugin.settings.enableBold = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(this.plugin.t('enable-highlight'))
				.setDesc(this.plugin.t('enable-highlight-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableHighlight)
					.onChange(async (value) => {
						this.plugin.settings.enableHighlight = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(this.plugin.t('enable-italic'))
				.setDesc(this.plugin.t('enable-italic-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enableItalic)
					.onChange(async (value) => {
						this.plugin.settings.enableItalic = value;
						await this.plugin.saveSettings();
					}));
            
            new Setting(containerEl)
                .setName(this.plugin.t('enable-strikethrough'))
                .setDesc(this.plugin.t('enable-strikethrough-desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enableStrikethrough)
                    .onChange(async (value) => {
                        this.plugin.settings.enableStrikethrough = value;
                        await this.plugin.saveSettings();
                    }));
            
            new Setting(containerEl)
                .setName(this.plugin.t('enable-inline-latex'))
                .setDesc(this.plugin.t('enable-inline-latex-desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enableInlineLatex)
                    .onChange(async (value) => {
                        this.plugin.settings.enableInlineLatex = value;
                        await this.plugin.saveSettings();
                    }));
            
            new Setting(containerEl)
                .setName(this.plugin.t('enable-link'))
                .setDesc(this.plugin.t('enable-link-desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enableLink)
                    .onChange(async (value) => {
                        this.plugin.settings.enableLink = value;
                        await this.plugin.saveSettings();
                    }));
            
		}
	}
}