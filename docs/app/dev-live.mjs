// Active only in a locally loaded extension with a watcher-generated marker.
if (location.protocol === 'chrome-extension:') {
 let previous=null,pending=null;
 async function check(){
  try{
   const r=await fetch('./dev-version.json',{cache:'no-store'});if(!r.ok)return;
   const next=await r.json();if(!previous){previous=next;return;}
   if(previous.revision===next.revision)return;
   pending=next;
   const editing=!!document.querySelector('.modal,.chat-waiting')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
   if(next.scope==='ui'&&!editing){location.reload();return;}
   if(document.querySelector('.dev-update'))return;
   const bar=document.createElement('div');bar.className='dev-update';
   const message=document.createElement('span');message.textContent=next.scope==='extension'?'확장 프로그램 업데이트가 준비됐어요':'화면 업데이트가 준비됐어요';
   const button=document.createElement('button');button.textContent=next.scope==='extension'?'다시 로드':'새로고침';
   button.addEventListener('click',()=>{if(pending.scope==='extension')chrome.runtime.reload();else location.reload();});
   bar.append(message,button);document.body.append(bar);
  }catch{/* No development marker in downloaded release builds. */}
 }
 await check();if(previous)setInterval(check,1500);
}
