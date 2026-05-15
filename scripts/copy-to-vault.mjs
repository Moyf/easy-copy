// copy-to-vault.mjs
import { copyFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// 手动加载 .env 文件中的环境变量（替代 dotenv，避免额外依赖）
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) {
  const envContent = await readFile(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
// 获取 VAULT_PATH 环境变量
const VAULT_PATH = process.env.VAULT_PATH;
if (!VAULT_PATH) {
  throw new Error(
    'VAULT_PATH is not defined. Please create a .env file in the project root and add the line: VAULT_PATH=/path/to/your/vault'
  );
}
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