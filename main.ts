import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu } from 'obsidian';

enum LinkFormat {
	MDLINK = 'markdown-link',
	WIKILINK = 'wiki-link'
}

interface EasyCopySettings {
	mySetting: string;
	addToMenu: boolean;
	showNotice: boolean;
	useHeadingAsDisplayText: boolean;
	linkFormat: LinkFormat;
}

const DEFAULT_SETTINGS: EasyCopySettings = {
	mySetting: 'default',
	addToMenu: true,
	showNotice: true,
	useHeadingAsDisplayText: true,
	linkFormat: LinkFormat.MDLINK
}

export default class EasyCopy extends Plugin {
	settings: EasyCopySettings;

	async onload() {
		await this.loadSettings();

		/**
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('copy', 'Easy Copy', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('easy-copy-ribbon-class');
		 */

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'contextual-copy',
			name: 'Contextual Copy',
			hotkeys: [{
				modifiers: ['Mod', 'Alt'],
				key: 'c'
			}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EasyCopySettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// 注册右键菜单
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				// 只有当设置中的 addToMenu 为 true 时才添加菜单项
				if (this.settings.addToMenu) {
					menu.addItem(item => {
						item
							.setTitle("Contextual Copy")
							.setIcon('copy-slash')
							.onClick(async () => {
								new Notice("yo!")
							});
					})
				}
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class EasyCopySettingTab extends PluginSettingTab {
	plugin: EasyCopy;

	constructor(app: App, plugin: EasyCopy) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// 加一个二级标题
		containerEl.createEl('h2', {text: 'General'});

		new Setting(containerEl)
			.setName('Add to menu')
			.setDesc('Add the command to the menu')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addToMenu)
				.onChange(async (value) => {
				this.plugin.settings.addToMenu = value;
				await this.plugin.saveSettings();
			}));

		containerEl.createEl('h2', {text: 'Format'});

		new Setting(containerEl)
			.setName('Link format')
			.setDesc('The format of the link when you copy heading link')
			.addDropdown(dropdown => dropdown
				.addOption(LinkFormat.MDLINK, 'Markdown link')
				.addOption(LinkFormat.WIKILINK, 'Wiki link')
				.setValue(this.plugin.settings.linkFormat)
				.onChange(async (value) => {
					this.plugin.settings.linkFormat = value as LinkFormat;
					await this.plugin.saveSettings();
				}));

	}
}
