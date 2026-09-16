import { UI_TEXT } from './ui';
import { STORY_SCRIPTS } from './stories';

export const UI_EN: typeof UI_TEXT = {
  HERO: { ...UI_TEXT.HERO, SUBTITLE: '', ACTION_MAIN: 'Begin Observation', ACTION_SUB: '', BAND_CN_NAME: '' },
  TIMELINE: { ...UI_TEXT.TIMELINE, TITLE: 'Star Map' },
  CONTACT: { ...UI_TEXT.CONTACT, TITLE_DEFAULT: 'Resonate With Us', TITLE_SENT: 'Signal Received', INPUT_MESSAGE_LABEL: 'What would you like to share?', INPUT_EMAIL_LABEL: 'Contact Email' },
  GAME: { ...UI_TEXT.GAME,
    INTRO_OBSERVING: 'Faint resonance detected… Establishing a connection…',
    SOUND_ADVICE: 'Enable sound for the full experience (this is a girl band game, after all!)',
    SOUND_BUTTON: 'Enable Sound & Enter', ROOM_TITLE: 'Rehearsal Room', ARCHIVES_TITLE: 'Personnel Archives',
    GALLERY_TITLE: 'Visual Records', DEMOS_TITLE: 'Demo Tapes',
    INSTRUCTION_AVOID: 'Press and hold to absorb resonance', INSTRUCTION_CONTROL: 'Release to create a repulsion wave',
    INSTRUCTION_RELEASE_STORY: 'Energy overflowing /// Release to enter the story',
  },
};

export const MEMBER_NAMES: Record<string, string> = {
  guitar_l: 'Seveen', bass: 'Linan', guitar_r: 'A.S.', keyboard: 'Yet', drums: 'Kiki', vocal: 'Weri',
};

// Keep each translation aligned with the original line; speaker IDs and expressions stay shared.
export const STORY_LINES_EN: Record<string, string[]> = {
  guitar_l: [
    '...Where even am I?', 'It’s so dark...', 'This silence is freaking one out...', 'Just keep playing... keep playing...',
    'I’m here!', 'Nothing... not even an echo...', 'Where is everyone...? I’m really scared...',
  ],
  bass: [
    '...!', 'Thank God, Linan!', 'You’re loud. I could hear you yelling from clear across the void.',
    'I was all alone just now... it was awful.', 'I heard your guitar.', 'A.S.’s too. She’s close.',
    'Linan always makes everything feel okay...', 'Don’t stop playing. Our music creates the pull. It’s drawing us back together.',
    'I’m trying! I’m not letting go of this!', 'You dork. Loosen up. You can’t play like that.',
  ],
  guitar_r: [
    'Sev slipped off the beat again.', 'Nice catch. Rhythm guitarist instincts.',
    'Listen, Sev. Strum, strum-strum, strum. The timing goes like this.',
    'A.S... my heart’s pounding so hard it’s messing up my rhythm...', 'Three are still missing.',
    'Focus. The field’s getting stronger.', 'Which means the chaotic matter is getting worse too.',
  ],
  keyboard: [
    'Was that you who woke me? That force... pushing, pulling, circling around me...', 'Took you forever.',
    'I got distracted by a new melody. Time slipped away from me a little.', 'Then I heard a call from here-sad, but strong enough to reach me anyway.',
    'Yet, hurry up and join us!', 'Did you practice, Yet?', '...No. Sorry.', '...', 'Linan didn’t practice either.', '.',
  ],
  drums: [
    'The void tried to swallow me whole!', 'Too bad for it—I’m gonna smash it to bits!',
    'Boom boom boom boom! As long as the beat keeps going, time and space keep moving!',
    'So don’t freak out!', 'To everyone who said we couldn’t do it—', 'Watch us prove you wrong!',
    'Kiki!!!', 'Yeah. It’s different once the drums kick in.', 'I’m actually gonna cry...',
    'Every instrument has found its place.', 'Not just the instruments...', 'Then let’s blow this whole place wide open together!',
  ],
  vocal: [
    '...', 'We’re all here.', 'Weri, you made it!!! I was so worried...', 'I remember now. My name.',
    'My voice... and the reason I exist.', 'Ah... it hurts. Too many memories all at once.',
    'What a chaotic, painful world this is...', 'Weri, Weri, don’t be sad...',
    'If anybody messes with you, I’m cracking their skull with my drumsticks!', 'Pain isn’t necessary.',
    'Don’t spend yourself on things that don’t deserve you...', 'Weri, no, don’t—if you cry, I’m gonna cry too...',
    'Look, I’ll play you the coolest riff ever!', 'Maybe this is where we end... a collapsar...',
    'An ancient star that can no longer bear its own gravity, falling forever into itself.',
    'We still don’t have enough energy.', 'The resonance medium is almost gone. There’s too much chaotic matter here.',
    'Hey, hey, don’t panic!', 'If we’re together, we can get through anything!',
    '“One must still have chaos in oneself to be able to give birth to a dancing star.”',
    '— Nietzsche, Thus Spoke Zarathustra', 'Maybe beyond resonance... chaos can be a kind of energy too.',
    'Press and hold the screen to absorb chaotic matter.',
  ],
  post_credits: [
    'Anyway, that was just a rough concept.', 'Why is everyone dead silent?', '...', 'Wow. Even our straight woman has nothing to say.',
    'More like there’s so much to roast I don’t know where to start.', 'Fair. The worldbuilding is kind of chuuni.',
    'This BGM sounds like something they’d play in a supermarket.', '...',
    '......\n.........', 'Damn it. You’re kind of right.', 'Stupid plastic keyboard...', '₍^. ̫ .^₎',
    'Anyway, this little story about Collapsar going on adventures and getting through hard times together—',
    'that’s still happening in real life too.',
    'If there’s anything you want to tell us, or if you find a bug, you can scroll down on the homepage and send it through the form there.',
    'You can also find us through the socials linked on the homepage.',
    'We’re active around Jiangsu, Zhejiang, and Shanghai, and we’re open for all kinds of performances.',
    'If you want to see what we can actually do, check out our Bilibili videos.',
    'You can also listen to demo versions of our original songs in the demo section at the bottom of the game screen. I might upload early versions to my own Bilibili later too.',
    'But Weri’s still in high school, so we couldn’t exactly drag her into the studio to record. For now, we only have the Vocaloid version and the one sung by A.S.\nAlso, school has been beating me to death lately, so I keep forgetting to update our socials.',
    'Anyway, I hope all of you come to love Collapsar .', 'That’s it for now. I desperately need sleep.',
  ],
};

export const STORIES_EN = Object.fromEntries(Object.entries(STORY_SCRIPTS).map(([id, lines]) => [
  id, lines.map((line, index) => ({ ...line, text: STORY_LINES_EN[id][index] })),
]));

export const GIG_TEXT_EN: Record<string, string> = {
  '扬州': 'Yangzhou', '苏州': 'Suzhou', '常州': 'Changzhou', '上海': 'Shanghai', '泰州': 'Taizhou',
  '尹珊湖大剧院': 'Yinshan Lake Grand Theatre', '排练室Live': 'Rehearsal Room Live',
  '智慧湾艺术剧场': 'Wisdom Bay Art Theatre', '鹤北咖啡': 'Hebei Cafe',
};
