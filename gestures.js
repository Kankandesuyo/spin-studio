export const angleDelta=(from,to)=>((to-from+540)%360)-180;
export function attachWheelDrag(element,handlers){
  let drag=null;
  function point(event){
    const box=element.getBoundingClientRect(),scale=box.width/600;
    const x=event.clientX-box.left-300*scale,y=event.clientY-box.top-300*scale;
    return {angle:Math.atan2(y,x)*180/Math.PI,radius:Math.hypot(x,y)/scale};
  }
  function move(event){
    if(!drag||event.pointerId!==drag.id)return;
    const p=point(event);if(p.radius<40)return;
    const delta=angleDelta(drag.angle,p.angle);drag.angle=p.angle;
    drag.total+=delta;drag.travel+=Math.abs(delta);
    drag.samples.push({time:event.timeStamp,angle:drag.total});
    while(drag.samples.length>2&&drag.samples[1].time<event.timeStamp-140)drag.samples.shift();
    handlers.onRotate(delta);
  }
  element.addEventListener('pointerdown',event=>{
    if(drag||!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||!handlers.canStart())return;
    const p=point(event);if(p.radius<45||p.radius>268)return;
    element.setPointerCapture(event.pointerId);event.preventDefault();
    drag={id:event.pointerId,angle:p.angle,total:0,travel:0,samples:[{time:event.timeStamp,angle:0}]};
    element.classList.add('is-dragging');handlers.onStart();
  });
  element.addEventListener('pointermove',move);
  function release(event,cancelled=false){
    if(!drag||event.pointerId!==drag.id)return;
    const current=drag;drag=null;element.classList.remove('is-dragging');
    if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);
    if(cancelled||current.travel<2){handlers.onCancel();return;}
    const first=current.samples[0],last=current.samples.at(-1),elapsed=last.time-first.time;
    const velocity=elapsed>0&&event.timeStamp-last.time<120?(last.angle-first.angle)/elapsed:0;
    handlers.onRelease(Math.min(1.8,Math.max(-1.8,velocity)));
  }
  element.addEventListener('pointerup',event=>release(event));
  element.addEventListener('pointercancel',event=>release(event,true));
  element.addEventListener('lostpointercapture',event=>release(event,true));
  element.addEventListener('dragstart',event=>event.preventDefault());
}
