const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { fetchTranslations } = require('./translation-service');
const { loadJson, saveJson } = require('./json-utils');
require('dotenv').config();

// Maximum number of keys to translate in a single API call
const TRANSLATION_BATCH_SIZE = 25;

const args = process.argv.slice(2);

const langArg = args[0] || 'locales';
const baseLangArg = args[1] || 'en';
const baseFileArg = args[2] || 'en.json';
const testMode = args[3] === 'true';
const enFile = path.join(langArg, baseFileArg);
const langDir = path.resolve(langArg)

// Helper to extract nested keys
const extractNestedKeys = (obj, prefix = '') => {
    const keys = {};
    for (const key in obj) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
            Object.assign(keys, extractNestedKeys(value, fullKey));
        } else {
            keys[fullKey] = value;
        }
    }
    return keys;
};

// Helper to get the previous file content
const getPreviousFileContent = (filePath) => {
    try {
        const existsInPreviousCommit = execSync(`git ls-tree -r HEAD^ -- ${filePath}`, { encoding: 'utf8' });
        if (!existsInPreviousCommit || !existsInPreviousCommit.trim()) {
            console.log(`File ${filePath} does not exist in the previous commit. Assuming an empty object.`);
            return {};
        }

        const previousContent = execSync(`git show HEAD^:${filePath}`, { encoding: 'utf8' });
        return JSON.parse(previousContent);
    } catch (error) {
        const msg = `Error retrieving previous version of ${filePath}: ${error.message}`;
        if (process.env.NODE_ENV === 'test') {
            throw new Error(msg);
        } else {
            console.error(msg);
            process.exit(1);
        }
    }
};

// Helper to detect changed keys
const getChangedKeys = (currentJson, previousJson) => {
    const currentKeys = extractNestedKeys(currentJson);
    const previousKeys = extractNestedKeys(previousJson);

    const changedKeys = {};
    for (const key in currentKeys) {
        // Only consider keys that exist in both current and previous,
        // and have different values
        if (key in previousKeys && currentKeys[key] !== previousKeys[key]) {
            changedKeys[key] = currentKeys[key];
        }
    }
    return changedKeys;
};

// Helper to detect deleted keys
const getDeletedKeys = (currentJson, previousJson) => {
    const currentKeys = extractNestedKeys(currentJson);
    const previousKeys = extractNestedKeys(previousJson);

    const deletedKeys = [];
    for (const key in previousKeys) {
        if (!(key in currentKeys)) {
            deletedKeys.push(key);
        }
    }
    return deletedKeys;
};

// Helper to remove keys from an object
const removeKeys = (obj, keysToRemove) => {
    for (const key of keysToRemove) {
        const parts = key.split('.');
        let current = obj;
        const path = [];

        // Try to reach the deepest level
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
                break;
            }
            path.push({ key: parts[i], obj: current });
            current = current[parts[i]];
        }

        // Delete the target key if it exists
        const lastKey = parts[parts.length - 1];
        if (current && current[lastKey] !== undefined) {
            delete current[lastKey];
        }

        // Clean up empty parent objects from bottom to top
        for (let i = path.length - 1; i >= 0; i--) {
            const parentObj = i === 0 ? obj : path[i - 1].obj;
            const keyToCheck = path[i].key;

            const currentObj = parentObj[keyToCheck];
            
            // Check if object is empty or has only empty objects as children
            const isEmpty = typeof currentObj === 'object' && 
                          currentObj !== null && 
                          Object.keys(currentObj).length === 0;

            if (isEmpty) {
                delete parentObj[keyToCheck];
            }
        }
    }
    return obj;
};

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

// Add these exports at the end of the file for testing purposes
module.exports = {
    extractNestedKeys,
    getPreviousFileContent,
    getChangedKeys,
    getDeletedKeys,
    removeKeys,
    applyTranslations,
    updateTranslations
};
