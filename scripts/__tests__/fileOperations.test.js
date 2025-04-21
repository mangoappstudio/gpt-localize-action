const { setupTestEnvironment, translate, fs } = require('./setup');

describe('File Operations', () => {
    setupTestEnvironment();

    describe('loadJson', () => {
        it('loads valid JSON from file', () => {
            fs.readFileSync.mockReturnValue(JSON.stringify({ hello: 'world' }));
            expect(translate.loadJson('test.json')).toEqual({ hello: 'world' });
        });

        it('throws on invalid JSON', () => {
            fs.readFileSync.mockReturnValue('{ invalid json }');
            expect(() => translate.loadJson('test.json')).toThrow('Error loading JSON from');
        });
    });

    describe('saveJson', () => {
        it('writes JSON to file', () => {
            const data = { hello: 'world' };
            translate.saveJson('output.json', data);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'output.json',
                JSON.stringify(data, null, 2),
                'utf8'
            );
        });
    });
});
