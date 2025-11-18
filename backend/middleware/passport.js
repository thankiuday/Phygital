/**
 * Passport Configuration
 * Configures Passport.js with Google OAuth 2.0 Strategy
 * Handles user authentication and account merging
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

/**
 * Configure Google OAuth Strategy
 * Handles authentication and automatic account merging
 */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    proxy: true // Enable if behind a proxy
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user information from Google profile
      const email = profile.emails[0].value;
      const googleId = profile.id;
      const profilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
      
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId });
      
      if (user) {
        // User exists with Google ID, log them in
        console.log('✅ Existing Google user found:', user.email);
        return done(null, user);
      }
      
      // Check if user exists with this email (account merging scenario)
      user = await User.findOne({ email });
      
      if (user) {
        // User exists with same email - merge accounts
        console.log('🔗 Merging Google account with existing user:', email);
        
        user.googleId = googleId;
        user.authProvider = user.authProvider === 'google' ? 'google' : 'both';
        
        // Update profile picture if not set
        if (!user.profilePicture && profilePicture) {
          user.profilePicture = profilePicture;
        }
        
        await user.save();
        return done(null, user);
      }
      
      // Create new user with Google authentication
      console.log('➕ Creating new Google user:', email);
      
      // Generate username from email or Google display name
      let username = profile.displayName 
        ? profile.displayName.replace(/\s+/g, '_').toLowerCase()
        : email.split('@')[0];
      
      // Ensure username is unique
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}_${Date.now().toString(36)}`;
      }
      
      user = new User({
        username,
        email,
        googleId,
        authProvider: 'google',
        profilePicture,
        isVerified: true, // Google emails are verified
        password: Math.random().toString(36).slice(-16) // Random password (won't be used)
      });
      
      await user.save();
      console.log('✅ New Google user created successfully');
      
      return done(null, user);
      
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }
));

/**
 * Serialize user for session
 * Stores user ID in session
 */
passport.serializeUser((user, done) => {
  done(null, user._id);
});

/**
 * Deserialize user from session
 * Retrieves user from database using stored ID
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

