#!/usr/bin/env node
/**
 * 批量导入成员头像
 *
 * 用法：
 *   npm run import-avatars                  导入 raw-avatars/
 *   npm run import-avatars -- ./某个目录     指定源目录
 *   npm run import-avatars -- --dry          只预览，不写任何文件
 *   npm run import-avatars -- --force        覆盖 public/memberBG 下的同名图片
 *
 * 命名规则：
 *   文件名（去掉扩展名）= 昵称，例如「芋泥猫头.jpg」→ 匹配昵称「芋泥猫头」。
 *   一个头像对应多个别名，用 + 连接：芋泥猫头+猫头+炸糕.jpg
 *   键会自动 lowercase，因为 App.jsx 里 getMemberStyle() 用 name.trim().toLowerCase() 查找。
 *
 * 手写别名请放在 src/config/specialMembers.js 的 MANUAL_MEMBERS，优先级高于自动生成结果。
 * 重复跑是安全的：已在 MANUAL_MEMBERS 里的昵称会被跳过，不会覆盖你手调的别名。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BG_DIR = path.join(ROOT, 'public', 'memberBG');
const MANUAL_FILE = path.join(ROOT, 'src', 'config', 'specialMembers.js');
const GENERATED_FILE = path.join(ROOT, 'src', 'config', 'generatedMembers.js');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp']);
const ALIAS_SEP = '+';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));
const srcDir = path.resolve(ROOT, positional[0] || 'raw-avatars');
const dryRun = flags.has('--dry');
const force = flags.has('--force');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function die(msg) {
  console.error(c.red(`✗ ${msg}`));
  process.exit(1);
}

/** 文件名/URL 里不能出现的字符换成下划线 */
function safeName(name) {
  return name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+$/, '_');
}

function quote(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** 递归收集图片文件 */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

if (!fs.existsSync(srcDir)) {
  die(`源目录不存在：${srcDir}\n  先建个 raw-avatars/ 把头像图片丢进去。`);
}
if (!fs.existsSync(MANUAL_FILE)) {
  die(`找不到 ${MANUAL_FILE}，请确认 specialMembers.js 导出了 MANUAL_MEMBERS。`);
}

const manualMod = await import(pathToFileURL(MANUAL_FILE).href);
if (!manualMod.MANUAL_MEMBERS) {
  die('specialMembers.js 没有导出 MANUAL_MEMBERS，无法判断哪些昵称是手写的。');
}
const manualKeys = new Set(
  Object.keys(manualMod.MANUAL_MEMBERS).map((k) => k.toLowerCase())
);

const files = walk(srcDir).sort();
if (files.length === 0) {
  console.log(c.yellow(`⚠ ${path.relative(ROOT, srcDir)} 里没有找到图片`));
  console.log(c.dim(`  支持的格式：${[...IMAGE_EXTS].join(' ')}`));
  process.exit(0);
}

const entries = new Map(); // lowercased nickname -> '/memberBG/x.jpg'
const added = [];
const skipped = [];
const renamed = [];
const warnings = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const stem = path.basename(file, path.extname(file));

  const aliases = stem
    .split(ALIAS_SEP)
    .map((a) => a.trim())
    .filter(Boolean);

  if (aliases.length === 0) {
    skipped.push([file, '文件名是空的']);
    continue;
  }

  const primary = safeName(aliases[0]);
  if (primary !== aliases[0]) {
    warnings.push(`「${aliases[0]}」含文件名非法字符，已存为「${primary}」`);
  }

  const destName = `${primary}${ext}`;
  const destPath = path.join(BG_DIR, destName);
  const relImage = `/memberBG/${destName}`;

  const freshAliases = [];
  for (const alias of aliases) {
    const key = alias.toLowerCase();
    if (manualKeys.has(key)) {
      skipped.push([file, `「${alias}」已在 MANUAL_MEMBERS 中，保留手写配置`]);
      continue;
    }
    if (entries.has(key)) {
      skipped.push([file, `「${alias}」与前面的文件重复，保留先出现的`]);
      continue;
    }
    entries.set(key, relImage);
    freshAliases.push(alias);
  }

  if (freshAliases.length === 0) continue;
  added.push([destName, freshAliases]);

  if (!dryRun) {
    fs.mkdirSync(BG_DIR, { recursive: true });
    if (fs.existsSync(destPath) && !force) {
      const same = fs.statSync(destPath).size === fs.statSync(file).size;
      if (!same) renamed.push(destName);
    }
    fs.copyFileSync(file, destPath);
  }
}

// 写 generatedMembers.js
const lines = [
  '// 此文件由 scripts/import-avatars.mjs 自动生成，不要手改。',
  '// 手写别名请加到 specialMembers.js 的 MANUAL_MEMBERS（优先级更高）。',
  'export const GENERATED_MEMBERS = {',
];
for (const [key, image] of entries) {
  lines.push(`  ${quote(key)}: {`);
  lines.push(`    backgroundImage: ${quote(image)},`);
  lines.push('  },');
}
lines.push('};', '');

if (!dryRun) {
  fs.writeFileSync(GENERATED_FILE, lines.join('\n'), 'utf8');
}

// 报告
console.log('');
console.log(c.bold(`源目录  ${path.relative(ROOT, srcDir) || '.'}`));
console.log(c.bold(`图片数  ${files.length}    新增昵称 ${c.green(entries.size)}`));
if (dryRun) console.log(c.yellow('（--dry 预览模式，未写入任何文件）'));
console.log('');

if (added.length) {
  console.log(c.green('导入：'));
  for (const [dest, aliases] of added) {
    const aliasText = aliases.length > 1 ? c.dim(`  别名: ${aliases.slice(1).join(' / ')}`) : '';
    console.log(`  ${dest.padEnd(28)} ${c.dim('←')} ${aliases[0]}${aliasText}`);
  }
  console.log('');
}

if (skipped.length) {
  console.log(c.yellow('跳过：'));
  for (const [file, reason] of skipped) {
    console.log(`  ${path.basename(file).padEnd(28)} ${c.dim(reason)}`);
  }
  console.log('');
}

if (renamed.length) {
  console.log(c.yellow('同名但内容不同，已被覆盖：'));
  for (const name of renamed) console.log(`  ${name}`);
  console.log(c.dim('  想保留旧图请加 --force 前先手动备份。'));
  console.log('');
}

if (warnings.length) {
  console.log(c.yellow('注意：'));
  for (const w of warnings) console.log(`  ${w}`);
  console.log('');
}

if (!dryRun && added.length) {
  console.log(c.dim('下一步：npm run dev 看效果，或 npm run build 部署。'));
}
