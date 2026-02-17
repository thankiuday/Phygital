/**
 * Business Card Routes
 * CRUD + advanced analytics endpoints for Digital Business Cards.
 * All routes authenticated except GET /public/:slug and POST /public/:slug/track.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const BusinessCard = require('../models/BusinessCard');
const CardAnalyticsEvent = require('../models/CardAnalyticsEvent');
const { authenticateToken } = require('../middleware/auth');
const { uploadToCloudinaryBuffer } = require('../config/cloudinary');

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Helpers ─────────────────────────────────────────────
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);

const uniqueSlug = async (base, excludeId = null) => {
  let slug = slugify(base);
  if (slug.length < 3) slug = `card-${Date.now().toString(36)}`;
  let candidate = slug;
  let counter = 1;
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await BusinessCard.findOne(query).lean();
    if (!exists) return candidate;
    candidate = `${slug}-${counter}`;
    counter++;
  }
};

// ─── UA Parser (lightweight, no dependency) ──────────────
function parseUA(ua) {
  if (!ua) return { type: 'unknown', os: '', browser: '' };
  const lc = ua.toLowerCase();

  let deviceType = 'desktop';
  if (/mobile|android.*mobile|iphone|ipod|blackberry|windows phone/i.test(ua)) deviceType = 'mobile';
  else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) deviceType = 'tablet';

  let os = '';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua) && !/chromium|edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr\//i.test(ua)) browser = 'Opera';

  return { type: deviceType, os, browser };
}

// ─── IP helpers ──────────────────────────────────────────
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.ip
    || '';
}

function hashIP(ip, salt = 'phygital-card') {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip + salt + new Date().toISOString().slice(0, 10)).digest('hex').substring(0, 16);
}

function extractReferrerDomain(ref) {
  if (!ref) return '';
  try { return new URL(ref).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function detectSource(referrer, query) {
  if (query?.utm_source === 'qr' || query?.source === 'qr' || query?.ref === 'qr') return 'qr';
  if (!referrer) return 'direct';
  const domain = extractReferrerDomain(referrer);
  const socialDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 't.co', 'lnkd.in'];
  if (socialDomains.some(d => domain.includes(d))) return 'social';
  return 'link';
}

// ─── Geo lookup (fire-and-forget, free API) ──────────────
async function lookupGeo(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: '', city: '' };
  }
  try {
    const cleanIP = ip.replace('::ffff:', '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,country,city`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'success') return { country: data.country || '', city: data.city || '' };
  } catch {}
  return { country: '', city: '' };
}

// ─── Log analytics event (fire-and-forget) ───────────────
async function logEvent(cardId, event, req, extra = {}) {
  try {
    const ip = getClientIP(req);
    const ua = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || extra.referrer || '';
    const device = parseUA(ua);
    const source = extra.source || detectSource(referrer, req.query);
    const visitorHash = hashIP(ip);

    const doc = {
      cardId,
      event,
      target: extra.target || '',
      device,
      referrer,
      referrerDomain: extractReferrerDomain(referrer),
      source,
      visitorHash,
      country: '',
      city: ''
    };

    // Save event immediately
    const saved = await CardAnalyticsEvent.create(doc);

    // Geo lookup async (update event after)
    lookupGeo(ip).then(geo => {
      if (geo.country || geo.city) {
        CardAnalyticsEvent.updateOne({ _id: saved._id }, { $set: { country: geo.country, city: geo.city } }).catch(() => {});
      }
    });

    // Update unique visitors count (per day hash)
    if (event === 'view') {
      const existing = await CardAnalyticsEvent.findOne({
        cardId, event: 'view', visitorHash, _id: { $ne: saved._id },
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).lean();
      if (!existing) {
        await BusinessCard.updateOne({ _id: cardId }, { $inc: { 'analytics.uniqueVisitors': 1 } });
      }
    }
  } catch (err) {
    console.error('Analytics log error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════

// GET /api/business-cards/public/:slug — view card (counts as scan/visit)
router.get('/public/:slug', async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ slug: req.params.slug, isPublished: true });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

    const source = detectSource(req.headers['referer'] || '', req.query);
    const incFields = { 'analytics.totalViews': 1, 'analytics.lastViewedAt': new Date() };
    if (source === 'qr') incFields['analytics.qrScans'] = 1;
    else incFields['analytics.directVisits'] = 1;

    BusinessCard.updateOne({ _id: card._id }, { $set: { 'analytics.lastViewedAt': new Date() }, $inc: { 'analytics.totalViews': 1, ...(source === 'qr' ? { 'analytics.qrScans': 1 } : { 'analytics.directVisits': 1 }) } }).catch(() => {});

    // Log detailed event (fire-and-forget)
    logEvent(card._id, 'view', req, { source });

    return res.json({ success: true, data: { card } });
  } catch (err) {
    console.error('Public business card error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/business-cards/public/:slug/track — track interaction events
router.post('/public/:slug/track', async (req, res) => {
  try {
    const { event, target, referrer, source } = req.body;
    const fieldMap = {
      contactClick: 'analytics.contactClicks',
      socialClick: 'analytics.socialClicks',
      vcardDownload: 'analytics.vcardDownloads',
      linkClick: 'analytics.linkClicks'
    };
    const field = fieldMap[event];
    if (!field) return res.status(400).json({ success: false, message: 'Invalid event' });

    const card = await BusinessCard.findOne({ slug: req.params.slug }).lean();
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

    await BusinessCard.updateOne({ slug: req.params.slug }, { $inc: { [field]: 1 } });

    // Log detailed event
    logEvent(card._id, event, req, { target: target || '', referrer: referrer || '', source: source || '' });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  AUTHENTICATED ROUTES
// ═══════════════════════════════════════════════════════════
router.use(authenticateToken);

// POST /api/business-cards — create
router.post('/', async (req, res) => {
  try {
    const { profile, contact, sections, socialLinks, theme, templateId, isPublished } = req.body;
    const slugBase = (profile?.name || req.user.username || 'card');
    const slug = await uniqueSlug(slugBase);
    const card = await BusinessCard.create({
      userId: req.user._id, slug, templateId: templateId || 'professional',
      profile: profile || {}, contact: contact || {}, sections: sections || [],
      socialLinks: socialLinks || {}, theme: theme || {}, isPublished: !!isPublished
    });
    return res.status(201).json({ success: true, data: { card } });
  } catch (err) {
    console.error('Create business card error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/business-cards — list
router.get('/', async (req, res) => {
  try {
    const cards = await BusinessCard.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: { cards } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/business-cards/:id
router.get('/:id', async (req, res) => {
  try {
    // Avoid matching "analytics" as an id
    if (req.params.id === 'analytics') return res.status(400).json({ success: false, message: 'Invalid ID' });
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    return res.json({ success: true, data: { card } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════

// GET /api/business-cards/:id/analytics — advanced analytics dashboard
router.get('/:id/analytics', async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

    const { period = '30' } = req.query;
    const days = Math.min(parseInt(period) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await CardAnalyticsEvent.find({ cardId: card._id, timestamp: { $gte: since } }).lean();

    // ── Summary stats ──
    const views = events.filter(e => e.event === 'view');
    const uniqueHashes = new Set(views.map(e => e.visitorHash).filter(Boolean));
    const contactClicks = events.filter(e => e.event === 'contactClick');
    const socialClicks = events.filter(e => e.event === 'socialClick');
    const vcardDownloads = events.filter(e => e.event === 'vcardDownload');
    const linkClicks = events.filter(e => e.event === 'linkClick');

    const summary = {
      totalViews: card.analytics?.totalViews || 0,
      uniqueVisitors: card.analytics?.uniqueVisitors || 0,
      contactClicks: card.analytics?.contactClicks || 0,
      socialClicks: card.analytics?.socialClicks || 0,
      vcardDownloads: card.analytics?.vcardDownloads || 0,
      linkClicks: card.analytics?.linkClicks || 0,
      qrScans: card.analytics?.qrScans || 0,
      directVisits: card.analytics?.directVisits || 0,
      lastViewedAt: card.analytics?.lastViewedAt || null,
      periodViews: views.length,
      periodUnique: uniqueHashes.size,
      periodContactClicks: contactClicks.length,
      periodSocialClicks: socialClicks.length,
      periodVcardDownloads: vcardDownloads.length,
      periodLinkClicks: linkClicks.length,
    };

    // ── Views over time (daily buckets) ──
    const viewsByDay = {};
    for (let d = 0; d < days; d++) {
      const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      viewsByDay[date.toISOString().slice(0, 10)] = 0;
    }
    views.forEach(e => {
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      if (viewsByDay[day] !== undefined) viewsByDay[day]++;
    });
    const timeline = Object.entries(viewsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, views: count }));

    // ── Device breakdown ──
    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
    views.forEach(e => { deviceCounts[e.device?.type || 'unknown']++ });

    // ── Browser breakdown ──
    const browserCounts = {};
    views.forEach(e => {
      const b = e.device?.browser || 'Unknown';
      browserCounts[b] = (browserCounts[b] || 0) + 1;
    });

    // ── OS breakdown ──
    const osCounts = {};
    views.forEach(e => {
      const o = e.device?.os || 'Unknown';
      osCounts[o] = (osCounts[o] || 0) + 1;
    });

    // ── Source breakdown (qr vs direct vs social vs link) ──
    const sourceCounts = { qr: 0, direct: 0, social: 0, link: 0, unknown: 0 };
    views.forEach(e => { sourceCounts[e.source || 'unknown']++ });

    // ── Top referrer domains ──
    const refCounts = {};
    views.forEach(e => {
      if (e.referrerDomain) refCounts[e.referrerDomain] = (refCounts[e.referrerDomain] || 0) + 1;
    });
    const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([domain, count]) => ({ domain, count }));

    // ── Location breakdown ──
    const countryCounts = {};
    const cityCounts = {};
    views.forEach(e => {
      if (e.country) countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
      if (e.city) cityCounts[e.city] = (cityCounts[e.city] || 0) + 1;
    });
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([country, count]) => ({ country, count }));
    const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([city, count]) => ({ city, count }));

    // ── Top contact/social targets ──
    const contactTargets = {};
    contactClicks.forEach(e => { if (e.target) contactTargets[e.target] = (contactTargets[e.target] || 0) + 1 });
    const socialTargets = {};
    socialClicks.forEach(e => { if (e.target) socialTargets[e.target] = (socialTargets[e.target] || 0) + 1 });

    // ── Hourly heatmap (0-23) ──
    const hourly = new Array(24).fill(0);
    views.forEach(e => { hourly[new Date(e.timestamp).getHours()]++ });

    // ── Weekly (Mon-Sun) ──
    const weekly = new Array(7).fill(0);
    views.forEach(e => { weekly[new Date(e.timestamp).getDay()]++ });

    return res.json({
      success: true,
      data: {
        summary,
        timeline,
        devices: deviceCounts,
        browsers: Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
        operatingSystems: Object.entries(osCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
        sources: sourceCounts,
        topReferrers,
        topCountries,
        topCities,
        contactTargets: Object.entries(contactTargets).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
        socialTargets: Object.entries(socialTargets).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
        hourlyHeatmap: hourly,
        weeklyDistribution: weekly,
        period: days
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/business-cards/:id — update
router.put('/:id', async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    const allowedFields = ['profile', 'contact', 'sections', 'socialLinks', 'theme', 'templateId', 'isPublished', 'printableCard'];
    for (const field of allowedFields) { if (req.body[field] !== undefined) card[field] = req.body[field]; }
    if (req.body.slug && req.body.slug !== card.slug) { card.slug = await uniqueSlug(req.body.slug, card._id); }
    await card.save();
    return res.json({ success: true, data: { card } });
  } catch (err) {
    console.error('Update business card error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/business-cards/:id
router.delete('/:id', async (req, res) => {
  try {
    const card = await BusinessCard.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    CardAnalyticsEvent.deleteMany({ cardId: card._id }).catch(() => {});
    return res.json({ success: true, message: 'Card deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/business-cards/:id/photo
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await uploadToCloudinaryBuffer(req.file.buffer, req.user._id.toString(), 'business-card-photos', req.file.originalname, req.file.mimetype);
    card.profile.photo = result.secure_url || result.url;
    await card.save();
    return res.json({ success: true, data: { card } });
  } catch (err) {
    console.error('Upload photo error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/business-cards/:id/images
router.post('/:id/images', upload.array('images', 10), async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const urls = [];
    for (const file of req.files) { const r = await uploadToCloudinaryBuffer(file.buffer, req.user._id.toString(), 'business-card-images', file.originalname, file.mimetype); urls.push(r.secure_url || r.url); }
    return res.json({ success: true, data: { urls } });
  } catch (err) { console.error('Upload images error:', err); return res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/business-cards/:id/banner
router.post('/:id/banner', upload.single('banner'), async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await uploadToCloudinaryBuffer(req.file.buffer, req.user._id.toString(), 'business-card-banners', req.file.originalname, req.file.mimetype);
    card.profile.bannerImage = result.secure_url || result.url;
    await card.save();
    return res.json({ success: true, data: { card } });
  } catch (err) { console.error('Upload banner error:', err); return res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/business-cards/:id/videos
const videoUpload = multer({ storage: memoryStorage, limits: { fileSize: 50 * 1024 * 1024 } });
router.post('/:id/videos', videoUpload.array('videos', 5), async (req, res) => {
  try {
    const card = await BusinessCard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const urls = [];
    for (const file of req.files) { const r = await uploadToCloudinaryBuffer(file.buffer, req.user._id.toString(), 'business-card-videos', file.originalname, file.mimetype); urls.push(r.secure_url || r.url); }
    return res.json({ success: true, data: { urls } });
  } catch (err) { console.error('Upload videos error:', err); return res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
