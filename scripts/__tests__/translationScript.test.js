const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const {
    loadJson,
    saveJson,
    extractNestedKeys,
    getPreviousFileContent,
    getChangedKeys,
    getDeletedKeys,
    removeKeys,
    applyTranslations,
} = require('../translate'); // adjust the path

jest.mock('fs');
jest.mock('child_process');

describe('Translation Script Helpers', () => {

    beforeEach(() => {
        jest.clearAllMocks();     // Clears call history
        jest.resetModules();      // Optional: resets imported modules
      });
      
      afterEach(() => {
        jest.restoreAllMocks();   // Restores native implementations
      });
      
    describe('loadJson', () => {
        it('loads valid JSON from file', () => {
            fs.readFileSync.mockReturnValue(JSON.stringify({ hello: 'world' }));
            expect(loadJson('test.json')).toEqual({ hello: 'world' });
        });

        it('throws on invalid JSON', () => {
            fs.readFileSync.mockReturnValue('{ invalid json }');
            process.env.NODE_ENV = 'test';

            expect(() => loadJson('test.json')).toThrow('Error loading JSON from');
        });
    });

    describe('saveJson', () => {
        it('writes JSON to file', () => {
            const data = { hello: 'world' };
            saveJson('output.json', data);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'output.json',
                JSON.stringify(data, null, 2),
                'utf8'
            );
        });
    });

    describe('extractNestedKeys', () => {
        it('flattens nested JSON keys', () => {
            const input = {
                a: {
                    b: {
                        c: 'val'
                    },
                    d: 'hello'
                }
            };
            expect(extractNestedKeys(input)).toEqual({
                'a.b.c': 'val',
                'a.d': 'hello'
            });
        });
    });

    describe('getPreviousFileContent', () => {
        it('returns previous file JSON from git', () => {
            execSync
                .mockReturnValueOnce('blob sha') // git ls-tree
                .mockReturnValueOnce(JSON.stringify({ greeting: 'hello' })); // git show

            const result = getPreviousFileContent('some.json');
            expect(result).toEqual({ greeting: 'hello' });
        });

        it('handles missing file in git history', () => {
            execSync.mockReturnValueOnce('').mockReturnValueOnce('');
            console.log = jest.fn();
            const result = getPreviousFileContent('nonexistent.json');
            expect(result).toEqual({});
        });
    });

    describe('getChangedKeys', () => {
        it('returns keys with updated values', () => {
            const current = { a: '1', b: { c: '2' } };
            const previous = { a: '1', b: { c: 'old' } };

            expect(getChangedKeys(current, previous)).toEqual({ 'b.c': '2' });
        });
    });

    describe('getDeletedKeys', () => {
        it('detects keys removed from current version', () => {
            const current = { a: '1' };
            const previous = { a: '1', b: { c: '2' } };

            expect(getDeletedKeys(current, previous)).toEqual(['b.c']);
        });
    });

    describe('removeKeys', () => {
        it('removes nested keys and cleans up empty parents', () => {
            const obj = {
                a: {
                    b: {
                        c: 'hello'
                    }
                },
                x: 'preserve'
            };
            removeKeys(obj, ['a.b.c']);
            expect(obj).toEqual({ x: 'preserve' });
        });
    });

    describe('applyTranslations', () => {
        it('applies flat key translations to nested structure', () => {
            const target = {};
            const translations = {
                'a.b.c': 'value',
                'd': 'another'
            };

            applyTranslations(target, translations);
            expect(target).toEqual({
                a: { b: { c: 'value' } },
                d: 'another'
            });
        });
    });
});
