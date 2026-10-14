const tab = (id, title, url) => ({id, title, url});
export const demoTabs = [
 tab('r1','When the Tab Comes Due · CHI 2021','https://doi.org/10.1145/3411764.3445585'),
 tab('r2','Disruption and Recovery of Computing Tasks','https://www.microsoft.com/en-us/research/publication/disruption-recovery-computing-tasks-field-study-analysis-directions/'),
 tab('r3','OpenAI · Building agents','https://developers.openai.com/api/docs/guides/agents'),
 tab('r4','Chrome extensions · Tabs API','https://developer.chrome.com/docs/extensions/reference/api/tabs'),
 tab('t1','Tokyo travel guide · Japan Guide','https://www.japan-guide.com/e/e2164.html'),
 tab('t2','Tokyo hotels · Booking.com','https://www.booking.com/city/jp/tokyo.html'),
 tab('t3','Shibuya · Tokyo travel','https://www.japan-guide.com/e/e3007.html'),
 tab('d1','Figma · Design resources','https://www.figma.com/resource-library/'),
 tab('d2','Google Fonts · Typography','https://fonts.google.com/'),
 tab('d3','Dribbble · Workspace interface design','https://dribbble.com/search/workspace'),
 tab('a1','Notion — My workspace','https://www.notion.so/'),
 tab('a2','Google Maps','https://maps.google.com/'),
];
export function initialTasks(lang = 'ko') {
 const ko = lang === 'ko'; const now = new Date().toISOString();
 return [
  { id:'demo-research', title:ko?'탭 에이전트 연구':'Tab agent research', purpose:ko?'작업 재개를 돕는 에이전트의 설계 근거 찾기':'Find evidence for a task resumption agent', summary:ko?'탭 관리와 작업 중단·복귀에 관한 자료를 모아둔 예시 작업입니다.':'A sample workspace of tab management and interruption research.', note:ko?'탭 관리 논문과 작업 복귀 논문을 비교할 예정. 아직 사용자 평가 방법은 결정하지 않음.':'Plan to compare tab management and interruption papers. User evaluation method is still undecided.', nextStep:ko?'두 논문에서 작업 재개를 평가한 방법을 비교하기':'Compare how the two papers evaluate task resumption', tabs:demoTabs.slice(0,4), color:'violet', icon:'book', source:'sample', createdAt:now, updatedAt:now, corrections:[], resumes:0 },
  { id:'demo-travel', title:ko?'도쿄 주말 여행':'A weekend in Tokyo', purpose:ko?'숙소와 방문할 동네 비교하기':'Compare hotels and neighborhoods', summary:ko?'여행 정보와 숙소 후보를 모아둔 예시 작업입니다.':'A sample workspace of travel guides and hotel options.', note:ko?'시부야 근처 숙소를 찾아보는 중. 예약한 곳은 없음.':'Looking for a hotel near Shibuya. Nothing booked yet.', nextStep:ko?'숙소 위치와 이동 시간을 비교하기':'Compare hotel locations and travel times', tabs:demoTabs.slice(4,7), color:'orange', icon:'compass', source:'sample', createdAt:now, updatedAt:now, corrections:[], resumes:0 },
  { id:'demo-design', title:ko?'차분한 작업 공간 UI':'A calmer workspace UI', purpose:ko?'작업 관리 화면의 폰트와 레이아웃 참고하기':'Explore typography and layouts for a workspace UI', summary:ko?'디자인 자료와 폰트 사이트를 모아둔 예시 작업입니다.':'A sample workspace of design resources and typography.', note:ko?'여백이 넉넉한 레이아웃을 참고할 예정. 폰트는 아직 고르지 않음.':'Explore spacious layouts. A typeface has not been selected.', nextStep:ko?'읽기 좋은 본문 폰트 후보 두 개 고르기':'Choose two readable body typeface candidates', tabs:demoTabs.slice(7,10), color:'green', icon:'palette', source:'sample', createdAt:now, updatedAt:now, corrections:[], resumes:0 },
 ];
}
