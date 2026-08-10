// Coarse silhouette family used to hide options that don't make physical
// sense for a given garment (a short can't go on a mannequin bust, a
// t-shirt has no sole).
export type ClothingKind = 'haut' | 'bas' | 'chaussure';

// A dropdown option whose `value` is the exact phrase substituted into a
// mode's placeholder ({item} / {angle} / {pose} / {background}) — editable
// by the user just like the modes themselves.
export interface PromptOption {
  id: string;
  label: string;
  value: string;
  // Only meaningful on clothingTypes entries.
  kind?: ClothingKind;
  // Only meaningful on poses entries. Omitted/empty = available for every kind.
  restrictTo?: ClothingKind[];
}

// A "type de photo": how the final prompt is assembled. The three close-up
// modes (logo/étiquette/semelle) only need {item} and {background} — the
// pose/angle pickers are irrelevant for a close-up and stay hidden for them.
export interface PromptMode {
  id: string;
  name: string;
  emoji: string;
  text: string;
  usesPoseAngle: boolean;
  // Omitted/empty = available for every clothing kind.
  restrictTo?: ClothingKind[];
}

export interface PromptSettings {
  modes: PromptMode[];
  clothingTypes: PromptOption[];
  angles: PromptOption[];
  poses: PromptOption[];
  backgrounds: PromptOption[];
}

const PRESERVE_SUFFIX =
  'Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.';

// Seeded the first time a user opens the page (before they've saved their
// own edits) — after that, these are never read again; everything lives in
// Supabase (see src/lib/photo-prompts.ts).
export const DEFAULT_CLOTHING_TYPES: PromptOption[] = [
  { id: 'tshirt', label: 'T-shirt', kind: 'haut', value: 'a t-shirt, sleeves perfectly aligned, collar naturally shaped, fabric smooth with a naturally ironed appearance, highly detailed cotton texture' },
  { id: 'chemise', label: 'Chemise', kind: 'haut', value: 'a neatly ironed shirt, sleeves symmetrically extended, collar perfectly shaped, button placket perfectly straight, buttons aligned, highly detailed fabric weave' },
  { id: 'sweat', label: 'Sweat', kind: 'haut', value: 'a sweatshirt, sleeves symmetrical, collar naturally shaped, ribbed cuffs and waistband clearly visible, smooth fleece or cotton fabric texture' },
  { id: 'veste', label: 'Veste', kind: 'haut', value: 'a jacket, zipper perfectly straight, collar naturally shaped, sleeves symmetrical, smooth outer fabric texture' },
  { id: 'short', label: 'Short', kind: 'bas', value: 'a pair of shorts, waistband perfectly straight, pockets naturally aligned, highly detailed material texture' },
  { id: 'jean', label: 'Jean', kind: 'bas', value: 'a pair of jeans, waistband perfectly straight, pockets aligned, true-to-life denim colors, highly detailed denim weave and stitching' },
  { id: 'jogging', label: 'Jogging', kind: 'bas', value: 'a pair of jogging pants, waistband perfectly straight, ribbed cuffs clearly visible, highly detailed fabric texture' },
  { id: 'chaussures', label: 'Chaussures', kind: 'chaussure', value: 'a pair of shoes, sharp toe shape, realistic laces, highly detailed material texture' },
];

export const DEFAULT_ANGLES: PromptOption[] = [
  { id: 'face', label: 'Face', value: 'front view' },
  { id: 'dos', label: 'Dos', value: 'back view' },
  { id: 'cote', label: 'Côté', value: 'side profile view' },
  { id: 'ciel', label: 'Vue du ciel', value: "straight top-down bird's-eye view" },
  { id: 'bas', label: "Vue d'en bas", value: 'extreme low-angle close-up view looking slightly upward, dramatic perspective' },
];

export const DEFAULT_POSES: PromptOption[] = [
  { id: 'sol', label: 'Posé à plat', restrictTo: ['haut', 'bas'], value: 'laid perfectly flat' },
  { id: 'plie', label: 'Plié', restrictTo: ['haut', 'bas'], value: 'neatly folded, folded edges perfectly straight and symmetrical' },
  { id: 'cintre', label: 'Sur cintre', restrictTo: ['haut'], value: 'hanging neatly on a wooden hanger, fabric falling naturally' },
  { id: 'mannequin', label: 'Sur buste de mannequin', restrictTo: ['haut'], value: 'displayed on a plain white mannequin bust, natural fit and drape' },
  { id: 'cote-a-cote', label: 'Côte à côte', restrictTo: ['chaussure'], value: 'placed neatly side by side, perfectly aligned' },
];

export const DEFAULT_BACKGROUNDS: PromptOption[] = [
  { id: 'surface-blanche', label: 'Surface blanche', value: 'a clean white surface' },
  { id: 'parquet-clair', label: 'Parquet clair', value: 'a light-colored wooden parquet floor' },
  { id: 'tapis-noir', label: 'Tapis noir', value: 'a black carpet' },
  { id: 'blanc-uni', label: 'Blanc uni', value: 'a plain solid white background' },
  { id: 'beton-gris', label: 'Béton gris', value: 'a grey concrete floor' },
  { id: 'moquette', label: 'Moquette', value: 'a neutral beige carpet' },
];

export const DEFAULT_PROMPT_MODES: PromptMode[] = [
  {
    id: 'produit',
    name: 'Photo produit',
    emoji: '📸',
    usesPoseAngle: true,
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item}, {pose}, {angle}, fully visible, centered composition, true-to-life colors, soft natural daylight, presented on {background}, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'logo',
    name: 'Logo / Marque',
    emoji: '🏷️',
    usesPoseAngle: false,
    text: `Ultra realistic 4K close-up of the original brand logo embroidered or printed on {item}, photographed straight-on (flat, perpendicular angle, no tilt), filling most of the frame while keeping surrounding fabric visible, razor-sharp embroidery or print details, realistic fabric weave and stitching, true-to-life colors, soft natural daylight, presented on {background} slightly visible around the edges, preserve the original logo exactly as-is, no redesign, no enhancement, no distortion, no added text. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'etiquette',
    name: 'Étiquette',
    emoji: '🔖',
    usesPoseAngle: false,
    text: `Ultra realistic 4K close-up of the original clothing label of {item} laid flat on {background}, photographed straight-on, clearly showing the brand, size and care label, sharp readable text, realistic stitching and fabric texture, true-to-life colors, natural lighting, preserve every detail exactly as-is, no redesign, no fake labels, no distortion, no added text. ${PRESERVE_SUFFIX}`,
  },
  {
    id: 'semelle',
    name: 'Semelle',
    emoji: '⚫',
    usesPoseAngle: false,
    restrictTo: ['chaussure'],
    text: `Ultra realistic 4K close-up of the sole of {item}, flipped to show the outsole, direct top-down view, centered composition, tread pattern and wear clearly visible, true-to-life colors, highly detailed rubber and material texture, soft natural daylight, presented on {background}, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
  },
];
