export default {
  "version": "1.0.0",
  "always_attach": [
    "00_lena_full_sheet_combo.jpg",
    "03_lena_face_lock.jpg"
  ],
  "then_attach_if_present": [
    "named character sheet",
    "location sheet"
  ],
  "max_refs_suggested": 4,
  "items": [
    {
      "id": "always_lena_combo",
      "file": "00_lena_full_sheet_combo.jpg",
      "attach": "always",
      "use": "Primary Lena civilian+hero sheet",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/00_lena_full_sheet_combo.jpg"
    },
    {
      "id": "lena_civilian",
      "file": "01_lena_civilian_sheet.jpg",
      "attach": "civilian scenes",
      "use": "Lena turnaround no mask",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/01_lena_civilian_sheet.jpg"
    },
    {
      "id": "fartgirl_hero",
      "file": "02_fartgirl_hero_sheet.jpg",
      "attach": "hero scenes",
      "use": "Suit lock",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/02_fartgirl_hero_sheet.jpg"
    },
    {
      "id": "hero_turnaround",
      "file": "02b_hero_turnaround.jpg",
      "attach": "optional hero",
      "use": "Front side back suit",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/02b_hero_turnaround.jpg"
    },
    {
      "id": "lena_face",
      "file": "03_lena_face_lock.jpg",
      "attach": "always if slot remains",
      "use": "Face + mask lock",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/03_lena_face_lock.jpg"
    },
    {
      "id": "fartboy",
      "file": "04_fartboy_sheet.jpg",
      "attach": "only when Fart Boy is in the scene",
      "use": "Subject Zero",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/04_fartboy_sheet.jpg"
    },
    {
      "id": "fartboy_alt",
      "file": "04b_fartboy_sheet_alt.jpg",
      "attach": "optional Boy",
      "use": "Alt Boy sheet with rooftop",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/04b_fartboy_sheet_alt.jpg"
    },
    {
      "id": "marco",
      "file": "05_marco.jpg",
      "attach": "when Marco is named",
      "use": "Night cook",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/05_marco.jpg"
    },
    {
      "id": "cam",
      "file": "06_cam_walsh.jpg",
      "attach": "when Cam is named",
      "use": "Intern journalist",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/06_cam_walsh.jpg"
    },
    {
      "id": "rhee",
      "file": "07_detective_rhee.jpg",
      "attach": "when Rhee is named",
      "use": "Detective",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/07_detective_rhee.jpg"
    },
    {
      "id": "voss",
      "file": "08_dr_voss.jpg",
      "attach": "when Voss is named",
      "use": "Aetherion director",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/08_dr_voss.jpg"
    },
    {
      "id": "nox",
      "file": "09_nox.jpg",
      "attach": "when Nox is named",
      "use": "Failed subject",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/09_nox.jpg"
    },
    {
      "id": "reclaimer",
      "file": "10_reclaimer.jpg",
      "attach": "when Reclaimers are named",
      "use": "Vacuum armor",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/10_reclaimer.jpg"
    },
    {
      "id": "drip_ext",
      "file": "11_the_drip_exterior.jpg",
      "attach": "diner exterior",
      "use": "Location",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/11_the_drip_exterior.jpg"
    },
    {
      "id": "drip_int",
      "file": "12_the_drip_interior.jpg",
      "attach": "diner interior",
      "use": "Location",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/12_the_drip_interior.jpg"
    },
    {
      "id": "lab",
      "file": "13_aetherion_chamber.jpg",
      "attach": "lab scenes",
      "use": "Origin chamber",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/13_aetherion_chamber.jpg"
    },
    {
      "id": "tower",
      "file": "14_water_tower.jpg",
      "attach": "rooftop / Boy watch scenes",
      "use": "Water tower",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/14_water_tower.jpg"
    },
    {
      "id": "gas",
      "file": "15_chloris_gas_language.jpg",
      "attach": "optional power scenes",
      "use": "How gas should look",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/15_chloris_gas_language.jpg"
    },
    {
      "id": "alley",
      "file": "16_origin_alley.jpg",
      "attach": "origin alley",
      "use": "Bean works alley",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/16_origin_alley.jpg"
    },
    {
      "id": "color",
      "file": "17_color_lock.jpg",
      "attach": "optional",
      "use": "Palette",
      "url": "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/17_color_lock.jpg"
    }
  ]
};