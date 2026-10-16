const state = { rows: [], recommendations: {}, sortKey: 'model', sortDir: 1 };
const DEFAULT_OFFERING = 'go-free';
const LAST_CHECKED = '2026-10-16';
const $ = (s) => document.querySelector(s);
const gradeRank = { S: 4, A: 3, B: 2, C: 1 };

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function activePrice(m, key) { return m.base_prices && !isPromotionActive(m) ? m.base_prices[key] : m[key]; }
function cost(m) { const i=activePrice(m,'input_price'),o=activePrice(m,'output_price'); return i==null||o==null ? null : +(i+o*0.2).toFixed(3); }
function money(v, digits=3) { return v==null ? 'N/A' : '$'+Number(v).toFixed(digits); }
function offeringLabel(m) { return ({go:'Go subscription','console-free':'Console · Free','console-payg':'Console · Pay-as-you-go'})[m.offering] || 'Go subscription'; }
function monthlyLabel(m) { return m.offering!=='go' ? (m.offering==='console-free'?'Not stated':'N/A · PAYG') : m.unlimited?'Unlimited':money(effectiveMonthlyUsage(m),0); }
function details(m) { return `<p>${esc(m.notes||'')}</p>${m.selection_id?`<p>Model ID: ${esc(m.selection_id)}</p>`:''}<p>Training: ${esc(m.training||'Unknown')} · Retention: ${esc(m.retention||'Unknown')}</p><p>Hosting: ${esc(m.hosting||'Unknown')} · China transfer: ${esc(m.china_transfer||'Unknown')}</p><p>Provider: ${esc(m.provider||'Unknown')}</p><p>Reasoning: ${m.reasoning==null?'Unknown':esc(m.reasoning)} ${esc(m.reasoning_effort||'')}</p>${m.limits?`<p>Limits: ${esc(m.limits)}</p>`:''}${m.promotion?`<p>Promotion end: ${esc(m.promotion_end||'Unknown')}</p>`:''}${m.price_tiers?`<p>Published tiers as of ${esc(m.checked_at)} · USD / 1M tokens (input / output / cache read / cache write):</p>${(m.base_prices&&!isPromotionActive(m)?[{...m.base_prices,label:'Base prices after recorded promotion expiry',cached_write:m.cached_write}]:m.price_tiers).map(t=>`<p>${esc(t.label)}: ${money(t.input_price)} / ${money(t.output_price)} / ${money(t.cached_input,4)} / ${money(t.cached_write,4)}</p>`).join('')}`:''}${m.source?`<p><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">Official source</a> · ${esc(m.checked_at)}</p>`:''}`; }
function badge(v, prefix = 'grade') { return `<span class="badge ${prefix}-${esc(v)}">${esc(v)}</span>`; }
function chinaClass(v) { return v === 'Yes' ? 'yes' : v === 'Possible' ? 'possible' : v === 'No evidence' ? 'no-evidence' : ''; }
function fmtInt(v) { return v == null ? 'N/A' : Number(v).toLocaleString(); }
function isPromotionActive(m) { if (!m?.promotion) return false; if (!m.promotion_end) return true; return new Date().toISOString().slice(0, 10) <= m.promotion_end; }
function effectiveMonthlyUsage(m) { return isPromotionActive(m) ? (m.promotional_monthly_usage_usd ?? m.monthly_usage_usd ?? null) : (m.monthly_usage_usd ?? null); }
function effectiveRequestsMonth(m) { return isPromotionActive(m) ? (m.promotional_requests_month ?? m.requests_month ?? null) : (m.requests_month ?? null); }
function cmp(a,b,key){let av=key==='estimated_cost'?cost(a):key==='monthly_usage_usd'?effectiveMonthlyUsage(a):key==='requests_month'?effectiveRequestsMonth(a):['input_price','output_price','cached_input'].includes(key)?activePrice(a,key):a[key];let bv=key==='estimated_cost'?cost(b):key==='monthly_usage_usd'?effectiveMonthlyUsage(b):key==='requests_month'?effectiveRequestsMonth(b):['input_price','output_price','cached_input'].includes(key)?activePrice(b,key):b[key];if(key==='coding_grade'||key==='value_grade'){av=gradeRank[av]||0;bv=gradeRank[bv]||0;}if(typeof av==='number'&&typeof bv==='number')return av-bv;return String(av??'').localeCompare(String(bv??''),undefined,{numeric:true,sensitivity:'base'});}
function filtered(){const q=$('#search').value.trim().toLowerCase(),privacy=$('#privacy').value,china=$('#china').value,pos=$('#position').value,offering=$('#offering').value;return state.rows.filter(m=>{const hay=JSON.stringify(m).toLowerCase();return(!offering||(offering==='go-free'?['go','console-free'].includes(m.offering):m.offering===offering))&&(!q||hay.includes(q))&&(!privacy||m.privacy_risk===privacy)&&(!china||m.china_transfer===china)&&(!pos||(m.positioning||[]).includes(pos));}).sort((a,b)=>state.sortDir*cmp(a,b,state.sortKey));}
function render(){const rows=filtered();$('#count').textContent=`${rows.length} offerings`;$('#models').innerHTML=rows.map(m=>`<tr><td>${esc(m.model)}<span class="offering-label">${esc(offeringLabel(m))}</span><button type="button" class="details-button" data-offering-id="${esc(m.offering_id)}" aria-haspopup="dialog" aria-controls="model-dialog" aria-label="${esc(m.model)} · ${esc(offeringLabel(m))} 상세 / 조건">상세 / 조건</button>${isPromotionActive(m)?`<span class="promotion-badge">${esc(m.promotion)}</span>`:''}</td><td>${esc(m.developer)}</td><td>${badge(m.coding_grade)}</td><td>${badge(m.value_grade)}</td><td class="usage"><strong>${monthlyLabel(m)}</strong></td><td>${m.offering!=='go'?'N/A':m.unlimited?'Unlimited':fmtInt(effectiveRequestsMonth(m))}</td><td>${money(cost(m))}</td><td>${money(activePrice(m,'input_price'))}</td><td>${money(activePrice(m,'output_price'))}</td><td>${money(activePrice(m,'cached_input'),4)}</td><td>${esc(m.context)}</td><td>${esc(m.benchmark||'N/A')}</td><td>${esc(m.training)}</td><td>${esc(m.retention)}</td><td>${esc(m.hosting)}</td><td class="${chinaClass(m.china_transfer)}">${esc(m.china_transfer)}</td><td>${badge(m.privacy_risk,'risk')}</td><td><div class="tags">${(m.positioning||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></td></tr>`).join('');}
function modelByName(name){return state.rows.find(m=>m.offering==='go'&&m.model===name);}
function summary(){const r=state.recommendations||{},performance=modelByName(r.absolute_performance),value=modelByName(r.best_value),privacy=modelByName(r.sensitive_code),cheap=modelByName(r.cheap_subagent);const usageDetail=m=>m?`$${effectiveMonthlyUsage(m)} monthly limit · 약 ${fmtInt(effectiveRequestsMonth(m))} req/mo`:'';const cards=[['Go · 절대 성능',performance?.model||'검증 필요',performance?`long-horizon 종합 1순위 · ${usageDetail(performance)}`:''],['Go · 가성비',value?.model||'검증 필요',value?`Est. ${money(cost(value))} · ${usageDetail(value)}${isPromotionActive(value)?' · '+value.promotion:''}`:''],['Go · 민감 코드',privacy?.model||'검증 필요',privacy?`현재 Go 내 조건부 추천 · ${usageDetail(privacy)}`:''],['Go · 저가 서브에이전트',cheap?.model||'-',cheap?`Est. ${money(cost(cheap))} · ${usageDetail(cheap)}`:'']];$('#summary').innerHTML=cards.map(([k,v,d])=>`<article class="card"><span class="kicker">${esc(k)}</span><span class="value">${esc(v||'-')}</span><div class="detail">${esc(d)}</div></article>`).join('');}
async function init(){const[modelRes,usageRes,consoleRes]=await Promise.all([fetch('data/models.json',{cache:'no-store'}),fetch('data/usage.json',{cache:'no-store'}),fetch('data/console.json',{cache:'no-store'})]);if(!modelRes.ok)throw new Error(`model data load failed: ${modelRes.status}`);if(!usageRes.ok)throw new Error(`usage data load failed: ${usageRes.status}`);if(!consoleRes.ok)throw new Error(`Console data load failed: ${consoleRes.status}`);const data=await modelRes.json(),usage=await usageRes.json(),consoleData=await consoleRes.json();state.rows=(data.models||[]).map(m=>({...m,...(usage.models?.[m.model]||{}),offering:'go',offering_id:'go:'+m.model}));state.rows.push(...(consoleData.models||[]));state.recommendations=data.recommendations||{};const latestAsOf=[data.as_of,usage.as_of,consoleData.as_of].filter(Boolean).sort().at(-1)||'N/A';const sourceDates=` · Go models ${data.as_of||'N/A'} / Go usage ${usage.as_of||'N/A'} / Console ${consoleData.as_of||'N/A'}`;const p=usage.limit_policy||{};const limitText=[p.five_hour_fraction,p.weekly_fraction,p.monthly_fraction].every(v=>v!=null)?` · Go limit windows: 5h ${Math.round(p.five_hour_fraction*100)}% / week ${Math.round(p.weekly_fraction*100)}% / month ${Math.round(p.monthly_fraction*100)}%`:'';$('#meta').textContent=`Last checked ${LAST_CHECKED} · Data changed ${latestAsOf}${sourceDates} · ${state.rows.length} tracked offerings${limitText}`;summary();render();}
$('#offering').value=DEFAULT_OFFERING;
['search','privacy','china','position','offering'].forEach(id=>$(`#${id}`).addEventListener(id==='search'?'input':'change',render));
$('#reset').addEventListener('click',()=>{['search','privacy','china','position'].forEach(id=>$(`#${id}`).value='');$('#offering').value=DEFAULT_OFFERING;render();});
document.querySelectorAll('th[data-key]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.key;if(state.sortKey===k)state.sortDir*=-1;else{state.sortKey=k;state.sortDir=1;}render();}));
init().catch(err=>{$('#meta').textContent='Failed to load model data';console.error(err);});
// Go and Console offerings retain separate billing, usage and privacy scopes.



// One shared modal lives outside the table, so details never resize a row.
let detailsTrigger = null;
function openDetails(id, trigger) {
  const model = state.rows.find(m => m.offering_id === id);
  if (!model) return;
  const dialog = $('#model-dialog');
  if (dialog.open) return;
  detailsTrigger = trigger;
  $('#model-dialog-title').textContent = model.model;
  $('#model-dialog-offering').textContent = offeringLabel(model);
  $('#model-dialog-content').innerHTML = details(model);
  $('#model-dialog-content').scrollTop = 0;
  dialog.showModal();
  document.body.classList.add('details-open');
}
$('#models').addEventListener('click', event => {
  const trigger = event.target.closest('button[data-offering-id]');
  if (trigger) openDetails(trigger.dataset.offeringId, trigger);
});
$('#close-details').addEventListener('click', () => $('#model-dialog').close());
$('#model-dialog').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const rect = event.currentTarget.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
});
$('#model-dialog').addEventListener('close', () => {
  document.body.classList.remove('details-open');
  if (detailsTrigger?.isConnected) detailsTrigger.focus({preventScroll:true});
  detailsTrigger = null;
});
