// v6
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

  const systemPrompt = isEn
    ? `You are a BaZi and astrology master. Return ONLY valid JSON. No markdown, no explanation. Keep each field under 3 sentences to avoid truncation.`
    : `당신은 사주명리학 대가입니다. 오직 유효한 JSON만 반환하세요. 마크다운 없음. 각 항목은 3문장 이내로 간결하게.`;

  const userPrompt = isEn
    ? `Analyze this person's destiny using BaZi, Zi Wei Dou Shu, and Western Astrology.
Age: ${age}, Born: ${month}/${day}/${year}, Time: ${timeStr}, Gender: ${genderStr}
Current year: ${currentYear}, month: ${currentMonth}

Rules: Be specific (name body organs, exact ages, exact years). Use shadow traits ("appears X but secretly Y"). Add warnings. Use Barnum effect for resonance.

Return this exact JSON structure:
{
  "headline": "one haunting poetic line",
  "essence": "2 sentences on core energy and hidden contradictions",
  "sections": [
    {"id":"personality","title":"Personality & Shadow Self","icon":"✦","body":"Outer vs inner self. A secret fear. Hidden strength. 3 sentences."},
    {"id":"body","title":"Body & Vital Energy","icon":"◎","body":"Name 1-2 weak organs. Specific health warning. What strengthens them. 3 sentences."},
    {"id":"career","title":"Destiny & Career","icon":"◈","body":"Career path. Specific peak age range. What to avoid. 3 sentences."},
    {"id":"love","title":"Love & Wounds","icon":"◇","body":"Attachment pattern. Craving vs fear. One specific warning. 3 sentences."},
    {"id":"wealth","title":"Wealth & Money","icon":"◉","body":"Financial fate. Specific age or year money flows. What blocks wealth. 3 sentences."},
    {"id":"now","title":"${currentYear} — This Season","icon":"◐","body":"${currentYear} theme. One opportunity. One danger. One month to watch. 3 sentences."},
    {"id":"lifepath","title":"Arc of Fate","icon":"∞","body":"Full life arc with 2-3 decade turning points. 3 sentences."}
  ],
  "locked": {
    "periods": {
      "early": "Ages 0-30: childhood destiny, family karma, formative gifts. 2 sentences.",
      "mid": "Ages 30-55: peak struggle and achievement, key turning age. 2 sentences.",
      "late": "Ages 55+: legacy and late-life fortune. 2 sentences."
    },
    "yearly": [
      {"year": ${currentYear}, "fortune": "Overall theme and biggest opportunity this year. 2 sentences."},
      {"year": ${currentYear + 1}, "fortune": "Key energy and warning for ${currentYear + 1}. 2 sentences."},
      {"year": ${currentYear + 2}, "fortune": "Brief outlook for ${currentYear + 2}. 1 sentence."}
    ],
    "monthly": "Month ${currentMonth} energy for this chart. What to pursue and avoid. 2 sentences.",
    "daily": "Today's energy. One specific action or warning. 1 sentence."
  }
}`
    : `이 사람의 사주를 분석하세요. BaZi, 자미두수, 서양점성술 통합.
나이: ${age}세, 생년월일: ${year}년 ${month}월 ${day}일, 시각: ${timeStr}, 성별: ${genderStr}
현재: ${currentYear}년 ${currentMonth}월

규칙: 구체적으로 (장기명, 정확한 나이, 연도). 그림자 성격 ("겉으로는 X지만 속으로는 Y"). 경고 포함. 바넘 효과.

정확히 이 JSON 구조로 반환:
{
  "headline": "소름 돋는 시적인 한 줄",
  "essence": "핵심 기질과 숨겨진 모순 2문장",
  "sections": [
    {"id":"personality","title":"성격과 그림자 자아","icon":"✦","body":"겉모습 vs 내면. 비밀스러운 두려움. 숨겨진 강점. 3문장."},
    {"id":"body","title":"신체와 건강","icon":"◎","body":"취약한 장기 1-2개 명시. 구체적 건강 경고. 보완법. 3문장."},
    {"id":"career","title":"운명과 직업","icon":"◈","body":"직업 경로. 전성기 나이대. 피해야 할 것. 3문장."},
    {"id":"love","title":"사랑과 상처","icon":"◇","body":"애착 패턴. 갈망 vs 두려움. 구체적 경고. 3문장."},
    {"id":"wealth","title":"재물과 금전","icon":"◉","body":"재물 운명. 돈 흐르는 나이/연도. 재물을 막는 것. 3문장."},
    {"id":"now","title":"${currentYear}년 — 지금 이 시기","icon":"◐","body":"${currentYear}년 주제. 기회. 위험. 주목할 달. 3문장."},
    {"id":"lifepath","title":"운명의 궤적","icon":"∞","body":"전체 인생 흐름과 전환점 2-3개. 3문장."}
  ],
  "locked": {
    "periods": {
      "early": "초년 (0~30세): 유년기 운명, 가족 업보, 재능. 2문장.",
      "mid": "중년 (30~55세): 최대 도전과 성취, 핵심 나이. 2문장.",
      "late": "말년 (55세~): 유산과 말년 복. 2문장."
    },
    "yearly": [
      {"year": ${currentYear}, "fortune": "${currentYear}년 주제와 최대 기회. 2문장."},
      {"year": ${currentYear + 1}, "fortune": "${currentYear + 1}년 핵심 에너지와 경고. 2문장."},
      {"year": ${currentYear + 2}, "fortune": "${currentYear + 2}년 간략 전망. 1문장."}
    ],
    "monthly": "${currentMonth}월 에너지. 추구할 것과 피할 것. 2문장.",
    "daily": "오늘의 기운. 구체적 행동이나 경고. 1문장."
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
        temperature: 0.85,
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
