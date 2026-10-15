export const MAX_ITEMS=30;
export const PALETTE=['#3976fa','#cfe5ff'];
export const defaults=()=>Array.from({length:10},(_,i)=>({label:i%2?'不换':'换',weight:1}));
export function validate(items){
  if(!Array.isArray(items)||items.length<2||items.length>MAX_ITEMS)return '请设置 2–30 份。';
  if(items.some(item=>typeof item.label!=='string'||!item.label.trim()||item.label.length>40))return '每一份都需要填写内容，最多 40 个字符。';
  if(items.some(item=>!Number.isFinite(Number(item.weight))||Number(item.weight)<.01||Number(item.weight)>10000))return '每份权重需为 0.01–10000 的数字。';
  return '';
}
export function sectorsFor(items){
  const total=items.reduce((sum,item)=>sum+Number(item.weight),0);
  let start=-90-Number(items[0].weight)/total*180;
  return items.map((item,index)=>{const sweep=Number(item.weight)/total*360;const sector={...item,index,start,sweep,mid:start+sweep/2,probability:Number(item.weight)/total};start+=sweep;return sector;});
}
export const normalize=angle=>((angle%360)+360)%360;
export function selectedIndex(sectors,rotation){
  const relative=normalize(-90-rotation-sectors[0].start);
  let end=0;
  for(let i=0;i<sectors.length;i++){end+=sectors[i].sweep;if(relative<end||i===sectors.length-1)return i;}
}
export function polar(deg,r=250){const a=deg*Math.PI/180;return [300+Math.cos(a)*r,300+Math.sin(a)*r];}
export function sectorPath(sector){const p=polar(sector.start),q=polar(sector.start+sector.sweep);return `M300 300 L${p.join(' ')} A250 250 0 ${sector.sweep>180?1:0} 1 ${q.join(' ')} Z`;}
export function stopAngle(start,unit){return start+1800+1440*unit;}
export function spinMotion(power,unit,jitter=0){
  const strength=(Math.min(100,Math.max(1,Number(power)||50))-1)/99;
  // One complete uniform turn preserves area-based probabilities at every strength.
  return {distance:360*(2+10*strength+unit),duration:2600+5000*strength+400*jitter};
}
export function ease(t){return 2*t-t*t;}
