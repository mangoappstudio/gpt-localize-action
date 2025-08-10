const { setupTestEnvironment } = require('./setup');
const langchainService = require('../translate/langchain-service');

// Mock the Langchain modules
jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation(() => ({
        invoke: jest.fn()
    }))
}));

jest.mock('@langchain/anthropic', () => ({
    ChatAnthropic: jest.fn().mockImplementation(() => ({
        invoke: jest.fn()
    }))
}));

jest.mock('@langchain/core/messages', () => ({
    HumanMessage: jest.fn().mockImplementation((content) => ({ content })),
    SystemMessage: jest.fn().mockImplementation((content) => ({ content }))
}));

const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');

describe('Langchain Service', () => {
    setupTestEnvironment();

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.AI_PROVIDER;
        delete process.env.AI_MODEL;
        delete process.env.AI_API_KEY;
        delete process.env.OPENAI_API_KEY;
    });

    describe('createChatModel', () => {
        it('creates OpenAI chat model', () => {
            langchainService.createChatModel('openai', 'gpt-4', 'test-key');
            expect(ChatOpenAI).toHaveBeenCalledWith({
                model: 'gpt-4',
                apiKey: 'test-key',
                temperature: 0
            });
        });

        it('creates Anthropic chat model', () => {
            langchainService.createChatModel('anthropic', 'claude-3-haiku-20240307', 'test-key');
            expect(ChatAnthropic).toHaveBeenCalledWith({
                model: 'claude-3-haiku-20240307',
                apiKey: 'test-key',
                temperature: 0
            });
        });

        it('throws error for unsupported provider', () => {
            expect(() => {
                langchainService.createChatModel('unsupported', 'model', 'key');
            }).toThrow('Unsupported AI provider: unsupported');
        });
    });

    describe('createTranslation', () => {
        it('creates translation with OpenAI by default', async () => {
            const mockInvoke = jest.fn().mockResolvedValue({
                content: JSON.stringify({ "Hello": "Bonjour" })
            });
            ChatOpenAI.mockImplementation(() => ({ invoke: mockInvoke }));

            const messages = [
                { role: 'system', content: 'System prompt' },
                { role: 'user', content: 'User message' }
            ];

            const result = await langchainService.createTranslation(
                messages, 
                'openai', 
                'gpt-4', 
                'test-key'
            );

            expect(result).toBe(JSON.stringify({ "Hello": "Bonjour" }));
            expect(mockInvoke).toHaveBeenCalled();
        });

        it('creates translation with Anthropic', async () => {
            const mockInvoke = jest.fn().mockResolvedValue({
                content: JSON.stringify({ "Hello": "Bonjour" })
            });
            ChatAnthropic.mockImplementation(() => ({ invoke: mockInvoke }));

            const messages = [
                { role: 'system', content: 'System prompt' },
                { role: 'user', content: 'User message' }
            ];

            const result = await langchainService.createTranslation(
                messages,
                'anthropic',
                'claude-3-haiku-20240307',
                'test-key'
            );

            expect(result).toBe(JSON.stringify({ "Hello": "Bonjour" }));
            expect(mockInvoke).toHaveBeenCalled();
        });

        it('uses environment variables as fallback', async () => {
            process.env.AI_PROVIDER = 'openai';
            process.env.AI_MODEL = 'gpt-3.5-turbo';
            process.env.AI_API_KEY = 'env-key';

            const mockInvoke = jest.fn().mockResolvedValue({
                content: 'Test response'
            });
            ChatOpenAI.mockImplementation(() => ({ invoke: mockInvoke }));

            const messages = [{ role: 'user', content: 'Test' }];

            await langchainService.createTranslation(messages);

            expect(ChatOpenAI).toHaveBeenCalledWith({
                model: 'gpt-3.5-turbo',
                apiKey: 'env-key',
                temperature: 0
            });
        });

        it('throws error when no API key provided', async () => {
            // Clear all environment variables that could provide an API key
            delete process.env.AI_API_KEY;
            delete process.env.OPENAI_API_KEY;
            
            const messages = [{ role: 'user', content: 'Test' }];

            await expect(langchainService.createTranslation(messages, 'openai', 'gpt-4'))
                .rejects.toThrow('API key required for provider: openai');
        });

        it('throws error when API response is invalid', async () => {
            const mockInvoke = jest.fn().mockResolvedValue({});
            ChatOpenAI.mockImplementation(() => ({ invoke: mockInvoke }));

            const messages = [{ role: 'user', content: 'Test' }];

            await expect(langchainService.createTranslation(messages, 'openai', 'gpt-4', 'test-key'))
                .rejects.toThrow('Invalid API response format');
        });

        it('throws error with provider context on API failure', async () => {
            const mockInvoke = jest.fn().mockRejectedValue(new Error('API Error'));
            ChatOpenAI.mockImplementation(() => ({ invoke: mockInvoke }));

            const messages = [{ role: 'user', content: 'Test' }];

            await expect(langchainService.createTranslation(messages, 'openai', 'gpt-4', 'test-key'))
                .rejects.toThrow('Translation failed with openai/gpt-4: API Error');
        });

        it('throws error for unsupported message role', async () => {
            const messages = [{ role: 'assistant', content: 'Test' }];

            await expect(langchainService.createTranslation(messages, 'openai', 'gpt-4', 'test-key'))
                .rejects.toThrow('Unsupported message role: assistant');
        });
    });
});