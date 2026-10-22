import { parseAnswer, checkUnit } from './parseAnswer.mjs';
const cases = [["$1.2 million",1.2e6,'$'],["$1.2M",1.2e6,'$'],["1.2mm",1.2e6,''],["(1.2)",-1.2,''],["–7.5%",-7.5,'%'],["-7.5%",-7.5,'%'],["7.5 pct",7.5,'%'],["7.5 percent",7.5,'%'],["seven and a half percent",7.5,'%'],["7½%",7.5,'%'],["7-8%",7,'%'],["7–8%",7,'%'],["approx 7.5",7.5,''],["≈7.5%",7.5,'%'],["7,5%",7.5,'%'],["0.075",0.075,''],["$1,200,000",1.2e6,'$'],["1.2 billion dollars",1.2e9,'$'],["12 bps",12,'bps']];
let pass=0;
for (const [s,v,u] of cases){const c=parseAnswer(s)[0];const ok=c&&Math.abs(c.value-v)<1e-9&&c.unit===u;pass+=ok;console.log(ok?'PASS':'FAIL',JSON.stringify(s),JSON.stringify(c));}
console.log(pass+'/'+cases.length);
console.log(checkUnit(parseAnswer('$1.2 million')[0],'%'));
console.log(checkUnit(parseAnswer('0.075')[0],'%'));
console.log(checkUnit(parseAnswer('7–8%')[0],'%'), parseAnswer('7–8%')[0].range);
