// Aphrona brand kit: the single source of truth the Content Studio writes from.
// Both the AI engine (as prompt context) and the brand checks read this file, so
// updating a claim or a product here updates every channel at once.

export const STORE = 'https://www.aphronabeauty.com';
export const LEARN = 'https://jz6424.github.io/30x30-2026-1';

export const VOICE = {
  summary:
    'Warm, calm and knowledgeable, like a trusted esthetician. Confident about what LED does, honest about how long it takes. Plain English first, the science second.',
  do: [
    'Lead with the customer\'s concern, then the product.',
    'Give one concrete number per idea (807 LEDs, 25 minutes, 8 to 12 weeks).',
    'Set honest expectations: results come from regular use over weeks.',
    'Use "you" and short sentences. Sound like a person, not an ad.',
    'Send buyers to the official store and learners to the guide or FAQ.',
  ],
  dont: [
    'Promise medical outcomes or use cure, treat, heal or permanent.',
    'Say clinically proven, FDA approved or dermatologist recommended unless a source is attached.',
    'Compare against named competitors.',
    'Use more than two emojis in a caption, or any in website copy.',
    'Use hype words such as miracle, game-changer, revolutionary or holy grail.',
  ],
  tagline: 'Illuminate. Restore. Transform.',
  disclaimer:
    'Cosmetic use only. Individual results vary. Ask your doctor first if you are pregnant, light-sensitive or take photosensitizing medication.',
};

// Phrases the brand check flags. "level" decides whether the item blocks approval.
export const CLAIM_RULES = [
  { re: /\b(cures?|cured|heals?|healing)\b/i, level: 'block', why: 'Medical claim. LED is a cosmetic device.' },
  { re: /\btreats?\s+(acne|rosacea|eczema|psoriasis|disease)/i, level: 'block', why: 'Disease-treatment claim. Say "studied for" or "helps with the look of".' },
  { re: /\bfda[- ](approved|cleared)\b/i, level: 'block', why: 'Regulatory claim needs a document on file.' },
  { re: /\bclinically[- ]proven\b/i, level: 'block', why: 'Needs a cited study. Prefer "studied in small clinical trials".' },
  { re: /\bpermanent(ly)?\b/i, level: 'block', why: 'Results need ongoing use; nothing is permanent.' },
  { re: /\bguarantee(d|s)?\b/i, level: 'warn', why: 'Only the warranty is guaranteed. Avoid for results.' },
  { re: /\b(overnight|instant(ly)?|immediate(ly)?)\s+(results?|glow|lift)/i, level: 'warn', why: 'Over-promises the timeline (weeks, not nights).' },
  { re: /\b(miracle|game[- ]changer|revolutionary|holy grail|magic)\b/i, level: 'warn', why: 'Hype word. Off-voice.' },
  { re: /\bdermatologist[- ](recommended|approved)\b/i, level: 'warn', why: 'Needs a named source.' },
  { re: /\bbotox\b/i, level: 'warn', why: 'Implies equivalence to an injectable.' },
];

export const PRODUCTS = {
  halo: {
    name: 'Halo LED Facial Glowing Mask',
    short: 'Halo',
    price: '$195.99',
    path: '/products/led-facial-glowing-mask-halo',
    image: 'https://www.aphronabeauty.com/cdn/shop/files/61O3u19781L._SL1254.jpg?v=1780946275&width=600',
    concern: 'fine lines, dull tone and breakouts',
    keyword: 'LED face mask for wrinkles',
    facts: [
      '807 LEDs: 269 red, 269 orange and 269 blue, all running together',
      'One 25-minute, UV-free cycle with no settings to choose',
      'Flexible silicone frame with a patented blackout eye cover',
      'Patented magnetic neck cover for face and neck coverage',
      'Tap once to power on, again to start; switches off automatically',
    ],
    routine: 'Cleanse, wear Halo for 25 minutes, then apply serum and moisturizer. 3 to 5 times a week.',
    timeline: 'Brighter, calmer-looking skin in a few weeks; fine lines and texture after 8 to 12 weeks of regular use.',
    faqs: [
      ['How often should I use the Halo LED mask?', 'Three to five times a week, one 25-minute cycle per session. Consistency matters more than session length.'],
      ['Can I use Halo if I have sensitive skin?', 'Yes for most people. LED does not heat or peel the skin and Halo is UV-free. If you have a light-sensitive condition or take photosensitizing medication, ask your doctor first.'],
      ['Does Halo cover the neck?', 'Yes. A patented magnetic cover clips on to extend the light to your neck.'],
      ['When will I see results?', 'Glow and redness can change within a few weeks. Fine lines and texture usually take 8 to 12 weeks of regular sessions.'],
    ],
  },
  moonlightPro: {
    name: 'Moonlight Pro LED Facial Treatment Mask, 7-Color',
    short: 'Moonlight Pro',
    price: '$189.99',
    path: '/products/led-facial-skin-care-mask-pro',
    image: 'https://www.aphronabeauty.com/cdn/shop/products/7colormaskPDP.jpg?v=1655682968&width=600',
    concern: 'uneven tone and targeting one concern at a time',
    keyword: '7 color LED face mask',
    facts: [
      '150 narrow-spectrum LED chips in seven selectable colors',
      'Red 630 nm, blue 415 nm, green 520 nm, cyan 490 nm and purple 390 nm among them',
      'Adjustable color, brightness and session time',
      'Auto shut-off',
    ],
    routine: 'Pick one color for your main concern, cleanse, and run a 15 to 20 minute session 3 to 5 times a week.',
    timeline: 'Tone changes in a few weeks; texture after 8 to 12 weeks of regular use.',
    faqs: [
      ['Which Moonlight Pro color should I start with?', 'Red for fine lines and texture, blue for breakouts, green for uneven-looking tone. Stick with one color for a few weeks before switching.'],
      ['Can I use more than one color a day?', 'Keep to one session a day and rotate colors across the week rather than stacking them.'],
    ],
  },
  moonlight: {
    name: 'Moonlight LED Facial Treatment Mask, 3-Color',
    short: 'Moonlight',
    price: '$179.99',
    path: '/products/moonlight-face-masks-2',
    image: 'https://www.aphronabeauty.com/cdn/shop/files/3be79d885bebb5707c85ddcedd76de5a.jpg?v=1780945294&width=600',
    concern: 'core red and blue light at a lower price',
    keyword: 'red and blue LED mask',
    facts: [
      '150 narrow-spectrum LED chips',
      'Red 630 nm, blue 415 nm and green 520 nm',
      'Adjustable brightness and time with auto shut-off',
    ],
    routine: 'Cleanse, choose red, blue or green, and use for 15 to 20 minutes 3 to 5 times a week.',
    timeline: 'Glow in a few weeks; texture after 8 to 12 weeks.',
    faqs: [['Is Moonlight a good first LED mask?', 'Yes. It covers the three most-studied colors with simple controls.']],
  },
  supernova: {
    name: 'Avorla SuperNova Skin Tightening Device',
    short: 'SuperNova',
    price: '$369.99',
    path: '/products/supernova-body-facial-tightening-treatment',
    image: 'https://www.aphronabeauty.com/cdn/shop/files/Weixin_Image_20250731095448.jpg?v=1753973878&width=600',
    concern: 'loss of firmness on the face, jawline, neck and body',
    keyword: 'at home radio frequency skin tightening',
    facts: [
      'Radio frequency warmth plus massage',
      '25 mm probe for the face and 45 mm probe for the body',
      'About 10 minutes a session with conductive gel',
    ],
    routine: 'Apply conductive gel, glide the probe in slow circles for about 10 minutes, then wipe clean.',
    timeline: 'Firmer-looking skin builds over several weeks of regular sessions.',
    faqs: [['Do I need gel with SuperNova?', 'Yes. A conductive gel helps the probe glide and spreads the warmth evenly.']],
  },
};

export const ANGLES = {
  tiktok: 'Saw it on TikTok: answer the first questions a curious viewer has',
  routine: 'Night routine: how it fits into a real evening',
  science: 'The science, simply: what each color of light does',
  gift: 'Gift guide: who it suits and why it is worth it',
  compare: 'Which one is right for me: compare against our other devices',
};

export function storeUrl(path, channel, campaign) {
  const u = new URL(STORE + path);
  u.searchParams.set('utm_source', channel);
  u.searchParams.set('utm_medium', channel === 'website' ? 'content' : 'social');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

// Turn a product preset into the plain-text spec shown in the input box.
export function specText(p) {
  return [
    p.name,
    `Price: ${p.price}`,
    `Store URL: ${STORE}${p.path}`,
    `Best for: ${p.concern}`,
    'Key facts:',
    ...p.facts.map((f) => `- ${f}`),
    `How to use: ${p.routine}`,
    `Results timeline: ${p.timeline}`,
  ].join('\n');
}

// Parse a pasted spec back into the same shape, so either input path works.
export function parseSpec(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const get = (label) => {
    const l = lines.find((x) => x.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return l ? l.slice(label.length + 1).trim() : '';
  };
  const name = lines[0] || 'Our device';
  const known = Object.values(PRODUCTS).find((p) => p.name.toLowerCase() === name.toLowerCase());
  const url = get('Store URL');
  const facts = lines.filter((l) => /^[-*•]/.test(l)).map((l) => l.replace(/^[-*•]\s*/, ''));
  const price = get('Price') || (text.match(/\$\d+(\.\d\d)?/) || [''])[0];
  return {
    ...(known || {}),
    name,
    short: known?.short || name.split(/[,(]/)[0].replace(/LED|Facial|Treatment|Mask|Device/gi, '').trim() || name,
    price,
    path: url ? url.replace(STORE, '') : known?.path || '/collections/all',
    concern: get('Best for') || known?.concern || 'your skin goals',
    facts: facts.length ? facts : known?.facts || [],
    routine: get('How to use') || known?.routine || '',
    timeline: get('Results timeline') || known?.timeline || 'Results build over several weeks of regular use.',
    faqs: known?.faqs || [],
    keyword: known?.keyword || name.toLowerCase(),
  };
}
