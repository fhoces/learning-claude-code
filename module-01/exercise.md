# Module 1 drill: version control as the safety net

Run these in a terminal with Claude Code available. Prompts to type
into Claude Code are in `>` blocks; shell commands are in code blocks.
Each question ends with what you should see.

## Q1. Build the practice repo

```bash
find ~ -maxdepth 4 -type d -name learning-claude-code -not -path '*/Library/*' 2>/dev/null
cd /Users/you/Desktop/courses/learning-claude-code   # paste the path the line above printed
mkdir -p ~/claude-code-practice && cp -r data ~/claude-code-practice/
cd ~/claude-code-practice
git init -q && git add data/build_data.R data/trip_metrics.R
git commit -qm "Practice repo: trip data generator and metrics script"
Rscript data/build_data.R
git status --short
```

Expected: `?? data/trips.csv`. The CSV is generated, not authored, so it
stays untracked. Add a `.gitignore` with `data/trips.csv` and commit it.
This is the `git add -A` lesson in miniature: decide per file.

## Q2. One change, one commit, read the diff

Open `claude` in the repo and ask:

> Add a `median_fare` column to the summary in data/trip_metrics.R.
> Don't commit.

Then, yourself:

```bash
git status --short
git diff --stat
git diff -- data/trip_metrics.R
Rscript data/trip_metrics.R
```

Expected: exactly one modified file, a diff of a few lines, and a new
column in the output. If the diff touches anything else, that is scope
creep; ask why before committing. Now:

> Commit that change with a message that says what and why.

```bash
git log --oneline -3
git show --stat HEAD
git log -1 --format=%B | tail -2
```

Expected: the trailer line `Co-Authored-By: Claude ...` at the end of
the message. That trailer is how you will find agent-written commits
later.

## Q3. The amend trap, on purpose

Make three more small commits (ask Claude for each, or do them by
hand): rename `share_five` to `share_rated_5`, add a comment header,
sort by city name. Now ask:

> The commit that added median_fare has a typo in its message. Fix the
> message.

Watch what happens. If Claude reaches for `git commit --amend`, let it,
then:

```bash
git log --oneline -5
```

Expected (observed behavior): `HEAD`'s message changed to the text
meant for the older commit, the older commit is unchanged, and
`git log --stat` still looks fine. The tree is untouched. This is the
trap.

## Q4. Recover with reset and replay

```bash
git tag safety-net HEAD
git log --oneline -6          # note the SHA of the commit BEFORE median_fare
git reset --hard <that-sha>
git cherry-pick --no-commit <median_fare-sha>
git commit -F - <<'MSG'
Add median_fare to the per-city summary

Co-Authored-By: Claude <noreply@anthropic.com>
MSG
git cherry-pick <rename-sha> <header-sha> <sort-sha>
git diff safety-net..HEAD      # must print nothing
git tag -d safety-net
```

Expected: the final `git diff` is empty (same tree, only messages
moved), and `git log --oneline -5` shows the corrected message on the
right commit. Only safe before a push.

## Q5. Spot a concurrent session

Simulate one: in a second terminal, in the same repo, make a commit by
hand with a different author:

```bash
git -c user.name="Other Session" commit --allow-empty -m "Orphan note from elsewhere"
```

Back in the first terminal:

```bash
git log --oneline -3
git show --stat HEAD
```

Expected: a commit you did not make, identifiable by author and by the
missing trailer. The habit: `git log --oneline -5` before any
non-trivial work, and `git show --stat` anything unfamiliar before
building on it. Leave it as its own commit.

## Q6. Push gating (read only)

Do not push the practice repo anywhere. Instead, write down in one
sentence what you would say to Claude so that the push is its own
approval step, and what `git fetch` is for right before it. Compare
with the module's concepts file.
