// v8 — 실제 사주 계산 후 GPT에 전달
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, month, day, hour, minute, gender, lang } = req.body;
  const isEn = lang === "en";

  /* ══════════════════════════════════════════
     1. 실제 사주 계산
  ══════════════════════════════════════════ */
  const STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const ELEMENTS    = ['木','火','金','水','土'];
  const ELEMENTS_EN = ['Wood','Fire','Metal','Water','Earth'];
  const ELEMENTS_KO = ['목(木)','화(火)','금(金)','수(水)','토(土)'];

  // 오행 인덱스: 木0 火1 金2 水3 土4
  const STEM_ELEM   = [0,0,1,1,4,4,2,2,3,3];
  const BRANCH_ELEM = [3,4,0,0,4,1,1,4,2,2,4,3];

  // 년주
  function yearPillar(y) {
    const si = ((y - 4) % 10 + 10) % 10;
    const bi = ((y - 4) % 12 + 12) % 12;
    return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
  }

  // 월주
  function monthPillar(y, m) {
    const bi = (m + 1) % 12; // 1월→寅(2idx)
    const ySi = ((y - 4) % 10 + 10) % 10;
    const bases = [2, 4, 6, 8, 0];
    const base = bases[Math.floor(ySi / 2)];
    const si = (base + m - 1) % 10;
    return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
  }

  // 일주 (율리우스일)
  function dayPillar(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yr = y + 4800 - a;
    const mo = m + 12 * a - 3;
    const jd = d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
    const si = ((jd + 9) % 10 + 10) % 10;
    const bi = ((jd + 1) % 12 + 12) % 12;
    return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
  }

  // 시주
  function hourPillar(dp, h) {
    const bi = Math.floor((parseInt(h) + 1) / 2) % 12;
    const bases = [0, 2, 4, 6, 8];
    const base = bases[Math.floor(dp.si / 2)];
    const si = (base + bi) % 10;
    return { stem: STEMS[si], branch: BRANCHES[bi], si, bi };
  }

  // 오행 카운트
  function countElems(pillars) {
    const c = [0, 0, 0, 0, 0];
    pillars.forEach(p => { if (!p) return; c[STEM_ELEM[p.si]]++; c[BRANCH_ELEM[p.bi]]++; });
    return c;
  }

  // 대운
  function majorFortune(yp, gender, y) {
    const yangYear = yp.si % 2 === 0;
    const forward = (yangYear && gender === 'male') || (!yangYear && gender === 'female');
    return Array.from({length: 8}, (_, i) => {
      const n = i + 1;
      const si = forward ? (yp.si + n) % 10 : ((yp.si - n) % 10 + 10) % 10;
      const bi = forward ? (yp.bi + n) % 12 : ((yp.bi - n) % 12 + 12) % 12;
      return { startAge: n * 10 - 10 || 1, endAge: n * 10, stem: STEMS[si], branch: BRANCHES[bi], elemIdx: STEM_ELEM[si] };
    });
  }

  /* ── 계산 실행 ── */
  const noTime = !hour || hour === "모름" || hour === "Unknown";
  const hourNum = noTime ? null : parseInt(hour);

  const yp = yearPillar(year);
  const mp = monthPillar(year, month);
  const dp = dayPillar(year, month, day);
  const hp = noTime ? null : hourPillar(dp, hourNum);

  const elems = countElems([yp, mp, dp, hp]);
  const minE = Math.min(...elems);
  const maxE = Math.max(...elems);
  const weakIdx  = elems.map((c,i)=>({c,i})).filter(e=>e.c===minE).map(e=>e.i);
  const strongIdx = elems.map((c,i)=>({c,i})).filter(e=>e.c===maxE).map(e=>e.i);
  const dayElemIdx = STEM_ELEM[dp.si];

  const fortune = majorFortune(yp, gender, year);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const age = currentYear - year;
  const curF = fortune.find(f => age >= f.startAge && age <= f.endAge) || fortune[0];
  const nxtF = fortune[fortune.indexOf(curF) + 1];

  /* ── 텍스트 구성 ── */
  const pillarsKO = `년주: ${yp.stem}${yp.branch} / 월주: ${mp.stem}${mp.branch} / 일주: ${dp.stem}${dp.branch}${hp ? ` / 시주: ${hp.stem}${hp.branch}` : ' / 시주: 미상'}`;
  const pillarsEN = `Year: ${yp.stem}${yp.branch} / Month: ${mp.stem}${mp.branch} / Day: ${dp.stem}${dp.branch}${hp ? ` / Hour: ${hp.stem}${hp.branch}` : ' / Hour: Unknown'}`;
  const elemKO = ELEMENTS.map((e,i) => `${ELEMENTS_KO[i]}: ${elems[i]}개${weakIdx.includes(i)?' ★결핍':strongIdx.includes(i)?' ▲과다':''}`).join(', ');
  const elemEN = ELEMENTS.map((e,i) => `${ELEMENTS_EN[i]}: ${elems[i]}${weakIdx.includes(i)?' ★deficient':strongIdx.includes(i)?' ▲excess':''}`).join(', ');
  const weakKO = weakIdx.map(i=>ELEMENTS_KO[i]).join(', ');
  const weakEN = weakIdx.map(i=>ELEMENTS_EN[i]).join(', ');
  const strongKO = strongIdx.map(i=>ELEMENTS_KO[i]).join(', ');
  const strongEN = strongIdx.map(i=>ELEMENTS_EN[i]).join(', ');
  const dayElemKO = ELEMENTS_KO[dayElemIdx];
  const dayElemEN = ELEMENTS_EN[dayElemIdx];
  const fortuneListKO = fortune.slice(0,6).map(f=>`${f.startAge}~${f.endAge}세: ${f.stem}${f.branch}`).join(' | ');
  const fortuneListEN = fortune.slice(0,6).map(f=>`Age ${f.startAge}-${f.endAge}: ${f.stem}${f.branch}`).join(' | ');
  const curFKO = `현재 대운(${curF?.startAge}~${curF?.endAge}세): ${curF?.stem}${curF?.branch}`;
  const curFEN = `Current fortune (age ${curF?.startAge}-${curF?.endAge}): ${curF?.stem}${curF?.branch}`;
  const nxtFKO = nxtF ? `다음 대운(${nxtF.startAge}~${nxtF.endAge}세): ${nxtF.stem}${nxtF.branch}` : '';
  const nxtFEN = nxtF ? `Next fortune (age ${nxtF.startAge}-${nxtF.endAge}): ${nxtF.stem}${nxtF.branch}` : '';

  /* ══════════════════════════════════════════
     2. GPT 호출
  ══════════════════════════════════════════ */
  const systemPrompt = isEn
    ? `You are a master BaZi reader. You receive EXACT calculated Four Pillars data. Interpret it accurately — never invent chart data. Speak to the person directly as "you", whispering by candlelight. Weave in Western astrology naturally. Return ONLY valid JSON.`
    : `당신은 사주명리학 대가입니다. 정확히 계산된 사주 데이터를 받습니다. 반드시 이 데이터 기반으로 해석하세요. 절대 임의로 만들지 마세요. 촛불 앞에서 "당신"에게 속삭이듯 말하세요. 유효한 JSON만 반환하세요.`;

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

Person: Age ${age}, ${gender==='male'?'Male':'Female'}, Born ${month}/${day}/${year}${noTime?'':`, ${hour}:${minute||'00'}`}
Current: ${currentYear}, month ${currentMonth}

RULES:
- Base ALL readings on actual Day Master (${dayElemEN}) and element counts above
- Deficient ${weakEN} → name specific organs affected (Wood=liver/eyes, Fire=heart, Metal=lungs/skin, Water=kidneys/bones, Earth=stomach/spleen)
- Excess ${strongEN} → explain impact on personality and health
- Use ACTUAL Daiyun ages for turning points
- Speak as "you" — intimate whisper, knowing tone
- Weave in planetary transits (Mercury retrograde, Saturn, Jupiter) naturally

Return JSON (max 3 sentences per body field):
{"headline":"one haunting poetic line","essence":"2 sentences on Day Master nature","sections":[{"id":"personality","title":"Your Inner Self","icon":"✦","body":"3 sentences based on ${dayElemEN} Day Master"},{"id":"body","title":"Body & Vital Energy","icon":"◎","body":"3 sentences — deficient ${weakEN} organ effects and warning"},{"id":"career","title":"Destiny Path","icon":"◈","body":"3 sentences — career with actual Daiyun ages"},{"id":"love","title":"Love & Wounds","icon":"◇","body":"3 sentences — attachment from element balance"},{"id":"wealth","title":"Wealth & Fortune","icon":"◉","body":"3 sentences — financial fate with specific ages"},{"id":"now","title":"${currentYear} — Right Now","icon":"◐","body":"3 sentences based on current Daiyun ${curF?.stem}${curF?.branch}"},{"id":"lifepath","title":"Arc of Fate","icon":"∞","body":"3 sentences with actual Daiyun turning points"}],"locked":{"periods":{"early":"Ages 0-30: 2 sentences from early Daiyun","mid":"Ages 30-55: 2 sentences from mid Daiyun","late":"Ages 55+: 2 sentences from late Daiyun"},"yearly":[{"year":${currentYear},"fortune":"2 sentences for ${currentYear}"},{"year":${currentYear+1},"fortune":"2 sentences for ${currentYear+1}"},{"year":${currentYear+2},"fortune":"1 sentence for ${currentYear+2}"}],"monthly":"2 sentences for month ${currentMonth}","daily":"1 sentence today"}}`

  : `
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

기본 정보: ${age}세, ${gender==='male'?'남성':'여성'}, ${year}년 ${month}월 ${day}일생${noTime?'':`, ${hour}시 ${minute||'00'}분`}
현재: ${currentYear}년 ${currentMonth}월

해석 규칙:
- 모든 해석은 실제 일간(${dayElemKO})과 오행 수치 기반
- 결핍 오행 ${weakKO} → 구체적 장기 영향 명시 (목=간/눈, 화=심장, 금=폐/피부, 수=신장/뼈, 토=위장/비장)
- 과다 오행 ${strongKO} → 성격과 건강에 미치는 영향
- 실제 대운 나이를 전환점으로 언급
- "당신"에게 촛불 앞에서 속삭이듯
- 수성역행, 목성/토성 트랜짓 등 서양 점성술 자연스럽게 녹이기

JSON 반환 (각 body 최대 3문장):
{"headline":"소름 돋는 한 줄","essence":"일간 에너지 핵심 2문장","sections":[{"id":"personality","title":"당신의 내면","icon":"✦","body":"${dayElemKO} 일간 기반 3문장"},{"id":"body","title":"신체와 건강","icon":"◎","body":"결핍 ${weakKO} 장기 영향과 경고 3문장"},{"id":"career","title":"운명적 길","icon":"◈","body":"실제 대운 나이 포함 직업운 3문장"},{"id":"love","title":"사랑과 상처","icon":"◇","body":"오행 균형 기반 애착 패턴 3문장"},{"id":"wealth","title":"재물의 흐름","icon":"◉","body":"구체적 나이/연도 포함 재물운 3문장"},{"id":"now","title":"${currentYear}년 — 지금","icon":"◐","body":"현재 대운 ${curF?.stem}${curF?.branch} 기반 3문장"},{"id":"lifepath","title":"운명의 궤적","icon":"∞","body":"실제 대운 전환점 포함 3문장"}],"locked":{"periods":{"early":"초년(0~30세): 초기 대운 기반 2문장","mid":"중년(30~55세): 중기 대운 기반 2문장","late":"말년(55세~): 후기 대운 기반 2문장"},"yearly":[{"year":${currentYear},"fortune":"${currentYear}년 2문장"},{"year":${currentYear+1},"fortune":"${currentYear+1}년 2문장"},{"year":${currentYear+2},"fortune":"${currentYear+2}년 1문장"}],"monthly":"${currentMonth}월 에너지 2문장","daily":"오늘 에너지 1문장"}}`;

  const seed = parseInt(`${year}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}${String(hourNum||12).padStart(2,'0')}`) % 2147483647;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.7,
        max_tokens: 4000,
        seed,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || "API error");

    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    // 계산된 사주 정보 함께 반환
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
      dayMaster: ELEMENTS[dayElemIdx]
    };

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
