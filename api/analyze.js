import fetch from "node-fetch";
import { Solar } from "solarlunar";

export default async function handler(req,res){
 try{
  const {year,month,day,hour,location}=req.body;

  const solar=Solar.fromYmd(year,month,day);
  const saju={
    year:solar.getYearInGanZhi(),
    month:solar.getMonthInGanZhi(),
    day:solar.getDayInGanZhi(),
    hour:getHourBranch(hour)
  };

  const astro=await fetch("https://api.astroapi.com/v1/horoscope",{
    method:"POST",
    headers:{
      "Authorization":"Bearer ak-9a478ac3c43ffa71a7467cbd53bd5ba64b97050c",
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      year,month,day,
      hour:hour==="모름"?12:hour,
      lat:location.lat,
      lon:location.lon
    })
  });

  const astrology=await astro.json();

  const prompt=`Saju:${JSON.stringify(saju)}
Astrology:${JSON.stringify(astrology)}
Give a clear decision and advice.`;

  const gpt=await fetch("https://api.openai.com/v1/chat/completions",{
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

  const result=await gpt.json();

  res.status(200).json({result:result.choices[0].message.content});

 }catch(e){
  res.status(500).json({error:e.message});
 }
}

function getHourBranch(hour){
 if(hour==="모름") return "미상";
 const h=Number(hour);
 if(h>=23||h<1) return "자";
 if(h<3) return "축";
 if(h<5) return "인";
 if(h<7) return "묘";
 if(h<9) return "진";
 if(h<11) return "사";
 if(h<13) return "오";
 if(h<15) return "미";
 if(h<17) return "신";
 if(h<19) return "유";
 if(h<21) return "술";
 return "해";
}
