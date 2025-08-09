const { setupTestEnvironment } = require('./setup');
const translationService = require('../translate/translation-service');

// Mock both OpenAI and Langchain services
jest.mock('../translate/openai', () => ({
    createTranslation: jest.fn()
}));

jest.mock('../translate/langchain-service', () => ({
    createTranslation: jest.fn()
}));

const { createTranslation: createOpenAITranslation } = require('../translate/openai');
const { createTranslation: createLangchainTranslation } = require('../translate/langchain-service');

describe('Translation Operations', () => {
    setupTestEnvironment();

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.AI_PROVIDER;
    });

    describe('translateBatch', () => {
        it('returns dummy translations in test mode', async () => {
            const result = await translationService.translateBatch(
                { 'Hello': 'Hello', 'Goodbye': 'Goodbye' },
                'fr',
                'prompt',
                true
            );
            expect(result).toEqual({
                'Hello': '[TEST] Hello',
                'Goodbye': '[TEST] Goodbye'
            });
        });

        it('handles API errors gracefully', async () => {
            createOpenAITranslation.mockRejectedValue(new Error('API Error'));

            const result = await translationService.translateBatch(
                { test: 'test' },
                'fr',
                'prompt'
            );
            expect(result).toBeNull();
        });

        it('successfully translates content with OpenAI (default)', async () => {
            createOpenAITranslation.mockResolvedValueOnce(
                JSON.stringify({ "Hello": "Bonjour" })
            );

            const result = await translationService.translateBatch(
                { 'Hello': 'Hello' },
                'fr',
                'prompt'
            );
            expect(result).toEqual({ 'Hello': 'Bonjour' });
            expect(createOpenAITranslation).toHaveBeenCalledTimes(1);
        });

        it('uses Langchain service when AI_PROVIDER is set', async () => {
            process.env.AI_PROVIDER = 'anthropic';
            
            createLangchainTranslation.mockResolvedValueOnce(
                JSON.stringify({ "Hello": "Bonjour" })
            );

            const result = await translationService.translateBatch(
                { 'Hello': 'Hello' },
                'fr',
                'prompt'
            );
            expect(result).toEqual({ 'Hello': 'Bonjour' });
            expect(createLangchainTranslation).toHaveBeenCalledTimes(1);
            expect(createOpenAITranslation).not.toHaveBeenCalled();
        });
    });

    describe('fetchTranslations', () => {
        it('handles small batches directly', async () => {
            createOpenAITranslation.mockResolvedValueOnce(
                JSON.stringify({ "Hello": "Bonjour" })
            );

            const result = await translationService.fetchTranslations(
                { 'Hello': 'Hello' },
                'fr',
                'en',
                false,
                25
            );
            expect(result).toEqual({ 'Hello': 'Bonjour' });
        });

        it('processes large content in batches', async () => {
            const translations = {};
            for (let i = 0; i < 30; i++) {
                translations[`Key${i}`] = `Value${i}`;
            }

            createOpenAITranslation.mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify({ "Key0": "Translated0" })
                    }
                }]
            });

            await translationService.fetchTranslations(
                translations,
                'fr',
                'en',
                false,
                10
            );
            expect(createOpenAITranslation).toHaveBeenCalledTimes(3);
        });

        it('returns dummy translations in test mode', async () => {
            const result = await translationService.fetchTranslations(
                { 'Hello': 'Hello', 'Goodbye': 'Goodbye' },
                'fr',
                'en',
                true
            );
            expect(result).toEqual({
                'Hello': '[TEST] Hello',
                'Goodbye': '[TEST] Goodbye'
            });
        });

        it('handles batch failure gracefully', async () => {
            createOpenAITranslation.mockRejectedValue(new Error('API Error'));

            const result = await translationService.fetchTranslations(
                { 'Hello': 'Hello', 'Goodbye': 'Goodbye' },
                'fr',
                'en'
            );
            expect(result).toBeNull();
        });
    });
});
