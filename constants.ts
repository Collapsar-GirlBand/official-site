import { Gig, SocialLink } from './types';

/**
 * ==========================================
 * 🎛️ CONFIGURATION CENTER (配置中心)
 * ==========================================
 * 在这里集中修改所有的链接和邮箱设置
 */

export const SITE_CONFIG = {
  // 1. 联系邮箱 (显示在网页上的文本)
  CONTACT_EMAIL: "3788499930@qq.com",
  
  // 2. 表单提交接口 (Form Endpoint) - 关键配置！
  // 必须修改！将下方的 URL 替换为 "https://formsubmit.co/你的真实接收邮箱"
  // 例如: "https://formsubmit.co/my-band-email@gmail.com"
  // 部署后，请务必亲自发送第一条测试消息，然后去该邮箱点击【Activate】激活链接，否则无法收到后续邮件。
  FORM_ENDPOINT: "https://formsubmit.co/3788499930@qq.com", 
};

// 3. 社交媒体链接 (Social Media Links)
export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'bilibili', name: 'BILIBILI', code: 'FREQ_B', url: 'https://space.bilibili.com/3546835205490826' },
  { id: '抖音', name: '抖音', code: 'FREQ_163', url: 'https://v.douyin.com/1dQ0eShtTNg/' },
  { id: 'XHS', name: 'XHS', code: 'FREQ_XHS', url: 'https://www.xiaohongshu.com/user/profile/61dda5fe00000000100094f2' },
  { id: 'instagram', name: 'INSTAGRAM', code: 'FREQ_IG', url: 'https://instagram.com' },
];


/**
 * ==========================================
 * 📅 GIGS DATA (演出数据)
 * ==========================================
 * 在 url 字段填入回顾视频或购票链接
 */

export const UPCOMING_GIG: Gig = {
  id: 0,
  date: '2025.12.22',
  location: '扬州',
  venue: 'Bang Dream Only',
  isUpcoming: true,
  url: '', // 示例链接
};

export const PAST_GIGS: Gig[] = [
  {
    id: 4,
    date: '2025.10.26',
    location: '苏州',
    venue: '尹珊湖大剧院',
    url: '', // 填入超链接
  },
  {
    id: 3,
    date: '2025.07.12',
    location: '常州',
    venue: '排练室Live',
    url: '', // 如果留空，则该条目不可点击
  },
  {
    id: 2,
    date: '2025.05.01',
    location: '上海',
    venue: '智慧湾艺术剧场',
    url: '', 
  },
  {
    id: 1,
    date: '2025.01.19',
    location: '泰州',
    venue: '鹤北咖啡',
    url: '',
  },
];
