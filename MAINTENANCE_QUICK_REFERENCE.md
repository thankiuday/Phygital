# 🔧 Maintenance Mode - Quick Reference

## 🚀 Quick Start (Choose One Method)

### Method 1: Using Toggle Scripts (Recommended)

**Linux/Mac:**
```bash
./toggle-maintenance.sh on    # Enable
./toggle-maintenance.sh off   # Disable
./toggle-maintenance.sh status # Check status
```

**Windows:**
```cmd
toggle-maintenance.bat on     # Enable
toggle-maintenance.bat off    # Disable
toggle-maintenance.bat status # Check status
```

### Method 2: Edit Config File Directly

Open `frontend/src/config/maintenance.js` and change:

```javascript
ENABLED: true   // Enable maintenance mode
ENABLED: false  // Disable maintenance mode
```

### Method 3: Environment Variable (Production)

```bash
# Enable
export VITE_MAINTENANCE_MODE=true

# Disable
export VITE_MAINTENANCE_MODE=false
# or
unset VITE_MAINTENANCE_MODE
```

## 📝 Configuration Checklist

**Before enabling maintenance mode:**

- [ ] Set expected return time
- [ ] Update maintenance message
- [ ] List tasks being performed
- [ ] Verify contact email is correct
- [ ] Test in development first

**Example configuration:**
```javascript
export const MAINTENANCE_CONFIG = {
  ENABLED: true,
  EXPECTED_RETURN: new Date('2024-12-31T15:00:00').toISOString(),
  MESSAGE: "We're upgrading our servers!",
  TASKS: [
    "Server hardware upgrade",
    "Database optimization",
  ],
  CONTACT_EMAIL: "support@phygitalzone.com"
}
```

## 🔄 After Toggling Maintenance Mode

**Always rebuild and restart:**

```bash
# Frontend
cd frontend
npm run build

# Restart server (choose your method)
pm2 restart phygital-app
# or
npm start
# or
systemctl restart phygital
```

## ⏱️ Setting Return Time

**2 hours from now:**
```javascript
EXPECTED_RETURN: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
```

**Specific date/time:**
```javascript
EXPECTED_RETURN: new Date('2024-12-31T15:00:00').toISOString()
```

**Auto (default 2 hours):**
```javascript
EXPECTED_RETURN: null
```

## ⚡ Emergency Quick Enable

**Fastest method (no code changes):**
```bash
export VITE_MAINTENANCE_MODE=true && pm2 restart phygital-app
```

**To disable:**
```bash
unset VITE_MAINTENANCE_MODE && pm2 restart phygital-app
```

## 📍 Important Files

- **Maintenance Page:** `frontend/src/pages/Maintenance/MaintenancePage.jsx`
- **Configuration:** `frontend/src/config/maintenance.js`
- **Toggle Scripts:** `toggle-maintenance.sh` / `toggle-maintenance.bat`
- **Full Guide:** `MAINTENANCE_MODE_GUIDE.md`

## ✅ Verification Steps

1. **Enable maintenance mode**
2. **Visit your website** - Should show maintenance page
3. **Try different routes** - All should show maintenance page
4. **Click "Check If We're Back"** - Should refresh page
5. **Disable when done**

## 🚨 Common Issues

**Issue:** Maintenance page not showing
- **Fix:** Clear cache and hard refresh (Ctrl+F5)
- **Fix:** Check if rebuilt: `npm run build`
- **Fix:** Check if restarted: `pm2 restart phygital-app`

**Issue:** Can't disable maintenance mode
- **Fix:** Check VITE_MAINTENANCE_MODE env var isn't set
- **Fix:** Verify config file shows `ENABLED: false`
- **Fix:** Restart application completely

## 💡 Tips

✨ **Test First:** Always test in development before production
🕐 **Plan Ahead:** Enable during low-traffic hours
📧 **Notify Users:** Send advance notice via email/social media
⚡ **Quick Access:** Keep toggle script bookmarked for emergencies
📱 **Mobile Check:** Test on mobile devices too

## 📞 Support Contact

For issues or questions, contact the development team.

---

**Remember:** When maintenance mode is ON, the entire site shows the maintenance page! 🚧

























