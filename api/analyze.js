// debug
export const config = { runtime: 'nodejs' };
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

  const prompt = isEn
    ? `You are an expert in BaZi, Zi Wei Dou Shu, and Western Astrology. Based on the birth info below, return ONLY a JSON object in English. No markdown. Start with { end with }.

JSON format:
{"headline":"One-line destiny summary (poetic)","essence":"2~3 sentences on innate nature","sections":[{"id":"personality","title":"Personality & Inner World","icon":"✦","body":"3~5 sentences"},{"id":"career","title":"Career & Achievement","icon":"◈","body":"3~5 sentences"},{"id":"love","title":"Love & Relationships","icon":"◇","body":"3~5 sentences"},{"id":"wealth","title":"Wealth & Abundance","icon":"◉","body":"3~5 sentences"},{"id":"health","title":"Health & Vitality","icon":"◎","body":"2~4 sentences"},{"id":"now","title":"This Season of Life","icon":"◐","body":"2025~2026 forecast"},{"id":"lifepath","title":"The Arc of Your Life","icon":"∞","body":"4~6 sentences"},{"id":"advice","title":"Your Destiny's Counsel","icon":"✸","body":"3~5 sentences direct advice"}]}

Date of Birth: ${month}/${day}/${year}
Birth Time: ${timeStr}
Gender: ${genderStr}`
    : `당신은 사주명리학·자미두수·서양점성술 통합 분석 전문가입니다. 아래 정보로 JSON만 반환하세요. 마크다운 없이 { 로 시작해서 } 로 끝내세요.

JSON 형식:
{"headline":"한 줄 운명 요약","essence":"타고난 기질 2~3문장","sections":[{"id":"personality","title":"성격과 내면","icon":"✦","body":"3~5문장"},{"id":"career","title":"직업과 성취","icon":"◈","body":"3~5문장"},{"id":"love","title":"인연과 사랑","icon":"◇","body":"3~5문장"},{"id":"wealth","title":"재물과 흐름","icon":"◉","body":"3~5문장"},{"id":"health","title":"건강과 에너지","icon":"◎","body":"2~4문장"},{"id":"now","title":"지금 이 시기","icon":"◐","body":"2025~2026 운세"},{"id":"lifepath","title":"인생의 흐름","icon":"∞","body":"4~6문장"},{"id":"advice","title":"천명의 조언","icon":"✸","body":"2인칭 조언 3~5문장"}]}

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
        temperature: 0.8,
        max_tokens: 4000,
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
