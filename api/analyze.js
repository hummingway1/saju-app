export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, month, day, hour, minute, gender, lang, focusQuestion } = req.body;
  const isEn = lang === "en";
  const userQuestion = typeof focusQuestion === "string" ? focusQuestion.trim().slice(0, 220) : "";

  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const ELEMENTS = ['Wood','Fire','Earth','Metal','Water'];
  const ELEMENTS_EN = ['Wood','Fire','Earth','Metal','Water'];
  const ELEMENTS_KO = ['목(木)','화(火)','토(土)','금(金)','수(水)'];

  const STEM_ELEM = [0,0,1,1,2,2,3,3,4,4];
  const BRANCH_ELEM = [4,2,0,0,2,1,1,2,3,3,2,4];

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

  function countElems(pillars) {
    const c = [0, 0, 0, 0, 0];
    pillars.forEach(p => {
      if (!p) return;
      c[STEM_ELEM[p.si]]++;
      c[BRANCH_ELEM[p.bi]]++;
    });
    return c;
  }

  function majorFortune(yp, gender) {
    const yangYear = yp.si % 2 === 0;
    const forward = (yangYear && gender === 'male') || (!yangYear && gender === 'female');
    return Array.from({ length: 8 }, (_, i) => {
      const n = i + 1;
      const si = forward ? (yp.si + n) % 10 : ((yp.si - n) % 10 + 10) % 10;
      const bi = forward ? (yp.bi + n) % 12 : ((yp.bi - n) % 12 + 12) % 12;
      return { startAge: n * 10 - 10 || 1, endAge: n * 10, stem: STEMS[si], branch: BRANCHES[bi], elemIdx: STEM_ELEM[si] };
    });
  }

  const noTime = !hour || hour === "모름" || hour === "Unknown";
  const hourNum = noTime ? null : parseInt(hour, 10);

  const yp = yearPillar(year);
  const mp = monthPillar(year, month);
  const dp = dayPillar(year, month, day);
  const hp = noTime ? null : hourPillar(dp, hourNum);

  const elems = countElems([yp, mp, dp, hp]);
  const minE = Math.min(...elems);
  const maxE = Math.max(...elems);
  const weakIdx = elems.map((c, i) => ({ c, i })).filter(e => e.c === minE).map(e => e.i);
  const strongIdx = elems.map((c, i) => ({ c, i })).filter(e => e.c === maxE).map(e => e.i);
  const dayElemIdx = STEM_ELEM[dp.si];

  const fortune = majorFortune(yp, gender);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const age = currentYear - year;
  const curF = fortune.find(f => age >= f.startAge && age <= f.endAge) || fortune[0];
  const nxtF = fortune[fortune.indexOf(curF) + 1];

  const pillarsKO = `년주: ${yp.stem}${yp.branch} / 월주: ${mp.stem}${mp.branch} / 일주: ${dp.stem}${dp.branch}${hp ? ` / 시주: ${hp.stem}${hp.branch}` : ' / 시주: 미상'}`;
  const pillarsEN = `Year: ${yp.stem}${yp.branch} / Month: ${mp.stem}${mp.branch} / Day: ${dp.stem}${dp.branch}${hp ? ` / Hour: ${hp.stem}${hp.branch}` : ' / Hour: Unknown'}`;
  const elemKO = ELEMENTS.map((_, i) => `${ELEMENTS_KO[i]}: ${elems[i]}개${weakIdx.includes(i) ? ' ★결핍' : strongIdx.includes(i) ? ' ▲과다' : ''}`).join(', ');
  const elemEN = ELEMENTS.map((_, i) => `${ELEMENTS_EN[i]}: ${elems[i]}${weakIdx.includes(i) ? ' ★deficient' : strongIdx.includes(i) ? ' ▲excess' : ''}`).join(', ');
  const weakKO = weakIdx.map(i => ELEMENTS_KO[i]).join(', ');
  const weakEN = weakIdx.map(i => ELEMENTS_EN[i]).join(', ');
  const strongKO = strongIdx.map(i => ELEMENTS_KO[i]).join(', ');
  const strongEN = strongIdx.map(i => ELEMENTS_EN[i]).join(', ');
  const dayElemKO = ELEMENTS_KO[dayElemIdx];
  const dayElemEN = ELEMENTS_EN[dayElemIdx];
  const fortuneListKO = fortune.slice(0, 6).map(f => `${f.startAge}~${f.endAge}세: ${f.stem}${f.branch}`).join(' | ');
  const fortuneListEN = fortune.slice(0, 6).map(f => `Age ${f.startAge}-${f.endAge}: ${f.stem}${f.branch}`).join(' | ');
  const curFKO = `현재 대운(${curF?.startAge}~${curF?.endAge}세): ${curF?.stem}${curF?.branch}`;
  const curFEN = `Current fortune (age ${curF?.startAge}-${curF?.endAge}): ${curF?.stem}${curF?.branch}`;
  const nxtFKO = nxtF ? `다음 대운(${nxtF.startAge}~${nxtF.endAge}세): ${nxtF.stem}${nxtF.branch}` : '';
  const nxtFEN = nxtF ? `Next fortune (age ${nxtF.startAge}-${nxtF.endAge}): ${nxtF.stem}${nxtF.branch}` : '';

  const focusLine = userQuestion
    ? (isEn
        ? `The user's main question is: "${userQuestion}". Thread this into the headline, the essence, and especially the sections on destiny path, love, wealth, and now. Give grounded directional guidance rather than vague poetry.`
        : `사용자의 핵심 질문은 다음입니다: "${userQuestion}". 이 질문을 headline, essence, 그리고 특히 운명적 길, 사랑과 상처, 재물의 흐름, 지금 섹션에 유기적으로 반영하세요. 뜬구름 잡는 문장보다 방향성이 있는 조언을 주세요.`)
    : (isEn
        ? `No specific question was given. Deliver a general but decision-useful reading.`
        : `특정 질문은 없습니다. 기본 종합 리딩이되, 실제 선택에 도움 되는 방향으로 해석하세요.`);

  const systemPrompt = isEn
    ? `You are a master BaZi reader. You receive exact calculated Four Pillars data. Interpret it accurately and never invent chart data. Speak directly to the person as "you" with clarity, restraint, and confidence. Avoid overblown mysticism. Return only valid JSON.`
    : `당신은 사주명리학 대가입니다. 정확히 계산된 사주 데이터를 받습니다. 반드시 이 데이터 기반으로만 해석하고, 차트 정보를 임의로 만들지 마세요. "당신"에게 직접 말하되 선명하고 절제된 어조를 유지하세요. 과장된 신비주의는 피하고 유효한 JSON만 반환하세요.`;

  const userPrompt = isEn ? `
=== EXACT CALCULATED FOUR PILLARS ===
${pillarsEN}
Day Master: ${dayElemEN}

=== FIVE ELEMENTS ===
${elemEN}
Deficient (need): ${weakEN}
Excess (control needed): ${strongEN}

=== MAJOR FORTUNE PERIODS ===
${fortuneListEN}
${curFEN}
${nxtFEN}

Person: Age ${age}, ${gender === 'male' ? 'Male' : 'Female'}, Born ${month}/${day}/${year}${noTime ? '' : `, ${hour}:${minute || '00'}`}
Current: ${currentYear}, month ${currentMonth}
${focusLine}

RULES:
- Base all readings on the actual Day Master (${dayElemEN}) and element counts above.
- Deficient ${weakEN} -> name specific organs affected (Wood=liver/eyes, Fire=heart, Earth=stomach/spleen, Metal=lungs/skin, Water=kidneys/bones).
- Excess ${strongEN} -> explain impact on personality and health.
- Use the actual Daiyun ages for turning points.
- Make the reading useful for decisions.
- Do not claim certainty.
- Keep each body under 3 sentences.

Return JSON:
{
  "headline":"one sharp line",
  "essence":"2 sentences on Day Master nature and present momentum",
  "sections":[
    {"id":"personality","title":"Your Inner Self","icon":"✦","body":"3 sentences based on Day Master and balance"},
    {"id":"body","title":"Body & Vital Energy","icon":"◎","body":"3 sentences on deficient organs and imbalance risk"},
    {"id":"career","title":"Destiny Path","icon":"◈","body":"3 sentences with career direction and actual fortune ages"},
    {"id":"love","title":"Love & Wounds","icon":"◇","body":"3 sentences on attachment and emotional patterns"},
    {"id":"wealth","title":"Wealth & Fortune","icon":"◉","body":"3 sentences on money pattern, caution, and timing"},
    {"id":"now","title":"${currentYear} — Right Now","icon":"◐","body":"3 sentences based on current Daiyun ${curF?.stem}${curF?.branch}"},
    {"id":"lifepath","title":"Arc of Fate","icon":"∞","body":"3 sentences with actual Daiyun turning points"}
  ],
  "locked":{
    "periods":{"early":"2 sentences from early fortune periods","mid":"2 sentences from middle fortune periods","late":"2 sentences from later fortune periods"},
    "yearly":[
      {"year":${currentYear},"fortune":"2 sentences for ${currentYear}"},
      {"year":${currentYear + 1},"fortune":"2 sentences for ${currentYear + 1}"},
      {"year":${currentYear + 2},"fortune":"1-2 sentences for ${currentYear + 2}"}
    ],
    "monthly":"2 sentences for month ${currentMonth}",
    "daily":"1 sentence for today"
  }
}` : `
=== 정확히 계산된 사주팔자 ===
${pillarsKO}
일간: ${dayElemKO}

=== 오행 분석 ===
${elemKO}
결핍 오행: ${weakKO}
과다 오행: ${strongKO}

=== 대운 흐름 ===
${fortuneListKO}
${curFKO}
${nxtFKO}

기본 정보: ${age}세, ${gender === 'male' ? '남성' : '여성'}, ${year}년 ${month}월 ${day}일생${noTime ? '' : `, ${hour}시 ${minute || '00'}분`}
현재: ${currentYear}년 ${currentMonth}월
${focusLine}

해석 규칙:
- 모든 해석은 실제 일간(${dayElemKO})과 오행 수치 기반.
- 결핍 오행 ${weakKO} -> 구체적 장기 영향 명시 (목=간/눈, 화=심장, 토=위장/비장, 금=폐/피부, 수=신장/뼈).
- 과다 오행 ${strongKO} -> 성격과 건강에 미치는 영향.
- 실제 대운 나이를 전환점으로 언급.
- 조언은 선택에 도움 되게, 그러나 단정적으로 말하지 말 것.
- 각 body는 최대 3문장.

JSON 반환:
{
  "headline":"날카로운 한 줄",
  "essence":"일간 기질과 현재 흐름을 보여주는 2문장",
  "sections":[
    {"id":"personality","title":"당신의 내면","icon":"✦","body":"일간과 균형 기반 3문장"},
    {"id":"body","title":"신체와 건강","icon":"◎","body":"결핍 장기와 불균형 리스크 3문장"},
    {"id":"career","title":"운명적 길","icon":"◈","body":"직업 방향과 실제 대운 나이를 담은 3문장"},
    {"id":"love","title":"사랑과 상처","icon":"◇","body":"애착과 감정 패턴 3문장"},
    {"id":"wealth","title":"재물의 흐름","icon":"◉","body":"돈의 패턴, 주의점, 타이밍 3문장"},
    {"id":"now","title":"${currentYear}년 — 지금","icon":"◐","body":"현재 대운 ${curF?.stem}${curF?.branch} 기반 3문장"},
    {"id":"lifepath","title":"운명의 궤적","icon":"∞","body":"실제 대운 전환점 기반 3문장"}
  ],
  "locked":{
    "periods":{"early":"초년 대운 기반 2문장","mid":"중년 대운 기반 2문장","late":"후기 대운 기반 2문장"},
    "yearly":[
      {"year":${currentYear},"fortune":"${currentYear}년 2문장"},
      {"year":${currentYear + 1},"fortune":"${currentYear + 1}년 2문장"},
      {"year":${currentYear + 2},"fortune":"${currentYear + 2}년 1~2문장"}
    ],
    "monthly":"${currentMonth}월 2문장",
    "daily":"오늘 1문장"
  }
}`;

  const seed = parseInt(`${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hourNum || 12).padStart(2, '0')}`, 10) % 2147483647;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.75,
        max_tokens: 4000,
        seed,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || "API error");

    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    parsed._bazi = {
      pillars: {
        year: `${yp.stem}${yp.branch}`,
        month: `${mp.stem}${mp.branch}`,
        day: `${dp.stem}${dp.branch}`,
        hour: hp ? `${hp.stem}${hp.branch}` : '?'
      },
      elements: elems,
      weak: weakIdx.map(i => ELEMENTS[i]),
      strong: strongIdx.map(i => ELEMENTS[i]),
      dayMaster: ELEMENTS[dayElemIdx],
      focusQuestion: userQuestion || null
    };

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
