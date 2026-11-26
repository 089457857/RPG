// 屁眼王國大冒險 — 伺服器與瀏覽器共用的遊戲資料
(function (root) {
  const MAXLV = 80;
  const CL = {
    warrior: { name: '戰士', col: '#d8433a', col2: '#8c2a24', desc: '近戰揮砍，血厚耐打，一刀打一排。', base: { hp: 100, mp: 30, atk: 12, def: 6, crit: 5 }, grow: { hp: 22, mp: 4, atk: 2.9, def: 1.7 }, dr: .75,
      jobs: ['戰士', '騎士', '聖騎士', '龍騎士', '劍聖'], jobDesc: ['', '鍛鍊劍技的騎士，能把鬥氣化為劍氣斬出。', '受聖光守護的騎士，召喚光柱審判周圍一切。', '與龍魂締約，龍息能焚盡前方一整排敵人。', '劍道的極致，萬劍從天而降。'] },
    mage: { name: '法師', col: '#8a5cf0', col2: '#4b2c9a', desc: '遠程魔法彈，範圍爆炸與連鎖雷電。', base: { hp: 60, mp: 80, atk: 15, def: 3, crit: 5 }, grow: { hp: 11, mp: 10, atk: 2.7, def: .7 },
      jobs: ['法師', '大魔導士', '元素主宰', '大賢者', '魔導神'], jobDesc: ['', '掌握冰霜之力，冰風暴能讓敵人短暫凍結。', '駕馭天地元素，召喚末日隕石轟炸全場。', '操控空間，黑洞會吸住並持續撕裂敵人。', '魔法的盡頭，創世之光貫穿整個畫面。'] },
    rogue: { name: '刺客', col: '#3a3f55', col2: '#1d202c', desc: '出手最快、爆擊最高，暗影突襲與二段跳。', base: { hp: 75, mp: 45, atk: 10, def: 4, crit: 25 }, grow: { hp: 14, mp: 5, atk: 2.5, def: 1 },
      jobs: ['刺客', '暗影者', '夜之王', '影武者', '冥王'], jobDesc: ['', '能分出影子分身，所有攻擊都會多打一次。', '黑夜的主宰，千刃風暴切碎周圍所有敵人。', '化身殘影，在敵人之間來回瞬殺。', '執掌生死，冥界審判讓周圍敵人一同受刑。'] },
    archer: { name: '射手', col: '#3f9a4f', col2: '#245a2e', desc: '射程最遠，連箭與箭雨清場。', base: { hp: 70, mp: 50, atk: 11, def: 4, crit: 12 }, grow: { hp: 13, mp: 6, atk: 2.6, def: .9 },
      jobs: ['射手', '遊俠', '神射手', '狙擊大師', '星辰弓神'], jobDesc: ['', '穿雲箭能貫穿一整排的敵人。', '百發百中的神射手，流星箭雨覆蓋大片區域。', '爆裂箭命中後會炸開，波及周圍。', '借星辰之力，銀河箭雨覆蓋整個畫面。'] },
  };
  const SK = {
    warrior: { atk: { n: '揮砍', cd: 26, d: '打前方 3 隻' }, s1: { n: '猛擊', mp: 6, cd: 45, d: '大範圍重擊並擊退' }, s2: { n: '衝鋒斬', mp: 12, cd: 90, lv: 3, d: '往前衝刺一路砍過去' }, s3: { n: '劍氣斬', mp: 16, cd: 60, job: 1, d: '劍氣往前飛，貫穿所有敵人' }, s4: { n: '聖光審判', mp: 34, cd: 150, job: 2, d: '周圍降下光柱，連續三次重擊' }, s5: { n: '龍魂斬', mp: 50, cd: 120, job: 3, d: '龍息噴向前方，連燒四次' }, s6: { n: '萬劍歸宗', mp: 80, cd: 240, job: 4, d: '附近的敵人被萬劍貫穿五次' } },
    mage: { atk: { n: '魔法彈', cd: 30, d: '遠程魔法彈' }, s1: { n: '火焰爆裂', mp: 8, cd: 50, d: '前方範圍爆炸' }, s2: { n: '雷霆', mp: 16, cd: 100, lv: 3, d: '同時劈 5 隻' }, s3: { n: '冰風暴', mp: 22, cd: 90, job: 1, d: '前方冰風暴，凍結敵人 0.75 秒（Boss 免疫）' }, s4: { n: '末日隕石', mp: 44, cd: 180, job: 2, d: '附近的敵人被隕石轟炸' }, s5: { n: '黑洞', mp: 56, cd: 140, job: 3, d: '黑洞吸住前方敵人並連續撕裂' }, s6: { n: '創世之光', mp: 90, cd: 260, job: 4, d: '光柱橫掃附近所有敵人' } },
    rogue: { atk: { n: '雙刺', cd: 20, d: '快速連刺兩下' }, s1: { n: '飛鏢連發', mp: 5, cd: 36, d: '連丟 3 枚飛鏢' }, s2: { n: '暗影突襲', mp: 12, cd: 70, lv: 3, d: '閃到最近敵人背後連砍 4 刀，爆擊大增' }, s3: { n: '影分身', mp: 20, cd: 600, job: 1, d: '20 秒內每次攻擊多打一次' }, s4: { n: '千刃風暴', mp: 34, cd: 140, job: 2, d: '周圍敵人被連斬六次' }, s5: { n: '幻影連殺', mp: 48, cd: 110, job: 3, d: '在 8 隻敵人之間瞬移斬殺' }, s6: { n: '冥界審判', mp: 80, cd: 240, job: 4, d: '標記周圍所有敵人，一起處刑' } },
    archer: { atk: { n: '射擊', cd: 28, d: '遠程射箭' }, s1: { n: '二連箭', mp: 6, cd: 45, d: '連射兩箭可穿透' }, s2: { n: '箭雨', mp: 14, cd: 110, lv: 3, d: '前方落下箭雨' }, s3: { n: '穿雲箭', mp: 16, cd: 55, job: 1, d: '巨大箭矢貫穿一整排敵人' }, s4: { n: '流星箭雨', mp: 38, cd: 160, job: 2, d: '大範圍六波箭雨' }, s5: { n: '爆裂箭', mp: 48, cd: 100, job: 3, d: '貫穿箭命中後連環爆炸' }, s6: { n: '銀河箭雨', mp: 84, cd: 240, job: 4, d: '箭雨覆蓋附近所有敵人' } },
  };
  const JOBLV = [0, 15, 30, 45, 60], JOBATK = [1, 1.15, 1.32, 1.5, 1.7], JOBHP = [1, 1.1, 1.22, 1.36, 1.5];
  // [名稱, 攻擊, 等級, 價格]
  const WEAPONS = {
    warrior: [['木劍', 0, 1, 0], ['鐵劍', 8, 8, 300], ['騎士長劍', 20, 16, 1600], ['聖銀大劍', 36, 24, 5200], ['屠龍巨劍', 58, 32, 13000], ['神諭聖劍', 82, 40, 30000], ['龍牙劍', 112, 50, 62000], ['天罰之刃', 150, 60, 115000]],
    mage: [['木杖', 0, 1, 0], ['魔法杖', 9, 8, 300], ['星辰法杖', 22, 16, 1600], ['元素權杖', 40, 24, 5200], ['賢者之杖', 64, 32, 13000], ['星界法典', 90, 40, 30000], ['深淵魔杖', 124, 50, 62000], ['創世權杖', 165, 60, 115000]],
    rogue: [['小刀', 0, 1, 0], ['精鋼匕首', 7, 8, 300], ['影刃', 18, 16, 1600], ['夜行雙刃', 33, 24, 5200], ['無聲之牙', 52, 32, 13000], ['幽冥刃', 75, 40, 30000], ['影月雙刃', 104, 50, 62000], ['冥神之爪', 140, 60, 115000]],
    archer: [['短弓', 0, 1, 0], ['獵弓', 8, 8, 300], ['精靈長弓', 20, 16, 1600], ['風之弓', 36, 24, 5200], ['天穹神弓', 58, 32, 13000], ['獵星弓', 82, 40, 30000], ['蒼龍弓', 112, 50, 62000], ['銀河神弓', 150, 60, 115000]],
  };
  // 傳說專屬武器：商店不賣，只會從「虛空裂隙」的怪物身上隨機掉落（第 5 個欄位 1 = 傳說）
  const LEGEND = { warrior: '軒轅劍', mage: '太初法典', rogue: '月影雙刃・朧', archer: '后羿射日弓' };
  for (const k in WEAPONS) WEAPONS[k].push([LEGEND[k], 230, 80, 0, 1]);
  const LEGI = 8, LEGGOLD = 50000;
  // [名稱, 防禦, HP, 等級, 價格]
  const ARMORS = [['布衣', 0, 0, 1, 0], ['皮甲', 4, 30, 8, 250], ['鎖子甲', 10, 90, 16, 1400], ['秘銀鎧', 18, 180, 24, 4600], ['龍鱗甲', 30, 340, 32, 12000], ['神聖鎧甲', 44, 560, 40, 26000], ['暗黑龍甲', 60, 820, 50, 56000], ['天穹戰衣', 80, 1150, 60, 105000]];
  const SHOP = { pot: 25, eth: 30, pot10: 240, rest: 15 };
  const MON = {
    slime: { name: '果凍史萊姆', lv: 1, hp: 32, atk: 8, exp: 8, gold: [3, 6], w: 14, h: 11, spd: .45 },
    shroom: { name: '紅帽蘑菇', lv: 4, hp: 75, atk: 14, exp: 18, gold: [6, 12], w: 14, h: 16, spd: .55 },
    stump: { name: '憤怒樹墩', lv: 7, hp: 150, atk: 22, exp: 34, gold: [12, 20], w: 16, h: 17, spd: .4 },
    king: { name: '巨菇王', lv: 10, hp: 2400, atk: 34, exp: 600, gold: [250, 320], w: 44, h: 40, spd: .5, boss: true, sk: ['slam', 'rain', 'charge'], skn: { rain: '孢子雨', charge: '蘑菇衝撞', slam: '重壓' } },
    snowslime: { name: '雪球史萊姆', lv: 16, hp: 380, atk: 62, exp: 72, gold: [30, 45], w: 14, h: 11, spd: .5 },
    icewolf: { name: '冰原狼', lv: 20, hp: 520, atk: 80, exp: 96, gold: [40, 60], w: 20, h: 13, spd: .75 },
    yeti: { name: '雪怪', lv: 24, hp: 740, atk: 100, exp: 128, gold: [55, 80], w: 18, h: 22, spd: .4 },
    frost: { name: '冰霜巨人', lv: 28, hp: 13000, atk: 150, exp: 2600, gold: [1500, 2000], w: 46, h: 48, spd: .45, boss: true, sk: ['slam', 'rain', 'breath', 'quake'], skn: { rain: '冰錐墜落', breath: '寒冰吐息', quake: '冰原震波', slam: '重壓' } },
    fireslime: { name: '熔岩史萊姆', lv: 30, hp: 900, atk: 130, exp: 190, gold: [80, 110], w: 14, h: 11, spd: .5 },
    imp: { name: '火焰小惡魔', lv: 33, hp: 1150, atk: 155, exp: 232, gold: [95, 130], w: 14, h: 16, spd: .7 },
    golem: { name: '岩漿魔像', lv: 36, hp: 1550, atk: 185, exp: 285, gold: [120, 160], w: 20, h: 22, spd: .35 },
    balrog: { name: '炎魔王', lv: 38, hp: 42000, atk: 260, exp: 8000, gold: [5000, 6000], w: 50, h: 52, spd: .45, boss: true, sk: ['slam', 'rain', 'breath', 'charge', 'quake'], skn: { rain: '隕石雨', breath: '烈焰吐息', charge: '炎魔突進', quake: '熔岩震波', slam: '重壓' } },
    knight: { name: '暗影騎士', lv: 45, hp: 3200, atk: 300, exp: 520, gold: [200, 260], w: 16, h: 24, spd: .55 },
    gargoyle: { name: '石像鬼', lv: 50, hp: 4300, atk: 350, exp: 650, gold: [240, 320], w: 20, h: 20, spd: .6 },
    reaper: { name: '死神', lv: 56, hp: 5600, atk: 410, exp: 800, gold: [300, 400], w: 18, h: 26, spd: .5 },
    dragon: { name:'黑龍王',lv:65,hp:120000,atk:480, exp: 32000, gold: [20000, 25000], w: 60, h: 50, spd: .45, boss: true, sk: ['breath', 'rain', 'quake', 'charge', 'slam'], skn: { rain: '暗黑流星', breath: '龍息', charge: '龍爪突襲', quake: '龍威震地', slam: '重壓' } },
    seraph: { name: '墮落天使', lv: 66, hp: 8000, atk: 480, exp: 1100, gold: [340, 440], w: 18, h: 24, spd: .6 },
    stargolem: { name: '星辰魔像', lv: 70, hp: 10000, atk: 520, exp: 1300, gold: [380, 480], w: 22, h: 24, spd: .35 },
    phoenix: { name: '不死鳥', lv: 74, hp: 12000, atk: 560, exp: 1550, gold: [420, 540], w: 22, h: 18, spd: .75 },
    voidling: { name: '虛空獵手', lv: 86, hp: 34000, atk: 950, exp: 4200, gold: [1500, 2000], w: 16, h: 18, spd: .8, leg: .004 },
    chaosknight: { name: '混沌騎士', lv: 90, hp: 48000, atk: 1050, exp: 5200, gold: [1800, 2400], w: 18, h: 26, spd: .5, leg: .006 },
    abyssmage: { name: '深淵魔導師', lv: 94, hp: 62000, atk: 1150, exp: 6400, gold: [2200, 2800], w: 16, h: 24, spd: .45, leg: .008 },
    voidking: { name: '虛空之主', lv: 100, hp: 1200000, atk: 1300, exp: 250000, gold: [80000, 100000], w: 64, h: 62, spd: .45, boss: true, leg: .35, sk: ['quake', 'rain', 'breath', 'charge', 'rain', 'breath'], skn: { rain: '虛空隕滅', breath: '混沌吐息', charge: '裂隙突進', quake: '維度崩塌', slam: '重壓' } },
    titan: { name: '天穹泰坦', lv: 80, hp: 240000, atk: 600, exp: 60000, gold: [30000, 40000], w: 62, h: 60, spd: .4, boss: true, sk: ['quake', 'rain', 'breath', 'charge', 'slam', 'rain'], skn: { rain: '星墜', breath: '天罰光柱', charge: '泰坦衝鋒', quake: '天崩地裂', slam: '重壓' } },
  };
  const GY = 300, WH = 340, WW = 2600;
  const SEG = [{ x1: 0, x2: WW, y: GY, g: 1 },
    { x1: 330, x2: 520, y: 240 }, { x1: 420, x2: 620, y: 180 }, { x1: 700, x2: 900, y: 240 }, { x1: 860, x2: 1060, y: 180 }, { x1: 980, x2: 1160, y: 120 },
    { x1: 1250, x2: 1450, y: 240 }, { x1: 1400, x2: 1600, y: 180 }, { x1: 1550, x2: 1750, y: 120 }, { x1: 1850, x2: 2050, y: 240 }];
  const ROPES = [{ x: 360, y1: 240, y2: GY }, { x: 470, y1: 180, y2: 240 }, { x: 740, y1: 240, y2: GY }, { x: 880, y1: 180, y2: 240 }, { x: 1000, y1: 120, y2: 180 },
    { x: 1280, y1: 240, y2: GY }, { x: 1420, y1: 180, y2: 240 }, { x: 1580, y1: 120, y2: 180 }, { x: 1880, y1: 240, y2: GY }];
  const layout = (A, B, C, boss) => [
    { t: A, s: 0, a: 290, b: 690 }, { t: A, s: 0, a: 290, b: 690 }, { t: A, s: 0, a: 290, b: 690 }, { t: A, s: 1 }, { t: A, s: 1 }, { t: A, s: 2 }, { t: A, s: 2 },
    { t: B, s: 0, a: 700, b: 1200 }, { t: B, s: 0, a: 700, b: 1200 }, { t: B, s: 0, a: 700, b: 1200 }, { t: B, s: 3 }, { t: B, s: 3 }, { t: B, s: 4 }, { t: B, s: 4 }, { t: B, s: 5 }, { t: B, s: 5 },
    { t: C, s: 0, a: 1200, b: 2080 }, { t: C, s: 0, a: 1200, b: 2080 }, { t: C, s: 0, a: 1200, b: 2080 }, { t: C, s: 6 }, { t: C, s: 6 }, { t: B, s: 7 }, { t: C, s: 7 }, { t: C, s: 8 }, { t: C, s: 8 }, { t: C, s: 9 }, { t: C, s: 9 },
    { t: boss, s: 0, a: 2140, b: 2460 }];
  const MAPS = [
    { name: '蘑菇森林', pal: 'forest', town: true, spawns: layout('slime', 'shroom', 'stump', 'king'), zones: [[260, '晨露村'], [700, '史萊姆草原'], [1200, '蘑菇小徑'], [2100, '樹墩森林'], [9e9, '巨菇王的巢穴']],
      portals: [{ x: 2560, to: 1, tx: 150, rec: 15, label: '冰雪山谷' }], start: 120 },
    { name: '冰雪山谷', pal: 'snow', spawns: layout('snowslime', 'icewolf', 'yeti', 'frost'), zones: [[260, '山谷入口'], [700, '雪原'], [1200, '冰柱林'], [2100, '暴風雪坡'], [9e9, '冰霜巨人之巔']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }, { x: 2560, to: 2, tx: 150, rec: 30, label: '熔岩深淵' }], start: 150 },
    { name: '熔岩深淵', pal: 'lava', spawns: layout('fireslime', 'imp', 'golem', 'balrog'), zones: [[260, '深淵入口'], [700, '焦土'], [1200, '熔岩河'], [2100, '惡魔迴廊'], [9e9, '炎魔王的王座']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }, { x: 2560, to: 3, tx: 150, rec: 45, label: '暗黑神殿' }], start: 150 },
    { name: '暗黑神殿', pal: 'dark', spawns: layout('knight', 'gargoyle', 'reaper', 'dragon'), zones: [[260, '神殿大門'], [700, '騎士迴廊'], [1200, '石像大廳'], [2100, '冥河祭壇'], [9e9, '黑龍王的巢穴']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }, { x: 2560, to: 4, tx: 150, rec: 65, label: '天空聖域' }], start: 150 },
    { name: '天空聖域', pal: 'sky', spawns: layout('seraph', 'stargolem', 'phoenix', 'titan'), zones: [[260, '雲端階梯'], [700, '天使庭園'], [1200, '星辰廣場'], [2100, '不死鳥之巢'], [9e9, '天穹泰坦的王座']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }, { x: 2560, to: 5, tx: 150, rec: 80, label: '虛空裂隙' }], start: 150 },
    { name: '虛空裂隙', pal: 'void', spawns: layout('voidling', 'chaosknight', 'abyssmage', 'voidking'), zones: [[260, '裂隙邊緣'], [700, '虛空荒原'], [1200, '混沌要塞'], [2100, '深淵回廊'], [9e9, '虛空之主的王座']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }], start: 150 },
  ];
  const needExp = lv => Math.round(10 * Math.pow(lv, 1.5));
  // 能力值：每升 1 級得 3 點，可分配到 力量／體質／智慧／敏捷
  const APL = 3, APRESET = 20000;
  const STATS = {
    str: { n: '力量', d: '攻擊 +1' },
    vit: { n: '體質', d: 'HP +8、防禦 +0.4' },
    int: { n: '智慧', d: 'MP +6、藥水回復 +0.2%' },
    dex: { n: '敏捷', d: '爆擊率 +0.1%' },
  };
  function newChar(cls) { return { cls, lv: 1, exp: 0, gold: 20, pot: 5, eth: 3, base: { ...CL[cls].base }, job: 0, wep: 0, arm: 0, map: 0, ap: 0, st: { str: 0, vit: 0, int: 0, dex: 0 } }; }
  // 舊存檔補上能力值（依目前等級補發點數）
  function fix(c) { if (c && !c.st) { c.st = { str: 0, vit: 0, int: 0, dex: 0 }; c.ap = (c.lv - 1) * APL; } return c; }
  // 寵物：65 等解鎖，四選一；之後可花金幣更換
  const PETLV = 65, PETSWAP = 30000;
  const PETS = {
    qinglong: { n: '青龍', d: '攻擊力 +15%', col: '#3fd6a0' },
    xuanwu: { n: '玄武', d: '防禦 +40%、HP +10%', col: '#4a6a5a' },
    baihu: { n: '白虎', d: '攻擊速度 +25%（技能冷卻縮短 20%）、移動速度 +20%', col: '#f4f4f4' },
    zhuque: { n: '朱雀', d: '攻擊吸血：造成傷害的 5% 回復成 HP', col: '#ff4a2a' },
  };
  function stats(c) {
    const w = WEAPONS[c.cls][c.wep] || WEAPONS[c.cls][0], a = ARMORS[c.arm], pt = c.pet, s = c.st || {};
    const hp = Math.round((c.base.hp * JOBHP[c.job] + a[2] + (s.vit || 0) * 8) * (pt === 'xuanwu' ? 1.1 : 1));
    const atk = Math.round(((c.base.atk + w[1]) * JOBATK[c.job] + (s.str || 0)) * (pt === 'qinglong' ? 1.15 : 1));
    const def = Math.round((c.base.def + a[1] + (s.vit || 0) * .4) * (pt === 'xuanwu' ? 1.4 : 1));
    const mp = Math.round(c.base.mp * JOBHP[c.job] + (s.int || 0) * 6);
    return { hp, mp, atk, def, crit: Math.min(75, Math.round((c.base.crit + c.job * 3 + (s.dex || 0) * .1) * 10) / 10), potB: (s.int || 0) * .002 };
  }
  // 升級（會修改角色），回傳升了幾級
  function addExp(c, e) {
    if (c.lv >= MAXLV) { c.exp = 0; return 0; }
    c.exp += e; let n = 0;
    while (c.lv < MAXLV && c.exp >= needExp(c.lv)) {
      c.exp -= needExp(c.lv); c.lv++; n++; if (c.st) c.ap = (c.ap || 0) + APL;
      const g = CL[c.cls].grow;
      c.base.hp += g.hp; c.base.mp += g.mp; c.base.atk = Math.round((c.base.atk + g.atk) * 10) / 10; c.base.def = Math.round((c.base.def + g.def) * 10) / 10;
    }
    if (c.lv >= MAXLV) c.exp = 0;
    return n;
  }
  function skillLock(c, k) { const s = SK[c.cls][k]; if (!s) return '無此技能'; if (s.lv && c.lv < s.lv) return `Lv ${s.lv}`; if (s.job && c.job < s.job) return ['', '一轉', '二轉', '三轉', '四轉'][s.job]; return ''; }
  const D = { LEGI, LEGGOLD, APL, APRESET, STATS, fix, PETLV, PETSWAP, PETS, MAXLV, CL, SK, JOBLV, JOBATK, JOBHP, WEAPONS, ARMORS, SHOP, MON, GY, WH, WW, SEG, ROPES, MAPS, needExp, newChar, stats, addExp, skillLock };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.RPGDATA = D;
})(typeof window !== 'undefined' ? window : this);
