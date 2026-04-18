import fetch from "node-fetch";
import { Solar } from "solarlunar";

const cache = {}; // 간단 캐시 (나중에 DB로 바꿔라)

export default async function handler(req,res){
 try{
  const {year,month,day,hour,location,paid} = req.body;

  const key = `${year}-${month}-${day}-${hour}-${location.lat}`;

  // 👉 캐시 있으면 바로 반환
  if(cache[key]){
    return res.status(200).json(cache[key]);
  }

  // =====================
  // 1. 사주 계산
  // =====================
  const solar=Solar.fromYmd(year,month,day);
  const saju={
    year:solar.getYearInGanZhi(),
    month:solar.getMonthInGanZhi(),
    day:solar.getDayInGanZhi()
  };

  // =====================
  // 2. 점성술 API (1회만)
  // =====================
  const astroRes = await fetch("https://json.astrologyapi.com/v1/planets/tropical",{
    method:"POST",
    headers:{
      "Authorization":"Basic YOUR_BASE64_KEY",
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      day,month,year,
      hour:hour==="모름"?12:hour,
      lat:location.lat,
      lon:location.lon
    })
  });

  const astrology = await astroRes.json();

  // =====================
  // 3. 무료 결과 (GPT 없음)
  // =====================
  const decision = makeDecision(saju, astrology);

  let result = {
    decision,
    paid:false
  };

  // =====================
  // 4. 유료일 때만 GPT
  // =====================
  if(paid){
    const prompt = `
Saju: ${JSON.stringify(saju)}
Astrology: ${JSON.stringify(astrology)}

Give:
- clear decision
- timing
- risk
- advice
`;

    const gpt = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        messages:[{role:"user",content:prompt}]
      })
    });

    const gptData = await gpt.json();

    result.detail = gptData.choices[0].message.content;
    result.paid = true;
  }

  // 👉 캐시 저장
  cache[key] = result;

  res.status(200).json(result);

 }catch(e){
  res.status(500).json({error:e.message});
 }
}

// =====================
// 간단 결론 로직 (무료용)
// =====================
function makeDecision(saju, astrology){
  const day = saju.day[0];

  if(day==="갑" || day==="을"){
    return "지금 변화 타이밍 (이직 추천)";
  }

  if(day==="병" || day==="정"){
    return "조금 기다려라 (6개월 후 유리)";
  }

  return "현재 유지가 안전";
}
