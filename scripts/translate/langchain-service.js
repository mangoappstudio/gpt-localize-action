const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

/**
 * Creates a chat model instance based on the provider and model configuration
 * @param {string} provider - AI provider (openai, anthropic)
 * @param {string} model - Model name
 * @param {string} apiKey - API key for the provider
 * @returns {Object} Chat model instance
 */
const createChatModel = (provider, model, apiKey) => {
    switch (provider.toLowerCase()) {
        case 'openai':
            return new ChatOpenAI({
                model: model || 'gpt-4',
                apiKey: apiKey,
                temperature: 0, // For consistent translations
            });
        case 'anthropic':
            return new ChatAnthropic({
                model: model || 'claude-3-haiku-20240307',
                apiKey: apiKey,
                temperature: 0, // For consistent translations
            });
        default:
            throw new Error(`Unsupported AI provider: ${provider}. Supported providers: openai, anthropic`);
    }
};

/**
 * Creates a translation using Langchain with the specified provider and model
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} provider - AI provider (default: 'openai')
 * @param {string} model - Model name
 * @param {string} apiKey - API key for the provider
 * @returns {Promise<string>} Translation response content
 */
const createTranslation = async (messages, provider = 'openai', model = null, apiKey = null) => {
    // Use environment variables as fallback
    const effectiveProvider = provider || process.env.AI_PROVIDER || 'openai';
    const effectiveModel = model || process.env.AI_MODEL || (effectiveProvider === 'openai' ? 'gpt-4' : 'claude-3-haiku-20240307');
    const effectiveApiKey = apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

    if (!effectiveApiKey) {
        throw new Error(`API key required for provider: ${effectiveProvider}`);
    }

    const chatModel = createChatModel(effectiveProvider, effectiveModel, effectiveApiKey);

    // Convert messages to Langchain format
    const langchainMessages = messages.map(msg => {
        if (msg.role === 'system') {
            return new SystemMessage(msg.content);
        } else if (msg.role === 'user') {
            return new HumanMessage(msg.content);
        }
        throw new Error(`Unsupported message role: ${msg.role}`);
    });

    try {
        const response = await chatModel.invoke(langchainMessages);
        
        if (!response?.content) {
            throw new Error('Invalid API response format');
        }

        return response.content;
    } catch (error) {
        // Re-throw with more context
        throw new Error(`Translation failed with ${effectiveProvider}/${effectiveModel}: ${error.message}`);
    }
};

/**
 * Gets available providers and their default models
 * @returns {Object} Object mapping providers to their default models
 */
const getAvailableProviders = () => {
    return {
        openai: {
            defaultModel: 'gpt-4',
            alternativeModels: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview']
        },
        anthropic: {
            defaultModel: 'claude-3-haiku-20240307',
            alternativeModels: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229']
        }
    };
};

module.exports = {
    createTranslation,
    createChatModel,
    getAvailableProviders,
};