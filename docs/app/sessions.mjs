import {uid} from './engine.mjs';
export function saveConversation(state){
 if(!state.chat?.length)return;
 state.conversations||=[];state.activeConversationId||=uid();
 const first=state.chat.find(m=>m.role==='user');
 const entry={id:state.activeConversationId,title:(first?.text||'대화').slice(0,70),messages:structuredClone(state.chat.slice(-40)),updatedAt:new Date().toISOString()};
 const index=state.conversations.findIndex(s=>s.id===entry.id);
 if(index<0)state.conversations.unshift(entry);else state.conversations[index]=entry;
 state.conversations=state.conversations.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,40);
 return entry;
}
export function newConversation(state){saveConversation(state);state.chat=[];state.activeConversationId=uid();state.chatEpoch=(state.chatEpoch||0)+1;}
export function initConversations(state){state.conversations||=[];newConversation(state);}
export function openConversation(state,id){
 const entry=state.conversations?.find(s=>s.id===id);if(!entry)return false;
 saveConversation(state);state.chat=structuredClone(entry.messages);state.activeConversationId=id;state.chatEpoch=(state.chatEpoch||0)+1;return true;
}
export function appendSessionReply(state,id,message){
 if(state.activeConversationId===id){state.chat.push(message);state.chat=state.chat.slice(-40);saveConversation(state);return true;}
 const entry=state.conversations?.find(s=>s.id===id);if(entry){entry.messages.push(message);entry.messages=entry.messages.slice(-40);entry.updatedAt=new Date().toISOString();}return false;
}
