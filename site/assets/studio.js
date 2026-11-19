// Aphrona Content Studio: one product spec in, on-brand drafts for TikTok,
// Instagram and the website out, with automatic brand checks and a human
// approval step before anything can be exported.
import {
  VOICE, CLAIM_RULES, PRODUCTS, ANGLES, STORE, LEARN, storeUrl, specText, parseSpec,
} from './brand.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

const CHANNELS = {
  tiktok: { label: 'TikTok script', note: '30 to 45 second video' },
  instagram: { label: 'Instagram post', note: 'Carousel + caption' },
  website: { label: 'Website article', note: 'SEO + AI-answer ready' },
};

const state = {
  product: null,
  angle: 'tiktok',
  drafts: {},     // channel -> markdown text (what the reviewer edits)
  status: {},     // channel -> 'draft' | 'approved' | 'changes'
  variant: 0,
  log: [],
};

/* ------------------------------------------------------------------ */
/* Demo engine: deterministic drafts from the brand kit. Works offline */
/* so a live demo never depends on a network call.                     */
/* ------------------------------------------------------------------ */

const HOOKS = {
  tiktok: [
    (p) => `You've seen ${isMask(p) ? 'the glowing mask' : 'at-home devices like this'} all over your feed. Here's what ${p.short} actually does.`,
    (p) => `Three questions everyone asks before buying ${isMask(p) ? 'an LED mask' : 'a beauty device'}, answered with ${p.short}.`,
  ],
  routine: [
    (p) => `The wind-down step I actually stick to, with ${p.short}.`,
    (p) => `What a realistic night routine looks like with ${p.short}.`,
  ],
  science: [
    (p) => `What ${p.short} actually does, explained in under a minute.`,
    (p) => (isMask(p) ? 'Why LED masks glow different colors, explained simply.' : `The science behind ${p.short}, without the jargon.`),
  ],
  gift: [
    (p) => `The gift for the person who already has every serum.`,
    (p) => `Who ${p.short} is (and isn't) a good gift for.`,
  ],
  compare: [
    (p) => `Which Aphrona device should you get? Here's where ${p.short} fits.`,
    (p) => `How to choose between our devices, starting with ${p.short}.`,
  ],
};

function demoDraft(p, angle, channel, variant) {
  const hook = HOOKS[angle][variant % HOOKS[angle].length](p);
  const f = p.facts;
  const camp = `${slugify(p.short)}-${angle}`;
  if (channel === 'tiktok') {
    return [
      `# ${p.short}: ${ANGLES[angle].split(':')[0]}`,
      '',
      `**Hook (0–3s):** ${hook}`,
      '',
      '| Time | On screen | Voiceover |',
      '|---|---|---|',
      `| 0–3s | Close-up of ${p.short} switching on | ${hook} |`,
      `| 3–10s | Text: "${f[0] || p.concern}" | ${cap(f[0] || p.concern)}. |`,
      `| 10–18s | ${isMask(p) ? 'Putting it on after cleansing' : 'Using it on clean skin'} | ${p.routine.split('.')[0]}. |`,
      `| 18–26s | Text: "Weeks, not nights" | Honest timeline: ${noDot(p.timeline.split(';')[0]).toLowerCase()}. |`,
      `| 26–32s | ${p.short} in use, then fresh skin, no filter | It's for ${p.concern}. Link in bio for the full guide. |`,
      '',
      `**Caption:** ${cap(p.concern)}, one routine. ${p.short} explained in 30 seconds. Results build over weeks of regular use.`,
      '',
      `**Hashtags:** #ledmask #ledlighttherapy #skincareroutine #athomefacial #aphronabeauty`,
      '',
      `**Link in bio:** ${storeUrl(p.path, 'tiktok', camp)}`,
    ].join('\n');
  }
  if (channel === 'instagram') {
    return [
      `# ${p.short}: Instagram carousel`,
      '',
      '**Slides**',
      `1. ${hook}`,
      `2. What it is: ${f[0] || p.name}.`,
      `3. How it feels: ${f[1] || 'gentle, UV-free light with no downtime'}.`,
      `4. How to use it: ${p.routine}`,
      `5. What to expect: ${p.timeline}`,
      `6. Save this for your next routine reset.`,
      '',
      `**Caption:** ${hook}`,
      '',
      `${cap(noDot(f[0] || p.name))}. ${p.routine} ${noDot(p.timeline.split(';')[0])}.`,
      '',
      `Questions about LED? Our guide answers the most common ones (link in bio).`,
      '',
      'Individual results vary.',
      '',
      '**Hashtags:** #ledlighttherapy #ledmask #skincare #glowingskin #aphronabeauty',
      '',
      `**Alt text:** ${p.name} on a bathroom vanity${isMask(p) ? ', its LEDs glowing softly' : ''}.`,
      '',
      `**Link in bio:** ${storeUrl(p.path, 'instagram', camp)}`,
    ].join('\n');
  }
  // website
  const kwOwn = p.keyword && !p.keyword.toLowerCase().includes(p.short.toLowerCase());
  const title = clip(kwOwn ? `${p.short}: ${cap(p.keyword)} Guide` : `${p.short}: How It Works and How to Use It`, 60);
  const faqs = [...p.faqs, [`Who is the ${p.short} for?`, `People looking for help with ${p.concern}.`],
    [`How do I use the ${p.short}?`, p.routine]].filter((x) => x[1]).slice(0, 4);
  return [
    `# ${title}`,
    '',
    `**Meta description:** ${clip(`How the ${p.name} works, who it suits and how to use it, with an honest results timeline. ${p.price}, free US shipping.`, 158)}`,
    '',
    `**URL:** ${LEARN}/guides/${slugify(kwOwn ? p.short + ' ' + p.keyword : p.short + ' guide')}/`,
    '',
    `If you're looking for help with ${p.concern}, the ${p.name} is built for that job. This guide covers what it does, how to fit it into your routine and what results to expect, so you can decide whether it's right for you.`,
    '',
    '## What it is',
    '',
    `The ${p.short} is an at-home device from Aphrona Beauty. Here's what's inside:`,
    '',
    ...f.map((x) => `- ${cap(x)}`),
    '',
    '## How it works',
    '',
    isLED(p)
      ? `LED light therapy uses specific wavelengths, or colors, of low-energy light. Red reaches deepest and is studied for fine lines and texture. Blue stays near the surface and is studied for breakouts. The light doesn't heat or injure the skin, so there's no downtime. For more detail, read our [LED technology guide](${LEARN}/technology/).`
      : `The ${p.short} works through ${noDot(f[0] || 'gentle, non-invasive technology').toLowerCase()}. It's designed for regular at-home sessions with no downtime. Our [technology guide](${LEARN}/technology/#beyond-led) explains how each method works and what the research says.`,
    '',
    '## How to use it',
    '',
    p.routine,
    '',
    '## What results to expect',
    '',
    `${p.timeline} Take a photo in the same light every two weeks so you can see the change.`,
    '',
    '## Frequently asked questions',
    '',
    ...faqs.flatMap(([q, a]) => [`### ${q}`, '', a, '']),
    '## Where to buy',
    '',
    `The ${p.short} is ${p.price} with free US shipping from the [official Aphrona Beauty store](${storeUrl(p.path, 'website', camp)}).`,
    '',
    `_${VOICE.disclaimer}_`,
  ].join('\n');
}

const isMask = (p) => /mask/i.test(p.name);
const isLED = (p) => /\bLED\b/i.test(p.name + ' ' + p.facts.join(' '));
const noDot = (s) => String(s).trim().replace(/\.+$/, '');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

/* ------------------------------------------------------------------ */
/* AI engine: Claude via the Messages API, with the brand kit as      */
/* context. In the Converge build this call is handled by Enter.      */
/* ------------------------------------------------------------------ */

function systemPrompt() {
  return `You write marketing content for Aphrona Beauty, a Houston company selling at-home LED light therapy and skin devices.

Voice: ${VOICE.summary}
Do:\n${VOICE.do.map((x) => '- ' + x).join('\n')}
Don't:\n${VOICE.dont.map((x) => '- ' + x).join('\n')}
Never use these claims: cure, heal, treats acne, FDA approved, clinically proven, permanent, guaranteed results, miracle.
Use only facts from the product spec. If a fact isn't in the spec, leave it out.

Return Markdown only, no preamble, in the exact format of the example you are given.`;
}

async function aiDraft(p, angle, channel, spec, note) {
  const key = $('#api-key').value.trim();
  const model = $('#api-model').value.trim() || 'claude-sonnet-5-5';
  const example = demoDraft(p, angle, channel, 0);
  const user = `Product spec:\n${spec}\n\nContent angle: ${ANGLES[angle]}\nChannel: ${CHANNELS[channel].label} (${CHANNELS[channel].note})\n\nFollow this format exactly (same headings, bold labels and link lines), but write fresh, better copy:\n\n${example}${note ? `\n\nReviewer feedback on the previous draft, apply it:\n${note}` : ''}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 2000, system: systemPrompt(), messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.content.map((c) => c.text || '').join('').trim();
}

/* ------------------------------------------------------------------ */
/* Brand checks                                                       */
/* ------------------------------------------------------------------ */

const EMOJI = /\p{Extended_Pictographic}/gu;

function field(md, label) {
  const m = md.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
  return m ? m[1].trim() : '';
}

function check(channel, md, p) {
  const out = [];
  const add = (level, text) => out.push({ level, text });
  const body = md.replace(/https?:\/\/\S+/g, '');

  for (const r of CLAIM_RULES) {
    const m = body.match(r.re);
    if (m) add(r.level, `"${m[0]}": ${r.why}`);
  }
  const emojis = (md.match(EMOJI) || []).length;
  if (channel === 'website' && emojis) add('warn', 'Website copy should have no emojis.');
  if (channel !== 'website' && emojis > 2) add('warn', `${emojis} emojis. Keep it to two or fewer.`);
  if (!/\d/.test(body)) add('warn', 'No concrete numbers. Add one (LED count, minutes, weeks).');
  if (!md.includes('aphronabeauty.com')) add('block', 'No link to the official store.');
  else if (!/utm_campaign=/.test(md)) add('warn', 'Store link has no UTM tag, so sales from this post can\'t be tracked.');

  if (channel === 'tiktok') {
    const vo = [...md.matchAll(/^\|[^|]*\|[^|]*\|\s*(.+?)\s*\|$/gm)].map((m) => m[1]).filter((x) => !/^-+$|^Voiceover$/.test(x));
    const words = vo.join(' ').split(/\s+/).filter(Boolean).length;
    if (words > 130) add('warn', `Voiceover is ${words} words, about ${Math.round(words / 2.6)}s. Aim for 45s or less.`);
    else add('pass', `Voiceover is ${words} words, about ${Math.round(words / 2.6)} seconds.`);
    const hook = field(md, 'Hook \\(0–3s\\)');
    if (hook.split(/\s+/).length > 18) add('warn', 'Hook is long. Viewers decide in about two seconds.');
    const tags = (field(md, 'Hashtags').match(/#/g) || []).length;
    if (tags > 6) add('warn', `${tags} hashtags. 3 to 6 performs better on TikTok.`);
  }
  if (channel === 'instagram') {
    const capLen = (md.split('**Caption:**')[1] || '').split('**Hashtags')[0].trim().length;
    if (capLen > 2200) add('block', `Caption is ${capLen} characters; Instagram's limit is 2,200.`);
    else add('pass', `Caption is ${capLen} characters.`);
    if (!/results vary/i.test(md)) add('warn', 'Add "Individual results vary."');
    if (!field(md, 'Alt text')) add('warn', 'Missing image alt text.');
  }
  if (channel === 'website') {
    const title = (md.match(/^# (.+)$/m) || [, ''])[1];
    if (title.length > 60) add('warn', `Title is ${title.length} characters; Google shows about 60.`);
    else add('pass', `Title is ${title.length} characters.`);
    const meta = field(md, 'Meta description');
    if (meta.length < 110 || meta.length > 160) add('warn', `Meta description is ${meta.length} characters; aim for 110 to 160.`);
    else add('pass', `Meta description is ${meta.length} characters.`);
    const kw = (p.keyword || '').toLowerCase().split(' ').filter((w) => w.length > 3);
    const hits = kw.filter((w) => title.toLowerCase().includes(w)).length;
    if (kw.length && hits < Math.ceil(kw.length / 2)) add('warn', `Title is missing the target search phrase "${p.keyword}".`);
    const faqs = parseFaq(md);
    if (faqs.length < 2) add('warn', 'Add at least two FAQs so AI assistants can quote direct answers.');
    else add('pass', `${faqs.length} FAQs will be published as FAQPage schema.`);
    if (!/results vary/i.test(md)) add('block', 'Missing the cosmetic-use disclaimer.');
    const words = md.split(/\s+/).length;
    if (words < 350) add('warn', `${words} words. Guides under 350 words rarely rank.`);
  }
  if (!out.some((x) => x.level !== 'pass')) add('pass', 'No claim or voice issues found.');
  return out;
}

function parseFaq(md) {
  const sec = md.split(/^## Frequently asked questions\s*$/m)[1];
  if (!sec) return [];
  const block = sec.split(/^## /m)[0];
  return block.split(/^### /m).slice(1).map((chunk) => {
    const [q, ...rest] = chunk.split('\n');
    return { q: q.trim(), a: rest.join(' ').replace(/\s+/g, ' ').trim() };
  }).filter((x) => x.q && x.a);
}

function schemaFor(md, p) {
  const title = (md.match(/^# (.+)$/m) || [, p.name])[1];
  const url = field(md, 'URL');
  const graph = [
    {
      '@type': 'Article',
      headline: title,
      description: field(md, 'Meta description'),
      url,
      author: { '@type': 'Organization', name: 'Aphrona Beauty' },
      publisher: { '@id': 'https://www.aphronabeauty.com/#organization' },
      about: { '@id': `${STORE}${p.path}#product` },
      datePublished: new Date().toISOString().slice(0, 10),
    },
  ];
  const faqs = parseFaq(md);
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */

// Small Markdown renderer for the preview: headings, bold, italics, links,
// lists and pipe tables. Input is escaped first.
function md2html(md) {
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const lines = md.split('\n');
  let html = '';
  let list = null;
  let table = null;
  const flush = () => {
    if (list) { html += `</${list}>`; list = null; }
    if (table) { html += '</tbody></table></div>'; table = null; }
  };
  for (const l of lines) {
    if (/^\|/.test(l)) {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      if (!table) { flush(); html += `<div class="table-wrap"><table><thead><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`; table = 1; continue; }
      html += `<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`;
      continue;
    }
    const ul = l.match(/^- (.+)/);
    const ol = l.match(/^\d+\. (.+)/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (list !== tag) { flush(); html += `<${tag}>`; list = tag; }
      html += `<li>${inline((ul || ol)[1])}</li>`;
      continue;
    }
    flush();
    const h = l.match(/^(#{1,3}) (.+)/);
    if (h) html += `<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`;
    else if (l.trim()) html += `<p>${inline(l)}</p>`;
  }
  flush();
  return html;
}

const STATUS_LABEL = { draft: 'Needs review', approved: 'Approved', changes: 'Changes requested' };

function renderChannel(ch) {
  const card = $(`[data-channel="${ch}"]`);
  const md = state.drafts[ch];
  if (!md) { card.hidden = true; return; }
  card.hidden = false;
  const results = check(ch, md, state.product);
  const blocks = results.filter((r) => r.level === 'block').length;
  const warns = results.filter((r) => r.level === 'warn').length;
  const st = state.status[ch] || 'draft';
  $('.status', card).textContent = STATUS_LABEL[st];
  $('.status', card).dataset.state = st;
  if (!card.classList.contains('editing')) $('.preview', card).innerHTML = md2html(md);
  $('.checks', card).innerHTML = `
    <p class="checks-sum">${blocks ? `${blocks} must fix` : 'Nothing blocking'} &middot; ${warns} suggestion${warns === 1 ? '' : 's'}</p>
    <ul>${results.map((r) => `<li class="${r.level}"><span>${{ block: 'Fix', warn: 'Check', pass: 'OK' }[r.level]}</span>${esc(r.text)}</li>`).join('')}</ul>`;
  const approve = $('[data-act="approve"]', card);
  approve.disabled = blocks > 0 || st === 'approved';
  approve.title = blocks ? 'Fix the items marked "Fix" before approving' : '';
  if (ch === 'website') {
    $('.schema', card).hidden = false;
    $('.schema pre', card).textContent = schemaFor(md, state.product);
  }
  renderExport();
}

function renderExport() {
  const approved = Object.keys(state.drafts).filter((c) => state.status[c] === 'approved');
  $('#export-count').textContent = `${approved.length} of ${Object.keys(state.drafts).length} approved`;
  $('#export-btn').disabled = !approved.length;
  $('#log').innerHTML = state.log.slice().reverse().map((l) => `<li><time>${l.time}</time> ${esc(l.text)}</li>`).join('');
}

function logEvent(text) {
  const who = $('#reviewer').value.trim() || 'Reviewer';
  state.log.push({ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: `${who}: ${text}` });
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */

const useAI = () => $('#engine').value === 'ai' && $('#api-key').value.trim();

async function generate(channels, note) {
  const spec = $('#spec').value.trim();
  if (!spec) { $('#spec').focus(); return; }
  state.product = parseSpec(spec);
  state.angle = $('#angle').value;
  const btn = $('#generate');
  const t0 = performance.now();
  btn.disabled = true;
  $('#gen-status').textContent = useAI() ? 'Writing with Claude…' : 'Writing drafts…';
  try {
    await Promise.all(channels.map(async (ch) => {
      state.drafts[ch] = useAI()
        ? await aiDraft(state.product, state.angle, ch, spec, note)
        : demoDraft(state.product, state.angle, ch, state.variant);
      state.status[ch] = 'draft';
      $(`[data-channel="${ch}"]`).classList.remove('editing');
      renderChannel(ch);
    }));
    for (const ch of Object.keys(CHANNELS)) if (!channels.includes(ch) && !$(`#ch-${ch}`).checked) { delete state.drafts[ch]; renderChannel(ch); }
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    $('#gen-status').textContent = `${channels.length} draft${channels.length > 1 ? 's' : ''} ready in ${secs}s. Review each one below.`;
    logEvent(`generated ${channels.map((c) => CHANNELS[c].label).join(', ')} for ${state.product.short}${note ? ' with feedback' : ''}`);
    renderExport();
    $('#drafts').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    $('#gen-status').textContent = `The AI request failed (${e.message}). Switch to the built-in engine or check the key.`;
  } finally {
    btn.disabled = false;
  }
}

function onCardAction(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const card = b.closest('[data-channel]');
  const ch = card.dataset.channel;
  const act = b.dataset.act;
  if (act === 'edit') {
    if (card.classList.toggle('editing')) {
      $('.editor', card).value = state.drafts[ch];
      $('.editor', card).focus();
      b.textContent = 'Done editing';
    } else {
      b.textContent = 'Edit';
      renderChannel(ch);
    }
  } else if (act === 'approve') {
    state.status[ch] = 'approved';
    logEvent(`approved ${CHANNELS[ch].label}`);
    renderChannel(ch);
  } else if (act === 'changes') {
    const note = $('.note-input', card).value.trim();
    if (!note) { $('.note-input', card).focus(); return; }
    state.status[ch] = 'changes';
    logEvent(`requested changes on ${CHANNELS[ch].label}: "${note}"`);
    state.variant += 1;
    generate([ch], note).then(() => { $('.note-input', card).value = ''; });
  } else if (act === 'copy') {
    navigator.clipboard?.writeText(state.drafts[ch]).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500); });
  } else if (act === 'copy-schema') {
    navigator.clipboard?.writeText(`<script type="application/ld+json">\n${schemaFor(state.drafts[ch], state.product)}\n</script>`)
      .then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy schema'), 1500); });
  }
}

function onEditorInput(e) {
  const card = e.target.closest('[data-channel]');
  const ch = card.dataset.channel;
  state.drafts[ch] = e.target.value;
  if (state.status[ch] === 'approved') { state.status[ch] = 'draft'; logEvent(`edited ${CHANNELS[ch].label} after approval, back to review`); }
  renderChannel(ch);
}

function exportPack() {
  const approved = Object.keys(state.drafts).filter((c) => state.status[c] === 'approved');
  const parts = [
    `# Content pack: ${state.product.name}`,
    `Angle: ${ANGLES[state.angle]}`,
    `Approved by ${$('#reviewer').value.trim() || 'Reviewer'} on ${new Date().toLocaleString()}`,
    '',
    ...approved.flatMap((c) => ['---', '', state.drafts[c], '']),
  ];
  if (approved.includes('website')) parts.push('---', '', '## FAQ schema (paste into the page <head>)', '', '```html', `<script type="application/ld+json">\n${schemaFor(state.drafts.website, state.product)}\n</script>`, '```');
  parts.push('', '## Review log', ...state.log.map((l) => `- ${l.time} ${l.text}`));
  const blob = new Blob([parts.join('\n')], { type: 'text/markdown' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `aphrona-${slugify(state.product.short)}-${state.angle}.md` });
  a.click();
  URL.revokeObjectURL(a.href);
  logEvent(`exported ${approved.length} approved piece${approved.length > 1 ? 's' : ''}`);
  renderExport();
}

/* ------------------------------------------------------------------ */
/* Setup                                                              */
/* ------------------------------------------------------------------ */

function init() {
  const sel = $('#preset');
  sel.innerHTML = Object.entries(PRODUCTS).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join('') + '<option value="">Paste your own…</option>';
  const fill = () => { if (sel.value) $('#spec').value = specText(PRODUCTS[sel.value]); else { $('#spec').value = ''; $('#spec').focus(); } };
  sel.addEventListener('change', fill);
  fill();
  $('#angle').innerHTML = Object.entries(ANGLES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');

  $('#voice-summary').textContent = VOICE.summary;
  $('#voice-do').innerHTML = VOICE.do.map((x) => `<li>${esc(x)}</li>`).join('');
  $('#voice-dont').innerHTML = VOICE.dont.map((x) => `<li>${esc(x)}</li>`).join('');

  const engine = $('#engine');
  const syncEngine = () => { $('#ai-settings').hidden = engine.value !== 'ai'; };
  engine.addEventListener('change', syncEngine);
  syncEngine();
  $('#api-key').value = store.get('aphrona-key') || '';
  $('#api-key').addEventListener('change', (e) => store.set('aphrona-key', e.target.value.trim()));

  $('#generate').addEventListener('click', () => {
    const chs = Object.keys(CHANNELS).filter((c) => $(`#ch-${c}`).checked);
    if (!chs.length) { $('#gen-status').textContent = 'Pick at least one channel.'; return; }
    generate(chs);
  });
  $('#drafts').addEventListener('click', onCardAction);
  $('#drafts').addEventListener('input', (e) => { if (e.target.classList.contains('editor')) onEditorInput(e); });
  $('#export-btn').addEventListener('click', exportPack);
  renderExport();
}

init();
