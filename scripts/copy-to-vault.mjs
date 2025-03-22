// copy-to-vault.mjs
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// 这里定义你的 Obsidian 库路径
const VAULT_PATH = 'V:\\Code\\CodeRepos\\plugin-dev-vault';
const pluginDir = join(VAULT_PATH, '.obsidian', 'plugins', 'easy-copy');

async function copyToVault() {
  try {
    // 确保插件目录存在
    if (!existsSync(pluginDir)) {
      await mkdir(pluginDir, { recursive: true });
      console.log(`创建目录: ${pluginDir}`);
    }

    // 要复制的文件列表
    const filesToCopy = ['main.js', 'manifest.json', 'styles.css'];

    // 复制文件
    for (const file of filesToCopy) {
      const sourcePath = join(rootDir, file);
      const destPath = join(pluginDir, file);
      await copyFile(sourcePath, destPath);
      console.log(`复制文件: ${file} -> ${destPath}`);
    }

    console.log('所有文件已成功复制到 Obsidian 库！');
  } catch (error) {
    console.error('复制文件时出错:', error);
    process.exit(1);
  }
}

copyToVault();