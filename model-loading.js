export function modelLoading(host,name){
 const panel=document.createElement('div');panel.className='model-loading';panel.setAttribute('role','status');
 panel.innerHTML='<img src="./assets/logo-metro.jpg" alt="Metro de Bogotá" width="64" height="64"><strong>Cargando modelo 3D</strong><span class="loading-model"></span><b class="loading-percent">0%</b><progress max="100" value="0" aria-label="Descarga del modelo"></progress><span class="loading-stage">Conectando…</span><small class="loading-time">0 s transcurridos</small>';
 panel.querySelector('.loading-model').textContent=name==='3001'?'Planeación · 3001':'Seguimiento · '+name;
 host.parentElement.append(panel);host.setAttribute('aria-busy','true');
 const started=performance.now(),timer=setInterval(()=>{const seconds=Math.floor((performance.now()-started)/1000);panel.querySelector('.loading-time').textContent=(seconds<60?seconds+' s':Math.floor(seconds/60)+' min '+seconds%60+' s')+' transcurridos';},1000);
 return {
  progress(text,info){panel.querySelector('.loading-stage').textContent=text;if(info){const pct=Math.floor(info.loaded/info.total*100);panel.querySelector('progress').value=pct;panel.querySelector('.loading-percent').textContent=pct+'%';}},
  preparing(){panel.querySelector('.loading-percent').textContent='100% descargado';panel.querySelector('progress').removeAttribute('value');panel.querySelector('.loading-stage').textContent='Preparando geometría para visualizar…';},
  finish(){clearInterval(timer);host.setAttribute('aria-busy','false');panel.remove();},
  fail(error){clearInterval(timer);host.setAttribute('aria-busy','false');panel.querySelector('.loading-percent').textContent='Carga interrumpida';panel.querySelector('.loading-stage').textContent=error.message;panel.querySelector('progress').hidden=true;const retry=document.createElement('button');retry.textContent='Reintentar carga';retry.onclick=()=>location.reload();panel.append(retry);}
 };
}
