// v5
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

  const prompt = isEn
    ? `You are a master of BaZi (Four Pillars), Zi Wei Dou Shu, and Western Astrology with 40 years of experience. You give deeply personal, specific, and psychologically compelling readings that feel uncannily accurate.

Return ONLY a JSON object. No markdown. Start with { end with }.

WRITING RULES (critical):
- Use the Barnum/Forer effect: write truths that feel deeply personal but resonate universally
- Be SPECIFIC: mention body parts, organs, exact ages, exact years
- Include shadow traits: "you appear X but secretly Y"
- Add warnings and tension: "be cautious of...", "a danger in your chart..."
- Mention physical/health weaknesses tied to their chart (respiratory, digestive, joints, heart, etc.)
- Reference exact ages and years for life turning points
- Current age of this person is ${age} years old. Current year is ${currentYear}, current month is ${currentMonth}.

JSON format:
{"headline":"One haunting poetic line that feels written just for them","essence":"2~3 sentences: their core energy, hidden contradictions, and what drives them beneath the surface","sections":[{"id":"personality","title":"Personality & Shadow Self","icon":"✦","body":"4~5 sentences. Include: outer persona vs inner reality, a secret fear they rarely admit, their greatest hidden strength"},{"id":"body","title":"Body & Vital Energy","icon":"◎","body":"3~4 sentences. Name specific organs or systems that are weak. Give concrete health warnings and what strengthens them."},{"id":"career","title":"Destiny & Career Path","icon":"◈","body":"4~5 sentences. Include specific age ranges when career peaks or struggles occur."},{"id":"love","title":"Love, Desire & Wounds","icon":"◇","body":"4~5 sentences. Include their attachment pattern, what they crave vs fear in love, a specific warning."},{"id":"wealth","title":"Wealth & Financial Fate","icon":"◉","body":"3~4 sentences. Mention specific ages or years when money flows or drains."},{"id":"now","title":"This Season — ${currentYear}","icon":"◐","body":"4~5 sentences about ${currentYear}~${currentYear+1}. Be specific: opportunity arriving, danger lurking, month to watch."},{"id":"lifepath","title":"The Arc of Fate","icon":"∞","body":"5~6 sentences covering full life arc with specific decade turning points"}],"locked":{"periods":{"early":"Early Life (0~30): 4~5 sentences about childhood destiny, family karma, formative wounds and gifts","mid":"Middle Years (30~55): 4~5 sentences about the peak struggle and achievement period, key ages","late":"Final Chapter (55+): 4~5 sentences about legacy, late-life fortune, what awaits them"},"yearly":[{"year":${currentYear},"fortune":"3~4 sentences: overarching theme of this year, biggest opportunity, biggest danger"},{"year":${currentYear+1},"fortune":"3~4 sentences for ${currentYear+1}"},{"year":${currentYear+2},"fortune":"2~3 sentences for ${currentYear+2}"}],"monthly":"3~4 sentences about the energy of month ${currentMonth} of ${currentYear} for this chart","daily":"2~3 sentences about today's energy for this chart — a specific action or warning"}}

Date of Birth: ${month}/${day}/${year}
Birth Time: ${timeStr}
Gender: ${genderStr}`

    : `당신은 사주명리학·자미두수·서양점성술을 40년간 연구한 대가입니다. 사람들이 "소름 돋는다"고 느낄 만큼 정확하고 개인화된 분석을 제공합니다.

JSON만 반환하세요. 마크다운 없이 { 로 시작해서 } 로 끝내세요.

작성 규칙 (필수):
- 바넘 효과 활용: 누구에게나 해당되지만 자신만의 이야기처럼 느껴지게
- 구체적으로: 신체 부위, 장기, 정확한 나이, 연도 언급
- 그림자 성격 포함: "겉으로는 X처럼 보이지만 속으로는 Y"
- 경고와 긴장감 포함: "이 시기에 특히 조심해야 할 것은..."
- 현재 나이: ${age}세, 현재 연도: ${currentYear}년, 현재 월: ${currentMonth}월

JSON 형식:
{"headline":"이 사람만을 위해 쓰인 것 같은 소름 돋는 한 줄","essence":"2~3문장: 핵심 기질, 숨겨진 모순, 표면 아래 무엇이 이 사람을 움직이는지","sections":[{"id":"personality","title":"성격과 그림자 자아","icon":"✦","body":"4~5문장. 겉모습과 내면의 간극, 비밀스러운 두려움, 숨겨진 강점 포함"},{"id":"body","title":"신체와 건강의 기운","icon":"◎","body":"3~4문장. 취약한 특정 장기 명시. 구체적인 건강 경고와 보완법 포함"},{"id":"career","title":"운명과 직업의 길","icon":"◈","body":"4~5문장. 직업 전성기/위기가 오는 구체적 나이대 포함"},{"id":"love","title":"사랑, 욕망과 상처","icon":"◇","body":"4~5문장. 애착 패턴, 사랑에서 갈망 vs 두려움, 구체적 경고 포함"},{"id":"wealth","title":"재물과 금전의 흐름","icon":"◉","body":"3~4문장. 돈이 흐르거나 빠지는 구체적 나이대나 연도 언급"},{"id":"now","title":"지금 이 시기 — ${currentYear}년","icon":"◐","body":"${currentYear}~${currentYear+1}년 4~5문장. 구체적으로: 오는 기회, 도사리는 위험, 특히 주목할 달"},{"id":"lifepath","title":"운명의 궤적","icon":"∞","body":"구체적 10년 단위 전환점을 포함한 전체 인생 흐름 5~6문장"}],"locked":{"periods":{"early":"초년운 (0~30세): 유년기 운명, 가족 업보, 형성기의 상처와 재능 4~5문장","mid":"중년운 (30~55세): 최대 도전과 성취의 시기, 핵심 나이 4~5문장","late":"말년운 (55세~): 유산, 말년의 복, 무엇이 기다리는지 4~5문장"},"yearly":[{"year":${currentYear},"fortune":"${currentYear}년 전체 주제, 최대 기회, 최대 위험 3~4문장"},{"year":${currentYear+1},"fortune":"${currentYear+1}년 운세 3~4문장"},{"year":${currentYear+2},"fortune":"${currentYear+2}년 운세 2~3문장"}],"monthly":"${currentYear}년 ${currentMonth}월의 에너지 3~4문장","daily":"오늘의 기운 2~3문장 — 구체적인 행동이나 경고"}}

생년월일: ${year}년 ${month}월 ${day}일
출생시각: ${timeStr}
성별: ${genderStr}`;

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
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        max_tokens: 6000,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || (isEn ? "OpenAI API error" : "OpenAI API 오류"));
    }

    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(isEn ? "JSON parse failed" : "JSON 파싱 실패");

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
