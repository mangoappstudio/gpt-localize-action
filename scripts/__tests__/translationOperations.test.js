const { setupTestEnvironment } = require('./setup');
const translationService = require('../translate/translation-service');

jest.mock('../translate/openai', () => ({
    createTranslation: jest.fn()
}));

const { createTranslation } = require('../translate/openai');

describe('Translation Operations', () => {
    setupTestEnvironment();

    beforeEach(() => {
        jest.clearAllMocks();
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
            createTranslation.mockRejectedValue(new Error('API Error'));

            const result = await translationService.translateBatch(
                { test: 'test' },
                'fr',
                'prompt'
            );
            expect(result).toBeNull();
        });

        it('successfully translates content', async () => {
            createTranslation.mockResolvedValueOnce(
                JSON.stringify({ "Hello": "Bonjour" })
            );

            const result = await translationService.translateBatch(
                { 'Hello': 'Hello' },
                'fr',
                'prompt'
            );
            expect(result).toEqual({ 'Hello': 'Bonjour' });
            expect(createTranslation).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetchTranslations', () => {
        it('handles small batches directly', async () => {
            createTranslation.mockResolvedValueOnce(
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

            createTranslation.mockResolvedValue({
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
            expect(createTranslation).toHaveBeenCalledTimes(3);
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
            createTranslation.mockRejectedValue(new Error('API Error'));

            const result = await translationService.fetchTranslations(
                { 'Hello': 'Hello', 'Goodbye': 'Goodbye' },
                'fr',
                'en'
            );
            expect(result).toBeNull();
        });
    });
});
