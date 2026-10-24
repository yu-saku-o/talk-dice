#!/usr/bin/env node
// Theme data checker: counts, duplicates, required fields, NG words.
// Usage: node tools/check-themes.js   (exit code 1 on any error)
const path = require('path');
const { CATEGORIES, THEMES } = require(path.join(__dirname, '..', 'themes.js'));

// NG topics for a first-meeting party (income, looks, body, past partners,
// religion, politics, sexual topics, judging / ranking the other person).
const NG = [
  '年収', '収入', '給料', '給与', '月収', '貯金', '貯蓄', '資産', 'ローン', '借金', 'お金', '稼',
  '容姿', '顔', 'ルックス', 'イケメン', '美人', '可愛い', 'かわいい', 'ブス', '体型', '体重', '身長', 'スタイル', '太', '痩', 'ダイエット', '胸',
  '元カレ', '元カノ', '元彼', '元恋人', '元パートナー', '前の恋人', '交際人数', '付き合った人数', '経験人数', '何人と', '過去の恋愛', '元配偶者', '離婚', 'バツ',
  '宗教', '信仰', '神様', '政治', '選挙', '政党', '支持',
  '性的', 'エッチ', 'セックス', '下ネタ', '夜の', 'キス', 'ホテル代', '浮気', '不倫',
  '学歴', '大学', '偏差値', '勤務先', '会社名', '年齢', '何歳', '親の職業', '点数', '採点', 'ランク', '何点', '合格', '条件',
];
const ALLOW = []; // add exact substrings here if a false positive must be allowed

const errors = [];
const warn = [];
const catIds = new Set(CATEGORIES.map((c) => c.id));
const ids = new Map(), titles = new Map(), qs = new Map();

for (const t of THEMES) {
  const where = `id=${t.id}`;
  for (const f of ['id', 'cat', 'level', 'title', 'q', 'dig']) if (t[f] === undefined || t[f] === '') errors.push(`${where}: missing ${f}`);
  if (!catIds.has(t.cat)) errors.push(`${where}: unknown cat "${t.cat}"`);
  if (![1, 2].includes(t.level)) errors.push(`${where}: level must be 1 or 2`);
  for (const [map, key, name] of [[ids, t.id, 'id'], [titles, t.title, 'title'], [qs, t.q, 'q']]) {
    if (map.has(key)) errors.push(`${where}: duplicate ${name} with id=${map.get(key)} (${key})`);
    else map.set(key, t.id);
  }
  if (t.q && !/[？?]$/.test(t.q)) warn.push(`${where}: q does not end with ？`);
  if (t.dig && !/[？?！!）)]$/.test(t.dig)) warn.push(`${where}: dig does not end with ？/！`);
  const text = [t.title, t.q, t.dig].join(' / ');
  for (const w of NG) {
    if (text.includes(w) && !ALLOW.some((a) => text.includes(a) && a.includes(w))) errors.push(`${where}: NG word "${w}" in: ${text}`);
  }
}

console.log(`Total themes: ${THEMES.length}`);
console.log('By category (level1 / level2 / total):');
for (const c of CATEGORIES) {
  const l1 = THEMES.filter((t) => t.cat === c.id && t.level === 1).length;
  const l2 = THEMES.filter((t) => t.cat === c.id && t.level === 2).length;
  console.log(`  ${c.label.padEnd(10, '　')} ${l1} / ${l2} / ${l1 + l2}`);
  if (l1 + l2 < 10 || l1 + l2 > 15) warn.push(`${c.id}: ${l1 + l2} themes (target 10-15)`);
  if (l1 < 2 || l2 < 2) errors.push(`${c.id}: each level needs >= 2 themes so history avoidance works`);
}
console.log(`By mode: はじめまして=${THEMES.filter((t) => t.level === 1).length}, 打ち解けてきた=${THEMES.filter((t) => t.level === 2).length}`);
console.log(`Profile-sheet themes: ${THEMES.filter((t) => t.sheet).length}`);
console.log(`NG words checked: ${NG.length}`);
warn.forEach((w) => console.log('WARN  ' + w));
errors.forEach((e) => console.log('ERROR ' + e));
console.log(errors.length ? `RESULT: FAIL (${errors.length} errors)` : 'RESULT: PASS (0 errors)');
process.exit(errors.length ? 1 : 0);
