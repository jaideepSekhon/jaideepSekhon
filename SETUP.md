# Your terminal GitHub profile

The README contains one terminal panel: white-tiger outline art, introduction, toolkit, language totals, and contact details. There are no separate skill images, charts, counters, or social buttons.

## Upload

Copy the complete package's contents into the root of your public **jaideepSekhon/jaideepSekhon** repository, including `.github`. Do not upload just the README or nest the files inside a `github-profile` folder.

The README uses relative paths to the two terminal SVGs in `assets/`. Both SVGs embed the transparent tiger, so there are no external artwork requests. GitHub serves the uploaded files; visitors never access your computer. The mobile terminal keeps the text readable on a phone.

After upload, open **Actions → Refresh profile stats → Run workflow** once.

## Edit the text and links

Edit **profile.json** to change your name, introduction, toolkit, learning list, email, and portfolio/X/LinkedIn URLs. Empty URLs appear as `[add URL]` until you fill them in. Keep URLs in the `https://...` format.

The workflow rerenders the terminal when `profile.json`, the renderer, or the tiger changes. The generated SVGs should not be edited directly, because a refresh replaces them. To preview changes locally without a network request, run this from the profile folder with Node.js 22 or later:

```sh
node scripts/render-profile.mjs
```

SVGs displayed as images cannot provide individually clickable text links inside a GitHub README. Clicking anywhere on the terminal opens **LINKS.md**, where the configured links work normally. That file is generated from `profile.json` together with the terminal.

## Automatic language updates

The workflow checks hourly at minute 23, and also runs manually or when its renderer/configuration changes. It updates the language text inside the same terminal and saves the SVGs and aggregate snapshot. The snapshot stores language totals, scope, and last successful check; no private repository names or source code are saved.

The script uses GitHub language-byte counts from your owned, non-fork repositories, including archived repositories, and excludes this profile repository. It uses default-branch language data. The top six languages appear individually; the remainder are grouped as Other. Percentages reflect code volume, not proficiency or time spent.

GitHub can delay language indexing, scheduled runs, and cached image refreshes. The bundled language values retain the previous successful public snapshot, marked as cached in the SVG's accessible description. Run the authenticated workflow to fetch current values. On an API failure, it retains the previous successful terminal.

For refresh requests after pushes to other repositories:

1. Copy `examples/notify-profile.yml` into `.github/workflows/notify-profile.yml` in each source repository you want monitored.
2. Create a fine-grained token for your **profile repository** with **Actions: read and write**.
3. Add it to each source repository's Actions secrets as **PROFILE_REFRESH_TOKEN**.

The hourly check catches language data that GitHub finishes indexing after the push notification. The profile workflow must live on the default branch, and repository rules must allow it to commit generated files. Scheduled workflows can be disabled after 60 days of inactivity in a public repository.

## Optional private language totals

Public data works with GitHub's built-in workflow token. To also count selected private repositories:

1. Open GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Choose resource owner **jaideepSekhon**, **Only select repositories**, and the private repositories to include. Set an expiration date.
3. **Metadata: read** is sufficient; no Contents permission or write access is needed to read language totals.
4. In the **profile repository**, open **Settings → Secrets and variables → Actions**, and save the token as **PROFILE_STATS_TOKEN**.
5. Run **Refresh profile stats** manually. Renew the secret before token expiry; remove it to return to public-only values.

The resulting combined language percentages are public. The token stays in Actions secrets. This enables the workflow to read private language metadata; it does not give this chat access to private source files. Organization repositories are outside this template's owned-personal-repository scope.

## Files

- `README.md`: the single panel, linked to your contact page.
- `profile.json`: your editable information and URLs.
- `LINKS.md`: generated clickable profile links.
- `assets/terminal.svg`, `assets/terminal-mobile.svg`: generated desktop/mobile panels.
- `assets/tiger-outline.png`: transparent green outline of your original white tiger.
- `data/languages.json`: last successful aggregate language snapshot.
- `scripts/`: renderer, API refresh, and meaningful data-handling checks.
- `.github/workflows/update-profile.yml`: hourly/manual/config-change refresh.
- `examples/notify-profile.yml`: optional source-repository trigger.
- `ARTWORK.md`: image-edit source, prompt, and output location.

References:

- Relative image paths: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes#relative-links-and-image-paths-in-markdown-files
- Language API and Metadata permission: https://docs.github.com/en/rest/repos/repos#list-repository-languages
- Workflow triggers: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
