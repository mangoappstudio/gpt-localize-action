const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('child_process');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

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

// Setup environment
process.argv = ['node', 'script.js', 'locales', 'en', 'en.json'];

describe('updateTranslations', () => {
    let mockFiles = {};
    let script;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock files
        mockFiles = {
            'locales/en.json': JSON.stringify({
                greeting: 'Hello',
                farewell: 'Goodbye',
                nested: {
                    message: 'Welcome'
                }
            }),
            'locales/es.json': JSON.stringify({
                greeting: 'Hola',
                // farewell is missing
                nested: {
                    message: 'Bienvenido'
                }
            }),
            'locales/fr.json': JSON.stringify({
                greeting: 'Bonjour',
                farewell: 'Au revoir',
                // nested.message is outdated
                nested: {
                    message: 'Old welcome'
                }
            })
        };

        // Mock file system operations
        fs.readFileSync = jest.fn((filePath) => {
            if (mockFiles[filePath]) {
                return mockFiles[filePath];
            }
            throw new Error(`File not found: ${filePath}`);
        });

        fs.writeFileSync = jest.fn((filePath, data) => {
            mockFiles[filePath] = data;
        });

        fs.readdirSync = jest.fn(() => ['en.json', 'es.json', 'fr.json']);

        path.join = jest.fn((dir, file) => `${dir}/${file}`);
        path.resolve = jest.fn((dir) => dir);

        // Mock git operations to return the previous version
        execSync.mockImplementation((cmd) => {
            if (cmd.includes('git ls-tree')) {
                return 'mock-hash';
            }
            if (cmd.includes('git show')) {
                if (cmd.includes('en.json')) {
                    return JSON.stringify({
                        greeting: 'Hello',
                        farewell: 'Old Goodbye',
                        removed: 'This will be gone',
                        nested: {
                            message: 'Old Welcome'
                        }
                    });
                }
            }
            return '';
        });

        // Import module after setting up mocks
        jest.resetModules();
        script = require('../scripts/translate/index.js');
    });

    it('should update translations for missing and changed keys', async () => {
        // Run the update process
        await script.updateTranslations();

        // Verify Spanish file was updated with missing farewell key
        const esJson = JSON.parse(mockFiles['locales/es.json']);
        expect(esJson.farewell).toBe('Adiós');

        // Verify French file was updated with the changed nested.message
        const frJson = JSON.parse(mockFiles['locales/fr.json']);
        expect(frJson.nested.message).toBe('Bienvenue');

        // Verify removed keys are gone
        expect(esJson.removed).toBeUndefined();
        expect(frJson.removed).toBeUndefined();
    });

    it('should handle files with no changes needed', async () => {
        // Set up a file that doesn't need any changes
        mockFiles['locales/complete.json'] = JSON.stringify({
            greeting: 'Hallo',
            farewell: 'Tschüss',
            nested: {
                message: 'Willkommen'
            }
        });

        fs.readdirSync = jest.fn(() => ['en.json', 'complete.json']);

        // Run the update process
        await script.updateTranslations();

        // Verify the OpenAI API was not called for the complete file
        const { OpenAI } = require('openai');
        const mockOpenAIInstance = OpenAI.mock.results[0].value;
        expect(mockOpenAIInstance.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
        // Mock API error
        const { OpenAI } = require('openai');
        const mockOpenAIInstance = OpenAI.mock.results[0].value;
        mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(new Error('API Error'));

        // Run the update process (should not throw)
        await expect(script.updateTranslations()).resolves.not.toThrow();

        // Files should still be saved, just without the translations
        expect(fs.writeFileSync).toHaveBeenCalled();
    });
});
