const { execSync } = require('child_process');

const getPreviousFileContent = (filePath) => {
    try {
        const existsInPreviousCommit = execSync(`git ls-tree -r HEAD^ -- ${filePath}`, { encoding: 'utf8' });
        if (!existsInPreviousCommit || !existsInPreviousCommit.trim()) {
            return {};
        }

        const previousContent = execSync(`git show HEAD^:${filePath}`, { encoding: 'utf8' });
        return JSON.parse(previousContent);
    } catch (error) {
        const msg = `Error retrieving previous version of ${filePath}: ${error.message}`;
        if (process.env.NODE_ENV === 'test') {
            throw new Error(msg);
        }
        console.error(msg);
        process.exit(1);
    }
};

module.exports = {
    getPreviousFileContent
};
