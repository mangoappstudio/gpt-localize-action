const { OpenAI } = require('openai');

const createTranslation = async (messages) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
    });

    if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response format');
    }

    return response.choices[0].message.content;
};

module.exports = {
    createTranslation,
};
