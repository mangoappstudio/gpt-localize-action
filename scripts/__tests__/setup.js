const fs = require('fs');
const { execSync } = require('child_process');

// Store original module
const originalTranslate = jest.requireActual('../translate');

// Mock modules BEFORE importing the module that uses them
jest.mock('fs');
jest.mock('child_process');
jest.mock('openai', () => {
    // Create a properly structured mock for OpenAI
    const mockCreate = jest.fn().mockResolvedValue({
        choices: [
            {
                message: {
                    content: '{"hello": "bonjour", "world": "monde"}'
                }
            }
        ]
    });

    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        }))
    };
});

// Import after mocking
const translate = require('../translate');

function setupTestEnvironment() {
    let originalConsoleLog;
    let originalConsoleError;
    
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
        process.env.OPENAI_API_KEY = 'test-api-key';

        originalConsoleLog = console.log;
        originalConsoleError = console.error;

        console.log = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        jest.restoreAllMocks();
    });
}

module.exports = {
    setupTestEnvironment,
    translate,
    originalTranslate,
    fs,
    execSync
};
