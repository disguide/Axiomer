# Getting started — the complete step-by-step guide

A zero-to-running guide anyone can follow, even with no prior experience with Obsidian or git. By the end you'll have the Axiomer argument graph open on your computer, laid out top-down, and you'll know how to read it, add to it, and (optionally) publish it.

Estimated time: **15–20 minutes.**

---

## Part 0 — What Axiomer is and how it works (read this first, 2 minutes)

Axiomer is a tool for mapping arguments down to their foundations.

- Every idea — a question, an answer, an argument, a piece of evidence, a core value — is a **note** (a "node").
- Notes are **linked together** by typed relationships: a position *answers* a question, an argument *argues for* a position, a chain *grounds in* a bedrock value.
- Reading a question from the top down traces the argument all the way to the **fundamental value, principle, or "edge of what we can know"** it ultimately rests on.

Two things make it special:

- **Convergence** — when two unrelated debates bottom out at the *same* value, you can see they secretly rest on common ground.
- **Value clash** — when one question's answers bottom out at *different* values, you've found the real disagreement, underneath all the surface arguing.

**How is it built?** It's an [Obsidian](https://obsidian.md) vault — a folder of plain text notes. Obsidian plus three free plugins turns that folder into an interactive, top-down graph. There is no app to install beyond Obsidian, no account, no server, no database. The notes *are* the program.

---

## Part 1 — Install the two things you need (5 minutes)

### 1.1 Install Git

Git is how you download the project and (later) propose changes.

- **Windows:** download from [git-scm.com/download/win](https://git-scm.com/download/win), run the installer, accept the defaults.
- **macOS:** open Terminal and type `git --version`. If it's not installed, macOS will offer to install it. (Or install [Homebrew](https://brew.sh) and run `brew install git`.)
- **Linux (Debian/Ubuntu):** open a terminal and run `sudo apt install git`.

Verify it worked — open a terminal (Windows: "Git Bash" from the Start menu) and run:

```bash
git --version
```

You should see a version number like `git version 2.43.0`.

### 1.2 Install Obsidian

- Go to [obsidian.md](https://obsidian.md), click **Download**, pick your operating system, and install it like any normal app.
- It's free for personal use. You do **not** need to create an account or buy anything.

---

## Part 2 — Download the Axiomer project (2 minutes)

1. Open a terminal (Windows: **Git Bash**; macOS/Linux: **Terminal**).
2. Choose where to put it — e.g. your home folder — and clone the repository:

```bash
git clone https://github.com/disguide/Axiomer.git
```

3. This creates a folder called `Axiomer`. Inside it is a folder called `obsidian-vault` — **that** is the part you open in Obsidian.

> Don't use git? You can instead go to the GitHub page, click the green **Code** button → **Download ZIP**, and unzip it. Cloning is better because it lets you pull updates and propose changes later, but the ZIP works for just looking.

---

## Part 3 — Open the vault in Obsidian (1 minute)

1. Launch **Obsidian**.
2. On the welcome screen, click **Open folder as vault** (if you don't see it, click the vault-switcher in the bottom-left → **Open another vault** → **Open folder as vault**).
3. Navigate to the project and select the **`obsidian-vault`** folder (the one *inside* `Axiomer`, not `Axiomer` itself).
4. Click **Open**. If Obsidian asks whether you trust the author, click **Trust author and enable plugins** — the project ships with pre-configured plugins.

You'll now see a list of notes in the left sidebar (the `Nodes` folder).

---

## Part 4 — Turn on the three plugins (4 minutes)

The graph view comes from community plugins. You only do this once.

1. Open **Settings** (gear icon, bottom-left).
2. Go to **Community plugins** in the left menu.
3. If you see a "Restricted Mode" notice, click **Turn on community plugins**.
4. Click **Browse**. One at a time, search for, **Install**, and then **Enable** each of these:
   - **Juggl** — the interactive graph view.
   - **Breadcrumbs** — makes the graph flow top-down.
   - **Dataview** — lets you query the notes (optional but useful).
5. Close the settings window.

> The Breadcrumbs hierarchy (which links count as "up" vs "down") is **already configured** in the project — you don't need to set it up by hand.

### Rebuild the index

1. Press **Ctrl+P** (macOS: **Cmd+P**) to open the command palette.
2. Type **"Breadcrumbs: Rebuild graph"** and press Enter.

---

## Part 5 — See the graph (1 minute)

1. Press **Ctrl+P** / **Cmd+P** again.
2. Type **"Juggl: Open Juggl"** and press Enter. A graph view opens.
3. In the Juggl toolbar/settings, set the **layout to "Hierarchy (Dagre)"** — this makes it flow top-to-bottom (questions at the top, bedrock values at the bottom).
4. Turn on **edge labels** so you can see the relationship names (`answers`, `grounds-in`, etc.).

You're now looking at the live argument graph.

---

## Part 6 — Read your first argument (2 minutes)

Try this guided tour of the built-in examples:

1. Find the note **"Should you pull the lever"** (the Trolley Problem). Follow it downward.
2. Notice it splits into two answers — **"Yes, pull the lever"** and **"No, dont pull the lever"** — and each bottoms out at a *different* value: **"Minimize total suffering"** vs **"Never use a person merely as a means."** That's a **value clash** — the real disagreement.
3. Now find **"Minimize total suffering."** Notice it has **two** arrows coming into it — one from the Trolley chain, one from a separate chain about **refugees**. That's **convergence** — two different topics resting on the same value.
4. For contrast, open **"Why is the sky blue"** — every path leads to one **epistemic limit** ("Best current scientific theory"). No clash; it's *fully grounded.*

That's the whole idea in two examples.

---

## Part 7 — Add your own node (optional, 3 minutes)

Say you want to add evidence under an existing argument.

1. In the `Nodes` folder, create a new note. Its **title is the claim itself**, e.g. *"Studies show most people pull the lever."*
2. At the very top of the note, add a frontmatter block (Obsidian shows this as "properties"). In source mode it looks like:

```markdown
---
type: evidence-empirical
supports: "[[Saving more lives is better]]"
---

A 2014 survey found ~90% of respondents would pull the lever.
```

3. That's it — `type` says what kind of node it is, and `supports: "[[…]]"` links it to the argument it backs. Re-run **Breadcrumbs: Rebuild graph** and it appears in Juggl.

**The golden rules when adding nodes:**

- Put the link on the right end. Most links live on the *child* pointing *up* (`answers`, `argues-for`, `supports`). Three live on the *parent* pointing *down* (`raises`, `grounds-in`, `entails`).
- When an argument reaches a foundation, **reuse an existing value** if one fits — don't make a duplicate. Shared values are what create convergence.
- Full rules and every node/edge type are in [AUTHORING.md](AUTHORING.md) and [DATA_MODEL.md](DATA_MODEL.md).

---

## Part 8 — Propose your changes back (optional)

If you cloned with git and want your additions included in the shared project:

```bash
cd Axiomer
git checkout -b my-additions          # make a branch
git add obsidian-vault/Nodes/         # stage your new/changed notes
git commit -m "Add evidence on lever-pulling survey"
git push -u origin my-additions       # push it to GitHub
```

Then open the repository on GitHub and click **Compare & pull request**. A maintainer reviews the change — the diff is just readable text notes — and merges it.

---

## Part 9 — Publish a public website (optional, advanced)

To turn the vault into a public, read-only website anyone can browse:

- **Easiest:** use [Quartz](https://quartz.jzhao.xyz/) to build the site, and host it free on **Cloudflare Pages** (connect the GitHub repo, set the build command, done).
- **Most control:** build with Quartz and self-host behind a **Caddy** reverse proxy for a custom domain and automatic HTTPS.

The published site is read-only by nature — there's nothing to lock down. People who want to *edit* still do it in Obsidian and propose changes via pull request (Part 8). Full details in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| The graph is empty or flat (not top-down) | Make sure Breadcrumbs is enabled, run **Breadcrumbs: Rebuild graph**, and set Juggl's layout to **Hierarchy (Dagre)**. |
| A note shows as a broken/grey link | The wikilink target name doesn't exactly match a file name. Check spelling, capitalisation, and punctuation. |
| Plugins won't install | You must turn off **Restricted Mode** under Settings → Community plugins first. |
| `git` not recognised in terminal | On Windows, use **Git Bash** (installed with Git), not the default Command Prompt. |
| I opened the wrong folder | Open `obsidian-vault` (inside `Axiomer`), not `Axiomer` itself. |

## Where to go next

- [DATA_MODEL.md](DATA_MODEL.md) — every node and edge type in detail.
- [AUTHORING.md](AUTHORING.md) — the complete rules for building the graph.
- [SEMANTICS.md](SEMANTICS.md) — grounding, convergence, value clash, premises explained.
- [EXAMPLES.md](EXAMPLES.md) — the built-in graphs taken apart node by node.
