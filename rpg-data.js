// 屁眼王國大冒險 — 伺服器與瀏覽器共用的遊戲資料
(function (root) {
  const MAXLV = 80, MAXLV2 = 100, MAXTOP = 120;   // 擊敗虛空之主 → 100、克拉肯 → 110、古城守護神 → 120
  const CAPBOSS = { voidking: 100, kraken: 110, ruinlord: 120 };
  const capOf = c => (c && c.cap) || MAXLV;
  const MAXSLOT = 6; // 每個帳號最多 6 個角色
  const CL = {
    warrior: { name: '戰士', col: '#d8433a', col2: '#8c2a24', desc: '近戰揮砍，血厚耐打，一刀打一排。', base: { hp: 100, mp: 30, atk: 12, def: 6, crit: 5 }, grow: { hp: 22, mp: 4, atk: 2.9, def: 1.7 }, dr: .75,
      jobs: ['戰士', '騎士', '聖騎士', '龍騎士', '劍聖'], jobDesc: ['', '鍛鍊劍技的騎士，破甲斬能讓敵人受到更多傷害。', '受聖光守護的騎士，召喚光柱審判周圍一切。', '與龍魂締約，龍息能焚盡前方一整排敵人。', '劍道的極致，五把巨劍接連飛出貫穿一切。'] },
    mage: { name: '法師', col: '#8a5cf0', col2: '#4b2c9a', desc: '遠程魔法彈，範圍爆炸與連鎖雷電。', base: { hp: 60, mp: 80, atk: 15, def: 3, crit: 5 }, grow: { hp: 11, mp: 10, atk: 2.7, def: .7 },
      jobs: ['法師', '大魔導士', '元素主宰', '大賢者', '魔導神'], jobDesc: ['', '掌握冰霜之力，冰風暴能讓敵人短暫凍結。', '駕馭天地元素，召喚末日隕石轟炸全場。', '操控空間，黑洞會吸住並持續撕裂敵人。', '魔法的盡頭，創世之光貫穿整個畫面。'] },
    rogue: { name: '刺客', col: '#3a3f55', col2: '#1d202c', desc: '出手最快、爆擊最高，暗影突襲與二段跳。', base: { hp: 75, mp: 45, atk: 10, def: 4, crit: 25 }, grow: { hp: 14, mp: 5, atk: 2.5, def: 1 },
      jobs: ['刺客', '暗影者', '夜之王', '影武者', '冥王'], jobDesc: ['', '能分出影子分身，所有攻擊都會多打一次。', '黑夜的主宰，千刃風暴切碎周圍所有敵人。', '化身殘影，在敵人之間來回瞬殺。', '執掌生死，冥界審判讓周圍敵人一同受刑。'] },
    archer: { name: '射手', col: '#3f9a4f', col2: '#245a2e', desc: '射程最遠，連箭與箭雨清場。', base: { hp: 70, mp: 50, atk: 11, def: 4, crit: 12 }, grow: { hp: 13, mp: 6, atk: 2.6, def: .9 },
      jobs: ['射手', '遊俠', '神射手', '狙擊大師', '星辰弓神'], jobDesc: ['', '穿雲箭能貫穿一整排的敵人。', '百發百中的神射手，束縛箭能把敵人釘在原地。', '爆裂箭命中後會炸開，波及周圍。', '借星辰之力拉滿天弓，一箭貫穿整個畫面。'] },
    brawler: { name: '格鬥家', col: '#e07a1f', col2: '#8a4a12', desc: '赤手空拳的近戰連擊，上勾拳、震地拳樣樣來。', base: { hp: 90, mp: 35, atk: 12, def: 5, crit: 10 }, grow: { hp: 19, mp: 4, atk: 2.8, def: 1.4 }, dr: .85,
      jobs: ['格鬥家', '拳師', '武鬥家', '拳聖', '武神'], jobDesc: ['', '練成氣功，蓄氣後放出寬大的氣功波。', '出拳快到看不見，百裂拳一口氣打 10 下。', '一拳捶地，震波沿著地面往兩側擴散。', '武道巔峰，天霸神拳從天而降。'] },
    mech: { name: '機械戰士', col: '#5a7a8a', col2: '#2e434e', desc: '雷射槍與重火力，會架砲台、埋地雷。', base: { hp: 85, mp: 50, atk: 12, def: 6, crit: 8 }, grow: { hp: 18, mp: 6, atk: 2.7, def: 1.5 }, dr: .85,
      jobs: ['機械戰士', '機甲兵', '重裝機甲', '戰爭機器', '機神'], jobDesc: ['', '能架設自動砲台，替你掃射附近的敵人。', '在戰場埋下地雷陣，連環引爆。', '開啟能量護盾，大幅減少受到的傷害。', '呼叫軌道衛星砲，從太空轟炸目標。'] },
    demon: { name: '惡魔', col: '#8a1a2a', col2: '#3a0a14', desc: '吸血近戰，打得越兇補得越多。', base: { hp: 80, mp: 45, atk: 13, def: 4, crit: 12 }, grow: { hp: 16, mp: 5, atk: 2.8, def: 1.0 },
      jobs: ['惡魔', '夢魘', '魔將', '魔王', '深淵君主'], jobDesc: ['', '惡魔化之後攻擊與速度都大幅提升。', '釋放詛咒之霧，持續侵蝕敵人。', '打開深淵之門，魔手抓住敵人重重砸下。', '收割靈魂，直接處決殘血的敵人。'] },
    angel: { name: '天使', col: '#f0e6c0', col2: '#c8a04a', desc: '輔助型職業，能治療、祝福、保護隊友。', base: { hp: 75, mp: 70, atk: 11, def: 4, crit: 8 }, grow: { hp: 15, mp: 9, atk: 2.4, def: 1.0 },
      jobs: ['天使', '守護天使', '熾天使', '大天使', '天使長'], jobDesc: ['', '祝福隊友，一起提升攻擊力。', '展開天使之翼，讓附近隊友受到的傷害減半。', '召喚審判之劍，從天上刺向敵人。', '神聖復活：讓倒地的隊友重新站起來。'] },
    dragon: { name: '巨龍使者', col: '#e0703a', col2: '#7a2a1a', desc: '本人不攻擊，由身後的巨龍出手。龍會隨轉職成長，一轉選擇火、雷、冰、暗屬性。', base: { hp: 66, mp: 80, atk: 14, def: 3, crit: 6 }, grow: { hp: 12, mp: 10, atk: 2.7, def: .8 },
      jobs: ['巨龍使者', '巨龍使者', '巨龍使者', '巨龍使者', '巨龍使者'], jobDesc: ['', '龍長出翅膀，選擇屬性（火、雷、冰、暗），學會屬性吐息。', '成年龍展開雙翼，學會飛龍俯衝。', '古龍長出雙角與背刺，學會龍王之怒。', '龍王戴上龍冠，學會天崩龍隕，還能騎上自己的龍。'] },
  };
  const SK = {
    warrior: { atk: { n: '揮砍', cd: 26, d: '打前方 3 隻' }, s1: { n: '猛擊', mp: 6, cd: 45, d: '大範圍重擊並擊退' }, s2: { n: '衝鋒斬', mp: 12, cd: 90, lv: 3, d: '往前衝刺一路砍過去' }, s3: { n: '破甲斬', mp: 16, cd: 60, job: 1, d: '重斬前方敵人，8 秒內它們受到的傷害 +20%' }, s4: { n: '聖光審判', mp: 34, cd: 150, job: 2, d: '周圍降下光柱，連續三次重擊' }, s5: { n: '龍魂斬', mp: 50, cd: 120, job: 3, d: '龍息噴向前方，連燒四次' }, s6: { n: '萬劍歸宗', mp: 80, cd: 240, job: 4, d: '五把巨劍接連往前飛出，貫穿所有敵人' } },
    mage: { atk: { n: '魔法彈', cd: 30, d: '遠程魔法彈' }, s1: { n: '火焰爆裂', mp: 8, cd: 50, d: '前方範圍爆炸' }, s2: { n: '雷霆', mp: 16, cd: 100, lv: 3, d: '同時劈 5 隻' }, s3: { n: '冰風暴', mp: 22, cd: 90, job: 1, d: '前方冰風暴，凍結敵人 0.75 秒（Boss 免疫）' }, s4: { n: '末日隕石', mp: 44, cd: 180, job: 2, d: '附近的敵人被隕石轟炸' }, s5: { n: '黑洞', mp: 56, cd: 140, job: 3, d: '黑洞吸住前方敵人並連續撕裂' }, s6: { n: '創世之光', mp: 90, cd: 260, job: 4, d: '光柱橫掃附近所有敵人' } },
    rogue: { atk: { n: '雙刺', cd: 20, d: '快速連刺兩下' }, s1: { n: '飛鏢連發', mp: 5, cd: 36, d: '連丟 3 枚飛鏢' }, s2: { n: '暗影突襲', mp: 12, cd: 70, lv: 3, d: '閃到最近敵人背後連砍 4 刀，爆擊大增' }, s3: { n: '影分身', mp: 20, cd: 600, job: 1, d: '20 秒內每次攻擊多打一次' }, s4: { n: '千刃風暴', mp: 34, cd: 140, job: 2, d: '周圍敵人被連斬六次' }, s5: { n: '幻影連殺', mp: 48, cd: 110, job: 3, d: '在 8 隻敵人之間瞬移斬殺' }, s6: { n: '冥界審判', mp: 80, cd: 240, job: 4, d: '標記周圍所有敵人，一起處刑' } },
    archer: { atk: { n: '射擊', cd: 28, d: '遠程射箭' }, s1: { n: '二連箭', mp: 6, cd: 45, d: '連射兩箭可穿透' }, s2: { n: '箭雨', mp: 14, cd: 110, lv: 3, d: '前方落下箭雨' }, s3: { n: '穿雲箭', mp: 16, cd: 55, job: 1, d: '巨大箭矢貫穿一整排敵人' }, s4: { n: '束縛箭', mp: 30, cd: 130, job: 2, d: '射出箭網，命中的敵人 2.5 秒無法移動（Boss 免疫）' }, s5: { n: '爆裂箭', mp: 48, cd: 100, job: 3, d: '貫穿箭命中後連環爆炸' }, s6: { n: '天弓・破軍', mp: 84, cd: 240, job: 4, d: '蓄力後射出貫穿整個畫面的巨箭，每隻打 4 次' } },
    brawler: { atk: { n: '直拳', cd: 18, d: '快速一拳，小幅擊退' }, s1: { n: '旋風腿', mp: 5, cd: 40, d: '同時踢中前後兩側的敵人' }, s2: { n: '昇龍拳', mp: 12, cd: 70, lv: 3, d: '往上躍起的上勾拳，連上層平台的敵人一起打' }, s3: { n: '氣功波', mp: 18, cd: 70, job: 1, d: '蓄氣後放出寬大的氣功波，重擊前方一整排' }, s4: { n: '百裂拳', mp: 30, cd: 120, job: 2, d: '對最近的一隻敵人連打 10 拳' }, s5: { n: '震地拳', mp: 46, cd: 110, job: 3, d: '捶地震波沿著地面往左右擴散' }, s6: { n: '天霸神拳', mp: 78, cd: 240, job: 4, d: '巨大拳頭從天而降，砸爛目標周圍' } },
    mech: { atk: { n: '雷射槍', cd: 28, d: '瞬間命中直線上第一隻敵人' }, s1: { n: '散彈砲', mp: 6, cd: 45, d: '近距離扇形散射，最多打 5 隻' }, s2: { n: '追蹤飛彈', mp: 14, cd: 90, lv: 3, d: '3 枚飛彈自動追蹤最近的敵人' }, s3: { n: '自動砲台', mp: 24, cd: 420, job: 1, d: '架設砲台 12 秒，自動射擊附近敵人' }, s4: { n: '地雷陣', mp: 32, cd: 130, job: 2, d: '在前方埋下 4 顆地雷，稍後連環引爆' }, s5: { n: '能量護盾', mp: 40, cd: 600, job: 3, d: '10 秒內受到的傷害減少 40%' }, s6: { n: '軌道衛星砲', mp: 84, cd: 240, job: 4, d: '衛星雷射對目標位置連續轟擊 6 次' } },
    demon: { atk: { n: '魔爪', cd: 24, d: '撕裂前方 2 隻，命中時回復少量 HP' }, s1: { n: '暗影吞噬', mp: 7, cd: 50, d: '吞噬前方最多 4 隻，每命中一隻回復 4% HP' }, s2: { n: '地獄鎖鏈', mp: 12, cd: 80, lv: 3, d: '把附近的敵人拉到面前並造成傷害' }, s3: { n: '惡魔化', mp: 20, cd: 600, job: 1, d: '消耗 10% HP，15 秒內攻擊 +30%、移動速度 +15%' }, s4: { n: '詛咒之霧', mp: 32, cd: 130, job: 2, d: '前方毒霧持續 4 秒，不斷侵蝕敵人' }, s5: { n: '深淵之門', mp: 48, cd: 120, job: 3, d: '深淵之手抓住前方敵人，1 秒後重重砸下' }, s6: { n: '靈魂收割', mp: 80, cd: 240, job: 4, d: '收割周圍敵人並回血，直接處決 HP 低於 15% 的一般怪' } },
    angel: { atk: { n: '光之羽', cd: 26, d: '扇形射出 3 片光羽' }, s1: { n: '治癒之光', mp: 10, cd: 90, d: '治療自己和附近隊友 20% HP' }, s2: { n: '聖十字', mp: 14, cd: 80, lv: 3, d: '在最近的敵人身上炸開十字聖光，上下左右都打得到' }, s3: { n: '祝福', mp: 24, cd: 600, job: 1, d: '自己和附近隊友 20 秒內攻擊 +20%' }, s4: { n: '天使之翼', mp: 36, cd: 480, job: 2, d: '自己和附近隊友 6 秒內受到的傷害減半' }, s5: { n: '審判之劍', mp: 50, cd: 120, job: 3, d: '聖劍從天而降，刺向最多 6 隻敵人' }, s6: { n: '神聖復活', mp: 90, cd: 420, job: 4, d: '復活附近倒地的隊友、治療全隊並重創周圍敵人' } },
  };
  SK.dragon = {
    atk: { n: '龍息彈', cd: 28, d: '龍吐出屬性火球；二轉後連吐兩發、四轉後一次三發', g: { type: 'proj', mult: 1.0, pierce: 0, col: '#ff8a3a', spd: 5 } },
    s1: { n: '龍爪撕裂', mp: 6, cd: 45, d: '龍往前撲，爪子橫掃前方最多 5 隻並擊退', g: { type: 'melee', w: 56, h: 36, mult: 2.0, max: 5, kb: 2.5, col: '#ffcf7a' } },
    s2: { n: '龍吼', mp: 12, cd: 90, lv: 3, d: '龍大吼一聲，震退周圍的敵人', g: { type: 'around', r: 85, hits: 1, mult: 2.0, kb: 3, col: '#ffd27a' } },
    a0: { n: '龍尾橫掃', mp: 6, cd: 40, lv: 8, d: '龍尾在身邊橫掃兩圈', g: { type: 'around', r: 58, hits: 2, mult: 1.0, kb: 2.5, col: '#e0703a' } },
    s3: { n: '屬性吐息', mp: 20, cd: 90, job: 1, d: '龍朝前方持續噴出屬性吐息，連打 4 次', g: { type: 'line', len: 135, hits: 4, mult: .75, col: '#ff6a2a' } },
    b1: { n: '龍威', mp: 16, cd: 600, job: 1, d: '龍的威壓：20 秒內攻擊 +25%', g: { type: 'buff', buff: 'pow' } },
    c1: { n: '龍炎彈', mp: 14, cd: 60, job: 1, d: '吐出巨大的龍炎彈，可貫穿 2 隻', g: { type: 'proj', mult: 3.0, pierce: 2, col: '#ff8a3a', spd: 5, big: 1 } },
    s4: { n: '飛龍俯衝', mp: 32, cd: 130, job: 2, d: '龍飛上天再俯衝掃過前方一大片，連打 2 次', g: { type: 'line', len: 220, hits: 2, mult: 2.1, col: '#ffb04a' } },
    b2: { n: '龍鱗護體', mp: 18, cd: 600, job: 2, d: '龍鱗包覆全身：15 秒內受到傷害 -30%', g: { type: 'buff', buff: 'guard' } },
    c2: { n: '龍息爆彈', mp: 22, cd: 90, job: 2, d: '在最近的敵人身上引爆屬性龍息，連爆 2 次', g: { type: 'target', r: 180, rad: 46, hits: 2, mult: 2.1, col: '#ff7a2a' } },
    s5: { n: '龍王之怒', mp: 46, cd: 120, job: 3, d: '龍王的怒火轟向最近的敵人，大範圍連爆 2 次', g: { type: 'target', r: 220, rad: 72, hits: 2, mult: 2.8, col: '#ff5a2a' } },
    b3: { n: '龍之治癒', mp: 24, cd: 600, job: 3, d: '龍的生命力分給你：回復 30% HP', g: { type: 'heal', pct: .3 } },
    c3: { n: '龍旋風', mp: 30, cd: 100, job: 3, d: '龍拍翅捲起屬性旋風，周圍連打 4 次', g: { type: 'around', r: 95, hits: 4, mult: 1.4, kb: .5, col: '#ffb04a' } },
    s6: { n: '天崩龍隕', mp: 84, cd: 240, job: 4, d: '龍王衝上高空再砸下來，大範圍重擊 3 次', g: { type: 'target', r: 240, rad: 110, hits: 3, mult: 2.5, col: '#ffd23f' } },
    b4: { n: '龍魂共鳴', mp: 30, cd: 600, job: 4, d: '與龍心意相通：20 秒內移動速度 +25%、技能冷卻縮短', g: { type: 'buff', buff: 'haste' } },
    c4: { n: '千龍亂舞', mp: 40, cd: 120, job: 4, d: '召喚龍影同時撲向最近的 10 隻敵人', g: { type: 'multi', r: 260, n: 10, mult: 3.0, col: '#ffd23f' } },
  };
  // 每一轉 3 個技能：原本的 s1～s6 加上 a0、b1～b4、c1～c4（用通用技能引擎執行）
  Object.assign(SK.warrior, { a0: { n: '盾擊', mp: 5, cd: 40, lv: 8, d: '用盾牌重撞前方 2 隻並大幅擊退', g: {'type': 'melee', 'w': 30, 'h': 26, 'mult': 1.6, 'max': 2, 'kb': 4, 'col': '#c9ced9'} }, b1: { n: '怒吼', mp: 15, cd: 600, job: 1, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} }, c1: { n: '迴旋斬', mp: 14, cd: 70, job: 1, d: '原地旋轉，連砍周圍敵人 3 次', g: {'type': 'around', 'r': 55, 'hits': 3, 'mult': 0.95, 'col': '#ffd27a'} }, b2: { n: '鋼鐵意志', mp: 24, cd: 600, job: 2, d: '15 秒內受到傷害 -30%', g: {'type': 'buff', 'buff': 'guard'} }, c2: { n: '崩山擊', mp: 28, cd: 100, job: 2, d: '跳到最近的敵人身上重砸地面', g: {'type': 'target', 'r': 170, 'rad': 55, 'hits': 1, 'mult': 2.6, 'col': '#ffb34d', 'leap': 1} }, b3: { n: '突進連斬', mp: 34, cd: 90, job: 3, d: '往前突進，沿路連砍兩次', g: {'type': 'dash', 'dist': 110, 'hits': 2, 'mult': 1.9, 'col': '#ffb34d'} }, c3: { n: '斬鐵閃', mp: 38, cd: 100, job: 3, d: '一閃斬出直線刀光，連斬兩次', g: {'type': 'line', 'len': 180, 'hits': 2, 'mult': 2.2, 'col': '#ffffff'} }, b4: { n: '戰神之怒', mp: 70, cd: 200, job: 4, d: '怒氣爆發，周圍敵人被重擊 4 次', g: {'type': 'around', 'r': 150, 'hits': 4, 'mult': 1.45, 'col': '#ff6a3d'} }, c4: { n: '不滅意志', mp: 60, cd: 600, job: 4, d: '立刻回復 35% HP', g: {'type': 'heal', 'pct': 0.35} } });
  Object.assign(SK.mage, { a0: { n: '冰錐', mp: 6, cd: 40, lv: 8, d: '射出可貫穿一隻的冰錐', g: {'type': 'proj', 'mult': 1.35, 'pierce': 1, 'col': '#bfe8ff', 'spd': 5} }, b1: { n: '魔力爆發', mp: 18, cd: 600, job: 1, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} }, c1: { n: '火焰之環', mp: 16, cd: 80, job: 1, d: '身邊燃起火環，連燒 3 次', g: {'type': 'around', 'r': 60, 'hits': 3, 'mult': 0.95, 'col': '#ff7a2a'} }, b2: { n: '瞬間移動', mp: 10, cd: 120, job: 2, d: '往前瞬移一段距離', g: {'type': 'blink', 'dist': 110} }, c2: { n: '冰河時代', mp: 30, cd: 110, job: 2, d: '直線冰河衝擊，連打兩次', g: {'type': 'line', 'len': 200, 'hits': 2, 'mult': 1.75, 'col': '#bfe8ff'} }, b3: { n: '雷暴領域', mp: 40, cd: 120, job: 3, d: '在最近的敵人身邊降下雷暴，連劈 4 次', g: {'type': 'target', 'r': 220, 'rad': 70, 'hits': 4, 'mult': 0.95, 'col': '#ffe680'} }, c3: { n: '魔力再生', mp: 0, cd: 600, job: 3, d: '立刻回復 40% MP', g: {'type': 'mpheal', 'pct': 0.4} }, b4: { n: '星辰墜落', mp: 70, cd: 200, job: 4, d: '星辰砸向最近的敵人，大範圍轟炸 3 次', g: {'type': 'target', 'r': 240, 'rad': 90, 'hits': 3, 'mult': 1.8, 'col': '#c77dff'} }, c4: { n: '元素共鳴', mp: 60, cd: 160, job: 4, d: '元素同時打向最近的 6 隻敵人', g: {'type': 'multi', 'n': 6, 'r': 240, 'mult': 2.0, 'col': '#7fd3ff'} } });
  Object.assign(SK.rogue, { a0: { n: '毒刃', mp: 5, cd: 35, lv: 8, d: '淬毒的一刀，打前方 2 隻', g: {'type': 'melee', 'w': 30, 'h': 24, 'mult': 1.5, 'max': 2, 'kb': 0.5, 'col': '#7aff7a'} }, b1: { n: '疾風步', mp: 14, cd: 600, job: 1, d: '20 秒內移動速度 +25%、技能冷卻縮短', g: {'type': 'buff', 'buff': 'haste'} }, c1: { n: '暗影飛刀', mp: 12, cd: 60, job: 1, d: '射出可貫穿的暗影飛刀', g: {'type': 'proj', 'mult': 1.45, 'pierce': 99, 'col': '#c9a6ff', 'spd': 6} }, b2: { n: '煙霧彈', mp: 22, cd: 600, job: 2, d: '15 秒內受到傷害 -30%', g: {'type': 'buff', 'buff': 'guard'} }, c2: { n: '血舞', mp: 24, cd: 80, job: 2, d: '在前方舞出三道血刃', g: {'type': 'line', 'len': 90, 'hits': 3, 'mult': 1.25, 'col': '#ff3b6a'} }, b3: { n: '暗殺', mp: 40, cd: 120, job: 3, d: '對最近的一隻敵人致命一擊，爆擊率大增', g: {'type': 'target', 'r': 170, 'rad': 20, 'hits': 1, 'mult': 3.2, 'col': '#ff3b6a', 'crit': 40} }, c3: { n: '毒霧', mp: 36, cd: 110, job: 3, d: '周圍瀰漫毒霧，侵蝕 5 次', g: {'type': 'around', 'r': 70, 'hits': 5, 'mult': 0.6, 'col': '#7aff7a'} }, b4: { n: '影之盛宴', mp: 70, cd: 180, job: 4, d: '暗影同時撕裂最近的 8 隻敵人', g: {'type': 'multi', 'n': 8, 'r': 230, 'mult': 2.2, 'col': '#c9a6ff'} }, c4: { n: '夜幕降臨', mp: 60, cd: 600, job: 4, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} } });
  Object.assign(SK.archer, { a0: { n: '退避射擊', mp: 5, cd: 40, lv: 8, d: '往後跳開的同時射出一箭', g: {'type': 'proj', 'mult': 1.3, 'pierce': 0, 'col': '#f4e3b5', 'spd': 6, 'back': 1} }, b1: { n: '鷹眼', mp: 16, cd: 600, job: 1, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} }, c1: { n: '扇形散射', mp: 12, cd: 60, job: 1, d: '一次射出 3 支扇形箭', g: {'type': 'proj', 'mult': 0.95, 'pierce': 0, 'col': '#ffe08a', 'spd': 6, 'spread': 3} }, b2: { n: '疾風', mp: 20, cd: 600, job: 2, d: '20 秒內移動速度 +25%、技能冷卻縮短', g: {'type': 'buff', 'buff': 'haste'} }, c2: { n: '火焰箭', mp: 26, cd: 90, job: 2, d: '命中後爆炸的火焰箭', g: {'type': 'proj', 'mult': 2.0, 'pierce': 0, 'col': '#ff7a2a', 'spd': 6, 'boom': 1} }, b3: { n: '冰霜箭', mp: 34, cd: 90, job: 3, d: '貫穿一整排的冰霜箭', g: {'type': 'proj', 'mult': 1.9, 'pierce': 99, 'col': '#bfe8ff', 'spd': 7} }, c3: { n: '雷光箭', mp: 38, cd: 100, job: 3, d: '雷光同時射向最近的 4 隻敵人', g: {'type': 'multi', 'n': 4, 'r': 260, 'mult': 1.7, 'col': '#ffe680'} }, b4: { n: '鳳凰箭', mp: 70, cd: 180, job: 4, d: '化為鳳凰的巨箭，貫穿所有敵人', g: {'type': 'proj', 'mult': 2.7, 'pierce': 99, 'col': '#ff4a2a', 'spd': 7, 'big': 1} }, c4: { n: '自然之力', mp: 50, cd: 600, job: 4, d: '立刻回復 30% HP', g: {'type': 'heal', 'pct': 0.3} } });
  Object.assign(SK.brawler, { a0: { n: '鐵頭功', mp: 5, cd: 40, lv: 8, d: '用頭往前衝撞', g: {'type': 'dash', 'dist': 60, 'hits': 1, 'mult': 1.6, 'col': '#ffb34d'} }, b1: { n: '金剛體', mp: 16, cd: 600, job: 1, d: '15 秒內受到傷害 -30%', g: {'type': 'buff', 'buff': 'guard'} }, c1: { n: '連環踢', mp: 14, cd: 60, job: 1, d: '往前連踢三腳', g: {'type': 'line', 'len': 70, 'hits': 3, 'mult': 0.95, 'col': '#ffb34d'} }, b2: { n: '戰意高昂', mp: 22, cd: 600, job: 2, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} }, c2: { n: '獅子吼', mp: 26, cd: 100, job: 2, d: '大吼震傷周圍所有敵人', g: {'type': 'around', 'r': 110, 'hits': 1, 'mult': 1.9, 'col': '#ffe680'} }, b3: { n: '虎爪', mp: 34, cd: 80, job: 3, d: '虎爪撕裂前方 3 隻', g: {'type': 'melee', 'w': 42, 'h': 30, 'mult': 2.4, 'max': 3, 'kb': 2, 'col': '#ff6a3d'} }, c3: { n: '龍捲踢', mp: 38, cd: 110, job: 3, d: '旋身捲起龍捲，連踢 4 次', g: {'type': 'around', 'r': 60, 'hits': 4, 'mult': 0.95, 'col': '#ffb34d'} }, b4: { n: '八極崩', mp: 70, cd: 180, job: 4, d: '跳到最近的敵人身邊，崩勁連爆兩次', g: {'type': 'target', 'r': 180, 'rad': 60, 'hits': 2, 'mult': 2.7, 'col': '#ff6a3d', 'leap': 1} }, c4: { n: '氣沉丹田', mp: 50, cd: 600, job: 4, d: '立刻回復 35% HP', g: {'type': 'heal', 'pct': 0.35} } });
  Object.assign(SK.mech, { a0: { n: '火焰噴射', mp: 6, cd: 45, lv: 8, d: '噴出短距離火焰，連燒 3 次', g: {'type': 'line', 'len': 80, 'hits': 3, 'mult': 0.75, 'col': '#ff7a2a'} }, b1: { n: '超頻', mp: 16, cd: 600, job: 1, d: '20 秒內移動速度 +25%、技能冷卻縮短', g: {'type': 'buff', 'buff': 'haste'} }, c1: { n: '電磁脈衝', mp: 16, cd: 80, job: 1, d: '釋放電磁脈衝，打中周圍所有敵人', g: {'type': 'around', 'r': 80, 'hits': 1, 'mult': 1.55, 'col': '#5af0ff'} }, b2: { n: '修復奈米', mp: 20, cd: 600, job: 2, d: '立刻回復 25% HP', g: {'type': 'heal', 'pct': 0.25} }, c2: { n: '加特林', mp: 24, cd: 80, job: 2, d: '連射 5 發子彈', g: {'type': 'proj', 'mult': 0.6, 'pierce': 0, 'col': '#ffe680', 'spd': 7, 'burst': 5} }, b3: { n: '噴射推進', mp: 34, cd: 90, job: 3, d: '噴射往前衝，撞飛沿路的敵人', g: {'type': 'dash', 'dist': 140, 'hits': 1, 'mult': 1.6, 'col': '#5af0ff'} }, c3: { n: '集束炸彈', mp: 38, cd: 110, job: 3, d: '炸彈落在最近的敵人身邊，連炸 3 次', g: {'type': 'target', 'r': 220, 'rad': 70, 'hits': 3, 'mult': 1.15, 'col': '#ff7a2a'} }, b4: { n: '機甲覺醒', mp: 60, cd: 600, job: 4, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} }, c4: { n: '粒子加農', mp: 70, cd: 180, job: 4, d: '超長距離粒子砲，連打 3 次', g: {'type': 'line', 'len': 300, 'hits': 3, 'mult': 1.9, 'col': '#5af0ff'} } });
  Object.assign(SK.demon, { a0: { n: '血之印記', mp: 5, cd: 40, lv: 8, d: '在最近的敵人身上引爆血印並吸血', g: {'type': 'target', 'r': 150, 'rad': 30, 'hits': 1, 'mult': 1.6, 'col': '#ff2a4a', 'heal': 0.03} }, b1: { n: '血怒', mp: 16, cd: 600, job: 1, d: '20 秒內攻擊 +25%', g: {'type': 'buff', 'buff': 'pow'} }, c1: { n: '夢魘爪擊', mp: 14, cd: 60, job: 1, d: '撕裂前方 3 隻並吸血', g: {'type': 'melee', 'w': 44, 'h': 28, 'mult': 1.7, 'max': 3, 'kb': 1, 'col': '#8a1a2a', 'heal': 0.02} }, b2: { n: '黑暗屏障', mp: 22, cd: 600, job: 2, d: '15 秒內受到傷害 -30%', g: {'type': 'buff', 'buff': 'guard'} }, c2: { n: '吸魂', mp: 26, cd: 90, job: 2, d: '同時吸取最近 4 隻敵人的靈魂', g: {'type': 'multi', 'n': 4, 'r': 200, 'mult': 1.45, 'col': '#b46aff', 'heal': 0.03} }, b3: { n: '煉獄火焰', mp: 36, cd: 100, job: 3, d: '直線噴出煉獄之火，連燒 3 次', g: {'type': 'line', 'len': 160, 'hits': 3, 'mult': 1.15, 'col': '#ff4a2a'} }, c3: { n: '噬血狂潮', mp: 38, cd: 110, job: 3, d: '血潮捲過周圍，連打 3 次並吸血', g: {'type': 'around', 'r': 80, 'hits': 3, 'mult': 1.0, 'col': '#ff2a4a', 'heal': 0.02} }, b4: { n: '魔王之翼', mp: 70, cd: 180, job: 4, d: '展翼往前猛衝，撕裂沿路敵人兩次', g: {'type': 'dash', 'dist': 150, 'hits': 2, 'mult': 2.2, 'col': '#5a0a2a'} }, c4: { n: '末日黑炎', mp: 70, cd: 180, job: 4, d: '黑炎吞沒最近的敵人周圍，連燒 3 次', g: {'type': 'target', 'r': 240, 'rad': 100, 'hits': 3, 'mult': 1.8, 'col': '#5a0a2a'} } });
  Object.assign(SK.angel, { a0: { n: '聖光術', mp: 5, cd: 40, lv: 8, d: '在最近的敵人身上降下聖光', g: {'type': 'target', 'r': 170, 'rad': 40, 'hits': 1, 'mult': 1.55, 'col': '#fff6c8'} }, b1: { n: '聖光之盾', mp: 16, cd: 600, job: 1, d: '15 秒內受到傷害 -30%', g: {'type': 'buff', 'buff': 'guard'} }, c1: { n: '光之鎖鏈', mp: 14, cd: 70, job: 1, d: '光鏈同時打向最近 3 隻敵人', g: {'type': 'multi', 'n': 3, 'r': 200, 'mult': 1.45, 'col': '#fff6c8'} }, b2: { n: '天堂之光', mp: 20, cd: 600, job: 2, d: '立刻回復 30% HP', g: {'type': 'heal', 'pct': 0.3} }, c2: { n: '光輪', mp: 24, cd: 90, job: 2, d: '身邊展開光輪，連打 3 次', g: {'type': 'around', 'r': 70, 'hits': 3, 'mult': 0.95, 'col': '#ffe680'} }, b3: { n: '天使之歌', mp: 30, cd: 600, job: 3, d: '20 秒內移動速度 +25%、技能冷卻縮短', g: {'type': 'buff', 'buff': 'haste'} }, c3: { n: '聖光爆裂', mp: 38, cd: 100, job: 3, d: '在最近的敵人身邊引爆聖光，連爆兩次', g: {'type': 'target', 'r': 220, 'rad': 70, 'hits': 2, 'mult': 1.75, 'col': '#fff6c8'} }, b4: { n: '神之恩典', mp: 60, cd: 600, job: 4, d: '立刻回復 50% HP', g: {'type': 'heal', 'pct': 0.5} }, c4: { n: '天罰', mp: 70, cd: 180, job: 4, d: '天罰光束貫穿前方，連打 3 次', g: {'type': 'line', 'len': 260, 'hits': 3, 'mult': 1.85, 'col': '#ffe680'} } });
  // ---- 控制與持續傷害效果 ----
  // hard：完全不能動也不能攻擊；dot：持續傷害（造成這一擊傷害的 dot 倍，分 t 毫秒扣完）
  // Boss 與 PVP：控制時間只有 60%，而且同一個施放者要等「控制結束 + 5 秒」才能再控同一個目標（不同玩家可以輪流接控）
  const EF = {
    fz: { n: '凍結', t: 1000, hard: 1, col: '#9fe0ff' },
    pz: { n: '麻痺', t: 800, hard: 1, col: '#ffe680' },
    st: { n: '暈眩', t: 1000, hard: 1, col: '#ffd23f' },
    rt: { n: '束縛', t: 2500, col: '#8aff7a' },
    sl: { n: '緩速', t: 3000, col: '#b9a6ff' },
    bn: { n: '燒傷', t: 3000, dot: .6, col: '#ff7a2a' },
    ps: { n: '中毒', t: 5000, dot: .75, col: '#7aff7a' },
  };
  const CC_RES = .6, CC_IMM = 5000;
  const EFSK = {
    warrior: { a0: 'st', c2: 'st' },
    mage: { s1: 'bn', s2: 'pz', s3: 'fz', a0: 'sl', c1: 'bn', c2: 'fz', b3: 'pz' },
    rogue: { a0: 'ps', c3: 'ps' },
    archer: { s4: 'rt', b3: 'sl', c2: 'bn', c3: 'pz' },
    brawler: { s2: 'st', s5: 'st', c2: 'sl' },
    mech: { a0: 'bn', c1: 'pz', s4: 'st' },
    demon: { s2: 'rt', s4: 'ps', b3: 'bn', c4: 'bn' },
    angel: { c1: 'rt', c3: 'st' },
  };
  // 巨龍使者：效果依屬性決定
  const ELEM = { fire: { n: '火龍', ef: 'bn', col: '#ff6a2a', pet: 'qinglong', soul: '攻擊 +15%' }, thunder: { n: '雷龍', ef: 'pz', col: '#7fa8ff', pet: 'baihu', soul: '技能冷卻 -20%、移動速度 +20%' },
    ice: { n: '冰龍', ef: 'fz', col: '#bfefff', pet: 'xuanwu', soul: '防禦 +40%、HP +10%' }, dark: { n: '暗龍', ef: 'ps', col: '#c46aff', pet: 'zhuque', soul: '攻擊吸血 5%' } };
  const ELEMSK = ['s3', 'c2', 's5', 'c3'], ELEMSWAP = 100000;
  Object.assign(SK.dragon.c4, { dm: 2.5 }); SK.dragon.c3.dm = .8; SK.dragon.s6.dm = .85; SK.dragon.s5.dm = .9;
  for (const k of ELEMSK) { SK.dragon[k].ef = 'E'; SK.dragon[k].d += '（附加屬性效果：火燒傷、雷麻痺、冰凍結、暗中毒）'; }
  const efText = k => { const e = EF[k]; return e.dot ? `${e.n} ${e.t / 1000} 秒` : `${e.n} ${e.t / 1000} 秒`; };
  for (const [cls, m] of Object.entries(EFSK)) for (const [k, e] of Object.entries(m)) {
    const s = SK[cls][k]; s.ef = e; s.d = s.d.replace(/，?凍結敵人 0\.75 秒（Boss 免疫）|，命中的敵人 2\.5 秒無法移動（Boss 免疫）/, '') + `（${efText(e)}）`;
  }
  SK.archer.s6.d = '朝天空蓄力射出，巨箭從天上斜斜落在前方一大片區域';
  // ---- 技能強度與冷卻依階級排序（2026-11-27 實測後調整） ----
  // dm：伺服器端的傷害縮放，讓每招打單一目標的總傷害落在：初始 2.0、一轉 3.0、二轉 4.2、三轉 5.6、四轉 7.5
  // cd：攻擊招 初始 1 秒、一轉 1.5、二轉 2.2、三轉 3、四轉 4.5 秒；增益／補血招 15／20／25／30／35 秒（都不超過覺醒冷卻 60 秒）
  const REBAL = {"dm":{"warrior":{"s1":0.909,"s2":0.87,"s3":1.5,"s4":0.636,"s5":0.824,"s6":1.0,"c1":1.053,"c2":1.615,"b3":1.474,"c3":1.273,"b4":1.293,"a0":1.25},"mage":{"s1":1.25,"s2":1.29,"s3":0.938,"s4":0.48,"s5":0.982,"s6":0.987,"a0":1.481,"c1":1.053,"c2":1.2,"b3":1.474,"b4":1.389,"c4":3.75},"rogue":{"s1":0.784,"s2":0.435,"s4":0.933,"s5":3.5,"s6":1.19,"c1":2.069,"c2":1.12,"b3":1.75,"c3":1.867,"b4":3.409,"a0":1.333},"archer":{"s1":1.053,"s2":0.667,"s3":1.0,"s4":2.625,"s5":2.333,"s6":1,"a0":1.538,"c1":1.053,"c2":2.1,"b3":2.947,"c3":3.294,"b4":2.778},"brawler":{"s1":1.333,"s2":0.909,"s3":1.071,"s4":0.7,"s5":2.8,"s6":1.389,"a0":1.25,"c1":1.053,"c2":2.211,"b3":2.333,"c3":1.474,"b4":1.389},"mech":{"s1":1.429,"s2":1.053,"s4":0.913,"s6":0.694,"a0":0.889,"c1":1.935,"c2":1.4,"b3":3.5,"c3":1.623,"c4":1.316},"demon":{"s1":1.25,"s2":1.538,"s4":0.75,"s5":1.273,"s6":2.679,"a0":1.25,"c1":1.765,"c2":2.897,"b3":1.623,"c3":1.867,"b4":1.705,"c4":1.389},"angel":{"s2":1.0,"s5":2.545,"a0":1.29,"c1":2.069,"c2":1.474,"c3":1.6,"c4":1.351}},"cd":{"warrior":{"s1":60,"s2":60,"s3":90,"s4":132,"s5":180,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":180,"c3":180,"b4":270,"c4":2100},"mage":{"s1":60,"s2":60,"s3":90,"s4":132,"s5":180,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":132,"c2":132,"b3":180,"c3":1800,"b4":270,"c4":270},"rogue":{"s1":60,"s2":60,"s3":1200,"s4":132,"s5":180,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":180,"c3":180,"b4":270,"c4":2100},"archer":{"s1":60,"s2":60,"s3":90,"s4":132,"s5":180,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":180,"c3":180,"b4":270,"c4":2100},"brawler":{"s1":60,"s2":60,"s3":90,"s4":132,"s5":180,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":180,"c3":180,"b4":270,"c4":2100},"mech":{"s1":60,"s2":60,"s3":1200,"s4":132,"s5":1800,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":180,"c3":180,"b4":2100,"c4":270},"demon":{"s1":60,"s2":60,"s3":1200,"s4":132,"s5":180,"s6":270,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":180,"c3":180,"b4":270,"c4":270},"angel":{"s1":900,"s2":60,"s3":1200,"s4":1500,"s5":180,"s6":2100,"a0":60,"b1":1200,"c1":90,"b2":1500,"c2":132,"b3":1800,"c3":180,"b4":2100,"c4":270}}};
  SK.mech.c3.g.dyn = 1; SK.mech.c3.d = '丟出一捆炸藥包，在敵人身邊彈兩下後連環爆炸 3 次';
  for (const c in REBAL.cd) for (const k in REBAL.cd[c]) { SK[c][k].cd = REBAL.cd[c][k]; if (REBAL.dm[c] && REBAL.dm[c][k]) SK[c][k].dm = REBAL.dm[c][k]; }
  const efOf = (cls, c) => { const s = new Set(Object.values(EFSK[cls] || {})); if (cls === 'dragon' && c && ELEM[c.elem]) s.add(ELEM[c.elem].ef); return s; };
  // 還沒開放給一般玩家的職業（只有 GM 能建立）
  const HIDDEN = { dragon: 1 };
  // 技能欄位：X C V B N M 六格可以自由配置
  const SLOTN = 6, DEFSLOTS = ['s1', 's2', 's3', 's4', 's5', 's6'];
  const JOBLV = [0, 15, 30, 45, 60], JOBATK = [1, 1.15, 1.32, 1.5, 1.7], JOBHP = [1, 1.1, 1.22, 1.36, 1.5];
  // [名稱, 攻擊, 等級, 價格]
  const WEAPONS = {
    warrior: [['木劍', 0, 1, 0], ['鐵劍', 8, 8, 300], ['騎士長劍', 20, 16, 1600], ['聖銀大劍', 36, 24, 5200], ['屠龍巨劍', 58, 32, 13000], ['神諭聖劍', 82, 40, 30000], ['龍牙劍', 112, 50, 62000], ['天罰之刃', 150, 60, 115000]],
    mage: [['木杖', 0, 1, 0], ['魔法杖', 9, 8, 300], ['星辰法杖', 22, 16, 1600], ['元素權杖', 40, 24, 5200], ['賢者之杖', 64, 32, 13000], ['星界法典', 90, 40, 30000], ['深淵魔杖', 124, 50, 62000], ['創世權杖', 165, 60, 115000]],
    rogue: [['小刀', 0, 1, 0], ['精鋼匕首', 7, 8, 300], ['影刃', 18, 16, 1600], ['夜行雙刃', 33, 24, 5200], ['無聲之牙', 52, 32, 13000], ['幽冥刃', 75, 40, 30000], ['影月雙刃', 104, 50, 62000], ['冥神之爪', 140, 60, 115000]],
    archer: [['短弓', 0, 1, 0], ['獵弓', 8, 8, 300], ['精靈長弓', 20, 16, 1600], ['風之弓', 36, 24, 5200], ['天穹神弓', 58, 32, 13000], ['獵星弓', 82, 40, 30000], ['蒼龍弓', 112, 50, 62000], ['銀河神弓', 150, 60, 115000]],
    brawler: [['布手套', 0, 1, 0], ['皮拳套', 8, 8, 300], ['鐵拳套', 20, 16, 1600], ['猛虎拳套', 36, 24, 5200], ['龍爪拳套', 58, 32, 13000], ['金剛拳套', 82, 40, 30000], ['霸王拳套', 112, 50, 62000], ['武神之拳', 150, 60, 115000]],
    mech: [['鐵管槍', 0, 1, 0], ['改造手槍', 8, 8, 300], ['電漿槍', 20, 16, 1600], ['磁軌步槍', 36, 24, 5200], ['粒子砲', 58, 32, 13000], ['量子加農', 82, 40, 30000], ['反物質砲', 112, 50, 62000], ['星核毀滅者', 150, 60, 115000]],
    demon: [['骨刃', 0, 1, 0], ['血爪', 8, 8, 300], ['惡魔鐮', 20, 16, 1600], ['夢魘鐮刀', 36, 24, 5200], ['煉獄魔鐮', 58, 32, 13000], ['魂噬者', 82, 40, 30000], ['冥火魔鐮', 112, 50, 62000], ['深淵之鐮', 150, 60, 115000]],
    angel: [['羽杖', 0, 1, 0], ['祈禱權杖', 8, 8, 300], ['光之權杖', 20, 16, 1600], ['熾天權杖', 36, 24, 5200], ['天使聖杖', 58, 32, 13000], ['星輝聖杖', 82, 40, 30000], ['晨星權杖', 112, 50, 62000], ['天堂之鑰', 150, 60, 115000]],
  };
  // 傳說專屬武器：商店不賣，只會從「虛空裂隙」的怪物身上隨機掉落（第 5 個欄位 1 = 傳說）
  WEAPONS.dragon = [['幼龍之珠', 0, 1, 0], ['青銅龍珠', 8, 8, 300], ['赤炎龍珠', 20, 16, 1600], ['蒼雷龍珠', 36, 24, 5200], ['寒冰龍珠', 58, 32, 13000], ['暗影龍珠', 82, 40, 30000], ['龍王寶珠', 112, 50, 62000], ['龍神之心', 150, 60, 115000]];
  const LEGEND = { dragon: '燭龍之眼', warrior: '軒轅劍', mage: '太初法典', rogue: '月影雙刃・朧', archer: '后羿射日弓', brawler: '盤古神拳', mech: '創世機神砲', demon: '路西法之鐮', angel: '米迦勒之劍' };
  for (const k in WEAPONS) WEAPONS[k].push([LEGEND[k], 230, 80, 0, 1, { crit: 3 }, { c1: '#ff4fd8', c2: '#ffe680', fx: 'star' }]);
  const LEGI = 8, LEGGOLD = 50000;
  // ===== 100 等裝備擴充 =====
  // 武器格式：[名稱, 攻擊, 需求等級, 價格, 等級（0 商店／1 傳說／2 神話）, 額外能力, 外觀]
  // 索引：0～7 商店、8 舊傳說、9～10 商店（Lv90／100）、11～15 傳說、16～18 神話
  const WNEW = {
    dragon: [['真龍寶珠', '太古龍晶'], ['應龍之珠', '蛟龍逆鱗', '螭吻寶珠', '睚眥血珠', '狻猊炎珠'], ['祖龍神珠', '燭龍神目', '鴻蒙龍元']],
    warrior: [['破軍戰刃', '霸王神劍'], ['赤霄神劍', '湛盧', '干將', '莫邪', '屠神之刃'], ['誅仙劍', '戮仙劍', '絕仙劍']],
    mage: [['大魔導杖', '永恆星杖'], ['神農百草杖', '伏羲八卦杖', '女媧補天石', '崑崙仙杖', '玄冥寒杖'], ['鴻蒙紫氣杖', '混沌源杖', '太極陰陽杖']],
    rogue: [['月蝕雙刃', '無影刺'], ['魚腸劍', '純鈞', '勝邪', '巨闕', '影武者之刃'], ['刑天之刃', '九幽冥刃', '天罰影刺']],
    archer: [['破空長弓', '穿雲神弓'], ['震天弓', '乾坤弓', '落日弓', '追星弓', '月神之弓'], ['金烏射日弓', '穿楊天弓', '鴻鵠神弓']],
    brawler: [['鬼神拳套', '天王拳套'], ['金剛伏魔拳', '如來神掌', '降龍拳套', '伏虎拳套', '羅漢拳套'], ['大日如來拳', '須彌山拳', '混元一氣拳']],
    mech: [['電磁砲', '等離子殲滅者'], ['雷神之錘砲', '天穹軌道砲', '零式光束砲', '超新星發射器', '黑洞引擎砲'], ['創世紀元砲', '神之杖', '永恆核心砲']],
    demon: [['血月魔鐮', '冥王鐮刀'], ['撒旦之鐮', '別西卜之鐮', '阿撒茲勒之鐮', '莉莉絲之鐮', '貝利亞之鐮'], ['混沌魔神鐮', '終焉之鐮', '原初黑暗鐮']],
    angel: [['聖光權杖', '天啟權杖'], ['加百列號角杖', '拉斐爾治癒杖', '烏列爾之劍杖', '梅塔特隆聖杖', '聖杯權杖'], ['天父之光', '創世之羽杖', '永恆聖約杖']],
  };
  const WSHOP2 = [[270, 90, 220000], [320, 100, 420000]];
  const WLEG = [[330, 85, { crit: 5 }, { c1: '#ff3b3b', c2: '#ffd23f', fx: 'flame' }], [360, 88, { critD: .25 }, { c1: '#7fd3ff', c2: '#ffffff', fx: 'frost' }],
    [390, 92, { skillB: .12 }, { c1: '#ffd23f', c2: '#fff6c0', fx: 'holy' }], [420, 96, { cdr: .08 }, { c1: '#3affc8', c2: '#b46aff', fx: 'void' }], [450, 100, { atkP: .08 }, { c1: '#ff4fd8', c2: '#ffe680', fx: 'star' }]];
  const WMYTH = [[520, 100, { crit: 8, critD: .3 }, { c1: '#ffffff', c2: '#ff2a6a', fx: 'chaos' }], [560, 100, { skillB: .18, cdr: .08 }, { c1: '#ffe680', c2: '#7a2aff', fx: 'cosmos' }],
    [600, 100, { atkP: .12, spdB: .08 }, { c1: '#00ffd5', c2: '#ff6a2a', fx: 'prism' }]];
  for (const k in WEAPONS) { const n = WNEW[k];
    WSHOP2.forEach(([a, l, p], j) => WEAPONS[k].push([n[0][j], a, l, p, 0]));
    WLEG.forEach(([a, l, b, lk], j) => WEAPONS[k].push([n[1][j], a, l, 0, 1, b, lk]));
    WMYTH.forEach(([a, l, b, lk], j) => WEAPONS[k].push([n[2][j], a, l, 0, 2, b, lk])); }
  const SHOPW = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10];   // 商店武器的升級順序
  const TIERN = ['', '傳說', '神話'];
  const BONUSN = { crit: v => `爆擊率 +${v}%`, critD: v => `爆擊傷害 +${Math.round(v * 100)}%`, skillB: v => `技能傷害 +${Math.round(v * 100)}%`, cdr: v => `冷卻縮短 ${Math.round(v * 100)}%`,
    atkP: v => `攻擊力 +${Math.round(v * 100)}%`, spdB: v => `移動速度 +${Math.round(v * 100)}%`, hpP: v => `HP 上限 +${Math.round(v * 100)}%`, defP: v => `防禦 +${Math.round(v * 100)}%` };
  const bonusText = b => Object.entries(b || {}).map(([k, v]) => BONUSN[k] ? BONUSN[k](v) : '').filter(Boolean).join('、');
  // [名稱, 防禦, HP, 等級, 價格]
  const ARMORS = [['布衣', 0, 0, 1, 0], ['皮甲', 4, 30, 8, 250], ['鎖子甲', 10, 90, 16, 1400], ['秘銀鎧', 18, 180, 24, 4600], ['龍鱗甲', 30, 340, 32, 12000], ['神聖鎧甲', 44, 560, 40, 26000], ['暗黑龍甲', 60, 820, 50, 56000], ['天穹戰衣', 80, 1150, 60, 105000]];
  // 防具格式：[名稱, 防禦, HP, 需求等級, 價格, 等級（0 商店／1 傳說／2 神話）, 額外能力, 外觀]；全職業共用
  // 索引：0～7 商店、8～9 商店（Lv90／100）、10～13 傳說、14～15 神話
  ARMORS.push(['天罡神鎧', 115, 1650, 90, 300000, 0], ['神威聖鎧', 140, 2050, 100, 480000, 0],
    ['青龍鱗甲', 160, 2300, 85, 0, 1, { hpP: .08 }, { c1: '#2ec48a', c2: '#bfffe0', fx: 'jade' }], ['白虎戰鎧', 170, 2400, 88, 0, 1, { critD: .2 }, { c1: '#f4f4f4', c2: '#3a3a4a', fx: 'frost' }],
    ['朱雀羽衣', 175, 2500, 92, 0, 1, { cdr: .08, spdB: .06 }, { c1: '#ff4a2a', c2: '#ffd23f', fx: 'flame' }], ['玄武龜甲', 195, 2800, 96, 0, 1, { defP: .12 }, { c1: '#2a4a5a', c2: '#7fd3ff', fx: 'void' }],
    ['鴻蒙仙衣', 240, 3400, 100, 0, 2, { hpP: .12, skillB: .1 }, { c1: '#ffffff', c2: '#ffd23f', fx: 'cosmos' }], ['混沌戰甲', 260, 3600, 100, 0, 2, { defP: .15, atkP: .06 }, { c1: '#1a0a2a', c2: '#ff2a6a', fx: 'chaos' }]);
  const SHOPA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  // 掉落：傳說 0.5%（Lv55 以上的 Boss）、神話 0.1%（深淵海溝以後的 Boss，以及所有暗黑版 Boss）；暗黑版機率 ×5
  const LOOT = { leg: .005, myth: .001, legLv: 55, mythMap: 10, darkMul: 5 };
  // 每位玩家擁有的傳說／神話裝備：c.own = { w: [武器索引], a: [防具索引] }；商店買到的最好裝備：c.shopW / c.shopA；外觀：c.lookW / c.lookA
  function gearOk(c) { if (!c) return c; if (!c.own) { c.own = { w: [], a: [] }; if (c.wep === LEGI) c.own.w.push(LEGI); c.shopW = c.wep === LEGI ? 7 : (c.wep || 0); c.shopA = c.arm || 0; }
    if (c.shopW == null) c.shopW = 0; if (c.shopA == null) c.shopA = 0;
    // 2026-11-28f：商店裝備也改成收藏制（舊存檔把目前最好的商店裝備放進背包）
    if (!c.own.v2) { c.own.v2 = 1; if (!c.own.w.includes(c.shopW)) c.own.w.push(c.shopW); if (!c.own.a.includes(c.shopA)) c.own.a.push(c.shopA); }
    if (!c.enh) c.enh = { w: {}, a: {} }; if (!c.mat) c.mat = {};
    return c; }
  // ---- 裝備強化（潮聲港的鐵匠 老鐵） ----
  // ENH[n]：強化到 +n 的成功率、這一級的加成、需要的材料和金幣、失敗是否降級、失敗時的毀損機率
  const ENH = [null];
  for (let n = 1; n <= 15; n++) ENH.push({ rate: n <= 5 ? 1 : n <= 7 ? .7 : n <= 10 ? .4 : [.3, .25, .2, .15, .1][n - 11], add: n <= 5 ? .05 : n <= 7 ? .06 : n <= 10 ? .08 : .4,
    mat: n <= 7 ? 's1' : n <= 10 ? 's2' : 's3', num: n <= 5 ? 1 : n <= 7 ? 2 : 1, gold: n <= 5 ? 5000 * n : n <= 7 ? 30000 : n <= 10 ? 80000 : 200000, down: n >= 8, brk: n >= 11 ? [.1, .15, .2, .25, .3][n - 11] : 0 });
  const ENHMAX = 15, enhB = n => { let t = 0; for (let k = 1; k <= Math.min(ENHMAX, n | 0); k++) t += ENH[k].add; return Math.round(t * 100) / 100; };
  const MATN = { s1: '強化石', s2: '高級強化石', s3: '神話強化石', luck: '加成卷軸', luck2: '高級加成卷軸', guard: '守護卷軸' };
  const SCROLL = { luck: { add: .1, price: 200000 }, luck2: { add: .2, price: 0 }, guard: { price: 500000 }, s1: { price: 50000 } };   // s1：一般強化石也可以跟鐵匠買
  const XFER = { lose: 3, rate: .7, gold: 50000 };   // 移植：等級 -3、成功率 70%、金幣 50,000 × 原本的強化等級；失敗時原本那件歸零
  const SELLR = .3;   // 賣商店裝備：拿回 30%
  const enhOf = (c, k, i) => (c && c.enh && c.enh[k] && c.enh[k][i]) || 0;
  function legPool(c, tier) { gearOk(c); const ws = WEAPONS[c.cls].map((w, i) => w[4] === tier ? i : -1).filter(i => i >= 0 && !c.own.w.includes(i)).map(i => ({ k: 'w', i }));
    const as = ARMORS.map((a, i) => a[5] === tier ? i : -1).filter(i => i >= 0 && !c.own.a.includes(i)).map(i => ({ k: 'a', i }));
    const ms = Object.keys(MOUNTS).filter(id => MOUNTS[id].tier === tier && !(c.mounts || []).includes(id)).map(id => ({ k: 'm', id }));
    return [...ws, ...as, ...ms]; }
  const SHOP = { pot: 25, eth: 30, pot10: 240, rest: 15 };
  // 藥水依角色等級漲價（紅藥水；藍藥水再貴 20%；10 瓶裝打 96 折；完全休息和紅藥水同價）
  const POTMAX = 100;   // 紅、藍藥水各自最多攜帶 100 瓶（已經超過的保留，用到 100 以下才能補）
  const POTCD = 1500; // 紅、藍藥水各自的冷卻（毫秒）
  function shopPrice(k, lv) { const red = lv >= 80 ? 2500 : lv >= 60 ? 1000 : lv >= 30 ? 250 : 30;
    return k === 'pot' || k === 'rest' ? red : k === 'eth' ? Math.round(red * 1.2) : k === 'pot10' ? Math.round(red * 10 * .96) : 0; }
  const MON = {
    slime: { name: '果凍史萊姆', lv: 1, hp: 32, atk: 8, exp: 8, gold: [3, 6], w: 14, h: 11, spd: .45 },
    shroom: { name: '紅帽蘑菇', lv: 4, hp: 75, atk: 14, exp: 18, gold: [6, 12], w: 14, h: 16, spd: .55 },
    stump: { name: '憤怒樹墩', lv: 7, hp: 150, atk: 22, exp: 34, gold: [12, 20], w: 16, h: 17, spd: .4 },
    king: { name: '巨菇王', lv: 10, hp: 2400, atk: 34, exp: 600, gold: [250, 320], w: 44, h: 40, spd: .5, boss: true, sk: ['slam', 'roll', 'bounce'], skn: { slam: '巨菇重壓（跳起來躲）', roll: '滾動巨菇（跳過去）', bounce: '蘑菇跳壓（離開紅圈）' } },
    snowslime: { name: '雪球史萊姆', lv: 16, hp: 380, atk: 62, exp: 72, gold: [30, 45], w: 14, h: 11, spd: .5 },
    icewolf: { name: '冰原狼', lv: 20, hp: 520, atk: 80, exp: 96, gold: [40, 60], w: 20, h: 13, spd: .75 },
    yeti: { name: '雪怪', lv: 24, hp: 740, atk: 100, exp: 128, gold: [55, 80], w: 18, h: 22, spd: .4 },
    frost: { name: '冰霜巨人', lv: 28, hp: 13000, atk: 150, exp: 2600, gold: [1500, 2000], w: 46, h: 48, spd: .45, boss: true, sk: ['pillars', 'frostbreath', 'icering'], skn: { pillars: '冰錐陣（站在空隙）', frostbreath: '寒霜吐息（會被減速，繞到背後）', icering: '冰環爆發（離開它身邊）' } },
    fireslime: { name: '熔岩史萊姆', lv: 30, hp: 900, atk: 130, exp: 190, gold: [80, 110], w: 14, h: 11, spd: .5 },
    imp: { name: '火焰小惡魔', lv: 33, hp: 1150, atk: 155, exp: 232, gold: [95, 130], w: 14, h: 16, spd: .7 },
    golem: { name: '岩漿魔像', lv: 36, hp: 1550, atk: 185, exp: 285, gold: [120, 160], w: 20, h: 22, spd: .35 },
    balrog: { name: '炎魔王', lv: 38, hp: 42000, atk: 260, exp: 8000, gold: [5000, 6000], w: 50, h: 52, spd: .45, boss: true, sk: ['rain', 'pull', 'firefloor'], skn: { rain: '隕石雨（避開紅點）', pull: '熔岩漩渦（往外跑）', firefloor: '火海輪替（跑到另一邊）' } },
    knight: { name: '暗影騎士', lv: 45, hp: 3200, atk: 300, exp: 520, gold: [200, 260], w: 16, h: 24, spd: .55 },
    gargoyle: { name: '石像鬼', lv: 50, hp: 4300, atk: 350, exp: 650, gold: [240, 320], w: 20, h: 20, spd: .6 },
    reaper: { name: '死神', lv: 56, hp: 5600, atk: 410, exp: 800, gold: [300, 400], w: 18, h: 26, spd: .5 },
    dragon: { name:'黑龍王',lv:65,hp:120000,atk:480, exp: 32000, gold: [20000, 25000], w: 60, h: 50, spd: .45, boss: true, sk: ['breath', 'charge', 'tail'], skn: { breath: '龍息（繞到背後）', charge: '龍爪突襲（躲開箭頭方向）', tail: '甩尾（別站在牠背後）' } },
    seraph: { name: '墮落天使', lv: 66, hp: 8000, atk: 480, exp: 1100, gold: [340, 440], w: 18, h: 24, spd: .6 },
    stargolem: { name: '星辰魔像', lv: 70, hp: 10000, atk: 520, exp: 1300, gold: [380, 480], w: 22, h: 24, spd: .35 },
    phoenix: { name: '不死鳥', lv: 74, hp: 12000, atk: 560, exp: 1550, gold: [420, 540], w: 22, h: 18, spd: .75 },
    voidling: { name: '虛空獵手', lv: 86, hp: 34000, atk: 950, exp: 4200, gold: [1500, 2000], w: 16, h: 18, spd: .8, leg: .004 },
    chaosknight: { name: '混沌騎士', lv: 90, hp: 48000, atk: 1050, exp: 5200, gold: [1800, 2400], w: 18, h: 26, spd: .5, leg: .006 },
    abyssmage: { name: '深淵魔導師', lv: 94, hp: 62000, atk: 1150, exp: 6400, gold: [2200, 2800], w: 16, h: 24, spd: .45, leg: .008 },
    voidking: { name: '虛空之主', lv: 100, hp: 1200000, atk: 1300, exp: 250000, gold: [80000, 100000], w: 64, h: 62, spd: .45, boss: true, leg: .35, sk: ['homing', 'orbit', 'split'], skn: { homing: '混沌追蹤（一直移動甩掉）', orbit: '虛空環繞（別貼在它身邊）', split: '虛空分裂（低的跳過、高的別跳）' } },
    // ---- 深淵海溝（第 8 張地圖，Lv 101～105，要先解鎖 100 等） ----
    siren: { name: '深海人魚', lv: 101, hp: 52000, atk: 1080, exp: 9500, gold: [3000, 3800], w: 16, h: 20, spd: .75, leg: .01 },
    crab: { name: '鐵甲巨蟹', lv: 103, hp: 65000, atk: 1170, exp: 11500, gold: [3400, 4200], w: 24, h: 16, spd: .4, leg: .012 },
    pirate: { name: '幽靈海盜', lv: 104, hp: 78000, atk: 1270, exp: 13000, gold: [3800, 4600], w: 16, h: 26, spd: .6, leg: .014 },
    kraken: { name: '深淵海皇・克拉肯', lv: 105, hp: 1450000, atk: 1420, exp: 500000, gold: [150000, 180000], w: 68, h: 60, spd: .4, boss: true, leg: .5,
      sk: ['pillars', 'pull', 'split', 'homing'], skn: { pillars: '觸手破地（站在空隙）', pull: '深海漩渦（往外跑）', split: '雙層潮汐（低的跳過、高的蹲在地上）', homing: '追蹤墨彈（一直移動甩掉）' } },
    // ---- 珊瑚王國（第 9 張地圖，Lv 90～100，和虛空裂隙並行的海洋練功地） ----
    puffer: { name: '河豚兵', lv: 90, hp: 40000, atk: 1000, exp: 5000, gold: [1700, 2200], w: 16, h: 16, spd: .6, leg: .005 },
    seahorse: { name: '海馬騎士', lv: 94, hp: 46000, atk: 1070, exp: 6000, gold: [2000, 2600], w: 14, h: 26, spd: .7, leg: .007 },
    coralguard: { name: '珊瑚守衛', lv: 97, hp: 54000, atk: 1120, exp: 7000, gold: [2300, 2900], w: 20, h: 26, spd: .4, leg: .009 },
    mermqueen: { name: '人魚女王', lv: 100, hp: 1150000, atk: 1260, exp: 230000, gold: [75000, 95000], w: 60, h: 60, spd: .45, boss: true, leg: .35,
      sk: ['homing', 'icering', 'split', 'safe'], skn: { homing: '海妖之歌（一直移動甩掉）', icering: '漩渦結界（離開牠身邊）', split: '雙層浪潮（低的跳過、高的蹲在地上）', safe: '珍珠審判（站進綠色安全區）' } },
    // ---- 沉沒古城（第 10 張地圖，Lv 106～110；打倒古城守護神，等級上限 110 → 120） ----
    fishman: { name: '石像魚人', lv: 106, hp: 90000, atk: 1350, exp: 16000, gold: [4200, 5000], w: 16, h: 26, spd: .5, leg: .015 },
    ruinghost: { name: '遺跡幽靈', lv: 108, hp: 100000, atk: 1420, exp: 18000, gold: [4600, 5400], w: 16, h: 22, spd: .7, leg: .016 },
    ancientguard: { name: '古代守護者', lv: 109, hp: 112000, atk: 1470, exp: 20000, gold: [5000, 5800], w: 24, h: 30, spd: .35, leg: .018 },
    ruinlord: { name: '古城守護神', lv: 110, hp: 1900000, atk: 1560, exp: 800000, gold: [200000, 240000], w: 64, h: 64, spd: .4, boss: true, leg: .55,
      sk: ['pillars', 'laser', 'quake', 'charge'], skn: { pillars: '崩落石柱（站在空隙）', laser: '古代光束（站在地上別跳）', quake: '神殿震動（跳過震波）', charge: '守護衝撞（躲開箭頭方向）' } },
    // ---- 冰封海淵（第 11 張地圖，Lv 111～115） ----
    icejelly: { name: '冰晶水母', lv: 111, hp: 120000, atk: 1520, exp: 23000, gold: [5400, 6200], w: 16, h: 20, spd: .5, leg: .018 },
    narwhal: { name: '獨角鯨', lv: 113, hp: 132000, atk: 1580, exp: 25500, gold: [5800, 6600], w: 28, h: 14, spd: .8, leg: .02 },
    iceseal: { name: '冰甲海獸', lv: 114, hp: 144000, atk: 1630, exp: 28000, gold: [6200, 7000], w: 26, h: 18, spd: .4, leg: .022 },
    iceking: { name: '冰甲海獸王', lv: 115, hp: 2400000, atk: 1700, exp: 1100000, gold: [260000, 300000], w: 70, h: 56, spd: .4, boss: true, leg: .6,
      sk: ['frostbreath', 'icering', 'rain', 'split'], skn: { frostbreath: '極寒吐息（繞到背後）', icering: '冰甲震盪（離開牠身邊）', rain: '冰錐墜落（避開紅點）', split: '冰浪雙擊（低的跳、高的蹲）' } },
    // ---- 海底火山（第 12 張地圖，Lv 116～120，目前的最終地圖） ----
    lavacrab: { name: '熔岩蟹', lv: 116, hp: 156000, atk: 1680, exp: 31000, gold: [6600, 7400], w: 24, h: 16, spd: .45, leg: .022 },
    fireeel: { name: '火焰鰻', lv: 118, hp: 170000, atk: 1750, exp: 34500, gold: [7000, 7800], w: 30, h: 12, spd: .75, leg: .024 },
    ventgolem: { name: '熱泉魔像', lv: 119, hp: 185000, atk: 1800, exp: 38000, gold: [7400, 8200], w: 22, h: 28, spd: .35, leg: .026 },
    lavadragon: { name: '熔岩海龍', lv: 120, hp: 3000000, atk: 1900, exp: 1500000, gold: [320000, 380000], w: 72, h: 60, spd: .4, boss: true, leg: .65,
      sk: ['firefloor', 'breath', 'homing', 'pull', 'rain'], skn: { firefloor: '熔岩海床（跑到另一邊）', breath: '熔岩吐息（離開正前方）', homing: '追蹤火球（一直移動甩掉）', pull: '熱泉漩渦（往外跑）', rain: '火山彈（避開紅點）' } },
    // ---- 覺醒試煉的電腦對手：長得像玩家，用該職業風格的招式（預警較長、傷害較低） ----
    rival_warrior: { name: '試煉之影・劍聖', cls: 'warrior', lv: 80, sk: ['charge', 'breath', 'quake', 'tail'], skn: { charge: '衝鋒斬（躲開箭頭方向）', breath: '劍氣斬（繞到背後）', quake: '震地重擊（跳過震波）', tail: '回身斬（別站在牠背後）' } },
    rival_mage: { name: '試煉之影・魔導神', cls: 'mage', lv: 80, sk: ['rain', 'icering', 'homing', 'pillars'], skn: { rain: '隕石術（避開紅點）', icering: '冰環（離開牠身邊）', homing: '追蹤魔彈（一直移動）', pillars: '冰柱陣（站在空隙）' } },
    rival_rogue: { name: '試煉之影・冥王', cls: 'rogue', lv: 80, sk: ['charge', 'split', 'homing', 'orbit'], skn: { charge: '暗影突襲（躲開箭頭方向）', split: '飛刀雙擊（低的跳、高的蹲）', homing: '追蹤飛鏢（一直移動）', orbit: '環繞飛刃（別貼在牠身邊）' } },
    rival_archer: { name: '試煉之影・星辰弓神', cls: 'archer', lv: 80, sk: ['split', 'rain', 'roll', 'laser'], skn: { split: '連珠箭（低的跳、高的蹲）', rain: '箭雨（避開紅點）', roll: '貫穿巨箭（跳過去）', laser: '橫掃箭陣（站在地上別跳）' } },
    rival_brawler: { name: '試煉之影・武神', cls: 'brawler', lv: 80, sk: ['quake', 'charge', 'icering', 'bounce'], skn: { quake: '震地拳（跳過震波）', charge: '鐵頭衝撞（躲開箭頭方向）', icering: '獅子吼（離開牠身邊）', bounce: '飛身重拳（離開紅圈）' } },
    rival_mech: { name: '試煉之影・機神', cls: 'mech', lv: 80, sk: ['homing', 'rain', 'firefloor', 'laser'], skn: { homing: '追蹤飛彈（一直移動）', rain: '轟炸（避開紅點）', firefloor: '火焰噴射（跑到另一邊）', laser: '雷射掃射（站在地上別跳）' } },
    rival_demon: { name: '試煉之影・深淵君主', cls: 'demon', lv: 80, sk: ['pull', 'firefloor', 'tail', 'rain'], skn: { pull: '地獄鎖鏈（往外跑）', firefloor: '煉獄火海（跑到另一邊）', tail: '魔翼橫掃（別站在牠背後）', rain: '魔火雨（避開紅點）' } },
    rival_dragon: { name: '試煉之影・巨龍使者', cls: 'dragon', lv: 80, sk: ['breath', 'rain', 'charge', 'firefloor'], skn: { breath: '龍焰吐息（離開正前方）', rain: '龍炎雨（避開紅點）', charge: '飛龍突進（躲開箭頭方向）', firefloor: '烈焰大地（跳起來或離開）' } },
    rival_angel: { name: '試煉之影・天使長', cls: 'angel', lv: 80, sk: ['laser', 'pillars', 'safe', 'homing'], skn: { laser: '天罰橫掃（站在地上別跳）', pillars: '審判之劍（站在空隙）', safe: '神之審判（站進綠色安全區）', homing: '追蹤聖光（一直移動）' } },
    // 轉職試煉官：每個玩家獨立挑戰；招式預警比一般 Boss 長、傷害較低，一轉 1 招～四轉 4 招
    trial1: { name: '見習試煉官', lv: 15, hp: 6500, atk: 29, exp: 0, gold: [300, 300], w: 40, h: 40, spd: .4, boss: true, trial: 1, sk: ['slam'], skn: { slam: '試煉重壓（跳起來躲）' } },
    trial2: { name: '精英試煉官', lv: 30, hp: 15000, atk: 70, exp: 0, gold: [1500, 1500], w: 44, h: 44, spd: .42, boss: true, trial: 2, sk: ['slam', 'roll'], skn: { slam: '試煉重壓（跳起來躲）', roll: '試煉滾球（跳過去）' } },
    trial3: { name: '大師試煉官', lv: 45, hp: 27000, atk: 140, exp: 0, gold: [5000, 5000], w: 48, h: 48, spd: .44, boss: true, trial: 3, sk: ['slam', 'roll', 'pillars'], skn: { slam: '試煉重壓（跳起來躲）', roll: '試煉滾球（跳過去）', pillars: '試煉光柱（站在空隙）' } },
    trial4: { name: '傳說試煉官', lv: 60, hp: 42000, atk: 235, exp: 0, gold: [12000, 12000], w: 52, h: 52, spd: .46, boss: true, trial: 4, sk: ['slam', 'roll', 'pillars', 'icering'], skn: { slam: '試煉重壓（跳起來躲）', roll: '試煉滾球（跳過去）', pillars: '試煉光柱（站在空隙）', icering: '試煉光環（離開它身邊）' } },
    titan: { name: '天穹泰坦', lv: 80, hp: 240000, atk: 600, exp: 60000, gold: [30000, 40000], w: 62, h: 60, spd: .4, boss: true, sk: ['quake', 'laser', 'safe'], skn: { quake: '天崩地裂（跳過震波）', laser: '天罰橫掃（站在地上別跳）', safe: '神之審判（站進綠色安全區）' } },
  };
  // ---- 小怪特殊攻擊：每種小怪除了碰撞普攻，再一招有預警、躲得掉的短距離招式 ----
  // r：目標要在這個距離內（而且站在同一層）才會出招；len／rad／dist 是招式範圍，都和 r 差不多，不會隔很遠打人
  const MSP = {
    slime: { k: 'roll', r: 70, dist: 70, n: '彈跳衝撞' }, shroom: { k: 'rain', r: 90, n: '孢子炸彈' }, stump: { k: 'quake', r: 60, rad: 60, n: '樹根震擊' },
    snowslime: { k: 'roll', r: 80, dist: 80, n: '雪球滾撞' }, icewolf: { k: 'breath', r: 70, len: 70, n: '冰牙撲咬' }, yeti: { k: 'icering', r: 60, rad: 60, n: '冰霜怒吼' },
    fireslime: { k: 'rain', r: 90, n: '熔岩噴濺' }, imp: { k: 'homing', r: 110, n: '小火球' }, golem: { k: 'quake', r: 80, rad: 80, n: '岩漿震地' },
    knight: { k: 'breath', r: 80, len: 80, n: '暗影斬' }, gargoyle: { k: 'rain', r: 100, n: '石塊墜落', two: 1 }, reaper: { k: 'icering', r: 70, rad: 70, n: '死神鐮舞' },
    seraph: { k: 'homing', r: 110, n: '墮天之羽' }, stargolem: { k: 'quake', r: 90, rad: 90, n: '星辰重踏' }, phoenix: { k: 'breath', r: 90, len: 90, n: '烈焰吐息' },
    voidling: { k: 'roll', r: 100, dist: 100, n: '虛空突進' }, chaosknight: { k: 'breath', r: 90, len: 90, n: '混沌斬' }, abyssmage: { k: 'homing', r: 110, n: '深淵飛彈' },
    puffer: { k: 'roll', r: 90, dist: 90, n: '尖刺衝撞' }, seahorse: { k: 'breath', r: 90, len: 90, n: '長槍突刺' }, coralguard: { k: 'quake', r: 90, rad: 90, n: '珊瑚震擊' },
    fishman: { k: 'breath', r: 90, len: 90, n: '三叉戟突刺' }, ruinghost: { k: 'homing', r: 110, n: '怨靈追擊' }, ancientguard: { k: 'quake', r: 95, rad: 95, n: '古代重踏' },
    icejelly: { k: 'icering', r: 70, rad: 70, n: '冰晶脈衝' }, narwhal: { k: 'roll', r: 110, dist: 110, n: '長角衝刺' }, iceseal: { k: 'rain', r: 110, n: '冰塊投擲', two: 1 },
    lavacrab: { k: 'quake', r: 90, rad: 90, n: '熔岩砸地' }, fireeel: { k: 'breath', r: 100, len: 100, n: '火焰噴吐' }, ventgolem: { k: 'rain', r: 110, n: '熱泉噴發', two: 1 },
    siren: { k: 'homing', r: 110, n: '海妖之歌' }, crab: { k: 'quake', r: 90, rad: 90, n: '巨鉗砸地' }, pirate: { k: 'rain', r: 110, n: '幽靈砲擊', two: 1 },
  };
  for (const [t, sp] of Object.entries(MSP)) MON[t].sp = sp;
  for (const t in MON) if (t.startsWith('rival_')) Object.assign(MON[t], { hp: 330000, atk: 660, exp: 0, gold: [20000, 20000], w: 16, h: 28, spd: .55, boss: true, rival: 1 });
  // Boss 危險區：以牠最遠的招式射程為半徑（至少 200），站在這個範圍外或上方平台攻擊 Boss，Boss 不會受傷
  const BREACH = { slam: 85, roll: 240, bounce: 240, pillars: 240, frostbreath: 140, icering: 75, rain: 240, pull: 200, firefloor: 230, breath: 150, charge: 150, tail: 95, homing: 280, orbit: 85, split: 260, quake: 180, laser: 240, safe: 260 };
  function bossZone(t) { const m = MON[t]; if (!m || !m.boss) return 0; return Math.round(Math.max(200, ...(m.sk || []).map(k => BREACH[k] || 0)) + m.w / 2 + 20); }
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
    { name: '冰雪山谷', seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 330, x2: 480, y: 262 }, { x1: 450, x2: 640, y: 224 }, { x1: 700, x2: 860, y: 262 }, { x1: 830, x2: 1000, y: 224 }, { x1: 970, x2: 1160, y: 186 }, { x1: 1250, x2: 1420, y: 262 }, { x1: 1390, x2: 1580, y: 224 }, { x1: 1550, x2: 1760, y: 186 }, { x1: 1730, x2: 1960, y: 148 }, { x1: 1950, x2: 2090, y: 110 }]], ropes: [{ x: 2000, y1: 110, y2: GY }, { x: 1120, y1: 186, y2: GY }], pal: 'snow', spawns: layout('snowslime', 'icewolf', 'yeti', 'frost'), zones: [[260, '山谷入口'], [700, '雪原'], [1200, '冰柱林'], [2100, '暴風雪坡'], [9e9, '冰霜巨人之巔']],
      portals: [{ x: 60, to: 0, tx: 2490, label: '← 蘑菇森林' }, { x: 2560, to: 2, tx: 150, rec: 30, label: '熔岩深淵' }], start: 150 },
    { name: '熔岩深淵', seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 330, x2: 450, y: 230 }, { x1: 380, x2: 560, y: 160 }, { x1: 700, x2: 820, y: 240 }, { x1: 860, x2: 1000, y: 190 }, { x1: 1020, x2: 1170, y: 130 }, { x1: 1230, x2: 1360, y: 230 }, { x1: 1400, x2: 1540, y: 170 }, { x1: 1570, x2: 1740, y: 110 }, { x1: 1800, x2: 2050, y: 220 }]], ropes: [{ x: 350, y1: 230, y2: GY }, { x: 420, y1: 160, y2: 230 }, { x: 720, y1: 240, y2: GY }, { x: 880, y1: 190, y2: GY }, { x: 1040, y1: 130, y2: GY }, { x: 1250, y1: 230, y2: GY }, { x: 1420, y1: 170, y2: GY }, { x: 1590, y1: 110, y2: GY }, { x: 1820, y1: 220, y2: GY }], pal: 'lava', spawns: layout('fireslime', 'imp', 'golem', 'balrog'), zones: [[260, '深淵入口'], [700, '焦土'], [1200, '熔岩河'], [2100, '惡魔迴廊'], [9e9, '炎魔王的王座']],
      portals: [{ x: 60, to: 1, tx: 2490, label: '← 冰雪山谷' }, { x: 2560, to: 3, tx: 150, rec: 45, label: '暗黑神殿' }], start: 150 },
    { name: '暗黑神殿', seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 300, x2: 700, y: 240 }, { x1: 400, x2: 600, y: 170 }, { x1: 720, x2: 1180, y: 240 }, { x1: 780, x2: 940, y: 170 }, { x1: 980, x2: 1140, y: 170 }, { x1: 1220, x2: 1700, y: 240 }, { x1: 1280, x2: 1440, y: 170 }, { x1: 1480, x2: 1660, y: 100 }, { x1: 1820, x2: 2060, y: 200 }]], ropes: [{ x: 320, y1: 240, y2: GY }, { x: 420, y1: 170, y2: 240 }, { x: 740, y1: 240, y2: GY }, { x: 800, y1: 170, y2: 240 }, { x: 1120, y1: 170, y2: 240 }, { x: 1240, y1: 240, y2: GY }, { x: 1300, y1: 170, y2: 240 }, { x: 1500, y1: 100, y2: 240 }, { x: 1840, y1: 200, y2: GY }], pal: 'dark', spawns: layout('knight', 'gargoyle', 'reaper', 'dragon'), zones: [[260, '神殿大門'], [700, '騎士迴廊'], [1200, '石像大廳'], [2100, '冥河祭壇'], [9e9, '黑龍王的巢穴']],
      portals: [{ x: 60, to: 2, tx: 2490, label: '← 熔岩深淵' }, { x: 2560, to: 4, tx: 150, rec: 65, label: '天空聖域' }], start: 150 },
    { name: '天空聖域', seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 320, x2: 440, y: 260 }, { x1: 460, x2: 600, y: 220 }, { x1: 700, x2: 820, y: 260 }, { x1: 840, x2: 960, y: 220 }, { x1: 980, x2: 1160, y: 180 }, { x1: 1240, x2: 1360, y: 260 }, { x1: 1380, x2: 1500, y: 220 }, { x1: 1520, x2: 1660, y: 180 }, { x1: 1680, x2: 1800, y: 140 }, { x1: 1820, x2: 2000, y: 100 }]], ropes: [{ x: 1150, y1: 180, y2: GY }, { x: 1980, y1: 100, y2: GY }], pal: 'sky', spawns: layout('seraph', 'stargolem', 'phoenix', 'titan'), zones: [[260, '雲端階梯'], [700, '天使庭園'], [1200, '星辰廣場'], [2100, '不死鳥之巢'], [9e9, '天穹泰坦的王座']],
      portals: [{ x: 60, to: 3, tx: 2490, label: '← 暗黑神殿' }, { x: 2560, to: 5, tx: 150, rec: 80, label: '虛空裂隙' }], start: 150 },
    { name: '虛空裂隙', seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 300, x2: 520, y: 200 }, { x1: 500, x2: 700, y: 250 }, { x1: 720, x2: 900, y: 180 }, { x1: 900, x2: 1060, y: 240 }, { x1: 1060, x2: 1180, y: 150 }, { x1: 1220, x2: 1420, y: 210 }, { x1: 1420, x2: 1600, y: 250 }, { x1: 1600, x2: 1780, y: 160 }, { x1: 1820, x2: 2060, y: 230 }]], ropes: [{ x: 320, y1: 200, y2: GY }, { x: 680, y1: 250, y2: GY }, { x: 740, y1: 180, y2: GY }, { x: 1040, y1: 240, y2: GY }, { x: 1080, y1: 150, y2: GY }, { x: 1240, y1: 210, y2: GY }, { x: 1580, y1: 250, y2: GY }, { x: 1620, y1: 160, y2: GY }, { x: 1840, y1: 230, y2: GY }], pal: 'void', spawns: layout('voidling', 'chaosknight', 'abyssmage', 'voidking'), zones: [[260, '裂隙邊緣'], [700, '虛空荒原'], [1200, '混沌要塞'], [2100, '深淵回廊'], [9e9, '虛空之主的王座']],
      portals: [{ x: 60, to: 4, tx: 2490, label: '← 天空聖域' }, { x: 2560, to: 9, tx: 150, label: '潮聲港' }], start: 150 },
    // ---- 特殊地圖（不會出現在一般傳送門的路線上） ----
    { name: '決鬥場', pal: 'arena', pvp: 'duel', spawns: [], seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, { x1: 860, x2: 1040, y: 240 }, { x1: 1160, x2: 1340, y: 240 }], ropes: [{ x: 880, y1: 240, y2: GY }, { x: 1320, y1: 240, y2: GY }],
      zones: [[9e9, '決鬥場']], portals: [], start: 1100, lo: 700, hi: 1500 },
    { name: '競技場', pal: 'arena', pvp: 'arena', spawns: [], seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, { x1: 500, x2: 700, y: 240 }, { x1: 800, x2: 1000, y: 180 }, { x1: 1100, x2: 1300, y: 240 }, { x1: 1400, x2: 1600, y: 180 }, { x1: 1700, x2: 1900, y: 240 }],
      ropes: [{ x: 520, y1: 240, y2: GY }, { x: 820, y1: 180, y2: GY }, { x: 1120, y1: 240, y2: GY }, { x: 1420, y1: 180, y2: GY }, { x: 1720, y1: 240, y2: GY }],
      zones: [[9e9, '競技場']], portals: [{ x: 60, to: -1, ret: 1, label: '離開競技場' }], start: 1200, lo: 300, hi: 2100 },
    { name: '轉職試煉之地', pal: 'trial', trial: 1, spawns: [], seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, { x1: 500, x2: 700, y: 240 }, { x1: 1500, x2: 1700, y: 240 }],
      ropes: [{ x: 520, y1: 240, y2: GY }, { x: 1680, y1: 240, y2: GY }], zones: [[9e9, '轉職試煉之地']], portals: [{ x: 60, to: -1, ret: 1, label: '放棄試煉' }], start: 300 },
    // ---- 第 7 張地圖：潮聲港（村落；碼頭搭船前往深淵海溝）----
    { name: '潮聲港', pal: 'harbor', town: true, safe: true, spawns: [], home: 9,
      seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, { x1: 420, x2: 600, y: 250 }, { x1: 900, x2: 1100, y: 240 }, { x1: 1400, x2: 1560, y: 250 }],
      ropes: [{ x: 440, y1: 250, y2: GY }, { x: 1080, y1: 240, y2: GY }, { x: 1420, y1: 250, y2: GY }],
      npcs: [{ x: 300, kind: 'shop', name: '雜貨商 阿珠' }, { x: 760, kind: 'smith', name: '鐵匠 老鐵' }, { x: 2330, kind: 'boat', name: '船長 老海' }], dock: 2240,
      zones: [[700, '港口入口'], [1800, '漁村市集'], [9e9, '碼頭']], portals: [{ x: 60, to: 5, tx: 2490, label: '← 虛空裂隙' }], start: 150 },
    // ---- 第 8 張地圖：深淵海溝（Lv 101～105）----
    { name: '深淵海溝', pal: 'abyss', sea: 1, home: 9, seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 320, x2: 500, y: 236 }, { x1: 520, x2: 680, y: 176 }, { x1: 720, x2: 880, y: 246 }, { x1: 900, x2: 1040, y: 186 }, { x1: 1060, x2: 1200, y: 126 }, { x1: 1240, x2: 1400, y: 236 }, { x1: 1420, x2: 1580, y: 176 }, { x1: 1600, x2: 1760, y: 120 }, { x1: 1800, x2: 2060, y: 206 }]],
      ropes: [{ x: 340, y1: 236, y2: GY }, { x: 540, y1: 176, y2: 236 }, { x: 740, y1: 246, y2: GY }, { x: 920, y1: 186, y2: GY }, { x: 1080, y1: 126, y2: 186 }, { x: 1260, y1: 236, y2: GY }, { x: 1440, y1: 176, y2: 236 }, { x: 1620, y1: 120, y2: 176 }, { x: 1820, y1: 206, y2: GY }],
      spawns: layout('siren', 'crab', 'pirate', 'kraken'), zones: [[260, '沉船淺灘'], [700, '珊瑚礁'], [1200, '海盜船骸'], [2100, '深淵斷崖'], [9e9, '海皇的巢穴']],
      portals: [{ x: 60, to: 9, tx: 2200, label: '← 搭船回潮聲港' }, { x: 2560, to: 12, tx: 150, cap: 110, label: '沉沒古城' }], start: 150, deep: 1, need: 100 },
    // ---- 第 9 張海洋地圖：珊瑚王國（Lv 90～100；和虛空裂隙並行，搭船前往）----
    // bubbles：上升氣泡柱，站進去會被托上高處
    { name: '珊瑚王國', pal: 'coral', sea: 1, home: 9, need: 100, seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 320, x2: 480, y: 230 }, { x1: 520, x2: 700, y: 160 }, { x1: 740, x2: 900, y: 240 }, { x1: 920, x2: 1080, y: 170 }, { x1: 1100, x2: 1220, y: 110 }, { x1: 1260, x2: 1420, y: 230 }, { x1: 1450, x2: 1620, y: 160 }, { x1: 1640, x2: 1780, y: 100 }, { x1: 1820, x2: 2060, y: 210 }]],
      ropes: [{ x: 340, y1: 230, y2: GY }, { x: 760, y1: 240, y2: GY }, { x: 1280, y1: 230, y2: GY }, { x: 1840, y1: 210, y2: GY }],
      bubbles: [505, 910, 1090, 1435, 1630], spawns: layout('puffer', 'seahorse', 'coralguard', 'mermqueen'),
      zones: [[260, '珊瑚入口'], [700, '海葵花園'], [1200, '珍珠大道'], [2100, '人魚宮殿'], [9e9, '女王的珊瑚王座']],
      portals: [{ x: 60, to: 9, tx: 2200, label: '← 搭船回潮聲港' }], start: 150 },
    // ---- 沉沒古城（Lv 106～110）：機關門會定時開關、天花板的石柱會崩落 ----
    { name: '沉沒古城', pal: 'ruins', sea: 1, home: 9, need: 110, deep: 1, seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 300, x2: 520, y: 236 }, { x1: 460, x2: 660, y: 172 }, { x1: 720, x2: 880, y: 236 }, { x1: 860, x2: 1040, y: 176 }, { x1: 1000, x2: 1180, y: 116 }, { x1: 1260, x2: 1420, y: 236 }, { x1: 1440, x2: 1600, y: 176 }, { x1: 1620, x2: 1780, y: 116 }, { x1: 1820, x2: 2060, y: 220 }]],
      ropes: [{ x: 320, y1: 236, y2: GY }, { x: 480, y1: 172, y2: 236 }, { x: 740, y1: 236, y2: GY }, { x: 880, y1: 176, y2: 236 }, { x: 1020, y1: 116, y2: 176 }, { x: 1280, y1: 236, y2: GY }, { x: 1460, y1: 176, y2: 236 }, { x: 1640, y1: 116, y2: 176 }, { x: 1840, y1: 220, y2: GY }],
      gate: { x: 1220, open: 4500, shut: 3500 }, fall: [560, 980, 1520, 1940], spawns: layout('fishman', 'ruinghost', 'ancientguard', 'ruinlord'),
      zones: [[260, '古城外牆'], [700, '沉沒街道'], [1200, '神殿廣場'], [2100, '石像迴廊'], [9e9, '守護神的祭壇']],
      portals: [{ x: 60, to: 10, tx: 2490, label: '← 深淵海溝' }, { x: 2560, to: 13, tx: 150, cap: 120, label: '冰封海淵' }], start: 150 },
    // ---- 冰封海淵（Lv 111～115）：海流會把人往一邊推 ----
    { name: '冰封海淵', pal: 'icesea', sea: 1, home: 9, need: 120, deep: 1, seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 320, x2: 480, y: 246 }, { x1: 500, x2: 680, y: 186 }, { x1: 700, x2: 860, y: 236 }, { x1: 880, x2: 1040, y: 176 }, { x1: 1060, x2: 1200, y: 116 }, { x1: 1240, x2: 1400, y: 246 }, { x1: 1420, x2: 1580, y: 186 }, { x1: 1600, x2: 1760, y: 126 }, { x1: 1800, x2: 2060, y: 216 }]],
      ropes: [{ x: 340, y1: 246, y2: GY }, { x: 520, y1: 186, y2: 246 }, { x: 720, y1: 236, y2: GY }, { x: 900, y1: 176, y2: 236 }, { x: 1080, y1: 116, y2: 176 }, { x: 1260, y1: 246, y2: GY }, { x: 1440, y1: 186, y2: 246 }, { x: 1620, y1: 126, y2: 186 }, { x: 1820, y1: 216, y2: GY }],
      currents: [[420, 820, 1], [1000, 1380, -1], [1560, 2000, 1]], spawns: layout('icejelly', 'narwhal', 'iceseal', 'iceking'),
      zones: [[260, '冰層裂口'], [700, '極光淺海'], [1200, '冰柱森林'], [2100, '寒流深淵'], [9e9, '海獸王的冰窟']],
      portals: [{ x: 60, to: 12, tx: 2490, label: '← 沉沒古城' }, { x: 2560, to: 14, tx: 150, cap: 120, label: '海底火山' }], start: 150 },
    // ---- 海底火山（Lv 116～120，目前的最終地圖）：熱泉會定時噴發 ----
    { name: '海底火山', pal: 'volcano', sea: 1, home: 9, need: 120, deep: 1, seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 320, x2: 470, y: 230 }, { x1: 400, x2: 600, y: 166 }, { x1: 700, x2: 840, y: 240 }, { x1: 860, x2: 1020, y: 180 }, { x1: 1040, x2: 1190, y: 120 }, { x1: 1240, x2: 1380, y: 230 }, { x1: 1400, x2: 1560, y: 170 }, { x1: 1580, x2: 1760, y: 110 }, { x1: 1800, x2: 2060, y: 214 }]],
      ropes: [{ x: 340, y1: 230, y2: GY }, { x: 420, y1: 166, y2: 230 }, { x: 720, y1: 240, y2: GY }, { x: 880, y1: 180, y2: 240 }, { x: 1060, y1: 120, y2: 180 }, { x: 1260, y1: 230, y2: GY }, { x: 1420, y1: 170, y2: 230 }, { x: 1600, y1: 110, y2: 170 }, { x: 1820, y1: 214, y2: GY }],
      geysers: [640, 1120, 1500, 1790, 2010], spawns: layout('lavacrab', 'fireeel', 'ventgolem', 'lavadragon'),
      zones: [[260, '火山裂谷'], [700, '熔岩海床'], [1200, '熱泉群'], [2100, '火山口邊緣'], [9e9, '熔岩海龍的巢穴']],
      portals: [{ x: 60, to: 13, tx: 2490, label: '← 冰封海淵' }], start: 150 },
  ];
  // 升級經驗：前期和以前差不多，後期大幅變難（滿等總經驗約為舊版的 4 倍）
  // 升級所需經驗（2026-11-27h 改版）：依「每級要打幾隻當地小怪」設計，從約 4 隻慢慢爬到 100 等前約 130 隻，1→100 約 5000 隻
  const EXPT = [47,60,76,99,129,151,178,210,226,243,291,348,416,495,613,758,936,1036,1193,1371,1573,1730,1899,2081,2410,2676,2966,3379,3845,4371,5111,5642,6223,6857,7336,7842,8376,8680,8989,10135,11420,12859,14470,16273,18881,21894,23286,24751,26296,27922,30527,32312,34186,36152,38214,40378,42646,43709,44781,45862,49137,52628,56348,60311,66091,72402,79291,82950,88960,95378,102232,106966,111890,117010,122335,124699,127078,129473,131884,134310,157680,185079,217193,254829,308190,372652,450514,472268,509886,550405,594040,621765,650677,680823,712253,765228,822019,881056,942249,1005491];
  const needExp = lv => lv <= EXPT.length ? EXPT[Math.max(1, lv) - 1] : Math.round(EXPT[EXPT.length - 1] * Math.pow(1.06, lv - EXPT.length));
  const needExpOld = lv => Math.round(12 * Math.pow(lv, 1.8)); // 舊曲線，只用來換算舊存檔
  // 能力值：每升 1 級得 3 點，可分配到 力量／體質／智慧／敏捷
  const APL = 3, APRESET = 20000;
  // 能力值 2.0：每個職業有主屬性（決定攻擊力）；每一項都有攻擊與生存效果；點越多效率越低
  const MAIN = { dragon: ['int'], warrior: ['str'], brawler: ['str'], mage: ['int'], angel: ['int'], rogue: ['dex'], archer: ['dex'], mech: ['str', 'int'], demon: ['str', 'vit'] };
  const STATS = {
    str: { n: '力量', d: '攻擊力 +0.3、擊退距離 +0.2%' },
    vit: { n: '體質', d: 'HP +8、防禦 +0.4、受傷後無敵時間 +0.3%' },
    int: { n: '智慧', d: 'MP +6、技能傷害 +0.12%、技能冷卻 -0.1%（最多 -25%）、治療與藥水 +0.2%' },
    dex: { n: '敏捷', d: '爆擊率 +0.1%、爆擊傷害 +0.25%、移動速度 +0.08%（最多 +20%）' },
  };
  // 邊際遞減：前 100 點 100%，101～200 點 70%，200 點以上 40%
  const eff = n => { n = n || 0; return n <= 100 ? n : n <= 200 ? 100 + (n - 100) * .7 : 170 + (n - 200) * .4; };
  const effRate = n => (n || 0) < 100 ? 1 : (n || 0) < 200 ? .7 : .4;
  // 主屬性給的攻擊力：單主屬性每點 +1.3；雙主屬性每點 +1.3 × 0.75（兩項分開點比較划算）
  function mainAtk(cls, s) { const m = MAIN[cls] || ['str']; const k = m.length > 1 ? .75 : 1; return m.reduce((a, x) => a + eff(s[x]) * 1.3 * k, 0); }
  function newChar(cls) { return { slots: [...DEFSLOTS], cls, lv: 1, exp: 0, gold: 20, pot: 5, eth: 3, base: { ...CL[cls].base }, job: 0, wep: 0, arm: 0, map: 0, ap: 0, apv: 2, xv: 2, st: { str: 0, vit: 0, int: 0, dex: 0 } }; }
  // 舊存檔補上能力值（依目前等級補發點數）
  function fix(c) { gearOk(c); if (c && c.cls === 'dragon') { c.pet = c.lv >= PETLV && ELEM[c.elem] ? ELEM[c.elem].pet : null; if (!c.mounts) c.mounts = []; const has = c.mounts.includes('mydragon'); if (c.job >= 4 && !has) c.mounts.push('mydragon'); if (c.job < 4 && has) { c.mounts = c.mounts.filter(x => x !== 'mydragon'); if (c.mnt === 'mydragon') c.mnt = c.mounts[0] || 'horse'; } } if (c && c.xv !== 2) { c.xv = 2; if (c.exp > 0 && c.lv < capOf(c)) c.exp = Math.min(needExp(c.lv) - 1, Math.floor(c.exp / needExpOld(c.lv) * needExp(c.lv))); } if (c && !c.st) { c.st = { str: 0, vit: 0, int: 0, dex: 0 }; c.ap = (c.lv - 1) * APL; } if (c && c.apv !== 2) { c.apv = 2; c.gold = (c.gold || 0) + APRESET; c.apComp = 1; } /* 能力值改版補償：每個既有角色一次 20,000 金幣 */ if (c && !c.slots) c.slots = [...DEFSLOTS]; if (c && !c.mounts) c.mounts = ['horse']; if (c && !c.mnt) c.mnt = 'horse'; return c; }
  // 寵物：65 等解鎖，四選一；之後可花金幣更換
  const PETLV = 65, PETSWAP = 30000;
  const PETS = {
    qinglong: { n: '青龍', d: '攻擊力 +15%', col: '#3fd6a0' },
    xuanwu: { n: '玄武', d: '防禦 +40%、HP +10%', col: '#4a6a5a' },
    baihu: { n: '白虎', d: '攻擊速度 +25%（技能冷卻縮短 20%）、移動速度 +20%', col: '#f4f4f4' },
    zhuque: { n: '朱雀', d: '攻擊吸血：造成傷害的 5% 回復成 HP', col: '#ff4a2a' },
  };
  function stats(c) {
    const w = WEAPONS[c.cls][c.wep] || WEAPONS[c.cls][0], a = ARMORS[c.arm] || ARMORS[0], pt = c.pet, s = c.st || {}, B = {}, eW = 1 + enhB(enhOf(c, 'w', c.wep)), eA = 1 + enhB(enhOf(c, 'a', c.arm));
    for (const o of [w[5], a[6]]) if (o) for (const k in o) B[k] = (B[k] || 0) + o[k];
    const E = { str: eff(s.str), vit: eff(s.vit), int: eff(s.int), dex: eff(s.dex) }, main = MAIN[c.cls] || ['str'];
    const hp = Math.round((c.base.hp * JOBHP[c.job] + a[2] * eA + E.vit * 8) * (pt === 'xuanwu' ? 1.1 : 1) * (1 + (B.hpP || 0)));
    const atkStat = mainAtk(c.cls, s) + (main.includes('str') ? 0 : E.str * .3);
    const atk = Math.round(((c.base.atk + w[1] * eW) * JOBATK[c.job] + atkStat) * (pt === 'qinglong' ? 1.15 : 1) * (1 + (B.atkP || 0)));
    const def = Math.round((c.base.def + a[1] * eA + E.vit * .4) * (pt === 'xuanwu' ? 1.4 : 1) * (1 + (B.defP || 0)));
    const mp = Math.round(c.base.mp * JOBHP[c.job] + E.int * 6);
    const r = v => Math.round(v * 1000) / 1000;
    return { hp, mp, atk, def, crit: Math.min(80, Math.round((c.base.crit + c.job * 3 + E.dex * .1 + (B.crit || 0)) * 10) / 10),
      critD: r(1.7 + E.dex * .0025 + (B.critD || 0)), skillB: r(E.int * .0012 + (B.skillB || 0)), cdr: r(Math.min(.35, E.int * .001 + (B.cdr || 0))), potB: r(E.int * .002), healB: r(E.int * .002),
      spdB: r(Math.min(.3, E.dex * .0008 + (B.spdB || 0))), kbB: r(E.str * .002), invB: r(E.vit * .003) };
  }
  // 升級（會修改角色），回傳升了幾級
  function addExp(c, e) {
    const cap = capOf(c);
    if (c.lv >= cap) { c.exp = 0; return 0; }
    c.exp += e; let n = 0;
    while (c.lv < cap && c.exp >= needExp(c.lv)) {
      c.exp -= needExp(c.lv); c.lv++; n++; if (c.st) c.ap = (c.ap || 0) + APL;
      const g = CL[c.cls].grow;
      c.base.hp += g.hp; c.base.mp += g.mp; c.base.atk = Math.round((c.base.atk + g.atk) * 10) / 10; c.base.def = Math.round((c.base.def + g.def) * 10) / 10;
    }
    if (c.lv >= cap) c.exp = 0;
    return n;
  }
  function skillLock(c, k) { const s = SK[c.cls][k]; if (!s) return '無此技能'; if (s.lv && c.lv < s.lv) return `Lv ${s.lv}`; if (s.job && c.job < s.job) return ['', '一轉', '二轉', '三轉', '四轉'][s.job]; return ''; }
  const MOUNTLV = 10;
  // 坐騎：spd 移動倍率、jump 跳躍高度倍率、glide 按住跳躍可以滑翔；price 0 = 不能買（drop 表示由哪隻 Boss 掉落）
  const MOUNTS = {
    horse: { dr: 0.25, n: '棕色小馬', lv: 10, price: 0, spd: 2.2, jump: 1, d: '10 等送的基本坐騎' },
    wolf: { dr: 0.28, n: '雪原狼', lv: 20, price: 8000, spd: 2.4, jump: 1.15, d: '跑得快、跳得也比較高' },
    lion: { dr: 0.32, n: '黃金獅子', lv: 35, price: 30000, spd: 2.6, jump: 1.25, d: '威風凜凜的萬獸之王' },
    moto: { dr: 0.3, n: '重型機車', lv: 50, price: 80000, spd: 2.95, jump: 1, d: '直線速度很快，但跳不高' },
    dragon: { dr: 0.36, n: '黑龍', lv: 55, price: 0, drop: 'dragon', rate: .08, spd: 3.1, jump: 1.4, glide: 1, d: '黑龍王掉落（8%）。按住跳躍可以滑翔' },
    cloud: { dr: 0.38, n: '筋斗雲', lv: 65, price: 0, drop: 'titan', rate: .06, spd: 3.25, jump: 1.55, glide: 1, d: '天穹泰坦掉落（6%）。跳得最高，可以滑翔' },
    mydragon: { dr: 0.42, n: '我的龍王', lv: 60, price: 0, own: 1, spd: 3.45, jump: 1.55, glide: 1, d: '巨龍使者四轉後，可以騎上自己的龍王。可以滑翔' },
    qilin: { dr: 0.42, n: '麒麟', lv: 85, price: 0, tier: 1, spd: 3.5, jump: 1.5, d: '傳說坐騎（Boss 掉落）。踏著祥雲奔跑的瑞獸' },
    phoenix: { dr: 0.42, n: '火鳳凰', lv: 90, price: 0, tier: 1, spd: 3.55, jump: 1.6, glide: 1, d: '傳說坐騎（Boss 掉落）。可以滑翔，身後拖著火焰' },
    kunpeng: { dr: 0.44, n: '鯤鵬', lv: 95, price: 0, tier: 1, spd: 3.6, jump: 1.55, glide: 1, d: '傳說坐騎（Boss 掉落）。北冥之魚化身的巨鳥，可以滑翔' },
    chaosdragon: { dr: 0.48, n: '混沌魔龍', lv: 100, price: 0, tier: 2, spd: 3.8, jump: 1.7, glide: 1, d: '神話坐騎（Boss 掉落）。最快、最強的坐騎' },
    void: { dr: 0.4, n: '虛空戰獸', lv: 75, price: 0, drop: 'voidking', rate: .12, spd: 3.45, jump: 1.45, glide: 1, d: '虛空之主掉落（12%）。最快的坐騎' },
  };
  for (const m of MAPS) { if (!m.seg) m.seg = SEG; if (!m.ropes) m.ropes = ROPES; }
  // ---- 守護靈覺醒（80 級、四轉、通過覺醒試煉後解鎖） ----
  // 0～4 秒骨架、4～8 秒鎧甲、8～30 秒完全體，30～60 秒效果線性降到 0；結束後冷卻 1 分鐘，冷卻中覺醒值不累積
  const AWK = { lv: 80, dur: 60000, full: 30000, cd: 60000, max: 100, dr: .6, atk: 2.5, pvpDr: .3, pvpAtk: 1.5, drCap: .8, finBoss: 1.35, finWin: 3500, perSec: 1.7, hurtPer: .35 };
  const GUARD = {
    warrior: { n: '劍魂武神', fin: '天斷', gdm: 2.0, fdm: 1.111, d: '金色巨大劍士，普攻變成巨劍橫掃', fd: '巨劍從天劈下，重創單一敵人', col: '#ffd23f', ready: 1 },
    mage: { n: '元素巨靈', fin: '四象天墜', gdm: 2.125, fdm: 2.083, d: '四色元素巨人，普攻變成元素衝擊', fd: '四色隕星砸滿畫面', col: '#7fd3ff', ready: 1 },
    rogue: { n: '影之修羅', fin: '千影斷罪', gdm: 1.417, fdm: 0.833, d: '多臂暗影修羅，普攻變成多刃亂斬', fd: '瞬移連斬附近最強的敵人', col: '#b46aff', ready: 1 },
    archer: { n: '星弓守護者', fin: '星隕穿天箭', gdm: 2.0, fdm: 1.333, d: '持巨弓的星光巨人，普攻變成星光巨箭', fd: '朝天射出一箭，化成巨大流星箭垂直砸下，衝擊波往兩側擴散', col: '#bfe8ff', ready: 1 },
    brawler: { n: '金剛明王', fin: '千手連拳', gdm: 2, fdm: 0.96, d: '多臂金剛明王，普攻變成巨大金剛拳', fd: '千隻拳頭對單一目標狂打', col: '#ffb34d', ready: 1 },
    mech: { n: '巨神機甲', fin: '全彈發射', gdm: 2, fdm: 1.667, d: '搭進巨型機甲，普攻變成肩砲齊射', fd: '飛彈雨覆蓋前方一大片', col: '#9ab0c8', ready: 1 },
    demon: { n: '深淵魔像', fin: '深淵吞噬', gdm: 2, fdm: 1.333, d: '黑紅骨甲巨像，普攻變成吸血魔爪', fd: '深淵巨口吞掉周圍敵人並大量吸血', col: '#ff2a4a', ready: 1 },
    dragon: { n: '金色龍神', fin: '滅世龍炎', gdm: 2, fdm: 2, d: '自己的龍進化成金色龍神，普攻變成貫穿前方的龍神吐息', fd: '龍神噴出貫穿整個畫面的金色龍炎，並附加屬性效果', col: '#ffd23f', ready: 1, self: 1 },
    angel: { n: '熾天聖鎧', fin: '聖域', gdm: 2, fdm: 2, d: '六翼光之巨人，普攻變成聖光長槍', fd: '展開聖域：同地圖隊友回復 60% HP 並獲得護盾，同時重創周圍敵人', col: '#fff6c8', ready: 1, finSup: { heal: .6, shield: 1 } },
  };
  const BOSSRESPAWN = 180;   // Boss 被打倒後固定 3 分鐘重生（秒）
  const DARK = { rate: .2, hp: 3, atk: 1.6, dur: 10 * 60000 };   // 暗黑版 Boss
  const FIGHT_MS = 10 * 60000;   // Boss 戰時間上限
  const BOSSREGEN = { every: 5000, pct: .2 };   // Boss 偵測不到可攻擊的玩家時：每 5 秒回 20%
  const AWSKLV = 90, AWSK_MULT = 1.3;
  const AWSK = {
    warrior: { s6: { n: '武神・萬劍天降', d: '巨劍從天而降，連續 5 波砸向附近所有敵人' }, b4: { n: '武神・天崩斬', d: '守護靈揮動巨劍旋斬，範圍更大、重擊 4 次' }, c4: { n: '武神・不滅金身', d: '自己和同地圖隊友回復 50% HP，並在 8 秒內受到傷害 -40%', sup: { heal: .5, shield: 1 } } },
    mage: { s6: { n: '元素・四象崩界', d: '火、冰、風、雷四種元素輪流轟炸附近所有敵人' }, b4: { n: '元素・群星殞落', d: '兩處同時降下星辰，各轟炸 3 次' }, c4: { n: '元素・共鳴風暴', d: '元素同時打向最近的 10 隻敵人' } },
    rogue: { s6: { n: '修羅・千刃煉獄', d: '標記更大範圍的敵人，修羅的手臂一起處刑' }, b4: { n: '修羅・影獄亂舞', d: '暗影同時撕裂最近的 12 隻敵人' }, c4: { n: '修羅・永夜', d: '自己和同地圖隊友 20 秒內攻擊 +25%、移動與冷卻加快，並無敵 2 秒', sup: { pow: 1, haste: 1, inv: 1 } } },
    archer: { s6: { n: '星弓・流星天穹', d: '更大一片的星光箭雨從天空斜落' }, b4: { n: '星弓・不死鳥群', d: '同時射出三隻不死鳥巨箭，貫穿所有敵人' }, c4: { n: '星弓・星輝庇護', d: '自己和同地圖隊友回復 45% HP，並在 8 秒內受到傷害 -40%', sup: { heal: .45, shield: 1 } } },
    brawler: { s6: { n: '明王・天霸千拳', d: '金剛明王的巨拳從天而降，威力 ×1.3' }, b4: { n: '明王・崩山八極', d: '跳到敵人身邊，範圍更大的崩勁連爆，威力 ×1.3' }, c4: { n: '明王・金剛不壞', d: '自己和同地圖隊友回復 50% HP，並在 8 秒內受到傷害 -40%', sup: { heal: .5, shield: 1 } } },
    mech: { s6: { n: '機神・終焉衛星砲', d: '衛星砲換成機神主砲，轟炸範圍更大，威力 ×1.3' }, b4: { n: '機神・超載', d: '自己和同地圖隊友 20 秒內攻擊 +25%、移動與冷卻加快', sup: { pow: 1, haste: 1 } }, c4: { n: '機神・粒子殲滅砲', d: '更長更粗的粒子砲，威力 ×1.3' } },
    demon: { s6: { n: '魔像・萬魂收割', d: '收割範圍更大，威力 ×1.3，一樣能處決殘血的一般怪' }, b4: { n: '魔像・深淵魔翼', d: '展開巨大魔翼衝得更遠，威力 ×1.3' }, c4: { n: '魔像・煉獄黑日', d: '黑色太陽吞沒更大範圍，威力 ×1.3' } },
    dragon: { s3: { n: '龍神・吐息極', d: '龍神噴出更寬更長的金色吐息，威力 ×1.3' }, s4: { n: '龍神・天翔', d: '龍神俯衝兩趟，威力 ×1.3' }, s6: { n: '龍神・降世', d: '龍神從天而降，砸下後再爆出屬性衝擊波，威力 ×1.3' } },
    angel: { s6: { n: '熾天・神聖凱旋', d: '復活附近倒地的隊友，並以更強的聖光重創敵人，威力 ×1.3' }, b4: { n: '熾天・恩典之光', d: '自己和同地圖隊友回復 70% HP，並在 8 秒內受到傷害 -40%', sup: { heal: .7, shield: 1 } }, c4: { n: '熾天・終焉天罰', d: '更長更粗的天罰光束，威力 ×1.3' } },
  };
  // 依經過時間算出目前的階段與加成（pvp 為 true 時改用 PVP 的數值）
  function awkFx(ms, pvp) {
    if (!(ms >= 0) || ms >= AWK.dur) return null;
    let stage, kd, ka;   // 骨架：減傷 30%、攻擊 ×1.5；鎧甲：45%、×2；完全體：60%、×2.5
    if (ms < 4000) { stage = 1; kd = .5; ka = 1 / 3; } else if (ms < 8000) { stage = 2; kd = .75; ka = 2 / 3; } else if (ms < AWK.full) { stage = 3; kd = ka = 1; } else { stage = 3; kd = ka = (AWK.dur - ms) / (AWK.dur - AWK.full); }
    const dr = (pvp ? AWK.pvpDr : AWK.dr) * kd, atk = 1 + ((pvp ? AWK.pvpAtk : AWK.atk) - 1) * ka;
    return { stage, k: kd, dr, atk, fade: ms >= AWK.full };
  }
  // ---- 更新公告：改版時在 NEWS 最前面加一筆，每個帳號登入後會看到所有還沒看過的版本 ----
  const NEWS = [
    { v: '2026-11-28g', notes: [
      ['🐾 小怪追擊改善', '被打的小怪現在會追出自己的區域（最多約 150 像素），不會再卡在看不見的牆前面；你跑太遠的話，牠會放棄並走回原本的地方。'],
      ['🪨 強化石可以用買的', '鐵匠 老鐵也賣一般的強化石，一顆 50,000 金幣（+1～+7 用）。高級和神話強化石還是只能打怪取得。'],
    ] },
    { v: '2026-11-28f', notes: [
      ['🔨 新 NPC：鐵匠 老鐵（潮聲港）', '可以把武器和防具強化到 +15！+1～+5 必定成功；+8 以上失敗會降 1 級；+11 以上失敗還有機率毀損（商店裝備會消失，傳說和神話裝備會被打回 +0）。+11 開始每一級加成 +40%，+15 時裝備本身的數值是原本的 3.6 倍。'],
      ['💎 強化材料', '強化石（珊瑚王國以後的小怪）、高級強化石（深淵海溝以後）、神話強化石（克拉肯以後的 Boss）。打怪時有出手的人和同地圖的隊友都會各自獲得。暗黑 Boss 掉落 ×5。'],
      ['📜 卷軸', '加成卷軸：成功率 +10%（鐵匠販售）。高級加成卷軸：成功率 +20%（只從海洋地圖和暗黑 Boss 掉落）。守護卷軸：+11 以上失敗時不會毀損（鐵匠販售）。'],
      ['🔁 強化移植', '可以把一件裝備的強化移到另一件同類裝備上，等級 -3、成功率 70%，失敗時原本那件的強化會歸零。'],
      ['🎒 裝備改成收藏制', '商店買過的裝備都會留在「裝備」裡，可以隨時換回來；不要的商店裝備可以賣掉，拿回 30% 金幣。'],
    ] },
    { v: '2026-11-28e', notes: [
      ['🪸 新地圖：珊瑚王國（Lv 90～100）', '在潮聲港找船長老海，現在可以選擇出海到「珊瑚王國」。這裡有河豚兵、海馬騎士、珊瑚守衛，最深處是人魚女王。站進上升的氣泡柱會被托到高處。'],
      ['🏛️ 新地圖：沉沒古城（Lv 106～110）', '打倒深淵海皇・克拉肯，等級上限突破到 110，就能從深淵海溝最深處前往沉沒古城。小心定時開關的機關門和天花板崩落的石柱。最深處的古城守護神打倒後，等級上限突破到 120。'],
      ['🧊 新地圖：冰封海淵（Lv 111～115）', '寒冷的冰下海域，海流會定時把人往一邊推，逆流時要多走幾步。最深處住著冰甲海獸王。'],
      ['🌋 新地圖：海底火山（Lv 116～120）', '目前最深、最危險的地方。熱泉會定時噴發（看到冒泡和紅色預警就快離開），最深處是熔岩海龍。'],
      ['⬆️ 等級上限提升到 120', '打倒克拉肯：上限 100 → 110；打倒古城守護神：上限 110 → 120（有出手的玩家，和他們在同一張地圖的隊友都算）。'],
    ] },
    { v: '2026-11-28d', notes: [
      ['📱 手機長按不再跳出選單', '在手機上長按按鈕或畫面時，不會再跳出「拷貝／查詢／翻譯」的系統選單。'],
      ['🚪 Boss 附近的傳送門修正', '站在傳送門上按 ↑（或搖桿往上）會直接進入下一張地圖，不會再被附近的 Boss 對話擋住；要走到 Boss 身邊才會發起挑戰。'],
    ] },
    { v: '2026-11-28c', notes: [
      ['🎨 傳說／神話裝備全新造型', '8 個職業共 64 把傳說、神話武器都換成獨立的造型（劍、法杖、匕首、弓、拳套、砲、鐮刀、權杖各有不同輪廓），6 件傳說／神話防具也有專屬的盔甲圖樣和肩甲，原本的閃爍和粒子特效保留。'],
    ] },
    { v: '2026-11-28b', notes: [
      ['🔧 修正試煉打不到人', '上一版更新後，轉職試煉和覺醒試煉的試煉官打不到玩家，現在已經修好了。'],
    ] },
    { v: '2026-11-28a', notes: [
      ['⚔️ Boss 戰改成「對話開戰」', '走到 Boss 旁邊按 ↑（手機搖桿往上）對話，發起挑戰後你和同地圖的隊友會被傳送到戰場，四周升起空氣牆，打倒牠之前離不開（限時 10 分鐘）。沒有發起挑戰的人打不到 Boss，Boss 也打不到他。全員倒地或時間到就算失敗，Boss 血量回滿。'],
      ['☠️ 暗黑版 Boss', 'Boss 被打倒後固定 3 分鐘重生，有 20% 機率變成暗黑版：血量 ×3、傷害 ×1.6，掉落率 ×5。10 分鐘內沒人打倒就會變回一般版。'],
      ['✦ 100 等裝備大擴充', '商店新增 Lv90、Lv100 武器與防具；每個職業新增 5 把傳說武器、3 把神話武器，全職業共用的傳說／神話防具，以及 4 隻新坐騎（麒麟、火鳳凰、鯤鵬、混沌魔龍）。每件都有不同外觀和額外能力。'],
      ['🎒 裝備欄＋外觀', '「角色 → 裝備欄」可以換上擁有的任何武器、防具，還能選一件傳說以上的裝備當外觀。'],
      ['💎 掉落機率', '傳說裝備 0.5%（Lv55 以上的 Boss）、神話裝備 0.1%（深淵海溝以後的 Boss 與所有暗黑版 Boss），只在打倒 Boss 時掉落；暗黑版 ×5。原本的傳說武器保留在你的裝備欄裡。'],
      ['🧪 藥水上限', '紅藥水、藍藥水各最多帶 100 瓶。已經超過的保留，用到 100 以下才能再買或撿。'],
      ['🔧 覺醒修正', '覺醒中重新整理網頁或斷線重連，覺醒不會再消失；換角色時覺醒狀態不會再帶到另一個角色身上。手機的覺醒按鈕也比較不吃效能了。'],
    ] },
    { v: '2026-11-27i', notes: [
      ['👻 守護靈大家都看得到了', '以前覺醒時只有自己看得到身後的守護靈，現在同地圖的其他玩家也看得到。'],
      ['🌊 突破 100 等更容易', '打倒虛空之主時，只要有出手的玩家都能突破等級上限，同地圖的隊友也一起突破，不再只限最後一擊的那一隊。'],
      ['⚡ 流暢度優化', '手機比較吃力時會自動降低解析度、減少特效數量；網路不穩時不會再累積延遲，也修正了掉幀時越來越卡的問題。'],
    ] },
    { v: '2026-11-27h', notes: [
      ['📈 升級經驗曲線重新設計', '以前越後面反而越快升級，現在每升一級要打的怪會穩定增加：前期一樣很快，後期需要多練一點，1 到 100 級大約 8～10 小時。'],
      ['🛡️ 舊角色不吃虧', '已經練上去的角色等級不變，目前的經驗條會照百分比換算到新曲線（例如原本 60%，改版後還是 60%）。'],
    ] },
    { v: '2026-11-27g', notes: [
      ['🧪 喝藥水冷卻', '紅藥水、藍藥水各自有 1.5 秒冷卻，冷卻中藥水欄會變暗倒數。紅藍分開計算，喝完紅藥還是能馬上補藍。'],
    ] },
    { v: '2026-11-27f', notes: [
      ['👹 第二批守護靈', '武神「明王」、機神「機神」、深淵君主「魔像」、天使長「熾天」登場，一樣分三階段成形，附專屬普攻與終結技。'],
      ['✨ 90 級守護靈技能全開放', '八個職業都能在 Lv 90、打倒虛空之主後，於覺醒中把四轉技能變成守護靈版本。天使長終結技「聖域」會幫同地圖隊友回血加護盾。'],
      ['🎨 技能特效大改版', '八個職業的特效風格各自獨立，原本看起來太像的招式都換上新外觀。'],
      ['🚀 平衡調整', '90 級守護靈技能的 ×1.3 加成改由伺服器計算，多段招式也能吃滿；機甲「全彈發射」會集中轟炸最強的敵人。'],
    ] },
    { v: '2026-11-27e', notes: [
      ['⚖️ 技能強度重新平衡', '每一階的技能都重新調整：越高階的技能單發越痛、冷卻越長（初始 1 秒 → 四轉 4.5 秒），整體每秒輸出大致不變。增益、補血類技能冷卻改為 15～35 秒。強度順序：終結技 > 90 級守護靈技能 > 守護靈普攻 > 四轉 > 三轉 > 二轉 > 一轉。'],
      ['💩 死亡變成大便', '倒下後會在原地變成一坨大便並跳出提示，按「確定」才回村莊復活（扣 6% 經驗）。等待期間，隊友的天使可以用「神聖復活」把你原地救起來，而且不扣經驗！'],
      ['👑 Boss 回血', 'Boss 偵測不到可以攻擊的玩家（全員倒下、離開地圖、躲在危險區外）時，每 5 秒回復 20% 血量，不能再全滅後騎坐騎回來接著打。'],
      ['🧪 藥水漲價', '藥水和完全休息的價格依等級調整：紅藥水 1～29 級 30、30～59 級 250、60～79 級 1,000、80 級以上 2,500 金幣，藍藥水再貴 20%。'],
      ['🧨 集束炸彈改版', '機械戰士的集束炸彈改成丟出一捆炸藥包，彈兩下後連環爆炸。'],
    ] },
    { v: '2026-11-27d', notes: [
      ['🏹 天弓・破軍改版', '射手的四轉大招改成朝天蓄力，巨箭從天上斜斜落在前方一大片區域，不再和法師的創世之光撞型。傷害維持原本水準。'],
      ['☄️ 星隕穿天箭改版', '射手的覺醒終結技改成朝天射出一箭，化成巨大流星箭垂直砸下，衝擊波往兩側擴散。'],
      ['🌊 深淵海溝調整', '海溝的怪物血量和攻擊降低（約等於虛空裂隙的怪物再強 5 級），經驗值不變，升級會順很多。'],
      ['✨ 90 級守護靈技能', '打倒虛空之主、練到 Lv 90 後，覺醒期間四轉的三招會變成守護靈版本：攻擊招威力 ×1.3、外觀全新；回血加護盾、加攻擊這類輔助招也會一起加強，而且效果會分給同地圖的隊友。目前開放戰士、法師、刺客、射手。'],
    ] },
    { v: '2026-11-27c', notes: [
      ['😈 覺醒試煉變難了', '試煉之影的血量變成 3 倍、傷害約 2.2 倍，招式預警跟一般 Boss 一樣快，低血量時會暴怒，而且每個職業的影子都多了一招。記得帶藥水、認真躲招！'],
      ['🖥️ 全螢幕修正', '電腦全螢幕時，「此地圖人數」和覺醒值改到右上角，不會再被左上角的角色資訊擋住；覺醒中的終結技提示改成另一行，不會和剩餘時間疊在一起。'],
    ] },
    { v: '2026-11-27b', notes: [
      ['🔥 守護靈覺醒', 'Lv 80 四轉後找轉職教官接「覺醒試煉」，打倒隨機職業的「試煉之影」就能喚醒自己職業的守護靈。'],
      ['⚡ 覺醒值', '打怪、受傷都會累積覺醒值（認真打怪大約 1 分鐘集滿），集滿按 G（手機按「覺醒」）啟動，畫面左上角看得到覺醒值。'],
      ['🛡️ 覺醒效果', '持續 1 分鐘：骨架 → 鎧甲 → 完全體，最多受到傷害 -60%、攻擊 ×2.5，普攻變成守護靈的大範圍攻擊；30 秒後逐漸減弱。結束後冷卻 1 分鐘，冷卻中覺醒值不會累積。'],
      ['💥 終結技', '覺醒中再按一次覺醒鍵，放出守護靈專屬大招（每次覺醒一次），對 Boss 傷害再 ×1.35。'],
      ['🗡️ 第一批守護靈', '戰士「劍魂武神」、法師「元素巨靈」、刺客「影之修羅」、射手「星弓守護者」。格鬥家、機械戰士、惡魔、天使下次更新開放。'],
      ['⚔️ PVP', 'PVP 中覺醒效果較弱：最多減傷 30%、攻擊 ×1.5。所有減傷加起來最多 80%。'],
    ] },
    { v: '2026-11-27', notes: [
    ['🧊 控制技能', '冰系有凍結、雷系有麻痺、火系有燒傷、毒系有中毒，另外還有暈眩、束縛、緩速。技能說明裡都有標示效果。'],
    ['👑 Boss 也吃控制', '控制對 Boss 有效，但時間只有 60%；同一個人控完要等 5 秒才能再控同一隻，隊友輪流接控就能把牠壓住。'],
    ['⚔️ PVP 控制', '決鬥場和競技場裡控制技能也會打在玩家身上，一樣只有 60% 時間，並有 5 秒的免疫時間。'],
    ['👥 組隊', '按下方「隊伍」邀請玩家，最多 6 人。同地圖的隊友就算沒出手也分得到經驗，畫面左上角看得到隊友血量。'],
    ['🌊 突破 100 等', '打倒虛空之主時，有出手的玩家和同地圖的隊友，等級上限會提升到 100。'],
    ['⚓ 新地圖', '虛空裂隙最右邊可以通往村莊「潮聲港」，突破 100 等後找碼頭的船長出海，挑戰 Lv 101～105 的「深淵海溝」與 Boss 深淵海皇・克拉肯。'],
    ] },
  ];
  const VERSION = NEWS[0].v;
  // 這個帳號還沒看過的版本（seen 是上次看過的版本；沒看過任何版本就全部給）
  const newsSince = seen => { const i = NEWS.findIndex(n => n.v === seen); return i < 0 ? NEWS : NEWS.slice(0, i); };
  const D = { ENH, ENHMAX, enhB, MATN, SCROLL, XFER, SELLR, enhOf, MAXTOP, CAPBOSS, ELEM, ELEMSK, ELEMSWAP, HIDDEN, SHOPW, SHOPA, TIERN, bonusText, LOOT, gearOk, legPool, POTMAX, BOSSRESPAWN, DARK, FIGHT_MS, POTCD, shopPrice, BOSSREGEN, AWSK, AWSKLV, AWSK_MULT, AWK, GUARD, awkFx, VERSION, NEWS, newsSince, EF, EFSK, CC_RES, CC_IMM, efOf, MAXLV2, capOf, bossZone, MAXSLOT, MOUNTS, MAIN, eff, effRate, SLOTN, DEFSLOTS, MOUNTLV, LEGI, LEGGOLD, APL, APRESET, STATS, fix, PETLV, PETSWAP, PETS, MAXLV, CL, SK, JOBLV, JOBATK, JOBHP, WEAPONS, ARMORS, SHOP, MON, GY, WH, WW, SEG, ROPES, MAPS, needExp, newChar, stats, addExp, skillLock };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.RPGDATA = D;
})(typeof window !== 'undefined' ? window : this);
