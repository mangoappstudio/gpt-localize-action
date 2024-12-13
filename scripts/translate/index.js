const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { execSync } = require('child_process');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const args = process.argv.slice(2);

const langArg = args[0] || 'locales';
const enFile = path.join(langArg, 'en.json');
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

// Helper to fetch translations
const fetchTranslations = async (translations, targetLang) => {
    const systemPrompt = `You are a translator. Translate the following English phrases into ${targetLang}. Respond with only a JSON object where the keys are the original phrases and the values are their translations.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(translations) },
    ];

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages,
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error(`Error fetching translations for ${targetLang}:`, error.response?.data || error.message);
        return null;
    }
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
        if (currentKeys[key] !== previousKeys[key]) {
            changedKeys[key] = currentKeys[key];
        }
    }
    return changedKeys;
};

// Helper to apply translations
const applyTranslations = (targetObj, translations) => {
    for (const key in translations) {
        const keys = key.split('.');
        let temp = targetObj;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!temp[keys[i]]) temp[keys[i]] = {};
            temp = temp[keys[i]];
        }

        temp[keys[keys.length - 1]] = translations[key];
    }
};

// Main function to update translations
const updateTranslations = async () => {
    const currentEnJson = loadJson(enFile);
    const previousEnJson = getPreviousFileContent(enFile);

    const changedKeys = getChangedKeys(currentEnJson, previousEnJson);
    const currentEnKeys = extractNestedKeys(currentEnJson);

    if (Object.keys(changedKeys).length === 0) {
        console.log('No changes detected in en.json.');
        // We still proceed to ensure missing keys are synced.
    } else {
        console.log(`Detected changes in en.json: ${Object.keys(changedKeys).length} keys`);
    }

    const langs = fs.readdirSync(langDir).filter(file => file.endsWith('.json') && file !== 'en.json');

    for (const langFile of langs) {
        const langPath = path.join(langDir, langFile);
        const langJson = loadJson(langPath);
        const langKeys = extractNestedKeys(langJson);

        // Detect missing keys: keys in en but not in the target lang file
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

        if (Object.keys(keysToUpdate).length === 0) {
            console.log(`No keys to update for ${langFile}. Already in sync.`);
            continue;
        }

        const targetLang = langFile.replace('.json', '');
        console.log(`Fetching translations for ${Object.keys(keysToUpdate).length} keys in ${targetLang}...`);

        const translations = await fetchTranslations(keysToUpdate, targetLang);

        if (translations) {
            console.log(`Applying translations to ${langFile}...`);
            applyTranslations(langJson, translations);
            saveJson(langPath, langJson);
            console.log(`Updated ${langFile}`);
        } else {
            console.error(`Failed to update ${langFile}`);
        }
    }
};

updateTranslations().catch(err => console.error('Error updating translations:', err));
