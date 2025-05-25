# GPT Localize Action

Easily keep your translation files up-to-date and in sync with the latest English source strings using GPT-4. This action automatically detects changed or missing keys in your `en.json` source file, requests translations for multiple target languages, and updates your repository with the new localized content—no manual translation management required.

## Key Features

- **Automated Key Detection:** Identifies newly added or changed keys in your `en.json` file, ensuring all locale files remain accurate and current.  
- **Missing Key Recovery:** Finds and populates any keys missing from your other language files that may have previously gone unsynchronized.  
- **Powerful AI Translation:** Uses GPT-4 to translate English phrases into multiple target languages, reducing the need for external translation teams or lengthy manual updates.  
- **Seamless Integration:** Easily incorporate into existing CI/CD pipelines with minimal configuration. The action can run on schedules, on-demand via workflow dispatch, or on every push to `main`.  
- **Automated Pull Requests:** Once changes are detected and translations applied, the action can create a dedicated branch and open a pull request with updated locale files, streamlining your review process.

## Usage

1. **Setup OpenAI & GitHub Secrets:**  
   Store your OpenAI API key (`OPENAI_API_KEY`) and a Personal Access Token (`PERSONAL_ACCESS_TOKEN`) as GitHub Secrets.

2. **Configure Your Workflow:**  
   Add the action to your workflow file, specifying the `locales_path` where your base translation file and target language files reside. Optionally, you can specify the base language and base translation file.  

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
           uses: mangoappstudio/gpt-localize-action@v2
           with:
             openai_api_key: ${{ secrets.OPENAI_API_KEY }}
             personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
             locales_path: "./path/to/locales" # Optional, default is "./locales"
             base_language: "en" # Optional, default is "en"
             base_file: "en.json" # Optional, default is "en.json"
   ```

3. **Review & Merge:**  
   Once the action runs, it will open a pull request with updated translations. Simply review and merge the changes to keep your app’s translations fresh and consistent.

## Why GPT Localize Action?

- **Save Time & Costs:** Automate the translation process, freeing developers and content editors from manual updates.  
- **Stay In Sync:** Never miss a key again—any changes in your primary language will ripple through all localized files.  
- **Production-Ready AI Translation:** Utilize GPT-4’s advanced language capabilities for more natural, context-aware translations.

Adopt the GPT Localize Action to streamline your localization workflow, reduce overhead, and ensure that your users around the world enjoy a fully up-to-date, localized experience.

## Testing the script locally

```bash
node scripts/translate/index.js -d test -s en -f en.json -t
```
