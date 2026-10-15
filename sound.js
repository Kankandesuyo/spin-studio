// Short, damped contact sounds; no electronic pitch sweep or sustained note.
export function clickSamples(sampleRate,seed=1){
  const length=Math.ceil(sampleRate*.028),samples=new Float32Array(length);
  const lowpass=1-Math.exp(-2*Math.PI*2100/sampleRate);
  let random=seed>>>0,filtered=0,peak=0;
  for(let i=0;i<length;i++){
    const t=i/sampleRate;
    random=(Math.imul(random,1664525)+1013904223)>>>0;
    filtered+=lowpass*((random/4294967296*2-1)-filtered);
    const attack=Math.min(1,t/.0008),tail=Math.min(1,(length-1-i)/(sampleRate*.004));
    const contact=.11*filtered*Math.exp(-420*t);
    const body=.025*Math.sin(2*Math.PI*580*t)*Math.exp(-190*t);
    const overtone=.008*Math.sin(2*Math.PI*1160*t)*Math.exp(-350*t);
    samples[i]=(contact+body+overtone)*attack*Math.max(0,tail);
    peak=Math.max(peak,Math.abs(samples[i]));
  }
  // A conservative ceiling keeps overlapping contacts quiet.
  const scale=peak>0?.055/peak:0;
  for(let i=0;i<length;i++)samples[i]*=scale;
  return samples;
}
export function createWheelSound(context){
  const buffers=[17,53,101].map(seed=>{
    const samples=clickSamples(context.sampleRate,seed);
    const buffer=context.createBuffer(1,samples.length,context.sampleRate);
    buffer.copyToChannel(samples,0);return buffer;
  });
  const master=context.createGain();master.gain.value=.6;master.connect(context.destination);
  let last=-Infinity,count=0;
  return {
    tick(){
      const now=context.currentTime;
      if(context.state!=='running'||now-last<.045)return;
      last=now;
      const source=context.createBufferSource();
      source.buffer=buffers[count++%buffers.length];source.connect(master);
      source.start(now);source.onended=()=>source.disconnect();
    }
  };
}
