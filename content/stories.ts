
import { StoryScript } from '../types';

/**
 * 🎬 STORY SCRIPTS (演出脚本)
 * Keys correspond to BAND_MEMBERS ids
 * Unlock Thresholds:
 * 20% (400)  - guitar_l (Wanqi)
 * 30% (600)  - bass (Linan)
 * 50% (1000) - guitar_r (AS)
 * 60% (1200) - keyboard (Weixiao)
 * 70% (1400) - drums (Caicai)
 * 80% (1600) - vocal (Weili)
 */
export const STORY_SCRIPTS: Record<string, StoryScript> = {
  // 20% - Wanqi (Guitar L)
  'guitar_l': [
    { speakerId: 'guitar_l', text: '……这是哪里？', expression: '77_confused_face.webp' },
    { speakerId: 'guitar_l', text: '好黑……', expression: '77_nervous_face.webp' },
    { speakerId: 'guitar_l', text: '令人毛骨悚然的寂静……', expression: '77_cry_face.webp' },
    { speakerId: 'guitar_l', text: '弹奏、弹奏……', expression: '77_nervous_face.webp' },
    { speakerId: 'guitar_l', text: '我在这里！', expression: '77_cry_face.webp' },
    { speakerId: 'guitar_l', text: '没有任何回声……', expression: '77_nervous_face.webp' },
    { speakerId: 'guitar_l', text: '大家在哪里……好担心……', expression: '77_cry_face.webp' },
  ],

  // 30% - Linan (Bass)
  'bass': [
    { speakerId: 'bass', text: '……！', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_l', text: '太好了是霖安！', expression: '77_happy_face.webp' },

    { speakerId: 'bass', text: '好吵，在虚空里都能听到你大喊大叫。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_l', text: '刚刚只有我一个人，特别可怜。', expression: '77_cry_face.webp' },
    { speakerId: 'bass', text: '我听到你的吉他声了，', expression: 'la_Unamused_face.webp' },
    { speakerId: 'bass', text: '还有as的，她就在附近。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_l', text: '霖安就是这样令人安心。', expression: '77_smile_face.webp' },
    { speakerId: 'bass', text: '不要停止弹奏，引力来自我们的音乐……拉紧我们。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_l', text: '我会努力的！绝对不松手！', expression: '77_happy (2)_face.webp' },
    { speakerId: 'bass', text: '笨蛋！不松手怎么弹？！', expression: 'la_angry_face.webp' },
  ],

  // 50% - AS (Guitar R)
  'guitar_r': [
    { speakerId: 'guitar_r', text: '刚刚那一拍，77的节奏又弹错了。', expression: 'as_serious (2)_face.webp' },
    { speakerId: 'bass', text: '节奏吉他的洞察力。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_r', text: '七七听，铮铮铮铮，这个音的时值是这样。', expression: 'as_thinking_face.webp' },
    { speakerId: 'guitar_l', text: '呜呜as……我心跳太快，影响拍子了。', expression: '77_cry_face.webp' },
    { speakerId: 'guitar_r', text: '还有三人……依旧迷失……', expression: 'as_sad_face.webp' },
    { speakerId: 'bass', text: '集中注意力，我们的引力场越来越大了。', expression: 'la_angry_face.webp' },
    { speakerId: 'guitar_r', text: '也意味着更多危险的混沌杂质。', expression: 'as_serious_face.webp' },
  ],

  // 60% - Weixiao (Keyboard)
  'keyboard': [
    { speakerId: 'keyboard', text: '是你唤醒了我吗？那个不断斡旋和拉扯的力……', expression: 'wx_thinking_face.webp' },
    { speakerId: 'bass', text: '真慢。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'keyboard', text: '不小心沉浸在了新的旋律中，稍微耽误了一点时间。', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '直到此处悲伤却不失力量的呼唤召唤我而来。', expression: 'wx_sad_face.webp' },
    { speakerId: 'guitar_l', text: '小未快一起来！', expression: '77_happy (2)_face.webp' },
    { speakerId: 'guitar_r', text: '小未练习了吗？', expression: 'as_serious (2)_face.webp' },
    { speakerId: 'keyboard', text: '没练……抱歉。', expression: 'wx_sweat_face.webp' },
    { speakerId: 'bass', text: '……', expression: 'la_happy_face.webp' },
    { speakerId: 'keyboard', text: '霖安也没练。', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'bass', text: '。', expression: 'la_Unamused_face.webp' },
  ],

  // 70% - Caicai (Drums)
  'drums': [
    { speakerId: 'drums', text: '虚空想把我吞没！', expression: 'cc_thinking_face.webp' },
    { speakerId: 'drums', text: '但我偏要震碎它！', expression: 'cc_firm_face.webp' },
    { speakerId: 'drums', text: '砰砰砰砰，只要节奏不断，时空就会开始流动。', expression: 'cc_thinking_face.webp' },
    { speakerId: 'drums', text: '不要怕！', expression: 'cc_serious_face.webp' },
    { speakerId: 'drums', text: '那些说我们做不到的人！', expression: 'cc_firm_face.webp' },
    { speakerId: 'drums', text: '我们就做到给他们看！', expression: 'cc_manic_face.webp' },
    { speakerId: 'guitar_l', text: '菜菜！！！', expression: '77_happy (2)_face.webp' },
    { speakerId: 'bass', text: '鼓加进来就是不一样。', expression: 'la_smile_face.webp' },
    { speakerId: 'guitar_l', text: '好想哭……', expression: '77_smile_face.webp' },
    { speakerId: 'guitar_r', text: '所有乐器都找到了自己的归宿。', expression: 'as_smile_face.webp' },
    { speakerId: 'keyboard', text: '不只是乐器……', expression: 'wx_sad_face.webp' },
    { speakerId: 'drums', text: '我们一起把这里炸翻！', expression: 'cc_passionate_face.webp' },
  ],

  // 80% - Weili (Vocal)
  'vocal': [
    { speakerId: 'vocal', text: '……', expression: 'wr_serious_face.webp' },
    { speakerId: 'bass', text: '到齐了。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_l', text: '维里终于来了！！！我好担心……', expression: '77_cry_face.webp' },
    { speakerId: 'vocal', text: '想起来了，我的名字。', expression: 'wr_serious_face.webp' },
    { speakerId: 'vocal', text: '我的歌声、和存在的意义。', expression: 'wr_speak_face.webp' },
    { speakerId: 'vocal', text: '呜……好痛。太多记忆涌进来了。', expression: 'wr_sad_face.webp' },
    { speakerId: 'vocal', text: '如此混乱、痛苦的世界……', expression: 'wr_serious_face.webp' },
    { speakerId: 'drums', text: '维里维里不伤心……', expression: 'cc_thinking_face.webp' },
    { speakerId: 'drums', text: '谁敢欺负你我用鼓棒敲爆他的头！', expression: 'cc_serious_face.webp' },
    { speakerId: 'guitar_r', text: '痛苦并非必要之物。', expression: 'as_thinking_face.webp' },
    { speakerId: 'guitar_r', text: '不必为无用的存在耗费心力……', expression: 'as_sad_face.webp' },
    { speakerId: 'guitar_l', text: '维里不要啊你一哭我也想哭了……', expression: '77_nervous_face.webp' },
    { speakerId: 'guitar_l', text: '你看我给你弹个最帅的！', expression: '77_cry_face.webp' },
    { speakerId: 'vocal', text: '或许这里就是我们的终点，坍缩星……', expression: 'wr_speak_face.webp' },
    { speakerId: 'vocal', text: '古老的星体无以支撑自身的重力，向自己的中心无限坠落。', expression: 'wr_serious_face.webp' },
    { speakerId: 'bass', text: '我们的能量还不够。', expression: 'la_Unamused_face.webp' },
    { speakerId: 'guitar_r', text: '共鸣介质已经消失殆尽，这里的浑沌杂质太多了。', expression: 'as_thinking_face.webp' },
    { speakerId: 'drums', text: '别怕别怕！', expression: 'cc_comforting_face.webp' },
    { speakerId: 'drums', text: '只要我们在一起，什么都可以克服！', expression: 'cc_serious_face.webp' },
    { speakerId: 'keyboard', text: '“心怀混沌，方生舞星。”', expression: 'wx_thinking_face.webp' },
    { speakerId: 'keyboard', text: '——尼采《查拉图斯特拉如是说》', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '共鸣之外……或许混沌也是一种能量。', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'system', text: '长按屏幕以吸取浑沌杂质。', expression: 'system' },
  ],

  // Post Credits / Post Game
  'post_credits': [
    { speakerId: 'keyboard', text: '总之这就是我的一个粗糙的想法', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'keyboard', text: '大家为啥一言不发', expression: 'wx_thinking_face.webp' },
    { speakerId: 'bass', text: '……', expression: 'la_Unamused_face.webp' },
    { speakerId: 'keyboard', text: '吐槽役竟如此沉默', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'bass', text: '不如说是想吐槽的地方太多，导致有点无从下口了', expression: 'la_Unamused_face.webp' },
    { speakerId: 'keyboard', text: '确实世界观略显中二', expression: 'wx_serious_face.webp' },
    { speakerId: 'guitar_r', text: '这个bgm有种在逛大卖场的既视感', expression: 'as_thinking_face.webp' },
    { speakerId: 'keyboard', text: '……', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'keyboard', text: '…………', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'keyboard', text: '完了，还真有点那个意思……', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '该死的塑料键盘……', expression: 'wx_serious_face.webp' },
    { speakerId: 'guitar_r', text: '₍^. ̫ .^₎', expression: 'as_smile_face.webp' },
    { speakerId: 'keyboard', text: '总之可乐菩萨的大家一起冒险、共同渡过难关的小故事', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '在现实中也继续发生着', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '如果有什么想传达的话或者bug反馈，可以通过网页主页下滑进入表单界面提交给我', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '也可以通过网页主页的社交平台联系我们', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '我们在江浙沪一带活动，承接各种演出', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '技术力请参考我们的B站视频', expression: 'wx_serious (2)_face.webp' },
    { speakerId: 'keyboard', text: '我们的原创曲demos可以在游戏界面底端的demos界面试听，未来可能会在我的B站账号上放出先行版', expression: 'wx_serious_face.webp' },
    { speakerId: 'keyboard', text: '但因为维里还在上高中，没办法抓她录音，所以暂时只有虚拟歌姬和as唱的版本；另外因为学业一直在追杀我我也一直忘记营业', expression: 'wx_sweat_face.webp' },
    { speakerId: 'keyboard', text: '总之希望大家都来喜欢可乐菩萨', expression: 'wx_sad_face.webp' },
    { speakerId: 'keyboard', text: '那就先这样吧我真的需要睡眠', expression: 'wx_serious_face.webp' },
  ]
};
