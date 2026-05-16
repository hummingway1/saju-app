import handler from './api/analyze.js';
const req={method:'POST',headers:{'x-forwarded-for':'1.1.1.1'},body:{mode:'compat',year:1999,month:9,day:28,hour:'unknown',gender:'male',partnerYear:2002,partnerMonth:3,partnerDay:2,partnerHour:'unknown',partnerGender:'male',idolName:'원빈',lang:'Korean'}};
const res={statusCode:200, status(c){this.statusCode=c; return this}, json(o){console.log('STATUS',this.statusCode); console.log(JSON.stringify(o,null,2).slice(0,1000)); return this}, setHeader(){}};
await handler(req,res);
