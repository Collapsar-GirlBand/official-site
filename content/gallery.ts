// Put image files in public/gallery. Add one entry per image here; the filename
// is URL-encoded so Chinese characters, spaces, and punctuation work in Vite.
export interface GalleryItem {
  file: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
}

export const GALLERY_ITEMS: GalleryItem[] = [
  { file: '？！.webp', title: { zh: '？！', en: '?!' }, description: { zh: '一瞬间的惊讶，也被留在了画纸上。', en: 'A moment of surprise, caught on paper.' } },
  { file: '贝斯手力大如牛风情万种.webp', title: { zh: '贝斯手力大如牛风情万种', en: 'The Bassist' }, description: { zh: '属于贝斯手的一张特别记录。', en: 'A special portrait of the bassist.' } },
  { file: '菜菜小表情.webp', title: { zh: '菜菜小表情', en: "Kiki's Expression" }, description: { zh: '菜菜的表情速写。', en: "A quick study of Kiki's expression." } },
  { file: '高中生维里.webp', title: { zh: '高中生维里', en: 'Weri in High School' }, description: { zh: '关于维里过去的一页影像。', en: "A glimpse of Weri's school days." } },
  { file: '狗猫.webp', title: { zh: '狗猫', en: 'Dog & Cat' }, description: { zh: '两个身影，一段轻松的日常。', en: 'Two figures in a quiet everyday moment.' } },
  { file: '吉他包.webp', title: { zh: '吉他包', en: 'Guitar Case' }, description: { zh: '带着乐器出发的路上。', en: 'On the road, with an instrument in tow.' } },
  { file: '禁止吸烟（是棒棒糖）.webp', title: { zh: '禁止吸烟（是棒棒糖）', en: "No Smoking (It's a Lollipop)" }, description: { zh: '请放心，那只是一根棒棒糖。', en: "Don't worry—it's only a lollipop." } },
  { file: '霖安.webp', title: { zh: '霖安', en: 'Linan' }, description: { zh: '霖安的人物画。', en: 'A portrait of Linan.' } },
  { file: '伞as.webp', title: { zh: '伞下的 AS', en: 'A.S. with an Umbrella' }, description: { zh: '伞下的片刻，留给 AS。', en: 'A quiet moment under the umbrella with A.S.' } },
  { file: '随手画.webp', title: { zh: '随手画', en: 'Sketch' }, description: { zh: '从随手一笔开始的记录。', en: 'A moment captured in a casual sketch.' } },
  { file: '为什么一直戴着口罩？.webp', title: { zh: '为什么一直戴着口罩？', en: 'Why the Mask?' }, description: { zh: '一个关于口罩的小小疑问。', en: 'A little question about the mask.' } },
  { file: '小憩.webp', title: { zh: '小憩', en: 'A Short Rest' }, description: { zh: '忙碌之后，短暂地歇一会儿。', en: 'A brief pause after a busy day.' } },
  { file: '优雅菜菜.webp', title: { zh: '优雅菜菜', en: 'Elegant Kiki' }, description: { zh: '菜菜的另一种姿态。', en: 'Another side of Kiki.' } },
  { file: '主音吉他和主唱.webp', title: { zh: '主音吉他和主唱', en: 'Lead Guitar & Vocal' }, description: { zh: '主音吉他与主唱，同在一个画面里。', en: 'The lead guitarist and vocalist, together in one frame.' } },
  { file: '主音吉他是狗吗？！.webp', title: { zh: '主音吉他是狗吗？！', en: 'Is the Guitarist a Dog?!' }, description: { zh: '关于主音吉他手的玩笑话。', en: 'A playful question about the lead guitarist.' } },
  { file: 'old money挽七.webp', title: { zh: 'Old Money 挽七', en: 'Old Money Seveen' }, description: { zh: '挽七的一次特别造型。', en: 'A different look for Seveen.' } },
];

export const galleryImageUrl = (file: string) => `${import.meta.env.BASE_URL}gallery/${encodeURIComponent(file)}`;
