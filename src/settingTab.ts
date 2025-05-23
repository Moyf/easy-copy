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
			.setName(this.plugin.t('add-extra-commands'))
			.setDesc(this.plugin.t('add-extra-commands-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addExtraCommands)
				.onChange(async (value) => {
				this.plugin.settings.addExtraCommands = value;
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

		new Setting(containerEl)
			.setName(this.plugin.t('format'))
			.setHeading();

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

		new Setting(containerEl)
			.setName(this.plugin.t('use-heading-as-display'))
			.setDesc(this.plugin.t('use-heading-as-display-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useHeadingAsDisplayText)
				.onChange(async (value) => {
					this.plugin.settings.useHeadingAsDisplayText = value;
					await this.plugin.saveSettings();
				}));

		// 新增：是否使用 frontmatter 属性作为显示文本
		new Setting(containerEl)
			.setName(this.plugin.t('use-frontmatter-as-display'))
			.setDesc(this.plugin.t('use-frontmatter-as-display-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useFrontmatterAsDisplay)
				.onChange(async (value) => {
					this.plugin.settings.useFrontmatterAsDisplay = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		// 新增：自定义 frontmatter 属性名，仅在上方开启时显示
		if (this.plugin.settings.useFrontmatterAsDisplay) {
			new Setting(containerEl)
				.setName(this.plugin.t('frontmatter-key'))
				.setDesc(this.plugin.t('frontmatter-key-desc'))
				.addText(text => text
					.setPlaceholder('title')
					.setValue(this.plugin.settings.frontmatterKey)
					.onChange(async (value) => {
						this.plugin.settings.frontmatterKey = value || 'title';
						await this.plugin.saveSettings();
					})
				);
		}


		new Setting(containerEl)
			.setName(this.plugin.t('block-id'))
			.setHeading();

		new Setting(containerEl)
			.setName(this.plugin.t('auto-add-block-id'))
			.setDesc(this.plugin.t('auto-add-block-id-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoAddBlockId)
				.onChange(async (value) => {
					this.plugin.settings.autoAddBlockId = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.autoAddBlockId) {
		new Setting(containerEl)
			.setName(this.plugin.t('manual-block-id'))
			.setDesc(this.plugin.t('manual-block-id-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.allowManualBlockId)
				.onChange(async (value) => {
					this.plugin.settings.allowManualBlockId = value;
					await this.plugin.saveSettings();
				}));
		}
		
		// 新增：自动为 Block 链接添加显示文本
		new Setting(containerEl)
			.setName(this.plugin.t('auto-block-display-text'))
			.setDesc(this.plugin.t('auto-block-display-text-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoBlockDisplayText)
				.onChange(async (value) => {
					this.plugin.settings.autoBlockDisplayText = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName(this.plugin.t('target'))
			.setHeading();

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

            new Setting(containerEl)
                .setName(this.plugin.t('enable-wikilink'))
                .setDesc(this.plugin.t('enable-wikilink-desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enableWikiLink ?? true)
                    .onChange(async (value) => {
                        this.plugin.settings.enableWikiLink = value;
                        await this.plugin.saveSettings();
                        this.display(); // 切换后刷新界面以显示/隐藏下方选项
                    }));
            
		}

		new Setting(containerEl)
			.setName(this.plugin.t('enable-callout-copy'))
			.setDesc(this.plugin.t('enable-callout-copy-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCalloutCopy ?? true)
				.onChange(async (value) => {
					this.plugin.settings.enableCalloutCopy = value;
					await this.plugin.saveSettings();
					this.display();
				}));
		// 优先复制 Callout 内容
		if (this.plugin.settings.enableCalloutCopy) {
			new Setting(containerEl)
				.setName(this.plugin.t('callout-copy-priority'))
				.setDesc(this.plugin.t('callout-copy-priority-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.calloutCopyPriority ?? true)
					.onChange(async (value) => {
						this.plugin.settings.calloutCopyPriority = value;
						await this.plugin.saveSettings();
					}));
		}

		
		new Setting(containerEl)
		.setName(this.plugin.t('special-format'))
		.setHeading();
				
		// 块链接特殊格式选项
		new Setting(containerEl)
			.setName(this.plugin.t('auto-embed-block-link'))
			.setDesc(this.plugin.t('auto-embed-block-link-desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoEmbedBlockLink ?? false)
				.onChange(async (value) => {
					this.plugin.settings.autoEmbedBlockLink = value;
					await this.plugin.saveSettings();
				}));

		// 仅当启用 Wiki 链接复制时显示
		if (this.plugin.settings.enableWikiLink) {
			new Setting(containerEl)
				.setName(this.plugin.t('keep-wiki-brackets'))
				.setDesc(this.plugin.t('keep-wiki-brackets-desc'))
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.keepWikiBrackets ?? true)
					.onChange(async (value) => {
						this.plugin.settings.keepWikiBrackets = value;
						await this.plugin.saveSettings();
					}));
		}
	}
}