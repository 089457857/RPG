// 屁眼王國大冒險 — 伺服器與瀏覽器共用的遊戲資料
(function (root) {
  const MAXLV = 40;
  const CL = {
    warrior: { name: '戰士', col: '#d8433a', col2: '#8c2a24', desc: '近戰揮砍，血厚耐打，一刀打一排。', base: { hp: 100, mp: 30, atk: 12, def: 6, crit: 5 }, grow: { hp: 18, mp: 4, atk: 2.8, def: 1.4 },
      jobs: ['戰士', '騎士', '聖騎士'], jobDesc: ['', '鍛鍊劍技的騎士，能把鬥氣化為劍氣斬出。', '受聖光守護的騎士，召喚光柱審判周圍一切。'] },
    mage: { name: '法師', col: '#8a5cf0', col2: '#4b2c9a', desc: '遠程魔法彈，範圍爆炸與連鎖雷電。', base: { hp: 60, mp: 80, atk: 15, def: 3, crit: 5 }, grow: { hp: 11, mp: 10, atk: 3.2, def: .7 },
      jobs: ['法師', '大魔導士', '元素主宰'], jobDesc: ['', '掌握冰霜之力，冰風暴能凍住敵人。', '駕馭天地元素，召喚末日隕石轟炸全場。'] },
    rogue: { name: '刺客', col: '#3a3f55', col2: '#1d202c', desc: '出手最快、爆擊最高，飛鏢與瞬步。', base: { hp: 75, mp: 45, atk: 10, def: 4, crit: 25 }, grow: { hp: 13, mp: 5, atk: 2.3, def: .9 },
      jobs: ['刺客', '暗影者', '夜之王'], jobDesc: ['', '能分出影子分身，所有攻擊都會多打一次。', '黑夜的主宰，千刃風暴切碎周圍所有敵人。'] },
    archer: { name: '射手', col: '#3f9a4f', col2: '#245a2e', desc: '射程最遠，連箭與箭雨清場。', base: { hp: 70, mp: 50, atk: 11, def: 4, crit: 12 }, grow: { hp: 13, mp: 6, atk: 2.6, def: .9 },
      jobs: ['射手', '遊俠', '神射手'], jobDesc: ['', '穿雲箭能貫穿一整排的敵人。', '百發百中的神射手，流星箭雨覆蓋大片區域。'] },
  };
  const SK = {
    warrior: { atk: { n: '揮砍', cd: 26 }, s1: { n: '猛擊', mp: 6, cd: 45 }, s2: { n: '衝鋒斬', mp: 12, cd: 90, lv: 3 }, s3: { n: '劍氣斬', mp: 16, cd: 60, job: 1, d: '劍氣往前飛，貫穿所有敵人' }, s4: { n: '聖光審判', mp: 34, cd: 150, job: 2, d: '周圍降下光柱，連續三次重擊' } },
    mage: { atk: { n: '魔法彈', cd: 30 }, s1: { n: '火焰爆裂', mp: 8, cd: 50 }, s2: { n: '雷霆', mp: 16, cd: 100, lv: 3 }, s3: { n: '冰風暴', mp: 22, cd: 80, job: 1, d: '前方冰風暴，凍住敵人 2 秒' }, s4: { n: '末日隕石', mp: 44, cd: 180, job: 2, d: '畫面上的敵人都被隕石轟炸' } },
    rogue: { atk: { n: '雙刺', cd: 20 }, s1: { n: '飛鏢連發', mp: 5, cd: 36 }, s2: { n: '瞬步斬', mp: 10, cd: 80, lv: 3 }, s3: { n: '影分身', mp: 20, cd: 600, job: 1, d: '20 秒內每次攻擊多打一次' }, s4: { n: '千刃風暴', mp: 34, cd: 140, job: 2, d: '周圍敵人被連斬六次' } },
    archer: { atk: { n: '射擊', cd: 28 }, s1: { n: '二連箭', mp: 6, cd: 45 }, s2: { n: '箭雨', mp: 14, cd: 110, lv: 3 }, s3: { n: '穿雲箭', mp: 16, cd: 55, job: 1, d: '巨大箭矢貫穿一整排敵人' }, s4: { n: '流星箭雨', mp: 38, cd: 160, job: 2, d: '大範圍六波箭雨' } },
  };
  const JOBLV = [0, 15, 30], JOBATK = [1, 1.15, 1.32], JOBHP = [1, 1.1, 1.22];
  // [名稱, 攻擊, 等級, 價格]
  const WEAPONS = {
    warrior: [['木劍', 0, 1, 0], ['鐵劍', 8, 8, 300], ['騎士長劍', 20, 16, 1600], ['聖銀大劍', 36, 24, 5200], ['屠龍巨劍', 58, 32, 13000]],
    mage: [['木杖', 0, 1, 0], ['魔法杖', 9, 8, 300], ['星辰法杖', 22, 16, 1600], ['元素權杖', 40, 24, 5200], ['賢者之杖', 64, 32, 13000]],
    rogue: [['小刀', 0, 1, 0], ['精鋼匕首', 7, 8, 300], ['影刃', 18, 16, 1600], ['夜行雙刃', 33, 24, 5200], ['無聲之牙', 52, 32, 13000]],
    archer: [['短弓', 0, 1, 0], ['獵弓', 8, 8, 300], ['精靈長弓', 20, 16, 1600], ['風之弓', 36, 24, 5200], ['天穹神弓', 58, 32, 13000]],
  };
  // [名稱, 防禦, HP, 等級, 價格]
  const ARMORS = [['布衣', 0, 0, 1, 0], ['皮甲', 4, 30, 8, 250], ['鎖子甲', 10, 90, 16, 1400], ['秘銀鎧', 18, 180, 24, 4600], ['龍鱗甲', 30, 340, 32, 12000]];
  const SHOP = { pot: 25, eth: 30, pot10: 240, rest: 15 };
  const MON = {
    slime: { name: '果凍史萊姆', lv: 1, hp: 32, atk: 8, exp: 8, gold: [3, 6], w: 14, h: 11, spd: .45 },
    shroom: { name: '紅帽蘑菇', lv: 4, hp: 75, atk: 14, exp: 18, gold: [6, 12], w: 14, h: 16, spd: .55 },
    stump: { name: '憤怒樹墩', lv: 7, hp: 150, atk: 22, exp: 34, gold: [12, 20], w: 16, h: 17, spd: .4 },
    king: { name: '巨菇王', lv: 10, hp: 2400, atk: 34, exp: 600, gold: [250, 320], w: 44, h: 40, spd: .5, boss: true },
    snowslime: { name: '雪球史萊姆', lv: 16, hp: 380, atk: 62, exp: 72, gold: [30, 45], w: 14, h: 11, spd: .5 },
    icewolf: { name: '冰原狼', lv: 20, hp: 520, atk: 80, exp: 96, gold: [40, 60], w: 20, h: 13, spd: .75 },
    yeti: { name: '雪怪', lv: 24, hp: 740, atk: 100, exp: 128, gold: [55, 80], w: 18, h: 22, spd: .4 },
    frost: { name: '冰霜巨人', lv: 28, hp: 16000, atk: 150, exp: 2600, gold: [1500, 2000], w: 46, h: 48, spd: .45, boss: true },
    fireslime: { name: '熔岩史萊姆', lv: 30, hp: 900, atk: 130, exp: 190, gold: [80, 110], w: 14, h: 11, spd: .5 },
    imp: { name: '火焰小惡魔', lv: 33, hp: 1150, atk: 155, exp: 232, gold: [95, 130], w: 14, h: 16, spd: .7 },
    golem: { name: '岩漿魔像', lv: 36, hp: 1550, atk: 185, exp: 285, gold: [120, 160], w: 20, h: 22, spd: .35 },
    balrog: { name: '炎魔王', lv: 38, hp: 42000, atk: 260, exp: 8000, gold: [5000, 6000], w: 50, h: 52, spd: .45, boss: true },
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
      portals: [{ x: 2560, to: 1, tx: 150, req: 15, label: '冰雪山谷' }], start: 120 },
    { name: '冰雪山谷', pal: 'snow', spawns: layout('snowslime', 'icewolf', 'yeti', 'frost'), zones: [[260, '山谷入口'], [700, '雪原'], [1200, '冰柱林'], [2100, '暴風雪坡'], [9e9, '冰霜巨人之巔']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }, { x: 2560, to: 2, tx: 150, req: 30, label: '熔岩深淵' }], start: 150 },
    { name: '熔岩深淵', pal: 'lava', spawns: layout('fireslime', 'imp', 'golem', 'balrog'), zones: [[260, '深淵入口'], [700, '焦土'], [1200, '熔岩河'], [2100, '惡魔迴廊'], [9e9, '炎魔王的王座']],
      portals: [{ x: 60, to: 0, tx: 200, label: '回晨露村' }], start: 150 },
  ];
  const needExp = lv => Math.round(10 * Math.pow(lv, 1.5));
  function newChar(cls) { return { cls, lv: 1, exp: 0, gold: 20, pot: 5, eth: 3, base: { ...CL[cls].base }, job: 0, wep: 0, arm: 0, map: 0 }; }
  function stats(c) {
    const w = WEAPONS[c.cls][c.wep], a = ARMORS[c.arm];
    return { hp: Math.round(c.base.hp * JOBHP[c.job] + a[2]), mp: Math.round(c.base.mp * JOBHP[c.job]), atk: Math.round((c.base.atk + w[1]) * JOBATK[c.job]), def: Math.round(c.base.def + a[1]), crit: c.base.crit + c.job * 3 };
  }
  // 升級（會修改角色），回傳升了幾級
  function addExp(c, e) {
    if (c.lv >= MAXLV) { c.exp = 0; return 0; }
    c.exp += e; let n = 0;
    while (c.lv < MAXLV && c.exp >= needExp(c.lv)) {
      c.exp -= needExp(c.lv); c.lv++; n++;
      const g = CL[c.cls].grow;
      c.base.hp += g.hp; c.base.mp += g.mp; c.base.atk = Math.round((c.base.atk + g.atk) * 10) / 10; c.base.def = Math.round((c.base.def + g.def) * 10) / 10;
    }
    if (c.lv >= MAXLV) c.exp = 0;
    return n;
  }
  function skillLock(c, k) { const s = SK[c.cls][k]; if (!s) return '無此技能'; if (s.lv && c.lv < s.lv) return `Lv ${s.lv}`; if (s.job && c.job < s.job) return s.job === 1 ? '一轉' : '二轉'; return ''; }
  const D = { MAXLV, CL, SK, JOBLV, JOBATK, JOBHP, WEAPONS, ARMORS, SHOP, MON, GY, WH, WW, SEG, ROPES, MAPS, needExp, newChar, stats, addExp, skillLock };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.RPGDATA = D;
})(typeof window !== 'undefined' ? window : this);
