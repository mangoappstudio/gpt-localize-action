# GPT Localize Action

Using AI-powered translation, you can easily keep your translation files up-to-date and in sync with the latest English source strings. This action automatically detects changed or missing keys in your `en.json` source file, requests translations for multiple target languages, and updates your repository with the new localized content—no manual translation management required.

**✨ New in v3.0: Multi-Provider AI Support**  
Now supports multiple AI providers including OpenAI and Anthropic through Langchain integration, giving you flexibility in choosing your preferred AI service.

## Key Features

- **Automated Key Detection:** Identifies newly added or changed keys in your `en.json` file, ensuring all locale files remain accurate and current.  
- **Missing Key Recovery:** This program finds and populates any keys missing from your other language files that may have previously gone unsynchronized.  
- **Multi-Provider AI Translation:** Choose from OpenAI (GPT-4, GPT-3.5-turbo) or Anthropic (Claude 3) models through unified Langchain interface.  
- **Seamless Integration:** It easily incorporates into existing CI/CD pipelines with minimal configuration. The action can run on schedules, on-demand via workflow dispatch, or on any branch.  
- **Flexible Integration:** Choose between automated pull requests for review or direct commits for immediate updates, adapting to your team's workflow preferences.
- **Dynamic Branch Support:** Automatically works with any branch - pull requests are created against the current working branch, not hardcoded to main.

## Usage

### Basic Setup (OpenAI)

1. **Setup OpenAI & GitHub Secrets:**  
   Store your OpenAI API key (`OPENAI_API_KEY`) and a Personal Access Token (`PERSONAL_ACCESS_TOKEN`) as GitHub Secrets.

2. **Configure Your Workflow:**  
   Add the action to your workflow file, specifying the `locales_path` where your base translation and target language files reside.

   ```yaml
   name: Update Translations
   on:
     workflow_dispatch:
     schedule:
       - cron: '0 0 * * 0'
     push:
       branches:
         - main
   jobs:
     update-translations:
       runs-on: ubuntu-latest
       steps:
         - name: Use GPT Localize Action
           uses: mangoappstudio/gpt-localize-action@v3.0.0
           with:
             openai_api_key: ${{ secrets.OPENAI_API_KEY }}
             personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
             locales_path: "./path/to/locales" # Optional, default is "./locales"
             base_language: "en" # Optional, default is "en"
             base_file: "en.json" # Optional, default is "en.json"
             create_pull_request: "true" # Optional, default is "true"
   ```

### Multi-Provider Setup (New!)

You can now use different AI providers beyond OpenAI:

**Using Anthropic Claude:**
```yaml
- name: Use GPT Localize Action with Claude
  uses: mangoappstudio/gpt-localize-action@v3.0.0
  with:
    ai_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    ai_provider: "anthropic"
    ai_model: "claude-3-haiku-20240307" # Optional, uses default if not specified
    personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
    locales_path: "./locales"
```

**Using OpenAI with specific model:**
```yaml
- name: Use GPT Localize Action with GPT-3.5
  uses: mangoappstudio/gpt-localize-action@v3.0.0
  with:
    ai_api_key: ${{ secrets.OPENAI_API_KEY }}
    ai_provider: "openai"
    ai_model: "gpt-3.5-turbo"
    personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
    locales_path: "./locales"
```

### Input Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `openai_api_key` | OpenAI API key (deprecated, use `ai_api_key`) | No* | - |
| `ai_api_key` | API key for the AI provider | No* | - |
| `ai_provider` | AI provider (`openai`, `anthropic`) | No | `openai` |
| `ai_model` | Specific model to use | No | Provider default |
| `personal_access_token` | GitHub Personal Access Token | Yes | - |
| `locales_path` | Path to locales directory | Yes | `./locales` |
| `base_language` | Base language code | No | `en` |
| `base_file` | Base translation file name | No | `en.json` |
| `create_pull_request` | Create PR vs direct commit | No | `true` |

*Either `openai_api_key` or `ai_api_key` is required.

### Supported Providers & Models

**OpenAI:**
- `gpt-4` (default)
- `gpt-3.5-turbo`
- `gpt-4-turbo-preview`

**Anthropic:**
- `claude-3-haiku-20240307` (default, fastest)
- `claude-3-sonnet-20240229` (balanced)
- `claude-3-opus-20240229` (most capable)

3. **Review & Merge:**  
   By default, the action creates a pull request with updated translations against the current branch. You can review and merge these changes to keep your app's translations fresh and consistent.
   
   **Alternative: Direct Commits**  
   Set `create_pull_request: "false"` to commit translation updates directly to the current branch (requires appropriate repository permissions).

## Why GPT Localize Action?

- **Save Time & Costs:** Automate the translation process, freeing developers and content editors from manual updates.  
- **Stay In Sync:** Never miss a key again—any changes in your primary language will ripple through all localized files.  
- **Production-Ready AI Translation:** Utilize GPT-4’s advanced language capabilities for more natural, context-aware translations.

Adopt the GPT Localize Action to streamline your localization workflow, reduce overhead, and ensure that your users worldwide enjoy a fully up-to-date, localized experience.

## Testing the script locally

```bash
node scripts/translate/index.js -d test -s en -f en.json -t
```
