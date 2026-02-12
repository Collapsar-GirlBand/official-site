
export const ASSETS = {
  FONTS: {
    GOOGLE_PRECONNECT: "https://fonts.googleapis.com",
    GSTATIC_PRECONNECT: "https://fonts.gstatic.com",
    // Noto Serif SC
    MAIN_FONT: "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;500;700&display=swap"
  },
  IMAGES: {
    // Social / Meta
    OG_DEFAULT: "https://placehold.co/1200x630/000000/ffffff?text=COLLAPSAR",
    
    // Band Members
    WANQI: {
      PROFILE: 'https://placehold.co/1715x1640/220033/a855f7?text=WANQI',
      AVATAR: 'https://placehold.co/180x150/220033/a855f7?text=GT.L'
    },
    LINAN: {
      PROFILE: 'https://placehold.co/1715x1640/000033/3b82f6?text=LINAN',
      AVATAR: 'https://placehold.co/180x150/000033/3b82f6?text=BASS'
    },
    AS: {
      PROFILE: 'https://placehold.co/1715x1640/333300/eab308?text=AS',
      AVATAR: 'https://placehold.co/180x150/333300/eab308?text=GT.R'
    },
    WEIXIAO: {
      PROFILE: 'https://placehold.co/1715x1640/003333/14b8a6?text=WEIXIAO',
      AVATAR: 'https://placehold.co/180x150/003333/14b8a6?text=KEY'
    },
    CAICAI: {
      PROFILE: 'https://placehold.co/1715x1640/330000/ef4444?text=CAICAI',
      AVATAR: 'https://placehold.co/180x150/330000/ef4444?text=DRUMS'
    },
    WEILI: {
      PROFILE: 'https://placehold.co/1715x1640/111111/ffffff?text=WEILI',
      AVATAR: 'https://placehold.co/180x150/111111/ffffff?text=VOCAL'
    },
    
    // Gallery Images
    GALLERY: [
      "https://placehold.co/600x400/111/fff?text=Rehearsal_01",
      "https://placehold.co/600x400/222/fff?text=Stage_Dive",
      "https://placehold.co/600x800/333/fff?text=Backstage",
      "https://placehold.co/600x400/111/fff?text=Gear_Setup",
      "https://placehold.co/600x400/222/fff?text=Sunset",
      "https://placehold.co/600x800/333/fff?text=Poster_Art"
    ],

    // Sprite Base URL (GitHub Raw)
    SPRITE_BASE: "https://official-site-sand.vercel.app/sprites/"
  },
  AUDIO: {
    // Hosted on GitHub Raw
    // Mapping:
    // Wanqi (Lead Guitar) -> lg.m4a
    // Linan (Bass) -> bass.m4a
    // AS (Rhythm Guitar) -> rg.m4a
    // Weixiao (Keyboard) -> kb.m4a
    // Caicai (Drums) -> drum.m4a
    // Weili (Vocal) -> vocal.m4a (Assumed based on pattern, or fallback to placeholder if not present)
    
    GUITAR_LEAD: 'https://official-site-sand.vercel.app/audio/lg.m4a',
    GUITAR_LEAD_2: 'https://official-site-sand.vercel.app/audio/lg2.m4a',
    BASS: 'https://official-site-sand.vercel.app/audio/bass.m4a',
    GUITAR_RHYTHM: 'https://official-site-sand.vercel.app/audio/rg.m4a',
    KEYBOARD: 'https://official-site-sand.vercel.app/audio/kb.m4a',
    DRUMS: 'https://official-site-sand.vercel.app/audio/drum.m4a',
    VOCAL: 'https://official-site-sand.vercel.app/audio/vocal.m4a',
    ED: 'https://official-site-sand.vercel.app/audio/ed.m4a'
  }
};
