# Assets

## Add a project
1. Save the screenshot in `assets/projects/` (JPG or WebP, about 1600px wide, under ~400 KB).
2. Open `projects.js` and add a line to `window.PROJECTS`:
   `{ title: 'Client Name — Website', category: 'WordPress', image: 'assets/projects/client.jpg', link: 'https://client.com', size: '' }`
   - `category`: `WordPress`, `Figma to WP`, `Full Stack` or `SEO/PPC` (filter tabs are built from these).
   - `size`: `''`, `'tall'` or `'wide'`.
   - `link`: optional; shown as "Visit site" in the lightbox.
3. Delete the placeholder `p01.svg`–`p08.svg` entries when you have real ones.

## Contact form / WhatsApp
In `projects.js`, set `FORM_ENDPOINT` (Formspree URL) and `WHATSAPP_NUMBER`.
For EmailJS instead, replace the `send()` function in `script.js`.

## Portrait video (later)
Put `avatar.mp4` here and change `data-video="off"` to `"on"` in `index.html`.
