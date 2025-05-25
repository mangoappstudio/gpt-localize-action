const fs = require('fs');

const loadJson = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        const msg = `Error loading JSON from ${filePath}: ${error.message}`;
        if (process.env.NODE_ENV === 'test') {
            throw new Error(msg);
        } else {
            console.error(msg);
            process.exit(1);
        }
    }
};

const saveJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = {
    loadJson,
    saveJson
};
