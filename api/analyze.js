// v7
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, month, day, hour, minute, gender, lang } = req.body;

  const isEn = lang === "en";
  const noTime = hour === "모름" || hour === "Unknown" || hour === null;

  const timeStr = noTime
    ? (isEn ? "Unknown (noon used)" : "시각 미상(정오 기준)")
    : (isEn ? `${hour}:${minute === "—" || minute === "모름" ? "00" : minute}` : `${hour}시 ${minute === "—" ? "00" : minute}분`);

  const genderStr = isEn
    ? (gender === "male" ? "Male" : "Female")
    : (gender === "male" ? "남성" : "여성");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const age = currentYear - year;

  // 현재 행성 정보 (대략적 실시간 느낌)
  const planetaryContext = isEn
    ? `Current astrological context: We are in ${currentYear}, month ${currentMonth}. Consider relevant planetary transits such as Mercury retrograde periods, Jupiter and Saturn transits, lunar nodes, and current season's dominant elemental energy. Weave these naturally into the reading.`
    : `현재 점성술 맥락: ${currentYear}년 ${currentMonth}월. 수성역행 시기, 목성·토성 트랜짓, 달의 노드, 현재 절기의 오행 기운 등을 자연스럽게 분석에 녹여주세요.`;

  const systemPrompt = isEn
    ? `You are an ancient fortune teller — part astrologer, part BaZi master, part Zi Wei Dou Shu reader. You speak in a hushed, intimate whisper directly to the person sitting across from you by candlelight. You address them as "you" always. Your tone is: knowing, slightly mysterious, deeply personal, like you are revealing secrets only the stars have shown you. Return ONLY valid JSON. No markdown.`
    : `당신은 수십 년 경력의 점성술사이자 사주 대가입니다. 촛불 앞에서 상대방에게 직접 속삭이듯 말합니다. 항상 "당신"으로 호칭하세요. 말투는: 알고 있다는 듯, 약간 신비롭게, 깊이 개인적으로 — 마치 별들이 당신에게만 보여준 비밀을 전해주는 것처럼. 오직 유효한 JSON만 반환하세요. 마크다운 없음.`;

  const userPrompt = isEn
    ? `Read this person's destiny. Age: ${age}, Born: ${month}/${day}/${year}, Time: ${timeStr}, Gender: ${genderStr}. Current: ${currentYear}, month ${currentMonth}.

${planetaryContext}

TONE RULES (critical):
- Always address as "you" — intimate, direct, like whispering across a candlelit table
- Weave in specific astrological/BaZi elements naturally: "With Mercury retrograde approaching...", "Saturn's transit through your career house...", "The Wood energy dominant in your chart...", "Your Fire element is weakened by...", "Jupiter crossing your wealth palace..."
- Be specific: name body organs, exact ages, exact years, specific months
- Use shadow psychology: "You appear strong to others, but privately..."
- Add tension and warnings: "There is something I must warn you about..."
- End sentences with weight — let silence hang: "...and that is when everything changes."

Return this exact JSON (keep each body field to 3 sentences max):
{
  "headline": "one haunting poetic line that feels written only for them",
  "essence": "2 sentences — their core soul energy and the contradiction that defines them",
  "sections": [
    {"id":"personality","title":"Your Inner Self","icon":"✦","body":"3 sentences. Outer vs inner. A private fear. Hidden strength. Weave in dominant element or planetary influence."},
    {"id":"body","title":"Body & Vital Energy","icon":"◎","body":"3 sentences. Name specific weak organs. Link to their elemental imbalance (e.g. weak Water element strains kidneys). Specific warning."},
    {"id":"career","title":"Your Destiny Path","icon":"◈","body":"3 sentences. Career fate with specific age range for peak. Saturn or Jupiter transit influence. What they must avoid."},
    {"id":"love","title":"Love & Hidden Wounds","icon":"◇","body":"3 sentences. Attachment pattern. What Venus or their relationship palace reveals. A specific love warning."},
    {"id":"wealth","title":"Wealth & Fortune","icon":"◉","body":"3 sentences. Financial fate. Specific year or age money flows. What planetary or elemental force blocks or opens their wealth."},
    {"id":"now","title":"${currentYear} — What I See Now","icon":"◐","body":"3 sentences. This year's theme. One opportunity and one danger. Reference a specific transit or elemental shift happening now."},
    {"id":"lifepath","title":"The Arc of Your Fate","icon":"∞","body":"3 sentences. Full life arc. Two specific decade turning points. End with something they are moving toward."}
  ],
  "locked": {
    "periods": {
      "early": "Ages 0-30: 2 sentences. Childhood karmic gifts and wounds. Elemental or planetary influence on early life.",
      "mid": "Ages 30-55: 2 sentences. The great trial and breakthrough. Specific turning age.",
      "late": "Ages 55+: 2 sentences. What awaits in the final chapter. Legacy energy."
    },
    "yearly": [
      {"year": ${currentYear}, "fortune": "2 sentences. ${currentYear} theme. Key planetary influence this year."},
      {"year": ${currentYear + 1}, "fortune": "2 sentences. ${currentYear + 1} energy shift and warning."},
      {"year": ${currentYear + 2}, "fortune": "1 sentence. Brief ${currentYear + 2} outlook."}
    ],
    "monthly": "2 sentences. Month ${currentMonth} energy for this chart. What to do and what to avoid.",
    "daily": "1 sentence. Today's specific energy or warning for this person."
  }
}`
    : `이 사람의 운명을 읽어주세요. 나이: ${age}세, 생년월일: ${year}년 ${month}월 ${day}일, 시각: ${timeStr}, 성별: ${genderStr}. 현재: ${currentYear}년 ${currentMonth}월.

${planetaryContext}

말투 규칙 (필수):
- 항상 "당신"으로 호칭 — 촛불 앞에서 속삭이듯 친밀하고 직접적으로
- 사주/점성술 요소를 자연스럽게 녹이기: "수성이 역행하는 이 시기에...", "토성이 당신의 직업궁을 지나면서...", "사주에서 목(木)의 기운이 강한 당신은...", "화(火) 기운이 약해지는 지금...", "목성이 재물궁을 통과하는 올해..."
- 구체적으로: 장기 이름, 정확한 나이, 연도, 특정 달
- 그림자 심리: "당신은 강해 보이지만, 혼자 있을 때는..."
- 긴장감과 경고: "한 가지 꼭 말씀드려야 할 것이 있어요..."
- 문장 끝에 여운: "...그리고 그때 모든 것이 바뀔 거예요."

정확히 이 JSON 구조로 반환 (각 body는 최대 3문장):
{
  "headline": "이 사람만을 위해 쓰인 것 같은 소름 돋는 한 줄",
  "essence": "2문장 — 핵심 영혼 에너지와 이 사람을 정의하는 모순",
  "sections": [
    {"id":"personality","title":"당신의 내면","icon":"✦","body":"3문장. 겉모습 vs 내면. 비밀스러운 두려움. 숨겨진 강점. 지배적 오행이나 행성 영향 녹이기."},
    {"id":"body","title":"신체와 건강의 기운","icon":"◎","body":"3문장. 취약한 장기 명시. 오행 불균형과 연결 (예: 수(水) 기운 약해 신장 주의). 구체적 경고."},
    {"id":"career","title":"당신의 운명적 길","icon":"◈","body":"3문장. 직업 운명과 전성기 나이대. 토성이나 목성 트랜짓 영향. 반드시 피해야 할 것."},
    {"id":"love","title":"사랑과 숨겨진 상처","icon":"◇","body":"3문장. 애착 패턴. 금성이나 인연궁이 드러내는 것. 구체적 사랑 경고."},
    {"id":"wealth","title":"재물과 금전의 흐름","icon":"◉","body":"3문장. 재물 운명. 돈이 흐르는 구체적 연도나 나이. 재물을 막거나 여는 행성/오행 기운."},
    {"id":"now","title":"${currentYear}년 — 지금 제가 보이는 것","icon":"◐","body":"3문장. 올해의 주제. 기회 하나, 위험 하나. 지금 일어나는 트랜짓이나 오행 변화 언급."},
    {"id":"lifepath","title":"당신 운명의 궤적","icon":"∞","body":"3문장. 전체 인생 흐름. 두 개의 구체적 10년 전환점. 당신이 향하고 있는 것으로 마무리."}
  ],
  "locked": {
    "periods": {
      "early": "초년 (0~30세): 2문장. 유년기 업보적 재능과 상처. 초년에 영향을 준 오행/행성.",
      "mid": "중년 (30~55세): 2문장. 대시련과 돌파구. 구체적 전환 나이.",
      "late": "말년 (55세~): 2문장. 마지막 장에서 기다리는 것. 유산의 기운."
    },
    "yearly": [
      {"year": ${currentYear}, "fortune": "2문장. ${currentYear}년 주제. 올해 핵심 행성 영향."},
      {"year": ${currentYear + 1}, "fortune": "2문장. ${currentYear + 1}년 에너지 전환과 경고."},
      {"year": ${currentYear + 2}, "fortune": "1문장. ${currentYear + 2}년 간략 전망."}
    ],
    "monthly": "2문장. ${currentMonth}월의 기운. 해야 할 것과 피해야 할 것.",
    "daily": "1문장. 오늘 이 사람을 위한 구체적 에너지나 경고."
  }
}`;

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
        temperature: 0.9,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || (isEn ? "OpenAI API error" : "OpenAI API 오류"));
    }

    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
