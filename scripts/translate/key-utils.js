// Helper to extract nested keys
const extractNestedKeys = (obj, prefix = '') => {
    const keys = {};
    for (const key in obj) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
            Object.assign(keys, extractNestedKeys(value, fullKey));
        } else {
            keys[fullKey] = value;
        }
    }
    return keys;
};

// Helper to detect changed keys
const getChangedKeys = (currentJson, previousJson) => {
    const currentKeys = extractNestedKeys(currentJson);
    const previousKeys = extractNestedKeys(previousJson);

    const changedKeys = {};
    for (const key in currentKeys) {
        if (key in previousKeys && currentKeys[key] !== previousKeys[key]) {
            changedKeys[key] = currentKeys[key];
        }
    }
    return changedKeys;
};

// Helper to detect deleted keys
const getDeletedKeys = (currentJson, previousJson) => {
    const currentKeys = extractNestedKeys(currentJson);
    const previousKeys = extractNestedKeys(previousJson);

    const deletedKeys = [];
    for (const key in previousKeys) {
        if (!(key in currentKeys)) {
            deletedKeys.push(key);
        }
    }
    return deletedKeys;
};

// Helper to remove keys from an object
const removeKeys = (obj, keysToRemove) => {
    for (const key of keysToRemove) {
        const parts = key.split('.');
        let current = obj;
        let parent = null;
        let parentKey = null;

        // Navigate to the deepest level
        for (let i = 0; i < parts.length - 1; i++) {
            parent = current;
            parentKey = parts[i];
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
                break;
            }
            current = current[parts[i]];
        }

        // Delete the target key
        const lastKey = parts[parts.length - 1];
        if (current && current[lastKey] !== undefined) {
            delete current[lastKey];
        }

        // Clean up empty parent objects
        for (let i = parts.length - 2; i >= 0; i--) {
            let temp = obj;
            for (let j = 0; j <= i; j++) {
                if (!temp || !temp[parts[j]]) {
                    break;
                }
                temp = temp[parts[j]];
            }
            
            if (temp && typeof temp === 'object' && Object.keys(temp).length === 0) {
                let parentTemp = obj;
                for (let j = 0; j < i; j++) {
                    parentTemp = parentTemp[parts[j]];
                }
                delete parentTemp[parts[i]];
            }
        }
    }
    return obj;
};

module.exports = {
    extractNestedKeys,
    getChangedKeys,
    getDeletedKeys,
    removeKeys
};
