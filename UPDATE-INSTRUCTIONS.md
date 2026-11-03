# Apply the SVG regeneration fix

1. Copy the three files from this patch into the matching locations in your profile repository. Replace the existing files and commit the changes. Your edited `profile.json` is intentionally not included in this patch.
2. Open Actions → Refresh profile stats → Run workflow on your default branch.
3. The workflow regenerates both SVGs and LINKS.md from your current profile.json. It commits them automatically. Profile changes still render when the language API fails; the workflow retains saved language totals and logs a warning.

Future profile.json changes trigger this automatically on main/master. The hourly schedule continues refreshing languages. For another default branch name, add it under on.push.branches in the workflow.

For an immediate local rebuild with Node.js 22 or later, run this from the profile repository root:

    node scripts/render-profile.mjs

Then commit/push assets/terminal.svg, assets/terminal-mobile.svg, and LINKS.md.

Deleted link keys are hidden. A key kept with an empty value continues showing [add URL]. Delete the links object to remove the three optional social links. To hide the entire contacts section, add:

    "sections": { "contacts": false }

The same switches exist for toolkit and languages. Required identity fields have safe fallbacks; toolkit/tools/learning/email can be omitted.

If the SVG file on GitHub has changed but the profile still shows the old picture, allow GitHub's image cache some time to refresh and reload the profile. If nothing is committed, check the workflow run for errors and repository rules blocking Actions from pushing.
