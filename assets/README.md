# Assets

## Add a project
1. Take a full-page screenshot of the site. Resize to 1000px wide, JPG quality ~78, under ~600 KB
   -> `assets/projects/<slug>-full.jpg`. Crop the top 1000x750 -> `assets/projects/<slug>-cover.jpg`.
2. In `projects.js` add to `window.PROJECTS`:
   `{ title: 'Client Name', category: 'WordPress Website Design', niche: 'Medical', cover: 'assets/projects/<slug>-cover.jpg', full: 'assets/projects/<slug>-full.jpg', link: 'https://client.com', size: 'l' }`
   - `size`: `'l'`, `'m'` or `'s'` (card width). `link` is optional ("Visit site" in the lightbox).
3. On desktop, hovering a card scrolls through the full screenshot; clicking opens it in a scrollable lightbox.

## Contact form / WhatsApp
In `projects.js`, set `FORM_ENDPOINT` (Formspree URL) and `WHATSAPP_NUMBER`.
For EmailJS instead, replace the `send()` function in `script.js`.

## Portrait video (later)
Put `avatar.mp4` here and change `data-video="off"` to `"on"` in `index.html`.
