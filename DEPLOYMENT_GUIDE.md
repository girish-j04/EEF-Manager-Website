# Firebase Hosting Deployment Guide for EEF Manager

This guide covers deploying the EEF Manager application to Firebase Hosting, including initial setup, updates, custom domains, and rollback procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Firebase CLI](#installing-firebase-cli)
3. [Initial Deployment Setup](#initial-deployment-setup)
4. [Deploying the Application](#deploying-the-application)
5. [Updating the Deployed Application](#updating-the-deployed-application)
6. [Custom Domain Setup](#custom-domain-setup)
7. [Rollback and Version Management](#rollback-and-version-management)
8. [Environment Management](#environment-management)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Prerequisites

Before deploying, ensure you have:

- ✅ Completed Firebase setup (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))
- ✅ Firebase project created and Firestore enabled
- ✅ `index.html` with correct Firebase configuration
- ✅ Node.js installed (version 16 or higher)
- ✅ npm or yarn package manager
- ✅ Command line/terminal access
- ✅ Firebase project ownership or Editor permissions

## Installing Firebase CLI

The Firebase Command Line Interface (CLI) is required for deployment.

### Step 1: Install Node.js

If you don't have Node.js installed:

**Windows:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run installer
3. Verify: Open Command Prompt and run `node --version`

**macOS:**
```bash
# Using Homebrew
brew install node

# Verify
node --version
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm

# Verify
node --version
```

### Step 2: Install Firebase CLI

Open your terminal/command prompt and run:

```bash
npm install -g firebase-tools
```

**Note**: On macOS/Linux, you may need `sudo`:
```bash
sudo npm install -g firebase-tools
```

### Step 3: Verify Installation

```bash
firebase --version
```

You should see output like:
```
13.0.0
```

### Step 4: Login to Firebase

```bash
firebase login
```

This will:
1. Open your web browser
2. Ask you to sign in with Google
3. Request permissions for Firebase CLI
4. Confirm successful login in terminal

**For servers without browser access:**
```bash
firebase login --no-localhost
```

## Initial Deployment Setup

### Step 1: Navigate to Project Directory

Open terminal and navigate to your EEF Manager directory:

```bash
cd "/home/girishj04/Lenovo-Fedora/Projects/EEF Manager"
```

**Windows:**
```bash
cd "C:\Users\YourName\Projects\EEF Manager"
```

### Step 2: Check Existing Configuration

Check if you already have Firebase configuration files:

```bash
ls -la
```

Look for:
- ✅ `firebase.json` - Hosting configuration
- ✅ `.firebaserc` - Project configuration

### Step 3: Initialize Firebase (If Not Already Done)

If you **don't** have `firebase.json` and `.firebaserc`, initialize:

```bash
firebase init hosting
```

Follow the prompts:

1. **Which Firebase features do you want to set up?**
   - Select: `Hosting: Configure files for Firebase Hosting`
   - Press `Space` to select, `Enter` to continue

2. **Please select an option:**
   - Select: `Use an existing project`

3. **Select a default Firebase project:**
   - Choose your project (e.g., `eef-manager`)

4. **What do you want to use as your public directory?**
   - Enter: `.` (dot = current directory)
   - This means `index.html` is in the root

5. **Configure as a single-page app?**
   - Enter: `Yes`
   - This rewrites all URLs to `index.html`

6. **Set up automatic builds and deploys with GitHub?**
   - Enter: `No` (unless you want CI/CD)

7. **File ./index.html already exists. Overwrite?**
   - Enter: `No` (IMPORTANT - don't overwrite!)

### Step 4: Verify Configuration Files

Check that `firebase.json` looks like this:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Check that `.firebaserc` contains your project:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Deploying the Application

### Step 1: Preview Before Deploying (Optional)

Test your app locally before deploying:

```bash
firebase serve
```

This starts a local server at:
```
http://localhost:5000
```

Open this URL in your browser to test. Press `Ctrl+C` to stop.

### Step 2: Deploy to Firebase Hosting

Deploy your application:

```bash
firebase deploy --only hosting
```

You'll see output like:

```
=== Deploying to 'your-project'...

i  deploying hosting
i  hosting[your-project]: beginning deploy...
i  hosting[your-project]: found 1 files in .
✔  hosting[your-project]: file upload complete
i  hosting[your-project]: finalizing version...
✔  hosting[your-project]: version finalized
i  hosting[your-project]: releasing new version...
✔  hosting[your-project]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
Hosting URL: https://your-project.web.app
```

### Step 3: Access Your Deployed App

Your app is now live at:
- **Primary URL**: `https://your-project.web.app`
- **Alternative URL**: `https://your-project.firebaseapp.com`

Both URLs point to the same site.

### Step 4: Test Deployed Application

1. Open the Hosting URL in your browser
2. Enter password: `eef2025`
3. Test key features:
   - Upload a dataset
   - Submit a survey
   - Check Firestore data in Firebase Console

## Updating the Deployed Application

When you make changes to `index.html`, redeploy to update the live site.

### Step 1: Make Your Changes

Edit `index.html` with your changes:
- Bug fixes
- New features
- UI improvements
- Configuration updates

### Step 2: Test Locally

```bash
firebase serve
```

Open `http://localhost:5000` and verify changes work correctly.

### Step 3: Deploy Update

```bash
firebase deploy --only hosting
```

**Deployment time**: Usually 30-60 seconds

### Step 4: Clear Browser Cache

After deploying, users may need to clear cache to see changes:

**User Instructions:**
- Chrome/Edge/Firefox: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
- Safari: `Cmd+Option+R`

**Or programmatically clear cache:**

Add to `index.html` `<head>` section:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### Cache Busting Strategy

For critical updates, add a version parameter to force refresh:

```html
<!-- Add version to title -->
<title>EEF Manager — v2.1.0</title>
```

Or use query parameters for assets:
```html
<script src="app.js?v=2.1.0"></script>
```

## Custom Domain Setup

Use your own domain instead of `your-project.web.app`.

### Step 1: Access Firebase Hosting Settings

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Hosting** in left sidebar
4. Click **Add custom domain**

### Step 2: Enter Your Domain

1. Enter domain: `eef.youruniversity.edu` (or your domain)
2. Click **Continue**

### Step 3: Verify Ownership

Firebase will ask you to verify you own the domain:

**Method 1: TXT Record (Recommended)**
1. Firebase shows a TXT record value
2. Add this to your domain's DNS settings:
   - Type: `TXT`
   - Name: `@` or root domain
   - Value: `firebase=your-verification-string`
3. Wait for DNS propagation (5 minutes - 48 hours)
4. Click **Verify** in Firebase Console

**Method 2: Meta Tag**
1. Add meta tag to `index.html` `<head>`:
   ```html
   <meta name="firebase-hosting-verify" content="your-verification-string">
   ```
2. Deploy updated file
3. Click **Verify**

### Step 4: Configure DNS Records

After verification, add these DNS records:

**For root domain (yourdomain.edu):**
- Type: `A`
- Name: `@`
- Value: `151.101.1.195` (Firebase Hosting IP)
- TTL: 3600

**For subdomain (eef.youruniversity.edu):**
- Type: `CNAME`
- Name: `eef`
- Value: `your-project.web.app.`
- TTL: 3600

**Or use Firebase's provided DNS records** (shown in Console after verification)

### Step 5: Wait for SSL Certificate

Firebase automatically provisions SSL certificate (Let's Encrypt):
- Usually takes 15 minutes - 1 hour
- Status: **"Provisioning SSL certificate"** → **"Connected"**
- Once connected, your site is live at custom domain with HTTPS

### Step 6: Redirect Traffic

Optionally redirect all traffic to your custom domain:

Update `firebase.json`:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "redirects": [
      {
        "source": "/",
        "destination": "https://eef.youruniversity.edu",
        "type": 301
      }
    ]
  }
}
```

Redeploy:
```bash
firebase deploy --only hosting
```

## Rollback and Version Management

Firebase keeps a history of deployments for easy rollback.

### View Deployment History

**In Firebase Console:**
1. Go to **Hosting** → **Dashboard**
2. Scroll to **Release history**
3. See list of all deployments with timestamps

**In CLI:**
```bash
firebase hosting:channel:list
```

### Rollback to Previous Version

**In Firebase Console:**
1. Go to **Hosting** → **Dashboard**
2. Find the version you want to restore in **Release history**
3. Click **⋮** (three dots) → **Roll back to this release**
4. Confirm rollback

**In CLI:**
```bash
# List releases
firebase hosting:releases:list

# Rollback to specific version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION DESTINATION_SITE_ID
```

### Create Version Tags

Tag important releases for easy reference:

```bash
# Deploy with message
firebase deploy --only hosting -m "Release v2.1.0 - Added bulk assignment feature"
```

View messages in Firebase Console under Release history.

### Preview Channels (Staging/Testing)

Create preview URLs for testing before deploying to production:

```bash
# Create preview channel
firebase hosting:channel:deploy staging

# Output: https://your-project--staging-xxx.web.app
```

Test on preview channel, then deploy to production:

```bash
firebase hosting:channel:deploy production
```

## Environment Management

Manage multiple environments (development, staging, production).

### Step 1: Create Multiple Firebase Projects

1. **Development**: `eef-manager-dev`
2. **Staging**: `eef-manager-staging`
3. **Production**: `eef-manager-prod`

### Step 2: Configure Projects

Add projects to Firebase CLI:

```bash
# Add dev project
firebase use --add
# Select eef-manager-dev
# Alias: dev

# Add staging project
firebase use --add
# Select eef-manager-staging
# Alias: staging

# Add production project
firebase use --add
# Select eef-manager-prod
# Alias: production
```

This updates `.firebaserc`:

```json
{
  "projects": {
    "dev": "eef-manager-dev",
    "staging": "eef-manager-staging",
    "production": "eef-manager-prod"
  }
}
```

### Step 3: Deploy to Specific Environment

```bash
# Deploy to dev
firebase use dev
firebase deploy --only hosting

# Deploy to staging
firebase use staging
firebase deploy --only hosting

# Deploy to production
firebase use production
firebase deploy --only hosting
```

### Step 4: Environment-Specific Configuration

For different Firebase configs per environment, create separate HTML files:

- `index.html` → Production config
- `index.dev.html` → Dev config
- `index.staging.html` → Staging config

Or use build scripts to swap configurations dynamically.

## Troubleshooting

### Error: "Permission denied"

**Cause**: Not logged in or insufficient permissions

**Solution**:
```bash
firebase login --reauth
```

Ensure you have **Owner** or **Editor** role in Firebase project.

### Error: "No Firebase project selected"

**Cause**: `.firebaserc` missing or not configured

**Solution**:
```bash
firebase use --add
# Select your project
```

### Deployment succeeds but site shows old version

**Cause**: Browser caching

**Solution**:
1. Clear browser cache: `Ctrl+Shift+R`
2. Check Firebase Console → Hosting → Release history for latest deployment
3. Open in incognito/private window
4. Add cache-busting meta tags (see [Updating section](#updating-the-deployed-application))

### Error: "Failed to list Firebase projects"

**Cause**: Network issues or Firebase API down

**Solution**:
1. Check internet connection
2. Verify Firebase Status: [status.firebase.google.com](https://status.firebase.google.com/)
3. Try again after a few minutes
4. Check corporate firewall settings

### Custom domain not working

**Cause**: DNS propagation delay or incorrect records

**Solution**:
1. Wait up to 48 hours for DNS propagation
2. Check DNS records using [DNS Checker](https://dnschecker.org/)
3. Verify DNS records match Firebase Console instructions exactly
4. Ensure no conflicting CNAME/A records
5. Check with your IT department/domain registrar

### SSL certificate not provisioning

**Cause**: DNS not properly configured or domain not verified

**Solution**:
1. Verify domain ownership in Firebase Console
2. Double-check DNS records (CNAME must include trailing dot: `your-project.web.app.`)
3. Wait 24-48 hours
4. If still failing, remove and re-add custom domain

### Error: "File index.html already exists. Overwrite?"

**Cause**: Firebase init trying to create default index.html

**Solution**:
**Always answer NO** to this prompt to keep your existing `index.html`

## Best Practices

### 1. Version Control

Always use Git to track changes:

```bash
# Initialize Git (if not already)
git init

# Add files
git add index.html firebase.json .firebaserc

# Commit before deploying
git commit -m "Update funding approval workflow"

# Tag production releases
git tag v2.1.0
git push origin v2.1.0

# Deploy
firebase deploy --only hosting
```

### 2. Pre-Deployment Checklist

Before deploying to production:

- ✅ Test locally with `firebase serve`
- ✅ Check browser console for errors (F12)
- ✅ Test all main features (upload, survey, tracker, approval)
- ✅ Verify Firebase configuration is correct
- ✅ Commit changes to Git
- ✅ Create Git tag for version
- ✅ Deploy to staging environment first (if available)
- ✅ Test staging deployment
- ✅ Deploy to production
- ✅ Test production deployment

### 3. Deployment Timing

- 🕐 Deploy during low-usage times (evenings, weekends)
- 🕐 Avoid deploying during critical periods (proposal deadlines)
- 🕐 Notify users before major updates
- 🕐 Have rollback plan ready

### 4. Monitoring

After deployment:

- 📊 Monitor Firebase Console → Hosting → Usage
- 📊 Check browser console for JavaScript errors
- 📊 Monitor Firestore → Usage for quota spikes
- 📊 Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- 📊 Test on mobile devices

### 5. Security

- 🔒 Never commit sensitive credentials
- 🔒 Use `.gitignore` to exclude sensitive files:
  ```
  # Firebase cache
  .firebase/

  # Environment files (if used)
  .env
  .env.local

  # Service account keys (never commit these!)
  *-service-account-key.json
  ```
- 🔒 Keep Firebase config public directory minimal (only `index.html`)
- 🔒 Regularly review Firebase Console → Usage for suspicious activity

### 6. Documentation

Maintain a deployment log:

```markdown
## Deployment Log

### 2025-01-15 - v2.1.0
- Added bulk reviewer assignment
- Fixed speedtype auto-detection
- Improved modal notifications
- Deployed by: Jane Doe
- Rollback: firebase hosting:clone to version 2025-01-10

### 2025-01-10 - v2.0.5
- Bug fix: Survey form validation
- Deployed by: John Smith
```

### 7. Backup Before Deployment

Before major updates, backup Firestore data:

```bash
firebase firestore:export gs://your-project.appspot.com/backups/$(date +%Y%m%d)
```

## CI/CD Setup (Advanced)

Automate deployments with GitHub Actions.

### Step 1: Generate CI Token

```bash
firebase login:ci
```

Copy the token shown (store securely).

### Step 2: Add GitHub Secret

1. Go to GitHub repository → Settings → Secrets → Actions
2. Add new secret:
   - Name: `FIREBASE_TOKEN`
   - Value: (paste token from step 1)

### Step 3: Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_TOKEN }}'
          channelId: live
          projectId: your-project-id
```

Now, every push to `main` branch auto-deploys to Firebase!

## Quick Reference Commands

```bash
# Login
firebase login

# Select project
firebase use your-project-id

# Test locally
firebase serve

# Deploy to hosting
firebase deploy --only hosting

# Deploy with message
firebase deploy --only hosting -m "Bug fixes"

# View releases
firebase hosting:releases:list

# Create preview channel
firebase hosting:channel:deploy staging

# Deploy specific project
firebase use production && firebase deploy --only hosting
```

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Custom Domain Setup Guide](https://firebase.google.com/docs/hosting/custom-domain)
- [CI/CD with GitHub Actions](https://firebase.google.com/docs/hosting/github-integration)
- [Firebase Hosting Pricing](https://firebase.google.com/pricing)

## Support

For deployment issues:
- Check [Firebase Status](https://status.firebase.google.com/)
- Search [Stack Overflow: firebase-hosting](https://stackoverflow.com/questions/tagged/firebase-hosting)
- Ask on [Firebase Community](https://firebase.google.com/community)

---

**Last Updated**: November 2025
