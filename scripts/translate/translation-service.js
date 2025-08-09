// Use Langchain service for AI provider abstraction, with fallback to direct OpenAI
const { createTranslation: createLangchainTranslation } = require('./langchain-service');
const { createTranslation: createOpenAITranslation } = require('./openai');

// Helper for dummy translations
const getDummyTranslations = (translations) => {
    const result = {};
    Object.keys(translations).forEach(key => {
        result[key] = `[TEST] ${translations[key]}`;
    });
    return result;
};

const translateBatch = async (batchTranslations, targetLang, systemPrompt, testMode = false) => {
    try {
        if (testMode) {
            return getDummyTranslations(batchTranslations);
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(batchTranslations) },
        ];

        // Determine which service to use based on environment variables
        const useLangchain = process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'openai-direct';
        const content = useLangchain 
            ? await createLangchainTranslation(messages)
            : await createOpenAITranslation(messages);
        
        const parsedContent = JSON.parse(content);
        
        if (!parsedContent || typeof parsedContent !== 'object') {
            throw new Error('Invalid translation response format');
        }

        return parsedContent;
    } catch (error) {
        console.error('Error in translation batch:', error.message);
        return null;
    }
};

const fetchTranslations = async (translations, targetLang, baseLang, testMode = false, batchSize = 25) => {
    const systemPrompt = `You are a translator API that only responds with valid JSON. Translate the following ${baseLang} phrases into ${targetLang}.

IMPORTANT REQUIREMENTS:
1. Respond with ONLY a valid JSON object.
2. The JSON should have the original phrases as keys and their translations as values.
3. Do not add any comments, explanations, or text outside the JSON object.
4. If a string is enclosed in double curly braces like {{name}}, do not translate that portion.
5. Ensure all quotes are properly escaped in the JSON.

Example input:
{"Hello, {{name}}": "Hello, {{name}}", "Welcome": "Welcome"}

Example valid response (for French):
{"Hello, {{name}}": "Bonjour, {{name}}", "Welcome": "Bienvenue"}

NO COMMENTS OR TEXT BEFORE OR AFTER THE JSON OBJECT ARE ALLOWED.`;

    const keysToTranslate = Object.keys(translations);
    const totalKeys = keysToTranslate.length;

    if (totalKeys <= batchSize) {
        return await translateBatch(translations, targetLang, systemPrompt, testMode);
    }

    const allResults = {};

    for (let i = 0; i < totalKeys; i += batchSize) {
        const batchKeys = keysToTranslate.slice(i, i + batchSize);
        const batchTranslations = {};
        batchKeys.forEach(key => {
            batchTranslations[key] = translations[key];
        });

        console.log(`Translating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalKeys / batchSize)} (${batchKeys.length} keys)...`);

        const batchResults = await translateBatch(batchTranslations, targetLang, systemPrompt, testMode);

        if (batchResults) {
            Object.assign(allResults, batchResults);
        }
    }

    return Object.keys(allResults).length === 0 ? null : allResults;
};

module.exports = {
    fetchTranslations,
    translateBatch
};
