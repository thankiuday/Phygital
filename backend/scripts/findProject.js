/*
  Usage: node scripts/findProject.js "GreenHellFour"
*/

const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  try {
    const name = process.argv[2];
    if (!name) {
      console.error('Usage: node scripts/findProject.js "<ProjectName>"');
      process.exit(1);
    }

    // Prefer env, fallback to provided Atlas URI for this one-off query
    const uri = process.env.MONGODB_URI || 'mongodb+srv://udaythanki_db_user:QJqI8sAhj205YXku@cluster0.vnwgsq2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const users = await User.find({ 'projects.name': { $regex: new RegExp(`^${name}$`, 'i') } }, { username: 1, projects: 1 }).lean();
    if (!users.length) {
      console.log('NOT_FOUND');
      await mongoose.disconnect();
      process.exit(0);
    }

    const results = [];
    for (const u of users) {
      for (const p of (u.projects || [])) {
        if (p.name && new RegExp(`^${name}$`, 'i').test(p.name)) {
          results.push({ username: u.username, userId: String(u._id), projectId: p.id, projectName: p.name });
        }
      }
    }

    console.log(JSON.stringify(results, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERR', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

main();


