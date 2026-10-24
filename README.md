# Evals Review Tools

Two small tools for learning how to evaluate LLM outputs:

- **Trace Reviewer** shows your bot's answers one at a time in a readable layout. You mark each answer ok or a problem, write a note, name a failure category, and later add pass/fail rubric criteria. It counts your categories and exports a labeled CSV.
- **Judge Reviewer** compares an LLM judge's verdicts with your own labels. It shows both verdicts and the judge's reasoning side by side, scores the judge (TPR and TNR, with **FAIL as the positive class**), compares prompt versions, and records why you and the judge disagreed.

Everything runs on your machine. Your CSV files are never uploaded anywhere.

> Status: early version (0.1.0). Built alongside a beginner evals assignment.

## Use it without installing anything

Each tool is a single HTML file. Download `media/trace-reviewer.html` or `media/judge-reviewer.html`, double-click it, and open your CSV from the page (or drag the file onto it). Progress is saved in your browser.

To host the tools yourself, turn on GitHub Pages for this repo (Settings, then Pages, then deploy from the `main` branch). The pages will be at `/media/trace-reviewer.html` and `/media/judge-reviewer.html`.

## Install in VS Code (and compatible editors)

1. Download the `.vsix` file from this repo's Releases page.
2. Open the Command Palette and run **Extensions: Install from VSIX...**, then pick the file.
3. Run **Evals: Open Trace Reviewer** or **Evals: Open Judge Reviewer** from the Command Palette.

Inside the editor, use the **Open files** button (drag and drop from your desktop isn't available in a panel). **Export CSV** opens a save dialog that starts next to the file you opened. Your notes and labels are saved per workspace.

For the Judge Reviewer, select your judge results CSV and your labeled results CSV together. The labeled file supplies the question, the bot's answer, and your earlier notes.

## CSV columns

**Trace Reviewer** (for example `results_v1.csv`)

| Column | Required | Purpose |
|---|---|---|
| `question` | yes | The customer's message |
| `bot_answer` | yes | The bot's reply |
| `id` | recommended | Label for each trace |
| `good_answer_must_include` | optional | Shown next to the answer |
| any other columns | optional | Shown as small tags (for example `coverage`) |

Export adds `review_status`, `note`, `failure_category`, and one `pf_<criterion>` column per rubric item (`PASS` or `FAIL`). Separate several failure categories with `;`. Reopen an exported file to continue where you left off.

**Judge Reviewer** (for example `judge_results_v1.csv`)

| Column | Required | Purpose |
|---|---|---|
| `judge_verdict` | yes | `PASS` or `FAIL` from the judge |
| `reference_verdict` | yes | Your own `PASS` or `FAIL` |
| `id` | yes | Matches the row to your labeled results file |
| `criterion` | recommended | The rubric item being judged |
| `split` | recommended | `tune` or `test` |
| `judge_prompt_version` | recommended | Keeps `j1`, `j2`, ... separate |
| `judge_reasoning` | recommended | The judge's explanation |

Rows with no usable judge verdict (for example a failed API call) are listed separately and left out of the scores. Export adds `review_cause` and `review_note`.

Try both tools with the files in [`samples/`](samples/).

## Build the extension yourself

```bash
npx @vscode/vsce package
```

This creates `evals-review-tools-0.1.0.vsix`. Before publishing, replace `publisher` and the repository URL in `package.json`, and your name in `LICENSE`.

## Limits

- Built around one workflow, with fixed column names. There is no column mapping yet.
- Scores on small samples are noisy. A handful of failing rows can swing TPR or TNR by 30 points or more.
- Checked with automated tests that simulate the editor panel, but not yet tried across editors.
- Only for VS Code-style editors. JetBrains IDEs would need a separate plugin.

## License

MIT
