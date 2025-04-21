const { setupTestEnvironment, translate } = require('./setup');

describe('Key Operations', () => {
    setupTestEnvironment();

    describe('extractNestedKeys', () => {
        it('flattens nested JSON keys', () => {
            const input = { a: { b: { c: 'val' }, d: 'hello' } };
            expect(translate.extractNestedKeys(input)).toEqual({
                'a.b.c': 'val',
                'a.d': 'hello'
            });
        });
    });

    describe('getChangedKeys', () => {
        it('returns keys with updated values', () => {
            const current = { a: '1', b: { c: '2' } };
            const previous = { a: '1', b: { c: 'old' } };
            expect(translate.getChangedKeys(current, previous)).toEqual({ 'b.c': '2' });
        });
    });

    describe('getDeletedKeys', () => {
        it('detects keys removed from current version', () => {
            const current = { a: '1' };
            const previous = { a: '1', b: { c: '2' } };
            expect(translate.getDeletedKeys(current, previous)).toEqual(['b.c']);
        });
    });

    describe('removeKeys', () => {
        it('removes nested keys and cleans up empty parents', () => {
            const obj = { a: { b: { c: 'hello' } }, x: 'preserve' };
            translate.removeKeys(obj, ['a.b.c']);
            expect(obj).toEqual({ x: 'preserve' });
        });
    });

    describe('applyTranslations', () => {
        it('applies flat key translations to nested structure', () => {
            const target = {};
            const translations = { 'a.b.c': 'value', 'd': 'another' };
            translate.applyTranslations(target, translations);
            expect(target).toEqual({ a: { b: { c: 'value' } }, d: 'another' });
        });
    });
});
