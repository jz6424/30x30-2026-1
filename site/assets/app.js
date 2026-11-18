// Small, dependency-free page behaviour. The 3D mask loads after first paint
// so it never blocks the text, which is what search engines and AI crawlers read.
document.documentElement.classList.remove('no-js');

// Reveal-on-scroll
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px' })
  : null;
document.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

// Lazy-load the 3D mask once the page is idle
if (document.getElementById('mask-canvas')) {
  const load = () => import('./mask.js').catch(() => document.documentElement.classList.add('no-webgl'));
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  if (document.readyState === 'complete') idle(load);
  else addEventListener('load', () => idle(load), { once: true });
}

// "Find your device" chooser
const STORE = 'https://www.aphronabeauty.com';
const utm = (c) => `?utm_source=aphrona-learn&utm_medium=landing&utm_campaign=${c}`;
const PICKS = {
  lines: {
    name: 'Halo LED Facial Glowing Mask',
    why: 'Fine lines and texture are what red light is best known for. Halo covers your whole face and neck with 269 red LEDs, plus orange and blue, in one hands-free 25-minute cycle.',
    price: '$195.99', url: '/products/led-facial-glowing-mask-halo',
    alt: { name: 'Golden Glow wand', why: 'Want to spot-treat around the eyes and mouth for less? The wand pairs red and infrared light with gentle warmth.', url: '/products/led-light-therapy-multi-benefit-facial-wand' },
  },
  breakouts: {
    name: 'Halo LED Facial Glowing Mask',
    why: 'Blue light targets the bacteria behind breakouts on the skin surface, and Halo runs blue together with red, which may help calm redness while blemishes heal.',
    price: '$195.99', url: '/products/led-facial-glowing-mask-halo',
    alt: { name: 'Moonlight 3-Color mask', why: 'Prefer to pick one color at a time with adjustable brightness? Moonlight offers red, blue and green settings.', url: '/products/moonlight-face-masks-2' },
  },
  tone: {
    name: 'Moonlight Pro 7-Color mask',
    why: 'Uneven tone and dullness call for range. Moonlight Pro lets you choose from seven colors, including green (about 520 nm), with adjustable brightness and time.',
    price: '$189.99', url: '/products/led-facial-skin-care-mask-pro',
    alt: { name: 'Halo mask', why: 'Want one routine with no settings to think about? Halo runs red, orange and blue together for 25 minutes.', url: '/products/led-facial-glowing-mask-halo' },
  },
  firm: {
    name: 'SuperNova Skin Tightening',
    why: 'Loss of firmness is a job for warmth more than light. SuperNova uses radio frequency heating with two probe sizes for the face, jawline, neck and body.',
    price: '$369.99', url: '/products/supernova-body-facial-tightening-treatment',
    alt: { name: 'Zenith Skin Tightening', why: 'A smaller face-focused option that combines high-frequency warmth, red and blue LED and massage.', url: '/products/zenith-med-spa-facial-tightening-treatment' },
  },
  hair: {
    name: 'Hair regrowth devices',
    why: 'Thinning hair is treated with low-level laser therapy (LLLT), a different light technology made for the scalp. See the full hair regrowth range in the store.',
    price: '', url: '/collections/hair-regrowth',
  },
};

const result = document.getElementById('chooser-result');
document.querySelectorAll('.choice').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const p = PICKS[btn.dataset.pick];
    if (!p || !result) return;
    const camp = `chooser-${btn.dataset.pick}`;
    result.innerHTML = `
      <p class="eyebrow">Our pick for you</p>
      <h3>${p.name}</h3>
      <p class="why">${p.why}</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="${STORE}${p.url}${utm(camp)}">${p.price ? `Shop now, ${p.price}` : 'Browse the range'}</a>
      </div>
      ${p.alt ? `<p class="note">Also consider: <a href="${STORE}${p.alt.url}${utm(camp + '-alt')}">${p.alt.name}</a>. ${p.alt.why}</p>` : ''}`;
  });
});
