import { ASSETS } from './assets';

// 定义 JSON 的类型接口
export interface SpriteFrame {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

export interface SpriteJson {
  frames: Record<string, SpriteFrame>;
  meta: { size: { w: number; h: number }; image: string };
}

// 辅助函数：构建完整的图片 URL
const getSpriteUrl = (filename: string) => `${ASSETS.IMAGES.SPRITE_BASE}${filename}`;

// 角色 ID 到 图片文件 的映射配置
export const CHAR_CONFIG: Record<string, { json: SpriteJson; image: string }> = {
  // 对应 guitar_l (挽七)
  'guitar_l': {
    image: getSpriteUrl('77.webp'),
    json: {
      frames: {
        "77_smile_base.webp": { frame: { x: 0, y: 0, w: 1136, h: 2264 }, spriteSourceSize: { x: 363, y: 25, w: 1136, h: 2264 }, sourceSize: { w: 1600, h: 2300 } },
        "77_smile_face.webp": { frame: { x: 1136, y: 0, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } },
        "77_nervous_face.webp": { frame: { x: 1136, y: 1890, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } },
        "77_confused_face.webp": { frame: { x: 1136, y: 315, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } },
        "77_happy (2)_face.webp": { frame: { x: 1136, y: 630, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } },
        "77_happy_face.webp": { frame: { x: 1136, y: 945, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } },
        "77_serious_face.webp": { frame: { x: 1136, y: 1260, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } },
        "77_cry_face.webp": { frame: { x: 1136, y: 1575, w: 367, h: 315 }, spriteSourceSize: { x: 563, y: 122, w: 367, h: 315 }, sourceSize: { w: 1600, h: 2300 } }
      },
      meta: { size: { w: 1503, h: 2264 }, image: "sprites.webp" }
    }
  },

  // 对应 guitar_r (AS)
  'guitar_r': {
    image: getSpriteUrl('as.webp'),
    json: {
      frames: {
        "as_smile_base.webp": { frame: { x: 0, y: 0, w: 745, h: 1765 }, spriteSourceSize: { x: 538, y: 299, w: 745, h: 1765 }, sourceSize: { w: 1600, h: 2300 } },
        "as_smile_face.webp": { frame: { x: 745, y: 0, w: 215, h: 250 }, spriteSourceSize: { x: 684, y: 363, w: 215, h: 250 }, sourceSize: { w: 1600, h: 2300 } },
        "as_thinking_face.webp": { frame: { x: 745, y: 250, w: 215, h: 250 }, spriteSourceSize: { x: 684, y: 363, w: 215, h: 250 }, sourceSize: { w: 1600, h: 2300 } },
        "as_serious_face.webp": { frame: { x: 745, y: 500, w: 215, h: 250 }, spriteSourceSize: { x: 684, y: 363, w: 215, h: 250 }, sourceSize: { w: 1600, h: 2300 } },
        "as_sad_face.webp": { frame: { x: 745, y: 750, w: 215, h: 250 }, spriteSourceSize: { x: 684, y: 363, w: 215, h: 250 }, sourceSize: { w: 1600, h: 2300 } },
        "as_serious (2)_face.webp": { frame: { x: 745, y: 1000, w: 215, h: 250 }, spriteSourceSize: { x: 684, y: 363, w: 215, h: 250 }, sourceSize: { w: 1600, h: 2300 } }
      },
      meta: { size: { w: 960, h: 1765 }, image: "sprites.webp" }
    }
  },

  // 对应 keyboard (未晓)
  'keyboard': {
    image: getSpriteUrl('wx.webp'),
    json: {
      frames: {
        "wx_serious (2)_base.webp": { frame: { x: 0, y: 0, w: 770, h: 1720 }, spriteSourceSize: { x: 381, y: 227, w: 770, h: 1720 }, sourceSize: { w: 1600, h: 2100 } },
        "wx_serious (2)_face.webp": { frame: { x: 770, y: 82, w: 241, h: 197 }, spriteSourceSize: { x: 655, y: 356, w: 241, h: 197 }, sourceSize: { w: 1600, h: 2100 } },
        "wx_serious_face.webp": { frame: { x: 770, y: 279, w: 241, h: 197 }, spriteSourceSize: { x: 655, y: 356, w: 241, h: 197 }, sourceSize: { w: 1600, h: 2100 } },
        "wx_thinking_face.webp": { frame: { x: 770, y: 476, w: 241, h: 197 }, spriteSourceSize: { x: 655, y: 356, w: 241, h: 197 }, sourceSize: { w: 1600, h: 2100 } },
        "wx_sweat_face.webp": { frame: { x: 770, y: 673, w: 241, h: 197 }, spriteSourceSize: { x: 655, y: 356, w: 241, h: 197 }, sourceSize: { w: 1600, h: 2100 } },
        "wx_sad_face.webp": { frame: { x: 770, y: 870, w: 241, h: 197 }, spriteSourceSize: { x: 655, y: 356, w: 241, h: 197 }, sourceSize: { w: 1600, h: 2100 } }
      },
      meta: { size: { w: 1011, h: 1720 }, image: "sprites.webp" }
    }
  },

  // 对应 bass (霖安)
  'bass': {
    image: getSpriteUrl('la.webp'),
    json: {
      frames: {
        "la_smile_base.webp": { frame: { x: 0, y: 0, w: 1403, h: 2102 }, spriteSourceSize: { x: 79, y: 81, w: 1403, h: 2102 }, sourceSize: { w: 1600, h: 2300 } },
        "la_smile_face.webp": { frame: { x: 1488, y: 598, w: 308, h: 304 }, spriteSourceSize: { x: 835, y: 141, w: 308, h: 304 }, sourceSize: { w: 1600, h: 2300 } },
        "la_happy_face.webp": { frame: { x: 1488, y: 130, w: 308, h: 304 }, spriteSourceSize: { x: 835, y: 141, w: 308, h: 304 }, sourceSize: { w: 1600, h: 2300 } },
        "la_Unamused_face.webp": { frame: { x: 1488, y: 1100, w: 308, h: 304 }, spriteSourceSize: { x: 835, y: 141, w: 308, h: 304 }, sourceSize: { w: 1600, h: 2300 } },
        "la_angry_face.webp": { frame: { x: 1488, y: 1652, w: 308, h: 304 }, spriteSourceSize: { x: 835, y: 141, w: 308, h: 304 }, sourceSize: { w: 1600, h: 2300 } }
      },
      meta: { size: { w: 1796, h: 2102 }, image: "sprites.webp" }
    }
  },

  // 对应 drums (菜菜)
  'drums': {
    image: getSpriteUrl('cc.webp'),
    json: {
      frames: {
        "cc_comforting_base.webp": { frame: { x: 0, y: 0, w: 1724, h: 1527 }, spriteSourceSize: { x: 64, y: 392, w: 1724, h: 1527 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_comforting_face.webp": { frame: { x: 1724, y: 0, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_happy_face.webp": { frame: { x: 0, y: 1537, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_serious_face.webp": { frame: { x: 283, y: 1537, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_firm_face.webp": { frame: { x: 566, y: 1537, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_passionate_face.webp": { frame: { x: 849, y: 1537, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_manic_face.webp": { frame: { x: 1132, y: 1537, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } },
        "cc_thinking_face.webp": { frame: { x: 1415, y: 1537, w: 273, h: 202 }, spriteSourceSize: { x: 825, y: 513, w: 273, h: 202 }, sourceSize: { w: 2000, h: 2300 } }
      },
      meta: { size: { w: 1997, h: 1739 }, image: "sprites.webp" }
    }
  },

  // 对应 vocal (维里)
  'vocal': {
    image: getSpriteUrl('wr.webp'),
    json: {
      frames: {
        "wr_speak_base.webp": { frame: { x: 0, y: 0, w: 750, h: 1896 }, spriteSourceSize: { x: 505, y: 292, w: 920, h: 1896 }, sourceSize: { w: 1600, h: 2300 } },
        "wr_speak_face.webp": { frame: { x: 760, y: 110, w: 375, h: 237 }, spriteSourceSize: { x: 612, y: 416, w: 375, h: 237 }, sourceSize: { w: 1600, h: 2300 } },
        "wr_serious_face.webp": { frame: { x: 760, y: 424, w: 375, h: 237 }, spriteSourceSize: { x: 612, y: 416, w: 375, h: 237 }, sourceSize: { w: 1600, h: 2300 } },
        "wr_sad_face.webp": { frame: { x: 760, y: 1104, w: 375, h: 237 }, spriteSourceSize: { x: 612, y: 416, w: 375, h: 237 }, sourceSize: { w: 1600, h: 2300 } },
        "wr_happy_face.webp": { frame: { x: 760, y: 766, w: 375, h: 237 }, spriteSourceSize: { x: 612, y: 416, w: 375, h: 237 }, sourceSize: { w: 1600, h: 2300 } }
      },
      meta: { size: { w: 1135, h: 1896 }, image: "sprites.webp" }
    }
  }
};
