const { setupTestEnvironment, translate } = require('./setup');

describe('Translation Operations', () => {
    setupTestEnvironment();
    
    // Mock the OpenAI module at the top level
    jest.mock('openai', () => {
        return {
            OpenAI: jest.fn().mockImplementation(() => ({
                chat: {
                    completions: {
                        create: jest.fn().mockResolvedValue({
                            choices: [
                                {
                                    message: {
                                        content: '{"hello": "bonjour", "world": "monde"}'
                                    }
                                }
                            ]
                        })
                    }
                }
            }))
        };
    });

    beforeEach(() => {
        // Reset all mocks before each test to start fresh
        jest.clearAllMocks();
    });

    describe('translateBatch', () => {
        // it('translates a batch of strings successfully', async () => {
        //     // Re-require the OpenAI module to use our mock
        //     const { OpenAI } = require('openai');
            
        //     const result = await translate.translateBatch({ hello: 'hello', world: 'world' }, 'fr', 'prompt');
        //     expect(result).toEqual({ hello: 'bonjour', world: 'monde' });
        // });

        it('handles API errors gracefully', async () => {
            // Get the mocked OpenAI
            const { OpenAI } = require('openai');
            
            // Setup the mock to reject for this test only
            const mockCreate = jest.fn().mockRejectedValueOnce(new Error('API Error'));
            OpenAI.mockImplementationOnce(() => ({
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            }));
            
            const result = await translate.translateBatch({ test: 'test' }, 'fr', 'prompt');
            expect(result).toBeNull();
        });
    });

    // describe('fetchTranslations', () => {
    //     beforeEach(() => {
    //         // Create a fresh mock for translateBatch in each test
    //         jest.spyOn(translate, 'translateBatch').mockImplementation((batch) => {
    //             const result = {};
    //             Object.keys(batch).forEach(key => {
    //                 if (key === 'hello') result[key] = 'bonjour';
    //                 else if (key === 'world') result[key] = 'monde';
    //                 else result[key] = `translated_${key}`;
    //             });
    //             return Promise.resolve(result);
    //         });
    //     });

        // it('processes a small batch in one call', async () => {
        //     const result = await translate.fetchTranslations({ hello: 'hello', world: 'world' }, 'fr');
        //     expect(result).toEqual({ hello: 'bonjour', world: 'monde' });
        // });

        // it('handles large batches by splitting them up', async () => {
        //     const translations = {};
        //     for (let i = 0; i < 150; i++) translations[`key${i}`] = `value${i}`;
        //     translations['hello'] = 'hello';
        //     translations['world'] = 'world';

        //     const result = await translate.fetchTranslations(translations, 'fr');
        //     expect(result).toHaveProperty('hello', 'bonjour');
        //     expect(result).toHaveProperty('world', 'monde');
        // });

        // it('returns null when all batches fail', async () => {
        //     jest.spyOn(translate, 'translateBatch').mockResolvedValue(null);
        //     const result = await translate.fetchTranslations({ test: 'test' }, 'fr');
        //     expect(result).toBeNull();
        // });
    // });
});
