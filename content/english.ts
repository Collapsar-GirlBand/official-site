import { UI_TEXT } from './ui';
import { STORY_SCRIPTS } from './stories';

export const UI_EN: typeof UI_TEXT = {
  HERO: { ...UI_TEXT.HERO, SUBTITLE: "A Girl Band from China's Yangtze Delta", ACTION_MAIN: 'Begin Observation', BAND_CN_NAME: '' },
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
  guitar_l: 'Wanqi', bass: 'Linan', guitar_r: 'AS', keyboard: 'Weixiao', drums: 'Caicai', vocal: 'Weili',
};

// Keep each translation aligned with the original line; speaker IDs and expressions stay shared.
export const STORY_LINES_EN: Record<string, string[]> = {
  guitar_l: [
    '…Where am I?', 'It is so dark…', 'This silence is terrifying…', 'Keep playing… keep playing…',
    'I am here!', 'Not even an echo…', 'Where is everyone…? I am so worried…',
  ],
  bass: [
    '…!', 'Thank goodness, it is Linan!', 'So loud. I can hear you shouting even in the void.',
    'I was all alone just now. It was awful.', 'I heard your guitar.', 'And AS, too. She is nearby.',
    'You always make me feel safe, Linan.', 'Keep playing. Our music creates gravity… Hold us together.',
    'I will do my best! I will never let go!', 'You dummy! How will you play if you never let go?!',
  ],
  guitar_r: [
    'Wanqi, you missed the beat again just now.', 'The rhythm guitarist notices everything.',
    'Listen, Qiqi. Strum, strum, strum, strum. That is how long this note lasts.',
    'AS… My heart is racing so fast it is throwing off my rhythm.', 'Three more… still lost…',
    'Focus. Our gravitational field is growing.', 'That also means more dangerous chaos particles.',
  ],
  keyboard: [
    'Was it you who woke me? That force, pulling and tugging…', 'Took you long enough.',
    'I got lost in a new melody and was delayed a little.', 'Until a sorrowful yet powerful call brought me here.',
    'Weixiao, come join us!', 'Have you practiced, Weixiao?', 'No… Sorry.', '…', 'Linan has not practiced either.', '.',
  ],
  drums: [
    'The void wants to swallow me!', 'But I am going to shatter it!',
    'Boom, boom, boom, boom! Keep the beat going, and space and time will start moving.',
    'Do not be afraid!', 'To everyone who said we could not do it…', 'We will prove you wrong!',
    'Caicai!!!', 'The drums really make a difference.', 'I could cry…',
    'Every instrument has found where it belongs.', 'Not just the instruments…', 'Let us blow this place away together!',
  ],
  vocal: [
    '…', 'Everyone is here.', 'Weili is finally here!!! I was so worried…', 'I remember my name now.',
    'My voice… and the reason I exist.', 'Ugh… It hurts. So many memories are flooding in.',
    'Such a chaotic, painful world…', 'Weili, please do not be sad…',
    'If anyone bullies you, I will bash their head with my drumsticks!', 'Pain is not a necessity.',
    'Do not waste your strength on things that serve no purpose…', 'Weili, please! If you cry, I will cry too…',
    'Look, I will play something really cool for you!', 'Perhaps this is our final destination… a collapsar.',
    'An ancient star can no longer withstand its own gravity, falling endlessly toward its center.',
    'We still do not have enough energy.', 'The resonance medium is nearly gone. There are too many chaos particles here.',
    'Do not be afraid!', 'As long as we are together, we can overcome anything!',
    '“One must still have chaos in oneself to give birth to a dancing star.”',
    '— Friedrich Nietzsche, Thus Spoke Zarathustra', 'Beyond resonance… perhaps chaos is another form of energy.',
    'Press and hold to absorb chaos particles.',
  ],
  post_credits: [
    'Anyway, that is my rough idea.', 'Why is everyone so quiet?', '…', 'Even our resident critic has nothing to say.',
    'There is so much to comment on that I do not know where to start.', 'The setting is a little overdramatic, I admit.',
    'This BGM makes me feel like I am wandering around a supermarket.', '…', '……',
    'Oh no. It really does sound like that…', 'This cursed plastic keyboard…', '₍^. ̫ .^₎',
    'Anyway, these little stories of COLLAPSAR going on adventures and overcoming difficulties together…',
    '…are still happening in real life, too.',
    'If you have a message or a bug report, scroll down on the home page and send it through the form.',
    'You can also reach us through the social links on the home page.',
    'We are active around Jiangsu, Zhejiang, and Shanghai, and available for all kinds of performances.',
    'Check out our Bilibili videos to hear us play.',
    'You can listen to our original demos in the game’s demo player. I may also release previews on my Bilibili account.',
    'Weili is still in high school, so we cannot get her into the studio yet. For now, we only have versions sung by a virtual singer or AS. Schoolwork also keeps chasing me, so I keep forgetting to post updates.',
    'Anyway, I hope you will all come to love COLLAPSAR.', 'That is all for now. I really need some sleep.',
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
