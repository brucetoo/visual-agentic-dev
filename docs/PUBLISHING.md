# Visual Agentic Dev - Publishing Guide

This guide outlines the steps to publish the core packages and the Chrome extension.

## Prerequisites

- **NPM Account**: You need an NPM account and be a member of `visual-agentic-dev` organization (or create one).
- **Chrome Web Store Developer Account**: Required for publishing the extension ($5 fee).
- **GitHub Repository**: Admin access to push tags and releases.

---

## 1. Preparation

### Versioning
Ensure all packages have the correct version in `package.json`.

```bash
# Example: Bump all versions (manual or use changeset)
# packages/react-devtools/package.json
# packages/bridge-server/package.json
# packages/extension/package.json
```

### Build All
Ensure everything builds correctly.

```bash
pnpm install
pnpm build
```

---

## 2. Publish to NPM

The following packages are published to NPM:
- `@visual-agentic-dev/react-devtools`
- `@visual-agentic-dev/bridge-server`

### Steps

1. **Login to NPM**:
   ```bash
   npm login
   ```

2. **Publish React DevTools**:
   ```bash
   cd packages/react-devtools
   npm publish --access public
   ```

3. **Publish Bridge Server**:
   ```bash
   cd ../bridge-server
   npm publish --access public
   ```

---

## 3. Publish Chrome Extension

The extension is published to the Chrome Web Store.

### Steps

1. **Build the Extension**:
   ```bash
   cd packages/extension
   pnpm build
   ```
   This creates a `dist` directory.

2. **Pack the Extension**:
   Zip the `dist` directory.
   ```bash
   # Inside packages/extension
   zip -r extension.zip dist
   ```

3. **Upload to Web Store**:
   - Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard)
   - Click "New Item"
   - Upload `extension.zip`
   - Fill in store listing details (Description, Screenshots, etc.)
   - Submit for review

---

## 4. GitHub Release

1. **Tag the Release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create Release**:
   - Go to GitHub Releases
   - Draft a new release
   - Select tag `v1.0.0`
   - Generate release notes
   - Attach `extension.zip` as an asset (optional, for manual installation)

---

## 5. Automated Versioning (Recommended)

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

### Workflow

1.  **Develop Features/Fixes**: Make your changes as usual.

2.  **Add a Changeset**:
    Before committing, run:
    ```bash
    pnpm changeset
    ```
    - Select the packages you modified.
    - Select the semantic version bump (major/minor/patch).
    - Enter a summary of the changes.
    This creates a markdown file in `.changeset/` which should be committed.

3.  **Version Bump (Release Time)**:
    When you are ready to release, run:
    ```bash
    pnpm changeset version
    ```
    This command will:
    - Consume the changeset files.
    - Update `package.json` versions.
    - Update `CHANGELOG.md` files.
    - Update `pnpm-lock.yaml`.

    Commit these changes:
    ```bash
    git commit -am "chore: version packages"
    ```

4.  **Publish**:
    Now you can publish the updated packages:
    ```bash
    # Bridge Server & React DevTools
    pnpm -r publish --access public
    
    # Extension (Manual)
    # Follow the steps in section 3 to pack and upload
    ```
