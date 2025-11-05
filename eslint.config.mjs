import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
	js.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsparser,
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				// Browser globals
				navigator: 'readonly',
				window: 'readonly',
				document: 'readonly',
				console: 'readonly',
				// Node.js globals
				global: 'readonly',
				process: 'readonly',
				// DOM types
				HTMLElement: 'readonly',
				HTMLInputElement: 'readonly',
				Event: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint
		},
		rules: {
			...tseslint.configs.recommended.rules,
			// 禁用一些在 TypeScript 项目中不需要的规则
			'no-undef': 'off',  // TypeScript 已经检查未定义变量
			'no-unused-vars': 'off',  // 使用 TypeScript 版本
			// 自定义规则
			'@typescript-eslint/no-non-null-assertion': 'off',  // 允许非空断言
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-useless-escape': 'error',
			'no-case-declarations': 'error',
			'prefer-const': 'error'
		}
	},
	{
		ignores: ['node_modules/**', 'dist/**', '*.js']
	}
];