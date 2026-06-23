import type { ContentTemplate } from '@/types';
import { CREDIT_COSTS } from './index';

// ─── Prompt helpers ───────────────────────────────────────────────────────────

// Shared art direction appended to every image prompt to keep results reverent.
const SAFE_SUFFIX = `
Style: respectful, divine, spiritual. No depictions of Sikh Gurus' faces.
High quality digital art, cinematic lighting. No text in image.
`.trim();

const VIDEO_SUFFIX = `
Cinematic slow-motion, peaceful. No text. High quality 4K.
`.trim();

// ─── Template bank ────────────────────────────────────────────────────────────

export const TEMPLATES: ContentTemplate[] = [

  // ── Gurbani Quotes ─────────────────────────────────────────────────────────

  {
    id: 'gurbani-hukumnama-card',
    name: 'Daily Hukumnama Card',
    description: 'Golden-framed 9:16 background for today\'s Hukumnama',
    category: 'gurbani',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '📜',
    tags: ['hukumnama', 'daily', 'portrait'],
    promptTemplate: `
A glowing golden-hour background for a Sikh daily Hukumnama card.
Scene: Sri Darbar Sahib (Golden Temple) reflecting on serene water at dawn.
Soft rays of golden light, sarovar water rippling gently, doves in flight.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurbani-verse-card',
    name: 'Gurbani Verse Card',
    description: 'Custom spiritual background for any Gurbani verse',
    category: 'gurbani',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🌸',
    tags: ['verse', 'quote', 'portrait'],
    variables: [
      {
        key: 'theme',
        label: 'Verse Theme',
        placeholder: 'e.g. Naam, Seva, Waheguru\'s grace',
        type: 'text',
        required: true,
      },
      {
        key: 'style',
        label: 'Art Style',
        placeholder: 'Choose a style',
        type: 'select',
        options: ['Watercolour', 'Digital painting', 'Minimalist', 'Ethereal glow'],
      },
    ],
    promptTemplate: `
A spiritual {style} art background for a Gurbani verse about {theme}.
Soft light, flowers blooming, golden particles floating.
Peaceful, divine atmosphere evoking the theme of {theme}.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurbani-morning-ardas',
    name: 'Morning Ardas Card',
    description: 'Peaceful dawn card for morning prayer',
    category: 'gurbani',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🌅',
    tags: ['ardas', 'morning', 'prayer'],
    promptTemplate: `
Serene sunrise over a Gurdwara landscape. First light of dawn, misty golden sky,
lotuses opening on a calm pond. A lone pilgrim silhouette in the distance.
Spiritual, hopeful, uplifting — perfect for a morning prayer card.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurbani-sukhmani-card',
    name: 'Sukhmani Sahib Card',
    description: 'Peaceful square card with celestial blue tones',
    category: 'gurbani',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: '🔵',
    tags: ['sukhmani', 'peace', 'square'],
    promptTemplate: `
Deep celestial blue and silver cosmic scene representing divine peace (sukh).
Stars, soft nebula, calm flowing light. Inspired by Sukhmani Sahib's essence of eternal peace.
Meditative, tranquil, profoundly still.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurbani-naam-simran',
    name: 'Naam Simran Background',
    description: 'Meditative background for Waheguru simran cards',
    category: 'gurbani',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: '🕉️',
    tags: ['simran', 'naam', 'meditation'],
    promptTemplate: `
Abstract spiritual painting representing the vibration of Waheguru Naam.
Flowing golden and saffron energy waves, sacred geometry in the background,
soft divine light emanating from the centre. Deep meditative mood.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurbani-chaupai-card',
    name: 'Benti Chaupai Card',
    description: 'Protective gold theme for Chaupai Sahib',
    category: 'gurbani',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🛡️',
    tags: ['chaupai', 'protection', 'strength'],
    promptTemplate: `
Powerful golden shield of divine light, Khanda symbol (without human form) formed from glowing energy,
deep navy blue background with stars, rays of saffron and gold radiating outward.
Conveys divine protection and strength as in Benti Chaupai Sahib.
${SAFE_SUFFIX}
    `.trim(),
  },

  // ── Gurpurab Posters ───────────────────────────────────────────────────────

  {
    id: 'gurpurab-guru-nanak',
    name: 'Guru Nanak Gurpurab',
    description: 'Celebration poster for Guru Nanak Dev Ji\'s Prakash Utsav',
    category: 'gurpurab',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '✨',
    tags: ['guru nanak', 'gurpurab', 'poster'],
    variables: [
      {
        key: 'style',
        label: 'Poster Style',
        placeholder: 'Choose style',
        type: 'select',
        options: ['Traditional gold', 'Modern minimalist', 'Watercolour', 'Festive vibrant'],
      },
    ],
    promptTemplate: `
A {style} celebration poster background for Guru Nanak Dev Ji's Gurpurab (Prakash Utsav).
Radiant golden light, lotus flowers, sacred river, lanterns glowing at night.
Celebratory and deeply respectful. Saffron, white and blue colour palette.
No depictions of human faces or divine figures.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurpurab-guru-gobind-singh',
    name: 'Guru Gobind Singh Gurpurab',
    description: 'Powerful poster for Guru Gobind Singh Ji\'s Prakash Utsav',
    category: 'gurpurab',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '⚔️',
    tags: ['guru gobind singh', 'gurpurab', 'khalsa'],
    variables: [
      {
        key: 'style',
        label: 'Poster Style',
        placeholder: 'Choose style',
        type: 'select',
        options: ['Majestic royal', 'Warrior spirit', 'Serene golden', 'Bold modern'],
      },
    ],
    promptTemplate: `
A {style} background for Guru Gobind Singh Ji's Gurpurab celebration.
Majestic blue and gold, Khanda symbol in light, flowing saffron fabric,
eagle soaring in golden sky, Anandpur Sahib landscape silhouette at dusk.
Powerful, majestic, deeply reverent.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurpurab-vaisakhi',
    name: 'Vaisakhi Celebration',
    description: 'Festive poster for the Khalsa\'s founding day',
    category: 'gurpurab',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🌾',
    tags: ['vaisakhi', 'khalsa', 'harvest', 'festival'],
    promptTemplate: `
Vibrant Vaisakhi celebration background. Golden wheat fields, Nishan Sahib (blue flag) waving,
bhangra silhouettes dancing in fields, bright spring sky with sunflowers.
Joyful, energetic, harvest festival colours — saffron, gold, green, blue.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurpurab-hola-mohalla',
    name: 'Hola Mohalla Poster',
    description: 'Action-filled poster for the Sikh martial arts festival',
    category: 'gurpurab',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🏹',
    tags: ['hola mohalla', 'anandpur', 'sikh martial arts'],
    promptTemplate: `
Dynamic Hola Mohalla festival background. Colourful powder (gulal) in saffron and blue,
horses galloping, Nishan Sahibs waving, Anandpur Sahib fort silhouette.
Vibrant, energetic, celebrating the warrior spirit of the Khalsa.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'gurpurab-bandi-chhorr',
    name: 'Bandi Chhorr Divas',
    description: 'Diwali-Sikh celebration with lanterns and light',
    category: 'gurpurab',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🪔',
    tags: ['bandi chhorr', 'diwali', 'lanterns', 'freedom'],
    promptTemplate: `
Hundreds of glowing diyas (oil lamps) floating on the sarovar water around Golden Temple at night.
Warm amber, gold and saffron light reflected on water, fireworks in the distant sky.
Celebrating Bandi Chhorr Divas — freedom, light overcoming darkness.
${SAFE_SUFFIX}
    `.trim(),
  },

  // ── Khalsa Artwork ─────────────────────────────────────────────────────────

  {
    id: 'khalsa-khanda-art',
    name: 'Khanda Symbol Art',
    description: 'Artistic Khanda composition with divine light',
    category: 'khalsa',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: '☬',
    tags: ['khanda', 'khalsa', 'symbol', 'art'],
    variables: [
      {
        key: 'style',
        label: 'Art Style',
        placeholder: 'Choose style',
        type: 'select',
        options: ['Gold on navy', 'Neon on dark', 'Watercolour', 'Sacred geometry'],
      },
    ],
    promptTemplate: `
Abstract {style} artistic background featuring the sacred Khanda symbol formed from
pure divine light and energy. Rays emanating from the centre, sacred geometry,
deep blue and gold colour scheme. No human figures.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'khalsa-nishan-sahib',
    name: 'Nishan Sahib Background',
    description: 'Majestic Nishan Sahib flag composition',
    category: 'khalsa',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🏳️',
    tags: ['nishan sahib', 'flag', 'khalsa'],
    promptTemplate: `
Majestic Nishan Sahib (Sikh flag) in blue silk flying against a dramatic sky,
golden Khanda gleaming, clouds parting to reveal divine light.
Strong, proud, spiritual. Blue, saffron, gold colour palette.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'khalsa-chardi-kala',
    name: 'Chardi Kala Artwork',
    description: 'Rising spirit — eternal optimism of the Khalsa',
    category: 'khalsa',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🌄',
    tags: ['chardi kala', 'optimism', 'khalsa spirit'],
    promptTemplate: `
Powerful sunrise over mountains, eagle soaring upward toward the sun,
energy waves rising, saffron and gold sky. Conveys Chardi Kala —
the eternal optimism and rising spirit of the Khalsa.
Bold, uplifting, full of divine energy.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'khalsa-seva-artwork',
    name: 'Seva (Selfless Service)',
    description: 'Community langar and seva artwork',
    category: 'khalsa',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: '🤲',
    tags: ['seva', 'langar', 'community', 'service'],
    promptTemplate: `
Warm, glowing scene of hands offering food — representing Langar (free community kitchen).
Golden light from candles, steaming daal, bread, happy warm colours.
Communal, loving, spiritual. Saffron and warm gold tones.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'khalsa-ik-onkar',
    name: 'Ik Onkar Sacred Art',
    description: 'Abstract Ik Onkar symbol composition',
    category: 'khalsa',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: 'ੴ',
    tags: ['ik onkar', 'one god', 'sacred', 'art'],
    variables: [
      {
        key: 'style',
        label: 'Art Style',
        placeholder: 'Choose style',
        type: 'select',
        options: ['Cosmic nebula', 'Golden calligraphy glow', 'Minimalist white', 'Sacred geometry'],
      },
    ],
    promptTemplate: `
Abstract {style} artistic representation of Ik Onkar — the divine oneness.
Cosmic energy converging to a single point of divine light, sacred geometry,
infinity within simplicity. No human figures. Deeply spiritual.
${SAFE_SUFFIX}
    `.trim(),
  },

  // ── Reels Templates ────────────────────────────────────────────────────────

  {
    id: 'reel-quote-animated',
    name: 'Animated Quote Reel',
    description: 'Peaceful 9:16 video background for quote reels',
    category: 'reel',
    mediaType: 'video',
    creditCost: CREDIT_COSTS.VIDEO,
    aspectRatio: '9:16',
    emoji: '✨',
    tags: ['reel', 'quote', 'animation', 'vertical'],
    variables: [
      {
        key: 'theme',
        label: 'Theme',
        placeholder: 'e.g. peace, courage, Waheguru\'s love',
        type: 'text',
        required: true,
      },
    ],
    promptTemplate: `
Cinematic slow-motion video: golden particles floating upward over a blurred Gurdwara,
soft bokeh lights, gentle morning mist. Theme: {theme}.
Perfect loop for a Gurbani quote reel. 9:16 portrait.
${VIDEO_SUFFIX}
    `.trim(),
  },

  {
    id: 'reel-golden-temple-dawn',
    name: 'Golden Temple Dawn Reel',
    description: 'Timelapse-style dawn at Harmandir Sahib',
    category: 'reel',
    mediaType: 'video',
    creditCost: CREDIT_COSTS.VIDEO,
    aspectRatio: '9:16',
    emoji: '🌅',
    tags: ['golden temple', 'dawn', 'reel', 'vertical'],
    promptTemplate: `
Breathtaking cinematic timelapse of dawn over Sri Harmandir Sahib (Golden Temple).
Sun rising, golden light flooding the sarovar, gentle ripples on water,
devotees silhouettes arriving, Nishan Sahib waving in morning breeze. 9:16 vertical.
${VIDEO_SUFFIX}
    `.trim(),
  },

  {
    id: 'reel-nature-meditation',
    name: 'Nature Meditation Reel',
    description: 'Sikh perspective — God in all of creation',
    category: 'reel',
    mediaType: 'video',
    creditCost: CREDIT_COSTS.VIDEO,
    aspectRatio: '9:16',
    emoji: '🌿',
    tags: ['nature', 'meditation', 'reel', 'creation'],
    variables: [
      {
        key: 'element',
        label: 'Nature Element',
        placeholder: 'e.g. forest, ocean, mountains, river',
        type: 'select',
        options: ['Ancient forest', 'Mountain waterfall', 'Ocean waves', 'Desert dunes', 'Cherry blossoms'],
      },
    ],
    promptTemplate: `
Slow cinematic video of {element} in golden light — divine creation in its purest form.
Light filtering through leaves / water / mist, soft peaceful audio mood.
Evokes Sikh philosophy: Waheguru's presence in all of nature. 9:16 vertical.
${VIDEO_SUFFIX}
    `.trim(),
  },

  {
    id: 'reel-khalsa-spirit',
    name: 'Khalsa Spirit Reel',
    description: 'Energetic reel for Gurpurab or Khalsa celebrations',
    category: 'reel',
    mediaType: 'video',
    creditCost: CREDIT_COSTS.VIDEO,
    aspectRatio: '9:16',
    emoji: '⚔️',
    tags: ['khalsa', 'reel', 'celebration', 'energy'],
    promptTemplate: `
Dynamic slow-motion cinematic video: Nishan Sahib flag waving powerfully in wind,
golden and saffron light rays, eagle soaring, energy particles rising.
Celebrates the spirit of the Khalsa — Chardi Kala. 9:16 vertical.
${VIDEO_SUFFIX}
    `.trim(),
  },

  {
    id: 'reel-langar-seva',
    name: 'Langar Seva Reel',
    description: 'Warm video background for Seva and Langar content',
    category: 'reel',
    mediaType: 'video',
    creditCost: CREDIT_COSTS.VIDEO,
    aspectRatio: '9:16',
    emoji: '🙏',
    tags: ['langar', 'seva', 'reel', 'community'],
    promptTemplate: `
Warm cinematic video: steam rising from a large pot, golden candlelight, hands in prayer,
community sharing food in a langar hall, soft warm amber tones.
Representing selfless service (Seva) and community love. 9:16 vertical.
${VIDEO_SUFFIX}
    `.trim(),
  },

  // ── Daily Inspiration ──────────────────────────────────────────────────────

  {
    id: 'inspiration-evening-simran',
    name: 'Evening Simran Card',
    description: 'Calm dusk reflection card for evening prayers',
    category: 'inspiration',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🌙',
    tags: ['evening', 'simran', 'reflection', 'dusk'],
    promptTemplate: `
Peaceful dusk landscape: crescent moon rising over a Gurdwara silhouette,
stars appearing, soft purple-blue twilight sky, candles lit in the foreground.
Calm, meditative, perfect for evening Simran and Rehras Sahib cards.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'inspiration-gratitude',
    name: 'Shukar (Gratitude) Card',
    description: 'Golden light gratitude card',
    category: 'inspiration',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: '🙏',
    tags: ['gratitude', 'shukar', 'thanksgiving'],
    promptTemplate: `
Warm golden light pouring through clouds, hands open upward receiving divine blessings,
flowers blooming, butterflies, autumn leaves in saffron tones.
Represents shukar (gratitude) — thanking Waheguru for everything.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'inspiration-courage',
    name: 'Courage & Strength Card',
    description: 'Bold artwork for inspiring courage posts',
    category: 'inspiration',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '💪',
    tags: ['courage', 'strength', 'motivation'],
    variables: [
      {
        key: 'tone',
        label: 'Visual Tone',
        placeholder: 'Choose tone',
        type: 'select',
        options: ['Golden sunrise', 'Storm breaking', 'Mountain peak', 'Lion in light'],
      },
    ],
    promptTemplate: `
{tone} — powerful spiritual scene representing courage and divine strength.
Bold saffron and gold, dramatic lighting, energy radiating outward.
Conveys unshakeable faith and Chardi Kala spirit.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'inspiration-peace-card',
    name: 'Shanti (Peace) Card',
    description: 'Serene blue-white card for peace-themed posts',
    category: 'inspiration',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '1:1',
    emoji: '☮️',
    tags: ['peace', 'shanti', 'calm', 'blue'],
    promptTemplate: `
Calm lake reflecting moonlight, white lotus flowers blooming, soft mist on water.
Pale blue and white tones, absolute stillness, divine peace.
Represents the inner peace that comes from connecting with Waheguru.
${SAFE_SUFFIX}
    `.trim(),
  },

  {
    id: 'inspiration-custom',
    name: 'Custom Spiritual Art',
    description: 'Describe your own spiritual scene — fully customisable',
    category: 'inspiration',
    mediaType: 'image',
    creditCost: CREDIT_COSTS.IMAGE,
    aspectRatio: '9:16',
    emoji: '🎨',
    tags: ['custom', 'creative', 'freeform'],
    variables: [
      {
        key: 'scene',
        label: 'Your Scene',
        placeholder: 'Describe the spiritual scene you want...',
        type: 'text',
        required: true,
      },
      {
        key: 'mood',
        label: 'Mood',
        placeholder: 'Choose mood',
        type: 'select',
        options: ['Peaceful', 'Powerful', 'Celebratory', 'Meditative', 'Joyful'],
      },
    ],
    promptTemplate: `
{scene}. Overall mood: {mood}.
Sikh spiritual aesthetics — saffron, blue, gold, white tones where fitting.
${SAFE_SUFFIX}
    `.trim(),
  },
];

// ─── Category metadata ────────────────────────────────────────────────────────

export type TemplateCategory = import('@/types').TemplateCategory;

export const CATEGORY_META: Record<TemplateCategory, { label: string; emoji: string; description: string }> = {
  gurbani:     { label: 'Gurbani',      emoji: '📜', description: 'Quote cards, verse backgrounds, prayer cards' },
  gurpurab:    { label: 'Gurpurab',     emoji: '🎉', description: 'Festival posters for Sikh holy days' },
  khalsa:      { label: 'Khalsa',       emoji: '☬',  description: 'Khalsa symbols, artwork, and heritage' },
  reel:        { label: 'Reels',        emoji: '🎬', description: '9:16 video backgrounds for Instagram & YouTube' },
  inspiration: { label: 'Inspiration',  emoji: '✨', description: 'Daily motivation, gratitude, and peace cards' },
};
