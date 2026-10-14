import {demoTabs,initialTasks} from './demo.mjs';
import {DEFAULT_ENDPOINT} from './adapter.mjs';

export function emptyState(){
 return {version:1,lang:'ko',tasks:[],tabs:[],events:[],chat:[],source:'pasted',settings:{ai:true,endpoint:DEFAULT_ENDPOINT}};
}
export function prepareState(value){
 const state=value&&Array.isArray(value.tasks)&&Array.isArray(value.tabs)?value:emptyState();
 state.settings||={ai:true,endpoint:DEFAULT_ENDPOINT};
 // Remove only untouched automatic starter data; never remove edited or explicitly loaded samples.
 if(!state.settings.explicitSamplesV1){
  const untouched=state.tasks.length>0&&state.tasks.every(t=>t.source==='sample'&&!t.resumes&&!t.corrections?.length)&&!(state.events||[]).some(e=>['save','edit','restore','delete'].includes(e.kind));
  if(untouched){state.tasks=[];if(state.source==='sample'){state.tabs=[];state.source='pasted';}}
  state.settings.explicitSamplesV1=true;
 }
 return state;
}
export function addSamples(state,{includeTabs=true}={}){
 for(const task of initialTasks(state.lang))if(!state.tasks.some(t=>t.id===task.id))state.tasks.push(task);
 if(includeTabs){state.tabs=structuredClone(demoTabs);state.source='sample';}
 state.settings.explicitSamplesV1=true;
}
