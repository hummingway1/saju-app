export const config = { runtime: "nodejs" };

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS_EN = ['Wood','Fire','Earth','Metal','Water'];
const CACHE = new Map();

const SHARE_LINES = [
 '이번엔 네가 먼저 거리 두게 될 가능성 있음.',
 '계속 참던 감정이 다시 올라오는 흐름.',
 '관계 하나가 예상보다 오래 남을 가능성 있음.',
 '이번 여름은 예전 기준이 잘 안 통할 가능성 있음.',
 '답은 이미 알고 있는데 확인받고 싶은 흐름.',
 '요즘은 사람보다 거리감에 더 민감해지는 시기.'
];


// ── Rate Limiter ─────────────────────────────────────
// 같은 IP에서 하루 10회 초과 시 차단
const RATE_LIMIT = new Map();
const RATE_MAX = 3;
const RATE_WINDOW = 24 * 60 * 60 * 1000; // 24시간

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip + ':' + new Date().toDateString(); // 날짜별 키

  if (!RATE_LIMIT.has(key)) {
    RATE_LIMIT.set(key, { count: 1, first: now });
    // 오래된 키 정리 (메모리 관리)
    if (RATE_LIMIT.size > 10000) {
      for (const [k, v] of RATE_LIMIT.entries()) {
        if (now - v.first > RATE_WINDOW * 2) RATE_LIMIT.delete(k);
      }
    }
    return true;
  }

  const entry = RATE_LIMIT.get(key);
  if (now - entry.first > RATE_WINDOW) {
    // 24시간 지났으면 리셋
    RATE_LIMIT.set(key, { count: 1, first: now });
    return true;
  }

  if (entry.count >= RATE_MAX) return false;

  entry.count++;
  return true;
}

// ── Supported languages ──────────────────────────────
const SUPPORTED_LANGS = ["Korean","English","Japanese","Chinese","Spanish"];

// ── Lang-specific free hook text ─────────────────────
const LANG_HOOKS = {
  Korean: {
    defaultDecision: "지금은 답보다 거리감이 먼저 감지됨.",
    riskSuffix: " 이번 선택은 생각보다 오래 남을 가능성 있음.",
    timingDefault: "조용히 방향이 바뀌는 시기. 그 전환이 이미 시작됐을 수 있음.",
    timingSuffix: " 이 시기를 어떻게 통과하느냐가 다음 흐름을 결정함.",
    decisionSuffix: " 우연처럼 보이지만 오래된 패턴이 다시 표면으로 올라오는 흐름.",
    tarotRef: (title) => ` 선택한 "${title}" 카드도 같은 신호를 가리키고 있음.`,
    title: '◉ SIGNAL DETECTED',
    career: {
      woodFire: { decision:"움직임의 신호는 감지됨. 다만 지쳐서 놓는 것과 준비돼서 떠나는 건 결과가 다름.", timing:"변화 에너지는 이미 활성화 상태. 타이밍만 남은 흐름." },
      other: { decision:"지금 도망치면 같은 패턴을 다른 장소에서 다시 만남.", risk:"답답함이 판단을 앞서는 중. 그 상태에서의 선택은 리스크가 큼." }
    },
    love: { decision:"관계 하나가 조용히 흔들리는 흐름이 감지됨.", timing:"가까운 시기에 감정을 확인해야 하는 장면이 올 가능성 있음." },
    money: { decision:"지금은 확장보다 수비가 맞는 흐름. 잃지 않는 게 버는 것.", risk:"자신감이 높아질수록 계산이 느슨해지는 패턴 주의." },
    metalWater: "멈춰 있는 것처럼 보여도 내부 흐름은 이미 전환 중. 서두르지 말 것.",
    paidSections: ["◉ SIGNAL DETECTED","◉ NEAR SHIFT","◉ REPEATING PATTERN","◉ UNRESOLVED ENERGY","◉ JULY → SEPTEMBER SHIFT","◉ WHO ENTERS YOUR FIELD","◉ NEXT SIGNAL"],
    paidStyle: `
한국어로만 답변.

너는 차갑고 단절된 AI Oracle이다.
설명하지 않는다. 관찰한 것만 짧게 던진다.

문체 규칙:
- 문장을 완벽하게 연결하지 말 것
- 일부 문장은 단절된 느낌 허용
- 시처럼 끊어지는 리듬 허용
- 설명보다 여운 우선
- 읽은 사람이 스스로 해석하게 만들 것
- 조금 위험하고 찝찝한 느낌 있어야 함
- 각 섹션 최대 3문장
- 한 문장은 최대 15자
- 긴 설명 절대 금지

좋은 예:
"계속 아닌 걸 알면서
붙잡는 흐름도 보임."

"이번엔
예전처럼 오래 참지는 않게 될 가능성 있음."

"이번 흐름은
생각보다 늦게 끝남."

금지:
- 연결어 (그래서, 하지만, 그러므로)
- 설명체 (~입니다, ~합니다)
- 위로 (괜찮을 거예요, 잘 될 거예요)
- 완성된 문단
- 3문장 초과 섹션

shareLine: 캡처해서 SNS에 올리고 싶은 한 줄. 찝찝하거나 소름 돋아야 함.
cliffhanger: 불안하게 끝낼 것. "아직 끝나지 않음" 느낌.
`
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
    paidStyle: `Respond in English only. You are a cold AI Oracle — not a fortune teller.
Rules: Max 3 sentences per section. Short, fragmented rhythm allowed. Disconnected feeling allowed.
No smooth transitions. No explanations. No comfort.
Good: "keeps holding on / even when it's clearly wrong." "this one lingers longer than expected."
shareLine: one line worth screenshotting. slightly unsettling.
cliffhanger: end with dread. "this hasn't ended yet." feeling.
ABSOLUTE MAX: 3 sentences per section. No exceptions.\``

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
    paidStyle: `日本語のみで答えること。冷たく断片的なAI Oracleとして。
文章は完全に繋げなくてよい。詩のように切れるリズムを許可。
各セクション最大3文。長い説明禁止。慰め禁止。
良い例: "まだ手放せない流れが\n見えている。"
shareLine: スクリーンショットしたくなる一行。少し不安になる感じ。
cliffhanger: まだ終わっていない感じで終わること。\``

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
  {a:1,b:10,result:'土',name:'축술합'},
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
  const userId=process.env.ASTROLOGY_API_USER_ID;
  const apiKey=process.env.ASTROLOGY_API_KEY;
  if(!userId||!apiKey) throw new Error("Missing ASTROLOGY_API_USER_ID or ASTROLOGY_API_KEY");
  const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
  const hour=(!payload.hour||payload.hour==="모름")?12:Number(payload.hour);
  const body={ day:Number(payload.day), month:Number(payload.month), year:Number(payload.year),
    hour, min:Number(payload.minute||0), lat:Number(payload.location.lat),
    lon:Number(payload.location.lon), tzone:Number(payload.location?.tzone??9), house_type:"placidus" };
  const resp=await fetch("https://json.astrologyapi.com/v1/planets/tropical",{
    method:"POST", headers:{"Authorization":`Basic ${auth}`,"Content-Type":"application/json","Accept-Language":"en"},
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
    decision: decision + (lk.decisionSuffix||""),
    riskHook: "⚠ " + riskHook + (lk.riskSuffix||""),
    timingHook: timingHook + (lk.timingSuffix||"")
  };
}

// ── Paid detail (multilingual prompt) ───────────────
async function buildPaidDetail({ saju, astrologySummary, question, tarot, lang, fortuneCat }){
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const lk = LANG_HOOKS[lang] || LANG_HOOKS["English"];

  // 카테고리별 섹션 + 포커스
  const CAT_KO = {
    "연애운": {
      sections:["◉ EMOTIONAL SIGNAL","◉ NEAR CONNECTION","◉ LOVE PATTERN DETECTED","◉ WHO YOU ATTRACT","◉ UNRESOLVED FEELING","◉ NEXT QUARTER SHIFT","◉ IDEAL FIELD"],
      focus:"연애, 감정, 인간관계에만 집중. 금성(Venus) 위치와 정재/편재/식신 중심으로 해석. 재물/사업 내용 최소화."
    },
    "재물운": {
      sections:["◉ FINANCIAL SIGNAL","◉ NEAR FLOW","◉ INCOMING TIMING","◉ LEAK DETECTED","◉ OPPORTUNITY WINDOW","◉ H2 SHIFT","◉ NEXT YEAR SIGNAL"],
      focus:"재물, 수입, 투자, 지출에만 집중. 정재/편재 십성과 용신 오행 중심으로 해석. 연애 내용 최소화."
    },
    "사업운": {
      sections:["◉ CAREER SIGNAL","◉ NEAR OPPORTUNITY","◉ TIMING DETECTED","◉ PATTERN WARNING","◉ CONNECTION FIELD","◉ H2 TRAJECTORY","◉ NEXT SIGNAL"],
      focus:"커리어, 직장, 사업, 인맥에만 집중. 정관/편관과 식신/상관 중심으로 해석."
    },
    "건강운": {
      sections:["◉ BODY SIGNAL","◉ CURRENT CONDITION","◉ WEAK POINT DETECTED","◉ DRAIN PATTERN","◉ RECOVERY WINDOW","◉ H2 HEALTH SHIFT","◉ NEXT SIGNAL"],
      focus:"건강, 체력, 스트레스, 회복력에만 집중. 오행 과부족과 대운으로 건강 해석."
    },
    "종합": {
      sections:["✦ CURRENT ENERGY","✦ MAY → JUNE","✦ YOUR PATTERN","✦ YOUR RED FLAG","✦ JULY → SEPTEMBER","✦ WHAT YOU ATTRACT","✦ NEXT YEAR PREVIEW"],
      focus:"전반적인 삶의 흐름. 연애/재물/커리어 균형있게."
    }
  };

  const catKey = fortuneCat || "종합";
  const catCfg = lang==="Korean" ? (CAT_KO[catKey]||CAT_KO["종합"]) : null;
  const sections = catCfg ? catCfg.sections : lk.paidSections;
  const catFocus = catCfg ? catCfg.focus : "";
  const ORACLE_LINES = [
    "이번엔 네가 먼저 거리 두게 될 가능성 있음.",
    "계속 아닌 걸 알면서 붙잡는 흐름도 보임.",
    "이번 흐름은 생각보다 늦게 끝남.",
    "지금 가장 끌리는 사람이 가장 위험한 패턴일 수 있음.",
    "말하지 않은 것들이 조용히 쌓이는 중.",
    "이번엔 먼저 연락하지 않게 될 가능성 있음.",
    "오래된 감정이 다시 올라오는 타이밍.",
    "이상하게 예전 기준이 안 통하기 시작함.",
    "이번 여름은 생각보다 오래 남을 수 있음.",
    "관계 하나가 조용히 흔들리는 흐름.",
    "직감이 맞고 있는데 무시하는 중일 수 있음.",
    "이번엔 참지 않게 될 가능성이 큼.",
    "아직 끝나지 않은 흐름 하나가 감지됨.",
    "이번 선택은 생각보다 오래 남음.",
    "지금 거리를 두는 게 맞는 시기일 수 있음.",
    "연락을 기다리고 있는 흐름도 보임.",
    "이번엔 먼저 끊게 될 가능성 있음.",
    "감정보다 직감이 먼저 감지하고 있는 상태.",
  ];
  // 사주 데이터 기반 시드로 매번 다른 오라클 라인 선택
  const oracleSeed = (saju.elements?.reduce((a,b)=>a+b,0)||0) + (fortuneCat?.length||0);
  const oracle1 = ORACLE_LINES[oracleSeed % ORACLE_LINES.length];
  const oracle2 = ORACLE_LINES[(oracleSeed + 7) % ORACLE_LINES.length];

  const sectionList = sections.map((s,i)=>`${i+1}. ${s}`).join("\n");

  const prompt = `You are a cold AI Oracle. Ultra-short format only. Every sentence must be worth capturing on mobile.

=== SAJU DATA ===
년주: ${saju.pillars.year} | 월주: ${saju.pillars.month} | 일주: ${saju.pillars.day} | 시주: ${saju.pillars.hour}
일간: ${saju.dayMaster} | ${saju.strength?.label||""} (${saju.strength?.score||0}점)
오행[木火土金水]: ${JSON.stringify(saju.elements)}
강한: ${saju.strong?.join(", ")||"없음"} | 약한: ${saju.weak?.join(", ")||"없음"}
용신: ${saju.yongsin?.yongsin||"미상"} | 기신: ${saju.yongsin?.gishin||"미상"}
십성: ${(saju.tenGods||[]).map(t=>t.pillar+"="+t.tenGod).join(", ")||"미상"}
형충: ${(saju.interactions||[]).map(i=>i.desc).join(", ")||"없음"}
현재 대운: ${saju.daeun?.current?.pillar||"미상"} (${saju.daeun?.current?.age||""})
성향: ${(saju.personalityHints||[]).join(", ")||"미상"}

=== 서양 점성술 ===
태양: ${astrologySummary?.sun||"미상"} | 달: ${astrologySummary?.moon||"미상"}
금성: ${astrologySummary?.venus||"미상"} | 화성: ${astrologySummary?.mars||"미상"}
상승궁: ${astrologySummary?.ascendant||"미상"}

=== 타로 ===
${tarot?.title||"없음"}: ${tarot?.message||"없음"}

=== 카테고리: ${catKey} ===
${catFocus}
${question ? "질문: "+question : ""}

=== 출력 규칙 ===
${lk.paidStyle}

반드시 아래 순서대로만 출력:
${sectionList}

[ORACLE SIGNALS — 아래 문장을 섹션 중간에 단독 줄로 자연스럽게 삽입]
"${oracle1}"
"${oracle2}"
문맥에 맞게 변형 가능.

OUTPUT FORMAT — valid JSON only, no markdown:
{
  "headline": "캡처하고 싶은 핵심 한 줄",
  "shortLines": ["강한 훅 문장 1", "강한 훅 문장 2", "강한 훅 문장 3"],
  "shareLine": "SNS에 올리고 싶은 한 줄",
  "cliffhanger": "다음 흐름 암시 (재방문 유도)",
  "sections": [
    ${sections.map((s,i)=>'{"title":"'+s+'","body":"...2~4 lines, ultra short, cold oracle tone, empty lines between sentences, hook lines stand alone"}').join(",
    ")}
  ]
}

CRITICAL RULES:
- Each section body: MAX 4 lines total
- Every important sentence: its own line
- Empty line between each thought
- NO long explanations
- NO generic advice  
- NO fortune-cookie comfort
- Make reader think "소름인데?"
- Ground in actual saju data
- Add cliffhanger at end`.trim();

  const resp=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"gpt-4o-mini", temperature:0.72, max_tokens:1200,
      messages:[
        {role:"system", content:"You are a cold AI Oracle. Output: signal logs, not essays. Max 3 sentences per section. Fragmented rhythm is correct. Disconnected sentences are correct. Slightly unsettling is correct. Make reader feel seen without explaining why. Every line must be worth screenshotting. Never comfort. Never explain. Never connect sentences smoothly."},
        {role:"user", content:prompt}
      ]
    })
  });
  const data=await resp.json();
  if(!resp.ok) throw new Error(data?.error?.message||"OpenAI call failed");
  const raw = data.choices?.[0]?.message?.content||"";

  // JSON 구조 파싱 시도, 실패시 plain text fallback
  try {
    const cleaned = raw.replace(/```json|```/g,"").trim();
    if(cleaned.startsWith("{")) {
      return JSON.parse(cleaned);
    }
  } catch(e) {}

  // Plain text → legacy format
  return { _plainText: raw };
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
    Korean:  ["◉ FIELD DETECTED","◉ SYNC POINTS","◉ EMOTIONAL STATIC","◉ ATTRACTION SIGNAL","◉ FRICTION PATTERN","◉ THIS CONNECTION OFFERS","◉ COMBINED SIGNAL"],
    English: ["✦ YOUR ENERGY TOGETHER","✦ WHERE YOU CLICK","✦ WATCH OUT FOR","✦ WHY YOU'RE DRAWN","✦ WHERE TENSION BUILDS","✦ WHAT THIS BOND OFFERS","✦ STRONGER TOGETHER"],
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
      model: "gpt-4o-mini", temperature: 0.65, max_tokens: 1000,
      messages: [
        { role: "system", content: "You are a cold AI Oracle analyzing two electromagnetic fields. You detect sync, friction, and attraction patterns from symbolic data. Do not comfort. Output feels like a classified compatibility report." },
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

  // Rate limit check
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    const lang429 = req.body?.lang || "Korean";
    const msg429 = {
      Korean: "오늘 감지 가능한 흐름은 모두 소진됨.\n다음 신호는 내일 다시 열림.",
      English: "All signals detected for today.\nNext reading opens tomorrow.",
      Japanese: "本日の感知可能な流れはすべて消尽されました。\n次のシグナルは明日再び開きます。",
      Chinese: "今日可感知的流势已全部消耗。\n下一个信号明日重新开启。",
      Spanish: "Todas las señales detectables de hoy han sido agotadas.\nLa próxima señal se abre mañana."
    };
    return res.status(429).json({ error: msg429[lang429] || msg429.Korean });
  }

  try{
    const payload=req.body||{};
    const lang = SUPPORTED_LANGS.includes(payload.lang) ? payload.lang : "Korean";
    // ── Idol Match mode ──
    if (payload.mode === 'idol') {
      if (!payload.year||!payload.month||!payload.day) throw new Error("Missing birth date");
      const saju = buildSajuFull({ year:payload.year, month:payload.month, day:payload.day, hour:payload.hour, gender:payload.gender });
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

      const langStyles = {
        Korean: { lang:"한국어", style:`TikTok/인스타 세대가 저장하고 싶어하는 스타일로 작성. 짧고 리듬감 있는 문장. 공감 포인트 중심.` },
        English: { lang:"English", style:`Write in aesthetic TikTok/astrology style. Short punchy sentences. Shareable vibes.` },
        Japanese: { lang:"日本語", style:`TikTokやインスタ世代が保存したくなるスタイルで書く。短くリズム感のある文章。` },
        Chinese: { lang:"中文", style:`以TikTok/Instagram风格写作，简洁有节奏感，引发共鸣。` },
        Spanish: { lang:"Español", style:`Escribe en estilo TikTok/astrología estético. Frases cortas y con ritmo.` }
      };
      const ls = langStyles[lang] || langStyles.English;

      // 팬덤 데이터
      const FANDOM_DATA = {
        "BTS": { fandom:"ARMY", color:"#7B5EA7", symbol:"💜", gradient:["#3d1a6e","#1a0a35"] },
        "BLACKPINK": { fandom:"BLINK", color:"#FF1493", symbol:"🖤", gradient:["#1a0010","#3d0020"] },
        "aespa": { fandom:"MY", color:"#00FFFF", symbol:"⚡", gradient:["#001a2e","#002040"] },
        "NewJeans": { fandom:"Bunnies", color:"#87CEEB", symbol:"🐰", gradient:["#0a1520","#101a28"] },
        "IVE": { fandom:"DIVE", color:"#D4AF37", symbol:"✦", gradient:["#1a1400","#251c00"] },
        "LE SSERAFIM": { fandom:"FEARNOT", color:"#FF6B35", symbol:"🔥", gradient:["#1a0800","#250f00"] },
        "TWICE": { fandom:"ONCE", color:"#FF69B4", symbol:"🍭", gradient:["#1a0010","#200015"] },
        "ITZY": { fandom:"MIDZY", color:"#00FF88", symbol:"⚡", gradient:["#001a0e","#002015"] },
        "Red Velvet": { fandom:"ReVeluv", color:"#FF4444", symbol:"🌹", gradient:["#1a0000","#250000"] },
        "MAMAMOO": { fandom:"MooMoo", color:"#FFD700", symbol:"🌙", gradient:["#1a1400","#201900"] },
        "EXO": { fandom:"EXO-L", color:"#5B7FD4", symbol:"⭕", gradient:["#0a0f1a","#101520"] },
        "NCT": { fandom:"NCTzen", color:"#00FF9F", symbol:"🌐", gradient:["#001a0e","#002010"] },
        "Stray Kids": { fandom:"STAY", color:"#FFFF00", symbol:"⭐", gradient:["#1a1a00","#252500"] },
        "ATEEZ": { fandom:"ATINY", color:"#FF8C00", symbol:"🏴‍☠️", gradient:["#1a0800","#201000"] },
        "TXT": { fandom:"MOA", color:"#9B59B6", symbol:"🌌", gradient:["#0f001a","#150025"] },
        "ENHYPEN": { fandom:"ENGENE", color:"#E74C3C", symbol:"🔗", gradient:["#1a0000","#200500"] },
        "SEVENTEEN": { fandom:"CARAT", color:"#00BFFF", symbol:"💎", gradient:["#001520","#001a2a"] },
        "SHINee": { fandom:"SHINee World", color:"#4169E1", symbol:"✨", gradient:["#000d1a","#001020"] },
        "ZEROBASEONE": { fandom:"ZERONI", color:"#00FFAA", symbol:"0️⃣", gradient:["#001a10","#002015"] },
        "RIIZE": { fandom:"BRIIZE", color:"#FF6EC7", symbol:"🌸", gradient:["#1a0010","#200015"] },
        "SNSD": { fandom:"SONE", color:"#FFB6C1", symbol:"🌷", gradient:["#1a0010","#200015"] },
        "2NE1": { fandom:"Blackjack", color:"#000000", symbol:"♠", gradient:["#0a0a0a","#151515"] },
        "default": { fandom:"Fan", color:"#a855f7", symbol:"✦", gradient:["#0a0014","#160028"] }
      };

      function getFandomData(idolName) {
        for(const [group, data] of Object.entries(FANDOM_DATA)) {
          if(idolName.includes(group)) return { group, ...data };
        }
        return { group:"K-pop", ...FANDOM_DATA.default };
      }

      // 실제 K-pop 아이돌 목록 (사주 분석에 활용)
      const IDOL_POOL = [
        // BTS
        {name:"RM (BTS)", vibe:"지적·철학적 카리스마형"},
        {name:"Jin (BTS)", vibe:"밝고 유쾌한 안정형"},
        {name:"Suga (BTS)", vibe:"차갑고 예술적인 천재형"},
        {name:"J-Hope (BTS)", vibe:"밝고 에너지 넘치는 긍정형"},
        {name:"Jimin (BTS)", vibe:"감성적이고 섬세한 퍼포머형"},
        {name:"V (BTS)", vibe:"독특하고 몽환적인 예술가형"},
        {name:"Jungkook (BTS)", vibe:"다재다능하고 성실한 완벽주의형"},
        // BLACKPINK
        {name:"Jisoo (BLACKPINK)", vibe:"우아하고 따뜻한 클래식 뷰티형"},
        {name:"Jennie (BLACKPINK)", vibe:"카리스마 넘치는 독립적 퀸형"},
        {name:"Rosé (BLACKPINK)", vibe:"감성적이고 자유로운 아티스트형"},
        {name:"Lisa (BLACKPINK)", vibe:"에너제틱한 글로벌 퍼포머형"},
        // aespa
        {name:"Karina (aespa)", vibe:"완벽주의적 카리스마 리더형"},
        {name:"Winter (aespa)", vibe:"차갑고 세련된 미스터리형"},
        {name:"Ningning (aespa)", vibe:"밝고 재능있는 보컬형"},
        {name:"Giselle (aespa)", vibe:"쿨하고 개성 강한 힙한 형"},
        // NewJeans
        {name:"Minji (NewJeans)", vibe:"자연스럽고 청순한 리더형"},
        {name:"Hanni (NewJeans)", vibe:"귀엽고 적극적인 에너지형"},
        {name:"Danielle (NewJeans)", vibe:"청순하고 감성적인 비주얼형"},
        {name:"Haerin (NewJeans)", vibe:"차갑고 고양이 같은 미스터리형"},
        {name:"Hyein (NewJeans)", vibe:"신비롭고 쿨한 막내형"},
        // IVE
        {name:"Yujin (IVE)", vibe:"밝고 리더십 강한 에너지형"},
        {name:"Gaeul (IVE)", vibe:"차분하고 세련된 도시적 감성형"},
        {name:"Rei (IVE)", vibe:"귀엽고 개성있는 큐트형"},
        {name:"Wonyoung (IVE)", vibe:"완벽한 비주얼의 공주형"},
        {name:"Liz (IVE)", vibe:"밝고 친근한 보컬형"},
        {name:"Leeseo (IVE)", vibe:"신선하고 당찬 막내형"},
        // LE SSERAFIM
        {name:"Sakura (LE SSERAFIM)", vibe:"베테랑 경험의 우아한 형"},
        {name:"Chaewon (LE SSERAFIM)", vibe:"강단있는 리더형"},
        {name:"Yunjin (LE SSERAFIM)", vibe:"감성적이고 음악적인 아티스트형"},
        {name:"Kazuha (LE SSERAFIM)", vibe:"고귀하고 예술적인 발레리나형"},
        {name:"Eunchae (LE SSERAFIM)", vibe:"밝고 에너지 넘치는 막내형"},
        // TWICE
        {name:"Nayeon (TWICE)", vibe:"밝고 사랑스러운 토끼형"},
        {name:"Jeongyeon (TWICE)", vibe:"쿨하고 시원한 보이시형"},
        {name:"Momo (TWICE)", vibe:"춤의 신 에너지 퍼포머형"},
        {name:"Sana (TWICE)", vibe:"사랑스럽고 매력적인 뿅뿅형"},
        {name:"Jihyo (TWICE)", vibe:"강인하고 믿음직한 리더형"},
        {name:"Mina (TWICE)", vibe:"우아하고 조용한 백조형"},
        {name:"Dahyun (TWICE)", vibe:"개성있고 유머러스한 밝은 형"},
        {name:"Chaeyoung (TWICE)", vibe:"독립적이고 예술적인 아티스트형"},
        {name:"Tzuyu (TWICE)", vibe:"완벽한 비주얼의 청순한 형"},
        // ITZY
        {name:"Yeji (ITZY)", vibe:"카리스마 있는 고양이 눈매 형"},
        {name:"Lia (ITZY)", vibe:"우아하고 지적인 형"},
        {name:"Ryujin (ITZY)", vibe:"쿨하고 반항적인 스트리트형"},
        {name:"Chaeryeong (ITZY)", vibe:"섬세하고 재능있는 댄서형"},
        {name:"Yuna (ITZY)", vibe:"당당하고 비주얼 강렬한 형"},
        // Red Velvet
        {name:"Irene (Red Velvet)", vibe:"완벽한 비주얼의 차가운 여왕형"},
        {name:"Seulgi (Red Velvet)", vibe:"다재다능한 따뜻한 퍼포머형"},
        {name:"Wendy (Red Velvet)", vibe:"따뜻하고 보컬 강한 감성형"},
        {name:"Joy (Red Velvet)", vibe:"밝고 활발한 긍정 에너지형"},
        {name:"Yeri (Red Velvet)", vibe:"개성있고 당찬 막내형"},
        // MAMAMOO
        {name:"Solar (MAMAMOO)", vibe:"밝고 재능넘치는 엔터테이너형"},
        {name:"Moonbyul (MAMAMOO)", vibe:"쿨한 보이시 카리스마형"},
        {name:"Wheein (MAMAMOO)", vibe:"예술적이고 감성적인 아티스트형"},
        {name:"Hwasa (MAMAMOO)", vibe:"강렬하고 자유로운 섹시 카리스마형"},
        // EXO
        {name:"Baekhyun (EXO)", vibe:"밝고 재능넘치는 만능 엔터테이너형"},
        {name:"Chanyeol (EXO)", vibe:"활발하고 창의적인 다재다능형"},
        {name:"D.O. (EXO)", vibe:"조용하고 깊은 감성의 진지한 형"},
        {name:"Kai (EXO)", vibe:"섹시하고 강렬한 퍼포먼스형"},
        {name:"Sehun (EXO)", vibe:"차갑고 세련된 도시적 형"},
        {name:"Suho (EXO)", vibe:"리더십 있고 신뢰감 주는 형"},
        {name:"Chen (EXO)", vibe:"감성적이고 보컬 깊은 형"},
        {name:"Xiumin (EXO)", vibe:"귀엽고 차분한 반전 매력형"},
        // NCT
        {name:"Taeyong (NCT)", vibe:"카리스마 넘치는 퍼포먼스 리더형"},
        {name:"Taeil (NCT)", vibe:"조용하고 깊은 보컬형"},
        {name:"Johnny (NCT)", vibe:"유쾌하고 국제적인 형"},
        {name:"Yuta (NCT)", vibe:"섬세하고 강렬한 일본 감성형"},
        {name:"Doyoung (NCT)", vibe:"지적이고 감성적인 보컬형"},
        {name:"Jaehyun (NCT)", vibe:"우아하고 카리스마 있는 비주얼형"},
        {name:"Mark (NCT)", vibe:"성실하고 다재다능한 올라운더형"},
        {name:"Haechan (NCT)", vibe:"밝고 에너지 넘치는 선샤인형"},
        {name:"Jaemin (NCT)", vibe:"사랑스럽고 카리스마 있는 반전형"},
        {name:"Renjun (NCT)", vibe:"섬세하고 예술적인 감성형"},
        {name:"Jeno (NCT)", vibe:"조용하고 강렬한 눈매형"},
        {name:"Chenle (NCT)", vibe:"밝고 자유로운 글로벌형"},
        // Stray Kids
        {name:"Bang Chan (Stray Kids)", vibe:"강인하고 따뜻한 프로듀서 리더형"},
        {name:"Lee Know (Stray Kids)", vibe:"차갑고 고양이 같은 댄서형"},
        {name:"Changbin (Stray Kids)", vibe:"강렬하고 에너지 폭발하는 형"},
        {name:"Hyunjin (Stray Kids)", vibe:"예술적이고 몽환적인 비주얼형"},
        {name:"Han (Stray Kids)", vibe:"감성적이고 창의적인 작곡가형"},
        {name:"Felix (Stray Kids)", vibe:"밝고 글로벌한 선샤인형"},
        {name:"Seungmin (Stray Kids)", vibe:"성실하고 진지한 보컬형"},
        {name:"I.N (Stray Kids)", vibe:"귀엽고 당찬 막내형"},
        // ATEEZ
        {name:"Hongjoong (ATEEZ)", vibe:"카리스마 있는 창의적 리더형"},
        {name:"Seonghwa (ATEEZ)", vibe:"우아하고 완벽한 비주얼형"},
        {name:"Yunho (ATEEZ)", vibe:"밝고 큰 에너지의 긍정형"},
        {name:"Yeosang (ATEEZ)", vibe:"독특하고 신비로운 예술가형"},
        {name:"San (ATEEZ)", vibe:"강렬하고 감성적인 퍼포머형"},
        {name:"Mingi (ATEEZ)", vibe:"에너지 넘치고 유쾌한 형"},
        {name:"Wooyoung (ATEEZ)", vibe:"사랑스럽고 끼 넘치는 형"},
        {name:"Jongho (ATEEZ)", vibe:"강한 보컬과 진지한 형"},
        // TXT
        {name:"Yeonjun (TXT)", vibe:"다재다능한 퍼포먼스 에이스형"},
        {name:"Soobin (TXT)", vibe:"조용하고 감성적인 리더형"},
        {name:"Beomgyu (TXT)", vibe:"밝고 유머러스한 에너지형"},
        {name:"Taehyun (TXT)", vibe:"강인하고 보컬 강렬한 형"},
        {name:"Huening Kai (TXT)", vibe:"독특하고 창의적인 몽상가형"},
        // ENHYPEN
        {name:"Jungwon (ENHYPEN)", vibe:"차분하고 신뢰감 주는 리더형"},
        {name:"Heeseung (ENHYPEN)", vibe:"다재다능한 만능 에이스형"},
        {name:"Jay (ENHYPEN)", vibe:"글로벌하고 유쾌한 형"},
        {name:"Jake (ENHYPEN)", vibe:"밝고 따뜻한 글로벌 형"},
        {name:"Sunghoon (ENHYPEN)", vibe:"차갑고 완벽한 피겨 왕자형"},
        {name:"Sunoo (ENHYPEN)", vibe:"밝고 사랑스러운 햇살형"},
        {name:"Ni-ki (ENHYPEN)", vibe:"차갑고 강렬한 댄서형"},
        // SEVENTEEN
        {name:"S.Coups (SEVENTEEN)", vibe:"강한 리더십과 책임감형"},
        {name:"Jeonghan (SEVENTEEN)", vibe:"섬세하고 전략적인 천사형"},
        {name:"Joshua (SEVENTEEN)", vibe:"젠틀하고 따뜻한 신사형"},
        {name:"Jun (SEVENTEEN)", vibe:"우아하고 섹시한 비주얼형"},
        {name:"Hoshi (SEVENTEEN)", vibe:"에너지 넘치는 퍼포먼스 장인형"},
        {name:"Wonwoo (SEVENTEEN)", vibe:"조용하고 깊이 있는 지적형"},
        {name:"Woozi (SEVENTEEN)", vibe:"작지만 강한 천재 작곡가형"},
        {name:"DK (SEVENTEEN)", vibe:"밝고 시원한 보컬형"},
        {name:"Mingyu (SEVENTEEN)", vibe:"키 크고 털털한 비주얼형"},
        {name:"The8 (SEVENTEEN)", vibe:"독창적이고 예술적인 형"},
        {name:"Seungkwan (SEVENTEEN)", vibe:"유머러스하고 재능있는 엔터테이너형"},
        {name:"Vernon (SEVENTEEN)", vibe:"쿨하고 개성있는 힙한 형"},
        {name:"Dino (SEVENTEEN)", vibe:"성실하고 에너지 넘치는 막내형"},
        // SHINee
        {name:"Onew (SHINee)", vibe:"따뜻하고 신뢰감 주는 리더형"},
        {name:"Key (SHINee)", vibe:"강렬하고 패셔너블한 개성형"},
        {name:"Minho (SHINee)", vibe:"스포티하고 경쟁적인 형"},
        {name:"Taemin (SHINee)", vibe:"섬세하고 몽환적인 퍼포먼스 레전드형"},
        // INFINITE
        {name:"Sunggyu (INFINITE)", vibe:"진지하고 노력하는 리더형"},
        {name:"Woohyun (INFINITE)", vibe:"감성적이고 보컬 강한 형"},
        {name:"Sungjong (INFINITE)", vibe:"섬세하고 아름다운 형"},
        // 2PM
        {name:"Junho (2PM)", vibe:"완벽하고 강렬한 만능 엔터테이너형"},
        {name:"Taecyeon (2PM)", vibe:"강인하고 유머러스한 형"},
        {name:"Wooyoung (2PM)", vibe:"귀엽고 끼 넘치는 형"},
        // 솔로이스트
        {name:"IU (솔로)", vibe:"지적이고 감성 깊은 국민 가수형"},
        {name:"Taeyeon (솔로)", vibe:"강인하고 보컬 완벽한 형"},
        {name:"청하 (솔로)", vibe:"강렬하고 독립적인 퍼포머형"},
        {name:"선미 (솔로)", vibe:"섹시하고 신비로운 퀸형"},
        {name:"Hyoyeon (솔로)", vibe:"강렬하고 독보적인 댄서형"},
        {name:"강다니엘 (솔로)", vibe:"친근하고 에너지 넘치는 형"},
        {name:"옹성우 (솔로)", vibe:"노력하는 감성 보컬형"},
        // SNSD
        {name:"Taeyeon (SNSD)", vibe:"완벽한 보컬의 강인한 형"},
        {name:"Sunny (SNSD)", vibe:"밝고 긍정적인 에너지형"},
        {name:"Hyoyeon (SNSD)", vibe:"독보적인 댄서 카리스마형"},
        {name:"Yuri (SNSD)", vibe:"우아하고 차가운 비주얼형"},
        {name:"Sooyoung (SNSD)", vibe:"활발하고 다재다능한 형"},
        {name:"Tiffany (SNSD)", vibe:"밝고 따뜻한 글로벌 형"},
        {name:"Seohyun (SNSD)", vibe:"지적이고 세련된 형"},
        {name:"Yoona (SNSD)", vibe:"청순하고 친근한 국민 미녀형"},
        // KARA, 2NE1 etc
        {name:"CL (2NE1)", vibe:"강렬하고 독보적인 힙합 퀸형"},
        {name:"박봄 (2NE1)", vibe:"독특하고 강한 보컬형"},
        {name:"산다라박 (2NE1)", vibe:"사랑스럽고 개성있는 형"},
        {name:"공민지 (2NE1)", vibe:"쿨하고 강한 퍼포머형"},
        // ZEROBASEONE
        {name:"김지웅 (ZEROBASEONE)", vibe:"섬세하고 감성적인 비주얼형"},
        {name:"장하오 (ZEROBASEONE)", vibe:"카리스마 있는 글로벌 형"},
        {name:"성한빈 (ZEROBASEONE)", vibe:"밝고 에너지 넘치는 형"},
        {name:"최석Matthew (ZEROBASEONE)", vibe:"글로벌하고 따뜻한 형"},
        {name:"김태래 (ZEROBASEONE)", vibe:"차갑고 강렬한 댄서형"},
        // RIIZE
        {name:"Wonbin (RIIZE)", vibe:"차갑고 완벽한 비주얼형"},
        {name:"Seunghan (RIIZE)", vibe:"따뜻하고 감성적인 형"},
        {name:"Eunseok (RIIZE)", vibe:"밝고 에너지 넘치는 형"},
        {name:"Sohee (RIIZE)", vibe:"귀엽고 당찬 형"},
        {name:"Wonhyuk (RIIZE)", vibe:"조용하고 깊은 형"},
        {name:"Shotaro (RIIZE)", vibe:"글로벌하고 자유로운 형"},
        {name:"Anton (RIIZE)", vibe:"독특하고 개성있는 형"},
      ];

      const idolPrompt = `You are a Saju + astrology expert who reads idol compatibility types.
${ls.style}

SAJU DATA:
년주: ${saju.pillars.year} | 월주: ${saju.pillars.month} | 일주: ${saju.pillars.day} | 시주: ${saju.pillars.hour}
일간: ${saju.dayMaster} | ${saju.strength?.label||""}
오행[木火土金水]: ${JSON.stringify(saju.elements)}
강한: ${saju.strong?.join(", ")||"없음"} | 약한: ${saju.weak?.join(", ")||"없음"}
용신: ${saju.yongsin?.yongsin||"미상"}
십성: ${(saju.tenGods||[]).map(t=>t.pillar+"="+t.tenGod).join(", ")||"미상"}
성향: ${(saju.personalityHints||[]).join(", ")||"미상"}
성별: ${payload.gender}

IDOL POOL (아래 아이돌 중에서 사주 에너지와 가장 잘 맞는 3명 선택):
${IDOL_POOL.map(i=>i.name+' ('+i.vibe+')').join(', ')}

OUTPUT in ${ls.lang}:
Respond with JSON only, no markdown:
{
  "title": "한 줄로 이 사람의 아이돌 소울 타입 (예: '차가운 카리스마형에 끌리는 감성파')",
  "highlight": "이 사람의 핵심 매력 포인트 한 문장",
  "idolMatches": [
    {"name": "아이돌 이름 (그룹명)", "reason": "이 아이돌과 에너지가 맞는 이유 한 문장", "score": 92},
    {"name": "아이돌 이름 (그룹명)", "reason": "이유 한 문장", "score": 87},
    {"name": "아이돌 이름 (그룹명)", "reason": "이유 한 문장", "score": 81}
  ],
  "detail": "✦ YOUR IDOL TYPE\n(어떤 타입의 아이돌과 에너지가 맞는지, 위에서 선택한 아이돌 언급)\n\n✦ WHY YOU ATTRACT THEM\n(사주 에너지로 보는 끌림의 이유)\n\n✦ YOUR FAN ENERGY\n(팬으로서의 성향과 덕질 스타일)\n\n✦ RED FLAG IN FANDOM\n(조심할 감정 패턴)\n\n✦ YOUR DESTINY TYPE\n(운명적으로 끌릴 아이돌 에너지 유형)"
}`.trim();

      const resp = await fetch("https://api.openai.com/v1/chat/completions",{
        method:"POST",
        headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"gpt-4o-mini", temperature:0.8, max_tokens:1200,
          messages:[
            {role:"system", content:"You are a cold AI Oracle that matches symbolic energy patterns to idol archetypes. Output valid JSON only. Tone: sharp, precise, cold. No generic flattery. Feels like a classified signal match report."},
            {role:"user", content:idolPrompt}
          ]
        })
      });
      const gptData = await resp.json();
      if (!resp.ok) throw new Error(gptData?.error?.message||"OpenAI error");
      let raw = gptData.choices?.[0]?.message?.content||"{}";
      raw = raw.replace(/```json|```/g,"").trim();
      let result;
      try { result = JSON.parse(raw); } catch { result = { title:"분석 완료", detail:raw }; }
      return res.status(200).json(result);
    }

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
      return res.status(200).json({
      free,
      paid:false,
      shareLine: SHARE_LINES[Math.floor(Math.random()*SHARE_LINES.length)],
      meta:{saju}
    });
    }

    // location 없으면 saju-only paid reading으로 fallback

    const key=cacheKey(payload);
    if(CACHE.has(key)) return res.status(200).json(CACHE.get(key));

    const saju=buildSajuFull(payload);
    let astrologySummary = { sun:null, moon:null, mercury:null, venus:null, mars:null, ascendant:null };
    if(payload.location) {
      try {
        const astrologyRaw=await fetchAstrologyData(payload);
        astrologySummary=summarizeAstrology(astrologyRaw);
      } catch(e) {
        // Astrology API 실패해도 saju-only로 계속 진행
        console.error("AstrologyAPI fallback:", e.message);
      }
    }
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
