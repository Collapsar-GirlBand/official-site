# JIZURA 生长型装饰（Growth Decor）解耦开发与复用指南

本指南定义了 JIZURA 中所有“有机/过程式生长装饰”（如植物藤蔓 Florilegium、菌丝根系 Hyphae、闪电电弧 Lightning、冰霜树枝结晶 Frost、玻璃蛛网碎裂 Glass、极光天幕流场 Aurora、地裂 Fracture、赛博回路 Circuit 等）的统一基础设施、API 规范以及如何让 AI Agent 在未来会话中无缝复用。

---

## 一、解耦架构核心：`J.GROW` (位于 `src/07b_grow_core.js`)

所有生长型装饰的通用基础设施均统一收拢在全局命名空间 `J.GROW` 中，包含以下 5 大解耦模块：

### 1. 空间与避让底盘 (`J.GROW.createField`)
将“文字避让、画布边界安全区、用户自选生长区、格网距离场、空隙探测”完全从具体画笔中解耦：
```javascript
const field = J.GROW.createField(env, bb0, P, opts);
```
* **文字避让**：自动从 `bb0` 获取排版包围盒（若 `bb0` 为 null 则自动安全兜底，永不报错），外扩 `textPad` 生成 `safeBB`。
* **用户自定义生长区域**：自动解析 `P.preset`、`P.bounds`、`P.polygon`、`P.mask` 或全局注册的选区。
* **空隙与碰撞探测**：
  * `field.findMaxHole(minDist)`：查找当前画面最大空旷点（用于分枝或开花）。
  * `field.eraseDisc(cx, cy, radius, k)`：标记圆形区域已被占用。
  * `field.eraseRect(x0, y0, x1, y1)`：标记矩形区域已被占用。
  * `field.getRootAndTarget()`：解析发芽根节点与目标延伸方向。

### 2. 用户自选生长区域系统（User Growth Region & Anchors）
用户或上层调用者可通过多种方式自由控制生长区域，完全解耦：
* **命名锚点预设 (`P.anchor`)**：
  * `'bottom-left'` / `'bottom-right'`（左下角 / 右下角，默认）
  * `'bottom-center'`（从底部正中向上蔓延）
  * `'top-center'`（从顶部正中向下悬垂）
  * `'left'` / `'right'`（从左侧 / 右侧横向蔓延）
  * `'center'`（从屏幕中央向四周发散）
  * `'corners'`（四角对向生长）
  * `'surround'`（环绕文字外围生长）
* **精确根节点坐标 (`P.root` 或 `P.origin`)**：
  * 如 `P.root = [0.5, 0.95]`（支持 0~1 归一化坐标或绝对像素坐标）。
* **区域边界限制 (`P.bounds` 或 `P.zone`)**：
  * 如 `P.bounds = [0, 0.7, 1, 1]`（仅限底部 30% 区域生长，主干与分支不会溢出）。
* **多边形选区与擦除掩膜 (`P.polygon`, `P.mask`, `P.erase`)**：
  * 支持传入任意多边形顶点 `[[x0, y0], [x1, y1], ...]`。
  * 支持自定义擦除排除区 `erase: [{ cx: 500, cy: 500, r: 80 }]`。
* **动态/跨 Cut 配置 API**：
  ```javascript
  J.setGrowthRegion(cutIndex, {
    preset: 'bottom',
    bounds: [0, 0.6, 1, 1],
    root: [0.5, 0.95],
    avoidText: true
  });
  ```

### 3. 确定性随机数与数学几何工具库
* `J.GROW.makeRng(seed)`：Mulberry32 纯确定性 PRNG，包含 `u()`, `range(a, b)`, `sym(a)`, `int(a, b)`, `chance(p)`, `pick(arr)`, `fork()`。
* `J.GROW.makeToneRamp(hex, opts)`：基于 Björn Ottosson 2020 OKLCH 色彩空间的感知均匀渐变生成器。
* `J.GROW.makeFbm1(rng, oct)`：1D FBM 梯度噪声生成器（用于藤蔓主干自然摆动）。
* `J.GROW.bezierHead(p0, p1, p2, p3, t)`：de Casteljau 三次贝塞尔前缀无损截取算法。
* `J.GROW.branchPath(rng, sx, sy, tx, ty, bx, by, ax, ay)`：相切平滑连接分枝曲线。
* `J.GROW.pointInPoly(x, y, poly)`：多边形射线法命中检测。

### 4. 生命周期与 Scrubbing 缓存包裹器 (`J.GROW.createRunner`)
统一处理 `env.pass !== 'main'` 守卫、复合缓存指纹、时间轴拖动（Scrubbing）进度 `pGrowth` 和透明度 `pAlpha` 计算：
```javascript
DEF.my_grow_decor = J.GROW.createRunner({
  name: '我的生长装饰',
  tags: ['生长', 'custom'],
  themeMode: 'my_theme',
  params: { density: 1.0, preset: 'default' },
  presets: {
    default: { density: 1.0 },
    dense: { density: 1.6 }
  },
  build(env, bb0, P, field, rng) {
    // 仅在 Cut 初始化或参数变更时执行一次（5~10ms）
    return { ... }; // 返回静态拓扑骨架
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    // 每一帧直接根据 pGrowth [0..1] 绘制
  }
});
```

### 5. 高性能批量渲染中间件
* `J.GROW.renderTaperedBuckets(ctx, buckets, pGrowth, opts)`：
  支持将数千根线段按粗细/层级分桶（Bucket by Generation），同一粗细仅调用一次 `ctx.stroke()`，彻底解决 Canvas 2D Draw Call 爆炸问题。
* `J.GROW.watercolorPass(ctx, renderShape, opts)`：
  解耦的水彩沉淀与纸纹高光材质渲染器。

---

## 二、未来会话中如何向 Agent 描述写生长装饰？

在之后的其他对话中，当你需要让 AI Agent 编写、复刻或修改任何生长类型的装饰时，**只需直接发送下面这句“提示词指令模版”**：

> **给 Agent 的提示指令模版**：
> “请在 JIZURA 中实现一个新的生长型装饰（例如：菌丝网络 / 闪电 / 珊瑚 / 冰裂 / 极光 / 冰霜），**严格复用 `src/07b_grow_core.js` 中的 `J.GROW` 基础设施**：
> 1. 使用 `J.GROW.createField(env, bb0, P)` 处理空间网格、文字避让和用户自选生长区域（支持 `P.anchor`、`P.root`、`P.bounds`）；
> 2. 使用 `J.GROW.createRunner` 实现按 Cut 的单次骨架预计算与 Scrubbing 时间轴平滑寻道；
> 3. 色彩使用 `J.GROW.makeToneRamp`，随机数使用 `J.GROW.makeRng(P.seed)`；
> 4. 若有大量分枝线段，使用 `J.GROW.renderTaperedBuckets` 做分桶批绘制以保持 60 FPS。”

---

## 三、主生成引擎合并与全谱系预设卡片架构（17 大独立卡片与丰富预设）

为消除重复代码，JIZURA 中所有 17 种生长装饰已归并为核心母版引擎，同时**在 UI 界面上依然保持 17 个独立可供选择的卡片**，且每个卡片均拥有专享的“预设胶囊按钮”：

### 1. 格网藤蔓空间填充母版引擎 (Lattice Vine Space-Filling) (`src/11p_decor_grow.js`)
- `grow_flora` (植物の成長・青花 - 经典青花水彩藤蔓与花卉，预设：标准青花、繁花盛放、枯木荆棘、常青藤蔓、孤芳折枝、林冠垂萝、左下生出)
- `grow_geometric` (植物の成長・折面幾何 - 折纸低多边形菱形几何，预设：折面几何、晶棱折面、千纸折痕、极简棱角、左下生出)
- `grow_cyber` (回路の成長・電脳 - 曼哈顿正交 PCB 导轨与 IC 芯片引脚，预设：标准回路、高密主板、高速总线、矩阵机柜、左下引出)
- `grow_frost` (氷霜の成長・樹枝結晶 - 冬日冰霜晶枝与六角雪花分形，预设：冰霜结晶、窗花羽霜、六角星簇、雾凇针晶、中央辐射、角隅凝结)

### 2. 脆性断裂物理模拟母版引擎 (Fracture Engine) (`src/11p_decor_fracture.js`)
- `fracture_burst` (地裂・衝撃破砕 - 震中径向爆裂冲击碎片，预设：标准冲击、爆裂冲击、微型破损、角隅爆轰、急速破裂、缓慢延伸)
- `fracture_crevasse` (地裂・断層地塹 - 斜向断层大裂谷与张力支裂，预设：断层地堑、深渊裂谷、剪切错动、对角撕裂、左下起断)
- `fracture_craquelure` (陶磁・貫入開片 - 哥窑青瓷开片金丝铁线，预设：贯入开片、金缮修复、宋瓷冰裂、鱼子细纹、角隅碎纹)
- `fracture_glass` (硝子の破砕・蜘蛛網裂紋 - 钢化玻璃受击同心圆张力环与放射裂纹，预设：蛛网破裂、弹着碎裂、张力暗裂、边缘受击、中央击穿)

### 3. 调和流场母版引擎 (Harmonic Flow Field) (`src/11p_decor_fidenza.js`)
- `grow_fidenza` (流場の成長・フィデンツァ - 多尺度流动马赛克色块条带，预设：标准流场、湍流漩涡、平缓层流、巨构宽幅、波普狂想、画面中央)
- `grow_fidenza_line` (流場の成長・細線画 - 极简流线与速度感线条，预设：标准细线、三千银丝、等高线律、霓虹导线、角隅流出)
- `grow_aurora` (極光の成長・天幕帯流 - 空灵北极光飘带与天顶流光帷幔，预设：极光飘带、翡翠帷幔、紫极风暴、空灵静流、浩瀚天顶、地平起浪)

### 4. 圆堆积尖端生长母版引擎 (Inconvergent Hyphae Circle-Packing Tip Growth) (`src/11p_decor_grow.js`)
- `grow_hyphae` (植物の成長・菌絲網 - 标准有机菌丝网络与孢子节点，预设：标准菌丝、密生丛林、稀疏细根、孢子爆发、极细末梢、左下根系、右下根系、中央辐射)
- `grow_lightning` (放電の成長・樹状電弧 - 树状高压电弧与利希滕贝格击穿图样，预设：标准电弧、强力过载、微弱静电、天顶落雷、地表击穿、角隅轰击)
- `grow_coral` (珊瑚の成長・深海群生 - 半透明重叠水螅体群生珊瑚礁，预设：浅海珊瑚、丛生海葵、孤生水螅、左下礁岩、右下礁岩、中央辐射)
- `grow_neural` (神経の成長・シナプス網 - 大脑皮层锥体神经元中枢、轴突树突与动作电位光斑传导，预设：大脑皮层、密集突触、稀疏轴突、神经中枢、神经投射)

### 5. 多智能体趋化网络 (Physarum Slime Mold) (`src/11p_decor_grow.js`)
- `grow_physarum` (植物の成長・粘菌網 - 原生质微循环网络，预设：标准粘菌、血管新生、迷宫漫游、荧光脉动、密集原浆、稀疏探触)

### 6. 螺旋卷须与展开形态 (Spiral Tendril & Vernation) (`src/11p_decor_grow.js`)
- `grow_tendril` (植物の成長・螺旋巻髭 - 对数螺旋卷须与蕨类拳芽展开，预设：标准卷须、蕨类蜷曲、常春藤须、黄金螺旋、野性缠绕、左下卷出)

---

## 四、兼容性与微调系统

- **数据结构双模兼容**：`cut.decor` 和 `tech.decor` 既可直接传字符串 ID（如 `'grow_flora'`），也支持传完整的参数对象：
  ```javascript
  {
    id: 'grow_flora',
    preset: 'bloom',
    density: 1.5,
    anchor: 'bottom-left',
    avoidText: true
  }
  ```
- **实时预设与滑块**：UI 的 Shot Tech Picker 在选中任意生长装饰时，自动呼出专用的“🌱 生长预设与微调”面板：
  - 点击对应部件专属的预设胶囊按钮，秒级重绘预览；
  - 0.3x ~ 2.0x 连续密度滑杆即时调整分枝稀疏度；
  - 文字避让开关即时开关排斥力场。
- **多装饰多层复合缓存**：`SHARED_GROWTH_CACHE` 采用复合指纹键（`themeMode:seedVal:preset:density:anchor:avoidText:bounds:WxH`），单 Cut 挂载多部件互不覆盖，参数变更时实时响应，时间轴任意 Scrubbing 时 0ms 极速寻道。
