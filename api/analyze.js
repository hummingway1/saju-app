// Cost-optimized analyzer with gentler fortune-teller tone
export const config = {
  runtime: "nodejs"
};

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS_EN = ['Wood','Fire','Earth','Metal','Water'];
const CACHE = new Map();

function cacheKey(payload){
  const h = payload.hour === "모름" ? "unknown" : payload.hour;
  const q = (payload.question || "").trim().slice(0, 120);
  return JSON.stringify({
    y: payload.year, m: payload.month, d: payload.day, h,
    g: payload.gender, lat: round(payload.location?.lat, 3), lon: round(payload.location?.lon, 3),
    q, paid: !!payload.paid
  });
}
function round(n, d=3){ return Number(Number(n).toFixed(d)); }

function yearPillar(y) {
  const si = ((y - 4) % 10 + 10) % 10;
  const bi = ((y - 4) % 12 + 12) % 12;
  return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
}
function monthPillar(y, m) {
  const bi = (m + 1) % 12;
  const ySi = ((y - 4) % 10 + 10) % 10;
  const bases = [2, 4, 6, 8, 0];
  const base = bases[Math.floor(ySi / 2)];
  const si = (base + m - 1) % 10;
  return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
}
function dayPillar(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
  const si = ((jd + 9) % 10 + 10) % 10;
  const bi = ((jd + 1) % 12 + 12) % 12;
  return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
}
function hourPillar(dp, h) {
  const bi = Math.floor((parseInt(h, 10) + 1) / 2) % 12;
  const bases = [0, 2, 4, 6, 8];
  const base = bases[Math.floor(dp.si / 2)];
  const si = (base + bi) % 10;
  return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
}
const STEM_ELEM = [0,0,1,1,2,2,3,3,4,4];
const BRANCH_ELEM = [4,2,0,0,2,1,1,2,3,3,2,4];

function countElements(pillars){
  const c = [0,0,0,0,0];
  for (const p of pillars){
    if (!p) continue;
    c[STEM_ELEM[p.si]]++;
    c[BRANCH_ELEM[p.bi]]++;
  }
  return c;
}
function buildSaju(payload){
  const yp = yearPillar(payload.year);
  const mp = monthPillar(payload.year, payload.month);
  const dp = dayPillar(payload.year, payload.month, payload.day);
  const hp = payload.hour === "모름" ? null : hourPillar(dp, Number(payload.hour));
  const elements = countElements([yp, mp, dp, hp]);
  const max = Math.max(...elements);
  const min = Math.min(...elements);
  return {
    pillars: {
      year: `${yp.stem}${yp.branch}`,
      month: `${mp.stem}${mp.branch}`,
      day: `${dp.stem}${dp.branch}`,
      hour: hp ? `${hp.stem}${hp.branch}` : '미상'
    },
    dayMaster: ELEMENTS_EN[STEM_ELEM[dp.si]],
    elements,
    weak: elements.map((v,i)=>({v,i})).filter(x=>x.v===min).map(x=>ELEMENTS_EN[x.i]),
    strong: elements.map((v,i)=>({v,i})).filter(x=>x.v===max).map(x=>ELEMENTS_EN[x.i])
  };
}

async function fetchAstrologyData(payload){
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;
  if (!userId || !apiKey) throw new Error("ASTROLOGY_API_USER_ID 또는 ASTROLOGY_API_KEY 환경변수가 없다");

  const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
  const hour = payload.hour === "모름" ? 12 : Number(payload.hour);
  const minute = Number(payload.minute || 0);
  const tzone = Number(payload.location?.tzone ?? 9);

  const body = {
    day: Number(payload.day),
    month: Number(payload.month),
    year: Number(payload.year),
    hour,
    min: minute,
    lat: Number(payload.location.lat),
    lon: Number(payload.location.lon),
    tzone,
    house_type: "placidus"
  };

  const resp = await fetch("https://json.astrologyapi.com/v1/planets/tropical", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept-Language": "en"
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`AstrologyAPI 응답 파싱 실패: ${text.slice(0, 200)}`);
  }
  if (!resp.ok) throw new Error(data?.message || `AstrologyAPI 호출 실패 (${resp.status})`);
  if (!Array.isArray(data)) throw new Error("AstrologyAPI 응답 형식이 예상과 다르다");
  return data;
}

function summarizeAstrology(planets){
  const pick = (name) => planets.find(p => p.name === name);
  const sun = pick("Sun");
  const moon = pick("Moon");
  const mercury = pick("Mercury");
  const venus = pick("Venus");
  const mars = pick("Mars");
  const asc = pick("Ascendant");
  return {
    sun: sun ? `${sun.sign} H${sun.house}` : null,
    moon: moon ? `${moon.sign} H${moon.house}` : null,
    mercury: mercury ? `${mercury.sign} H${mercury.house}` : null,
    venus: venus ? `${venus.sign} H${venus.house}` : null,
    mars: mars ? `${mars.sign} H${mars.house}` : null,
    ascendant: asc ? `${asc.sign} H${asc.house}` : null
  };
}

function makeFreeHooks({ saju, astrologySummary, question, tarot }) {
  const q = (question || "").toLowerCase();
  const dm = saju.dayMaster;
  const strong = saju.strong.join(", ");
  const weak = saju.weak.join(", ");

  let decision = "지금의 흐름은 서두르기보다, 마음과 현실의 기준을 먼저 맞추라고 말하고 있습니다.";
  let riskHook = `강하게 드러난 기운(${strong})이 앞서고 약한 기운(${weak})이 뒤로 밀리면, 생각보다 한쪽으로 치우친 판단이 나오기 쉽습니다.`;
  let timingHook = "올해 안에는 한 번 방향이 갈리는 시점이 있습니다. 그 무렵의 선택이 이후의 무게를 바꾸게 됩니다.";

  if (q.includes("이직") || q.includes("직장") || q.includes("career")) {
    if (dm === "Wood" || dm === "Fire") {
      decision = "일의 흐름은 열릴 수 있습니다. 다만 마음이 먼저 지쳐 손을 놓기보다는, 자리를 옮길 이유와 조건을 먼저 또렷하게 세우는 편이 좋습니다.";
      timingHook = `태양 ${astrologySummary.sun || "정보없음"}, 화성 ${astrologySummary.mars || "정보없음"}의 결을 보면, 준비된 이동은 힘이 되지만 충동적인 결정은 오래 남지 않을 수 있습니다.`;
    } else {
      decision = "지금은 무작정 벗어나기보다, 다음 자리를 단단히 만든 뒤 움직이는 편이 더 안정적인 흐름입니다.";
      riskHook = "답답함을 끝내고 싶은 마음만 앞서면, 장소만 바뀐 채 같은 문제를 다시 만나게 될 가능성이 있습니다.";
    }
  } else if (q.includes("연애") || q.includes("사람") || q.includes("결혼") || q.includes("love")) {
    decision = "관계의 문은 열려 있지만, 지금은 감정의 온도차를 가볍게 보면 상처가 남기 쉬운 시기입니다.";
    timingHook = `달 ${astrologySummary.moon || "정보없음"}, 금성 ${astrologySummary.venus || "정보없음"}의 흐름상 마음을 확인해야 할 시점이 머지않아 다가옵니다.`;
  } else if (q.includes("돈") || q.includes("사업") || q.includes("투자") || q.includes("money")) {
    decision = "재물의 흐름은 들어오기보다, 먼저 지키는 쪽에 뜻이 실려 있습니다. 크게 넓히기보다 손실을 줄이는 선택이 더 빛을 냅니다.";
    riskHook = "이번에는 자신감보다 계산이 중요합니다. 마음이 들뜬 순간일수록 숫자를 다시 확인하는 편이 좋습니다.";
  } else {
    if (dm === "Metal" || dm === "Water") {
      decision = "멈춰 있던 것처럼 보여도 안쪽의 물결은 이미 움직이고 있습니다. 다만 너무 빨리 답을 정하려 하기보다, 방향을 먼저 바로잡는 편이 좋습니다.";
    }
  }

  if (tarot?.title) {
    riskHook += ` 지금 손에 닿은 타로의 "${tarot.title}" 역시 같은 결을 조용히 비추고 있습니다.`;
  }

  return {
    title: "당신의 흐름",
    decision: decision + " 지금의 선택은 단순한 우연이 아니라, 오래 쌓인 결이 모습을 드러내는 과정일 수 있습니다.",
    riskHook: riskHook + " 작은 판단 하나가 생각보다 멀리 이어질 수 있으니, 가벼이 넘기지 않는 편이 좋습니다.",
    timingHook: timingHook + " 이 시기를 어떻게 건너가느냐에 따라 다음 장면의 표정이 달라질 수 있습니다."
  };
}

async function buildPaidDetail({ saju, astrologySummary, question, tarot }){
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 없다");

  const prompt = `
너는 사주명리와 서양 점성술을 함께 읽어주는 차분한 해석자다.
점쟁이처럼 과장하거나 명령하지 말고, 신뢰감 있는 포츈텔러처럼 말해라.
중요: 계산은 이미 끝났으니 절대 새 계산을 지어내지 마라. 아래 데이터만 사용해라.

[사주 데이터]
- 년주: ${saju.pillars.year}
- 월주: ${saju.pillars.month}
- 일주: ${saju.pillars.day}
- 시주: ${saju.pillars.hour}
- 일간 성향: ${saju.dayMaster}
- 오행 분포: ${JSON.stringify(saju.elements)}
- 강한 오행: ${saju.strong.join(", ")}
- 약한 오행: ${saju.weak.join(", ")}

[점성술 데이터]
- 태양: ${astrologySummary.sun}
- 달: ${astrologySummary.moon}
- 수성: ${astrologySummary.mercury}
- 금성: ${astrologySummary.venus}
- 화성: ${astrologySummary.mars}
- 상승궁: ${astrologySummary.ascendant}

[타로]
- ${tarot?.title || "없음"}: ${tarot?.message || "없음"}

[질문]
${question || "일반 인생 흐름"}

출력 규칙:
- 한국어
- 아래 4개 섹션만 출력
1. 지금의 결
2. 왜 이런 흐름이 보이는지
3. 조심해야 할 그림자
4. 지금 가장 어울리는 움직임
- 각 섹션은 제목 한 줄 + 2~4문장
- 말투는 상냥하고 신비롭되 과하지 않게
- "~해라" 같은 거친 명령 금지
- "~일 수 있습니다", "~흐름입니다", "~보입니다" 같은 표현 사용
- 무료 결과보다 한층 더 구체적으로
`.trim();

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.65,
      max_tokens: 650,
      messages: [
        { role: "system", content: "너는 계산된 운세 데이터를 차분하고 상냥하게 해석하는 사람이다." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || "OpenAI 호출 실패");
  return data.choices?.[0]?.message?.content || "상세 해석 생성 실패";
}

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const payload = req.body || {};
    const required = ["year","month","day","gender","location"];
    for (const key of required) {
      if (payload[key] == null) throw new Error(`${key} 값이 없다`);
    }

    const key = cacheKey(payload);
    if (CACHE.has(key)) return res.status(200).json(CACHE.get(key));

    const saju = buildSaju(payload);
    const astrologyRaw = await fetchAstrologyData(payload);
    const astrologySummary = summarizeAstrology(astrologyRaw);
    const free = makeFreeHooks({
      saju,
      astrologySummary,
      question: payload.question,
      tarot: payload.tarot
    });

    let response = {
      free,
      paid: !!payload.paid,
      meta: {
        saju,
        astrologySummary
      }
    };

    if (payload.paid) {
      response.detail = await buildPaidDetail({
        saju,
        astrologySummary,
        question: payload.question,
        tarot: payload.tarot
      });
    }

    CACHE.set(key, response);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
}
