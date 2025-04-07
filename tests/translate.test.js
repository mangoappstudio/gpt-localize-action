const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
// Mock OpenAI with a constructor function that returns the expected methods
jest.mock('openai', () => {
    const mockOpenAI = jest.fn().mockImplementation((options) => {
        // We don't need to validate options here, just accept them
        return {
            chat: {
                completions: {
                    create: jest.fn().mockImplementation(({ messages }) => {
                        // Extract the JSON from the user message
                        const userMessage = messages.find(m => m.role === 'user').content;
                        const keysToTranslate = JSON.parse(userMessage);

                        // Create translated responses
                        const translations = {};
                        Object.keys(keysToTranslate).forEach(key => {
                            const value = keysToTranslate[key];
                            if (key === 'farewell') {
                                translations[key] = key === 'farewell' ? 'Adiós' : value;
                            } else if (key === 'nested.message') {
                                translations[key] = 'Bienvenue';
                            }
                        });

                        return Promise.resolve({
                            choices: [
                                {
                                    message: {
                                        content: JSON.stringify(translations)
                                    }
                                }
                            ]
                        });
                    })
                }
            }
        };
    });

    // Set environment variable to prevent the constructor from failing
    process.env.OPENAI_API_KEY = 'mock-api-key';

    return {
        OpenAI: mockOpenAI
    };
});
jest.mock('child_process');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Import the module after mocking dependencies
const originalProcessExit = process.exit;
process.exit = jest.fn();

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    // Restore fs.readFileSync and fs.writeFileSync to use our custom mocks
    fs.readFileSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.readdirSync = jest.fn();
    path.join = jest.fn((dir, file) => `${dir}/${file}`);
    path.resolve = jest.fn(dir => dir);
    execSync.mockImplementation(() => '{}');
});

afterAll(() => {
    process.exit = originalProcessExit;
});

// Mock the OpenAI response
const mockOpenAIResponse = (translations) => {
    const mockResponse = {
        choices: [
            {
                message: {
                    content: JSON.stringify(translations)
                }
            }
        ]
    };

    OpenAI.prototype.chat = {
        completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
        }
    };
};

describe('Helper functions', () => {
    // Import the module functions now (after mocking)
    const script = require('../scripts/translate/index.js');

    describe('loadJson', () => {
        it('should load and parse JSON file', () => {
            const testJson = { key: 'value' };
            fs.readFileSync.mockReturnValue(JSON.stringify(testJson));

            const result = script.loadJson('test.json');

            expect(fs.readFileSync).toHaveBeenCalledWith('test.json', 'utf8');
            expect(result).toEqual(testJson);
        });

        it('should exit process on error', () => {
            fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

            script.loadJson('nonexistent.json');

            expect(process.exit).toHaveBeenCalledWith(1);
        });
    });

    describe('saveJson', () => {
        it('should stringify and save JSON data', () => {
            const testData = { key: 'value' };

            script.saveJson('output.json', testData);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'output.json',
                JSON.stringify(testData, null, 2),
                'utf8'
            );
        });
    });

    describe('extractNestedKeys', () => {
        it('should extract keys from a flat object', () => {
            const obj = { a: 1, b: 2 };

            const result = script.extractNestedKeys(obj);

            expect(result).toEqual({ a: 1, b: 2 });
        });

        it('should extract keys from a nested object', () => {
            const obj = {
                a: 1,
                b: {
                    c: 2,
                    d: {
                        e: 3
                    }
                }
            };

            const result = script.extractNestedKeys(obj);

            expect(result).toEqual({
                'a': 1,
                'b.c': 2,
                'b.d.e': 3
            });
        });
    });

    describe('applyTranslations', () => {
        it('should apply translations to a target object', () => {
            const target = { existing: 'value' };
            const translations = { 'new': 'value', 'nested.key': 'nested value' };

            script.applyTranslations(target, translations);

            expect(target).toEqual({
                existing: 'value',
                new: 'value',
                nested: {
                    key: 'nested value'
                }
            });
        });

        it('should handle nested keys with existing structure', () => {
            const target = {
                existing: 'value',
                nested: {
                    existing: 'old value'
                }
            };
            const translations = { 'nested.existing': 'new value', 'nested.new': 'brand new' };

            script.applyTranslations(target, translations);

            expect(target).toEqual({
                existing: 'value',
                nested: {
                    existing: 'new value',
                    new: 'brand new'
                }
            });
        });
    });

    describe('removeKeys', () => {
        it('should remove keys from a flat object', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const keysToRemove = ['a', 'c'];

            script.removeKeys(obj, keysToRemove);

            expect(obj).toEqual({ b: 2 });
        });

        it('should remove nested keys and cleanup empty objects', () => {
            const obj = {
                a: 1,
                b: {
                    c: 2,
                    d: 3
                },
                e: {
                    f: {
                        g: 4
                    }
                }
            };
            const keysToRemove = ['b.c', 'e.f.g'];

            script.removeKeys(obj, keysToRemove);

            // b.d should remain, but e.f and e should be removed as they're empty
            expect(obj).toEqual({
                a: 1,
                b: {
                    d: 3
                }
            });
        });
    });
});

describe('Translation process', () => {
    const script = require('../scripts/translate/index.js');

    describe('fetchTranslations', () => {
        it('should fetch translations without batching for small inputs', async () => {
            const translations = { 'hello': 'Hello world', 'goodbye': 'Goodbye world' };
            const expectedTranslations = { 'hello': 'Hola mundo', 'goodbye': 'Adiós mundo' };

            mockOpenAIResponse(expectedTranslations);

            const result = await script.fetchTranslations(translations, 'es');

            expect(result).toEqual(expectedTranslations);
            expect(OpenAI.prototype.chat.completions.create).toHaveBeenCalledTimes(1);
        });

        it('should batch translations for large inputs', async () => {
            // Create a large translation object
            const translations = {};
            const expectedTranslations = {};

            // Create 120 keys (more than TRANSLATION_BATCH_SIZE)
            for (let i = 1; i <= 120; i++) {
                translations[`key${i}`] = `Value ${i}`;
                expectedTranslations[`key${i}`] = `Valor ${i}`;
            }

            // First batch returns first 100 translations
            const firstBatchResult = {};
            for (let i = 1; i <= 100; i++) {
                firstBatchResult[`key${i}`] = `Valor ${i}`;
            }

            // Second batch returns remaining 20 translations
            const secondBatchResult = {};
            for (let i = 101; i <= 120; i++) {
                secondBatchResult[`key${i}`] = `Valor ${i}`;
            }

            // Setup mock to return different responses for each call
            const createMock = jest.fn()
                .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(firstBatchResult) } }] })
                .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(secondBatchResult) } }] });

            OpenAI.prototype.chat = {
                completions: {
                    create: createMock
                }
            };

            const result = await script.fetchTranslations(translations, 'es');

            expect(result).toEqual(expectedTranslations);
            expect(createMock).toHaveBeenCalledTimes(2);
        });

        it('should handle API errors gracefully', async () => {
            const translations = { 'hello': 'Hello world' };

            // Mock API error
            OpenAI.prototype.chat = {
                completions: {
                    create: jest.fn().mockRejectedValue(new Error('API Error'))
                }
            };

            const result = await script.fetchTranslations(translations, 'es');

            expect(result).toBeNull();
        });
    });

    describe('getChangedKeys', () => {
        it('should detect changed keys between two versions', () => {
            const current = { a: 1, b: 2, c: { d: 3 } };
            const previous = { a: 1, b: 5, c: { d: 6 } };

            const result = script.getChangedKeys(current, previous);

            expect(result).toEqual({ 'b': 2, 'c.d': 3 });
        });
    });

    describe('getDeletedKeys', () => {
        it('should detect deleted keys between two versions', () => {
            const current = { a: 1 };
            const previous = { a: 1, b: 2, c: { d: 3 } };

            const result = script.getDeletedKeys(current, previous);

            expect(result).toContain('b');
            expect(result).toContain('c.d');
        });
    });
});
