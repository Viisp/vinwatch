export interface PhotoPrompt {
  id: string;
  angle: string;
  emoji: string;
  text: string;
}

export interface PromptCategory {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  prompts: PhotoPrompt[];
}

// Seeded the first time a user opens the page (before they've saved their
// own edits) — after that, DEFAULT_PROMPT_CATEGORIES is never read again;
// everything lives in Supabase (see src/lib/photo-prompts.ts).
export const DEFAULT_PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'generique',
    slug: 'generique',
    name: 'Générique',
    emoji: '✨',
    prompts: [
      {
        id: 'generique-logo',
        angle: 'Logo / Marque',
        emoji: '🏷️',
        text: "Ultra realistic 4K close-up of the original brand logo embroidered or printed on the garment, photographed straight-on (flat, perpendicular angle, no tilt), filling most of the frame while keeping surrounding fabric visible, razor-sharp embroidery or print details, realistic fabric weave and stitching, true-to-life colors, soft natural daylight, clean white carpet background slightly visible around the edges, preserve the original logo exactly as-is, no redesign, no enhancement, no distortion, no added text. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Ideal for a premium Vinted listing, square 1:1.",
      },
      {
        id: 'generique-etiquette',
        angle: 'Étiquette',
        emoji: '🔖',
        text: "Ultra realistic 4K close-up of the original clothing label laid flat on a clean white carpet, photographed straight-on, clearly showing the brand, size and care label, sharp readable text, realistic stitching and fabric texture, true-to-life colors, natural lighting, preserve every detail exactly as-is, no redesign, no fake labels, no distortion, no added text. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing style, square 1:1.",
      },
    ],
  },
  {
    id: 'tshirt',
    slug: 'tshirt',
    name: 'T-shirt',
    emoji: '👕',
    prompts: [
      {
        id: 'tshirt-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a single t-shirt laid perfectly flat on a clean white carpet, front view, fully visible, centered composition, sleeves perfectly aligned, collar naturally shaped, fabric smooth with a naturally ironed appearance, true-to-life colors, highly detailed cotton texture, soft natural daylight, realistic presentation, preserve the exact garment shape, no model, no hands, no accessories, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Ideal for a premium Vinted listing, square 1:1.",
      },
      {
        id: 'tshirt-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same t-shirt laid perfectly flat on a clean white carpet, back view, fully visible, centered composition, sleeves symmetrical, collar naturally aligned, smooth fabric, true-to-life colors, highly detailed cotton texture, clean stitching, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
  {
    id: 'chemise',
    slug: 'chemise',
    name: 'Chemise',
    emoji: '👔',
    prompts: [
      {
        id: 'chemise-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a neatly ironed shirt laid perfectly flat on a clean white carpet, front view, fully visible, centered composition, sleeves symmetrically extended, collar perfectly shaped, button placket perfectly straight, buttons aligned, smooth fabric with true-to-life colors, highly detailed fabric weave, soft natural daylight, preserve the original shirt exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'chemise-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same shirt laid perfectly flat on a clean white carpet, back view, fully visible, centered composition, sleeves symmetrical, collar naturally shaped, smooth fabric, highly detailed stitching and fabric texture, true-to-life colors, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'chemise-pliee',
        angle: 'Pliée',
        emoji: '🟣',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a neatly folded shirt placed perfectly flat on a clean white carpet, top-down view, fully visible, centered composition, folded edges perfectly straight and symmetrical, sleeves neatly tucked and aligned behind the fold, collar visible and perfectly shaped, smooth fabric with true-to-life colors, highly detailed fabric weave, soft natural daylight, preserve the original shirt exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
  {
    id: 'short',
    slug: 'short',
    name: 'Short',
    emoji: '🩳',
    prompts: [
      {
        id: 'short-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a single pair of shorts laid perfectly flat on a clean white carpet, front view, fully visible, centered composition, waistband perfectly straight, pockets naturally aligned, smooth fabric, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'short-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same pair of shorts laid perfectly flat on a clean white carpet, back view, fully visible, centered composition, back pockets clearly visible, realistic stitching, smooth fabric, true-to-life colors, highly detailed texture, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
  {
    id: 'sweat',
    slug: 'sweat',
    name: 'Sweat',
    emoji: '🎽',
    prompts: [
      {
        id: 'sweat-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a sweatshirt laid perfectly flat on a clean white carpet, front view, fully visible, centered composition, sleeves symmetrical, collar naturally shaped, ribbed cuffs and waistband clearly visible, smooth fleece or cotton fabric, true-to-life colors, highly detailed texture, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'sweat-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same sweatshirt laid perfectly flat on a clean white carpet, back view, fully visible, centered composition, clean back panel, realistic stitching, true-to-life colors, highly detailed fabric texture, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
  {
    id: 'veste',
    slug: 'veste',
    name: 'Veste',
    emoji: '🧥',
    prompts: [
      {
        id: 'veste-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a jacket laid perfectly flat on a clean white carpet, front view, fully visible, centered composition, zipper perfectly straight, collar naturally shaped, sleeves symmetrical, smooth outer fabric, true-to-life colors, highly detailed material texture, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'veste-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same jacket laid perfectly flat on a clean white carpet, back view, fully visible, centered composition, clean back panel, realistic seams, highly detailed outer fabric texture, true-to-life colors, soft natural daylight, preserve the original garment exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'veste-pliee',
        angle: 'Pliée',
        emoji: '🟣',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a neatly folded jacket placed perfectly flat on a clean white carpet, top-down view, fully visible, centered composition, folded edges perfectly straight and symmetrical, sleeves neatly tucked and aligned behind the fold, collar and lapels visible and perfectly shaped, smooth fabric with true-to-life colors, highly detailed fabric weave and stitching, soft natural daylight, preserve the original jacket exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
  {
    id: 'jean',
    slug: 'jean',
    name: 'Jean',
    emoji: '👖',
    prompts: [
      {
        id: 'jean-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a single pair of jeans laid perfectly flat on a clean white carpet, front view, fully visible, centered composition, waistband perfectly straight, pockets aligned, true-to-life denim colors, highly detailed denim weave and stitching, soft natural daylight, preserve the original jeans exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'jean-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same pair of jeans laid perfectly flat on a clean white carpet, back view, fully visible, centered composition, back pockets clearly visible, highly detailed stitching, realistic denim texture, true-to-life colors, soft natural daylight, preserve the original jeans exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
  {
    id: 'chaussures',
    slug: 'chaussures',
    name: 'Chaussures',
    emoji: '👟',
    prompts: [
      {
        id: 'chaussures-face',
        angle: 'Face',
        emoji: '🟢',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a pair of shoes placed neatly side by side on a clean white carpet, front view, centered composition, perfectly aligned, true-to-life colors, highly detailed material texture, sharp toe shape, realistic laces, soft natural daylight, preserve the original shoes exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'chaussures-dos',
        angle: 'Dos',
        emoji: '🔵',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same pair of shoes placed neatly side by side on a clean white carpet, back view, centered composition, highly detailed heel construction and stitching, true-to-life colors, soft natural daylight, preserve the original shoes exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'chaussures-cote',
        angle: 'Côté',
        emoji: '🟡',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of the same pair of shoes placed neatly side by side on a clean white carpet, side profile, centered composition, sole profile clearly visible, highly detailed material texture, true-to-life colors, soft natural daylight, preserve the original shoes exactly as-is, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, logo placement, stitching, and any authentic signs of wear. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
      {
        id: 'chaussures-semelle',
        angle: 'Semelle',
        emoji: '⚫',
        text: "Ultra realistic 4K premium second-hand marketplace product photo of a single shoe flipped over to show the sole, placed on a clean white carpet, direct top-down view of the outsole, centered composition, tread pattern and wear clearly visible, true-to-life colors, highly detailed rubber and material texture, soft natural daylight, no model, no hands, no extra objects. Preserve the exact proportions, fit, color, and any authentic signs of wear such as tread wear, scuffs, or dirt. Do not beautify, alter, repair, or invent details. Do not remove or hide signs of wear, stains, or imperfections. Premium Vinted listing, square 1:1.",
      },
    ],
  },
];
