import {purposeGroupTitle} from './purpose.mjs';
import {saveConversation,appendSessionReply} from './sessions.mjs';
import {openingQuestion,afterRestore} from './conversation.mjs';
import {uid,cleanTabs,saveGroups,validateRetrieval,localRetrieval,matchTasks} from './engine.mjs';
import {isExtension,writeState,currentTabs,openSavedTabs,closeVerifiedTabs,requestAgent} from './adapter.mjs';

export function createWorkflows(ctx){
 const {state,tr,esc,icon,btn}=ctx;
 const lookup=m=>{const task=state.tasks.find(t=>t.id===m.taskId);return {task,tab:task?.tabs.find(t=>t.id===m.tabId)};};
 function chat(){
  const messages=state.chat.slice(-30);const conversations=state.conversations||[];const history=ctx.getHistoryOpen?.()??false;
  return `<div class="page-intro"><h1>${tr('어떤 탭이<br>필요하세요?','Which saved tabs<br>do you need?')}</h1><div class="intro-actions">${btn(tr('새 대화','New conversation'),'new-chat','secondary','plus')}${btn(tr('대화 목록','Conversations'),'toggle-history','secondary','clock',`aria-expanded="${history}"`)}</div></div>${history?`<aside class="conversation-panel" aria-label="${tr('이전 대화','Previous conversations')}"><header><strong>${tr('대화 목록','Conversations')}</strong><button class="icon-button" data-action="toggle-history" aria-label="${tr('대화 목록 닫기','Close conversations')}">${icon('close')}</button></header>${conversations.length?conversations.map(c=>`<button class="conversation-item ${c.id===state.activeConversationId?'active':''}" data-action="open-chat" data-id="${esc(c.id)}"><span>${esc(c.title)}</span><small>${new Intl.DateTimeFormat(state.lang==='ko'?'ko-KR':'en-US',{month:'short',day:'numeric'}).format(new Date(c.updatedAt))}</small></button>`).join(''):`<p>${tr('대화를 시작하면 여기에 남아요.','Your conversations will appear here.')}</p>`}</aside>`:''}<div class="chat-layout"><div class="chat-thread" id="chat-thread">${!messages.length?`<div class="chat-empty"><p>${tr('하려는 일을 말하면 보관한 탭에서 찾아드려요.','Tell me what you’re doing. I’ll look through your saved tabs.')}</p><div class="chat-examples">${[tr('발표 준비에 필요한 논문 탭을 꺼내줘','Find papers for my presentation'),tr('도쿄 숙소를 비교하려고 해','I want to compare hotels in Tokyo'),tr('작업 공간 디자인을 다시 보고 싶어','Find my workspace design references')].map(text=>`<button data-action="chat-example" data-value="${esc(text)}">${text}${icon('arrow')}</button>`).join('')}</div></div>`:''}${messages.map(m=>m.role==='user'?`<div class="chat-message user"><div class="message-text">${esc(m.text)}</div></div>`:`<div class="chat-message assistant"><div class="assistant-name"><img class="assistant-mark" src="./mark.svg?v=0.6.1" alt="">${tr('태비','TABBI')}${m.mode==='local'?`<span class="badge local">${tr('로컬 검색','Local search')}</span>`:''}</div><div class="message-text">${esc(m.text)}</div>${m.error?`<div class="notice warning">${esc(m.error)}</div>`:''}${m.suggestions?.length?`<div class="dialogue-options">${m.suggestions.map(text=>`<button data-action="chat-example" data-value="${esc(text)}">${esc(text)}</button>`).join('')}</div>`:''}${m.matches?.filter(x=>lookup(x).tab).length?`<div class="chat-matches">${m.matches.filter(x=>lookup(x).tab).map(x=>{const {task,tab}=lookup(x);return `<label class="chat-match"><input type="checkbox" class="check" data-chat-select="${esc(`${x.taskId}::${x.tabId}`)}" data-message="${m.id}" ${x.selected?'checked':''}><div><div class="match-title">${esc(tab.title)}</div><div class="match-task">${esc(task.title)}</div><p>${esc(x.reason)}</p></div></label>`;}).join('')}</div><div class="chat-restore">${btn(tr(`${m.matches.filter(x=>x.selected&&lookup(x).tab).length}개 탭 꺼내기`,`Open ${m.matches.filter(x=>x.selected&&lookup(x).tab).length} tabs`),'restore-chat','primary','return',`data-id="${m.id}" ${m.matches.some(x=>x.selected&&lookup(x).tab)?'':'disabled'}`)}${m.restored?`<span>${tr('꺼낸 탭이에요. 다시 열 수도 있어요.','Already opened; you can reopen them.')}</span>`:!isExtension?`<span>${tr('웹에서는 화면 안의 탭 목록을 복원해요.','Web demo restores the in-app tab list.')}</span>`:''}</div>`:''}</div>`).join('')}${ctx.getChatBusy()?`<div class="chat-waiting" role="status">${icon('spark')}${tr('보관한 탭을 찾고 있어요…','Looking through your saved tabs…')}</div>`:''}</div><div class="chat-composer"><textarea id="chat-input" rows="2" maxlength="1800" placeholder="${tr('이런 목적으로 탭을 꺼내고 싶어요…','I want to bring back tabs for…')}" aria-label="${tr('AI에게 필요한 탭 설명하기','Describe the tabs you need')}" ${ctx.getChatBusy()?'disabled':''}>${esc(ctx.getDraft())}</textarea><button class="send-button" data-action="chat-send" aria-label="${tr('메시지 보내기','Send message')}" ${ctx.getChatBusy()?'disabled':''}>${icon('arrow')}</button></div><p class="chat-privacy">${tr('AI는 저장한 탭의 제목·주소·메모를 참고해요.','AI uses the titles, URLs and notes of your saved tabs.')}</p></div>`;
 }
 async function sendChat(){
  if(ctx.getChatBusy())return;
  const text=ctx.getDraft().trim();if(!text)return;
  if(!state.tasks.some(t=>t.tabs.length)){ctx.toast(tr('먼저 탭을 보관해주세요.','Save some tabs first.'));return;}
  state.chat.push({id:uid(),role:'user',text});const sessionId=state.activeConversationId;saveConversation(state);ctx.setDraft('');ctx.setChatBusy(true);ctx.render();ctx.persist();
  const messages=state.chat.slice(-8).map(m=>({role:m.role,text:m.text+(m.matches?.length?'\nRecommended tabs: '+m.matches.map(x=>lookup(x).tab?.title).filter(Boolean).join(' | '):'')}));
  // Keep the request small; include the most relevant workspaces first.
  const ranked=matchTasks(state.tasks,messages.filter(m=>m.role==='user').map(m=>m.text).join(' ')).map(x=>x.task);
  const ordered=[...ranked,...state.tasks.filter(t=>!ranked.some(r=>r.id===t.id))].slice(0,100);
  let remaining=200;
  const tasks=ordered.flatMap(t=>{const tabs=cleanTabs(t.tabs,Math.min(remaining,120));remaining-=tabs.length;return tabs.length?[{id:t.id,title:t.title,purpose:t.purpose,note:t.note,tabs}]:[];});
  let result=openingQuestion(messages,state.lang),error='';
  try{if(!result&&state.settings.ai)result=validateRetrieval(await requestAgent({action:'retrieve',lang:state.lang,messages,tasks},state.settings),state.tasks);}catch(e){error=tr('AI 연결에 문제가 있어요. 아래 결과는 로컬 검색이에요. 다시 메시지를 보내면 재시도해요.','AI connection failed. These are local results; send again to retry.');}
  result||=localRetrieval(state.tasks,messages,state.lang);
  const visible=appendSessionReply(state,sessionId,{id:uid(),role:'assistant',text:[result.reply,result.question].filter(Boolean).join('\n\n'),matches:result.matches,mode:result.mode,stage:result.stage,suggestions:result.suggestions,error,groupTitle:purposeGroupTitle(messages,state.lang)});
  if(!visible){await ctx.persist();return;}ctx.setChatBusy(false);await ctx.persist();ctx.event('search',{mode:result.mode,goal:text,count:result.matches.length});ctx.render();
  document.querySelector('.chat-message:last-of-type')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 async function restoreChat(id){
  if(ctx.getBusy())return;
  const m=state.chat.find(x=>x.id===id);if(!m)return;
  const chosen=m.matches.filter(x=>x.selected).map(x=>lookup(x).tab).filter(Boolean);if(!chosen.length)return;
  ctx.setBusy(true);
  try{
   const result=await openSavedTabs(chosen,m.groupTitle||purposeGroupTitle(state.chat.filter(x=>x.role==='user'),state.lang));if(!result.opened){ctx.toast(tr('탭을 열지 못했어요. 다시 시도해주세요.','Could not open the tabs. Please try again.'));return;}
   ctx.setTabs(isExtension?await currentTabs():cleanTabs([...state.tabs,...chosen],state.tabs.length+chosen.length),isExtension?'chrome':'restored');
   for(const taskId of new Set(m.matches.filter(x=>x.selected).map(x=>x.taskId))){const task=state.tasks.find(t=>t.id===taskId);if(task)task.resumes=(task.resumes||0)+1;}
   m.restored=true;state.chat.push({id:uid(),...afterRestore(state.lang)});await ctx.persist();ctx.event('restore',{mode:m.mode,source:'conversation',count:result.opened,simulated:result.simulated});ctx.render();ctx.toast(tr(`${result.opened}개 탭을 꺼냈어요.`,`${result.opened} tabs restored.`));
  }finally{ctx.setBusy(false);}
 }
 function showUndo(text){ctx.toast(text,12000);const button=document.createElement('button');button.dataset.action='undo-shrink';button.textContent=tr('되돌리기','Undo');document.querySelector('#toast').append(button);}
 async function shrinkSaved(tabs){
  const result=isExtension?await closeVerifiedTabs(tabs):{closed:tabs.length,skipped:0};
  ctx.setTabs(isExtension?await currentTabs():state.tabs.filter(t=>!tabs.some(x=>x.id===t.id)),isExtension?'chrome':state.source);
  state.lastShrink={tabs:structuredClone(tabs)};ctx.event('close',{count:result.closed,skipped:result.skipped});await ctx.persist();return result;
 }
 async function saveReview(closeAfter){
  if(ctx.getBusy())return;const m=ctx.getModal();const groups=m.plan.groups.filter(g=>g.tabIds.length);
  if(groups.some(g=>!g.title.trim())){ctx.toast(tr('작업 이름을 입력해주세요.','Enter a task name.'));return;}
  ctx.setBusy(true);const backup=structuredClone(state.tasks);
  try{
   const includedIds=new Set(groups.flatMap(g=>g.tabIds));const includedTabs=m.tabs.filter(t=>includedIds.has(t.id));
   if(!includedTabs.length){ctx.toast(tr('저장할 작업을 추가해주세요.','Add a task to save.'));return;}
   const ids=saveGroups(groups,includedTabs,m.notes,state.tasks,m.plan.mode);
   try{await writeState(state);}catch(error){state.tasks=backup;throw error;}
   for(const id of ids){const task=state.tasks.find(t=>t.id===id);ctx.event('save',{taskId:id,title:task.title,count:task.tabs.length,mode:m.plan.mode});}
   if(closeAfter){const result=await shrinkSaved(includedTabs);ctx.setModal(null);ctx.render();showUndo(tr(`${result.closed}개 탭을 보관하고 줄였어요.${result.skipped?` ${result.skipped}개는 열어뒀어요.`:''}`,`${result.closed} tabs saved and closed.`));}
   else{ctx.setModal({type:'saved',taskIds:ids,tabs:includedTabs});ctx.render();}
  }finally{ctx.setBusy(false);}
 }
 async function undoShrink(){
  if(!state.lastShrink?.tabs?.length||ctx.getBusy())return;ctx.setBusy(true);
  try{const tabs=state.lastShrink.tabs;const r=await openSavedTabs(tabs);ctx.setTabs(isExtension?await currentTabs():cleanTabs([...state.tabs,...tabs],state.tabs.length+tabs.length),isExtension?'chrome':'restored');state.lastShrink=null;await ctx.persist();ctx.event('restore',{source:'undo',count:r.opened,simulated:r.simulated});ctx.render();ctx.toast(tr('줄였던 탭을 다시 꺼냈어요.','Closed tabs restored.'));}finally{ctx.setBusy(false);}
 }
 return {chat,sendChat,restoreChat,saveReview,undoShrink};
}
