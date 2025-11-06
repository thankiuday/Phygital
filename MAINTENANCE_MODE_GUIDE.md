# Maintenance Mode Guide

## Overview

The maintenance mode feature allows you to display a beautiful, branded maintenance page when you need to perform updates, upgrades, or scheduled maintenance on your Phygital Zone application.

## Features

✨ **Beautiful Design** - Matches your existing Phygital Zone design system with neon colors and modern UI
⏰ **Live Clock** - Shows current time and expected return time
🔧 **Customizable Tasks** - Display what maintenance work is being performed
📧 **Contact Information** - Shows support email for urgent matters
🔄 **Refresh Button** - Allows users to check if the site is back online
📱 **Fully Responsive** - Works perfectly on all devices

## Quick Start

### Method 1: Using Configuration File (Development)

1. Open `frontend/src/config/maintenance.js`
2. Set `ENABLED: true` in the `MAINTENANCE_CONFIG` object
3. Save the file and restart your development server

```javascript
export const MAINTENANCE_CONFIG = {
  ENABLED: true,  // Change this to true
  // ... rest of config
}
```

### Method 2: Using Environment Variable (Production)

1. Set the environment variable `VITE_MAINTENANCE_MODE=true`
2. Restart your application

**For VPS/Server:**
```bash
export VITE_MAINTENANCE_MODE=true
npm run build
npm start
```

**For Render/Vercel/Netlify:**
Add environment variable in your hosting platform:
- Variable: `VITE_MAINTENANCE_MODE`
- Value: `true`

## Configuration Options

All configuration options are in `frontend/src/config/maintenance.js`:

### Basic Configuration

```javascript
export const MAINTENANCE_CONFIG = {
  // Enable/disable maintenance mode
  ENABLED: false,
  
  // Expected return time (ISO format or null for auto-calculation)
  EXPECTED_RETURN: null,
  // Example: new Date('2024-12-31T15:00:00').toISOString()
  
  // Custom message to display
  MESSAGE: "Your custom maintenance message here",
  
  // Tasks being worked on (array of strings)
  TASKS: [
    "Upgrading server infrastructure",
    "Implementing new features",
    // Add more tasks...
  ],
  
  // Contact email for support
  CONTACT_EMAIL: "support@phygitalzone.com",
  
  // Social media links
  SOCIAL_LINKS: {
    twitter: "https://twitter.com/phygitalzone",
    linkedin: "https://linkedin.com/company/phygitalzone"
  }
}
```

### Setting Expected Return Time

**Option 1: Auto-calculate (default)**
```javascript
EXPECTED_RETURN: null  // Defaults to 2 hours from now
```

**Option 2: Set specific time**
```javascript
// For a specific date/time
EXPECTED_RETURN: new Date('2024-12-31T15:00:00').toISOString()

// For X hours from now
EXPECTED_RETURN: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
```

### Customizing Maintenance Tasks

```javascript
TASKS: [
  "Upgrading database infrastructure",
  "Installing security patches",
  "Optimizing performance",
  "Adding AI video generation feature",
  // Add as many as you need
]
```

### Updating Contact Information

```javascript
CONTACT_EMAIL: "support@yourcompany.com",

SOCIAL_LINKS: {
  twitter: "https://twitter.com/yourcompany",
  linkedin: "https://linkedin.com/company/yourcompany",
  // Set to null to hide a link
  twitter: null  // This will hide the Twitter icon
}
```

## Usage Scenarios

### Scenario 1: Scheduled Maintenance

1. Notify users in advance about the maintenance window
2. Before maintenance starts, enable maintenance mode:
   ```javascript
   ENABLED: true
   EXPECTED_RETURN: new Date('2024-12-31T23:00:00').toISOString()
   ```
3. Perform your maintenance work
4. When done, set `ENABLED: false`
5. Redeploy or restart your app

### Scenario 2: Emergency Maintenance

1. Quickly enable maintenance mode via environment variable:
   ```bash
   export VITE_MAINTENANCE_MODE=true
   ```
2. Fix the issue
3. Remove the environment variable or set it to false
4. Restart the application

### Scenario 3: Planned Upgrade

1. Configure maintenance mode with detailed task list:
   ```javascript
   ENABLED: true
   TASKS: [
     "Migrating to new server infrastructure",
     "Upgrading database to latest version",
     "Installing new AI features",
     "Optimizing image processing"
   ]
   EXPECTED_RETURN: new Date('2024-12-31T18:00:00').toISOString()
   ```
2. Enable maintenance mode
3. Perform upgrades
4. Disable when complete

## Environment Variables

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_MAINTENANCE_MODE` | Enable maintenance mode | `true` or `false` |

### Priority

The maintenance mode check follows this priority:
1. `VITE_MAINTENANCE_MODE` environment variable (highest priority)
2. `MAINTENANCE_CONFIG.ENABLED` in config file

This means environment variables will override the config file setting.

## Best Practices

### 1. **Plan Ahead**
- Schedule maintenance during low-traffic periods
- Notify users in advance via email or social media
- Set realistic expected return times

### 2. **Keep Users Informed**
- Update the maintenance message with specific information
- List what improvements they can expect
- Provide contact information for urgent matters

### 3. **Test Before Enabling**
- Test the maintenance page in development first
- Verify all links and contact information work
- Check responsive design on mobile devices

### 4. **Quick Enable/Disable**
- Use environment variables for production for instant changes
- Keep a script ready to toggle maintenance mode quickly

### 5. **Monitor**
- Set up monitoring to know when maintenance is complete
- Have a team member check the maintenance page is displaying correctly

## Troubleshooting

### Issue: Maintenance page not showing

**Solution 1:** Clear browser cache and hard refresh (Ctrl+F5)

**Solution 2:** Check if `VITE_MAINTENANCE_MODE` is set correctly:
```bash
echo $VITE_MAINTENANCE_MODE  # Should output: true
```

**Solution 3:** Verify `maintenance.js` configuration:
```javascript
ENABLED: true  // Make sure this is set
```

### Issue: Changes not reflecting

**Solution:** Rebuild and restart the application:
```bash
npm run build
# Restart your server
```

### Issue: Expected time not correct

**Solution:** Ensure you're using ISO format:
```javascript
EXPECTED_RETURN: new Date('2024-12-31T15:00:00').toISOString()
```

## Examples

### Example 1: 2-Hour Maintenance

```javascript
export const MAINTENANCE_CONFIG = {
  ENABLED: true,
  EXPECTED_RETURN: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  MESSAGE: "We're upgrading our servers to serve you better!",
  TASKS: [
    "Server hardware upgrade",
    "Database optimization"
  ]
}
```

### Example 2: Overnight Maintenance

```javascript
export const MAINTENANCE_CONFIG = {
  ENABLED: true,
  EXPECTED_RETURN: new Date('2024-12-31T08:00:00').toISOString(), // 8 AM tomorrow
  MESSAGE: "Scheduled maintenance - We'll be back in the morning!",
  TASKS: [
    "Database migration to new infrastructure",
    "Installing security updates",
    "Upgrading to latest framework version"
  ]
}
```

### Example 3: Quick Emergency Fix

```bash
# Via environment variable - no code changes needed
export VITE_MAINTENANCE_MODE=true
pm2 restart phygital-app

# After fix
unset VITE_MAINTENANCE_MODE
pm2 restart phygital-app
```

## Disabling Maintenance Mode

### Method 1: Configuration File
```javascript
ENABLED: false
```

### Method 2: Environment Variable
```bash
export VITE_MAINTENANCE_MODE=false
# or remove it
unset VITE_MAINTENANCE_MODE
```

Then restart your application.

## Testing

To test the maintenance page locally:

1. Set `ENABLED: true` in `frontend/src/config/maintenance.js`
2. Run `npm run dev` in the frontend directory
3. Visit `http://localhost:5173`
4. You should see the maintenance page
5. Click "Check If We're Back" to test the refresh functionality

## Files Modified

- `frontend/src/pages/Maintenance/MaintenancePage.jsx` - The maintenance page component
- `frontend/src/config/maintenance.js` - Configuration file
- `frontend/src/App.jsx` - Integrated maintenance mode check

## Support

If you have issues with the maintenance mode feature:

1. Check this guide for troubleshooting steps
2. Review the configuration file syntax
3. Verify environment variables are set correctly
4. Check browser console for any errors

---

**Note:** When maintenance mode is enabled, ALL routes will show the maintenance page. There's no way to bypass it except by disabling maintenance mode, so make sure you can access the server to disable it when maintenance is complete!











