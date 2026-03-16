import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DICT_DIR = path.join(ROOT, "src", "lib", "i18n", "dictionaries");
const SRC_DIR = path.join(ROOT, "src");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenKeys(node, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(node)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (isObject(value)) {
      keys.push(...flattenKeys(value, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function mergeInto(target, source, prefix, duplicates) {
  for (const [key, value] of Object.entries(source)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (!(key in target)) {
      target[key] = value;
      continue;
    }

    if (isObject(target[key]) && isObject(value)) {
      mergeInto(target[key], value, next, duplicates);
      continue;
    }

    duplicates.add(next);
  }
}

function listFilesRecursive(dir, extList, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      listFilesRecursive(full, extList, out);
      continue;
    }
    if (extList.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const dictFiles = fs
  .readdirSync(DICT_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => path.join(DICT_DIR, name));

const merged = { th: {}, en: {} };
const duplicateKeys = new Set();

for (const file of dictFiles) {
  const data = readJson(file);
  mergeInto(merged.th, data.th || {}, "", duplicateKeys);
  mergeInto(merged.en, data.en || {}, "", duplicateKeys);
}

const thKeys = new Set(flattenKeys(merged.th));
const enKeys = new Set(flattenKeys(merged.en));
const missingInThai = [...enKeys].filter((k) => !thKeys.has(k)).sort();
const missingInEnglish = [...thKeys].filter((k) => !enKeys.has(k)).sort();

const sourceFiles = listFilesRecursive(SRC_DIR, [".ts", ".tsx"]);
const usedKeys = new Set();
const staticCallRegex = /\bt\(\s*(["'])([^"']+)\1/g;
const staticTemplateRegex = /\bt\(\s*`([^`$]+)`/g;

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match = staticCallRegex.exec(content);
  while (match) {
    usedKeys.add(match[2]);
    match = staticCallRegex.exec(content);
  }

  match = staticTemplateRegex.exec(content);
  while (match) {
    usedKeys.add(match[1]);
    match = staticTemplateRegex.exec(content);
  }
}

const allDictKeys = new Set([...thKeys, ...enKeys]);
const missingByUsage = [...usedKeys].filter((key) => !allDictKeys.has(key)).sort();

if (duplicateKeys.size > 0) {
  console.error("Duplicate keys found:");
  for (const key of [...duplicateKeys].sort()) {
    console.error(` - ${key}`);
  }
}

if (missingInThai.length > 0) {
  console.error("Missing keys in TH:");
  for (const key of missingInThai) {
    console.error(` - ${key}`);
  }
}

if (missingInEnglish.length > 0) {
  console.error("Missing keys in EN:");
  for (const key of missingInEnglish) {
    console.error(` - ${key}`);
  }
}

if (missingByUsage.length > 0) {
  console.error("Used keys missing from dictionary:");
  for (const key of missingByUsage) {
    console.error(` - ${key}`);
  }
}

if (duplicateKeys.size > 0 || missingInThai.length > 0 || missingInEnglish.length > 0 || missingByUsage.length > 0) {
  process.exit(1);
}

console.log(`i18n check passed. dictionaryFiles=${dictFiles.length}, keys=${allDictKeys.size}, usedKeys=${usedKeys.size}`);
