import handler from './api/analyze.js';
const req={method:'POST',headers:{'x-forwarded-for':'2.2.2.2'},body:{mode:'idol',year:1999,month:9,day:28,hour:'unknown',gender:'male',selectedGroup:'TWICE',lang:'Korean'}};
const res={statusCode:200, status(c){this.statusCode=c; return this}, json(o){console.log('STATUS',this.statusCode); console.log(JSON.stringify(o,null,2).slice(0,1500)); return this}, setHeader(){}};
await handler(req,res);
