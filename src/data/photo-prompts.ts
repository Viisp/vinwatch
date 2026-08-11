// Coarse silhouette family used to hide options that don't make physical
// sense for a given garment (a short can't go on a mannequin bust, a
// t-shirt has no sole).
export type ClothingKind = 'haut' | 'bas' | 'chaussure';

// A dropdown option whose `value` is the exact phrase substituted into a
// mode's placeholder ({item} / {angle} / {pose} / {background}) — editable
// by the user just like the modes themselves.
// A pose is either "on a surface" (laid flat, folded, side by side -- the
// background is literally what the item sits on) or "in a room" (hanging,
// mannequin -- the background is a backdrop behind it, not underneath it).
// Backgrounds are tagged the same way so only the ones that make sense for
// the current pose show up (a t-shirt doesn't get "presented on a kitchen").
export type SceneFamily = 'surface' | 'piece';

export interface PromptOption {
  id: string;
  label: string;
  value: string;
  emoji?: string;
  // Only meaningful on clothingTypes entries.
  kind?: ClothingKind;
  // Only meaningful on poses entries. Omitted/empty = available for every kind.
  restrictTo?: ClothingKind[];
  // Meaningful on poses (which family of background it takes) and on
  // backgrounds (which family it belongs to). Defaults to 'surface'.
  family?: SceneFamily;
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

// Ids of every default entry the user's client has already merged in at
// least once, per list. Lets a later load tell "this default is brand new"
// (append it) apart from "the user deleted this default on purpose" (leave
// it gone) -- without this, a deleted default reappears on every reload
// since it's simply missing from the saved list, indistinguishable from
// one that was never added in the first place.
export interface KnownDefaultIds {
  modes: string[];
  clothingTypes: string[];
  angles: string[];
  poses: string[];
  backgrounds: string[];
}

export interface PromptSettings {
  modes: PromptMode[];
  clothingTypes: PromptOption[];
  angles: PromptOption[];
  poses: PromptOption[];
  backgrounds: PromptOption[];
  knownDefaultIds?: KnownDefaultIds;
}

const PRESERVE_SUFFIX =
  'Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.';

// Seeded the first time a user opens the page (before they've saved their
// own edits) — after that, these are never read again; everything lives in
// Supabase (see src/lib/photo-prompts.ts).
export const DEFAULT_CLOTHING_TYPES: PromptOption[] = [
  { id: 'tshirt', label: 'T-shirt', emoji: '👕', kind: 'haut', value: 'a t-shirt, sleeves perfectly aligned, collar naturally shaped, fabric smooth with a naturally ironed appearance, highly detailed cotton texture' },
  { id: 'chemise', label: 'Chemise', emoji: '👔', kind: 'haut', value: 'a neatly ironed shirt, sleeves symmetrically extended, collar perfectly shaped, button placket perfectly straight, buttons aligned, highly detailed fabric weave' },
  { id: 'sweat', label: 'Sweat', emoji: '🎽', kind: 'haut', value: 'a sweatshirt, sleeves symmetrical, collar naturally shaped, ribbed cuffs and waistband clearly visible, smooth fleece or cotton fabric texture' },
  { id: 'veste', label: 'Veste', emoji: '🧥', kind: 'haut', value: 'a jacket, zipper perfectly straight, collar naturally shaped, sleeves symmetrical, smooth outer fabric texture' },
  { id: 'short', label: 'Short', emoji: '🩳', kind: 'bas', value: 'a pair of shorts, waistband perfectly straight, pockets naturally aligned, highly detailed material texture' },
  { id: 'jean', label: 'Jean', emoji: '👖', kind: 'bas', value: 'a pair of jeans, waistband perfectly straight, pockets aligned, true-to-life denim colors, highly detailed denim weave and stitching' },
  { id: 'jogging', label: 'Jogging', emoji: '👖', kind: 'bas', value: 'a pair of jogging pants, waistband perfectly straight, ribbed cuffs clearly visible, highly detailed fabric texture' },
  { id: 'chaussures', label: 'Chaussures', emoji: '👟', kind: 'chaussure', value: 'a pair of shoes, sharp toe shape, realistic laces, highly detailed material texture' },
];

export const DEFAULT_ANGLES: PromptOption[] = [
  { id: 'face', label: 'Face', emoji: '🟢', value: 'front view' },
  { id: 'dos', label: 'Dos', emoji: '🔵', value: 'back view' },
  // Side/bird's-eye/low-angle only make sense for something laid on a
  // surface -- a hanging shirt or a mannequin bust doesn't have a
  // meaningful "top-down" or "side profile" shot the same way.
  { id: 'cote', label: 'Côté', emoji: '🟡', family: 'surface', value: 'side profile view' },
  { id: 'ciel', label: 'Vue du ciel', emoji: '🔭', family: 'surface', value: "straight top-down bird's-eye view" },
  { id: 'bas', label: "Vue d'en bas", emoji: '🔽', family: 'surface', value: 'extreme low-angle close-up view looking slightly upward, dramatic perspective' },
];

export const DEFAULT_POSES: PromptOption[] = [
  { id: 'sol', label: 'Posé à plat', emoji: '🧺', restrictTo: ['haut', 'bas'], family: 'surface', value: 'laid perfectly flat on {background}' },
  { id: 'plie', label: 'Plié', emoji: '📦', restrictTo: ['haut', 'bas'], family: 'surface', value: 'neatly folded on {background}, folded edges perfectly straight and symmetrical' },
  { id: 'cote-a-cote', label: 'Côte à côte', emoji: '👟', restrictTo: ['chaussure'], family: 'surface', value: 'placed neatly side by side on {background}, perfectly aligned' },
  { id: 'cintre', label: 'Sur cintre', emoji: '🪝', restrictTo: ['haut'], family: 'piece', value: 'hanging neatly on a wooden hanger, fabric falling naturally, with {background} softly visible and gently blurred behind it' },
  { id: 'mannequin', label: 'Sur buste de mannequin', emoji: '🧍', restrictTo: ['haut'], family: 'piece', value: 'displayed on a vintage fabric-covered dress form bust on a wooden tripod stand (not a plain plastic studio mannequin), natural fit and drape, photographed like a genuine candid home snapshot rather than a polished studio product shot, slightly imperfect framing, with {background} naturally visible around it' },
];

export const DEFAULT_BACKGROUNDS: PromptOption[] = [
  { id: 'surface-blanche', label: 'Surface blanche', emoji: '⬜', family: 'surface', value: 'a clean white surface' },
  { id: 'parquet-clair', label: 'Parquet clair', emoji: '🟫', family: 'surface', value: 'a light-colored wooden parquet floor' },
  { id: 'tapis-noir', label: 'Tapis noir', emoji: '⬛', family: 'surface', value: 'a black carpet' },
  { id: 'blanc-uni', label: 'Blanc uni', emoji: '⚪', family: 'surface', value: 'a plain solid white background' },
  { id: 'beton-gris', label: 'Béton gris', emoji: '🧱', family: 'surface', value: 'a grey concrete floor' },
  { id: 'moquette', label: 'Moquette', emoji: '🟤', family: 'surface', value: 'a neutral beige carpet' },
  { id: 'cuisine', label: 'Cuisine', emoji: '🍳', family: 'piece', value: 'a bright modern kitchen with clean countertops' },
  { id: 'chambre', label: 'Chambre', emoji: '🛏️', family: 'piece', value: 'a cozy bedroom with soft natural light' },
  { id: 'salon', label: 'Salon', emoji: '🛋️', family: 'piece', value: 'a stylish minimalist living room' },
  { id: 'dressing', label: 'Dressing', emoji: '🚪', family: 'piece', value: 'a walk-in closet with soft ambient lighting' },
  { id: 'studio-blanc', label: 'Studio blanc', emoji: '⬜', family: 'piece', value: 'a seamless plain white studio backdrop' },
];

export const DEFAULT_PROMPT_MODES: PromptMode[] = [
  {
    id: 'produit',
    name: 'Photo produit',
    emoji: '📸',
    usesPoseAngle: true,
    text: `Ultra realistic 4K premium second-hand marketplace product photo of {item}, {pose}, {angle}, fully visible, centered composition, true-to-life colors, soft natural daylight, preserve the original item exactly as-is, no model, no hands, no extra objects. ${PRESERVE_SUFFIX}`,
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
