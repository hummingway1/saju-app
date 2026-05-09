export const config = { runtime: "nodejs" };

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS_EN = ['Wood','Fire','Earth','Metal','Water'];
const CACHE = new Map();

// ── Supported languages ──────────────────────────────
const SUPPORTED_LANGS = ["Korean","English","Japanese","Chinese","Spanish"];

// ── Lang-specific free hook text ─────────────────────
const LANG_HOOKS = {
  Korean: {
    defaultDecision: "지금의 흐름은 서두르기보다, 마음과 현실의 기준을 먼저 맞추라고 말하고 있습니다.",
    riskSuffix: " 작은 판단 하나가 생각보다 멀리 이어질 수 있으니, 가벼이 넘기지 않는 편이 좋습니다.",
    timingDefault: "지금부터 가까운 시기 안에 한 번 방향이 갈리는 장면이 보입니다. 그때의 선택이 이후의 표정을 바꾸게 됩니다.",
    timingSuffix: " 이 시기를 어떻게 건너가느냐에 따라 다음 장면의 표정이 달라질 수 있습니다.",
    decisionSuffix: " 지금의 선택은 단순한 우연이 아니라, 오래 쌓인 결이 모습을 드러내는 과정일 수 있습니다.",
    tarotRef: (title) => ` 지금 손에 닿은 타로의 "${title}" 또한 같은 결을 조용히 비추고 있습니다.`,
    title: "당신의 흐름",
    career: {
      woodFire: { decision:"일의 문은 열릴 수 있습니다. 다만 마음이 먼저 지쳐 손을 놓기보다, 옮길 이유와 조건을 먼저 또렷하게 세우는 편이 좋습니다.", timing:"변화를 향한 마음은 이미 움직이고 있습니다. 다만 준비가 갖춰진 뒤 내딛는 발걸음이 더 오래 갑니다." },
      other: { decision:"지금은 무작정 벗어나기보다, 다음 자리를 단단히 만든 뒤 움직이는 편이 더 안정적인 흐름입니다.", risk:"답답함을 끝내고 싶은 마음만 앞서면, 장소만 바뀐 채 같은 문제를 다시 만나게 될 가능성이 있습니다." }
    },
    love: { decision:"관계의 문은 열려 있지만, 지금은 감정의 온도차를 가볍게 보면 마음에 잔상이 남기 쉬운 시기입니다.", timing:"가까운 흐름 안에서 마음을 확인해야 할 장면이 한 번 또렷하게 다가올 수 있습니다." },
    money: { decision:"재물의 흐름은 들어오기보다, 먼저 지키는 쪽에 뜻이 실려 있습니다. 크게 넓히기보다 손실을 줄이는 선택이 더 빛을 냅니다.", risk:"이번에는 자신감보다 계산이 중요합니다. 마음이 들뜬 순간일수록 숫자를 다시 확인하는 편이 좋습니다." },
    metalWater: "멈춰 있던 것처럼 보여도 안쪽의 물결은 이미 움직이고 있습니다. 다만 너무 빨리 답을 정하려 하기보다, 방향을 먼저 바로잡는 편이 좋습니다.",
    paidSections: ["지금의 결","왜 이런 흐름이 보이는지","조심해야 할 그림자","지금 가장 어울리는 움직임"],
    paidStyle: "한국어로 답변. 말투는 상냥하고 신비롭되 과하지 않게. '~일 수 있습니다', '~흐름입니다', '~보입니다' 같은 표현 사용."
  },
  English: {
    defaultDecision: "The current flow calls for alignment between your heart and reality before any rush forward.",
    riskSuffix: " Even a small choice can ripple further than expected — it is worth taking it seriously.",
    timingDefault: "In the near period ahead, there is a moment where paths diverge. How you choose then will shape what follows.",
    timingSuffix: " How you navigate this time will determine the shape of what comes next.",
    decisionSuffix: " This choice is not mere coincidence — it may be a long-forming current finally surfacing.",
    tarotRef: (title) => ` The tarot card "${title}" you chose quietly reflects the same current.`,
    title: "Your Flow",
    career: {
      woodFire: { decision:"The door to change can open. Rather than letting exhaustion drop your hand first, clarify your reasons and conditions for moving.", timing:"The desire for change is already in motion. A step taken after preparation lasts longer." },
      other: { decision:"Now is the time to build your next foundation firmly before moving — stability comes from readiness, not escape.", risk:"If only the urge to leave leads you, you may find the same problems waiting in a different place." }
    },
    love: { decision:"The door to connection is open, but underestimating emotional distance now may leave a lingering imprint.", timing:"A moment of heart-checking clarity will come clearly in the near flow." },
    money: { decision:"The energy of wealth leans toward preserving what you have, not expanding. Reducing loss outshines ambitious gains right now.", risk:"Calculation matters more than confidence this time. The more excitement rises, the more carefully numbers deserve a second look." },
    metalWater: "Even if things seem paused, the inner current is already moving. Rather than rushing to conclusions, correcting direction first will serve you better.",
    paidSections: ["The Current Shape","Why This Flow is Appearing","Shadows to Watch","The Movement That Suits You Now"],
    paidStyle: "Respond in English. Tone should be calm, gently mystical, and trustworthy — like a thoughtful fortune reader, not an astrologer performing. Use 'may', 'appears', 'seems', 'it is possible that'."
  },
  Japanese: {
    defaultDecision: "今の流れは、焦るよりも先に、心と現実の基準を合わせることを求めています。",
    riskSuffix: " 小さな判断ひとつが思いのほか遠くまで続くことがあります。軽く見ないことが大切です。",
    timingDefault: "近い時期に、一度方向が分かれる場面が見えます。その時の選択が、その後の表情を変えることになります。",
    timingSuffix: " この時期をどのように越えるかによって、次の場面の表情が変わってくるかもしれません。",
    decisionSuffix: " 今の選択は単なる偶然ではなく、長い時間をかけて積み重なった流れが姿を現しているのかもしれません。",
    tarotRef: (title) => ` 今あなたが手にしたタロット「${title}」も、同じ流れを静かに映し出しています。`,
    title: "あなたの流れ",
    career: {
      woodFire: { decision:"変化の扉は開きうるでしょう。ただ、疲れて先に手を放すよりも、移る理由と条件をまず明確にする方が良いでしょう。", timing:"変化を望む気持ちはすでに動いています。ただ、準備が整った後の一歩の方が長く続きます。" },
      other: { decision:"今は闇雲に離れようとするよりも、次の場所を固めてから動く方が安定した流れです。", risk:"解放されたい気持ちだけが先走ると、場所が変わっても同じ問題にまた出会う可能性があります。" }
    },
    love: { decision:"関係の扉は開いていますが、今は感情の温度差を軽く見ると、心に残像が残りやすい時期です。", timing:"近い流れの中で、心を確認しなければならない場面が一度はっきりと訪れることがあるかもしれません。" },
    money: { decision:"財の流れは入ってくるよりも、守ることに意が込められています。大きく広げるよりも損失を減らす選択の方が輝きます。", risk:"今回は自信よりも計算が大切です。気持ちが高揚する瞬間ほど、数字をもう一度確認する方が良いでしょう。" },
    metalWater: "止まっているように見えても、内側の波はすでに動いています。ただ、早く答えを決めようとするよりも、まず方向を正す方が良いでしょう。",
    paidSections: ["今の流れ","なぜこのような流れが見えるのか","注意すべき影","今最も合う動き"],
    paidStyle: "日本語で答えること。口調は穏やかで神秘的だが過度にならないように。「〜かもしれません」「〜流れです」「〜見えます」などの表現を使用すること。"
  },
  Chinese: {
    defaultDecision: "当前的流势提示，与其急于行动，不如先将内心与现实的标准对齐。",
    riskSuffix: " 一个小小的判断，往往会比预想的走得更远——不宜轻视。",
    timingDefault: "在不远的将来，有一个方向将要分叉的场景。那时的选择，将会改变此后的面貌。",
    timingSuffix: " 如何渡过这段时期，将决定下一个场景的走向。",
    decisionSuffix: " 此刻的选择并非偶然，这或许是长久积累的流势终于浮现的过程。",
    tarotRef: (title) => ` 你选中的塔罗牌「${title}」也在静静地映照着同样的流向。`,
    title: "你的流势",
    career: {
      woodFire: { decision:"变化的门或许会打开。与其因疲惫先放弃，不如先将移动的理由和条件清晰地确立下来。", timing:"向往变化的心已经开始涌动。然而，准备充足之后迈出的一步，走得更久更稳。" },
      other: { decision:"此时与其仓皇逃离，不如先将下一个立足点打好基础再动身，这才是更稳定的流势。", risk:"若只有急于解脱的心情在前，只怕换了地方却再次遭遇同样的问题。" }
    },
    love: { decision:"关系的门是开着的，但此时若轻视情感间的温差，容易在心中留下残影。", timing:"在不远的流势中，有一个需要确认心意的场景将会清晰地到来。" },
    money: { decision:"财运的流向倾向于守护而非扩张。比起大力拓展，减少损失的选择更能发光。", risk:"这一次，计算比自信更重要。越是情绪高涨的时刻，越需要再次核实数字。" },
    metalWater: "即便看似停止，内在的波涛已经在涌动。与其急于定下答案，不如先调整方向，更为妥当。",
    paidSections: ["当前的流势","为何出现这样的流向","需要注意的阴影","现在最适合的行动"],
    paidStyle: "用中文回答。语气应温和、略带神秘感，但不过分。使用'可能'、'或许'、'流势显示'、'看起来'等表达方式。"
  },
  Spanish: {
    defaultDecision: "El flujo actual pide que alinéis el corazón con la realidad antes de apresurarse.",
    riskSuffix: " Incluso una pequeña decisión puede resonar más lejos de lo esperado — vale la pena tomárselo en serio.",
    timingDefault: "En el período cercano, hay un momento donde los caminos se separan. Cómo elijas entonces dará forma a lo que sigue.",
    timingSuffix: " Cómo navegues este tiempo determinará la forma de lo que viene después.",
    decisionSuffix: " Esta elección no es mera coincidencia — puede ser una corriente larga que finalmente emerge.",
    tarotRef: (title) => ` La carta de tarot "${title}" que elegiste refleja silenciosamente la misma corriente.`,
    title: "Tu Flujo",
    career: {
      woodFire: { decision:"La puerta al cambio puede abrirse. En lugar de soltar la mano por el agotamiento, clarifica tus razones y condiciones para moverse.", timing:"El deseo de cambio ya está en movimiento. Un paso dado después de la preparación dura más." },
      other: { decision:"Ahora es el momento de construir firmemente tu próxima base antes de moverte — la estabilidad viene de la preparación, no de la huida.", risk:"Si solo el impulso de irte te guía, puede que encuentres los mismos problemas esperando en otro lugar." }
    },
    love: { decision:"La puerta a la conexión está abierta, pero subestimar la distancia emocional ahora puede dejar una huella duradera.", timing:"Un momento de claridad para confirmar lo que sientes llegará nítidamente en el flujo cercano." },
    money: { decision:"La energía de la riqueza se inclina hacia preservar lo que tienes, no hacia expandir. Reducir pérdidas supera a las ganancias ambiciosas ahora.", risk:"El cálculo importa más que la confianza esta vez. Cuanto más sube la emoción, más merecen los números una segunda mirada." },
    metalWater: "Aunque las cosas parezcan pausadas, la corriente interior ya se mueve. Más que apresurarse a conclusiones, corregir la dirección primero te servirá mejor.",
    paidSections: ["La Forma Actual","Por Qué Aparece Este Flujo","Sombras a Observar","El Movimiento Que Te Conviene Ahora"],
    paidStyle: "Responde en español. El tono debe ser sereno, levemente místico y confiable. Usa 'puede', 'parece', 'aparece', 'es posible que'."
  }
};

// ── Saju calculation ─────────────────────────────────
function round(n, d=3){ return Number(Number(n).toFixed(d)); }
function cacheKey(payload){
  const h = payload.hour ?? "unknown";
  const q = (payload.question||"").trim().slice(0,120);
  const lang = payload.lang || "Korean";
  return JSON.stringify({ y:payload.year, m:payload.month, d:payload.day, h, g:payload.gender,
    lat:round(payload.location?.lat,3), lon:round(payload.location?.lon,3), q, paid:!!payload.paid, lang });
}
function yearPillar(y){
  const si=((y-4)%10+10)%10, bi=((y-4)%12+12)%12;
  return {stem:STEMS[si],branch:BRANCHES[bi],si,bi};
}
function monthPillar(y,m){
  const bi=(m+1)%12, ySi=((y-4)%10+10)%10;
  const bases=[2,4,6,8,0], base=bases[Math.floor(ySi/2)];
  const si=(base+m-1)%10;
  return {stem:STEMS[si],branch:BRANCHES[bi],si,bi};
}
function dayPillar(y,m,d){
  const a=Math.floor((14-m)/12), yr=y+4800-a, mo=m+12*a-3;
  const jd=d+Math.floor((153*mo+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045;
  const si=((jd+9)%10+10)%10, bi=((jd+1)%12+12)%12;
  return {stem:STEMS[si],branch:BRANCHES[bi],si,bi};
}
function hourPillar(dp,h){
  const bi=Math.floor((parseInt(h,10)+1)/2)%12;
  const bases=[0,2,4,6,8], base=bases[Math.floor(dp.si/2)];
  const si=(base+bi)%10;
  return {stem:STEMS[si],branch:BRANCHES[bi],si,bi};
}
const STEM_ELEM=[0,0,1,1,2,2,3,3,4,4];
const BRANCH_ELEM=[4,2,0,0,2,1,1,2,3,3,2,4];

function countElements(pillars){
  const c=[0,0,0,0,0];
  for(const p of pillars){ if(!p) continue; c[STEM_ELEM[p.si]]++; c[BRANCH_ELEM[p.bi]]++; }
  return c;
}
function buildSaju(payload){
  const yp=yearPillar(payload.year), mp=monthPillar(payload.year,payload.month);
  const dp=dayPillar(payload.year,payload.month,payload.day);
  const hp=(payload.hour==null||payload.hour==="모름"||payload.hour==="Unknown"||payload.hour==="不明"||payload.hour==="不知道"||payload.hour==="No sé")?null:hourPillar(dp,Number(payload.hour));
  const elements=countElements([yp,mp,dp,hp]);
  const max=Math.max(...elements), min=Math.min(...elements);
  return {
    pillars:{ year:`${yp.stem}${yp.branch}`, month:`${mp.stem}${mp.branch}`, day:`${dp.stem}${dp.branch}`, hour:hp?`${hp.stem}${hp.branch}`:'未詳' },
    dayMaster:ELEMENTS_EN[STEM_ELEM[dp.si]], elements,
    weak:elements.map((v,i)=>({v,i})).filter(x=>x.v===min).map(x=>ELEMENTS_EN[x.i]),
    strong:elements.map((v,i)=>({v,i})).filter(x=>x.v===max).map(x=>ELEMENTS_EN[x.i])
  };
}


// ══════════════════════════════════════════════════════
//  TRADITIONAL SAJU ENGINE
//  십성(Ten Gods), 신강/신약(Strength), 용신(Useful God),
//  형충회합(Interactions), 대운(Major Luck Cycles)
// ══════════════════════════════════════════════════════

// ── 십성 (Ten Gods / Ten Spirits) ────────────────────
// Based on relationship between Day Master stem index and other stem index
// 십성 table: for each dayMaster element × other element × yin/yang
// Stems: 甲0木陽 乙1木陰 丙2火陽 丁3火陰 戊4土陽 己5土陰 庚6金陽 辛7金陰 壬8水陽 癸9水陰

const STEM_YANG = [1,0,1,0,1,0,1,0,1,0]; // 1=양, 0=음
const STEM_ELEM_IDX = [0,0,1,1,2,2,3,3,4,4]; // Wood=0,Fire=1,Earth=2,Metal=3,Water=4

// 오행 상생: Wood→Fire→Earth→Metal→Water→Wood
// 오행 상극: Wood→Earth, Fire→Metal, Earth→Water, Metal→Wood, Water→Fire
function getRelation(dmElem, otherElem) {
  // returns: 'same','generates','generated','controls','controlled'
  if (dmElem === otherElem) return 'same';
  const generates = (dmElem + 1) % 5 === otherElem; // DM generates other
  const generatedBy = (otherElem + 1) % 5 === dmElem; // other generates DM
  const controls = (dmElem + 3) % 5 === otherElem; // DM controls other (Wood→Earth: 0+3=3? no)
  // 상극 순서: Wood(0)→Earth(2), Fire(1)→Metal(3), Earth(2)→Water(4), Metal(3)→Wood(0), Water(4)→Fire(1)
  const controlMap = {0:2, 1:3, 2:4, 3:0, 4:1};
  if (controlMap[dmElem] === otherElem) return 'controls'; // DM controls other → 재(財)
  if (controlMap[otherElem] === dmElem) return 'controlled'; // other controls DM → 관(官)
  if ((dmElem+1)%5 === otherElem) return 'generates'; // DM generates other → 식상(食傷)
  if ((otherElem+1)%5 === dmElem) return 'generatedBy'; // other generates DM → 인성(印星)
  return 'same'; // fallback (비겁)
}

function getTenGod(dmSi, otherSi) {
  const dmElem = STEM_ELEM_IDX[dmSi];
  const otherElem = STEM_ELEM_IDX[otherSi];
  const dmYang = STEM_YANG[dmSi];
  const otherYang = STEM_YANG[otherSi];
  const sameYin = dmYang === otherYang;
  const rel = getRelation(dmElem, otherElem);

  switch(rel) {
    case 'same':      return sameYin ? '비견(比肩)' : '겁재(劫財)';
    case 'generates': return sameYin ? '식신(食神)' : '상관(傷官)';
    case 'controls':  return sameYin ? '편재(偏財)' : '정재(正財)';
    case 'controlled':return sameYin ? '편관(偏官)' : '정관(正官)';
    case 'generatedBy':return sameYin ? '편인(偏印)' : '정인(正印)';
    default: return '비견(比肩)';
  }
}

// Branch hidden stems (지장간)
const BRANCH_HIDDEN = [
  [8],        // 子: 壬(8)
  [5,9,5],   // 丑: 己癸己 → 5,9,5 → simplified [5,9]
  [0,5,2],   // 寅: 甲己丙 → 甲木, 丙火
  [1],        // 卯: 乙(1)
  [4,1,9],   // 辰: 戊丙癸
  [2,4,6],   // 巳: 丙戊庚
  [2,5],     // 午: 丙己
  [5,1,3],   // 未: 己乙丁
  [6,8,4],   // 申: 庚壬戊
  [7],        // 酉: 辛(7)
  [4,7,8],   // 戌: 戊辛壬
  [8,0,4],   // 亥: 壬甲戊
];

// ── 신강/신약 (Day Master Strength) ──────────────────
// 신강: DM is strong (비겁+인성 많음)
// 신약: DM is weak
function calcStrength(dp, pillars, elements) {
  const dmElem = STEM_ELEM_IDX[dp.si];
  const dmYang = STEM_YANG[dp.si];

  // Score: +2 for 비겁(same element stems), +1 for 인성(generates DM)
  // -1 for 식상(DM generates), -2 for 재성(DM controls), -1 for 관성(controls DM)
  let score = 0;
  for (const p of pillars) {
    if (!p) continue;
    const stemRel = getRelation(dmElem, STEM_ELEM_IDX[p.si]);
    if (stemRel === 'same')       score += 2;
    if (stemRel === 'generatedBy') score += 1;
    if (stemRel === 'generates')  score -= 1;
    if (stemRel === 'controls')   score -= 2;
    if (stemRel === 'controlled') score -= 1;

    // Branch hidden stems
    const hidden = BRANCH_HIDDEN[p.bi] || [];
    for (const hs of hidden) {
      const hRel = getRelation(dmElem, STEM_ELEM_IDX[hs]);
      if (hRel === 'same')       score += 0.5;
      if (hRel === 'generatedBy') score += 0.5;
    }
  }
  // Season boost: month branch
  // Spring(寅卯辰) boosts Wood, Summer(巳午未) boosts Fire, etc.
  const monthBranch = pillars[1]?.bi; // month pillar
  const seasonBoost = {
    0:{2:2,3:2,4:1}, // Wood: 寅卯辰 branches
    1:{5:2,6:2,3:1}, // Fire: 巳午未
    2:{1:1,4:1,7:1,10:1}, // Earth: 丑辰未戌
    3:{7:1,8:2,9:2,10:1}, // Metal: 未申酉戌
    4:{11:2,0:2,1:1}, // Water: 亥子丑
  };
  if (monthBranch !== undefined && seasonBoost[dmElem]?.[monthBranch]) {
    score += seasonBoost[dmElem][monthBranch];
  }

  return {
    score,
    isStrong: score >= 2,
    label: score >= 4 ? '신강(身强)' : score >= 2 ? '중강(中强)' : score >= 0 ? '중약(中弱)' : '신약(身弱)'
  };
}

// ── 용신 (Useful God) ─────────────────────────────────
// 신강 → 식상/재성/관성으로 설기 필요
// 신약 → 비겁/인성으로 부조 필요
function calcYongsin(strength, dmElem, elements) {
  const ELEM_NAMES = ['木(목)','火(화)','土(토)','金(금)','水(수)'];
  const generates = (dmElem + 1) % 5; // DM이 생하는 오행
  const controlled = (dmElem + 2) % 5; // 상극 target... 재성
  const controlOf = (dmElem + 3) % 5;
  const generatedBy = (dmElem + 4) % 5; // 인성

  let yongsin, gishin, reason;

  if (strength.isStrong) {
    // 신강 → 용신: 식상(설기), 재성, 관성
    // 가장 약한 오행 중 식상/재/관 우선
    const candidates = [generates, controlled, (controlled+3)%5]; // 식상, 재성, 관성
    yongsin = candidates.reduce((a, b) => elements[a] <= elements[b] ? a : b);
    gishin = generatedBy; // 인성은 기신(더 강해짐)
    reason = `신강 사주 — 일간의 기운이 강하므로 설기(泄氣)가 필요합니다. ${ELEM_NAMES[generates]}(식상) 또는 ${ELEM_NAMES[controlled]}(재성)의 기운이 용신입니다.`;
  } else {
    // 신약 → 용신: 비겁, 인성
    const candidates = [dmElem, generatedBy];
    yongsin = candidates.reduce((a, b) => elements[a] <= elements[b] ? a : b);
    gishin = generates; // 식상은 기신(더 약해짐)
    reason = `신약 사주 — 일간의 기운이 약하므로 부조(扶助)가 필요합니다. ${ELEM_NAMES[dmElem]}(비겁) 또는 ${ELEM_NAMES[generatedBy]}(인성)의 기운이 용신입니다.`;
  }

  return {
    yongsin: ELEM_NAMES[yongsin],
    yongsinIdx: yongsin,
    gishin: ELEM_NAMES[gishin],
    gishinIdx: gishin,
    reason
  };
}

// ── 십성 분석 ─────────────────────────────────────────
function calcTenGods(dp, yp, mp, hp) {
  const pillars = [
    { label:'년간', si: yp.si },
    { label:'월간', si: mp.si },
    { label:'시간', si: hp?.si }
  ].filter(p => p.si !== undefined);

  return pillars.map(p => ({
    pillar: p.label,
    tenGod: getTenGod(dp.si, p.si)
  }));
}

// ── 형충회합 (Interactions) ───────────────────────────
const CHUNG_PAIRS = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]; // 자오충, 축미충, etc.
const HWA_SETS = [
  { branches:[2,6,10], result:'火局', name:'인오술 삼합' },
  { branches:[1,5,9],  result:'金局', name:'사유축 삼합' },
  { branches:[0,4,8],  result:'水局', name:'신자진 삼합' },
  { branches:[3,7,11], result:'木局', name:'해묘미 삼합' },
];
const HWE_PAIRS = [
  {a:0,b:11,result:'水',name:'자해합'},
  {a:1,b:10,result:'土',name:'축술합'},... 
  {a:2,b:9, result:'火',name:'인유합'}, // 실제는 복잡하지만 간략화
  {a:3,b:8, result:'木',name:'묘신합'},
  {a:4,b:7, result:'土',name:'진미합'},
  {a:5,b:6, result:'火',name:'사오합'},
];

function calcInteractions(pillarsArr) {
  const branches = pillarsArr.filter(p=>p).map(p=>p.bi);
  const results = [];

  // 충(冲) 검사
  for (const [a, b] of CHUNG_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) {
      const branchNames = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      results.push({ type:'충(冲)', desc:`${branchNames[a]}${branchNames[b]}충 — 강한 충돌과 변화의 기운` });
    }
  }

  // 삼합(三合) 검사
  for (const hw of HWA_SETS) {
    if (hw.branches.every(b => branches.includes(b))) {
      results.push({ type:'삼합(三合)', desc:`${hw.name} — ${hw.result} 기운이 강하게 형성` });
    }
  }

  return results;
}

// ── 대운 (Major Luck Cycles) ──────────────────────────
// 월주 기준 순/역행, 3일=1년 환산
// 절기 계산은 복잡하므로 근사치로 계산 (출생월 기준)
function calcDaeun(yp, mp, dp, gender, birthYear, birthMonth) {
  const dmYang = STEM_YANG[dp.si];
  // 양남음녀 = 순행, 음남양녀 = 역행
  const isForward = (dmYang === 1 && gender === 'male') || (dmYang === 0 && gender === 'female');

  const daeunList = [];
  const startAge = 3; // 절기까지 평균 3일 ≈ 3년 (근사)

  for (let i = 1; i <= 8; i++) {
    let stemIdx, branchIdx;
    if (isForward) {
      stemIdx = (mp.si + i) % 10;
      branchIdx = (mp.bi + i) % 12;
    } else {
      stemIdx = ((mp.si - i) % 10 + 10) % 10;
      branchIdx = ((mp.bi - i) % 12 + 12) % 12;
    }
    const age = startAge + (i - 1) * 10;
    const period = `${birthYear + age}~${birthYear + age + 9}`;
    daeunList.push({
      index: i,
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx],
      pillar: `${STEMS[stemIdx]}${BRANCHES[branchIdx]}`,
      stemElem: STEM_ELEM_IDX[stemIdx],
      branchElem: BRANCH_ELEM[branchIdx],
      age: `${age}세`,
      period
    });
  }
  return { isForward, list: daeunList };
}

// ── 현재 대운 찾기 ────────────────────────────────────
function getCurrentDaeun(daeunData, birthYear) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return daeunData.list.find((d, i) => {
    const startAge = parseInt(d.age);
    const endAge = startAge + 9;
    return age >= startAge && age <= endAge;
  }) || daeunData.list[0];
}

// ── Enhanced buildSaju ────────────────────────────────
function buildSajuFull(payload) {
  const yp = yearPillar(payload.year);
  const mp = monthPillar(payload.year, payload.month);
  const dp = dayPillar(payload.year, payload.month, payload.day);
  const hp = (payload.hour == null || ['모름','Unknown','不明','不知道','No sé'].includes(payload.hour))
    ? null : hourPillar(dp, Number(payload.hour));

  const allPillars = [yp, mp, dp, hp];
  const elements = countElements(allPillars);
  const max = Math.max(...elements), min = Math.min(...elements);
  const dmElem = STEM_ELEM_IDX[dp.si];
  const ELEM_NAMES_KO = ['木(목)','火(화)','土(토)','金(금)','水(수)'];

  // 신강신약
  const strength = calcStrength(dp, allPillars, elements);
  // 용신
  const yongsin = calcYongsin(strength, dmElem, elements);
  // 십성
  const tenGods = calcTenGods(dp, yp, mp, hp);
  // 형충회합
  const interactions = calcInteractions(allPillars);
  // 대운
  const daeun = calcDaeun(yp, mp, dp, payload.gender, payload.year, payload.month);
  const currentDaeun = getCurrentDaeun(daeun, payload.year);

  // 십성으로 성향 분석
  const tenGodLabels = tenGods.map(t => t.tenGod);
  const hasJeongGwan = tenGodLabels.some(t => t.includes('정관'));
  const hasJeongJae  = tenGodLabels.some(t => t.includes('정재'));
  const hasShikShin  = tenGodLabels.some(t => t.includes('식신'));
  const hasSangGwan  = tenGodLabels.some(t => t.includes('상관'));
  const hasGyeopJae  = tenGodLabels.some(t => t.includes('겁재'));
  const hasPyeonIn   = tenGodLabels.some(t => t.includes('편인'));

  // 성격 키워드 도출
  const personalityHints = [];
  if (hasJeongGwan) personalityHints.push('원칙과 책임감이 강함, 조직 친화적');
  if (hasJeongJae)  personalityHints.push('현실적이고 재물에 대한 감각이 있음');
  if (hasShikShin)  personalityHints.push('창의적이고 표현력이 뛰어남, 예술적 기질');
  if (hasSangGwan)  personalityHints.push('자유로운 영혼, 기존 틀을 벗어나는 경향');
  if (hasGyeopJae)  personalityHints.push('경쟁심이 강하고 독립적');
  if (hasPyeonIn)   personalityHints.push('직관력과 통찰력이 뛰어남, 다소 예민');

  return {
    pillars: {
      year:  `${yp.stem}${yp.branch}`,
      month: `${mp.stem}${mp.branch}`,
      day:   `${dp.stem}${dp.branch}`,
      hour:  hp ? `${hp.stem}${hp.branch}` : '미상(未詳)'
    },
    dayMaster: ELEM_NAMES_KO[dmElem],
    dayMasterRaw: dmElem,
    elements,
    elementNames: ELEM_NAMES_KO,
    weak:  elements.map((v,i)=>({v,i})).filter(x=>x.v===min).map(x=>ELEM_NAMES_KO[x.i]),
    strong:elements.map((v,i)=>({v,i})).filter(x=>x.v===max).map(x=>ELEM_NAMES_KO[x.i]),
    // 전통 분석
    strength,
    yongsin,
    tenGods,
    interactions,
    daeun: {
      direction: daeun.isForward ? '순행(順行)' : '역행(逆行)',
      current: currentDaeun,
      list: daeun.list.slice(0, 5) // 처음 5개만
    },
    personalityHints
  };
}

// ── Astrology API ────────────────────────────────────
async function fetchAstrologyData(payload){
  const accessToken=process.env.ASTROLOGY_API_ACCESS_TOKEN;
  if(!accessToken) throw new Error("Missing ASTROLOGY_API_ACCESS_TOKEN");
  const hour=(!payload.hour||payload.hour==="모름")?12:Number(payload.hour);
  const body={ day:Number(payload.day), month:Number(payload.month), year:Number(payload.year),
    hour, min:Number(payload.minute||0), lat:Number(payload.location.lat),
    lon:Number(payload.location.lon), tzone:Number(payload.location?.tzone??9), house_type:"placidus" };
  const resp=await fetch("https://json.astrologyapi.com/v1/planets/tropical",{
    method:"POST", headers:{"Authorization":`Bearer ${accessToken}`,"Content-Type":"application/json","Accept-Language":"en"},
    body:JSON.stringify(body)
  });
  const text=await resp.text();
  let data; try{data=JSON.parse(text);}catch{throw new Error(`AstrologyAPI parse fail: ${text.slice(0,200)}`);}
  if(!resp.ok) throw new Error(data?.message||`AstrologyAPI error ${resp.status}`);
  if(!Array.isArray(data)) throw new Error("AstrologyAPI unexpected format");
  return data;
}
function summarizeAstrology(planets){
  const pick=n=>planets.find(p=>p.name===n);
  const sun=pick("Sun"),moon=pick("Moon"),mercury=pick("Mercury"),venus=pick("Venus"),mars=pick("Mars"),asc=pick("Ascendant");
  return {
    sun:sun?`${sun.sign} H${sun.house}`:null, moon:moon?`${moon.sign} H${moon.house}`:null,
    mercury:mercury?`${mercury.sign} H${mercury.house}`:null, venus:venus?`${venus.sign} H${venus.house}`:null,
    mars:mars?`${mars.sign} H${mars.house}`:null, ascendant:asc?`${asc.sign} H${asc.house}`:null
  };
}

// ── Free hooks (multilingual) ─────────────────────────
function makeFreeHooks({ saju, question, tarot, lang, fortuneCat }) {
  // fortuneCat overrides question detection when provided
  const catQ = fortuneCat ? fortuneCat.toLowerCase() : "";
  if (catQ) question = catQ + " " + (question||"");
  const lk = LANG_HOOKS[lang] || LANG_HOOKS["English"];
  const q = (question||"").toLowerCase();
  const dm = saju.dayMaster;
  const strong = saju.strong.join(", ");
  const weak = saju.weak.join(", ");

  let decision = lk.defaultDecision;
  let riskHook = `(${strong}) vs (${weak})`;
  let timingHook = lk.timingDefault;

  const isCareer = q.includes("이직")||q.includes("직장")||q.includes("career")||q.includes("job")||q.includes("転職")||q.includes("换工作")||q.includes("trabajo");
  const isLove   = q.includes("연애")||q.includes("결혼")||q.includes("love")||q.includes("恋愛")||q.includes("感情")||q.includes("amor")||q.includes("关系");
  const isMoney  = q.includes("돈")||q.includes("사업")||q.includes("투자")||q.includes("money")||q.includes("お金")||q.includes("钱")||q.includes("dinero");

  if (isCareer) {
    if (dm==="Wood"||dm==="Fire") {
      decision = lk.career.woodFire.decision;
      timingHook = lk.career.woodFire.timing;
    } else {
      decision = lk.career.other.decision;
      riskHook = lk.career.other.risk || riskHook;
    }
  } else if (isLove) {
    decision = lk.love.decision;
    timingHook = lk.love.timing;
  } else if (isMoney) {
    decision = lk.money.decision;
    riskHook = lk.money.risk;
  } else {
    if (dm==="Metal"||dm==="Water") decision = lk.metalWater;
    riskHook = `${lang==="Korean"?"강하게 드러난 기운":"Dominant energy"} (${strong}) / ${lang==="Korean"?"약한 기운":"weaker"} (${weak})`;
  }

  if (tarot?.title) riskHook += lk.tarotRef(tarot.title);

  return {
    title: lk.title,
    decision: decision + lk.decisionSuffix,
    riskHook: riskHook + lk.riskSuffix,
    timingHook: timingHook + lk.timingSuffix
  };
}

// ── Paid detail (multilingual prompt) ───────────────
async function buildPaidDetail({ saju, astrologySummary, question, tarot, lang, fortuneCat }){
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const lk = LANG_HOOKS[lang] || LANG_HOOKS["English"];
  const sections = lk.paidSections;

  const prompt = `
You are a master-level Korean Saju (四柱命理) and Western astrology interpreter with deep knowledge of traditional Four Pillars theory.

=== TRADITIONAL SAJU KNOWLEDGE BASE ===
십성(十星) 해석 원칙:
- 비견(比肩): 자아, 독립심, 경쟁. 많으면 고집스럽고 독립적. 재성 분산.
- 겁재(劫財): 경쟁, 탈재. 많으면 투기적 성향. 재물 손실 위험.
- 식신(食神): 창의력, 표현, 복록. 많으면 예술적이고 낙천적. 관성 제어.
- 상관(傷官): 반항, 재능, 총명. 관성 극. 직장 불안정. 창의적 직업 유리.
- 편재(偏財): 유동재산, 투기, 부친. 많으면 변동 많은 재물.
- 정재(正財): 고정재산, 근면, 현실적. 안정적 재물운. 배우자 인연.
- 편관(偏官): 권력, 투쟁, 스트레스. 많으면 직장 갈등. 강인한 의지.
- 정관(正官): 명예, 책임감, 조직. 직장운 좋음. 도덕적 성향.
- 편인(偏印): 직관, 예술, 종교. 편식적 지식. 다재다능.
- 정인(正印): 학문, 모성, 인자함. 학업운 좋음. 귀인 도움.

신강신약 판단:
- 신강(身强): 일간이 강함 → 식상/재성/관성으로 기운을 설기해야 함
- 신약(身弱): 일간이 약함 → 비겁/인성으로 일간을 부조해야 함

용신(用神) 원칙:
- 용신: 사주의 균형을 잡아주는 핵심 오행. 이 기운이 강한 시기/방향이 길함.
- 기신(忌神): 용신과 반대. 이 기운이 강한 시기는 흉함.

대운(大運) 해석:
- 10년 주기로 운의 흐름이 바뀜
- 현재 대운의 천간/지지가 용신과 합이면 길운, 기신이면 흉운
- 대운 천간이 일간을 생하면 재물/건강 상승
- 대운 지지의 충은 변화와 이동을 의미

형충회합(刑冲會合):
- 충(冲): 강한 변화, 이동, 충돌 — 부정적이지만 정체된 기운을 움직임
- 합(合): 기운이 합쳐져 새로운 오행 생성 — 대체로 안정적

오행별 직업/성격:
- 木: 교육, 언론, 법, 성장 지향
- 火: 예술, 패션, IT, 열정적
- 土: 부동산, 농업, 중개, 안정 지향
- 金: 금융, 법조, 의료, 정밀업
- 水: 무역, 여행, 철학, 유연함

=== 분석 대상 사주 데이터 ===
[사주 원국]
년주: ${saju.pillars.year} | 월주: ${saju.pillars.month} | 일주: ${saju.pillars.day} | 시주: ${saju.pillars.hour}
일간: ${saju.dayMaster}
오행 분포 [木火土金水]: ${JSON.stringify(saju.elements)}
강한 오행: ${saju.strong?.join(", ")||"없음"} | 약한 오행: ${saju.weak?.join(", ")||"없음"}

[신강신약]
${saju.strength?.label||"미상"} (점수: ${saju.strength?.score||0})

[용신/기신]
용신(用神): ${saju.yongsin?.yongsin||"미상"}
기신(忌神): ${saju.yongsin?.gishin||"미상"}
근거: ${saju.yongsin?.reason||""}

[십성 구성]
${(saju.tenGods||[]).map(t=>`${t.pillar}: ${t.tenGod}`).join(" | ")||"미상"}

[형충회합]
${(saju.interactions||[]).map(i=>`${i.type}: ${i.desc}`).join(", ")||"없음"}

[현재 대운]
${saju.daeun?.current?.pillar||"미상"} (${saju.daeun?.current?.age||""}, ${saju.daeun?.current?.period||""})
대운 방향: ${saju.daeun?.direction||"미상"}

[성격 성향 분석]
${(saju.personalityHints||[]).join(", ")||"미상"}

[서양 점성술]
태양: ${astrologySummary.sun} | 달: ${astrologySummary.moon}
수성: ${astrologySummary.mercury} | 금성: ${astrologySummary.venus}
화성: ${astrologySummary.mars} | 상승궁: ${astrologySummary.ascendant}

[타로]
${tarot?.title||"없음"}: ${tarot?.message||"없음"}

[질문/운세 카테고리]
${fortuneCat ? `카테고리: ${fortuneCat}` : ""}
${question || "전반적인 인생 흐름"}

=== 출력 규칙 ===
${lk.paidStyle}
아래 4개 섹션만 출력 (추가 텍스트 없이):
1. ${sections[0]}
2. ${sections[1]}
3. ${sections[2]}
4. ${sections[3]}
각 섹션: 제목 한 줄 + 2~4문장. 불릿 포인트 없이 산문으로.
용신/십성/대운 데이터를 실제 해석에 반영할 것. 추상적 위로 문구보다 구체적 근거 기반 해석 우선.
\`.trim();
${lk.paidStyle}
Do NOT invent new calculations. Use ONLY the data provided below.

[SAJU]
Year pillar: ${saju.pillars.year}
Month pillar: ${saju.pillars.month}
Day pillar: ${saju.pillars.day}
Hour pillar: ${saju.pillars.hour}
Day master element: ${saju.dayMaster}
Element distribution: ${JSON.stringify(saju.elements)} (Wood/Fire/Earth/Metal/Water)
Strong: ${saju.strong.join(", ")} | Weak: ${saju.weak.join(", ")}

[WESTERN ASTROLOGY]
Sun: ${astrologySummary.sun} | Moon: ${astrologySummary.moon}
Mercury: ${astrologySummary.mercury} | Venus: ${astrologySummary.venus}
Mars: ${astrologySummary.mars} | Ascendant: ${astrologySummary.ascendant}

[TAROT]
${tarot?.title||"None"}: ${tarot?.message||"None"}

[QUESTION]
${question||"General life path"}

Output format (exactly 4 sections, no extra text):
1. ${sections[0]}
2. ${sections[1]}
3. ${sections[2]}
4. ${sections[3]}
Each section: one title line + 2~4 sentences. No bullet points.
`.trim();

  const resp=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({ model:"gpt-4o-mini", temperature:0.65, max_tokens:700,
      messages:[
        {role:"system", content:"You are a calm, trustworthy fortune reader who interprets pre-calculated astrological data."},
        {role:"user", content:prompt}
      ]
    })
  });
  const data=await resp.json();
  if(!resp.ok) throw new Error(data?.error?.message||"OpenAI call failed");
  return data.choices?.[0]?.message?.content||"Failed to generate reading";
}


// ── Compat analysis ──────────────────────────────────
async function buildCompatDetail({ sajuA, sajuB, lang }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const langInstructions = {
    Korean:  { lang:"한국어", style:"말투는 상냥하고 신비롭되 과하지 않게. '~일 수 있습니다', '~보입니다' 사용." },
    English: { lang:"English", style:"Calm, gently mystical tone. Use 'may', 'appears', 'seems'." },
    Japanese:{ lang:"日本語", style:"穏やかで神秘的な口調。「〜かもしれません」「〜見えます」を使用。" },
    Chinese: { lang:"中文", style:"温和、略带神秘感的语气。使用'可能'、'或许'、'看起来'。" },
    Spanish: { lang:"Español", style:"Tono sereno y levemente místico. Usa 'puede', 'parece', 'aparece'." }
  };
  const li = langInstructions[lang] || langInstructions.English;

  const compatSections = {
    Korean:  ["두 사람의 기운","잘 맞는 부분","조심해야 할 부분","이 인연을 빛나게 하는 방법"],
    English: ["The Energy Between You","Where You Align","Where to Take Care","How to Make This Bond Shine"],
    Japanese:["二人の気","合う部分","注意すべき部分","この縁を輝かせる方法"],
    Chinese: ["两人的气场","契合之处","需要注意的部分","让这段缘分发光的方法"],
    Spanish: ["La Energía Entre Ustedes","Donde Están Alineados","Donde Tener Cuidado","Cómo Hacer Brillar Este Vínculo"]
  };
  const sections = compatSections[lang] || compatSections.English;

  // Calculate simple harmony score based on element interactions
  const elemA = sajuA.elements; // [Wood,Fire,Earth,Metal,Water]
  const elemB = sajuB.elements;
  // Complementary pairs: Wood+Fire, Fire+Earth, Metal+Water, Water+Wood
  const complementScore = (elemA[0]*elemB[1] + elemA[1]*elemB[2] + elemA[3]*elemB[4] + elemA[4]*elemB[0]) * 2;
  // Same element resonance
  const resonanceScore = elemA.reduce((acc, v, i) => acc + Math.min(v, elemB[i]), 0) * 3;
  // Conflict pairs: Wood+Metal, Fire+Water, Earth+Wood (clash)
  const conflictScore = (elemA[0]*elemB[3] + elemA[1]*elemB[4] + elemA[2]*elemB[0]) * 2;
  const rawScore = Math.min(99, Math.max(40, 60 + complementScore + resonanceScore - conflictScore));
  const score = Math.round(rawScore);

  const prompt = `
You are a calm, insightful reader of Korean Four Pillars (Saju) compatibility.
Respond in ${li.lang}. ${li.style}
Do NOT invent new calculations. Use ONLY the data below.

[PERSON A]
Year: ${sajuA.pillars.year} | Month: ${sajuA.pillars.month} | Day: ${sajuA.pillars.day} | Hour: ${sajuA.pillars.hour}
Day master: ${sajuA.dayMaster} | Strong: ${sajuA.strong.join(",")} | Weak: ${sajuA.weak.join(",")}

[PERSON B]
Year: ${sajuB.pillars.year} | Month: ${sajuB.pillars.month} | Day: ${sajuB.pillars.day} | Hour: ${sajuB.pillars.hour}
Day master: ${sajuB.dayMaster} | Strong: ${sajuB.strong.join(",")} | Weak: ${sajuB.weak.join(",")}

[HARMONY SCORE] ${score}/99

Output exactly 4 sections, no extra text:
1. ${sections[0]}
2. ${sections[1]}
3. ${sections[2]}
4. ${sections[3]}
Each section: title line + 2~3 sentences. No bullet points.
`.trim();

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini", temperature: 0.65, max_tokens: 600,
      messages: [
        { role: "system", content: "You are a calm compatibility reader who interprets pre-calculated saju data." },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || "OpenAI call failed");

  return { score, detail: data.choices?.[0]?.message?.content || "" };
}

// ── Main handler ──────────────────────────────────────
export default async function handler(req, res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{
    const payload=req.body||{};
    const lang = SUPPORTED_LANGS.includes(payload.lang) ? payload.lang : "Korean";
    // ── Compat mode ──
    if (payload.mode === 'compat') {
      if (!payload.year||!payload.month||!payload.day) throw new Error("Missing person A birth date");
      if (!payload.partnerYear||!payload.partnerMonth||!payload.partnerDay) throw new Error("Missing person B birth date");
      const sajuA = buildSaju({ year:payload.year, month:payload.month, day:payload.day, hour:payload.hour });
      const sajuB = buildSaju({ year:payload.partnerYear, month:payload.partnerMonth, day:payload.partnerDay, hour:payload.partnerHour });
      const compatKey = JSON.stringify([sajuA.pillars, sajuB.pillars, lang]);
      if (CACHE.has(compatKey)) return res.status(200).json(CACHE.get(compatKey));
      const result = await buildCompatDetail({ sajuA, sajuB, lang });
      const titleMap = {
        Korean:"두 사람의 사주 궁합", English:"Your Saju Compatibility",
        Japanese:"二人の四柱相性", Chinese:"两人的四柱缘分", Spanish:"Tu Compatibilidad Saju"
      };
      const response = { score: result.score, title: titleMap[lang]||titleMap.English, detail: result.detail };
      CACHE.set(compatKey, response);
      return res.status(200).json(response);
    }

    for(const key of ["year","month","day","gender"]){
      if(payload[key]==null) throw new Error(`Missing required field: ${key}`);
    }

    if(!payload.paid){
      const saju=buildSajuFull(payload);
      const free=makeFreeHooks({saju, question:payload.question, tarot:payload.tarot, lang, fortuneCat:payload.fortuneCat});
      return res.status(200).json({free, paid:false, meta:{saju}});
    }

    if(!payload.location) throw new Error("Paid analysis requires birthplace (location)");

    const key=cacheKey(payload);
    if(CACHE.has(key)) return res.status(200).json(CACHE.get(key));

    const saju=buildSajuFull(payload);
    const astrologyRaw=await fetchAstrologyData(payload);
    const astrologySummary=summarizeAstrology(astrologyRaw);
    const free=makeFreeHooks({saju, question:payload.question, tarot:payload.tarot, lang, fortuneCat:payload.fortuneCat});
    const response={
      free, paid:true, meta:{saju,astrologySummary},
      detail:await buildPaidDetail({saju, astrologySummary, question:payload.question, tarot:payload.tarot, lang, fortuneCat:payload.fortuneCat})
    };
    CACHE.set(key, response);
    return res.status(200).json(response);
  }catch(e){
    return res.status(500).json({error:e.message||"Unknown error"});
  }
}
