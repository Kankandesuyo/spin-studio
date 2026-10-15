import {MAX_ITEMS,PALETTE,defaults,validate,sectorsFor,normalize,selectedIndex,polar,sectorPath,spinMotion,releaseMotion,ease} from './core.js?v=drag-v1';
import {createWheelSound} from './sound.js';
import {attachWheelDrag} from './gestures.js';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',storageKey='spin-studio-v1';
let items=defaults(),rotation=0,busy=false,sectors=[],labels=[],audio=null,wheelSound=null,pointerAnimation=null,spinId=0;
const spin=$('spin'),itemList=$('items'),error=$('error');
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&!validate(saved.items)){items=saved.items.map(x=>({label:x.label,weight:Number(x.weight)}));$('sound').checked=saved.sound===true;if(Number.isInteger(saved.power)&&saved.power>=1&&saved.power<=100)$('power').value=saved.power;}}catch{}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({items,sound:$('sound').checked,power:Number($('power').value)}));$('save-state').textContent='已保存';}catch{$('save-state').textContent='仅当前页面有效';}}
function updatePower(){const power=Number($('power').value),name=power<=30?'轻拨':power<=70?'适中':'强力';$('power-value').textContent=power+'% · '+name;$('power').setAttribute('aria-valuetext',power+'%，'+name);$('power').style.setProperty('--power-fill',((power-1)/99*100)+'%');}
$('power').addEventListener('input',()=>{updatePower();save();});
updatePower();
function svg(name,attributes={}){const el=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);return el;}
function color(i){return PALETTE[i%PALETTE.length];}
function showError(message){error.hidden=!message;error.textContent=message;spin.disabled=!!message||busy;}
function updatePositions(){
  $('sectors').setAttribute('transform',`rotate(${rotation} 300 300)`);
  labels.forEach(({node,sector})=>{const [x,y]=polar(sector.mid+rotation,sector.sweep<14?210:176);node.setAttribute('x',x);node.setAttribute('y',y);});
}
function drawWheel(){
  sectors=sectorsFor(items);labels=[];$('sectors').replaceChildren();$('wheel-labels').replaceChildren();
  for(const sector of sectors){
    const path=svg('path',{d:sectorPath(sector),fill:color(sector.index),stroke:'#ffffff','stroke-width':1.5});
    const title=svg('title');title.textContent=`${sector.index+1}. ${sector.label} · ${(sector.probability*100).toFixed(2)}%`;path.append(title);$('sectors').append(path);
    if(sector.sweep>=5){
      const label=svg('text',{'font-size':sector.sweep<14?12:sector.sweep<25?15:19,fill:sector.index%2?'#1b335c':'#ffffff'});
      const max=sector.sweep<14?1:sector.sweep<25?3:7;
      label.textContent=sector.sweep<14?String(sector.index+1):sector.label.length>max?sector.label.slice(0,max-1)+'…':sector.label;
      const labelTitle=svg('title');labelTitle.textContent=sector.label;label.append(labelTitle);$('wheel-labels').append(label);labels.push({node:label,sector});
    }
  }
  updatePositions();$('segment-summary').textContent=items.length+' 份';
  $('wheel-desc').textContent=sectors.map(s=>`${s.index+1}. ${s.label}，${(s.probability*100).toFixed(2)}%`).join('；')+'。顶部指针指向结果，所有文字始终朝上。';
}
function update(){
  const message=validate(items);showError(message);
  if(!message){drawWheel();save();$('result-caption').hidden=true;$('result').parentElement.classList.remove('has-result');$('result').textContent='拖动转盘，松手开转';}
  else $('save-state').textContent='请完善配置';
  const total=items.reduce((s,x)=>s+(Number(x.weight)||0),0);
  itemList.querySelectorAll('.percentage').forEach((el,i)=>{el.textContent=Number(items[i].weight)>0&&total>0?(Number(items[i].weight)/total*100).toFixed(1)+'%':'—';});
  $('count').value=items.length;$('add').disabled=busy||items.length>=MAX_ITEMS;
  itemList.querySelectorAll('.remove').forEach(el=>el.disabled=busy||items.length<=2);
}
function renderEditor(){
  itemList.replaceChildren();
  items.forEach((item,index)=>{
    const row=document.createElement('div');row.className='item-row';
    const number=document.createElement('span');number.className='row-number';number.textContent=index+1;
    const field=document.createElement('div');field.className='label-field';
    const swatch=document.createElement('span');swatch.className='swatch';swatch.style.backgroundColor=color(index);swatch.setAttribute('aria-hidden','true');
    const label=document.createElement('input');label.type='text';label.maxLength=40;label.value=item.label;label.setAttribute('aria-label',`第 ${index+1} 份内容`);label.autocomplete='off';
    label.addEventListener('input',()=>{items[index].label=label.value;update();});field.append(swatch,label);
    const weight=document.createElement('input');weight.type='number';weight.min='.01';weight.max='10000';weight.step='any';weight.value=item.weight;weight.setAttribute('aria-label',`第 ${index+1} 份大小权重`);
    weight.addEventListener('input',()=>{items[index].weight=weight.value;update();});
    const weightStepper=document.createElement('div');weightStepper.className='weight-stepper';
    const minus=document.createElement('button'),plus=document.createElement('button');
    for(const [button,delta,word] of [[minus,-1,'减少'],[plus,1,'增加']]){button.type='button';button.textContent=delta<0?'−':'＋';button.setAttribute('aria-label',`${word}第 ${index+1} 份权重`);button.addEventListener('click',()=>{if(busy)return;items[index].weight=Math.min(10000,Math.max(.01,Math.round(((Number(items[index].weight)||0)+delta)*100)/100));weight.value=items[index].weight;update();});}
    weightStepper.append(minus,weight,plus);
    const percentage=document.createElement('span');percentage.className='percentage';
    const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label',`删除第 ${index+1} 份`);
    remove.addEventListener('click',()=>{if(busy||items.length<=2)return;items.splice(index,1);renderEditor();update();});
    row.append(number,field,weightStepper,percentage,remove);itemList.append(row);
  });
}
function changeCount(count){
  if(busy)return;
  if(!Number.isInteger(count)||count<2||count>MAX_ITEMS){showError('份数请输入 2–30 之间的整数。');return;}
  items=Array.from({length:count},(_,i)=>items[i]||{label:`选项 ${i+1}`,weight:1});rotation=0;renderEditor();update();
}
$('apply-count').addEventListener('click',()=>changeCount(Number($('count').value)));
$('count-minus').addEventListener('click',()=>changeCount(Math.max(2,items.length-1)));
$('count-plus').addEventListener('click',()=>changeCount(Math.min(MAX_ITEMS,items.length+1)));
$('count').addEventListener('keydown',e=>{if(e.key==='Enter')changeCount(Number($('count').value));});
$('count').addEventListener('input',()=>{const n=Number($('count').value);showError(Number.isInteger(n)&&n>=2&&n<=MAX_ITEMS?validate(items):'份数请输入 2–30 之间的整数。');});
$('add').addEventListener('click',()=>changeCount(items.length+1));
$('equal').addEventListener('click',()=>{if(busy)return;items.forEach(item=>item.weight=1);renderEditor();update();});
$('reset').addEventListener('click',()=>{if(busy)return;items=defaults();rotation=0;renderEditor();update();});
$('sound').addEventListener('change',()=>{save();if($('sound').checked)prepareSound();});
function lock(value){busy=value;document.body.classList.toggle('spinning',value);document.querySelectorAll('.editor input,.editor button').forEach(el=>el.disabled=value);$('power').disabled=value;spin.disabled=value;spin.querySelector('span').textContent=value?'转动中…':'再转一次';if(!value)updateDisabled();}
function updateDisabled(){$('add').disabled=items.length>=MAX_ITEMS;itemList.querySelectorAll('.remove').forEach(el=>el.disabled=items.length<=2);}
function prepareSound(){if(!$('sound').checked)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();wheelSound||=createWheelSound(audio);audio.resume().catch(()=>{});}catch{}}
function tick(){if(!$('sound').checked||!wheelSound)return;try{wheelSound.tick();}catch{}}
function animateMotion(motion,mode='random'){
  const start=rotation,distance=motion.distance,end=start+distance;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?0:motion.duration;
  let began=null,previous=selectedIndex(sectors,start);const currentSpin=++spinId;
  lock(true);$('result-caption').hidden=true;$('result').parentElement.classList.remove('has-result');$('result').textContent='正在转动，等待指针停稳…';
  function frame(now){
    if(currentSpin!==spinId)return;
    if(began===null)began=now;
    const t=duration===0?1:Math.min(1,(now-began)/duration);rotation=start+distance*ease(t);updatePositions();
    const selected=selectedIndex(sectors,rotation);
    if(previous!==selected&&!reduced){previous=selected;tick();if(pointerAnimation)pointerAnimation.cancel();pointerAnimation=$('pointer').animate([{transform:'rotate(0deg)'},{transform:'rotate(-20deg)',offset:.25},{transform:'rotate(6deg)',offset:.7},{transform:'rotate(0deg)'}],{duration:125,easing:'ease-out'});}
    if(t<1){requestAnimationFrame(frame);return;}
    rotation=normalize(end);updatePositions();const item=sectors[selectedIndex(sectors,rotation)];
    $('result-caption').textContent=`${mode==='manual'?'手动拨转':'随机抽取'} · 第 ${item.index+1} 份 · 占比 ${(item.probability*100).toFixed(2)}%`;
    $('result-caption').hidden=false;$('result').parentElement.classList.add('has-result');
    $('result').textContent=item.label;lock(false);
  }
  requestAnimationFrame(frame);
}
function canBegin(){
  if(busy)return false;
  const message=validate(items);if(message){showError(message);return false;}
  const proposed=Number($('count').value);if(proposed!==items.length){changeCount(proposed);if(proposed!==items.length)return false;}
  return true;
}
spin.addEventListener('click',()=>{
  if(!canBegin())return;prepareSound();
  const r=new Uint32Array(2);crypto.getRandomValues(r);
  animateMotion(spinMotion(Number($('power').value),r[0]/4294967296,r[1]/4294967296));
});
attachWheelDrag($('wheel'),{
  canStart:canBegin,
  onStart(){prepareSound();lock(true);$('result-caption').hidden=true;$('result').parentElement.classList.remove('has-result');$('result').textContent='松手后，转盘会继续滑行';},
  onRotate(delta){const previous=selectedIndex(sectors,rotation);rotation+=delta;updatePositions();if(selectedIndex(sectors,rotation)!==previous)tick();},
  onRelease(velocity){animateMotion(releaseMotion(velocity),'manual');},
  onCancel(){rotation=normalize(rotation);updatePositions();lock(false);$('result').textContent='沿着转盘边缘拨动试试';}
});
$('wheel').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!busy)spin.click();}});
// Light follows the pointer only on the primary interactive glass surface.
let shineFrame=0,shinePoint=null;
spin.addEventListener('pointermove',event=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const box=spin.getBoundingClientRect();shinePoint={x:(event.clientX-box.left)/box.width*100,y:(event.clientY-box.top)/box.height*100};
  if(!shineFrame)shineFrame=requestAnimationFrame(()=>{shineFrame=0;if(shinePoint){spin.style.setProperty('--shine-x',shinePoint.x+'%');spin.style.setProperty('--shine-y',shinePoint.y+'%');}});
});
spin.addEventListener('pointerleave',()=>{shinePoint=null;spin.style.removeProperty('--shine-x');spin.style.removeProperty('--shine-y');});
renderEditor();update();
