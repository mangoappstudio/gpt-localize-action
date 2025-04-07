const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { execSync } = require('child_process');
require('dotenv').config();

// Maximum number of keys to translate in a single API call
const TRANSLATION_BATCH_SIZE = 100;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const args = process.argv.slice(2);

const langArg = args[0] || 'locales';
const baseLangArg = args[1] || 'en';
const baseFileArg = args[2] || 'en.json';
const enFile = path.join(langArg, baseFileArg);
const langDir = path.resolve(langArg)

// Helper to load JSON
const loadJson = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading JSON from ${filePath}:`, error.message);
        process.exit(1);
    }
};

// Helper to save JSON
const saveJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Helper to translate in batches
const translateBatch = async (batchTranslations, targetLang, systemPrompt) => {
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(batchTranslations) },
        ];
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages,
        });
        
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Error in translation batch:', error.response?.data || error.message);
        return null;
    }
};

// Helper to fetch translations
const fetchTranslations = async (translations, targetLang) => {
    const systemPrompt = `You are a translator. Translate the following ${baseLangArg} phrases into ${targetLang}. Respond with only a JSON object where the keys are the original phrases and the values are their translations. If a string is enclosed in double curly braces, do not translate the portion inside the curly braces. For example, if the English phrase is "Hello, {{name}}", the french translation should be "Bonjour, {{name}}".`;

    // Get all keys that need to be translated
    const keysToTranslate = Object.keys(translations);
    const totalKeys = keysToTranslate.length;
    
    // If small enough for a single batch, process directly
    if (totalKeys <= TRANSLATION_BATCH_SIZE) {
        return await translateBatch(translations, targetLang, systemPrompt);
    }
    
    // Initialize the results object
    const allResults = {};
    
    // Process in batches
    for (let i = 0; i < totalKeys; i += TRANSLATION_BATCH_SIZE) {
        // Get the current batch of keys
        const batchKeys = keysToTranslate.slice(i, i + TRANSLATION_BATCH_SIZE);
        
        // Create a translation object for the current batch
        const batchTranslations = {};
        batchKeys.forEach(key => {
            batchTranslations[key] = translations[key];
        });
        
        console.log(`Translating batch ${Math.floor(i/TRANSLATION_BATCH_SIZE) + 1} of ${Math.ceil(totalKeys/TRANSLATION_BATCH_SIZE)} (${batchKeys.length} keys)...`);
        
        const batchResults = await translateBatch(batchTranslations, targetLang, systemPrompt);
        
        if (batchResults) {
            // Merge the batch results into the overall results
            Object.assign(allResults, batchResults);
        }
    }
    
    // If we have no results at all, return null to indicate complete failure
    if (Object.keys(allResults).length === 0) {
        return null;
    }
    
    return allResults;
};

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
        // Check if the file existed in the previous commit
        const existsInPreviousCommit = execSync(`git ls-tree -r HEAD^ -- ${filePath}`, { encoding: 'utf8' }).trim();
        if (!existsInPreviousCommit) {
            console.log(`File ${filePath} does not exist in the previous commit. Assuming an empty object.`);
            return {};
        }

        // Fetch the file content from the previous commit
        const previousContent = execSync(`git show HEAD^:${filePath}`, { encoding: 'utf8' });

        return JSON.parse(previousContent);
    } catch (error) {
        console.error(`Error retrieving previous version of ${filePath}:`, error.message);
        process.exit(1);
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
        const keys = key.split('.');
        let temp = obj;
        const path = [];

        // Navigate to the deepest object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!temp[keys[i]]) break;
            temp = temp[keys[i]];
            path.push({ key: keys[i], obj: temp });
        }

        // Remove the key
        if (temp && temp[keys[keys.length - 1]] !== undefined) {
            delete temp[keys[keys.length - 1]];
        }

        // Clean up empty objects
        for (let i = path.length - 1; i >= 0; i--) {
            const parent = i > 0 ? path[i - 1].obj : obj;
            const currentKey = path[i].key;
            
            if (Object.keys(parent[currentKey]).length === 0) {
                delete parent[currentKey];
            }
        }
    }
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
        // We still proceed to ensure missing keys are synced.
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

            const translations = await fetchTranslations(keysToUpdate, targetLang);

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

updateTranslations().catch(err => console.error('Error updating translations:', err));

// Add these exports at the end of the file for testing purposes
module.exports = {
  loadJson,
  saveJson,
  fetchTranslations,
  extractNestedKeys,
  getPreviousFileContent,
  getChangedKeys,
  getDeletedKeys,
  removeKeys,
  applyTranslations,
  updateTranslations
};
