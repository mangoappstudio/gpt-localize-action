const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { fetchTranslations } = require('./translation-service');
const { loadJson, saveJson } = require('./json-utils');
const { getPreviousFileContent } = require('./git-utils');
const { extractNestedKeys, getChangedKeys, getDeletedKeys, removeKeys } = require('./key-utils');
require('dotenv').config();

// Maximum number of keys to translate in a single API call
const TRANSLATION_BATCH_SIZE = 25;

// Replace the args parsing section
const argv = yargs(hideBin(process.argv))
    .option('dir', {
        alias: 'd',
        type: 'string',
        description: 'Directory containing locale files',
        default: 'locales'
    })
    .option('sourceLanguage', {
        alias: 's',
        type: 'string',
        description: 'Source language code',
        default: 'en'
    })
    .option('sourceFile', {
        alias: 'f',
        type: 'string',
        description: 'Source language file name',
        default: 'en.json'
    })
    .option('test', {
        alias: 't',
        type: 'boolean',
        description: 'Run in test mode',
        default: false
    })
    .help()
    .argv;

const langArg = argv.dir;
const baseLangArg = argv.sourceLanguage;
const baseFileArg = argv.sourceFile;
const testMode = argv.test;
const enFile = path.join(langArg, baseFileArg);
const langDir = path.resolve(langArg)

// Helper to apply translations
const applyTranslations = (targetObj, translations) => {
    for (const key in translations) {
        const keys = key.split('.');
        let temp = targetObj;

        // Ensure all parent objects exist
        for (let i = 0; i < keys.length - 1; i++) {
            if (temp[keys[i]] === undefined || typeof temp[keys[i]] !== 'object') {
                temp[keys[i]] = {};
            }
            temp = temp[keys[i]];
        }

        // Apply the translation to the leaf key
        temp[keys[keys.length - 1]] = translations[key];
    }
};

// Main function to update translations
const updateTranslations = async () => {
    const currentEnJson = loadJson(enFile);
    const previousEnJson = getPreviousFileContent(enFile);

    const changedKeys = getChangedKeys(currentEnJson, previousEnJson);
    const deletedKeys = getDeletedKeys(currentEnJson, previousEnJson);
    const currentEnKeys = extractNestedKeys(currentEnJson);

    if (Object.keys(changedKeys).length === 0) {
        console.log(`No changes detected in ${baseFileArg}.`);
    } else {
        console.log(`Detected changes in ${baseFileArg}: ${Object.keys(changedKeys).length} keys`);
    }

    if (deletedKeys.length > 0) {
        console.log(`Detected ${deletedKeys.length} deleted keys in ${baseFileArg}: ${deletedKeys.join(', ')}`);
    }

    const langs = fs.readdirSync(langDir).filter(file => file.endsWith('.json') && file !== baseFileArg);

    for (const langFile of langs) {
        const langPath = path.join(langDir, langFile);
        const langJson = loadJson(langPath);
        const langKeys = extractNestedKeys(langJson);

        // Remove deleted keys
        if (deletedKeys.length > 0) {
            console.log(`Removing ${deletedKeys.length} deleted keys from ${langFile}...`);
            removeKeys(langJson, deletedKeys);
        }

        // Detect missing keys: keys in base but not in the target lang file
        const missingKeys = {};
        for (const key in currentEnKeys) {
            if (!(key in langKeys)) {
                missingKeys[key] = currentEnKeys[key];
            }
        }

        if (Object.keys(missingKeys).length === 0) {
            console.log(`No missing keys in ${langFile}.`);
        } else {
            console.log(`Detected ${Object.keys(missingKeys).length} missing keys in ${langFile}`);
        }

        // Combine changed keys and missing keys
        const keysToUpdate = { ...changedKeys, ...missingKeys };

        // Double-check that we're not trying to update any deleted keys
        for (const deletedKey of deletedKeys) {
            if (deletedKey in keysToUpdate) {
                delete keysToUpdate[deletedKey];
            }
        }

        if (Object.keys(keysToUpdate).length === 0 && deletedKeys.length === 0) {
            console.log(`No keys to update for ${langFile}. Already in sync.`);
            continue;
        }

        if (Object.keys(keysToUpdate).length > 0) {
            const targetLang = langFile.replace('.json', '');
            console.log(`Fetching translations for ${Object.keys(keysToUpdate).length} keys in ${targetLang}...`);

            const translations = await fetchTranslations(keysToUpdate, targetLang, baseLangArg, testMode, TRANSLATION_BATCH_SIZE);

            if (translations) {
                console.log(`Applying translations to ${langFile}...`);
                applyTranslations(langJson, translations);
            } else {
                console.error(`Failed to fetch translations for ${langFile}`);
            }
        }

        // Save the updated file regardless of whether we added or removed keys
        saveJson(langPath, langJson);
        console.log(`Updated ${langFile}`);
    }
};

if (require.main === module) {
    updateTranslations().catch(err => console.error('Error updating translations:', err));
}

module.exports = {
    applyTranslations,
    updateTranslations
};
