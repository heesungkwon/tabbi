// Explicit dialogue states; the model selects a bounded next step, never executes tabs.
export const stages=['clarify','recommend','refine','no_match','follow_up'];
export function dialogue(raw, matches=[]){
 const stage=stages.includes(raw?.stage)?raw.stage:matches.length?'recommend':'clarify';
 // Choices must stay inside tab retrieval. The agent has no page-reading or drafting tool.
 const suggestions=(Array.isArray(raw?.suggestions)?raw.suggestions:[]).filter(s=>typeof s==='string'&&s.trim()&&!/초안|작성|요약|만들|할래|볼래|드릴|할까요|까\?|draft|summari[sz]|write|create|compose/i.test(s)).slice(0,3).map(s=>s.slice(0,160));
 return {stage,suggestions};
}
export function openingQuestion(messages,lang='ko'){
 const users=messages.filter(m=>m.role==='user');
 if(users.length!==1)return null;
 const text=users[0].text.trim();
 if(!/^(안녕[!?.\s]*|안녕하세요[!?.\s]*|탭\s*(찾아줘|꺼내줘|복원해줘)[!?.\s]*|뭐\s*있어[?\s]*|hello[!?.\s]*|find\s*(my\s*)?tabs[!?.\s]*)$/i.test(text))return null;
 return {mode:'dialogue',stage:'clarify',reply:lang==='ko'?'좋아요. 어떤 일을 하려고 탭을 찾고 있나요?':'Sure. What are you planning to do with these tabs?',question:'',matches:[],suggestions:lang==='ko'?['발표 준비에 필요한 자료를 찾아줘','여행 계획을 다시 이어가고 싶어']:['Find materials for a presentation','Continue my travel planning']};
}
export function afterRestore(lang='ko'){
 return {role:'assistant',stage:'follow_up',mode:'dialogue',text:lang==='ko'?'선택한 탭을 꺼냈어요. 같은 목적의 다른 자료도 찾아드릴까요?':'Your selected tabs are ready. Shall I look for more materials for the same goal?',matches:[],suggestions:lang==='ko'?['다른 자료도 찾아줘','목적을 바꿔서 찾고 싶어']:['Find more materials','I want to find tabs for a different goal']};
}
