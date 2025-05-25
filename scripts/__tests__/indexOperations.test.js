jest.mock('fs');
jest.mock('../translate/translation-service');
jest.mock('../translate/git-utils');
jest.mock('../translate/json-utils');

const fs = require('fs');
const path = require('path');
const { setupTestEnvironment, translate } = require('./setup');
const { fetchTranslations } = require('../translate/translation-service');
const { getPreviousFileContent } = require('../translate/git-utils');
const { loadJson, saveJson } = require('../translate/json-utils');

describe('Index Operations', () => {
    setupTestEnvironment();

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock fs.readdirSync
        fs.readdirSync.mockReturnValue(['en.json', 'fr.json', 'es.json']);
        
        // Mock loadJson for different scenarios
        loadJson
            .mockReturnValueOnce({ greeting: 'hello', nested: { key: 'value' } }) // current en.json
            .mockReturnValueOnce({ greeting: 'bonjour' }) // fr.json
            .mockReturnValueOnce({ greeting: 'hola' }); // es.json
        
        // Mock getPreviousFileContent
        getPreviousFileContent.mockReturnValue({ greeting: 'hi', nested: { key: 'old' } });
        
        // Mock fetchTranslations
        fetchTranslations.mockResolvedValue({ 'nested.key': 'translated value' });
    });

    describe('updateTranslations', () => {
        it('should process changes and update translation files', async () => {
            await translate.updateTranslations();

            // Verify translations were fetched for changed keys
            expect(fetchTranslations).toHaveBeenCalledWith(
                expect.objectContaining({ 'nested.key': 'value' }),
                expect.any(String),
                'en',
                false,
                25
            );

            // Verify files were saved
            expect(saveJson).toHaveBeenCalled();
        });

        it('should handle deleted keys', async () => {
            getPreviousFileContent.mockReturnValueOnce({
                greeting: 'hello',
                deleted: 'key',
                nested: { key: 'value' }
            });

            await translate.updateTranslations();
            
            // Verify saveJson was called with updated content
            expect(saveJson).toHaveBeenCalled();
        });

        it('should skip translation if no changes detected', async () => {
            loadJson.mockReset();
            getPreviousFileContent.mockReset();

            const mockContent = { greeting: 'hello' };
            loadJson.mockReturnValue(mockContent);
            getPreviousFileContent.mockReturnValue(mockContent);

            await translate.updateTranslations();

            expect(fetchTranslations).not.toHaveBeenCalled();
        });
    });

    describe('applyTranslations', () => {
        it('should correctly apply nested translations', () => {
            const target = {};
            const translations = {
                'a.b.c': 'value1',
                'x.y': 'value2',
                'simple': 'value3'
            };

            translate.applyTranslations(target, translations);

            expect(target).toEqual({
                a: { b: { c: 'value1' } },
                x: { y: 'value2' },
                simple: 'value3'
            });
        });

        it('should handle existing nested structures', () => {
            const target = {
                a: { b: { existing: 'keep' } },
                x: 'preserve'
            };
            const translations = {
                'a.b.c': 'new value',
                'x.y': 'nested value'
            };

            translate.applyTranslations(target, translations);

            expect(target).toEqual({
                a: { b: { existing: 'keep', c: 'new value' } },
                x: { y: 'nested value' }
            });
        });
    });
});
