# GPT Localize Action Development Instructions

**ALWAYS follow these instructions first.** Only fall back to additional search and context gathering if the information in these instructions is incomplete or found to be in error.

GPT Localize Action is a Node.js GitHub Action that automatically updates translation files using AI (OpenAI GPT-4 or Anthropic Claude). It detects changes in a base translation file (typically `en.json`) and translates new or modified keys to other language files using AI APIs.

## Working Effectively

### Bootstrap and Setup
- **Install dependencies:** `yarn install --frozen-lockfile` - takes 38 seconds first time, <1 second if already installed. **NEVER CANCEL.** Set timeout to 120+ seconds.
- **Node.js version:** Requires Node.js 22+ (as specified in GitHub workflows)
- **Package manager:** Uses Yarn with lockfile for consistent dependencies

### Testing
- **Run all tests:** `yarn test` - takes 1.7 seconds. **NEVER CANCEL.** Set timeout to 60+ seconds.
- **Run with coverage:** `yarn test:coverage` - takes 1.7 seconds. **NEVER CANCEL.** Set timeout to 60+ seconds.  
- **Development mode:** `yarn test:watch` - starts interactive watch mode for TDD
- **Test suites:** 6 test suites with 33 tests total, 95%+ code coverage expected

### Running the Translation Script
- **Test mode (recommended for development):** `node scripts/translate/index.js -d test -s en -f en.json -t`
- **Default parameters:** `yarn start` (will fail without proper locale structure)
- **Custom directory:** `node scripts/translate/index.js -d [directory] -s [source_lang] -f [source_file] -t`
- **Requires git repository:** Script uses git to detect changes between commits

### Key Parameters
- `-d` or `--dir`: Directory containing locale files (default: locales)
- `-s` or `--sourceLanguage`: Source language code (default: en)  
- `-f` or `--sourceFile`: Source language file name (default: en.json)
- `-t` or `--test`: Run in test mode with dummy translations (no API calls)

## Validation

### Always Test These Scenarios After Changes
1. **Basic functionality:** Run `node scripts/translate/index.js -d test -s en -f en.json -t` and verify it completes without errors
2. **Test suite:** Run `yarn test` and ensure all 33 tests pass with 95%+ coverage
3. **Git change detection:** In a test directory with git history, modify a JSON key and verify the script detects changes
4. **Batch processing:** Verify translation batching works with large numbers of keys (default batch size: 25)
5. **Error handling:** Test with invalid JSON files and missing directories

### Manual Testing Workflow
```bash
# Create test scenario
mkdir -p /tmp/localize_test && cd /tmp/localize_test
git init && git config user.email "test@test.com" && git config user.name "Test"

# Create initial locale files  
mkdir locales
echo '{"hello": "Hello", "world": "World"}' > locales/en.json
echo '{"hello": "Bonjour", "world": "Monde"}' > locales/fr.json
git add . && git commit -m "initial"

# Add new key and test (requires second commit for change detection)
echo '{"hello": "Hello", "world": "World", "new": "New key"}' > locales/en.json
git add . && git commit -m "add new key"
node /path/to/repo/scripts/translate/index.js -d locales -s en -f en.json -t

# Verify fr.json now contains: "new": "[TEST] New key"
```

## Core Architecture

### Main Components
- **`scripts/translate/index.js`** - Main orchestrator, handles CLI args and workflow
- **`scripts/translate/translation-service.js`** - Manages AI API calls and batching  
- **`scripts/translate/langchain-service.js`** - AI provider abstraction (OpenAI/Anthropic)
- **`scripts/translate/json-utils.js`** - JSON file operations
- **`scripts/translate/git-utils.js`** - Git operations for change detection
- **`scripts/translate/key-utils.js`** - Nested JSON key manipulation

### GitHub Action Integration  
- **`action.yml`** - Composite action definition
- **Two modes:** Create pull requests (default) or direct commits
- **Inputs:** API keys, locale paths, languages, AI provider selection
- **Uses:** Node.js 22, Yarn for dependencies, peter-evans/create-pull-request

## Common Tasks

### Development Commands
```bash
# Install dependencies (38s first time, <1s if already installed)
yarn install --frozen-lockfile

# Run tests (1.7s) 
yarn test

# Run with coverage (1.7s)
yarn test:coverage  

# Watch mode for TDD
yarn test:watch

# Test translation script (0.3s)
node scripts/translate/index.js -d test -s en -f en.json -t
```

### Repository Structure
```
.
├── .github/
│   └── workflows/test.yml        # CI pipeline
├── scripts/
│   ├── __tests__/               # Test files (6 test suites)
│   └── translate/               # Core translation logic
├── test/                        # Sample locale files for testing
├── action.yml                   # GitHub Action definition
├── jest.config.js              # Jest configuration
├── package.json                # Dependencies and scripts
└── yarn.lock                   # Dependency lock file
```

### Key Files Content

**package.json scripts:**
```json
{
  "start": "node scripts/translate/index.js",
  "test": "jest", 
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Test directory structure:**
- `test/en.json` - English source file
- `test/fr.json` - French translation file  
- `test/test.json`, `test/output.json` - Additional test files

## Important Development Notes

### Git Dependencies
- **Requires git repository:** Script fails without git history for change detection
- **Needs previous commit:** Uses `git ls-tree -r HEAD^ -- [file]` to detect changes
- **Minimum commits:** Need at least 2 commits for change detection to work

### AI Provider Support
- **OpenAI:** GPT-4 (default), GPT-3.5-turbo, GPT-4-turbo-preview
- **Anthropic:** Claude-3-haiku (default), Claude-3-sonnet, Claude-3-opus
- **Test mode:** Use `-t` flag to avoid API calls during development

### Error Handling
- **Missing files:** Script exits with error code 1 for missing JSON files
- **Invalid JSON:** Proper error messages for malformed JSON
- **API failures:** Graceful handling of AI API errors in test mode

### Performance Characteristics  
- **Batch size:** Default 25 keys per API request
- **Sequential processing:** Processes one language file at a time
- **Memory usage:** Loads entire JSON files into memory
- **Git operations:** Fast, uses native git commands for change detection

## Pre-commit Validation
Always run these commands before committing changes:
1. `yarn test` - Ensure all tests pass
2. `yarn test:coverage` - Verify coverage thresholds met
3. Test translation script in test mode to verify core functionality works
4. Manually test any modified functionality using the validation scenarios above

The CI pipeline (.github/workflows/test.yml) will run `yarn test` on push/PR, so ensure tests pass locally first.