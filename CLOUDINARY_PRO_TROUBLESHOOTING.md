# Cloudinary Pro Account Configuration Guide

## Issue
Getting `api_secret mismatch` error after upgrading to Cloudinary Pro.

## Common Pro Account Issues

### 1. Multiple API Key Pairs
Pro accounts can have multiple API keys. You might be using:
- ❌ Old/revoked API key
- ❌ Mismatched API key and secret from different pairs
- ✅ **Solution**: Use a matching key/secret pair or create a new one

### 2. API Key Permissions
Pro accounts have permission-based API keys:
- Some keys might have restricted permissions
- The key needs **"Admin"** or **"Read/Write"** permissions
- **Solution**: Check the key's permissions in Settings → Access Keys

### 3. Account Sub-Environments
Pro accounts can have multiple environments (staging, production, etc.):
- You might be using credentials from the wrong environment
- **Solution**: Make sure you're using credentials from the correct environment

### 4. IP Whitelisting / Security Settings
Pro accounts can restrict API access by IP:
- Check if IP whitelisting is enabled
- Your server's IP might not be whitelisted
- **Solution**: Settings → Security → Add your server IP to whitelist

## How to Fix

### Option 1: Create a New API Key (Recommended)

1. **Go to Cloudinary Console**: https://cloudinary.com/console
2. **Navigate to**: Settings ⚙️ → **Access Keys**
3. **Click**: "Generate New Key" or "Add Key"
4. **Configure**:
   - Name: `Phygital Backend`
   - Access Mode: **Admin** or **Read and Write**
   - Generate signature: ✅ Enabled
5. **Copy Credentials**:
   ```
   Cloud Name: dpfinjv0s
   API Key: [NEW_KEY]
   API Secret: [CLICK REVEAL TO SEE]
   ```
6. **Save these to `backend/.env`**

### Option 2: Verify Existing Credentials

1. **Go to**: Settings → Access Keys
2. **Find your current API key**: `633713113713459`
3. **Click "Reveal" on the API Secret** for that specific key
4. **Copy the EXACT secret** (select all, right-click copy)
5. **Paste into `backend/.env`** (replace the old one)
6. **Check for**:
   - ✅ No spaces before/after the secret
   - ✅ No line breaks or hidden characters
   - ✅ Exact match including case-sensitivity

### Option 3: Use Environment Variables Format

Cloudinary Pro might require specific environment format:

```bash
# Standard format (should work)
CLOUDINARY_CLOUD_NAME=dpfinjv0s
CLOUDINARY_API_KEY=633713113713459
CLOUDINARY_API_SECRET=your_exact_secret_here

# Alternative URL format (try if standard doesn't work)
CLOUDINARY_URL=cloudinary://633713113713459:your_exact_secret_here@dpfinjv0s
```

## Testing Credentials

### Quick Test (Node.js)
Create a test file `backend/test-cloudinary.js`:

```javascript
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Testing Cloudinary connection...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET?.substring(0, 5) + '...');

cloudinary.api.ping()
  .then(result => {
    console.log('✅ SUCCESS!', result);
  })
  .catch(error => {
    console.log('❌ FAILED:', error.error || error);
  });
```

Run: `node backend/test-cloudinary.js`

## Pro Account Checklist

- [ ] Using the correct cloud name: `dpfinjv0s`
- [ ] API Key and API Secret are from the **same key pair**
- [ ] API Key has **Admin** or **Read/Write** permissions
- [ ] No IP whitelisting restrictions (or server IP is whitelisted)
- [ ] No spaces or hidden characters in `.env` file
- [ ] Restarted backend after changing `.env`
- [ ] Credentials copied directly from Cloudinary console (not typed)

## Still Not Working?

### Check These Settings in Cloudinary Console:

1. **Settings → Security**
   - Disable "Strict transformations" (temporarily)
   - Check if IP whitelist is enabled

2. **Settings → Access Keys → Your Key**
   - Access Mode: Should be "Admin" or "Read and Write"
   - Status: Should be "Active" (not disabled/revoked)

3. **Billing/Plan**
   - Make sure your Pro subscription is active
   - Check if there are any service restrictions

### Contact Cloudinary Support
If still failing:
- Go to: https://support.cloudinary.com
- Subject: "API Secret Mismatch Error with Pro Account"
- Include:
  - Cloud Name: `dpfinjv0s`
  - API Key: `633713113713459`
  - Error: "api_secret mismatch (HTTP 401)"
  - Account Type: Pro

They can verify if there's an account-specific issue.

---

**Last Updated**: October 29, 2025


























