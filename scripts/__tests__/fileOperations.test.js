jest.mock('fs');
const fs = require('fs');
const { setupTestEnvironment, translate } = require('./setup');

describe('File Operations', () => {
    setupTestEnvironment();

    beforeEach(() => {
        jest.clearAllMocks();
        fs.readFileSync.mockImplementation((path) => {
            if (path === 'test/test.json') {
                return JSON.stringify({ hello: 'world' });
            }
            if (path === 'test/ca.json') {
                return 'undefined';
            }
            throw new Error('Unexpected file path in test');
        });
    });

    describe('loadJson', () => {
        it('loads valid JSON from file', () => {
            expect(translate.loadJson('test/test.json')).toEqual({ hello: 'world' });
        });

        it('throws on invalid JSON', () => {
            expect(() => translate.loadJson('test/ca.json')).toThrow('Error loading JSON from');
        });
    });

    describe('saveJson', () => {
        it('writes JSON to file', () => {
            const data = { hello: 'world' };
            translate.saveJson('test/output.json', data);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'test/output.json',
                JSON.stringify(data, null, 2),
                'utf8'
            );
        });
    });
});
