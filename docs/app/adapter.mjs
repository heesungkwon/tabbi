import { cleanTabs, safeUrl } from './engine.mjs';
export const isExtension = globalThis.location?.protocol === 'chrome-extension:' && !!globalThis.chrome?.tabs;
export const DEFAULT_ENDPOINT = 'https://dasi-tab-workspaces.next-interfa-7230.chatgpt.site';
const browserStore=()=>new URLSearchParams(globalThis.location?.search||'').has('preview')?sessionStorage:localStorage;
export async function readState() {
  if (isExtension) return (await chrome.storage.local.get('dasi')).dasi;
  try { return JSON.parse(browserStore().getItem('dasi-v1')); } catch { return null; }
}
export async function writeState(state) {
  if (isExtension) await chrome.storage.local.set({ dasi: state });
  else browserStore().setItem('dasi-v1', JSON.stringify(state));
}
export async function currentTabs() {
  if (!isExtension) return [];
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const stored=await chrome.storage?.session?.get('tabbiSourceWindow');
  const current = stored?.tabbiSourceWindow?{id:stored.tabbiSourceWindow}:await chrome.windows.getCurrent();
  const own = windows.find(w => w.id === current.id);
  const target = own?.tabs?.some(t => safeUrl(t.url)) ? own : windows.filter(w => !w.incognito && w.tabs?.some(t=>safeUrl(t.url))).sort((a,b)=>(b.focused?1:0)-(a.focused?1:0))[0];
  return cleanTabs((target?.tabs || []).filter(t => !t.incognito).map(t=>({id:`chrome-${t.id}`, browserId:t.id, title:t.title, url:t.url})));
}
export async function openSavedTabs(tabs,title='태비: 작업용') {
  if (!isExtension) return { simulated: true, opened: tabs.length, failed: 0 };
  const results = [];
  const existing = await chrome.tabs.query({});
  const source=await chrome.storage?.session?.get('tabbiSourceWindow');let windowId=source?.tabbiSourceWindow;
  if(windowId){try{await chrome.windows.get(windowId);}catch{windowId=undefined;}}
  for (const tab of tabs) {
    const url = safeUrl(tab.url); if (!url) { results.push({ok:false}); continue; }
    try {
      const match = existing.find(t=>t.url === url && !t.incognito && (!windowId||t.windowId===windowId));
      if (match) { results.push({ok:true, id:match.id, reused:true}); }
      else { const t = await chrome.tabs.create({ url, active: false,...(windowId?{windowId}:{}) }); results.push({ok:true,id:t.id}); }
    } catch { results.push({ok:false}); }
  }
  const good = results.filter(r=>r.ok);
  if (good.length) { try { const id = await chrome.tabs.group({tabIds:good.map(r=>r.id)}); await chrome.tabGroups.update(id,{title:title.slice(0,60),color:'blue'}); } catch { /* Tabs remain open if grouping is unavailable across windows. */ } }
  return { simulated:false, opened:good.length, reused:good.filter(r=>r.reused).length, failed:results.length-good.length };
}
export async function closeVerifiedTabs(tabs) {
  if (!isExtension) return { closed:tabs.length, skipped:0 };
  let closed=0, skipped=0;
  for (const t of tabs) {
    if (!Number.isInteger(t.browserId)) {skipped++;continue;}
    try {const live=await chrome.tabs.get(t.browserId); if(live.url !== t.url || live.pinned || live.audible){skipped++;continue;} await chrome.tabs.remove(t.browserId);closed++;}catch{skipped++;}
  }
  return {closed,skipped};
}
export async function enableEndpoint(origin = DEFAULT_ENDPOINT) {
  if (!isExtension) return true;
  const u = new URL(origin); if(u.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(u.hostname)) return false;
  return chrome.permissions.request({origins:[`${u.origin}/*`]});
}
export function agentOrigin(settings={}){
 if(isExtension)return settings.endpoint||DEFAULT_ENDPOINT;
 return globalThis.location?.hostname?.endsWith('.github.io')?DEFAULT_ENDPOINT:'';
}
const responseCache=new Map();
export async function requestAgent(payload, settings) {
  const base=agentOrigin(settings);
  const key=base+JSON.stringify(payload),cached=responseCache.get(key);
  if(cached&&Date.now()-cached.at<120000)return structuredClone(cached.result);
  const response = await fetch(`${base}/api/agent`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(65000)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'AI request failed');
  responseCache.set(key,{at:Date.now(),result:structuredClone(result)});
  if(responseCache.size>16)responseCache.delete(responseCache.keys().next().value);
  return result;
}
