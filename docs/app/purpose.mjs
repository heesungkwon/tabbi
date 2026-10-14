export function purposeLabel(messages,lang='ko'){
 const users=messages.filter(m=>m.role==='user').map(m=>m.text||'');
 const rules=[[/발표|프레젠테이션|presentation|slides/i,'발표용','Presentation'],[/여행|도쿄|숙소|호텔|travel|trip|hotel|tokyo/i,'여행 계획','Travel planning'],[/디자인|작업 공간|design|interface/i,'디자인 작업','Design work'],[/공부|학습|강의|수업|study|class|course/i,'학습용','Studying'],[/개발|구현|코딩|coding|implementation|development/i,'개발용','Development']];
 for(const text of users.slice().reverse())for(const [pattern,ko,en]of rules)if(pattern.test(text))return lang==='ko'?ko:en;
 const text=users.join(' ');if(/연구|논문|research|paper/i.test(text))return lang==='ko'?'연구용':'Research';
 const custom=users.find(text=>text.trim().length>6)?.replace(/(탭|페이지|링크)(을|를)?|찾아줘|꺼내줘|열어줘|복원해줘|해주세요|해줘|필요해|하고 싶어/g,'').trim();
 return custom?custom.slice(0,20):lang==='ko'?'작업용':'Workspace';
}
export const purposeGroupTitle=(messages,lang='ko')=>`${lang==='ko'?'태비':'TABBI'}: ${purposeLabel(messages,lang)}`;
