const index = require('../translate/index');
const jsonUtils = require('../translate/json-utils');
const translationService = require('../translate/translation-service');

const translate = {
    ...index,
    ...jsonUtils,
    ...translationService
};

function setupTestEnvironment() {
    process.env.OPENAI_API_KEY = 'test-api-key';
}

module.exports = {
    setupTestEnvironment,
    translate,
};
