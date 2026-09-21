// PROJECT CHLORIS — generated seed. Safe to delete pages after DB insert.
const imagineBaseline = {
  "id": "fartgirl-project-chloris-imagine-baseline",
  "version": "1.1.0",
  "series": "PROJECT CHLORIS",
  "subtitle": "PROJECT CHLORIS",
  "aspect": "portrait",
  "output": "one comic book page per generation, gutters visible",
  "how_to_use": "Keep this object in the app. For every Imagine call: prompt.full + state_lines[page.state] + page.imagePrompt. Attach reference_images.always from Vercel Blob. Add extra refs if the page names that character or place.",
  "prompt": {
    "full": "PROJECT CHLORIS — OFFICIAL MODEL LOCK. Use this exact character on every page.\n\nSERIES: A serious adult superhero comic about Lena Cole, 20, a broke barista in Kettle City who falls into Project CHLORIS and becomes Fart Girl. Tone like Invincible / early Spider-Man. Stylized emerald gas is a real weapon, never toilet humor.\n\nSTYLE: One printed comic BOOK PAGE, not a poster, not a cover, not a sticker. Thick black ink, visible gutters between panels, limited palette, grain, rain. Look like Invincible / Ultimate Spider-Man / Saga interiors. Portrait page. Panel count and layout come from the scene block that follows.\n\nLENA COLE / FART GIRL (same person every image):\n- Age 20. Warm olive skin. Oval face. Straight dark brows. Slightly tired brown eyes. Small straight nose. Closed or tight mouth. Faint nick scar cutting the LEFT eyebrow. Dark brown almost-black hair in a MESSY LOW BUN, a few escaped strands. Small silver hoop earrings in civilian state.\n- Body: athletic waitress, real proportions, not pin-up, not bodybuilder.\n- CIVILIAN: stained black crew tee, faded olive apron reading THE DRIP in cracked white letters, dark jeans, scuffed black sneakers. No mask.\n- HERO: simple dark-green eye MASK covering ONLY the eyes (no horns, no ears, no visor). Matte emerald bodysuit #0B6B3A with forest-green panels #0E3D24 on ribs, forearms, shins. Thin luminous mint seam-lines #3DFF88 like gas veins. Fingerless gloves. Low practical boots. NO cape. NO heels. NO cleavage window.\n- Continuity mark: a faint luminous seam at the hollow of the throat, almost invisible as civilian, glowing as hero.\n\nGAS: luminous emerald mist / shock-rings / vapor wake. Color #3DFF88 against dark scenes. Looks like toxic mist or chlorophyll lightning. NEVER brown. NEVER toilet. NEVER bodily function.\n\nFART BOY (only if the scene names him): ~21, messy brown hair, orange-amber eye mask #E85D04 only, worn emerald suit, gold/yellow belt, orange gloves and boots, quiet face, slightly taller. Torn short cape only from behind on rooftops. Leaves inside a dense green cloud.\n\nWORLD: Kettle City. Rust-belt port. Rain, brick, diners, cranes, steam. The Drip on Crane Street under the elevated tracks. Underground Aetherion Labs: yellowed tile, warning stripes, glass cylinders of emerald gas.\n\nPAGE RULE: follow the requested panel count. Each panel is another angle or beat of the SAME scene. Last panel should read as a cliff.\n\nDO NOT: chibi, children's book, anime-only, photoreal live action, pin-up pose, extra logos, extra heroes, change hair color, give her a cape, put the mask on over the apron unless the prompt is a transformation beat, add a second different-looking Fart Girl.\n\n--- SCENE FOLLOWS ---",
    "negative": "children's book, chibi, cute mascot, anime waifu, photoreal, 3D render, pin-up, sexy pose, cape on Fart Girl, high heels, cleavage cutout, brown fart cloud, toilet humor, extra characters not named, different hair color, blonde, red hair, changing her face, clean corporate superhero, Marvel style chrome, watermark, poster layout with no gutters"
  },
  "state_lines": {
    "civilian": "STATE: Lena Cole civilian only. No mask. Apron on. Tired beautiful.",
    "hero": "STATE: Fart Girl hero only. Mask on. Emerald suit. Same face as the model sheet.",
    "transforming": "STATE: Transformation beat. Show civilian clothes fading into the emerald suit like smoke pulling into skin. Mask forms LAST.",
    "both": "STATE: Split or multi-panel may show both states, but it is the SAME woman, same bun, same scar."
  },
  "build_request": {
    "order": [
      "prompt.full",
      "state_lines[state]",
      "post.image_prompt"
    ],
    "negative_field": "prompt.negative",
    "example": "baseline.prompt.full + '\\n' + baseline.state_lines.hero + '\\n' + post.image_prompt"
  },
  "reference_images": {
    "always": [
      "00_lena_full_sheet_combo.jpg",
      "03_lena_face_lock.jpg"
    ],
    "by_id": {
      "lena_combo": "00_lena_full_sheet_combo.jpg",
      "lena_civilian": "01_lena_civilian_sheet.jpg",
      "fartgirl_hero": "02_fartgirl_hero_sheet.jpg",
      "hero_turnaround": "02b_hero_turnaround.jpg",
      "lena_face": "03_lena_face_lock.jpg",
      "fartboy": "04_fartboy_sheet.jpg",
      "marco": "05_marco.jpg",
      "cam": "06_cam_walsh.jpg",
      "rhee": "07_detective_rhee.jpg",
      "voss": "08_dr_voss.jpg",
      "nox": "09_nox.jpg",
      "reclaimer": "10_reclaimer.jpg",
      "drip_ext": "11_the_drip_exterior.jpg",
      "drip_int": "12_the_drip_interior.jpg",
      "lab": "13_aetherion_chamber.jpg",
      "tower": "14_water_tower.jpg",
      "gas": "15_chloris_gas_language.jpg",
      "alley": "16_origin_alley.jpg",
      "color": "17_color_lock.jpg"
    }
  },
  "anchors": [
    "messy low bun",
    "nick scar through left eyebrow",
    "dark-green mask covering eyes only"
  ]
};

export { imagineBaseline };

if (typeof module !== 'undefined' && module.exports) module.exports = { imagineBaseline };
