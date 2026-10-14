import {dialogue} from './conversation.mjs';
export const VERSION = 1;
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export function safeUrl(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } }
export function cleanTabs(tabs, limit = 60) {
  const seen = new Set();
  return (Array.isArray(tabs) ? tabs : []).slice(0, limit).flatMap((t, i) => {
    const url = safeUrl(String(t.url || '')); if (!url || seen.has(url)) return []; seen.add(url);
    return [{ id: String(t.id || `tab-${i}`).slice(0, 100), title: String(t.title || new URL(url).hostname).slice(0, 240), url, ...(Number.isInteger(t.browserId) ? { browserId: t.browserId } : {}) }];
  });
}
export function parseLinks(text) {
  return cleanTabs(String(text).split(/\n+/).flatMap(line => {
    const match = line.match(/https?:\/\/[^\s<>]+/); if (!match) return [];
    const url = safeUrl(match[0]); if (!url) return [];
    const title = line.replace(match[0], '').replace(/^[\s|\-]+|[\s|\-]+$/g, '').trim();
    return [{ id: uid(), url, title: title || new URL(url).hostname }];
  }));
}
const categories = [
  { key: 'research', ko: '연구 자료 살펴보기', en: 'Explore research', words: /paper|arxiv|scholar|acm|research|논문|연구|agent|에이전트|평가|evaluation|chi\b/i },
  { key: 'travel', ko: '여행 계획하기', en: 'Plan a trip', words: /travel|hotel|booking|trip|tokyo|kyoto|airbnb|여행|호텔|도쿄|교토|항공|맛집/i },
  { key: 'design', ko: '디자인 참고 모으기', en: 'Collect design references', words: /figma|design|dribbble|font|typography|디자인|폰트|타이포|컬러|color|interface/i },
  { key: 'code', ko: '개발 문제 해결하기', en: 'Solve a development problem', words: /github|stackoverflow|developer|javascript|react|python|코드|오류|개발/i },
];
export function localGroup(tabs, lang = 'ko') {
  const buckets = new Map(); const uncertain = [];
  for (const tab of cleanTabs(tabs)) {
    const hits = categories.filter(c => c.words.test(`${tab.title} ${tab.url}`));
    const key = hits.length === 1 ? hits[0].key : 'review';
    if (key === 'review') uncertain.push(tab.id);
    if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(tab.id);
  }
  return { mode: 'local', groups: [...buckets].map(([key, tabIds]) => ({
    id: uid(), title: categories.find(c => c.key === key)?.[lang] || (lang === 'ko' ? '목적 확인이 필요한 탭' : 'Tabs to clarify'),
    purpose: lang === 'ko' ? '제목과 주소에서 추정한 작업입니다. 실제 목적을 확인해주세요.' : 'Inferred from titles and URLs. Please confirm your actual goal.',
    summary: lang === 'ko' ? '페이지를 읽거나 작업을 완료했다는 의미는 아닙니다.' : 'This does not mean the pages were read or the task was completed.',
    nextStep: '', tabIds, reason: lang === 'ko' ? '제목·주소의 키워드 규칙으로 묶었습니다.' : 'Grouped using title and URL keywords.',
  })), question: uncertain.length ? (lang === 'ko' ? '이 탭들을 어떤 작업을 위해 열었나요? 보관할 작업을 선택해주세요.' : 'What task do these tabs belong to? Choose where to save them.') : '', uncertainTabIds: uncertain };
}
export function validateGrouping(raw, tabs, existingTasks = []) {
  const allowed = new Set(tabs.map(t => t.id)); const assigned = new Set();
  const groups = (Array.isArray(raw?.groups) ? raw.groups : []).slice(0, 12).flatMap(g => {
    const ids = (Array.isArray(g.tabIds) ? g.tabIds : []).filter(id => allowed.has(id) && !assigned.has(id)); ids.forEach(id => assigned.add(id));
    if (!ids.length) return [];
    const existing = existingTasks.find(t=>t.id===g.existingTaskId);
    return [{ id: uid(), existingTaskId: existing?.id || '', title: existing?.title || String(g.title || 'Untitled task').slice(0, 100), purpose: String(g.purpose || '').slice(0, 500), summary: String(g.summary || '').slice(0, 800), nextStep: String(g.nextStep || '').slice(0, 500), reason: String(g.reason || '').slice(0, 500), tabIds: ids }];
  });
  const missing = tabs.filter(t => !assigned.has(t.id));
  if (missing.length) groups.push({ id: uid(), title: '확인할 탭 / Review tabs', purpose: '', summary: '', nextStep: '', reason: 'Unassigned tabs preserved for review.', tabIds: missing.map(t => t.id) });
  const consolidated=[];
  for(const group of groups){const existing=group.existingTaskId&&consolidated.find(g=>g.existingTaskId===group.existingTaskId);if(existing)existing.tabIds.push(...group.tabIds);else consolidated.push(group);}
  return { ...raw, groups:consolidated, question: String(raw?.question || '').slice(0, 500), uncertainTabIds: (raw?.uncertainTabIds || []).filter(id => allowed.has(id)) };
}
export function makeTask(group, tabs, note = '') {
  return { id: uid(), title: group.title, purpose: group.purpose, summary: group.summary, nextStep: group.nextStep, reason: group.reason, tabs: cleanTabs(tabs.filter(t => group.tabIds.includes(t.id))), note: String(note).slice(0, 1200), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'user', corrections: [], resumes: 0 };
}
export function localResume(task, goal, lang = 'ko') {
  const tokens = String(goal).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length > 1);
  const scores = task.tabs.map(t => ({ tab: t, score: tokens.reduce((n, w) => n + (`${t.title} ${t.url}`.toLowerCase().includes(w) ? 1 : 0), 0) }));
  const matches = scores.filter(x => x.score > 0).sort((a,b) => b.score - a.score);
  const ids = !matches.length ? task.tabs.map(t => t.id) : matches.map(x => x.tab.id);
  return { mode: 'local', summary: task.note || task.summary || task.purpose, nextStep: task.nextStep || '', question: '', selections: task.tabs.map(t => ({ id: t.id, selected: ids.includes(t.id), reason: matches.length ? (lang === 'ko' ? (ids.includes(t.id) ? '현재 목표의 키워드와 일치합니다.' : '직접 일치하는 키워드가 없어 보관합니다. 직접 추가할 수 있어요.') : (ids.includes(t.id) ? 'Matches keywords in your current goal.' : 'No direct keyword match. Kept saved; you can add it.')) : (lang === 'ko' ? '선택할 근거가 부족해 모두 보여드립니다. 필요한 탭을 골라주세요.' : 'Not enough evidence to narrow the set. Please choose the tabs you need.') })) };
}
export function validateResume(raw, task) {
  const seen = new Set();
  const selections = (Array.isArray(raw?.selections) ? raw.selections : []).filter(s => task.tabs.some(t => t.id === s.id) && !seen.has(s.id) && seen.add(s.id)).map(s => ({ id: s.id, selected: s.selected === true, reason: String(s.reason || '').slice(0, 500) }));
  for (const t of task.tabs) if (!seen.has(t.id)) selections.push({ id: t.id, selected: false, reason: 'Not selected by the planner; still saved.' });
  return { ...raw, summary: String(raw?.summary || '').slice(0, 1000), nextStep: String(raw?.nextStep || '').slice(0, 500), question: String(raw?.question || '').slice(0, 500), selections };
}
export function matchTasks(tasks, query) {
  const tokens = String(query).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length > 1);
  return tasks.map(task => ({ task, score: tokens.reduce((n,w) => n + (`${task.title} ${task.purpose} ${task.note} ${task.tabs.map(t=>t.title).join(' ')}`.toLowerCase().includes(w) ? 1 : 0), 0) })).filter(x => x.score > 0).sort((a,b)=>b.score-a.score);
}
export function moveTab(plan, tabId, groupId) {
 const target=plan.groups.find(g=>g.id===groupId);
 if(!target||!plan.groups.some(g=>g.tabIds.includes(tabId)))return false;
 for(const g of plan.groups)g.tabIds=g.tabIds.filter(id=>id!==tabId);
 target.tabIds.push(tabId);return true;
}
export function saveGroups(groups, tabs, notes, tasks, mode) {
 const savedIds=[];
 for(const group of groups.filter(g=>g.tabIds.length)){
  const existing=tasks.find(t=>t.id===group.existingTaskId);
  const incoming=tabs.filter(t=>group.tabIds.includes(t.id));
  if(existing){
   existing.tabs=cleanTabs([...existing.tabs,...incoming],existing.tabs.length+incoming.length);
   if(notes[group.id]?.trim())existing.note=[existing.note,notes[group.id].trim()].filter(Boolean).join('\n');
   existing.updatedAt=new Date().toISOString();existing.corrections||=[];existing.corrections.push({at:existing.updatedAt,type:'tabs-added',count:incoming.length});savedIds.push(existing.id);
  }else{const task=makeTask(group,tabs,notes[group.id]||'');task.planner=mode;tasks.unshift(task);savedIds.push(task.id);}
 }
 return [...new Set(savedIds)];
}
export function validateRetrieval(raw, tasks) {
 const seen=new Set();const matches=(Array.isArray(raw?.matches)?raw.matches:[]).slice(0,12).flatMap(m=>{
  const task=tasks.find(t=>t.id===m.taskId),tab=task?.tabs.find(t=>t.id===m.tabId);
  if(!tab||seen.has(tab.url))return [];seen.add(tab.url);
  return [{taskId:task.id,tabId:tab.id,reason:String(m.reason||'').slice(0,250),selected:true}];
 });
 return {reply:String(raw?.reply||'').slice(0,1800),question:String(raw?.question||'').slice(0,500),matches,...dialogue(raw,matches),mode:raw?.mode==='ai'?'ai':'local'};
}
export function localRetrieval(tasks, messages, lang='ko') {
 const query=messages.filter(m=>m.role==='user').at(-1)?.text||'';
 const ranked=matchTasks(tasks,query).slice(0,3);
 return validateRetrieval({mode:'local',reply:lang==='ko'?'AI 연결 대신 제목과 메모에서 검색했어요.':'Searched titles and notes locally; AI is unavailable.',question:ranked.length?'':lang==='ko'?'작업 이름이나 관련 주제를 조금 더 알려주세요.':'Tell me a task name or a more specific topic.',matches:ranked.flatMap(({task})=>task.tabs.slice(0,4).map(t=>({taskId:task.id,tabId:t.id,reason:lang==='ko'?`‘${task.title}’에서 찾았어요.`:`Found in “${task.title}”.`})))},tasks);
}
