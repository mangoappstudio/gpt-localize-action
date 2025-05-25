jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

const { execSync } = require('child_process');
const gitUtils = require('../translate/git-utils');

describe('Git Operations', () => {
    beforeEach(() => {
        execSync.mockClear();
        process.env.NODE_ENV = 'test';
    });

    describe('getPreviousFileContent', () => {
        it('returns previous file JSON from git', () => {
            execSync
                .mockReturnValueOnce('blob sha') // git ls-tree
                .mockReturnValueOnce(JSON.stringify({ greeting: 'hello' })); // git show
            expect(gitUtils.getPreviousFileContent('some.json')).toEqual({ greeting: 'hello' });
        });

        it('handles missing file in git history', () => {
            execSync.mockReturnValueOnce('').mockReturnValueOnce('');
            expect(gitUtils.getPreviousFileContent('nonexistent.json')).toEqual({});
        });

        it('throws error in test environment when git command fails', () => {
            execSync.mockReset();
            execSync.mockImplementation(() => {
                throw new Error('Git error');
            });

            expect(() => gitUtils.getPreviousFileContent('some.json'))
                .toThrow(`Error retrieving previous version of some.json: Git error`);
        });
    });
});
