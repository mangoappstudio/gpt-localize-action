# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

GPT Localize Action is a GitHub Action that automatically updates translation files using GPT-4. It detects changes in a base translation file (typically `en.json`) and translates new or modified keys to other language files using OpenAI's API.

## Common Commands

### Running the Translation Script Locally
```bash
node scripts/translate/index.js -d test -s en -f en.json -t
```
- `-d`: Directory containing locale files (default: locales)
- `-s`: Source language code (default: en) 
- `-f`: Source language file name (default: en.json)
- `-t`: Run in test mode (uses dummy translations)

### Testing
```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

### Development
```bash
npm start                  # Runs the translation script with default parameters
```

## Architecture

### Core Components

**Main Entry Point (`scripts/translate/index.js`)**
- Orchestrates the translation workflow
- Handles command-line argument parsing
- Compares current vs previous translation files to detect changes
- Processes translation batches with a default size of 25 keys

**Translation Service (`scripts/translate/translation-service.js`)**
- Manages API calls to OpenAI for translations
- Handles batching of translation requests
- Provides test mode with dummy translations
- Contains system prompts for consistent translation quality

**Utility Modules**
- `json-utils.js`: JSON file loading and saving operations
- `git-utils.js`: Git operations for detecting file changes
- `key-utils.js`: Nested JSON key extraction and manipulation
- `openai.js`: OpenAI API client wrapper

### Translation Workflow

1. **Change Detection**: Compares current base file with previous git version
2. **Key Analysis**: Identifies changed, missing, and deleted keys
3. **Batch Processing**: Translates keys in configurable batches (default: 25)
4. **File Updates**: Applies translations and removes deleted keys
5. **Persistence**: Saves updated translation files

### GitHub Action Integration

The action (`action.yml`) runs as a composite action that:
- Checks out the repository and action code
- Installs Node.js dependencies with Yarn
- Executes the translation script
- Handles changes via configurable behavior:
  - **Pull Request Mode** (default): Creates PRs using `peter-evans/create-pull-request`
  - **Direct Commit Mode**: Commits directly to the current branch

**Input Parameters:**
- `create_pull_request`: Controls commit behavior (default: "true")
  - "true": Creates pull request against current branch
  - "false": Commits directly to current branch (requires push permissions)

## Test Configuration

Jest is configured with:
- Node.js test environment
- Coverage collection from `scripts/**/*.js` (excluding openai.js and test files)
- Coverage thresholds: 80% for functions/lines/statements, 60% for branches
- Test files in `scripts/**/__tests__/**/*.test.js`

## Important Notes

- The system preserves interpolation variables in double curly braces (e.g., `{{name}}`)
- OpenAI API key must be provided via environment variable `OPENAI_API_KEY`
- Translation responses are expected to be valid JSON only
- Deleted keys are automatically removed from all target language files