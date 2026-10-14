const paper=t=>/doi\.org|arxiv\.org|scholar\.|microsoft\.com\/en-us\/research\/publication\/|\bpaper\b|\bCHI\b|\bUIST\b|논문|학술/i.test(`${t.title} ${t.url}`);
const docs=t=>/developer\.|developers\.|docs\.|\/docs\/|\bAPI\b|documentation|building agents|개발\s*문서|구현\s*문서/i.test(`${t.title} ${t.url}`);
const find=(tasks,m)=>tasks.find(t=>t.id===m.taskId)?.tabs.find(t=>t.id===m.tabId);
export function retrievalConstraints(messages){
 let onlyPapers=false,excludeDocs=false,excludePapers=false;
 for(const m of messages.filter(m=>m.role==='user')){
  const s=m.text||'';
  if(/목적.{0,5}바꿔|다른\s*(목적|작업)|different\s+(goal|purpose)|new\s+task/i.test(s)){onlyPapers=false;excludeDocs=false;excludePapers=false;}
  if(/논문\s*만|papers?\s*only|only\s*(research\s*)?papers?/i.test(s)){onlyPapers=true;excludePapers=false;}
  if(/논문.{0,12}(?:빼|제외)|(?:exclude|without|no)\s+(?:the\s+)?papers?/i.test(s)){excludePapers=true;onlyPapers=false;}
  if(/(?:개발|구현|api|API|documentation|developer).{0,18}(?:빼|제외|말고)|(?:exclude|without|no)\s+(?:the\s+)?(?:developer|api|implementation|documentation)/i.test(s))excludeDocs=true;
  if(/(?:개발|구현|api|API).{0,18}(?:포함|추가)|include\s+(?:the\s+)?(?:developer|api|implementation)/i.test(s)){excludeDocs=false;onlyPapers=false;}
 }
 return {onlyPapers,excludeDocs,excludePapers};
}
export function constrainRetrieval(result,tasks,messages,lang='ko'){
 const rules=retrievalConstraints(messages);
 const matches=result.matches.filter(m=>{const tab=find(tasks,m);return tab&&(!rules.onlyPapers||paper(tab))&&(!rules.excludeDocs||!docs(tab))&&(!rules.excludePapers||!paper(tab));});
 if(matches.length===result.matches.length)return result;
 const ko=lang!=='en';
 return {...result,matches,stage:matches.length?'refine':'no_match',reply:matches.length?(ko?'추가한 조건에 맞는 탭만 남겼어요.':'Kept only tabs matching your conditions.'):(ko?'이 조건에 맞는 저장된 탭이 없어요.':'No saved tabs match these conditions.'),question:'',suggestions:[]};
}
// Straightforward narrowing can be applied to the previous candidates without another model call.
export function refinePrevious(chat,tasks,text,lang='ko'){
 if(!/^(?:논문만(?:\s*(?:보여줘|찾아줘|남겨줘|보자))?|only papers|papers only|(?:개발|구현)\s*문서(?:는|를)?\s*(?:빼줘|제외해줘)|(?:exclude|remove)\s+(?:the\s+)?(?:developer|api|implementation)\s*(?:docs|documentation))[.!?\s]*$/i.test(text.trim()))return null;
 const previous=[...chat].reverse().find(m=>m.role==='assistant'&&m.matches?.length);
 if(!previous)return null;
 const messages=chat.filter(m=>m.role==='user').concat({role:'user',text});
 const result=constrainRetrieval({matches:structuredClone(previous.matches),stage:'refine',mode:'dialogue',reply:lang==='ko'?'요청한 조건으로 후보를 좁혔어요.':'Narrowed the previous candidates.',question:'',suggestions:[]},tasks,messages,lang);
 return result;
}
