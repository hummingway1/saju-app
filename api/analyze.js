// Cost-optimized analyzer
// Free: real Saju + real AstrologyAPI data -> deterministic hooks only
// Paid: same real data + GPT interpretation
//
// Required env vars on Vercel:
// OPENAI_API_KEY=...
// ASTROLOGY_API_USER_ID=...
// ASTROLOGY_API_KEY=...

export const config = {
  runtime: "nodejs"
};

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS_EN = ['Wood','Fire','Earth','Metal','Water'];

// Simple in-memory cache for serverless warm instances.
// Replace with KV/DB if you want persistent cache across cold starts.
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

// GanZhi approximations carried from original app logic
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

const STEM_ELEM = [0,0,1,1,2,2,3,3,4,4]; // Wood Fire Earth Metal Water
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
  if (!userId || !apiKey) {
    throw new Error("ASTROLOGY_API_USER_ID 또는 ASTROLOGY_API_KEY 환경변수가 없다");
  }

  const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
  const hour = payload.hour === "모름" ? 12 : Number(payload.hour);
  const minute = Number(payload.minute || 0);
  // Minimal timezone fallback; for Korea this is 9.
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

  // Real AstrologyAPI endpoint
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
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`AstrologyAPI 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  if (!resp.ok) {
    throw new Error(data?.message || `AstrologyAPI 호출 실패 (${resp.status})`);
  }
  if (!Array.isArray(data)) {
    throw new Error("AstrologyAPI 응답 형식이 예상과 다르다");
  }
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

  let decision = "지금은 크게 서두르기보다 기준을 먼저 세우는 쪽이 유리하다.";
  let riskHook = `강한 오행(${strong})이 앞서고 약한 오행(${weak})이 뒤로 밀리면, 판단이 한쪽으로 쏠릴 수 있다.`;
  let timingHook = "올해 안에 한 번 흐름이 갈리는 구간이 온다. 그때 움직이면 결과 차이가 크게 난다.";

  if (q.includes("이직") || q.includes("직장") || q.includes("career")) {
    if (dm === "Wood" || dm === "Fire") {
      decision = "이직은 가능성이 있다. 다만 감정으로 퇴사부터 찍는 건 위험하다.";
      timingHook = `태양 ${astrologySummary.sun || "정보없음"}, 화성 ${astrologySummary.mars || "정보없음"} 흐름상 먼저 준비하고 움직이는 쪽이 낫다.`;
    } else {
      decision = "당장 옮기기보다 조건을 더 확보한 뒤 움직이는 게 안전하다.";
      riskHook = "눈앞의 답답함만 보고 옮기면 다음 자리에서 같은 문제가 반복될 수 있다.";
    }
  } else if (q.includes("연애") || q.includes("사람") || q.includes("결혼") || q.includes("love")) {
    decision = "관계는 가능성이 있지만, 지금은 감정의 온도차를 과소평가하면 깨지기 쉽다.";
    timingHook = `달 ${astrologySummary.moon || "정보없음"}, 금성 ${astrologySummary.venus || "정보없음"} 흐름상 확인해야 할 시점이 곧 온다.`;
  } else if (q.includes("돈") || q.includes("사업") || q.includes("투자") || q.includes("money")) {
    decision = "확장보다 보수적으로 계산하는 쪽이 유리하다. 한 번에 크게 베팅하는 그림은 아니다.";
    riskHook = "이번엔 수익보다 손실 방어가 더 중요하다. 특히 과신이 손해를 키울 수 있다.";
  } else {
    if (dm === "Metal" || dm === "Water") {
      decision = "지금은 버티기보다 방향을 조정하는 쪽이 낫다. 단, 조용히 준비하고 움직여라.";
    }
  }

  if (tarot?.title) {
    riskHook += ` 타로의 "${tarot.title}" 흐름도 같은 방향을 밀고 있다.`;
  }

  return {
    title: "핵심 결론",
    decision,
    riskHook,
    timingHook
  };
}

async function buildPaidDetail({ saju, astrologySummary, question, tarot }){
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 없다");

  const prompt = `
너는 사주명리와 서양 점성술을 함께 해석하는 분석가다.
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
- 한국어로 쓴다
- 쓸데없는 인사 없이 바로 시작
- 아래 4개 섹션으로만 쓴다
1. 결론
2. 왜 이렇게 보이는지
3. 지금 조심할 점
4. 가장 유리한 행동
- 각 섹션은 2~4문장
- 말투는 단정하고 현실적으로
- 무료 결과와 겹치지 않게 더 구체적으로
`.trim();

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        { role: "system", content: "계산된 데이터를 해석만 하는 전문가다." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || "OpenAI 호출 실패");
  }
  return data.choices?.[0]?.message?.content || "상세 분석 생성 실패";
}

export default async function handler(req, res){
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body || {};
    const required = ["year","month","day","gender","location"];
    for (const key of required) {
      if (payload[key] == null) throw new Error(`${key} 값이 없다`);
    }

    const key = cacheKey(payload);
    if (CACHE.has(key)) {
      return res.status(200).json(CACHE.get(key));
    }

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
