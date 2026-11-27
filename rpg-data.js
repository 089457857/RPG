// 屁眼王國大冒險 — 伺服器與瀏覽器共用的遊戲資料
(function (root) {
  const MAXLV = 80, MAXLV2 = 100;   // 擊敗虛空之主後等級上限變成 100
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
  const efText = k => { const e = EF[k]; return e.dot ? `${e.n} ${e.t / 1000} 秒` : `${e.n} ${e.t / 1000} 秒`; };
  for (const [cls, m] of Object.entries(EFSK)) for (const [k, e] of Object.entries(m)) {
    const s = SK[cls][k]; s.ef = e; s.d = s.d.replace(/，?凍結敵人 0\.75 秒（Boss 免疫）|，命中的敵人 2\.5 秒無法移動（Boss 免疫）/, '') + `（${efText(e)}）`;
  }
  const efOf = cls => new Set(Object.values(EFSK[cls] || {}));
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
  const LEGEND = { warrior: '軒轅劍', mage: '太初法典', rogue: '月影雙刃・朧', archer: '后羿射日弓', brawler: '盤古神拳', mech: '創世機神砲', demon: '路西法之鐮', angel: '米迦勒之劍' };
  for (const k in WEAPONS) WEAPONS[k].push([LEGEND[k], 230, 80, 0, 1]);
  const LEGI = 8, LEGGOLD = 50000;
  // [名稱, 防禦, HP, 等級, 價格]
  const ARMORS = [['布衣', 0, 0, 1, 0], ['皮甲', 4, 30, 8, 250], ['鎖子甲', 10, 90, 16, 1400], ['秘銀鎧', 18, 180, 24, 4600], ['龍鱗甲', 30, 340, 32, 12000], ['神聖鎧甲', 44, 560, 40, 26000], ['暗黑龍甲', 60, 820, 50, 56000], ['天穹戰衣', 80, 1150, 60, 105000]];
  const SHOP = { pot: 25, eth: 30, pot10: 240, rest: 15 };
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
    siren: { name: '深海人魚', lv: 101, hp: 82000, atk: 1320, exp: 9500, gold: [3000, 3800], w: 16, h: 20, spd: .75, leg: .01 },
    crab: { name: '鐵甲巨蟹', lv: 103, hp: 105000, atk: 1420, exp: 11500, gold: [3400, 4200], w: 24, h: 16, spd: .4, leg: .012 },
    pirate: { name: '幽靈海盜', lv: 104, hp: 120000, atk: 1520, exp: 13000, gold: [3800, 4600], w: 16, h: 26, spd: .6, leg: .014 },
    kraken: { name: '深淵海皇・克拉肯', lv: 105, hp: 2000000, atk: 1650, exp: 500000, gold: [150000, 180000], w: 68, h: 60, spd: .4, boss: true, leg: .5,
      sk: ['pillars', 'pull', 'split', 'homing'], skn: { pillars: '觸手破地（站在空隙）', pull: '深海漩渦（往外跑）', split: '雙層潮汐（低的跳過、高的蹲在地上）', homing: '追蹤墨彈（一直移動甩掉）' } },
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
    siren: { k: 'homing', r: 110, n: '海妖之歌' }, crab: { k: 'quake', r: 90, rad: 90, n: '巨鉗砸地' }, pirate: { k: 'rain', r: 110, n: '幽靈砲擊', two: 1 },
  };
  for (const [t, sp] of Object.entries(MSP)) MON[t].sp = sp;
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
      npcs: [{ x: 300, kind: 'shop', name: '雜貨商 阿珠' }, { x: 2330, kind: 'boat', name: '船長 老海' }], dock: 2240,
      zones: [[700, '港口入口'], [1800, '漁村市集'], [9e9, '碼頭']], portals: [{ x: 60, to: 5, tx: 2490, label: '← 虛空裂隙' }], start: 150 },
    // ---- 第 8 張地圖：深淵海溝（Lv 101～105）----
    { name: '深淵海溝', pal: 'abyss', home: 9, seg: [{ x1: 0, x2: WW, y: GY, g: 1 }, ...[{ x1: 320, x2: 500, y: 236 }, { x1: 520, x2: 680, y: 176 }, { x1: 720, x2: 880, y: 246 }, { x1: 900, x2: 1040, y: 186 }, { x1: 1060, x2: 1200, y: 126 }, { x1: 1240, x2: 1400, y: 236 }, { x1: 1420, x2: 1580, y: 176 }, { x1: 1600, x2: 1760, y: 120 }, { x1: 1800, x2: 2060, y: 206 }]],
      ropes: [{ x: 340, y1: 236, y2: GY }, { x: 540, y1: 176, y2: 236 }, { x: 740, y1: 246, y2: GY }, { x: 920, y1: 186, y2: GY }, { x: 1080, y1: 126, y2: 186 }, { x: 1260, y1: 236, y2: GY }, { x: 1440, y1: 176, y2: 236 }, { x: 1620, y1: 120, y2: 176 }, { x: 1820, y1: 206, y2: GY }],
      spawns: layout('siren', 'crab', 'pirate', 'kraken'), zones: [[260, '沉船淺灘'], [700, '珊瑚礁'], [1200, '海盜船骸'], [2100, '深淵斷崖'], [9e9, '海皇的巢穴']],
      portals: [{ x: 60, to: 9, tx: 2200, label: '← 搭船回潮聲港' }], start: 150 },
  ];
  // 升級經驗：前期和以前差不多，後期大幅變難（滿等總經驗約為舊版的 4 倍）
  const needExp = lv => Math.round(12 * Math.pow(lv, 1.8));
  // 能力值：每升 1 級得 3 點，可分配到 力量／體質／智慧／敏捷
  const APL = 3, APRESET = 20000;
  // 能力值 2.0：每個職業有主屬性（決定攻擊力）；每一項都有攻擊與生存效果；點越多效率越低
  const MAIN = { warrior: ['str'], brawler: ['str'], mage: ['int'], angel: ['int'], rogue: ['dex'], archer: ['dex'], mech: ['str', 'int'], demon: ['str', 'vit'] };
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
  function newChar(cls) { return { slots: [...DEFSLOTS], cls, lv: 1, exp: 0, gold: 20, pot: 5, eth: 3, base: { ...CL[cls].base }, job: 0, wep: 0, arm: 0, map: 0, ap: 0, apv: 2, st: { str: 0, vit: 0, int: 0, dex: 0 } }; }
  // 舊存檔補上能力值（依目前等級補發點數）
  function fix(c) { if (c && !c.st) { c.st = { str: 0, vit: 0, int: 0, dex: 0 }; c.ap = (c.lv - 1) * APL; } if (c && c.apv !== 2) { c.apv = 2; c.gold = (c.gold || 0) + APRESET; c.apComp = 1; } /* 能力值改版補償：每個既有角色一次 20,000 金幣 */ if (c && !c.slots) c.slots = [...DEFSLOTS]; if (c && !c.mounts) c.mounts = ['horse']; if (c && !c.mnt) c.mnt = 'horse'; return c; }
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
    const E = { str: eff(s.str), vit: eff(s.vit), int: eff(s.int), dex: eff(s.dex) }, main = MAIN[c.cls] || ['str'];
    const hp = Math.round((c.base.hp * JOBHP[c.job] + a[2] + E.vit * 8) * (pt === 'xuanwu' ? 1.1 : 1));
    const atkStat = mainAtk(c.cls, s) + (main.includes('str') ? 0 : E.str * .3);
    const atk = Math.round(((c.base.atk + w[1]) * JOBATK[c.job] + atkStat) * (pt === 'qinglong' ? 1.15 : 1));
    const def = Math.round((c.base.def + a[1] + E.vit * .4) * (pt === 'xuanwu' ? 1.4 : 1));
    const mp = Math.round(c.base.mp * JOBHP[c.job] + E.int * 6);
    const r = v => Math.round(v * 1000) / 1000;
    return { hp, mp, atk, def, crit: Math.min(75, Math.round((c.base.crit + c.job * 3 + E.dex * .1) * 10) / 10),
      critD: r(1.7 + E.dex * .0025), skillB: r(E.int * .0012), cdr: r(Math.min(.25, E.int * .001)), potB: r(E.int * .002), healB: r(E.int * .002),
      spdB: r(Math.min(.2, E.dex * .0008)), kbB: r(E.str * .002), invB: r(E.vit * .003) };
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
    void: { dr: 0.4, n: '虛空戰獸', lv: 75, price: 0, drop: 'voidking', rate: .12, spd: 3.45, jump: 1.45, glide: 1, d: '虛空之主掉落（12%）。最快的坐騎' },
  };
  for (const m of MAPS) { if (!m.seg) m.seg = SEG; if (!m.ropes) m.ropes = ROPES; }
  // ---- 更新公告：改版時改 VERSION 並寫上 NOTES，每個帳號登入後會看到一次 ----
  const VERSION = '2026-11-27';
  const NOTES = [
    ['🧊 控制技能', '冰系有凍結、雷系有麻痺、火系有燒傷、毒系有中毒，另外還有暈眩、束縛、緩速。技能說明裡都有標示效果。'],
    ['👑 Boss 也吃控制', '控制對 Boss 有效，但時間只有 60%；同一個人控完要等 5 秒才能再控同一隻，隊友輪流接控就能把牠壓住。'],
    ['⚔️ PVP 控制', '決鬥場和競技場裡控制技能也會打在玩家身上，一樣只有 60% 時間，並有 5 秒的免疫時間。'],
    ['👥 組隊', '按下方「隊伍」邀請玩家，最多 6 人。同地圖的隊友就算沒出手也分得到經驗，畫面左上角看得到隊友血量。'],
    ['🌊 突破 100 等', '打倒虛空之主時，最後一擊的玩家和同地圖的隊友，等級上限會提升到 100。'],
    ['⚓ 新地圖', '虛空裂隙最右邊可以通往村莊「潮聲港」，突破 100 等後找碼頭的船長出海，挑戰 Lv 101～105 的「深淵海溝」與 Boss 深淵海皇・克拉肯。'],
  ];
  const D = { VERSION, NOTES, EF, EFSK, CC_RES, CC_IMM, efOf, MAXLV2, capOf, bossZone, MAXSLOT, MOUNTS, MAIN, eff, effRate, SLOTN, DEFSLOTS, MOUNTLV, LEGI, LEGGOLD, APL, APRESET, STATS, fix, PETLV, PETSWAP, PETS, MAXLV, CL, SK, JOBLV, JOBATK, JOBHP, WEAPONS, ARMORS, SHOP, MON, GY, WH, WW, SEG, ROPES, MAPS, needExp, newChar, stats, addExp, skillLock };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.RPGDATA = D;
})(typeof window !== 'undefined' ? window : this);
