export const config = { runtime: "nodejs" };

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS_EN = ['Wood','Fire','Earth','Metal','Water'];
const CACHE = new Map();

const SHARE_LINES = [
 '이번엔 네가 먼저 거리 두게 될 가능성 있음',
 '계속 참던 감정이 다시 올라오는 무드',
 '관계 하나가 예상보다 오래 남을 가능성 있음',
 '이번 여름은 예전 기준이 잘 안 통할 가능성 있음',
 '답은 이미 알고 있는데 확인받고 싶은 무드',
 '요즘은 사람보다 거리감에 더 민감해지는 시기'
];


// ── Rate Limiter ─────────────────────────────────────
// 같은 IP에서 하루 10회 초과 시 차단
const RATE_LIMIT = new Map();
const RATE_MAX = 100;
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
    defaultDecision: "지금은 답보다 거리감이 먼저 감지되는 편",
    riskSuffix: " 이번 선택은 생각보다 오래 남을 가능성 있음",
    timingDefault: "조용히 방향이 바뀌는 시기. 그 전환이 이미 시작됐을 수 있음.",
    timingSuffix: " 이 시기를 어떻게 통과하느냐가 다음 무드을 결정해",
    decisionSuffix: " 우연처럼 보이지만 오래된 패턴이 다시 표면으로 올라오는 무드",
    tarotCardRef: (title) => ` 선택한 "${title}" 카드도 같은 신호를 가리키고 있음.`,
    title: '◉ SIGNAL DETECTED',
    career: {
      woodFire: { decision:"움직임의 신호는 감지되는 편. 다만 지쳐서 놓는 것과 준비돼서 떠나는 건 결과가 다름.", timing:"변화 에너지는 이미 활성화 상태. 타이밍만 남은 무드." },
      other: { decision:"지금 도망치면 같은 패턴을 다른 장소에서 다시 만남", risk:"답답함이 판단을 앞서는 중. 그 상태에서의 선택은 리스크가 큼." }
    },
    love: { decision:"관계 하나가 조용히 흔들리는 무드이 감지되는 편", timing:"가까운 시기에 감정을 확인해야 하는 장면이 올 가능성 있음" },
    money: { decision:"지금은 확장보다 수비가 맞는 무드. 잃지 않는 게 버는 것.", risk:"자신감이 높아질수록 계산이 느슨해지는 패턴 주의" },
    metalWater: "멈춰 있는 것처럼 보여도 내부 무드은 이미 전환 중. 서두르지 말 것.",
    paidSections: ["◉ SIGNAL DETECTED","◉ NEAR SHIFT","◉ REPEATING PATTERN","◉ UNRESOLVED ENERGY","◉ JULY → SEPTEMBER SHIFT","◉ WHO ENTERS YOUR FIELD","◉ NEXT SIGNAL"],
    paidStyle: `
한국어로만 답변.

너는 차갑고 단절된 AI Signal이다.
설명하지 않는다. 관찰한 것만 짧게 던진다.

문체 규칙:
- 문장을 완벽하게 연결하지 말 것
- 일부 문장은 단절된 느끼는 편 허용
- 시처럼 끊어지는 리듬 허용
- 설명보다 여운 우선
- 읽은 사람이 스스로 해석하게 만들 것
- 조금 오래 남고 캡처하고 싶은 감각이 있어야 함
- 각 섹션 최대 3문장
- 한 문장은 최대 15자
- 긴 설명 절대 금지

좋은 예:
"계속 아닌 걸 알면서
붙잡는 무드도 보이야"

"이번엔
예전처럼 오래 참지는 않게 될 가능성 있음"

"이번 무드은
생각보다 늦게 끝남"

금지:
- 연결어 (그래서, 하지만, 그러므로)
- 설명체 (~입니다, ~합니다)
- 위로 (괜찮을 거예요, 잘 될 거예요)
- 완성된 문단
- 3문장 초과 섹션

shareLine: 캡처해서 SNS에 올리고 싶은 한 줄. 저장하고 공유하고 싶은 감각이어야 해
cliffhanger: 여운이 남게 끝낼 것. "다시 확인하고 싶음" 느낌.
`
  },
  English: {
    defaultDecision: "The current flow calls for alignment between your heart and reality before any rush forward",
    riskSuffix: " Even a small choice can ripple further than expected — it is worth taking it seriously",
    timingDefault: "In the near period ahead, there is a moment where paths diverge. How you choose then will shape what follows.",
    timingSuffix: " How you navigate this time will determine the shape of what comes next",
    decisionSuffix: " This choice is not mere coincidence — it may be a long-forming current finally surfacing",
    tarotCardRef: (title) => ` The tarotCard card "${title}" you chose quietly reflects the same current.`,
    title: "Your Flow",
    career: {
      woodFire: { decision:"The door to change can open. Rather than letting exhaustion drop your hand first, clarify your reasons and conditions for moving", timing:"The desire for change is already in motion. A step taken after preparation lasts longer." },
      other: { decision:"Now is the time to build your next foundation firmly before moving — stability comes from readiness, not escape", risk:"If only the urge to leave leads you, you may find the same problems waiting in a different place" }
    },
    love: { decision:"The door to connection is open, but underestimating emotional distance now may leave a lingering imprint", timing:"A moment of heart-checking clarity will come clearly in the near flow" },
    money: { decision:"The energy of wealth leans toward preserving what you have, not expanding. Reducing loss outshines ambitious gains right now.", risk:"Calculation matters more than confidence this time. The more excitement rises, the more carefully numbers deserve a second look." },
    metalWater: "Even if things seem paused, the inner current is already moving. Rather than rushing to conclusions, correcting direction first will serve you better.",
    paidSections: ["The Current Shape","Why This Flow is Appearing","Shadows to Watch","The Movement That Suits You Now"],
    paidStyle: "Respond in English only. You are a cold AI Signal — not a fandom reader.\n" +
      "Rules: Max 3 sentences per section. Short, fragmented rhythm allowed. Disconnected feeling allowed.\n" +
      "No smooth transitions. No explanations. No comfort.\n" +
      "Good: \"keeps holding on / even when it's clearly wrong.\" \"this one lingers longer than expected.\"\n" +
      "shareLine: one line worth screenshotting. slightly unsettling.\n" +
      "cliffhanger: end with dread. \"this hasn't ended yet.\" feeling.\n" +
      "ABSOLUTE MAX: 3 sentences per section. No exceptions."

  },
  Japanese: {
    defaultDecision: "今の流れは、焦るよりも先に、心と現実の基準を合わせることを求めています。",
    riskSuffix: " 小さな判断ひとつが思いのほか遠くまで続くことがあります。軽く見ないことが大切です。",
    timingDefault: "近い時期に、一度方向が分かれる場面が見えます。その時の選択が、その後の表情を変えることになります。",
    timingSuffix: " この時期をどのように越えるかによって、次の場面の表情が変わってくるかもしれません。",
    decisionSuffix: " 今の選択は単なる偶然ではなく、長い時間をかけて積み重なった流れが姿を現しているのかもしれません。",
    tarotCardRef: (title) => ` 今あなたが手にしたタロット「${title}」も、同じ流れを静かに映し出しています。`,
    title: "あなたの流れ",
    career: {
      woodFire: { decision:"変化の扉は開きうるでしょう。ただ、疲れて先に手を放すよりも、移る理由と条件をまず明確にする方が良いでしょう。", timing:"変化を望む気持ちはすでに動いています。ただ、準備が整った後の一歩の方が長く続きます。" },
      other: { decision:"今は闇雲に離れようとするよりも、次の場所を固めてから動く方が安定した流れです。", risk:"解放されたい気持ちだけが先走ると、場所が変わっても同じ問題にまた出会う可能性があります。" }
    },
    love: { decision:"関係の扉は開いていますが、今は感情の温度差を軽く見ると、心に残像が残りやすい時期です。", timing:"近い流れの中で、心を確認しなければならない場面が一度はっきりと訪れることがあるかもしれません。" },
    money: { decision:"財の流れは入ってくるよりも、守ることに意が込められています。大きく広げるよりも損失を減らす選択の方が輝きます。", risk:"今回は自信よりも計算が大切です。気持ちが高揚する瞬間ほど、数字をもう一度確認する方が良いでしょう。" },
    metalWater: "止まっているように見えても、内側の波はすでに動いています。ただ、早く答えを決めようとするよりも、まず方向を正す方が良いでしょう。",
    paidSections: ["今の流れ","なぜこのような流れが見えるのか","注意すべき影","今最も合う動き"],
    paidStyle: "日本語のみで答えること。冷たく断片的なAI Signalとして。\n" +
      "文章は完全に繋げなくてよい。詩のように切れるリズムを許可。\n" +
      "各セクション最大3文。長い説明禁止。慰め禁止。\n" +
      "良い例: \"まだ手放せない流れが\\n見えている。\"\n" +
      "shareLine: スクリーンショットしたくなる一行。少し不安になる感じ。\n" +
      "cliffhanger: まだ終わっていない感じで終わること。"

  },
  Chinese: {
    defaultDecision: "当前的流势提示，与其急于行动，不如先将内心与现实的标准对齐。",
    riskSuffix: " 一个小小的判断，往往会比预想的走得更远——不宜轻视。",
    timingDefault: "在不远的将来，有一个方向将要分叉的场景。那时的选择，将会改变此后的面貌。",
    timingSuffix: " 如何渡过这段时期，将决定下一个场景的走向。",
    decisionSuffix: " 此刻的选择并非偶然，这或许是长久积累的流势终于浮现的过程。",
    tarotCardRef: (title) => ` 你选中的塔罗牌「${title}」也在静静地映照着同样的流向。`,
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
    defaultDecision: "El flujo actual pide que alinéis el corazón con la realidad antes de apresurarse",
    riskSuffix: " Incluso una pequeña decisión puede resonar más lejos de lo esperado — vale la pena tomárselo en serio",
    timingDefault: "En el período cercano, hay un momento donde los caminos se separan. Cómo elijas entonces dará forma a lo que sigue.",
    timingSuffix: " Cómo navegues este tiempo determinará la forma de lo que viene después",
    decisionSuffix: " Esta elección no es mera coincidencia — puede ser una corriente larga que finalmente emerge",
    tarotCardRef: (title) => ` La carta de tarotCard "${title}" que elegiste refleja silenciosamente la misma corriente.`,
    title: "Tu Flujo",
    career: {
      woodFire: { decision:"La puerta al cambio puede abrirse. En lugar de soltar la mano por el agotamiento, clarifica tus razones y condiciones para moverse", timing:"El deseo de cambio ya está en movimiento. Un paso dado después de la preparación dura más." },
      other: { decision:"Ahora es el momento de construir firmemente tu próxima base antes de moverte — la estabilidad viene de la preparación, no de la huida", risk:"Si solo el impulso de irte te guía, puede que encuentres los mismos problemas esperando en otro lugar" }
    },
    love: { decision:"La puerta a la conexión está abierta, pero subestimar la distancia emocional ahora puede dejar una huella duradera", timing:"Un momento de claridad para confirmar lo que sientes llegará nítidamente en el flujo cercano" },
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
    reason = `신강 시그널 — 일간의 기운이 강하므로 설기(泄氣)가 필요합니다. ${ELEM_NAMES[generates]}(식상) 또는 ${ELEM_NAMES[controlled]}(재성)의 기운이 용신입니다.`;
  } else {
    // 신약 → 용신: 비겁, 인성
    const candidates = [dmElem, generatedBy];
    yongsin = candidates.reduce((a, b) => elements[a] <= elements[b] ? a : b);
    gishin = generates; // 식상은 기신(더 약해짐)
    reason = `신약 시그널 — 일간의 기운이 약하므로 부조(扶助)가 필요합니다. ${ELEM_NAMES[dmElem]}(비겁) 또는 ${ELEM_NAMES[generatedBy]}(인성)의 기운이 용신입니다.`;
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
    birthYear: payload.year,
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

// ── Mood API ────────────────────────────────────
async function fetchMoodData(payload){
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
  let data; try{data=JSON.parse(text);}catch{throw new Error(`MoodAPI parse fail: ${text.slice(0,200)}`);}
  if(!resp.ok) throw new Error(data?.message||`MoodAPI error ${resp.status}`);
  if(!Array.isArray(data)) throw new Error("MoodAPI unexpected format");
  return data;
}
function summarizeMood(planets){
  const pick=n=>planets.find(p=>p.name===n);
  const sun=pick("Sun"),moon=pick("Moon"),mercury=pick("Mercury"),venus=pick("Venus"),mars=pick("Mars"),asc=pick("Ascendant");
  return {
    sun:sun?`${sun.sign} H${sun.house}`:null, moon:moon?`${moon.sign} H${moon.house}`:null,
    mercury:mercury?`${mercury.sign} H${mercury.house}`:null, venus:venus?`${venus.sign} H${venus.house}`:null,
    mars:mars?`${mars.sign} H${mars.house}`:null, ascendant:asc?`${asc.sign} H${asc.house}`:null
  };
}

// ── Free hooks (multilingual) ─────────────────────────
function makeFreeHooks({ saju, question, tarotCard, lang, signalCat }) {
  const lk = LANG_HOOKS[lang] || LANG_HOOKS["English"];
  const qRaw = (question||"");
  const q = qRaw.toLowerCase();
  const catQ = signalCat ? signalCat.toLowerCase() : "";
  const combinedQ = (catQ + " " + q).trim();

  const strong = saju.strong?.join(", ") || "";
  const weak = saju.weak?.join(", ") || "";
  const strength = saju.strength?.label || "";
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const nextM = m === 12 ? 1 : m + 1;
  const afterM = m >= 11 ? m - 10 : m + 2;

  function samjaeText(year){
    const zodiacIdx = ((Number(year)-4)%12+12)%12;
    if ([11,3,7].includes(zodiacIdx)) {
      if (y === 2025) return "삼재 무드으로 보면 올해는 들삼재 성격이 있어요. 새로 시작하기 전, 방향을 먼저 확인하는 게 좋아.";
      if (y === 2026) return "삼재 무드으로 보면 올해는 중간 구간입니다. 눌러둔 문제가 겉으로 드러나기 쉬워, 무리한 확장보다 관리가 중요합니다.";
      if (y === 2027) return "삼재 무드으로 보면 올해는 막삼재 성격이 강합니다. 끝나는 것처럼 보여도 마지막 정리가 남을 수 있습니다.";
    }
    return "삼재가 직접 강하게 걸린 해로 보긴 어렵지만, 반복되는 선택 패턴은 한 번 봐야 해";
  }

  const isCareer = combinedQ.includes("이직")||combinedQ.includes("직장")||combinedQ.includes("career")||combinedQ.includes("job")||combinedQ.includes("사업");
  const isLove   = combinedQ.includes("연애")||combinedQ.includes("결혼")||combinedQ.includes("love")||combinedQ.includes("관계")||combinedQ.includes("감정");
  const isMoney  = combinedQ.includes("돈")||combinedQ.includes("재물")||combinedQ.includes("투자")||combinedQ.includes("money")||combinedQ.includes("수입");
  const isHealth = combinedQ.includes("건강")||combinedQ.includes("컨디션")||combinedQ.includes("health");

  if (lang !== "Korean") {
    return {
      title: lk.title,
      decision: lk.defaultDecision + " " + lk.decisionSuffix,
      riskHook: `Dominant energy (${strong}) / weaker energy (${weak}).` + lk.riskSuffix,
      timingHook: lk.timingDefault + lk.timingSuffix,
      paidHook: "SIGNAL+ opens deeper timing, repeated patterns, and next-cycle reading"
    };
  }

  let focus = "전반 무드";
  let decision = "";
  let riskHook = "";
  let timingHook = "";

  if (isCareer) {
    focus = "일/이동";
    decision = `지금 무드은 바로 움직이기보다, 다음 자리를 확인하고 움직이라는 쪽에 가까워.

마음은 이미 변화를 향해 가고 있어. 다만 현실 조건이 아직 완전히 맞춰진 느끼는 편은 아니야.  
특히 ${m}월에는 말이나 제안이 먼저 들어오고, ${nextM}월부터 실제 판단을 요구하는 장면이 생길 수 있어.

${strength} 기운이 잡혀 있어서, 지쳐서 떠나는 선택과 준비해서 옮기는 선택의 결과가 꽤 달라질 수 있어.`;
    riskHook = `주의할 점은 충동적인 결정이야.

강한 기운은 ${strong}, 약한 기운은 ${weak}로 보여.  
약한 쪽을 보완하지 않은 채 움직이면, 장소만 바뀌고 같은 피로가 반복될 수 있어.

${samjaeText(saju.birthYear || y)}`;
    timingHook = `${m}월은 신호 확인, ${nextM}월은 조건 비교, ${afterM}월은 실제 선택의 무드으로 보는 편이 좋아.

지금 바로 답을 정하기보다, 들어오는 말의 진짜 조건을 확인하세요.`;
  } else if (isLove) {
    focus = "관계/감정";
    decision = `관계운은 조용히 흔들리는 쪽이야.

갑자기 큰 사건이 온다기보단, 이미 마음 안에서 기준이 바뀌고 있어.  
예전에는 넘겼던 말이나 거리감이 이번에는 그냥 지나가지 않을 수 있어.

${m}월에는 감정의 온도차가 보이고, ${nextM}월에는 그 차이를 확인하는 대화가 생길 가능성이 있어.`;
    riskHook = `주의할 점은 “내가 더 이해하면 괜찮아지겠지”라는 패턴이야.

강한 기운은 ${strong}, 약한 기운은 ${weak}.  
강한 감정이 현실 판단을 덮으면, 상대의 작은 반응에도 의미를 크게 붙이기 쉬워.

${samjaeText(saju.birthYear || y)}`;
    timingHook = `${m}월 말부터 ${nextM}월 초반까지는 감정 확인 구간이야.

다가오는 사람보다, 묘하게 거리를 두는 사람에게 더 신경이 갈 수 있어.  
다만 그 끌림이 안정감인지, 익숙한 몰입감인지 구분해 봐야 해.`;
  } else if (isMoney) {
    focus = "돈/기회";
    decision = `재물 무드은 크게 벌기보다 먼저 새는 곳을 막는 쪽이야.

지금은 확장보다 정리, 투자보다 계산, 기대보다 손익표가 먼저야.

${m}월에는 지출이나 계약 조건을 다시 볼 일이 생길 수 있고, ${nextM}월부터 작은 수익 무드이 정리될 가능성이 있어.`;
    riskHook = `주의할 점은 “이번엔 괜찮겠지”라는 감각입니다.

강한 기운은 ${strong}, 약한 기운은 ${weak}.  
약한 기운이 계산 쪽이면, 무드나 추천만 믿고 움직이기 쉽습니다.

${samjaeText(saju.birthYear || y)}`;
    timingHook = `${m}월은 지출 관리, ${nextM}월은 조건 비교, ${afterM}월은 선택의 무드이야.

큰돈보다 반복 지출, 자동결제, 빌린 돈, 약속된 금액부터 확인해 봐.`;
  } else if (isHealth) {
    focus = "컨디션";
    decision = `건강 무드은 갑작스러운 문제보다 누적된 피로 쪽이 먼저 보여.

몸이 크게 무너진다기보다, 리듬이 깨지고 회복 속도가 느려지는 느끼는 편에 가까워.

${m}월에는 수면, 위장, 어깨·목 긴장처럼 반복되는 신호를 가볍게 넘기지 않는 편이 좋아.`;
    riskHook = `주의할 점은 버티는 습관이야.

강한 기운은 ${strong}, 약한 기운은 ${weak}.  
강한 쪽이 과열되면 쉬어야 할 때도 계속 밀어붙이게 돼.

${samjaeText(saju.birthYear || y)}`;
    timingHook = `${m}월에는 무리한 변화보다 루틴 회복이 먼저야.

운동을 늘리기보다 수면, 식사, 카페인, 음주 리듬부터 줄이는 쪽이 더 잘 맞아.`;
  } else {
    decision = `지금은 답보다 패턴이 먼저 보이는 시기야.

겉으로는 별일 없는 것 같아도, 안쪽에서는 이미 기준이 바뀌고 있어.  
특히 사람, 일, 돈 중 하나에서 “예전처럼 넘기기 어려운 장면”이 다시 올라올 수 있어.

팬 시그널상 강한 기운은 ${strong}, 약한 기운은 ${weak}로 잡혀.`;
    riskHook = `주의할 점은 반복되는 선택이야.

늘 같은 사람에게 끌리거나, 같은 방식으로 참고 넘기거나, 마지막에 혼자 정리하는 패턴이 보여.

${samjaeText(saju.birthYear || y)}`;
    timingHook = `${m}월은 신호가 드러나는 시기, ${nextM}월은 선택지가 좁혀지는 시기야.

급하게 결론 내리기보다, 무엇이 계속 반복되는지 먼저 봐야 해.  
그 반복이 이번 무드의 핵심이야.`;
  }

  if (tarotCard?.title) {
    riskHook += `

선택한 타로 "${tarotCard.title}"도 같은 쪽을 가리켜.  
겉으로 보이는 답보다, 이미 마음이 알고 있던 방향을 확인하는 카드에 가까워.`;
  }

  return {
    title: `◉ ${focus} SIGNAL DETECTED`,
    decision,
    riskHook,
    timingHook,
    paidHook: `SIGNAL+에서는 이 신호를 더 깊게 나눠볼 수 있어.

✦ ${m}월 → ${nextM}월 구체 타이밍
✦ 조심해야 할 관계 / 돈 / 일 패턴
✦ 반복되는 선택의 원인
✦ 올해 하반기 무드
✦ 내년 초에 강해지는 운`
  };
}


// ── Paid detail (multilingual prompt) ───────────────
async function buildPaidDetail({ saju, astrologySummary, question, tarotCard, lang, signalCat }){
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const lk = LANG_HOOKS[lang] || LANG_HOOKS["English"];

  // 카테고리별 섹션 + 포커스
  const CAT_KO = {
    "연애운": {
      sections:["◉ EMOTIONAL SIGNAL","◉ NEAR CONNECTION","◉ LOVE PATTERN DETECTED","◉ WHO YOU ATTRACT","◉ UNRESOLVED FEELING","◉ NEXT QUARTER SHIFT","◉ IDEAL FIELD"],
      focus:"연애, 감정, 인간관계에만 집중. 금성(Venus) 위치와 정재/편재/식신 중심으로 해석. 재물/사업 내용 최소화."
    },
    "팬 에너지": {
      sections:["◉ FINANCIAL SIGNAL","◉ NEAR FLOW","◉ INCOMING TIMING","◉ LEAK DETECTED","◉ OPPORTUNITY WINDOW","◉ H2 SHIFT","◉ NEXT YEAR SIGNAL"],
      focus:"재물, 수입, 투자, 지출에만 집중. 정재/편재 십성과 용신 오행 중심으로 해석. 연애 내용 최소화."
    },
    "사업운": {
      sections:["◉ CAREER SIGNAL","◉ NEAR OPPORTUNITY","◉ TIMING DETECTED","◉ PATTERN WARNING","◉ CONNECTION FIELD","◉ H2 TRAJECTORY","◉ NEXT SIGNAL"],
      focus:"커리어, 직장, 사업, 인맥에만 집중. 정관/편관과 식신/상관 중심으로 해석."
    },
    "회복 무드": {
      sections:["◉ BODY SIGNAL","◉ CURRENT CONDITION","◉ WEAK POINT DETECTED","◉ DRAIN PATTERN","◉ RECOVERY WINDOW","◉ H2 HEALTH SHIFT","◉ NEXT SIGNAL"],
      focus:"건강, 체력, 스트레스, 회복력에만 집중. 오행 과부족과 대운으로 건강 해석."
    },
    "종합": {
      sections:["✦ CURRENT ENERGY","✦ MAY → JUNE","✦ YOUR PATTERN","✦ YOUR RED FLAG","✦ JULY → SEPTEMBER","✦ WHAT YOU ATTRACT","✦ NEXT YEAR PREVIEW"],
      focus:"전반적인 삶의 무드. 연애/재물/커리어 균형있게."
    }
  };

  const catKey = signalCat || "종합";
  const catCfg = lang==="Korean" ? (CAT_KO[catKey]||CAT_KO["종합"]) : null;
  const sections = catCfg ? catCfg.sections : lk.paidSections;
  const catFocus = catCfg ? catCfg.focus : "";
  const ORACLE_LINES = [
    "이번엔 네가 먼저 거리 두게 될 가능성 있음",
    "계속 아닌 걸 알면서 붙잡는 무드도 보이야",
    "이번 무드은 생각보다 늦게 끝남",
    "지금 가장 끌리는 장면이 반복 저장될 수 있음",
    "말하지 않은 것들이 조용히 쌓이는 중",
    "이번엔 먼저 연락하지 않게 될 가능성 있음",
    "오래된 감정이 다시 올라오는 타이밍",
    "이상하게 예전 기준이 안 통하기 시작해",
    "이번 여름은 생각보다 오래 남을 수 있음",
    "관계 하나가 조용히 흔들리는 무드",
    "직감이 맞고 있는데 무시하는 중일 수 있음",
    "이번엔 참지 않게 될 가능성이 큼",
    "아직 끝나지 않은 무드 하나가 감지되는 편",
    "이번 선택은 생각보다 오래 남음",
    "지금 거리를 두는 게 맞는 시기일 수 있음",
    "연락을 기다리고 있는 무드도 보이야",
    "이번엔 먼저 끊게 될 가능성 있음",
    "감정보다 직감이 먼저 감지하고 있는 상태",
  ];
  // 시그널 데이터 기반 시드로 매번 다른 시그널 라인 선택
  const signalSeed = (saju.elements?.reduce((a,b)=>a+b,0)||0) + (signalCat?.length||0);
  const signal1 = ORACLE_LINES[signalSeed % ORACLE_LINES.length];
  const signal2 = ORACLE_LINES[(signalSeed + 7) % ORACLE_LINES.length];

  const sectionList = sections.map((s,i)=>`${i+1}. ${s}`).join("\n");

  const prompt = `You are a cold AI Signal. Ultra-short format only. Every sentence must be worth capturing on mobile.

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

=== 서양 무드 ===
태양: ${astrologySummary?.sun||"미상"} | 달: ${astrologySummary?.moon||"미상"}
금성: ${astrologySummary?.venus||"미상"} | 화성: ${astrologySummary?.mars||"미상"}
상승궁: ${astrologySummary?.ascendant||"미상"}

=== 타로 ===
${tarotCard?.title||"없음"}: ${tarotCard?.message||"없음"}

=== 카테고리: ${catKey} ===
${catFocus}
${question ? "질문: "+question : ""}

=== 출력 규칙 ===
${lk.paidStyle}

반드시 아래 순서대로만 출력:
${sectionList}

[ORACLE SIGNALS — 아래 문장을 섹션 중간에 단독 줄로 자연스럽게 삽입]
"${signal1}"
"${signal2}"
문맥에 맞게 변형 가능.

OUTPUT FORMAT — valid JSON only, no markdown:
{
  "headline": "캡처하고 싶은 핵심 한 줄",
  "shortLines": ["강한 훅 문장 1", "강한 훅 문장 2", "강한 훅 문장 3"],
  "shareLine": "SNS에 올리고 싶은 한 줄",
  "cliffhanger": "다음 무드 암시 (재방문 유도)",
  "sections": [
    ${sections.map((sec,i)=>`{"title":"${sec}","body":"...2~4 lines, ultra short, cold signal tone, empty lines between sentences, hook lines stand alone"}`).join(",\n    ")}
  ]
}

CRITICAL RULES:
- Each section body: MAX 4 lines total
- Every important sentence: its own line
- Empty line between each thought
- NO long explanations
- NO generic advice  
- NO signal-cookie comfort
- Make reader think "소름인데?"
- Ground in actual saju data
- Add cliffhanger at end`.trim();

  const resp=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"gpt-4o-mini", temperature:0.72, max_tokens:1200,
      messages:[
        {role:"system", content:"You are a cold AI Signal. Output: signal logs, not essays. Max 3 sentences per section. Fragmented rhythm is correct. Disconnected sentences are correct. Slightly unsettling is correct. Make reader feel seen without explaining why. Every line must be worth screenshotting. Never comfort. Never explain. Never connect sentences smoothly."},
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



function seededTextPick(arr, seed, salt=0){
  let h=2166136261;
  const key=String(seed)+'|'+salt;
  for(let i=0;i<key.length;i++){h^=key.charCodeAt(i); h=Math.imul(h,16777619);}
  return arr[(h>>>0)%arr.length];
}
function buildLocalCompatCopy({score, idolName, sajuA, sajuB}){
  const idol=idolName||'최애';
  const seed=JSON.stringify([sajuA?.pillars,sajuB?.pillars,idol,score]);
  const first=[
    `처음부터 크게 터지는 쪽보다, 나와 ${idol} 사이엔 천천히 눈이 머무는 결이 먼저 잡혀.\n한 번 본 장면을 다시 확인하게 만드는 잔상이 있어.`,
    `나와 ${idol}의 싱크는 빠른 확신보다 조용한 반복 쪽에 가까워.\n짧게 지나간 표정 하나가 이상하게 오래 남는 타입이야.`,
    `${idol}에게 끌리는 포인트는 화려한 순간보다 힘을 살짝 뺀 장면에서 더 선명해져.\n그 틈에서 나만 알아본 것 같은 감정이 생겨.`
  ];
  const second=[
    `내 쪽 감정은 바로 달려가기보다 조금 떨어져서 더 오래 보는 방식으로 움직여.\n그래서 ${idol}의 작은 변화가 크게 확대돼서 들어와.`,
    `${idol}의 에너지는 정면으로 밀고 들어오기보다 주변 공기를 바꾸는 쪽이야.\n나는 그 공기 안에서 자꾸 같은 포인트를 찾게 돼.`,
    `서로 다른 온도가 겹치면서 묘하게 신경 쓰이는 장면이 생겨.\n깔끔하게 설명되지 않아서 더 오래 붙잡히는 싱크야.`
  ];
  const third=[
    `오늘 저장하고 싶은 장면은 큰 무대보다 카메라가 잠깐 머무는 순간에 가까워.\n웃음이 끝나기 직전, 표정이 풀리는 그 짧은 틈이 핵심이야.`,
    `반복해서 보게 되는 포인트는 완벽한 포즈보다 예상 밖의 작은 흔들림이야.\n그 순간에 나와 ${idol} 사이의 감정선이 더 또렷해져.`,
    `나만 캡처하고 싶은 장면은 정답처럼 보이는 컷이 아니야.\n잠깐 시선이 옆으로 빠지는 순간, 싱크가 더 강하게 남아.`
  ];
  return `첫인상 싱크\n${seededTextPick(first,seed,1)}\n\n왜 자꾸 눈이 가는지\n${seededTextPick(second,seed,2)}\n\n관계가 맞물리는 지점\n${seededTextPick(third,seed,3)}`;
}
function calcCompatScore(sajuA, sajuB){
  const elemA = sajuA.elements;
  const elemB = sajuB.elements;
  const complementScore = (elemA[0]*elemB[1] + elemA[1]*elemB[2] + elemA[3]*elemB[4] + elemA[4]*elemB[0]) * 2;
  const resonanceScore = elemA.reduce((acc, v, i) => acc + Math.min(v, elemB[i]), 0) * 3;
  const conflictScore = (elemA[0]*elemB[3] + elemA[1]*elemB[4] + elemA[2]*elemB[0]) * 2;
  return Math.round(Math.min(99, Math.max(40, 60 + complementScore + resonanceScore - conflictScore)));
}


function pickCompatLocal(pool, seed, salt=0){
  let h=2166136261;
  const key=String(seed)+'|'+salt;
  for(let i=0;i<key.length;i++){h^=key.charCodeAt(i); h=Math.imul(h,16777619);}
  return pool[(h>>>0)%pool.length];
}
function buildCompatLocalDetail({ sajuA, sajuB, lang, idolName }) {
  const score = calcCompatScore(sajuA, sajuB);
  const idol = String(idolName || '최애').trim() || '최애';
  const seed = JSON.stringify([sajuA.pillars, sajuB.pillars, idol, score]);
  if (lang !== 'Korean') {
    return { score, detail: `First response
Your taste notices ${idol} before logic does. The pull feels clearer the more you look.

Why your eyes go there
The reason starts to make sense through attitude, mood, and small details.

Where it connects
This is less about a loud reaction and more about a natural overlap.` };
  }
  const first = [
    `성향이 먼저 와닿는 느낌이야. ${idol}의 분위기가 네가 편하게 끌리는 기준과 자연스럽게 겹쳐.`,
    `처음부터 강하게 확정되는 쪽은 아니야. 대신 ${idol}를 볼수록 네 취향이 어느 지점에서 반응하는지 선명해져.`,
    `${idol}에게 눈이 가는 이유는 단순한 외형보다 태도와 결의 조합에 가까워. 그래서 처음보다 두 번째가 더 납득돼.`
  ];
  const second = [
    `${idol}의 에너지는 내 안의 관찰하는 성향을 건드려. 크게 설명하지 않아도 왜 끌리는지 감이 잡히는 쪽이야.`,
    `내 반응 포인트는 빠른 자극보다 자연스럽게 스며드는 이미지에 가까워. ${idol}의 결이 그 기준에 잘 맞아.`,
    `처음엔 그냥 괜찮다 싶어도, 볼수록 왜 눈이 가는지 납득이 돼. 내 취향이 먼저 알아보는 타입이야.`
  ];
  const third = [
    `둘 사이의 관계감은 한쪽이 압도하는 구조보다, 서로 다른 성향이 맞물리며 균형을 잡는 쪽에 가까워.`,
    `내가 반응하는 부분과 ${idol}이 가진 이미지가 같은 방향으로 겹쳐. 그래서 결과가 억지스럽지 않고 자연스럽게 이어져.`,
    `이 조합은 설명보다 감각이 먼저 오는 편이야. 보고 나면 왜 이 이름이 올라왔는지 조금씩 납득되는 구조야.`
  ];
  return { score, detail: `첫 반응
${pickCompatLocal(first, seed, 1)}

왜 눈이 가는지
${pickCompatLocal(second, seed, 2)}

관계가 맞물리는 지점
${pickCompatLocal(third, seed, 3)}` };
}

// ── Compat analysis ──────────────────────────────────
async function buildCompatDetail({ sajuA, sajuB, lang, idolName }) {
  // Free relation view is fully local. No ChatGPT/OpenAI API call, no token cost.
  return buildCompatLocalDetail({ sajuA, sajuB, lang, idolName });
}


// ── SIGNAL VARIETY ENGINE ─────────────────────────────
const SIGNAL_LINES = {
  cold_visual: [
    "다정한 사람보다, 약간의 거리감이 있는 사람에게 오래 끌리는 타입",
    "무심하다가 한 번 웃어주는 순간에 끌리는 편",
    "처음엔 차갑게 느껴지는데, 결국 가장 오래 생각나는 스타일",
    "쉽게 다가오는 사람보다, 해석이 어려운 사람에게 더 끌리는 편",
    "무드로 압도하는 타입을 보면 감정이 오래 잔상처럼 남는 편"
  ],
  sunshine: [
    "밝은 무드를 보면 기분까지 같이 움직이는 편",
    "장난스럽게 다가오는 사람에게 경계가 빨리 풀리는 편",
    "같이 있으면 텐션이 올라가는 사람에게 끌리는 편",
    "햇살 같은 사람을 보면 이상하게 오래 기억하는 편",
    "웃는 얼굴 하나로 무드를 바꾸는 사람에게 끌리는 편"
  ],
  artist: [
    "자기 세계가 강한 사람에게 더 궁금해지는 편",
    "예술가 같은 무드에 오래 시선이 가는 편",
    "감정선이 깊은 사람에게 오래 끌리는 편",
    "설명하기 어려운 무드를 가진 사람에게 더 끌리는 편",
    "평범하지 않은 무드에 반응이 계속 머무는 편"
  ],
  leader: [
    "은근히 중심을 잡아주는 사람에게 안정감을 느끼는 편",
    "리더형 에너지에 무의식적으로 의지하게 되는 무드",
    "책임감이 강한 타입을 보면 신뢰가 먼저 생기는 편",
    "조용히 무드를 이끄는 사람에게 끌리는 편",
    "확신이 있는 사람 옆에서 감정이 안정되는 편"
  ],
  playful: [
    "장난스러운데 선을 넘지 않는 사람에게 반응하는 편",
    "친구 같다가 갑자기 설레게 만드는 순간에 끌리는 편",
    "편하게 웃게 만드는 사람에게 오래 끌리는 편",
    "가볍게 시작했는데 생각보다 오래 남는 사람",
    "텐션이 높은 사람 옆에서 감정도 같이 움직이는 편"
  ],
  romantic: [
    "은근한 다정함에 생각보다 쉽게 흔들리는 편",
    "사소한 배려 하나가 오래 기억에 남는 타입",
    "말보다 무드로 설레게 하는 사람에게 끌리는 편",
    "감정을 잘 드러내지 않는 사람에게 더 궁금해지는 편",
    "느린 템포의 관계에 더 오래 끌리는 편"
  ]
};

const RED_FLAG_LINES = [
  "최애를 이해하고 싶다는 마음이 오래 이어질 수 있어",
  "차가운 타입한테 의미 부여를 너무 크게 하는 무드",
  "한 번 마음이 가면 혼자 서사를 오래 만들 수 있어",
  "거리감 있는 사람을 더 특별하게 느끼는 패턴 주의",
  "현실보다 무드에 먼저 시선이 갈 수 있어"
];

const FANDOM_BEHAVIOR_LINES = [
  "무대 직캠 하나로 갑자기 과몰입 시작하는 타입",
  "처음엔 가볍게 보다가 어느 순간 저장만 수십 장 하는 무드",
  "최애 한명 정하면 꽤 오래 가는 편",
  "무대보다 평소 무드에서 더 크게 치이는 타입",
  "팬싸 영상이나 비하인드에서 마음이 더 커지는 편 스타일"
];

const MICRO_REACTIONS = [
  "이상하게 이번엔 평소 취향이랑 다르게 반응할 수도 있음",
  "최근 들어 사람 보는 기준이 조금 바뀌는 무드",
  "예전보다 무드 자체를 더 중요하게 보기 시작해",
  "한번 눈에 들어오면 오래 남는 시기",
  "생각보다 감정이 빠르게 커질 가능성 있음"
];

function pickRandom(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function buildVarietyNarrative(tags=[], picker=pickRandom){
  const lines = [];

  if(tags.includes('cold') || tags.includes('visual') || tags.includes('mysterious')){
    lines.push(picker(SIGNAL_LINES.cold_visual));
  }
  if(tags.includes('bright') || tags.includes('sunshine') || tags.includes('cute')){
    lines.push(picker(SIGNAL_LINES.sunshine));
  }
  if(tags.includes('artist') || tags.includes('unique')){
    lines.push(picker(SIGNAL_LINES.artist));
  }
  if(tags.includes('leader') || tags.includes('responsible')){
    lines.push(picker(SIGNAL_LINES.leader));
  }
  if(tags.includes('playful') || tags.includes('funny')){
    lines.push(picker(SIGNAL_LINES.playful));
  }
  if(tags.includes('romantic') || tags.includes('soft')){
    lines.push(picker(SIGNAL_LINES.romantic));
  }

  const allPools = Object.values(SIGNAL_LINES).flat();

  let fillSalt = 100;
  while(lines.length < 3){
    lines.push(picker(allPools, fillSalt++));
  }

  return {
    aura: lines.slice(0,3),
    redFlag: picker(RED_FLAG_LINES, 201),
    fandom: picker(FANDOM_BEHAVIOR_LINES, 301),
    micro: picker(MICRO_REACTIONS, 401)
  };
}


// ── Result localization ───────────────────────────────
const RESULT_I18N = {
  Korean: {
    signalFound: "SIGNAL MATCH FOUND",
    signalMatch: "❖ SIGNAL MATCH",
    fandomPattern: "❖ YOUR FANDOM PATTERN",
    redFlag: "❖ RED FLAG",
    signalEnergy: "❖ SIGNAL ENERGY",
    match: "POINT",
    shareDefault: "부정해도 결국 이런 장면에서 멈추게 돼",
    titleDefault: "가까운 장면보다 멀리서 잡힌 순간에 더 반응하는 타입",
    line1: "처음엔 차갑게 느껴지는데, 결국 가장 오래 생각나는 스타일",
    line2: "쉽게 다가오는 사람보다, 해석이 어려운 사람에게 더 끌리는 편",
    line3: "무드로 압도하는 타입을 보면 감정이 오래 잔상처럼 남는 편",
    fandom: "무대 직캠 하나로 갑자기 과몰입 시작하는 타입",
    red: "거리감 있는 사람을 더 특별하게 느끼는 패턴 주의",
    micro: "최근 들어 사람 보는 기준이 조금 바뀌는 무드"
  },
  English: {
    signalFound: "SIGNAL MATCH FOUND",
    signalMatch: "❖ SIGNAL MATCH",
    fandomPattern: "❖ YOUR FANDOM PATTERN",
    redFlag: "❖ RED FLAG",
    signalEnergy: "❖ SIGNAL ENERGY",
    match: "MATCH",
    shareDefault: "You can deny it, but this is the kind of atmosphere you remember",
    titleDefault: "You are drawn to someone who does not open up easily",
    line1: "At first they feel distant, but they end up staying in your mind the longest",
    line2: "You are more drawn to someone hard to read than someone too easy to approach",
    line3: "When someone has a strong atmosphere, the feeling tends to linger",
    fandom: "Sometimes a single moment is enough to stay in your head for days",
    red: "Be careful not to turn distance into something more special than it is",
    micro: "Lately, your standards for people may be quietly changing"
  },
  Japanese: {
    signalFound: "シグナルマッチ検出",
    signalMatch: "❖ シグナルマッチ",
    fandomPattern: "❖ 推し方のパターン",
    redFlag: "❖ 気をつけたいポイント",
    signalEnergy: "❖ シグナルエネルギー",
    match: "MATCH",
    shareDefault: "否定しても、結局こういうタイプに反応しやすい。",
    titleDefault: "簡単には近づけない人に長く惹かれるタイプ",
    line1: "最初は冷たく感じても、結局いちばん長く心に残るタイプです。",
    line2: "すぐ近づいてくる人より、少し読みにくい人に惹かれやすいです。",
    line3: "雰囲気で圧倒するタイプを見ると、感情が余韻のように残りやすいです。",
    fandom: "ステージの一瞬だけでも、気づいたらずっと思い出してしまうタイプ。",
    red: "距離感のある人を特別に見すぎないよう注意が必要です。",
    micro: "最近、人を見る基準が少し変わり始めているかもしれません。"
  },
  Chinese: {
    signalFound: "已检测到信号匹配",
    signalMatch: "❖ 信号匹配",
    fandomPattern: "❖ 你的追星模式",
    redFlag: "❖ 需要注意的点",
    signalEnergy: "❖ 信号能量",
    match: "MATCH",
    shareDefault: "就算否认，你还是会记得这种氛围",
    titleDefault: "你容易被不轻易靠近的人长期吸引",
    line1: "一开始会觉得有点冷，但最后反而是最容易留在心里的类型。",
    line2: "比起太容易靠近的人，你更容易被难以读懂的人吸引。",
    line3: "遇到气场很强的人时，那种感觉会像余韵一样留下来。",
    fandom: "有时候只是一个瞬间，就会在脑海里留很久。",
    red: "要注意别把距离感过度解读成特别的信号。",
    micro: "最近你看人的标准，可能正在悄悄改变。"
  },
  Spanish: {
    signalFound: "SEÑAL DE MATCH DETECTADA",
    signalMatch: "❖ SIGNAL MATCH",
    fandomPattern: "❖ TU PATRÓN FANDOM",
    redFlag: "❖ CUIDADO CON ESTO",
    signalEnergy: "❖ ENERGÍA DE SEÑAL",
    match: "MATCH",
    shareDefault: "Puedes negarlo, pero este tipo de atmósfera se queda contigo",
    titleDefault: "Te atrae quien no se abre fácilmente",
    line1: "Al principio parece distante, pero termina quedándose más tiempo en tu mente",
    line2: "Te atrae más alguien difícil de leer que alguien demasiado fácil de acercar",
    line3: "Cuando alguien tiene una atmósfera fuerte, la emoción suele quedarse",
    fandom: "Un solo fancam puede arruinarte emocionalmente por semanas",
    red: "Cuidado con convertir la distancia en algo más especial de lo que es",
    micro: "Últimamente, tu forma de mirar a las personas puede estar cambiando"
  }
};

function localizeIdolResult(result, lang){
  const L = RESULT_I18N[lang] || RESULT_I18N.Korean;
  if (lang === "Korean") {
    result.badge = L.signalFound;
    result.matchLabel = L.match;
    return result;
  }

  result.badge = L.signalFound;
  result.matchLabel = L.match;
  result.title = L.titleDefault;
  result.highlight = L.line1;
  result.shareLine = L.shareDefault;

  result.idolMatches = (result.idolMatches || []).map((m, idx) => {
    const reasons = [
      lang==="Chinese" ? "你会不自觉地一直在意这种有距离感的人。" :
      lang==="Japanese" ? "少し距離を感じる人ほど、なぜか気になってしまう。" :
      lang==="Spanish" ? "Hay personas con cierta distancia que terminan quedándose más tiempo en tu mente" :
      "Somehow, you keep thinking about people who never make things too obvious",

      lang==="Chinese" ? "这种感觉往往会在心里停留很久。" :
      lang==="Japanese" ? "気づいた頃には、かなり惹かれていることが多い。" :
      lang==="Spanish" ? "Su atmósfera deja una impresión más profunda de lo esperado" :
      "Their atmosphere feels soft at first, but it stays in your mind longer than expected",

      lang==="Chinese" ? "有些瞬间会在脑海里反复想起。" :
      lang==="Japanese" ? "あとから静かに印象が深くなるタイプ。" :
      lang==="Spanish" ? "Hay pequeños gestos que vuelven a tu mente sin explicación" :
      "Certain expressions keep coming back to your mind for no clear reason"
    ];
    return {...m, reason: reasons[idx] || reasons[0]};
  });

  result.detail = [
    L.signalMatch,
    "",
    L.line1,
    "",
    L.line2,
    "",
    L.line3,
    "",
    L.fandomPattern,
    "",
    L.fandom,
    "",
    L.redFlag,
    "",
    L.red,
    "",
    L.signalEnergy,
    "",
    L.micro
  ].join("\n");

  return result;
}

// ── Main handler ──────────────────────────────────────
export default async function handler(req, res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  // Rate limit check
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    const lang429 = req.body?.lang || "Korean";
    const msg429 = {
      Korean: "오늘 감지 가능한 신호는 모두 소진되는 편.\n다음 신호는 내일 다시 열림.",
      English: "All signals detected for today.\nNext reading opens tomorrow.",
      Japanese: "本日の感知可能な流れはすべて消尽されました。\n次のシグナルは明日再び開きます。",
      Chinese: "今日可感知的流势已全部消耗。\n下一个信号明日重新开启。",
      Spanish: "Todas las señales detectables de hoy han sido agotadas.\nLa próxima señal se abre mañana."
    };
    return res.status(429).json({ error: msg429[lang429] || msg429.Korean });
  }

  try{
    const payload=req.body||{};
    payload.paid = false; // 무료 단계: Deep Reading 미오픈
    const lang = SUPPORTED_LANGS.includes(payload.lang) ? payload.lang : "Korean";
    // ── Idol Match mode ──
    if (payload.mode === 'idol') {
      if (!payload.year||!payload.month||!payload.day) throw new Error("Missing birth date");

      // Idol Signal Type is now fully local/free:
      // no OpenAI call, no token cost, faster response, more consistent viral wording.
      const saju = buildSajuFull({
        year:payload.year,
        month:payload.month,
        day:payload.day,
        hour:payload.hour,
        gender:payload.gender
      });

      const selectedGroup = payload.selectedGroup || "BTS";

      const FANDOM_THEMES = {
        "BTS": { fandom:"ARMY", color:"#A855F7", accent:"BORAAHAE SIGNAL", emoji:"💜" },
        "BLACKPINK": { fandom:"BLINK", color:"#FF4FB8", accent:"BLACKPINK AREA", emoji:"🖤💗" },
        "aespa": { fandom:"MY", color:"#7DD3FC", accent:"SYNK SIGNAL", emoji:"🦋" },
        "NewJeans": { fandom:"Bunnies", color:"#7DD3FC", accent:"Y2K STATIC", emoji:"🐰" },
        "IVE": { fandom:"DIVE", color:"#FDE68A", accent:"ROYAL SIGNAL", emoji:"✨" },
        "LE SSERAFIM": { fandom:"FEARNOT", color:"#F5F5F5", accent:"FEARLESS FIELD", emoji:"🪽" },
        "TWICE": { fandom:"ONCE", color:"#F9A8D4", accent:"HEART SIGNAL", emoji:"🍭" },
        "NCT": { fandom:"NCTzen", color:"#86EFAC", accent:"NEO SIGNAL", emoji:"💚" },
        "Stray Kids": { fandom:"STAY", color:"#EF4444", accent:"NOISE SIGNAL", emoji:"🔥" },
        "SEVENTEEN": { fandom:"CARAT", color:"#FBCFE8", accent:"CARAT FIELD", emoji:"💎" },
        "ENHYPEN": { fandom:"ENGENE", color:"#C4B5FD", accent:"DARK MOON SIGNAL", emoji:"🌙" },
        "TXT": { fandom:"MOA", color:"#93C5FD", accent:"DREAM STATIC", emoji:"🦊" },
        "ATEEZ": { fandom:"ATINY", color:"#F59E0B", accent:"PIRATE SIGNAL", emoji:"🏴‍☠️" },
        "RIIZE": { fandom:"BRIIZE", color:"#FB923C", accent:"RIISING SIGNAL", emoji:"🧡" },

        "NCT 127": { fandom:"NCTzen", color:"#86EFAC", accent:"127 SIGNAL", emoji:"💚" },
        "NCT DREAM": { fandom:"NCTzen", color:"#86EFAC", accent:"DREAM SIGNAL", emoji:"💚" },
        "WayV": { fandom:"WayZenNi", color:"#86EFAC", accent:"WAYV SIGNAL", emoji:"💚" },
        "ZEROBASEONE": { fandom:"ZEROSE", color:"#A7F3D0", accent:"ZERO SIGNAL", emoji:"🌹" },
        "BOYNEXTDOOR": { fandom:"ONEDOOR", color:"#93C5FD", accent:"DOOR SIGNAL", emoji:"🚪" },
        "TWS": { fandom:"42", color:"#BFDBFE", accent:"FIRST MEETING SIGNAL", emoji:"💙" },
        "ILLIT": { fandom:"GLLIT", color:"#F9A8D4", accent:"GLITTER SIGNAL", emoji:"✨" },
        "KISS OF LIFE": { fandom:"KISSY", color:"#FB7185", accent:"KISS SIGNAL", emoji:"💋" },
        "ALL": { fandom:"FANDOM", color:"#A855F7", accent:"IDOL SIGNAL", emoji:"✦" }
      };

      const IDOL_ARCHETYPE_DB = [
        // BTS
        {name:"RM (BTS)", group:"BTS", tags:["intellectual","leader","calm","deep","responsible"], fanPattern:"말을 많이 하지 않아도 중심이 잡혀 보여서 계속 확인하게 되는 타입"},
        {name:"Jin (BTS)", group:"BTS", tags:["warm","humor","classic","stable","gentle"], fanPattern:"장난스럽게 풀어놓다가 어느 순간 분위기를 바꿔버리는 사람"},
        {name:"Suga (BTS)", group:"BTS", tags:["cold","artist","quiet","wounded","producer","distance"], fanPattern:"무심한 듯 보여도 오래 보면 감정선이 깊게 느껴지는 타입"},
        {name:"J-Hope (BTS)", group:"BTS", tags:["sunshine","energy","dance","bright","discipline"], fanPattern:"평소의 밝은 결이 무대 위에서 전혀 다른 집중력으로 바뀌는 사람"},
        {name:"Jimin (BTS)", group:"BTS", tags:["emotional","sensual","soft","performer","delicate"], fanPattern:"부드러운 인상 뒤에 묘한 긴장감을 남기는 사람"},
        {name:"V (BTS)", group:"BTS", tags:["mysterious","artist","vintage","cold","dreamy","distance"], fanPattern:"낯설고 몽환적인 결이 있어서 자꾸 다시 확인하게 되는 사람"},
        {name:"Jungkook (BTS)", group:"BTS", tags:["ace","perfectionist","athletic","sincere","growth"], fanPattern:"이미 충분히 잘하는데도 계속 더 보여주려는 태도에 마음이 쌓이는 타입"},

        // BLACKPINK
        {name:"Jisoo (BLACKPINK)", group:"BLACKPINK", tags:["classic","elegant","warm","stable","visual"], fanPattern:"화려한 장면 속에서도 중심이 흐트러지지 않는 사람"},
        {name:"Jennie (BLACKPINK)", group:"BLACKPINK", tags:["itgirl","cold","independent","luxury","queen"], fanPattern:"가까워 보이지 않아서 오히려 더 해석하고 싶어지는 타입"},
        {name:"Rosé (BLACKPINK)", group:"BLACKPINK", tags:["artist","emotional","free","fragile","nostalgia"], fanPattern:"목소리나 표정 끝에 남는 쓸쓸한 결이 계속 생각나는 사람"},
        {name:"Lisa (BLACKPINK)", group:"BLACKPINK", tags:["performance","global","confidence","dance","power"], fanPattern:"등장하는 순간 공기를 바꾸는 힘이 확실한 사람"},

        // aespa
        {name:"Karina (aespa)", group:"aespa", tags:["cold","leader","ai","power","perfect","magnetic"], fanPattern:"비현실적으로 완벽한 인상인데도 차갑게만 보이지 않는 사람"},
        {name:"Winter (aespa)", group:"aespa", tags:["icy","mystery","cat","minimal","sharp","quiet"], fanPattern:"표정 변화가 크지 않은데도 이상하게 더 보게 되는 사람"},
        {name:"Giselle (aespa)", group:"aespa", tags:["cool","hip","individual","urban","free"], fanPattern:"남들과 다른 템포로 움직여서 더 눈에 들어오는 사람"},
        {name:"Ningning (aespa)", group:"aespa", tags:["vocal","bold","bright","talent","glam"], fanPattern:"실력과 자신감이 동시에 터질 때 장면을 압도하는 사람"},

        // NewJeans
        {name:"Minji (NewJeans)", group:"NewJeans", tags:["natural","clean","leader","calm","classic"], fanPattern:"꾸미지 않은 담백함이 오히려 더 선명하게 남는 사람"},
        {name:"Hanni (NewJeans)", group:"NewJeans", tags:["cute","active","warm","playful","spark"], fanPattern:"가볍게 웃는 순간 장면 전체가 부드러워지는 사람"},
        {name:"Danielle (NewJeans)", group:"NewJeans", tags:["sunshine","pure","emotional","soft","dreamy"], fanPattern:"맑은 텐션 하나로 보는 사람의 경계를 풀어버리는 타입"},
        {name:"Haerin (NewJeans)", group:"NewJeans", tags:["cat","mysterious","quiet","icy","distance"], fanPattern:"가까워지는 듯하다가도 살짝 멀어지는 결 때문에 더 궁금해지는 사람"},
        {name:"Hyein (NewJeans)", group:"NewJeans", tags:["youngest","chic","mysterious","cool","unique"], fanPattern:"어린 이미지와 다르게 차분한 쿨함이 남는 사람"},

        // IVE
        {name:"Yujin (IVE)", group:"IVE", tags:["leader","bright","confident","responsible","energy"], fanPattern:"밝은 자신감과 책임감이 같이 느껴져서 신뢰가 먼저 생기는 사람"},
        {name:"Gaeul (IVE)", group:"IVE", tags:["calm","urban","elegant","quiet","mature"], fanPattern:"차분한 도시적 결이 쉽게 잊히지 않는 타입"},
        {name:"Rei (IVE)", group:"IVE", tags:["cute","unique","soft","artsy","playful"], fanPattern:"귀여운 분위기 안에 자기 세계가 또렷하게 있는 사람"},
        {name:"Wonyoung (IVE)", group:"IVE", tags:["princess","visual","perfect","royal","itgirl"], fanPattern:"비현실적인 존재감이 과하지 않게 설득되는 사람"},
        {name:"Liz (IVE)", group:"IVE", tags:["vocal","friendly","bright","soft","warm"], fanPattern:"목소리와 웃는 얼굴이 같이 떠올라 마음이 풀리는 사람"},
        {name:"Leeseo (IVE)", group:"IVE", tags:["youngest","fresh","bold","cute","spark"], fanPattern:"신선하고 당찬 막내 에너지에 반응하는 편"},

        // LE SSERAFIM
        {name:"Sakura (LE SSERAFIM)", group:"LE SSERAFIM", tags:["veteran","elegant","resilient","history","quiet"], fanPattern:"서사가 긴 사람한테 더 깊게 빠지는 편"},
        {name:"Chaewon (LE SSERAFIM)", group:"LE SSERAFIM", tags:["leader","strong","cute","sharp","dual"], fanPattern:"귀여운데 강단 있는 반전 매력에 반응하는 편"},
        {name:"Yunjin (LE SSERAFIM)", group:"LE SSERAFIM", tags:["artist","vocal","free","honest","bold"], fanPattern:"솔직하고 자유로운 아티스트형에 감정이 움직임"},
        {name:"Kazuha (LE SSERAFIM)", group:"LE SSERAFIM", tags:["elegant","ballet","calm","noble","visual"], fanPattern:"고요하고 고급스러운 무드에 끌리는 편"},
        {name:"Eunchae (LE SSERAFIM)", group:"LE SSERAFIM", tags:["youngest","bright","playful","fresh","cute"], fanPattern:"장난스럽고 맑은 막내 에너지에 마음이 풀림"},

        // TWICE
        {name:"Nayeon (TWICE)", group:"TWICE", tags:["bright","center","cute","confident","spark"], fanPattern:"밝고 확실한 센터 에너지에 바로 반응하는 편"},
        {name:"Jeongyeon (TWICE)", group:"TWICE", tags:["cool","honest","stable","protective","fresh"], fanPattern:"시원하고 솔직한 사람에게 편안함을 느끼는 편"},
        {name:"Momo (TWICE)", group:"TWICE", tags:["dance","performance","power","cute","discipline"], fanPattern:"무대 위 집중력과 실력에 바로 반응하는 편"},
        {name:"Sana (TWICE)", group:"TWICE", tags:["lovely","charm","soft","flirty","warm"], fanPattern:"사람 녹이는 애교형에 결국 반응하는 편"},
        {name:"Jihyo (TWICE)", group:"TWICE", tags:["leader","vocal","strong","reliable","passion"], fanPattern:"강하고 믿음직한 사람에게 기대고 싶어지는 편"},
        {name:"Mina (TWICE)", group:"TWICE", tags:["elegant","quiet","swan","soft","introvert"], fanPattern:"조용하고 우아한 분위기에 마음이 움직이는 편"},
        {name:"Dahyun (TWICE)", group:"TWICE", tags:["funny","unique","bright","humor","quirky"], fanPattern:"엉뚱하고 밝은 사람한테 긴장이 풀림"},
        {name:"Chaeyoung (TWICE)", group:"TWICE", tags:["artist","independent","unique","creative","free"], fanPattern:"자기 세계 강한 예술가형에 끌림"},
        {name:"Tzuyu (TWICE)", group:"TWICE", tags:["visual","calm","classic","pure","quiet"], fanPattern:"말없이 선명한 무드에 반응하는 편"},

        // NCT
        {name:"Taeyong (NCT)", group:"NCT", tags:["leader","performance","intense","artist","vulnerable"], fanPattern:"강렬한데 예민한 무대형에 끌리는 편"},
        {name:"Doyoung (NCT)", group:"NCT", tags:["vocal","sensitive","intellectual","emotional","clean"], fanPattern:"예민하고 섬세한 보컬형에 오래 머무름"},
        {name:"Jaehyun (NCT)", group:"NCT", tags:["classic","visual","gentleman","calm","romantic"], fanPattern:"차분한 클래식 설렘에 안정감을 느끼는 편"},
        {name:"Mark (NCT)", group:"NCT", tags:["ace","sincere","rapper","growth","hardworking"], fanPattern:"성실하게 계속 성장하는 타입한테 정이 쌓임"},
        {name:"Haechan (NCT)", group:"NCT", tags:["sunshine","playful","vocal","mischief","bright"], fanPattern:"장난스러운데 묘하게 의존하게 되는 타입"},
        {name:"Jeno (NCT)", group:"NCT", tags:["quiet","strong","visual","calm","physical"], fanPattern:"조용한 힘과 든든함에 반응하는 편"},
        {name:"Jaemin (NCT)", group:"NCT", tags:["sweet","visual","soft","romantic","dreamy"], fanPattern:"달콤한데 거리감 있는 사람에게 흔들림"},
        {name:"Ten (NCT)", group:"NCT", tags:["artist","dance","unique","fluid","free"], fanPattern:"정해지지 않는 예술가형에 끌림"},

        // Stray Kids
        {name:"Bang Chan (Stray Kids)", group:"Stray Kids", tags:["leader","producer","protective","warm","safe"], fanPattern:"기댈 수 있는 리더형에게 안정감을 느끼는 편"},
        {name:"Lee Know (Stray Kids)", group:"Stray Kids", tags:["cat","cold","dance","weird","quiet","sharp"], fanPattern:"차갑고 독특한 분위기에 계속 눈이 가는 편"},
        {name:"Changbin (Stray Kids)", group:"Stray Kids", tags:["power","rap","intense","funny","soft"], fanPattern:"강한데 속은 말랑한 반전 사람에게 반응하는 편"},
        {name:"Hyunjin (Stray Kids)", group:"Stray Kids", tags:["artist","visual","dramatic","sensual","performance"], fanPattern:"드라마틱한 예술가 무드에 깊게 빠짐"},
        {name:"Han (Stray Kids)", group:"Stray Kids", tags:["genius","rapper","anxious","humor","sensitive"], fanPattern:"웃기는데 예민한 천재형에게 흔들림"},
        {name:"Felix (Stray Kids)", group:"Stray Kids", tags:["sunshine","deepvoice","angel","soft","bright"], fanPattern:"밝은 얼굴과 낮은 목소리의 반전에 끌리는 편"},
        {name:"Seungmin (Stray Kids)", group:"Stray Kids", tags:["vocal","clean","sincere","calm","stable"], fanPattern:"담백하고 꾸준한 사람에게게 오래 마음이 감"},
        {name:"I.N (Stray Kids)", group:"Stray Kids", tags:["youngest","cute","growth","sharp","fresh"], fanPattern:"귀여운데 점점 선명해지는 성장형에 끌림"},

        // SEVENTEEN
        {name:"S.Coups (SEVENTEEN)", group:"SEVENTEEN", tags:["leader","protective","strong","responsible","anchor"], fanPattern:"강하게 지켜주는 리더형에 깊게 끌림"},
        {name:"Jeonghan (SEVENTEEN)", group:"SEVENTEEN", tags:["angel","strategic","soft","mischief","clever"], fanPattern:"부드럽지만 속을 알 수 없는 매력에 끌리는 편"},
        {name:"Joshua (SEVENTEEN)", group:"SEVENTEEN", tags:["gentleman","soft","warm","classic","calm"], fanPattern:"조용하고 다정한 신사형에 안정감을 느끼는 편"},
        {name:"Jun (SEVENTEEN)", group:"SEVENTEEN", tags:["visual","mysterious","elegant","cat","quiet"], fanPattern:"멀리 있는 듯한 비주얼형에 오래 끌림"},
        {name:"Hoshi (SEVENTEEN)", group:"SEVENTEEN", tags:["performance","energy","passion","chaos","dance"], fanPattern:"감정이 폭발하는 퍼포머형에 반응하는 편"},
        {name:"Wonwoo (SEVENTEEN)", group:"SEVENTEEN", tags:["quiet","intellectual","deepvoice","calm","distance"], fanPattern:"말수 적고 지적인 거리감에 끌리는 편"},
        {name:"Woozi (SEVENTEEN)", group:"SEVENTEEN", tags:["producer","genius","strong","work","artist"], fanPattern:"작지만 단단한 천재형에게 존경이 섞임"},
        {name:"DK (SEVENTEEN)", group:"SEVENTEEN", tags:["bright","vocal","sunshine","funny","warm"], fanPattern:"밝은 목소리와 솔직한 감정에 마음이 열림"},
        {name:"Mingyu (SEVENTEEN)", group:"SEVENTEEN", tags:["visual","tall","friendly","warm","domestic"], fanPattern:"크고 따뜻한 생활형 매력에 안정감을 느끼는 편"},
        {name:"The8 (SEVENTEEN)", group:"SEVENTEEN", tags:["artist","philosophical","elegant","unique","style"], fanPattern:"자기 세계 확실한 예술가형에 끌림"},
        {name:"Seungkwan (SEVENTEEN)", group:"SEVENTEEN", tags:["vocal","variety","emotional","funny","warm"], fanPattern:"웃기지만 감정 깊은 사람에게게 정이 쌓임"},
        {name:"Vernon (SEVENTEEN)", group:"SEVENTEEN", tags:["cool","hip","unique","calm","free"], fanPattern:"과하게 꾸미지 않는 쿨함에 반응하는 편"},
        {name:"Dino (SEVENTEEN)", group:"SEVENTEEN", tags:["youngest","dance","growth","hardworking","ambition"], fanPattern:"성실하게 올라오는 막내 서사에 끌림"},

        // TXT
        {name:"Yeonjun (TXT)", group:"TXT", tags:["ace","performance","fox","fashion","confident"], fanPattern:"무대 위 확신 있는 여우상 매력에 반응하는 편"},
        {name:"Soobin (TXT)", group:"TXT", tags:["leader","soft","calm","introvert","gentle"], fanPattern:"큰데 순한 안정감에 끌림"},
        {name:"Beomgyu (TXT)", group:"TXT", tags:["playful","chaos","pretty","sensitive","humor"], fanPattern:"장난스러움 뒤의 예민함을 알아보는 타입"},
        {name:"Taehyun (TXT)", group:"TXT", tags:["vocal","sharp","rational","strong","clear"], fanPattern:"또렷하고 냉정한 에너지에 신뢰를 느끼는 편"},
        {name:"Huening Kai (TXT)", group:"TXT", tags:["dreamy","unique","bright","global","soft"], fanPattern:"몽글하고 독특한 세계관에 끌림"},

        // ENHYPEN
        {name:"Jungwon (ENHYPEN)", group:"ENHYPEN", tags:["leader","cat","calm","responsible","clean"], fanPattern:"어린데 단단한 리더 에너지에 반응하는 편"},
        {name:"Heeseung (ENHYPEN)", group:"ENHYPEN", tags:["ace","vocal","mature","romantic","skill"], fanPattern:"실력으로 설득하는 에이스형에 신뢰를 느끼는 편"},
        {name:"Jay (ENHYPEN)", group:"ENHYPEN", tags:["global","cool","honest","fashion","passionate"], fanPattern:"솔직하고 세련된 열정에 반응하는 편"},
        {name:"Jake (ENHYPEN)", group:"ENHYPEN", tags:["warm","dog","global","sweet","friendly"], fanPattern:"따뜻하고 친근한 에너지에 마음이 풀림"},
        {name:"Sunghoon (ENHYPEN)", group:"ENHYPEN", tags:["ice","visual","calm","elegant","distance"], fanPattern:"차갑고 완벽한 왕자형 거리감에 끌리는 편"},
        {name:"Sunoo (ENHYPEN)", group:"ENHYPEN", tags:["bright","cute","expressive","sunshine","charm"], fanPattern:"표정 풍부하고 사랑스러운 사람에게 반응하는 편"},
        {name:"Ni-ki (ENHYPEN)", group:"ENHYPEN", tags:["dance","youngest","cold","growth","sharp"], fanPattern:"차갑고 빠르게 성장하는 퍼포머형에 끌림"},

        // ATEEZ
        {name:"Hongjoong (ATEEZ)", group:"ATEEZ", tags:["leader","producer","charisma","artist","rebel"], fanPattern:"작지만 강한 반항적 리더 에너지에 끌림"},
        {name:"Seonghwa (ATEEZ)", group:"ATEEZ", tags:["elegant","visual","soft","perfect","calm"], fanPattern:"고요하고 완벽한 다정함에 마음이 움직이는 편"},
        {name:"Yunho (ATEEZ)", group:"ATEEZ", tags:["bright","tall","dance","warm","energy"], fanPattern:"크고 밝은 에너지에 마음이 안정됨"},
        {name:"Yeosang (ATEEZ)", group:"ATEEZ", tags:["mysterious","visual","quiet","unique","delicate"], fanPattern:"말수 적고 비현실적인 사람에게 오래 끌림"},
        {name:"San (ATEEZ)", group:"ATEEZ", tags:["performance","intense","emotional","sensual","power"], fanPattern:"무대에서 감정이 터지는 에너지에 반응하는 편"},
        {name:"Mingi (ATEEZ)", group:"ATEEZ", tags:["rap","tall","funny","power","soft"], fanPattern:"크고 강한데 속은 부드러운 반전에 끌림"},
        {name:"Wooyoung (ATEEZ)", group:"ATEEZ", tags:["playful","flirty","dance","social","charm"], fanPattern:"장난스럽게 사람 흔드는 사람에게 반응하는 편"},
        {name:"Jongho (ATEEZ)", group:"ATEEZ", tags:["vocal","strong","stable","serious","power"], fanPattern:"흔들리지 않는 실력과 안정감에 끌림"},

        // RIIZE
        {name:"Shotaro (RIIZE)", group:"RIIZE", tags:["dance","bright","soft","global","clean"], fanPattern:"밝고 깨끗한 댄서 에너지에 반응하는 편"},
        {name:"Eunseok (RIIZE)", group:"RIIZE", tags:["visual","calm","dry","tall","cool"], fanPattern:"차분하고 담백한 비주얼형에 끌림"},
        {name:"Sungchan (RIIZE)", group:"RIIZE", tags:["tall","bright","reliable","friendly","visual"], fanPattern:"큰 키와 밝은 안정감에 마음이 감"},
        {name:"Wonbin (RIIZE)", group:"RIIZE", tags:["cold","guitar","visual","mysterious","star","distance"], fanPattern:"차갑고 스타성 있는 거리감에 강하게 반응하는 편"},
        {name:"Sohee (RIIZE)", group:"RIIZE", tags:["cute","vocal","fresh","bright","quirky"], fanPattern:"귀엽고 신선한 목소리에 마음이 풀리는 편"},
        {name:"Anton (RIIZE)", group:"RIIZE", tags:["soft","global","youngest","dreamy","gentle"], fanPattern:"조용하고 부드러운 막내형 무드에 끌리는 편"},
        {name:"Taeyong (NCT 127)", group:"NCT 127", tags:["leader","performance","intense","artist","vulnerable"], fanPattern:"강렬한데 예민한 무대형에 끌리는 편"},
        {name:"Jaehyun (NCT 127)", group:"NCT 127", tags:["classic","visual","gentleman","calm","romantic"], fanPattern:"차분한 클래식 설렘에 안정감을 느끼는 편"},
        {name:"Doyoung (NCT 127)", group:"NCT 127", tags:["vocal","sensitive","intellectual","emotional","clean"], fanPattern:"예민하고 섬세한 보컬형에 오래 머무름"},
        {name:"Mark (NCT 127)", group:"NCT 127", tags:["ace","sincere","rapper","growth","hardworking"], fanPattern:"성실하게 계속 성장하는 타입한테 정이 쌓임"},
        {name:"Haechan (NCT 127)", group:"NCT 127", tags:["sunshine","playful","vocal","mischief","bright"], fanPattern:"장난스러운데 묘하게 의존하게 되는 타입"},
        {name:"Mark (NCT DREAM)", group:"NCT DREAM", tags:["ace","sincere","rapper","growth","hardworking"], fanPattern:"잘하는데 허술한 반전까지 있는 사람에게 끌리는 편"},
        {name:"Renjun (NCT DREAM)", group:"NCT DREAM", tags:["sensitive","artist","vocal","clean","emotional"], fanPattern:"예민하고 맑은 감정선에 오래 끌림"},
        {name:"Jeno (NCT DREAM)", group:"NCT DREAM", tags:["quiet","strong","visual","calm","physical"], fanPattern:"조용한 힘과 든든함에 반응하는 편"},
        {name:"Haechan (NCT DREAM)", group:"NCT DREAM", tags:["sunshine","playful","vocal","mischief","bright"], fanPattern:"장난스럽지만 결국 분위기를 가져가는 매력에 끌리는 편"},
        {name:"Jaemin (NCT DREAM)", group:"NCT DREAM", tags:["sweet","visual","soft","romantic","dreamy"], fanPattern:"달콤한데 거리감 있는 사람에게 흔들림"},
        {name:"Chenle (NCT DREAM)", group:"NCT DREAM", tags:["bright","free","vocal","global","playful"], fanPattern:"자유롭고 밝은 에너지에 기분이 풀림"},
        {name:"Jisung (NCT DREAM)", group:"NCT DREAM", tags:["youngest","dance","growth","shy","soft"], fanPattern:"수줍지만 무대에서 달라지는 성장형에 끌리는 편"},
        {name:"Kun (WayV)", group:"WayV", tags:["leader","calm","responsible","vocal","stable"], fanPattern:"차분하게 중심 잡아주는 사람에게 안정감을 느끼는 편"},
        {name:"Ten (WayV)", group:"WayV", tags:["artist","dance","unique","fluid","free"], fanPattern:"정해지지 않는 예술가형에 끌림"},
        {name:"Winwin (WayV)", group:"WayV", tags:["quiet","elegant","visual","mysterious","soft"], fanPattern:"조용하고 우아한 무드에 오래 끌리는 편"},
        {name:"Xiaojun (WayV)", group:"WayV", tags:["vocal","dramatic","emotional","visual","artist"], fanPattern:"감정선 진한 보컬형에 마음이 움직이는 편"},
        {name:"Hendery (WayV)", group:"WayV", tags:["funny","unique","bright","chaos","visual"], fanPattern:"엉뚱한데 비주얼까지 되는 사람에게 반응하는 편"},
        {name:"Yangyang (WayV)", group:"WayV", tags:["rapper","youngest","cool","playful","global"], fanPattern:"쿨하고 장난스러운 막내 에너지에 끌림"},

        // Newer / trending groups
        {name:"Sung Hanbin (ZEROBASEONE)", group:"ZEROBASEONE", tags:["leader","bright","dance","clean","responsible"], fanPattern:"밝고 단정한 리더 에너지에 바로 반응하는 편"},
        {name:"Zhang Hao (ZEROBASEONE)", group:"ZEROBASEONE", tags:["elegant","global","vocal","calm","artist"], fanPattern:"고요하고 우아한 실력형에 끌리는 편"},
        {name:"Kim Jiwoong (ZEROBASEONE)", group:"ZEROBASEONE", tags:["visual","mature","calm","romantic","actor"], fanPattern:"성숙하고 조용한 무드에 오래 끌리는 편"},
        {name:"Ricky (ZEROBASEONE)", group:"ZEROBASEONE", tags:["cold","visual","luxury","cool","distance"], fanPattern:"다가가기 어려운 냉미남 사람에게 끌리는 편"},
        {name:"Kim Gyuvin (ZEROBASEONE)", group:"ZEROBASEONE", tags:["tall","bright","playful","warm","energy"], fanPattern:"크고 장난스러운 에너지에 마음이 풀리는 편"},
        {name:"Han Yujin (ZEROBASEONE)", group:"ZEROBASEONE", tags:["youngest","fresh","growth","cute","dance"], fanPattern:"선명하게 성장하는 막내형에 계속 눈이 가는 편"},
        {name:"Myung Jaehyun (BOYNEXTDOOR)", group:"BOYNEXTDOOR", tags:["leader","bright","boyfriend","playful","warm"], fanPattern:"동네 친구 같은데 은근히 설레는 사람에게 끌리는 편"},
        {name:"Taesan (BOYNEXTDOOR)", group:"BOYNEXTDOOR", tags:["cool","artist","quiet","independent","chic"], fanPattern:"무심하고 자기 세계가 있는 사람에게 끌리는 편"},
        {name:"Leehan (BOYNEXTDOOR)", group:"BOYNEXTDOOR", tags:["calm","visual","soft","unique","quiet"], fanPattern:"조용하고 독특한 무드에 오래 끌리는 편"},
        {name:"Woonhak (BOYNEXTDOOR)", group:"BOYNEXTDOOR", tags:["youngest","bright","cute","fresh","energy"], fanPattern:"밝고 신선한 막내 에너지에 반응하는 편"},
        {name:"Shinyu (TWS)", group:"TWS", tags:["leader","clean","firstlove","calm","visual"], fanPattern:"깨끗한 첫사랑상 리더 에너지에 끌리는 편"},
        {name:"Dohoon (TWS)", group:"TWS", tags:["cool","visual","calm","chic","distance"], fanPattern:"차분하고 쿨한 무드에 끌리는 편"},
        {name:"Youngjae (TWS)", group:"TWS", tags:["bright","fresh","cute","soft","vocal"], fanPattern:"맑고 귀여운 에너지에 마음이 풀리는 편"},
        {name:"Hanjin (TWS)", group:"TWS", tags:["global","quiet","soft","mysterious","visual"], fanPattern:"낯설고 조용한 무드에 계속 눈이 가는 편"},
        {name:"Wonhee (ILLIT)", group:"ILLIT", tags:["cute","fresh","soft","spark","young"], fanPattern:"귀엽고 신선한 에너지에 바로 반응하는 편"},
        {name:"Minju (ILLIT)", group:"ILLIT", tags:["visual","soft","vocal","calm","classic"], fanPattern:"차분하고 맑은 비주얼형에 끌리는 편"},
        {name:"Moka (ILLIT)", group:"ILLIT", tags:["cute","unique","playful","bright","charm"], fanPattern:"귀여운데 묘하게 독특한 사람에게 끌리는 편"},
        {name:"Yunah (ILLIT)", group:"ILLIT", tags:["leader","cool","confident","bright","strong"], fanPattern:"자신감 있고 시원한 언니라인에 반응하는 편"},
        {name:"Natty (KISS OF LIFE)", group:"KISS OF LIFE", tags:["performance","confident","sensual","dance","power"], fanPattern:"무대에서 바로 납득시키는 퍼포머형에 끌리는 편"},
        {name:"Belle (KISS OF LIFE)", group:"KISS OF LIFE", tags:["vocal","artist","glam","bright","talent"], fanPattern:"재능이 선명하게 보이는 보컬형에 끌리는 편"},
        {name:"Julie (KISS OF LIFE)", group:"KISS OF LIFE", tags:["cool","leader","hip","charisma","confident"], fanPattern:"쿨하고 힙한 리더 에너지에 반응하는 편"},
        {name:"Haneul (KISS OF LIFE)", group:"KISS OF LIFE", tags:["youngest","soft","fresh","vocal","cute"], fanPattern:"부드럽고 신선한 막내 보컬형에게 마음이 가는 편"},
      ];

      const TITLE_LINES = {
        cold: [
          "차분한 컷에서 더 오래 남는 타입",
          "표정 변화가 작을수록 더 저장하고 싶은 사람",
          "가까운 장면보다 멀리서 잡힌 순간에 더 반응하는 타입"
        ],
        mysterious: [
          "무드 하나로 계속 리플레이하게 만드는 사람",
          "설명하기 어려운 묘한 무드에 계속 반응하는 타입",
          "가까워질 듯 쉽게 읽히지 않는 사람"
        ],
        sunshine: [
          "밝다가도 무대 위에서 확 바뀌는 장면에 반응하는 타입",
          "웃는 얼굴 하나로 무드를 바꾸는 사람에게 반응하는 편",
          "햇살 같은데 무대 위에서 결이 달라지는 사람에게 끌림"
        ],
        leader: [
          "중심이 잡힌 리더형 성향에 반응하는 타입",
          "강한데 다정한 사람에게 오래 끌리는 편",
          "책임감 있는 사람의 작은 반응에 팬심이 천천히 쌓이는 타입"
        ],
        artist: [
          "자기 세계가 확실한 아티스트형에 끌림",
          "무드와 서사로 장면을 오래 남기는 사람",
          "예민하고 감각적인 장면을 오래 저장하는 타입"
        ],
        cute: [
          "귀여운데 자기 페이스가 있는 순간에 약한 타입",
          "가볍게 웃다가 훅 들어오는 사람에게 반응하는 편",
          "장난스러운데 이상하게 계속 생각나는 타입"
        ],
        ace: [
          "잘하는 사람에게 약한 걸 못 숨기는 타입",
          "실력으로 납득시키는 에이스형에 반응하는 편",
          "무대 한 번 보고 바로 끌리는 무드"
        ],
        default: [
          "쉽게 질리지 않는 사람에게 반응하는 무드",
          "처음엔 가볍게 봤는데 계속 생각나는 타입",
          "알고리즘에 뜨면 그냥 지나치기 힘든 타입"
        ]
      };

      const SHARE_LINES_LOCAL = [
        "이 결과는 그냥 지나치기 어렵겠어",
        "친구랑 결과 비교하면 바로 얘기 나오겠어",
        "이건 취향을 들킨 느낌에 가까워",
        "최애가 바뀔 때마다 다시 해보고 싶어질 거야",
        "부정해도 결국 이런 장면에서 멈추게 돼"
      ];

      function _seedString(str){
        let h = 2166136261;
        for (let i=0; i<str.length; i++){
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }

      function _makeRng(seed){
        let t = seed >>> 0;
        return function(){
          t += 0x6D2B79F5;
          let r = Math.imul(t ^ (t >>> 15), 1 | t);
          r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
          return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
      }

      const deterministicSeed = _seedString([
        payload.year,
        payload.month,
        payload.day,
        payload.hour ?? "unknown",
        payload.gender ?? "unknown",
        selectedGroup
      ].join("|"));

      const rng = _makeRng(deterministicSeed);

      function pickSeeded(arr, salt=0){
        if (!arr || !arr.length) return "";
        const local = _makeRng((deterministicSeed + salt * 2654435761) >>> 0);
        return arr[Math.floor(local() * arr.length) % arr.length];
      }



      function deriveUserArchetype(saju){
        const elems=saju.elements||[0,0,0,0,0]; // 木火土金水
        const strong=(saju.strong||[]).join(" ");
        const weak=(saju.weak||[]).join(" ");
        const hints=saju.personalityHints||[];
        const tags=[];

        const max=Math.max(...elems);
        if(elems[3]>=max-1 || strong.includes("金")) tags.push("cold","sharp","distance","classic","cool","icy","calm");
        if(elems[4]>=max-1 || strong.includes("水")) tags.push("mysterious","dreamy","deep","emotional","quiet","nostalgia");
        if(elems[1]>=max-1 || strong.includes("火")) tags.push("sunshine","performance","bright","passion","energy","expressive");
        if(elems[0]>=max-1 || strong.includes("木")) tags.push("growth","artist","free","creative","fresh","playful");
        if(elems[2]>=max-1 || strong.includes("土")) tags.push("stable","protective","leader","warm","reliable","responsible");

        if(hints.some(h=>h.includes("책임")||h.includes("원칙"))) tags.push("leader","responsible","stable");
        if(hints.some(h=>h.includes("창의")||h.includes("예술"))) tags.push("artist","creative","performance");
        if(hints.some(h=>h.includes("직관")||h.includes("예민"))) tags.push("mysterious","sensitive","distance","emotional");
        if(hints.some(h=>h.includes("독립")||h.includes("경쟁"))) tags.push("independent","cool","power","confidence");

        if(weak.includes("火")) tags.push("sunshine","bright","energy");
        if(weak.includes("水")) tags.push("deep","mysterious","emotional");
        if(weak.includes("金")) tags.push("cold","classic","visual","distance");
        if(weak.includes("木")) tags.push("fresh","growth","playful");
        if(weak.includes("土")) tags.push("stable","protective","warm");

        return [...new Set(tags)];
      }

      function scoreIdolByTags(userTags,idol){
        const set=new Set(userTags);
        let score=0;
        for(const tag of idol.tags||[]){
          if(set.has(tag)) score+=8;
        }
        const affinities = {
          cold:["distance","icy","classic","visual","mysterious","cool"],
          mysterious:["quiet","distance","dreamy","cat","emotional"],
          artist:["creative","performance","unique","dreamy","sensitive"],
          leader:["protective","responsible","stable","reliable","strong"],
          sunshine:["bright","warm","playful","cute","energy"],
          stable:["warm","reliable","calm","protective","classic"],
          ace:["performance","skill","hardworking","growth","power"],
          cute:["playful","soft","warm","fresh","charm"]
        };
        for(const t of userTags){
          for(const near of affinities[t]||[]){
            if((idol.tags||[]).includes(near)) score+=3;
          }
        }
        // deterministic small variation by birthday, not random
        score += ((payload.year + payload.month*7 + payload.day*13 + idol.name.length) % 6);
        return score;
      }

      function pickMainType(tags, topIdol){
        const all=[...(tags||[]), ...(topIdol?.tags||[])];
        if(all.some(t=>["cold","icy","distance","cool"].includes(t))) return "cold";
        if(all.some(t=>["mysterious","dreamy","quiet","cat"].includes(t))) return "mysterious";
        if(all.some(t=>["sunshine","bright","energy"].includes(t))) return "sunshine";
        if(all.some(t=>["leader","protective","responsible","stable"].includes(t))) return "leader";
        if(all.some(t=>["artist","creative","unique"].includes(t))) return "artist";
        if(all.some(t=>["cute","playful","soft"].includes(t))) return "cute";
        if(all.some(t=>["ace","performance","power","skill"].includes(t))) return "ace";
        return "default";
      }

      function chooseLine(pool, salt=0){ return pickSeeded(pool, salt); }

      function idolCoreTrait(idol){
        const tags = idol.tags || [];
        if(tags.some(t=>['dance','performance','power','ace','skill'].includes(t))) return '무대 집중력과 퍼포먼스 에너지';
        if(tags.some(t=>['cold','icy','distance','cool','mysterious','quiet'].includes(t))) return '쉽게 읽히지 않는 거리감';
        if(tags.some(t=>['warm','sunshine','bright','cute','playful'].includes(t))) return '밝고 자연스럽게 긴장을 풀어주는 결';
        if(tags.some(t=>['leader','protective','responsible','stable','reliable'].includes(t))) return '중심을 잡아주는 안정감';
        if(tags.some(t=>['artist','creative','unique','free'].includes(t))) return '자기 세계가 선명한 무드';
        if(tags.some(t=>['visual','classic','elegant','royal'].includes(t))) return '한 번 보면 잔상이 남는 비주얼 무드';
        if(tags.some(t=>['vocal','emotional','sensitive'].includes(t))) return '감정선이 목소리와 표정에 남는 타입';
        return '작은 장면까지 다시 보게 만드는 분위기';
      }
      function buildMatchReason(idol, idx){
        const name = String(idol.name||'').replace(/\s*\([^)]*\)/g,'') || '이 아이돌';
        const trait = idolCoreTrait(idol);
        const openings = [
          `${name}의 ${trait}이 내 반응 포인트와 겹쳐서, 볼수록 왜 끌리는지 선명해져`,
          `내 취향의 핵심이 ${name}의 ${trait}에서 잡혀서, 이미지보다 성향이 먼저 와닿아`,
          `${name}의 ${trait}에서 내 취향의 빈칸이 잡혀서, 왜 눈이 가는지 납득이 돼`
        ];
        return openings[idx % openings.length];
      }

      const theme = FANDOM_THEMES[selectedGroup] || FANDOM_THEMES.ALL;
      const userArchetypeTags = deriveUserArchetype(saju);
      const pool = selectedGroup && selectedGroup !== "ALL"
        ? IDOL_ARCHETYPE_DB.filter(i=> selectedGroup==="NCT" ? (i.group==="NCT" || i.group==="NCT 127" || i.group==="NCT DREAM" || i.group==="WayV") : i.group===selectedGroup)
        : IDOL_ARCHETYPE_DB;

      const ranked = [...(pool.length ? pool : IDOL_ARCHETYPE_DB)]
        .map(i=>({...i, matchScore:scoreIdolByTags(userArchetypeTags,i)}))
        .sort((a,b)=> (b.matchScore-a.matchScore) || a.name.localeCompare(b.name));

      const top = ranked[0];
      const second = ranked[1] || ranked[0];
      const third = ranked[2] || ranked[0];
      const mainType = pickMainType(userArchetypeTags, top);
      const title = chooseLine(TITLE_LINES[mainType] || TITLE_LINES.default, top.name.length);
      const shareLine = chooseLine(SHARE_LINES_LOCAL, second.name.length);
      const scoreBase = Math.min(97, Math.max(82, 82 + (top.matchScore % 16)));

      function buildScenePackage(top, mainType){
        const scenePools = {
          cold: [
            '무대 전체보다\n내 취향이 먼저 반응하는 지점이 잡히는 쪽.',
            '왜 눈이 가는지\n조용한 컷 안에서 더 납득되는 쪽.',
            '오늘은 가까운 리액션보다\n조용히 시선을 거두는 장면이 더 강함.'
          ],
          mysterious: [
            '오늘 유독 눈이 가는 건\n설명하기 어려운 정적이 생기는 순간.',
            '팬들이 다시 볼 장면은\n말보다 공백이 먼저 남는 컷.',
            '가까워지는 장면보다\n살짝 거리를 두는 순간에 더 끌리는 쪽.'
          ],
          sunshine: [
            '웃는 장면보다\n자연스럽게 긴장이 풀리는 순간에 먼저 반응하는 쪽.',
            '오늘은 밝은 에너지 안에서\n잠깐 집중하는 순간이 저장 포인트.',
            '팬들이 멈추는 구간은\n텐션이 올라가기 전 짧은 숨 고르기.'
          ],
          leader: [
            '오늘은 센터에 서는 장면보다\n옆을 챙기는 짧은 순간이 더 남음.',
            '말없이 중심을 잡는 컷에서\n왜 끌리는지 납득되는 쪽.',
            '큰 액션보다\n주변 공기를 정리하는 타이밍이 더 강함.'
          ],
          artist: [
            '퍼포먼스보다\n자기 세계가 보이는 순간에 성향이 먼저 와닿는 쪽.',
            '팬들이 다시 보는 건\n기술보다 감정선이 새는 순간.',
            '무대가 끝난 뒤보다\n그 사람의 결이 보이는 순간에 더 끌리는 쪽.'
          ],
          cute: [
            '귀여운 장면보다\n꾸미지 않은 반응에서 성향이 먼저 와닿는 쪽.',
            '장난 뒤에 살짝 풀리는 표정에서\n왜 눈이 가는지 납득되는 쪽.',
            '오늘은 밝은 리액션보다\n무심코 나온 작은 반응이 더 강함.'
          ],
          ace: [
            '잘하는 장면보다\n집중이 풀리는 순간에 사람 자체가 더 선명해지는 쪽.',
            '완성도보다\n집중이 풀리는 찰나에서 더 와닿는 쪽.',
            '무대 위 실력보다\n그 직후의 여운이 더 크게 남는 날.'
          ],
          default: [
            '무대 전체보다\n짧게 지나간 표정에서 왜 끌리는지 납득되는 쪽.',
            '예상한 파트보다\n작은 반응에서 성향이 먼저 와닿는 쪽.',
            '오늘 유독 눈이 가는 순간은\n크게 보여준 컷보다 조용히 남는 컷.'
          ]
        };
        const fanEnergyPool = [
          '가까워진다기보다, 이상하게 계속 확인하게 되는 흐름.',
          '처음보다 다시 볼수록 왜 끌리는지 선명해지는 쪽.',
          '팬심이 크게 터지기보다 조용히 납득되는 타입.',
          '말로 풀기 전에 성향이 먼저 와닿는 흐름.'
        ];
        const levels = ['OPEN','ACTIVE','LOCKED','INTENSE'];
        const tone = ['Midnight Glow','Soft Static','Quiet Intensity','Afterstage Blue','Velvet Pulse'];
        const mood = ['Ending Scene','Quiet Focus','Soft Tension','Camera-off Mood','Replay Moment'];
        const focus = ['Eyes','Pause','Smile Fade','Side Glance','Ending Glance'];
        return {
          syncLevel: chooseLine(levels, 21),
          todayScene: { title: chooseLine(scenePools[mainType] || scenePools.default, 22), sub: chooseLine(fanEnergyPool, 23) },
          fanEnergy: chooseLine(fanEnergyPool, 24),
          biasProfile: {
            auraTone: chooseLine(tone, 25),
            stageMood: chooseLine(mood, 26),
            fanEnergy: chooseLine(['Slow Burn','Save Energy','Soft Pull','Replay Mood'], 27),
            focusSignal: chooseLine(focus, 28)
          }
        };
      }

      const scenePackage = buildScenePackage(top, mainType);
      const variety = buildVarietyNarrative(top?.tags || [], pickSeeded);

      const topReason = buildMatchReason(top, 0);
      const secondReason = buildMatchReason(second, 1);
      const thirdReason = buildMatchReason(third, 2);
      const detailLines = [
        '❖ SIGNAL MATCH',
        '',
        topReason + '.',
        '',
        '❖ 끌리는 이유',
        '',
        `${top.name}에게 먼저 반응하는 이유는 겉으로 크게 보이는 장면보다, 내 취향이 걸리는 결이 분명하기 때문이야.`,
        '',
        '❖ 팬심 포인트',
        '',
        scenePackage.fanEnergy
      ];

      const result = {
        title,
        highlight: variety.aura[0],
        fandom: theme.fandom,
        fandomAccent: theme.accent,
        fandomColor: theme.color,
        selectedGroup,
        shareLine: topReason,
        userArchetypeTags,
        idolMatches: [top, second, third].map(function(i, idx) {
          const rs=[topReason, secondReason, thirdReason];
          return {
            name: i.name,
            reason: rs[idx] || buildMatchReason(i, idx),
            score: Math.max(77, scoreBase - idx * 5)
          };
        }),
        detail: detailLines.join('\n'),
        syncLevel: scenePackage.syncLevel,
        todayScene: { title: topReason + '.', sub: `${top.name}에게 왜 눈이 가는지 납득되는 포인트.` },
        fanEnergy: scenePackage.fanEnergy,
        biasProfile: scenePackage.biasProfile
      };

      return res.status(200).json(localizeIdolResult(result, lang));
    }

    // ── Compat mode ──
    if (payload.mode === 'compat') {
      if (!payload.year||!payload.month||!payload.day) throw new Error("Missing person A birth date");
      if (!payload.partnerYear||!payload.partnerMonth||!payload.partnerDay) throw new Error("Missing person B birth date");
      const sajuA = buildSaju({ year:payload.year, month:payload.month, day:payload.day, hour:payload.hour });
      const sajuB = buildSaju({ year:payload.partnerYear, month:payload.partnerMonth, day:payload.partnerDay, hour:payload.partnerHour });
      const idolName = String(payload.idolName||"최애").slice(0,40);
      const compatKey = JSON.stringify([sajuA.pillars, sajuB.pillars, idolName, lang]);
      if (CACHE.has(compatKey)) return res.status(200).json(CACHE.get(compatKey));
      const result = buildCompatLocalDetail({ sajuA, sajuB, lang, idolName });
      const titleMap = {
        Korean:`나와 ${idolName} 사이에 잡힌 관계 시그널`, English:"Your Bias Sync",
        Japanese:"推しとのシンク", Chinese:"我和本命的同步感", Spanish:"Mi sync con mi bias"
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
      const free=makeFreeHooks({saju, question:payload.question, tarotCard:payload.tarotCard, lang, signalCat:payload.signalCat});
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
        const astrologyRaw=await fetchMoodData(payload);
        astrologySummary=summarizeMood(astrologyRaw);
      } catch(e) {
        // Mood API 실패해도 saju-only로 계속 진행
        console.error("MoodAPI fallback:", e.message);
      }
    }
    const free=makeFreeHooks({saju, question:payload.question, tarotCard:payload.tarotCard, lang, signalCat:payload.signalCat});
    const response={
      free, paid:true, meta:{saju,astrologySummary},
      detail:await buildPaidDetail({saju, astrologySummary, question:payload.question, tarotCard:payload.tarotCard, lang, signalCat:payload.signalCat})
    };
    CACHE.set(key, response);
    return res.status(200).json(response);
  }catch(e){
    console.error('[api/analyze] failed', { mode: req?.body?.mode, message: e?.message, stack: e?.stack });
    return res.status(500).json({
      error: e.message || "Unknown error",
      userMessage: "시그널 연결이 잠시 흔들리고 있어. 잠깐 후 다시 시도해줘."
    });
  }
}


const SIGNAL_DYNAMIC_COPY = {
  ko: {
    attraction: [
      "가까워질 듯하다가도 쉽게 읽히지 않는 무드에 오래 시선이 머무는 편",
      "말보다 눈빛이나 텐션 변화에 더 반응하게 되는 흐름",
      "조용한 순간인데도 이상하게 다시 보게 만드는 타입",
      "친근한데도 완전히 닿지는 않는 거리감에 끌리는 무드",
      "강한 표현보다 은근한 무드 변화가 오래 남는 스타일",
      "무대보다 짧게 스치는 표정에서 더 몰입하게 되는 흐름"
    ],
    memberReasons: [
      "팬들이 오래 저장하는 포인트가 표정보다 무드에 가까운 편",
      "직캠보다 짧은 리액션 순간이 더 오래 기억에 남는 타입",
      "무심하게 지나가는 장면인데도 유독 다시 찾게 되는 무드가 있어",
      "말을 많이 하지 않아도 존재감이 길게 남는 흐름",
      "과한 표현 없이도 팬 반응을 오래 붙잡는 에너지가 강한 편",
      "선명한 캐릭터보다 설명 안 되는 무드로 기억되는 타입"
    ],
    premium: [
      "오늘은 유독 팬들이 ‘왜 계속 생각나지?’라는 느낌을 오래 가져가기 쉬운 흐름",
      "무대 자체보다 작은 제스처 하나가 더 오래 회자될 수 있는 날",
      "오늘은 가까워 보이는 순간보다 살짝 거리감 있는 무드에 더 몰입하게 될 수 있어",
      "팬들이 각자 다르게 해석할 수 있는 표정 변화가 강하게 남는 흐름",
      "오늘은 말보다 무드, 무드보다 타이밍 쪽에 시선이 더 오래 남을 수 있어"
    ]
  }
};

function pickDynamic(arr, seed){
  if(!Array.isArray(arr) || !arr.length) return '';
  return arr[Math.abs(seed)%arr.length];
}


// dynamic fandom emotional copy enabled
// results now rotate by seed/group/member/date for less repetitive output


// anti repetitive fandom phrasing
const DAILY_VARIATION_POOL = {
  intro:[
    "오늘은 말보다 작은 반응 하나가 더 기억되기 쉬운 날",
    "유독 팬들이 같은 장면을 여러 번 돌려보게 되는 흐름",
    "무대보다 짧은 순간에서 존재감이 더 강하게 남을 수 있어",
    "오늘은 과한 표현보다 조용한 공기감이 더 이어질 수 있어",
    "평소보다 눈빛이나 텐션 변화에 반응이 커질 가능성이 있어"
  ],
  mood:[
    "겉으로는 차분해 보여도 예상보다 감정선이 섬세하게 흔들릴 수 있어",
    "오늘은 웃고 지나간 장면 하나가 팬들 사이에서 계속 언급될 수 있어",
    "강한 무드보다 편안한 순간에서 더 몰입감이 생길 가능성이 있어",
    "유독 자연스러운 리액션이 오래 캡처될 수 있는 날",
    "오늘은 꾸민 느낌보다 무심한 공기감에 반응이 커질 수 있어"
  ],
  sync:[
    "오늘은 팬들이 같은 장면을 서로 다르게 해석하게 될 가능성이 있어",
    "짧은 눈맞춤 같은 순간이 예상보다 길게 회자될 수 있어",
    "사진 한 장보다 영상 클립 쪽에 반응이 더 몰릴 수 있는 무드",
    "오늘은 조용한 눈빛 변화가 더 큰 여운으로 이어질 수 있어",
    "팬들 사이에서 '오늘 뭔가 다르다'는 반응이 많아질 수 있어"
  ]
};

function removeRepeatedStyle(text){
  if(!text) return text;

  const replacements = [
    ['오래 남','계속 기억'],
    ['시선이','반응이'],
    ['무드','공기감'],
    ['타이밍','순간'],
    ['표정','눈빛'],
    ['흐름','결']
  ];

  let used = new Set();

  replacements.forEach(([from,to])=>{
    const first = text.indexOf(from);
    if(first !== -1){
      const second = text.indexOf(from, first + from.length);
      if(second !== -1){
        text = text.slice(0, second) + to + text.slice(second + from.length);
      }
    }
  });

  return text;
}
