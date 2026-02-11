import { BandMember, Gig, SocialLink } from '../types';
import { ASSETS } from './assets';

export const SITE_CONFIG = {
  CONTACT_EMAIL: "3788499930@qq.com",
  FORM_ENDPOINT: "https://formsubmit.co/3788499930@qq.com", 
};

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'bilibili', name: 'BILIBILI', code: 'FREQ_B', url: 'https://space.bilibili.com/3546835205490826' },
  { id: 'xhs', name: 'XIAOHONGSHU', code: 'FREQ_RED', url: 'https://www.xiaohongshu.com/user/profile/61dda5fe00000000100094f2' },
  { id: 'douyin', name: 'DOUYIN', code: 'FREQ_DY', url: 'https://v.douyin.com/1dQ0eShtTNg/' },
  { id: 'netease', name: 'NETEASE', code: 'FREQ_163', url: 'https://music.163.com/#/artist/album?id=99999655' },
];

// Thresholds based on MAX_SCORE = 2000
export const BAND_MEMBERS: BandMember[] = [
  {
    id: 'guitar_l',
    name: '挽七', // Wanqi
    role: 'GT. LEAD',
    bio: '有些爱哭的主音吉他手。但在黑暗中，她的琴声是第一个亮起的光点。',
    unlockThreshold: 400, // 20%
    audioTrack: ASSETS.AUDIO.GUITAR_LEAD,
    audioTrack2: ASSETS.AUDIO.GUITAR_LEAD_2, // Enable AABB Looping for Lead Guitar
    color: '#ef4444', // Red (Prompt Requirement)
    profileImage: ASSETS.IMAGES.WANQI.PROFILE,
    avatarImage: ASSETS.IMAGES.WANQI.AVATAR,
    evaluations: []
  },
  {
    id: 'bass',
    name: '霖安', // Linan
    role: 'BASS',
    bio: '沉稳的低音。在虚空中构筑起引力的骨架，拉住了差点飘散的同伴。',
    unlockThreshold: 600, // 30%
    audioTrack: ASSETS.AUDIO.BASS,
    color: '#ec4899', // Pink (Prompt Requirement)
    profileImage: ASSETS.IMAGES.LINAN.PROFILE,
    avatarImage: ASSETS.IMAGES.LINAN.AVATAR,
    evaluations: []
  },
  {
    id: 'guitar_r',
    name: 'AS', // AS
    role: 'GT. RHYTHM',
    bio: '节奏吉他。对拍子有着近乎强迫的执着，是混乱中的秩序维护者。',
    unlockThreshold: 1000, // 50%
    audioTrack: ASSETS.AUDIO.GUITAR_RHYTHM,
    color: '#404040', // Black/Dark Grey (Prompt Requirement: Black, adjusted for visibility)
    profileImage: ASSETS.IMAGES.AS.PROFILE,
    avatarImage: ASSETS.IMAGES.AS.AVATAR,
    evaluations: []
  },
  {
    id: 'keyboard',
    name: '未晓', // Weixiao
    role: 'KEYBOARD',
    bio: '容易沉浸在旋律中的键盘手。常常迟到，但总能带来意想不到的哲学视角。',
    unlockThreshold: 1200, // 60%
    audioTrack: ASSETS.AUDIO.KEYBOARD,
    color: '#15803d', // Dark Green (Prompt Requirement)
    profileImage: ASSETS.IMAGES.WEIXIAO.PROFILE,
    avatarImage: ASSETS.IMAGES.WEIXIAO.AVATAR,
    evaluations: []
  },
  {
    id: 'drums',
    name: '菜菜', // Caicai
    role: 'DRUMS',
    bio: '充满爆发力的鼓手。誓要震碎虚空的乐观主义者，团队的能量核心。',
    unlockThreshold: 1400, // 70%
    audioTrack: ASSETS.AUDIO.DRUMS, 
    color: '#3b82f6', // Blue (Prompt Requirement)
    profileImage: ASSETS.IMAGES.CAICAI.PROFILE,
    avatarImage: ASSETS.IMAGES.CAICAI.AVATAR,
    evaluations: []
  },
  {
    id: 'vocal',
    name: '维里', // Weili
    role: 'VOCAL',
    bio: '主唱。承载着记忆与痛苦的奇点。当她接受混沌之时，真正的坍缩星即将诞生。',
    unlockThreshold: 1600, // 80%
    audioTrack: ASSETS.AUDIO.VOCAL,
    color: '#ffffff', // White (Prompt Requirement)
    profileImage: ASSETS.IMAGES.WEILI.PROFILE,
    avatarImage: ASSETS.IMAGES.WEILI.AVATAR,
    evaluations: []
  }
];

export const DEMO_TRACKS = [
    { title: "Event Horizon (Demo)", duration: "3:45" },
    { title: "Singularity", duration: "4:12" },
    { title: "Chaos Theory (Improv)", duration: "2:30" },
    { title: "Red Shift", duration: "3:55" }
];

export const GALLERY_IMAGES = ASSETS.IMAGES.GALLERY;

export const UPCOMING_GIG: Gig = {
  id: 0,
  date: '2025.12.22',
  location: '扬州',
  venue: 'Bang Dream Only',
  isUpcoming: true,
  url: 'https://bilibili.com', 
};

export const PAST_GIGS: Gig[] = [
  {
    id: 4,
    date: '2025.10.26',
    location: '苏州',
    venue: '尹珊湖大剧院',
    url: 'https://bilibili.com/video/BVexample', 
  },
  {
    id: 3,
    date: '2025.07.12',
    location: '常州',
    venue: '排练室Live',
    url: '', 
  },
  {
    id: 2,
    date: '2025.05.01',
    location: '上海',
    venue: '智慧湾艺术剧场',
    url: 'https://bilibili.com', 
  },
  {
    id: 1,
    date: '2025.01.19',
    location: '泰州',
    venue: '鹤北咖啡',
    url: 'https://bilibili.com',
  },
];