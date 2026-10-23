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
  { title: 'Concierge Medicine',          category: 'WordPress Website Design', niche: 'Medical',      cover: 'assets/projects/concierge-medicine-cover.jpg',  full: 'assets/projects/concierge-medicine-full.jpg',  link: '', size: 'l' , categories: ['uiux', 'builder'] },
  { title: 'Classy Construction Group',   category: 'WordPress Website Design', niche: 'Construction', cover: 'assets/projects/classy-construction-cover.jpg', full: 'assets/projects/classy-construction-full.jpg', link: '', size: 'm' , categories: ['builder'] },
  { title: 'Physician Weight Loss',       category: 'WordPress Website Design', niche: 'Medical',      cover: 'assets/projects/weight-loss-cover.jpg',         full: 'assets/projects/weight-loss-full.jpg',         link: '', size: 'l' , categories: ['landing'] },
  { title: 'Mental Wellness Practice',    category: 'WordPress Website Design', niche: 'Medical',      cover: 'assets/projects/mental-wellness-cover.jpg',     full: 'assets/projects/mental-wellness-full.jpg',     link: '', size: 's' , categories: ['uiux', 'builder'] },
  { title: 'Marianne Talkovski Coaching', category: 'WordPress Website Design', niche: 'Coaching',     cover: 'assets/projects/talkovski-coaching-cover.jpg',  full: 'assets/projects/talkovski-coaching-full.jpg',  link: '', size: 'l' , categories: ['landing'] }
];

// Category cards (section "Browse by discipline"). match: projects whose category contains this text open a gallery.
// No matching projects = a service-detail view with a CTA (no invented work).
// Projects appear inside a category's studio scene only when tagged, e.g. categories: ['landing'].
// Keys: 'landing' | 'uiux' | 'builder'.
// TEMPORARY placeholder tags: Surinder will correct which category each project belongs to.
window.CATEGORIES = [
  { key: 'landing', num: 'I', title: 'Landing Pages', line: 'One page, one goal: more enquiries',
    intro: 'Focused pages built to turn ad and search traffic into calls, bookings and form fills.',
    points: ['Conversion-focused layout: one clear offer, proof and a strong call to action', 'Fast loading and mobile-first, tuned for Core Web Vitals', 'A/B-test ready sections, headlines and CTAs', 'GA4, Tag Manager and form/call conversion tracking', 'Message-matched to your Google Ads or campaign'] },
  { key: 'uiux', num: 'II', title: 'UI/UX', line: 'Figma designs mapped before a line of code',
    intro: 'Clear user journeys and polished interfaces, designed and tested in Figma first.',
    points: ['User flows and low-fidelity wireframes in Figma', 'High-fidelity mockups for desktop and mobile', 'Clickable prototypes to test before building', 'Design systems: colours, type, components and spacing', 'Developer-ready handoff to WordPress or code'] },
  { key: 'builder', num: 'III', title: 'Elementor / Divi', line: 'Custom builds you can edit yourself',
    intro: 'Pixel-accurate Elementor and Divi sites that stay easy for your team to update.',
    points: ['Custom page builds from your design or Figma file', 'Editable by you: global styles, reusable templates and sections', 'Speed-optimised: lean layouts, caching and image optimisation', 'Responsive on every device, with on-page SEO basics', 'Handover walkthrough so you can update content confidently'] }
];
