import {moveTab} from './engine.mjs';
export function excludeGroup(review,id){
 const g=review.plan.groups.find(g=>g.id===id);if(!g)return false;
 review.lastRemoved={group:structuredClone(g),note:review.notes[g.id]||''};
 review.excludedTabIds=[...new Set([...(review.excludedTabIds||[]),...g.tabIds])];
 review.plan.groups=review.plan.groups.filter(g=>g.id!==id);review.corrected=true;return true;
}
export function undoExclude(review){
 const removed=review.lastRemoved;if(!removed)return false;
 const ids=removed.group.tabIds.filter(id=>review.excludedTabIds?.includes(id));
 review.plan.groups.push({...removed.group,tabIds:ids});review.notes[removed.group.id]=removed.note;
 review.excludedTabIds=(review.excludedTabIds||[]).filter(id=>!ids.includes(id));review.lastRemoved=null;return true;
}
export function moveReviewTab(review,id,targetId){
 const target=review.plan.groups.find(g=>g.id===targetId);if(!target)return false;
 if(review.excludedTabIds?.includes(id)){review.excludedTabIds=review.excludedTabIds.filter(x=>x!==id);target.tabIds.push(id);return true;}
 return moveTab(review.plan,id,targetId);
}
export function changeDestination(review,groupId,task,tasks){
 const g=review.plan.groups.find(g=>g.id===groupId);if(!g)return false;
 if(task&&!tasks.some(t=>t.id===task.id))return false;
 const other=task&&review.plan.groups.find(x=>x.id!==g.id&&x.existingTaskId===task.id);
 if(other){other.tabIds=[...new Set([...other.tabIds,...g.tabIds])];review.notes[other.id]=[review.notes[other.id],review.notes[g.id]].filter(Boolean).join('\n');review.plan.groups=review.plan.groups.filter(x=>x.id!==g.id);}
 else{if(!g.existingTaskId)g.newTitle=g.title;g.existingTaskId=task?.id||'';g.title=task?task.title:g.newTitle||'새 작업';if(task)g.purpose=task.purpose;}
 review.corrected=true;return true;
}
export function reviewHTML(m,tasks,{tr,esc,icon,btn}){
 const tabsHTML=ids=>ids.map(id=>{const t=m.tabs.find(t=>t.id===id);if(!t)return '';let host='';try{host=new URL(t.url).hostname.replace(/^www\./,'');}catch{}
 return `<div class="drag-tab" draggable="true" tabindex="0" data-drag-tab="${esc(id)}" aria-label="${esc(t.title)} · ${tr('드래그하거나 탭 선택 후 작업의 여기로 옮기기 버튼을 누르세요','Drag or select the tab and choose a destination')}">${icon('grip')}<div class="site-info"><div class="site-title">${esc(t.title)}</div><div class="site-domain">${esc(host)}</div></div></div>`;}).join('');
 return `<div class="board-toolbar"><span>${tr('관련 탭끼리 모아 저장해요. 드래그해서 위치를 바꿀 수 있어요.','Save related tabs together. Drag to move them.')}</span>${btn(tr('작업 추가','Add task'),'add-group','secondary','plus')}</div>${m.fallback?`<div class="notice warning">${esc(m.fallback)}</div>`:''}<div class="group-board">${m.plan.groups.map(g=>`<section class="board-lane ${g.existingTaskId?'existing-lane':'new-lane'}" data-drop-group="${g.id}" aria-label="${esc(g.title)}"><header class="lane-header"><div class="lane-heading"><span class="lane-type">${g.existingTaskId?tr('기존 작업','Saved task'):tr('새 작업','New task')}</span>${g.existingTaskId?`<h3>${esc(g.title)}</h3>`:`<input data-group-title="${g.id}" value="${esc(g.title)}" aria-label="${tr('작업 이름','Task name')}">`}<span class="lane-count">${g.tabIds.length}</span></div><div class="lane-actions"><select data-destination="${g.id}" aria-label="${esc(g.title)} ${tr('저장 위치','save destination')}"><option value="" ${!g.existingTaskId?'selected':''}>${tr('새 작업으로 저장','Save as new task')}</option><optgroup label="${tr('기존 작업 선택','Choose a saved task')}">${tasks.map(t=>`<option value="${esc(t.id)}" ${g.existingTaskId===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</optgroup></select><button class="icon-button" data-action="exclude-group" data-id="${g.id}" aria-label="${esc(g.title)} ${tr('작업 제외','exclude group')}" title="${tr('이 묶음만 제외해요. 열린 탭과 저장된 작업은 유지해요.','Exclude this proposal; keep open tabs and saved work.')}">${icon('close')}</button></div></header><div class="lane-tabs">${tabsHTML(g.tabIds)}${!g.tabIds.length?`<div class="drop-placeholder">${tr('탭을 여기로 드래그하세요','Drag tabs here')}</div>`:''}</div><button class="keyboard-drop" data-action="move-selected" data-id="${g.id}" ${m.selectedTabId?'':'hidden'}>${tr('선택한 탭 여기로 옮기기','Move selected tab here')}</button><div class="group-note"><label for="note-${g.id}">${tr('메모 남기기','Leave a note')} <span>${tr('선택','optional')}</span></label><textarea rows="2" maxlength="1200" id="note-${g.id}" data-group-note="${g.id}" placeholder="${tr('진행 상황이나 다음에 할 일을 적어두세요','Add your progress or what to do next')}">${esc(m.notes[g.id]||'')}</textarea></div></section>`).join('')}</div>${m.excludedTabIds?.length||m.lastRemoved?`<div class="excluded-tray"><div><strong>${tr('정리에서 제외한 탭','Excluded from this save')} · ${m.excludedTabIds?.length||0}</strong><span>${tr('열린 탭은 그대로 남아요. 드래그해 다시 추가할 수 있어요.','These tabs stay open. Drag to add them back.')}</span>${m.lastRemoved?btn(tr('작업 제외 되돌리기','Undo exclusion'),'undo-exclude','secondary','return'):''}</div><div class="lane-tabs">${tabsHTML(m.excludedTabIds||[])}</div></div>`:''}`;
}
