#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { createInterface } from "readline";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

/**
 * 从 package.json 获取当前版本号
 * @returns {string} 当前版本号
 */
function getCurrentVersion() {
	try {
		const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
		return packageJson.version;
	} catch (error) {
		console.error("读取 package.json 失败:", error);
		process.exit(1);
	}
}

/**
 * 解析版本号
 * @param {string} version 版本号字符串
 * @returns {object} 包含 major, minor, patch 的对象
 */
function parseVersion(version) {
	const cleanVersion = version.replace(/-beta.*$/, "");
	const parts = cleanVersion.split(".").map(Number);
	return {
		major: parts[0] || 0,
		minor: parts[1] || 0,
		patch: parts[2] || 0,
	};
}

/**
 * 更新所有相关文件的版本号
 * @param {string} version 新版本号
 */
function updateAllFiles(version) {
	try {
		console.log(`\n正在更新至版本 ${version}...`);

		// 1. 更新 package.json
		updatePackageJson(version);

		// 2. 更新 manifest.json
		const minAppVersion = updateManifestJson(version);

		// 3. 更新 versions.json
		updateVersionsJson(version, minAppVersion);

		console.log("\n✅ 版本更新完成！");
		console.log("\n建议执行以下命令:");
		console.log(`git add package.json manifest.json versions.json`);
		console.log(`git commit -m "build: bump version to ${version}"`);
		console.log(`git tag ${version}`);
		console.log(`git push && git push --tags`);
	} catch (error) {
		console.error("❌ 更新版本时出错:", error);
		process.exit(1);
	}
}

/**
 * 更新 package.json 文件
 * @param {string} version 新版本号
 */
function updatePackageJson(version) {
	try {
		const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
		packageJson.version = version;
		writeFileSync(
			"package.json",
			JSON.stringify(packageJson, null, "\t") + "\n"
		);
		console.log(`📦 已更新 package.json 版本至 ${version}`);
	} catch (error) {
		console.error("更新 package.json 时出错:", error);
		throw error;
	}
}

/**
 * 更新 manifest.json 文件
 * @param {string} version 新版本号
 * @returns {string} 最低应用版本
 */
function updateManifestJson(version) {
	try {
		const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
		const { minAppVersion } = manifest;
		manifest.version = version;
		writeFileSync(
			"manifest.json",
			JSON.stringify(manifest, null, "\t") + "\n"
		);
		console.log(`📋 已更新 manifest.json 版本至 ${version}`);
		return minAppVersion;
	} catch (error) {
		console.error("更新 manifest.json 时出错:", error);
		throw error;
	}
}

/**
 * 更新 versions.json 文件
 * @param {string} version 新版本号
 * @param {string} minAppVersion 最低应用版本
 */
function updateVersionsJson(version, minAppVersion) {
	try {
		// 读取或创建 versions.json
		let versions = {};
		try {
			if (existsSync("versions.json")) {
				const versionsContent = readFileSync("versions.json", "utf8");
				if (versionsContent.trim()) {
					versions = JSON.parse(versionsContent);
				}
			}
		} catch (error) {
			console.log("创建新的 versions.json 文件");
		}

		// 更新版本信息
		versions[version] = minAppVersion;
		writeFileSync(
			"versions.json",
			JSON.stringify(versions, null, "\t") + "\n"
		);
		console.log(
			`📄 已更新 versions.json，添加版本 ${version} -> ${minAppVersion}`
		);
	} catch (error) {
		console.error("更新 versions.json 时出错:", error);
		throw error;
	}
}

// 主逻辑
const currentVersion = getCurrentVersion();
const { major, minor, patch } = parseVersion(currentVersion);

console.log(`🏷️  当前版本: ${currentVersion}`);
console.log("\n请选择版本更新类型:");
console.log("1. 📈 大版本 (major) - 不兼容的 API 修改");
console.log("2. ✨ 小版本 (minor) - 新增功能,向后兼容");
console.log("3. 🔧 补丁版本 (patch) - 问题修复,向后兼容");
console.log("4. ✏️  自定义版本号");

rl.question("\n选择 (1-4): ", (choice) => {
	let newVersion;

	switch (choice.trim()) {
		case "1":
			newVersion = `${major + 1}.0.0`;
			break;
		case "2":
			newVersion = `${major}.${minor + 1}.0`;
			break;
		case "3":
			newVersion = `${major}.${minor}.${patch + 1}`;
			break;
		case "4":
			rl.question("请输入自定义版本号 (x.y.z): ", (customVersion) => {
				const versionRegex = /^\d+\.\d+\.\d+$/;
				if (!versionRegex.test(customVersion.trim())) {
					console.log("❌ 版本号格式错误，请使用 x.y.z 格式");
					process.exit(1);
				}
				updateAllFiles(customVersion.trim());
				rl.close();
			});
			return;
		default:
			console.log("❌ 无效选项，退出...");
			process.exit(1);
	}

	console.log(`\n即将从 ${currentVersion} 更新到 ${newVersion}`);
	rl.question("确认更新? (y/N): ", (confirm) => {
		if (confirm.toLowerCase() === "y" || confirm.toLowerCase() === "yes") {
			updateAllFiles(newVersion);
		} else {
			console.log("❌ 已取消版本更新");
		}
		rl.close();
	});
});