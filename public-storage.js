const nativeFetch=globalThis.fetch.bind(globalThis),prefix='metro-digital-4d-v1:';
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function seed(name){const r=await nativeFetch(new URL('./data/'+name+'.json.gz',import.meta.url));if(!r.ok)throw Error('No se pudo cargar '+name);return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();}
function stored(name,fallback){const value=localStorage.getItem(prefix+name);return value?JSON.parse(value):fallback;}
export async function viewerFetch(url,options={}){
 if(!url.startsWith('/api/'))return nativeFetch(url,options);
 const key=url.slice(5),write=options.method==='POST';
 try{
  if(key==='history'||key==='data')return response(await seed(key));
  if(key==='config'){
   if(!write)return response(stored('config',await seed('config')));
   const data=JSON.parse(options.body);for(const value of Object.values(data.weights||{}))if(!Number.isFinite(value)||value<0)throw Error('Peso inválido');
   for(const value of Object.values(data.dates||{}))if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Fecha inválida');
   localStorage.setItem(prefix+'config',JSON.stringify(data));return response({ok:true});
  }
  if(key==='scenarios'){
   const records=stored('scenarios',[]);if(!write)return response(records);
   const data=JSON.parse(options.body);if(!data.name?.trim()||!Number.isFinite(data.factor)||data.factor<.25||data.factor>3)throw Error('Escenario inválido');
   const record={...data,id:crypto.randomUUID(),createdAt:new Date().toISOString()};records.unshift(record);localStorage.setItem(prefix+'scenarios',JSON.stringify(records));
   const link=document.createElement('a'),blob=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));link.href=blob;link.download='escenario-'+record.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(blob),10000);return response(record,201);
  }
  return response({error:'Ruta no disponible'},404);
 }catch(error){return response({error:error.message},400);}
}
let manifestPromise;
export async function readModel(name,onProgress=()=>{}){
 manifestPromise??=nativeFetch(new URL('./models/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('No se pudo leer el catálogo 3D');return r.json();});
 const model=(await manifestPromise).models[name];if(!model)throw Error('Modelo no publicado: '+name);
 let index=0,loaded=0;
 const stream=new ReadableStream({async pull(controller){try{if(index===model.parts.length){controller.close();return;}const part=model.parts[index++],r=await nativeFetch(new URL('./models/'+part.file,import.meta.url));if(!r.ok)throw Error('Error de descarga de '+name);const reader=r.body.getReader(),chunks=[];let received=0;for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.byteLength;onProgress('Descargando '+Math.min(100,Math.floor((loaded+received)/model.bytes*100))+'%',{loaded:Math.min(loaded+received,model.bytes),total:model.bytes});}const joined=new Uint8Array(received);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}const chunk=joined.buffer;if(chunk.byteLength!==part.bytes)throw Error('Descarga incompleta de '+name);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',chunk)),b=>b.toString(16).padStart(2,'0')).join('');if(digest!==part.sha256)throw Error('Integridad incorrecta de '+name);loaded+=part.bytes;onProgress('Descargando '+Math.floor(loaded/model.bytes*100)+'%',{loaded,total:model.bytes});controller.enqueue(new Uint8Array(chunk));}catch(error){controller.error(error);}}});
 return new Response(stream.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
