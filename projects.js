// ===== EDIT ME: site settings + your projects =====
window.SITE_CONFIG = {
  // Paste a Formspree endpoint (e.g. 'https://formspree.io/f/xxxxabcd') to make the form send for real.
  FORM_ENDPOINT: '',
  // WhatsApp number in international format, digits only (e.g. '919876543210'). Empty = buttons go to the contact form.
  WHATSAPP_NUMBER: '',
  // Your Upwork profile URL (e.g. 'https://www.upwork.com/freelancers/~xxxx'). Empty = badge is not a link.
  UPWORK_URL: 'https://www.upwork.com/freelancers/~016b1da51591432283',
  WHATSAPP_TEXT: 'Hi Surinder, I would like a free website audit.'
};
// Each project: title, category, niche, cover (top-of-page crop for the card), full (full-page screenshot, ~1000px wide),
// link (optional live URL), size: 'l' | 'm' | 's' (card width, for rhythm). See assets/README.md.
window.PROJECTS = [
  { title: 'Concierge Medicine',          category: 'WordPress Website Design', niche: 'Medical',      cover: 'assets/projects/concierge-medicine-cover.jpg',  full: 'assets/projects/concierge-medicine-full.jpg',  link: '', size: 'l' },
  { title: 'Classy Construction Group',   category: 'WordPress Website Design', niche: 'Construction', cover: 'assets/projects/classy-construction-cover.jpg', full: 'assets/projects/classy-construction-full.jpg', link: '', size: 'm' },
  { title: 'Physician Weight Loss',       category: 'WordPress Website Design', niche: 'Medical',      cover: 'assets/projects/weight-loss-cover.jpg',         full: 'assets/projects/weight-loss-full.jpg',         link: '', size: 'l' },
  { title: 'Mental Wellness Practice',    category: 'WordPress Website Design', niche: 'Medical',      cover: 'assets/projects/mental-wellness-cover.jpg',     full: 'assets/projects/mental-wellness-full.jpg',     link: '', size: 's' },
  { title: 'Marianne Talkovski Coaching', category: 'WordPress Website Design', niche: 'Coaching',     cover: 'assets/projects/talkovski-coaching-cover.jpg',  full: 'assets/projects/talkovski-coaching-full.jpg',  link: '', size: 'l' }
];

// Category cards (section "Browse by discipline"). match: projects whose category contains this text open a gallery.
// No matching projects = a service-detail view with a CTA (no invented work).
window.CATEGORIES = [
  { num: 'I',   title: 'Website Design',            line: 'WordPress sites built to win customers', match: 'WordPress',
    intro: 'Fast, conversion-focused WordPress sites for clinics, builders and coaches.' },
  { num: 'II',  title: 'Lead Generation',           line: 'SEO, PPC & tracking that fill your pipeline', match: '',
    intro: 'Traffic is only useful if it turns into enquiries. I set up the whole pipeline and measure every lead.',
    points: ['Technical & local SEO (Google Business Profile, on-page, speed)', 'Google Ads / PPC campaigns with landing pages that match the ad', 'GA4, Tag Manager & call/form conversion tracking', 'Monthly report: what brought leads, and what to fix next'] },
  { num: 'III', title: 'Full Stack & Custom Builds', line: 'React, Node.js & custom tools when WordPress isn\u2019t enough', match: '',
    intro: 'When a theme won\u2019t do it, I build it: custom dashboards, booking flows, integrations and web apps.',
    points: ['React front-ends and Node.js / MongoDB back-ends', 'Custom WordPress plugins, WooCommerce and API integrations', 'Booking, quote and client-portal flows', 'Hosting, deployment and ongoing care'] }
];
