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

## 5. Automation (Optional)

Consider using [Changesets](https://github.com/changesets/changesets) for automated versioning and publishing in the future.

```bash
pnpm add -D -w @changesets/cli
pnpm changeset init
```
