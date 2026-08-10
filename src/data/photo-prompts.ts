export interface PhotoPrompt {
  id: string;
  angle: string;
  emoji: string;
  text: string;
}

// A dropdown option whose `value` is the exact phrase substituted into a
// template's {item} / {background} placeholder — editable by the user just
// like the prompts themselves.
export interface PromptOption {
  id: string;
  label: string;
  value: string;
}

export interface PromptSettings {
  templates: PhotoPrompt[];
  clothingTypes: PromptOption[];
  backgrounds: PromptOption[];
}

const PRESERVE_SUFFIX =
  'Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.';

// Seeded the first time a user opens the page (before they've saved their
// own edits) — after that, these are never read again; everything lives in
// Supabase (see src/lib/photo-prompts.ts).
export const DEFAULT_CLOTHING_TYPES: PromptOption[] = [
  { id: 'tshirt', label: 'T-shirt', value: 'a t-shirt' },
  { id: 'chemise', label: 'Chemise', value: 'a neatly ironed shirt' },
  { id: 'sweat', label: 'Sweat', value: 'a sweatshirt' },
  { id: 'veste', label: 'Veste', value: 'a jacket' },
  { id: 'short', label: 'Short', value: 'a pair of shorts' },
  { id: 'jean', label: 'Jean', value: 'a pair of jeans' },
  { id: 'jogging', label: 'Jogging', value: 'a pair of jogging pants' },
  { id: 'chaussures', label: 'Chaussures', value: 'a pair of shoes, placed neatly side by side' },
];

export const DEFAULT_BACKGROUNDS: PromptOption[] = [
  { id: 'surface-blanche', label: 'Surface blanche', value: 'a clean white surface' },
  { id: 'parquet-clair', label: 'Parquet clair', value: 'a light-colored wooden parquet floor' },
  { id: 'tapis-noir', label: 'Tapis noir', value: 'a black carpet' },
  { id: 'blanc-uni', label: 'Blanc uni', value: 'a plain solid white background' },
  { id: 'beton-gris', label: 'Béton gris', value: 'a grey concrete floor' },
  { id: 'moquette', label: 'Moquette', value: 'a neutral beige carpet' },
];

export const DEFAULT_PROMPT_TEMPLATES: PhotoPrompt[] = [
  {
    id: 'face',
    angle: 'Face',
    emoji: '🟢',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item}, neatly positioned on {background}, front view, fully visible, centered composition, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'dos',
    angle: 'Dos',
    emoji: '🔵',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of the same {item}, neatly positioned on {background}, back view, fully visible, centered composition, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'pliee',
    angle: 'Pliée',
    emoji: '🟣',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item}, neatly folded, top-down view, fully visible, centered composition, folded edges perfectly straight and symmetrical, true-to-life colors, highly detailed material texture, soft natural daylight, presented on {background}, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'dessus',
    angle: 'Vue du ciel',
    emoji: '🔭',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item}, laid completely flat and fully unfolded on {background}, straight top-down bird's-eye view, centered composition, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'en-bas',
    angle: "Vue d'en bas",
    emoji: '🔽',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item} on {background}, extreme low-angle close-up view looking slightly upward, dramatic perspective, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'cote',
    angle: 'Côté',
    emoji: '🟡',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of the same {item} on {background}, side profile view, centered composition, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'cintre',
    angle: 'Sur cintre',
    emoji: '🪝',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item}, hanging neatly on a wooden hanger, front view, fully visible, centered composition, fabric falling naturally, true-to-life colors, highly detailed material texture, soft natural daylight, {background} softly visible in the background, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'mannequin',
    angle: 'Sur buste de mannequin',
    emoji: '🧍',
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item} displayed on a plain white mannequin bust, front view, fully visible, centered composition, natural fit and drape, true-to-life colors, highly detailed material texture, soft natural daylight, {background} softly visible in the background, preserve the original item exactly as-is, no model's face or body, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'semelle',
    angle: 'Semelle',
    emoji: '⚫',
    text: `Ultra realistic 4K close-up of the sole of {item}, flipped to show the outsole, direct top-down view, centered composition, tread pattern and wear clearly visible, true-to-life colors, highly detailed rubber and material texture, soft natural daylight, presented on {background}, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'logo',
    angle: 'Logo / Marque',
    emoji: '🏷️',
    text: `Ultra realistic 4K close-up of the original brand logo embroidered or printed on {item}, photographed straight-on (flat, perpendicular angle, no tilt), filling most of the frame while keeping surrounding fabric visible, razor-sharp embroidery or print details, realistic fabric weave and stitching, true-to-life colors, soft natural daylight, presented on {background} slightly visible around the edges, preserve the original logo exactly as-is, no redesign, no enhancement, no distortion, no added text. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'etiquette',
    angle: 'Étiquette',
    emoji: '🔖',
    text: `Ultra realistic 4K close-up of the original clothing label of {item} laid flat on {background}, photographed straight-on, clearly showing the brand, size and care label, sharp readable text, realistic stitching and fabric texture, true-to-life colors, natural lighting, preserve every detail exactly as-is, no redesign, no fake labels, no distortion, no added text. ${PRESERVE_SUFFIX}`,
  },
];
