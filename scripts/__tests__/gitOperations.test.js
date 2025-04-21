const { setupTestEnvironment, translate, originalTranslate, execSync } = require('./setup');

describe('Git Operations', () => {
    setupTestEnvironment();

    describe('getPreviousFileContent', () => {
        it('returns previous file JSON from git', () => {
            execSync
                .mockReturnValueOnce('blob sha') // git ls-tree
                .mockReturnValueOnce(JSON.stringify({ greeting: 'hello' })); // git show
            expect(translate.getPreviousFileContent('some.json')).toEqual({ greeting: 'hello' });
        });

        it('handles missing file in git history', () => {
            execSync.mockReturnValueOnce('').mockReturnValueOnce('');
            expect(translate.getPreviousFileContent('nonexistent.json')).toEqual({});
        });

        it('throws error in test environment when git command fails', () => {
            // Force the real function to be used with a failing execSync
            execSync.mockImplementation(() => {
                throw new Error('Git error');
            });

            // Need to use the unmocked function to test error throwing
            const originalFunction = originalTranslate.getPreviousFileContent;
            // Restore the original function
            originalFunction('some.json');
            expect(() => originalFunction('some.json')).toThrow('Error retrieving previous version');
        });
    });
});
