# Private install: GitHub Packages (`@itsjust-lt/website-kit`)

This walkthrough publishes `@itsjust-lt/blog-renderer` and `@itsjust-lt/website-kit` to **GitHub Packages** from **[`ItsJust-LT/luminum`](https://github.com/ItsJust-LT/luminum)**, then installs them in another Next.js app with `pnpm add @itsjust-lt/website-kit`.

The npm scope is **`@itsjust-lt`** (lowercase), which matches your **personal GitHub account** for package publishing.

Other monorepo packages stay `@luminum/*` as **workspace-only** names; only these two are published under your user scope.

---

## 1. Scope and repository

GitHub’s npm registry only accepts `@OWNER/package` where **`OWNER`** matches the account that owns the repo running the workflow.

This setup assumes the repo is **`ItsJust-LT/luminum`** and published package names are **`@itsjust-lt/blog-renderer`** and **`@itsjust-lt/website-kit`**. No organization is required.

---

## 2. One-time: GitHub repository settings

1. Open the repo on GitHub: **Settings → Actions → General**.
2. Under **Workflow permissions**, choose **Read and write permissions** (needed for `GITHUB_TOKEN` to publish packages), or use a **PAT** with `write:packages` in repository secrets (advanced).
3. Save.

---

### After step 2 — what you are actually doing

Step 2 only fixes **permissions on GitHub** so the next steps can work. Nothing is published yet.

From here, split the work into **two places**:

| Where | What you are doing |
|--------|-------------------|
| **This repo (`luminum`) on your machine + GitHub Actions** | Upload the two libraries to GitHub’s private npm registry (**steps 3–4**). Optional: **step 5** if you prefer publishing from your PC instead of Actions. |
| **A different folder: your customer Next.js app** | Download those libraries like normal npm packages (**steps 6–8**). |

Until **steps 3–4** finish successfully, `pnpm add @itsjust-lt/website-kit` in another project **will fail** (the packages do not exist on the registry yet).

---

## 3. Bump versions (only when needed)

**First time ever:** you can usually **skip this step** and go straight to **step 4**. The versions already in `package.json` (`blog-renderer` and `website-kit`) will be published as-is.

**Later releases:** GitHub will reject a publish if that exact version already exists. Then:

1. In this repo, edit `packages/blog-renderer/package.json` → bump `"version"` (e.g. `0.0.1` → `0.0.2`).
2. Edit `packages/website-kit/package.json` → bump `"version"` (e.g. `0.1.0` → `0.1.1`).
3. Commit and push to GitHub.

When `website-kit` is published, the workflow tooling turns the internal `workspace:*` link to `blog-renderer` into a normal semver dependency pointing at the **published** `blog-renderer`. The workflow always publishes **blog-renderer first**, then **website-kit**.

### If installs fail: “No matching version for `@itsjust-lt/blog-renderer@…`”

Consumers resolve `website-kit`’s dependency on a **published** `blog-renderer` version. If `website-kit` was published while that `blog-renderer` version was missing from GitHub Packages, install fails (for example requesting `0.3.0` when only `0.1.0` exists).

**Fix:** publish `@itsjust-lt/blog-renderer` at the required version first, or run the repo **Publish npm packages** workflow (publishes both in order). Then reinstall `website-kit`.

---

## 4. Run the publish workflow (upload packages to GitHub)

You are still in the **luminum** repo. This step runs on GitHub’s servers and pushes both packages to **GitHub Packages**.

**Easiest — run it by hand**

1. On GitHub, open **`ItsJust-LT/luminum`**.
2. Click the **Actions** tab.
3. In the left sidebar, click **Publish npm packages**.
4. Click **Run workflow** → choose your default branch (usually `main`) → **Run workflow**.
5. Wait for the green checkmark. Open the run if it fails and read the error log.

**Optional — run it by pushing a tag**

```bash
git tag npm-v0.1.0
git push origin npm-v0.1.0
```

**How you know it worked**

- On GitHub: your profile (or repo) → **Packages** (or from the repo **Packages** section). You should see **`website-kit`** and **`blog-renderer`** under the `@itsjust-lt` scope.

You are **done with the luminum repo** for publishing until the next release (then repeat step 3 if versions already exist, then step 4 again).

---

## 5. Local publish (optional)

From the monorepo root, with a token that has **`write:packages`**:

**Windows (PowerShell):**

```powershell
$env:NODE_AUTH_TOKEN = "ghp_xxxxxxxx"   # classic PAT, or fine-grained with Packages: Write
pnpm install
pnpm --filter @itsjust-lt/blog-renderer publish --no-git-checks
pnpm --filter @itsjust-lt/website-kit publish --no-git-checks
```

Create a **Personal Access Token**:

- **Classic:** scope `write:packages` (and `read:packages` if you want symmetry).
- **Fine-grained:** repository access to this repo, **Packages** → Read and write.

Do not commit the token. For local installs, use **`read:packages`** only.

Skip this if you already used **step 4** (Actions) successfully.

---

## 6. Consumer project: authenticate to GitHub Packages

**Context switch:** open a **different** folder — the customer’s Next.js site (not the `luminum` monorepo).

In that project, add an **`.npmrc`** file **next to** its `package.json` (or in your home directory for all projects):

```ini
@itsjust-lt:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then provide the token in the environment whenever you install:

**Windows (PowerShell), per session:**

```powershell
$env:NODE_AUTH_TOKEN = "ghp_your_token_with_read_packages"
pnpm add @itsjust-lt/website-kit
```

**macOS / Linux:**

```bash
export NODE_AUTH_TOKEN=ghp_your_token_with_read_packages
pnpm add @itsjust-lt/website-kit
```

**CI (e.g. GitHub Actions)** in the consumer repo: add a secret `NODE_AUTH_TOKEN` (PAT with `read:packages` and access to **ItsJust-LT/luminum** if using a fine-grained token), then:

```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
```

**Team tip:** Developers store `NODE_AUTH_TOKEN` in their shell profile or use a secrets manager; never commit `.npmrc` containing a raw token.

---

## 7. Consumer project: Next.js

`@itsjust-lt/website-kit` ships **TypeScript source**. Tell Next to transpile it and `@itsjust-lt/blog-renderer`:

```js
// next.config.ts or next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@itsjust-lt/website-kit", "@itsjust-lt/blog-renderer"],
};

export default nextConfig;
```

Install peers if pnpm does not pull them automatically:

```bash
pnpm add next react react-dom
```

---

## 8. Install

```bash
pnpm add @itsjust-lt/website-kit
```

Updates later:

```bash
pnpm update @itsjust-lt/website-kit @itsjust-lt/blog-renderer
```

(or bump versions in `package.json` after you publish new versions from the luminum repo).

---

## 9. Grant access to collaborators or other repos

- **Same user / collaborators on the repo:** Grant access via **Package settings** on GitHub or ensure their PAT can read packages for this user’s repositories.
- **Outside consumers:** They need a PAT with `read:packages` (and permission to read your packages—often repository access to `ItsJust-LT/luminum` for fine-grained tokens).
- **Visibility:** Adjust each package’s visibility under **Package settings** on GitHub if you need public read without a token (uncommon for private products).

---

## Checklist

| Step | Done |
|------|------|
| Repo under **ItsJust-LT** and package scope **@itsjust-lt** | ☐ |
| Actions can write packages | ☐ |
| Versions bumped | ☐ |
| Workflow **Publish npm packages** succeeded | ☐ |
| Consumer `.npmrc` + `NODE_AUTH_TOKEN` | ☐ |
| Consumer `transpilePackages` configured | ☐ |
| `pnpm add @itsjust-lt/website-kit` | ☐ |

For usage (env vars, imports), see `packages/website-kit/README.md`.
