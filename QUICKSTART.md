# Quick Start: Deploy to Vercel

Get your EEF Manager up and running on Vercel in 5 minutes!

## Prerequisites
- GitHub account
- Vercel account ([sign up free](https://vercel.com/signup))
- Firebase project configured

## Quick Deploy Steps

### 1. Push to GitHub (if not already done)
```bash
git add .
git commit -m "Ready for Vercel"
git push origin main
```

### 2. Deploy to Vercel
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository
4. Click "Deploy" (Vercel auto-detects settings)

### 3. Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
FROM_EMAIL=your-email@gmail.com
```

> **Note**: See [.env.example](.env.example) for detailed documentation on all environment variables.

### 4. Update Firebase
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel URL: `your-app.vercel.app`

### 5. Test Your App
Visit your Vercel URL and verify:
- ✅ You can log in
- ✅ Dashboard loads
- ✅ You can upload files

## Need Gmail App Password?
1. Go to https://myaccount.google.com/apppasswords
2. Create a new app password
3. Use this in `SMTP_PASSWORD` variable

## That's It! 🎉

Your EEF Manager is now live at `https://your-app.vercel.app`

## Next Steps
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed configuration
- Check [README.md](README.md) for full documentation
- Add custom domain (optional) in Vercel Dashboard

## Troubleshooting

**Can't log in?**
→ Check Firebase Authorized Domains includes your Vercel URL

**Emails not sending?**
→ Verify SMTP credentials in Vercel environment variables

**Need Help?**
→ Check Vercel Dashboard → Functions → Logs for error details
