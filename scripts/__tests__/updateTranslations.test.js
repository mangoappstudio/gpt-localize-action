const { setupTestEnvironment, translate, fs } = require('./setup');

describe('Update Translations', () => {
    setupTestEnvironment();
    
    let saveJsonMock;
    let fetchTranslationsMock;

    beforeEach(() => {
        // Mock file system operations
        fs.readdirSync.mockReturnValue(['en.json', 'fr.json', 'es.json']);

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.endsWith('en.json')) return JSON.stringify({ greeting: 'hello', new: 'content' });
            if (filePath.endsWith('fr.json')) return JSON.stringify({ greeting: 'bonjour' });
            if (filePath.endsWith('es.json')) return JSON.stringify({ greeting: 'hola' });
            return '{}';
        });

        // Mock all required functions to avoid git interactions
        jest.spyOn(translate, 'getPreviousFileContent')
            .mockReturnValue({ greeting: 'hello', old: 'removed' });
        
        jest.spyOn(translate, 'getChangedKeys')
            .mockReturnValue({ new: 'content' });
        
        saveJsonMock = jest.spyOn(translate, 'saveJson')
            .mockImplementation(() => {});
        
        fetchTranslationsMock = jest.spyOn(translate, 'fetchTranslations');
    });

    // it('updates translations for multiple language files', async () => {
    //     // Mock successful translation
    //     fetchTranslationsMock.mockResolvedValue({ new: 'traducido' });

    //     await translate.updateTranslations();

    //     expect(saveJsonMock).toHaveBeenCalled();
        
    //     // Verify correct files were updated
    //     const calls = saveJsonMock.mock.calls.filter(
    //         ([file]) => file.includes('fr.json') || file.includes('es.json')
    //     );
    //     expect(calls.length).toBeGreaterThan(0);
    // });

    it('handles the case when no changes are detected', async () => {
        // Override to simulate no changes
        jest.spyOn(translate, 'getChangedKeys').mockReturnValue({});

        await translate.updateTranslations();

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No changes detected'));
    });

    // it('handles the case when API translation fails', async () => {
    //     // Mock a failed translation
    //     fetchTranslationsMock.mockResolvedValue(null);

    //     await translate.updateTranslations();

    //     expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch translations'));
    // });
});
