const REFERENCE_BASE = "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/character-v1/";

export const DAILY_POST_CHARACTER = {
  id: "fartgirl-celebrity-v1",
  timeline: "Future, wealthy, single, globally famous and widely loved city superhero; not the working-barista comic design.",
  appearance: "Clearly adult woman, strikingly beautiful, glamorous, confident, athletic and curvy. Preserve the face, hair, complexion and adult proportions in the selected references, not the comic sheets.",
  emblem: 'Integrated chest emblem reading exactly "FART GIRL", following the garment and its lighting, never a floating text overlay.',
};

export const DAILY_POST_COSTUMES = [
  {
    id: "cape-skirt",
    colours: ["green", "gold", "small black boot accents"],
    garment: "Fitted long-sleeved superhero outfit with a short skirt, long cape and over-the-knee green boots with small black accents.",
    references: [
      { id: "cape-main", file: "grok-image-1ba933f4-e633-42a4-9a31-f691e51f9800.jpg", purple: false, gas: [], role: "primary" },
      { id: "cape-purple", file: "grok-image-b9f4a098-ee9a-4c1e-b324-0ee4a81fc7d5.jpg", purple: true, gas: [], role: "variant" },
      { id: "cape-purple-gas", file: "grok-image-63b32449-aa79-4ef4-bba2-1bf7cf3611cf.jpg", purple: true, gas: ["green", "purple"], role: "variant" },
      { id: "cape-green-gas", file: "grok-image-d15fbfae-2848-4deb-baf1-a31feb51f5c8.jpg", purple: true, gas: ["green"], role: "variant" },
    ],
  },
  {
    id: "mini-skirt",
    colours: ["green", "gold", "black boot accents"],
    garment: "Fitted long-sleeved superhero outfit with a short mini skirt and over-the-knee boots in green, gold and black. Match this reference's silhouette; do not borrow the long cape from costume one.",
    references: [
      { id: "mini-main", file: "grok-image-50d2b925-0fac-47cf-ae76-d33028fda5c1.jpg", purple: false, gas: [], role: "primary" },
      { id: "mini-purple", file: "grok-image-e25e7466-4fc3-4aa5-a5b9-eeafab02e48a.jpg", purple: true, gas: [], role: "variant" },
      { id: "mini-purple-gas", file: "grok-image-f931e5f2-b825-4724-8b78-e34e45b0a54e.jpg", purple: true, gas: ["green", "purple"], role: "variant" },
      { id: "mini-green-gas", file: "grok-image-34146489-0aee-4d43-ba33-15f4cbe147a8.jpg", purple: false, gas: ["green"], role: "variant" },
    ],
  },
  {
    id: "full-suit",
    colours: ["green", "gold", "very small black accents at boot bottoms"],
    garment: "One continuous fitted full-body suit: full-length sleeves, full-length legs and integrated boots. No skirt; do not mix in another costume's pieces.",
    references: [
      { id: "suit-main", file: "grok-image-a088a738-b877-4a82-b4ab-c0f1d6f0d76e.jpg", purple: false, gas: [], role: "primary" },
      { id: "suit-purple", file: "grok-image-ff508a29-abc1-438b-9263-15a2b2a1805c.jpg", purple: true, gas: [], role: "variant" },
      { id: "suit-green-gas", file: "grok-image-92033941-6a7e-4059-a870-30d4001d09bd.jpg", purple: false, gas: ["green"], role: "variant" },
      { id: "suit-purple-gas", file: "grok-image-2c4a75ea-48e7-446b-ac49-28864e5c3b18.jpg", purple: true, gas: ["green", "purple"], role: "variant" },
    ],
  },
];

export const DAILY_POST_REFERENCES = DAILY_POST_COSTUMES.flatMap((costume) => costume.references.map((reference) => ({
  ...reference,
  costumeId: costume.id,
  url: `${REFERENCE_BASE}${reference.file}`,
  use: `${DAILY_POST_CHARACTER.appearance} COSTUME: ${costume.garment} COLOURS: ${costume.colours.join(", ")}. ${reference.purple ? "Small purple accents permitted." : "Green and gold are dominant."} Gas in the reference is an effect example, not a required background or pose. ${DAILY_POST_CHARACTER.emblem}`,
})));

export function selectDailyPostReferences(visualDirection = {}) {
  const costumeId = visualDirection.costumeId || "cape-skirt";
  const references = DAILY_POST_REFERENCES.filter((reference) => reference.costumeId === costumeId);
  if (!references.length) throw new Error(`Unknown daily-post costume: ${costumeId}`);
  const primary = references.find((reference) => reference.role === "primary");
  if (visualDirection.wardrobe === "off-duty") {
    return [{ ...primary, use: `${DAILY_POST_CHARACTER.appearance} IDENTITY ONLY: copy her face and hair, NOT the superhero outfit, cape, boots, gas or reference pose. Wear the assigned off-duty clothes.` }];
  }
  const variant = references.find((reference) => reference.id === visualDirection.referenceId);
  return variant && variant !== primary ? [primary, variant] : [primary];
}