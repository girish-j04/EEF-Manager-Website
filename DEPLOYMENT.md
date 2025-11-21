# Vercel Deployment Checklist

Follow this checklist to deploy your EEF Manager application to Vercel.

## Pre-Deployment Checklist

- [ ] Firebase project is configured and ready
- [ ] Firebase Authentication is enabled
- [ ] Firestore database is set up with proper security rules
- [ ] SMTP credentials are ready (for email reminders)
- [ ] Code is committed to GitHub

## Deployment Steps

### 1. Prepare Your Repository

```bash
# Stage all changes
git add .

# Commit with a message
git commit -m "Prepare for Vercel deployment"

# Push to GitHub
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Vercel will auto-detect settings from `vercel.json`

### 3. Configure Environment Variables

Add these in the Vercel Dashboard under Settings → Environment Variables:

```
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=your-email@gmail.com
```

**Important:**
- Use Gmail App Passwords (not your regular password)
- Generate at: https://myaccount.google.com/apppasswords

### 4. Deploy

Click "Deploy" button in Vercel dashboard.

### 5. Post-Deployment Configuration

#### Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to: **Authentication → Settings → Authorized domains**
4. Click "Add domain"
5. Add your Vercel domain: `your-app-name.vercel.app`

#### Update Firestore Reviewer Directory

Ensure you have the reviewer email directory set up:

1. Go to Firestore in Firebase Console
2. Create/update document: `config/reviewers`
3. Add reviewer name-to-email mappings:
   ```json
   {
     "Reviewer Name": "reviewer@example.edu",
     "Another Reviewer": "another@example.edu"
   }
   ```

## Verification Steps

After deployment, verify these features:

- [ ] Application loads at your Vercel URL
- [ ] Firebase Authentication works (can log in)
- [ ] Can upload XLSX files
- [ ] Dashboard displays correctly
- [ ] Survey submissions work
- [ ] Tracker tab functions properly
- [ ] Email reminders can be sent (test with your own email first)
- [ ] Modal details view opens correctly
- [ ] Approval workflow functions

## Troubleshooting

### Authentication Issues
- Verify Vercel domain is in Firebase Authorized Domains
- Check Firebase configuration in `js/config.js`

### Email Not Sending
- Verify SMTP credentials in Vercel environment variables
- Check Gmail App Password is correct
- Ensure `config/reviewers` document exists in Firestore

### API Errors (404 Not Found)
- Ensure the `api/` directory with `index.js` exists in your repository
- Check Vercel function logs: Dashboard → Functions → Logs
- Verify environment variables are set correctly
- Make sure `vercel.json` is in the root directory

### CORS Errors
- Backend automatically allows same-origin requests
- If issues persist, check `api/index.js` CORS configuration

## Custom Domain (Optional)

1. In Vercel Dashboard, go to Settings → Domains
2. Click "Add Domain"
3. Enter your custom domain
4. Follow DNS configuration instructions
5. Update Firebase Authorized Domains with custom domain

## Monitoring

- **Deployment Logs**: Vercel Dashboard → Deployments → [Your Deployment] → Build Logs
- **Function Logs**: Vercel Dashboard → Functions → Logs
- **Analytics**: Vercel Dashboard → Analytics

## Rollback

If something goes wrong:

1. Go to Vercel Dashboard → Deployments
2. Find a previous working deployment
3. Click "..." menu → "Promote to Production"

## Continuous Deployment

Once connected to GitHub:
- Every push to `main` automatically deploys to production
- Pull requests create preview deployments
- You can disable auto-deploy in Settings → Git

## Security Reminders

- ✅ Never commit `.env` file
- ✅ Keep Firebase config secure
- ✅ Use environment variables for all secrets
- ✅ Review Firestore security rules
- ✅ Use HTTPS only (Vercel provides this automatically)
- ✅ Keep dependencies updated (`npm audit fix`)

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Firebase Documentation**: https://firebase.google.com/docs
- **Project Issues**: Check GitHub repository issues section
