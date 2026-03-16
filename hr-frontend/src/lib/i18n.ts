export type AppLanguage = "th" | "en";

import appDictionary from "@/lib/i18n/dictionaries/app.json";
import authDictionary from "@/lib/i18n/dictionaries/auth.json";
import moduleDictionary from "@/lib/i18n/dictionaries/module.json";
import pagesDictionary from "@/lib/i18n/dictionaries/pages.json";
import routesCommonDictionary from "@/lib/i18n/dictionaries/routes-common.json";

type TranslationNode = string | { [key: string]: TranslationNode };

type TranslationMap = Record<AppLanguage, { [key: string]: TranslationNode }>;
type DictionaryFile = TranslationMap;

const dictionaryFiles: DictionaryFile[] = [
  appDictionary as DictionaryFile,
  authDictionary as DictionaryFile,
  moduleDictionary as DictionaryFile,
  pagesDictionary as DictionaryFile,
  routesCommonDictionary as DictionaryFile,
];

type TranslationDiagnostics = {
  duplicateKeys: string[];
  missingInThai: string[];
  missingInEnglish: string[];
};

function isObjectNode(value: TranslationNode): value is { [key: string]: TranslationNode } {
  return typeof value === "object" && value !== null;
}

function deepMerge(target: { [key: string]: TranslationNode }, source: { [key: string]: TranslationNode }, pathPrefix: string, duplicateKeys: Set<string>) {
  for (const [key, value] of Object.entries(source)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    const existing = target[key];

    if (existing === undefined) {
      target[key] = value;
      continue;
    }

    if (isObjectNode(existing) && isObjectNode(value)) {
      deepMerge(existing, value, path, duplicateKeys);
      continue;
    }

    duplicateKeys.add(path);
  }
}

function buildTranslationsAndDiagnostics(): { translations: TranslationMap; diagnostics: TranslationDiagnostics } {
  const translations: TranslationMap = { th: {}, en: {} };
  const duplicateKeys = new Set<string>();

  for (const dictionary of dictionaryFiles) {
    deepMerge(translations.th, dictionary.th, "", duplicateKeys);
    deepMerge(translations.en, dictionary.en, "", duplicateKeys);
  }

  const thKeys = new Set(flattenKeys(translations.th));
  const enKeys = new Set(flattenKeys(translations.en));

  const missingInThai = [...enKeys].filter((key) => !thKeys.has(key)).sort();
  const missingInEnglish = [...thKeys].filter((key) => !enKeys.has(key)).sort();

  return {
    translations,
    diagnostics: {
      duplicateKeys: [...duplicateKeys].sort(),
      missingInThai,
      missingInEnglish,
    },
  };
}

function flattenKeys(node: { [key: string]: TranslationNode }, pathPrefix = ""): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(node)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (isObjectNode(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }

  return keys;
}

const { translations, diagnostics } = buildTranslationsAndDiagnostics();

function getNode(language: AppLanguage, path: string): TranslationNode | undefined {
  const parts = path.split(".");
  let current: TranslationNode | undefined = translations[language];

  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = current[part];
  }

  return current;
}

export function getTranslationDiagnostics(): TranslationDiagnostics {
  return diagnostics;
}

export function getAllTranslationKeys(): string[] {
  return flattenKeys(translations.en).sort();
}

export function translate(language: AppLanguage, key: string, fallback?: string): string {
  const value = getNode(language, key);
  if (typeof value === "string") return value;

  const enValue = getNode("en", key);
  if (typeof enValue === "string") return enValue;

  return fallback || key;
}
