# Google OAuth Integration - Setup Guide

## ✅ Implementation Complete and TESTED!

**Status:** ✅ Fully Functional - Successfully authenticating users with Google OAuth

The Google OAuth integration has been successfully implemented in your application. Follow this guide to complete the setup and start using Google authentication.

---

## 📋 What Was Implemented

### Backend Changes
- ✅ Installed `passport` and `passport-google-oauth20` packages
- ✅ Updated User model with OAuth fields (`googleId`, `authProvider`, `profilePicture`)
- ✅ Created Passport.js configuration with Google OAuth strategy
- ✅ Added Google OAuth routes (`/api/auth/google`, `/api/auth/google/callback`)
- ✅ Implemented automatic account merging for existing emails
- ✅ Initialized Passport middleware in server.js

### Frontend Changes
- ✅ Created reusable `GoogleAuthButton` component
- ✅ Added Google authentication to Login page
- ✅ Added Google authentication to Register page
- ✅ Implemented OAuth callback handling page
- ✅ Updated AuthContext with OAuth support
- ✅ Added routing for OAuth callback

---

## 🚀 Setup Instructions

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Click "Select a project" at the top
   - Create a new project or select an existing one

3. **Enable Required APIs**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it (optional but recommended)

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (for testing) or "Internal" (for organization)
   - Fill in required information:
     - App name: "Phygital"
     - User support email: your email
     - Developer contact: your email
   - Add scopes: email, profile, openid
   - Save and continue

5. **Create OAuth Client ID**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Configure:
     - **Name:** Phygital Web Client
     - **Authorized JavaScript origins:**
       - `http://localhost:3000`
       - `http://localhost:5173`
       - Your production frontend URL (when ready)
     - **Authorized redirect URIs:**
       - `http://localhost:5000/api/auth/google/callback`
       - Your production backend URL + `/api/auth/google/callback` (when ready)
   - Click "Create"

6. **Copy Credentials**
   - You'll see a dialog with your Client ID and Client Secret
   - **IMPORTANT:** Copy these values immediately!

### Step 2: Update Environment Variables

Add these variables to your `backend/.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_step_1
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (used for redirects)
FRONTEND_URL=http://localhost:3000

# For Vite (localhost:5173), use:
# FRONTEND_URL=http://localhost:5173
```

**Frontend Environment** (if using Vite):
Your `frontend/.env` should already have:
```env
VITE_API_URL=http://localhost:5000
```

### Step 3: Restart Your Application

```bash
# Backend
cd backend
npm start

# Frontend (in a new terminal)
cd frontend
npm run dev
```

---

## 🧪 Testing the Integration

### Test Flow 1: New User Registration with Google
1. Navigate to the Register page
2. Click "Sign up with Google"
3. Select your Google account
4. Grant permissions
5. You should be redirected to the dashboard
6. ✅ A new account is created automatically

### Test Flow 2: Existing User Login with Google
1. First, create an account with email/password
2. Log out
3. Go to Login page
4. Click "Sign in with Google" using the SAME email
5. ✅ Accounts are automatically merged
6. You can now use both methods to log in

### Test Flow 3: Account Merging Verification
After merging, check that:
- User can log in with email/password
- User can log in with Google
- User profile has Google profile picture
- `authProvider` is set to 'both' in database

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution:** Make sure the redirect URI in Google Console EXACTLY matches:
- Development: `http://localhost:5000/api/auth/google/callback`
- Production: `https://your-backend-domain.com/api/auth/google/callback`

### Error: "Access blocked: Authorization Error"
**Solutions:**
1. Add your email to test users in OAuth consent screen
2. Set OAuth consent screen to "External" for public access
3. Verify all required scopes are added (email, profile)

### Google button redirects but nothing happens
**Solutions:**
1. Check browser console for errors
2. Verify `FRONTEND_URL` in backend `.env` is correct
3. Check that OAuth callback route is registered in frontend
4. Ensure CORS is properly configured in backend

### User not being created/merged
**Solutions:**
1. Check backend logs for errors
2. Verify MongoDB connection is working
3. Check that User model has the new OAuth fields
4. Verify Passport middleware is initialized in server.js

---

## 🔐 Security Considerations

### Important Security Notes:
1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use different credentials** for development and production
3. **Rotate secrets regularly** in production
4. **Enable HTTPS** in production for OAuth to work securely
5. **Review OAuth consent screen** before publishing

### Production Checklist:
- [ ] Use production Google OAuth credentials
- [ ] Update `GOOGLE_CALLBACK_URL` to production backend URL
- [ ] Update `FRONTEND_URL` to production frontend URL
- [ ] Add production URLs to Google Console authorized origins/redirects
- [ ] Enable HTTPS for both frontend and backend
- [ ] Set `NODE_ENV=production` in backend
- [ ] Review and publish OAuth consent screen (if using "External")

---

## 📊 Database Schema Changes

The User model now includes:

```javascript
{
  googleId: String,              // Google user ID (unique)
  authProvider: String,          // 'local', 'google', or 'both'
  profilePicture: String,        // URL to Google profile picture
  // ... existing fields
}
```

**Migration Note:** Existing users are not affected. They can continue using email/password and optionally link their Google account later.

---

## 🎨 UI Components

### GoogleAuthButton
Location: `frontend/src/components/Auth/GoogleAuthButton.jsx`

Props:
- `mode`: 'signin' | 'signup' (default: 'signin')

Usage:
```jsx
<GoogleAuthButton mode="signin" />  // for login page
<GoogleAuthButton mode="signup" />  // for register page
```

### OAuthCallback Page
Location: `frontend/src/pages/Auth/OAuthCallback.jsx`

This page handles the OAuth redirect and:
1. Extracts token from URL
2. Stores token in localStorage
3. Fetches user profile
4. Redirects to dashboard

---

## 📚 API Endpoints

### Initiate Google OAuth
```
GET /api/auth/google
```
Redirects to Google consent screen.

### Google OAuth Callback
```
GET /api/auth/google/callback
```
Handles Google's redirect after authentication.
Redirects to: `{FRONTEND_URL}/auth/callback?token={jwt_token}`

---

## 🤝 Account Merging Logic

When a user logs in with Google:

1. **Check if `googleId` exists** → Log in existing Google user
2. **Check if email exists** → Merge accounts:
   - Add `googleId` to existing user
   - Update `authProvider` to 'both'
   - Keep existing user data
   - Add Google profile picture if not set
3. **New user** → Create new account:
   - Generate username from Google display name
   - Set `authProvider` to 'google'
   - Mark email as verified
   - Store Google profile picture

---

## 📞 Support

If you encounter any issues:

1. **Check the logs:**
   - Backend: Console output when running `npm start`
   - Frontend: Browser developer console (F12)

2. **Verify environment variables:**
   - Backend `.env` has all required Google OAuth variables
   - Frontend `.env` has correct API URL

3. **Test with curl:**
   ```bash
   curl http://localhost:5000/api/health
   ```

4. **Check database:**
   - Verify User model has new fields
   - Check if users are being created/updated

---

## ✨ Success!

Your application now supports:
- ✅ Email/password authentication (original)
- ✅ Google OAuth authentication (new)
- ✅ Automatic account merging
- ✅ Seamless user experience
- ✅ Secure token-based authentication

Users can now sign up and log in with one click using their Google accounts!

---

## 🎯 Next Steps (Optional)

Consider adding:
- [ ] Facebook OAuth
- [ ] GitHub OAuth
- [ ] Password reset functionality
- [ ] Email verification for local accounts
- [ ] Two-factor authentication (2FA)
- [ ] OAuth account unlinking feature

