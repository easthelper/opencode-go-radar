const state = { rows: [], recommendations: {}, sortKey: 'model', sortDir: 1 };
const DEFAULT_OFFERING = 'go-free';
const LAST_CHECKED = '2026-10-19';
const $ = (s) => document.querySelector(s);
// Coding is one named evaluation, not a synthetic cross-benchmark grade.
const CODING_COHORT = 'aa-terminalbench-4.0-mini-swe';
function codingScore(m) { const e=m.coding_evaluation; return m.offering==='go' && e?.cohort===CODING_COHORT && e.status==='matched' && Number.isFinite(e.score_pct) ? e.score_pct : null; }
function codingReason(m) { return m.offering!=='go' ? 'Console 제공 항목은 Go 평가·조건을 자동 상속하지 않습니다.' : m.coding_evaluation?.reason || '동일 평가의 정확한 모델 결과를 확인하지 못했습니다.'; }
function codingCell(m) { const score=codingScore(m);return `<span class="badge" title="${esc(codingReason(m))}">${score===null?'미평가':score.toFixed(1)+'%'}</span>${score===null?'': '<span class="metric-note">AA TB4</span>'}`; }
// A token-budget illustration, NOT official request estimates or successful tasks.
function workloadCapacity(m) { const i=activePrice(m,'input_price'),o=activePrice(m,'output_price'),c=Number.isFinite(i)&&Number.isFinite(o)?i+o*0.2:null,u=effectiveMonthlyUsage(m); return m.offering==='go' && !m.unlimited && c>0 && Number.isFinite(u) ? u/c : null; }
function valueCell(m) { const n=workloadCapacity(m); return m.offering!=='go' ? '<span class="metric-note">Go 전용</span>' : m.unlimited ? '<span class="metric-note">한시 무료<br>비교 제외</span>' : n===null ? '<span class="metric-note">조건 미확인</span>' : `<strong>${n.toLocaleString(undefined,{maximumFractionDigits:1})}</strong><span class="metric-note">workloads/mo</span>`; }
function metricDetails(m) {
 const e=m.coding_evaluation,score=codingScore(m),n=workloadCapacity(m);
 const coding=score===null?codingReason(m):`${e.benchmark} · ${score.toFixed(2)}% · ${e.evaluator} 독립 평가 · ${e.evaluated_model} · ${e.harness} · ${e.metric} · effort ${e.effort||"미공개"}. 동일 taskset/harness라도 모델별 effort·토큰 사용량은 다를 수 있습니다. 원모델 평가이며 Go endpoint 직접 측정이 아닙니다. Go의 checkpoint/effort 일치는 검증되지 않았습니다.`;
 const reference=e?.reference?`<p>별도 checkpoint 참고: ${esc(e.reference.evaluated_model)} · ${esc(e.reference.score_pct)}% (${esc(e.reference.benchmark)}). Go 모델 매핑 미확정이므로 Coding 정렬에서 제외.</p>`:'';
 const value=m.offering!=='go'?'Console에는 Go 사용량을 적용하지 않습니다.':m.unlimited?'한시 무료는 유한한 Value 수치나 최고 등급으로 변환하지 않습니다.':n===null?'공식 한도 또는 가격이 미확인입니다.':`${n.toFixed(2)} workloads/mo = 현재 Effective Usage ${money(effectiveMonthlyUsage(m),2)} ÷ ${money(cost(m),4)}. 1 workload는 여러 요청에 걸친 input 1M + output 200K tokens, 캐시 0%, 기본 짧은-context 가격(DeepSeek는 off-peak) 가정입니다. 활성 프로모션을 반영합니다. 실제 요청 수·완료 작업 수·성능 대비 가성비가 아니며, 공식 Req/mo와 별도입니다. 공유 Go quota와 5h/주간 제한을 함께 적용하므로 모델별 용량을 더할 수 없습니다.`;
 return `<h3>Coding / Value 산정 근거</h3><p>${esc(coding)}</p>${e?.source?`<p><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">평가 원문 · ${esc(e.checked_at)}</a>${e.methodology_source?` · <a href="${esc(e.methodology_source)}" target="_blank" rel="noopener noreferrer">평가 방법</a>`:''}</p>`:''}${reference}<p>${esc(value)}</p>`;
}

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function activePrice(m, key) { return m.base_prices && !isPromotionActive(m) ? m.base_prices[key] : m[key]; }
function cost(m) { const i=activePrice(m,'input_price'),o=activePrice(m,'output_price'); return i==null||o==null ? null : +(i+o*0.2).toFixed(3); }
function money(v, digits=3) { return v==null ? 'N/A' : '$'+Number(v).toFixed(digits); }
function offeringLabel(m) { return ({go:'Go subscription','console-free':'Console · Free','console-payg':'Console · Pay-as-you-go'})[m.offering] || 'Go subscription'; }
function monthlyLabel(m) { return m.offering!=='go' ? (m.offering==='console-free'?'Not stated':'N/A · PAYG') : m.unlimited?'Unlimited':money(effectiveMonthlyUsage(m),0); }
function details(m) { return `${metricDetails(m)}<p>${esc(m.notes||'')}</p>${m.selection_id?`<p>Model ID: ${esc(m.selection_id)}</p>`:''}<p>Training: ${esc(m.training||'Unknown')} · Retention: ${esc(m.retention||'Unknown')}</p><p>Hosting: ${esc(m.hosting||'Unknown')} · China transfer: ${esc(m.china_transfer||'Unknown')}</p><p>Developer: ${esc(m.developer||'Unknown')} · Provider: ${esc(m.provider||'Unknown')}</p><p>Context: ${esc(m.context||'Unknown')}</p><p>Benchmark: ${esc(m.benchmark||'N/A')}</p><p>Token prices · USD / 1M (input / output / cache read / cache write): ${money(m.input_price,4)} / ${money(m.output_price,4)} / ${money(m.cached_input,6)} / ${money(m.cached_write,4)}</p><p>Reasoning: ${m.reasoning==null?'Unknown':esc(m.reasoning)} ${esc(m.reasoning_effort||'')}</p>${m.offering==='go'?`<p>Go base monthly usage: ${money(m.monthly_usage_usd,0)} · base requests (5h / week / month): ${fmtInt(m.requests_5h)} / ${fmtInt(m.requests_week)} / ${fmtInt(m.requests_month)}</p><p>Current effective monthly usage: ${monthlyLabel(m)} · requests/month: ${m.unlimited?'Unlimited':fmtInt(effectiveRequestsMonth(m))}</p>`:''}${m.limits?`<p>Limits: ${esc(m.limits)}</p>`:''}${m.promotion?`<p>Promotion end: ${esc(m.promotion_end||'Unknown')}</p>`:''}${m.price_tiers?`<p>Published tiers as of ${esc(m.checked_at)} · USD / 1M tokens (input / output / cache read / cache write):</p>${(m.base_prices&&!isPromotionActive(m)?[{...m.base_prices,label:'Base prices after recorded promotion expiry',cached_write:m.cached_write}]:m.price_tiers).map(t=>`<p>${esc(t.label)}: ${money(t.input_price)} / ${money(t.output_price)} / ${money(t.cached_input,4)} / ${money(t.cached_write,4)}</p>`).join('')}`:''}${m.sources?.length?`<p>Additional sources: ${m.sources.map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`).join(' · ')}</p>`:''}${m.source?`<p><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">Official source</a> · ${esc(m.checked_at)}</p>`:''}`; }
function badge(v, prefix = 'grade') { return `<span class="badge ${prefix}-${esc(v)}">${esc(v)}</span>`; }
function chinaClass(v) { return v === 'Yes' ? 'yes' : v === 'Possible' ? 'possible' : v === 'No evidence' ? 'no-evidence' : ''; }
function fmtInt(v) { return v == null ? 'N/A' : Number(v).toLocaleString(); }
function isPromotionActive(m) { if (!m?.promotion) return false; if (!m.promotion_end) return true; return new Date().toISOString().slice(0, 10) <= m.promotion_end; }
function effectiveMonthlyUsage(m) { return isPromotionActive(m) ? (m.promotional_monthly_usage_usd ?? m.monthly_usage_usd ?? null) : (m.monthly_usage_usd ?? null); }
function effectiveRequestsMonth(m) { return isPromotionActive(m) ? (m.promotional_requests_month ?? m.requests_month ?? null) : (m.requests_month ?? null); }
function cmp(a,b,key){
 const value=m=>key==='coding_grade'?codingScore(m):key==='value_grade'?workloadCapacity(m):key==='estimated_cost'?cost(m):key==='monthly_usage_usd'?effectiveMonthlyUsage(m):key==='requests_month'?effectiveRequestsMonth(m):['input_price','output_price','cached_input'].includes(key)?activePrice(m,key):m[key];
 const av=value(a),bv=value(b);
 if(av==null&&bv==null)return a.model.localeCompare(b.model);
 // Missing or excluded evaluations stay last in either sort direction.
 if(av==null)return state.sortDir; if(bv==null)return -state.sortDir;
 if(typeof av==='number'&&typeof bv==='number')return av-bv;
 return String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
}
function filtered(){const q=$('#search').value.trim().toLowerCase(),privacy=$('#privacy').value,china=$('#china').value,pos=$('#position').value,offering=$('#offering').value;return state.rows.filter(m=>{const hay=JSON.stringify(m).toLowerCase();return(!offering||(offering==='go-free'?['go','console-free'].includes(m.offering):m.offering===offering))&&(!q||hay.includes(q))&&(!privacy||m.privacy_risk===privacy)&&(!china||m.china_transfer===china)&&(!pos||(m.positioning||[]).includes(pos));}).sort((a,b)=>state.sortDir*cmp(a,b,state.sortKey));}
function render(){const rows=filtered();$('#count').textContent=`${rows.length} offerings`;$('#models').innerHTML=rows.map(m=>`<tr><td>${esc(m.model)}<span class="offering-label">${esc(offeringLabel(m))}</span><button type="button" class="details-button" data-offering-id="${esc(m.offering_id)}" aria-haspopup="dialog" aria-controls="model-dialog" aria-label="${esc(m.model)} · ${esc(offeringLabel(m))} 상세 / 조건">상세 / 조건</button>${isPromotionActive(m)?`<span class="promotion-badge">${esc(m.promotion)}</span>`:''}</td><td>${esc(m.developer)}</td><td>${codingCell(m)}</td><td>${valueCell(m)}</td><td class="usage"><strong>${monthlyLabel(m)}</strong></td><td>${m.offering!=='go'?'N/A':m.unlimited?'Unlimited':fmtInt(effectiveRequestsMonth(m))}</td><td>${money(cost(m))}</td><td>${money(activePrice(m,'input_price'))}</td><td>${money(activePrice(m,'output_price'))}</td><td>${money(activePrice(m,'cached_input'),4)}</td><td>${esc(m.context)}</td><td>${esc(m.benchmark||'N/A')}</td><td>${esc(m.training)}</td><td>${esc(m.retention)}</td><td>${esc(m.hosting)}</td><td class="${chinaClass(m.china_transfer)}">${esc(m.china_transfer)}</td><td>${badge(m.privacy_risk,'risk')}</td><td><div class="tags">${(m.positioning||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></td></tr>`).join('');}
function modelByName(name){return state.rows.find(m=>m.offering==='go'&&m.model===name);}
function summary(){const r=state.recommendations||{},performance=modelByName(r.absolute_performance),value=modelByName(r.best_value),privacy=modelByName(r.sensitive_code),cheap=modelByName(r.cheap_subagent);const usageDetail=m=>m?`$${effectiveMonthlyUsage(m)} monthly limit · 약 ${fmtInt(effectiveRequestsMonth(m))} req/mo`:'';const cards=[['Go · 절대 성능',performance?.model||'검증 필요',performance?`현재 Go 조건부 성능 추천 · ${usageDetail(performance)}`:''],['Go · 가성비',value?.model||'검증 필요',value?`Est. ${money(cost(value))} · ${usageDetail(value)}${isPromotionActive(value)?' · '+value.promotion:''}`:''],['Go · 민감 코드',privacy?.model||'검증 필요',privacy?`현재 Go 내 조건부 추천 · ${usageDetail(privacy)}`:''],['Go · 저가 서브에이전트',cheap?.model||'-',cheap?`Est. ${money(cost(cheap))} · ${usageDetail(cheap)}`:'']];$('#summary').innerHTML=cards.map(([k,v,d])=>`<article class="card"><span class="kicker">${esc(k)}</span><span class="value">${esc(v||'-')}</span><div class="detail">${esc(d)}</div></article>`).join('');}
async function init(){const[modelRes,usageRes,consoleRes]=await Promise.all([fetch('data/models.json',{cache:'no-store'}),fetch('data/usage.json',{cache:'no-store'}),fetch('data/console.json',{cache:'no-store'})]);if(!modelRes.ok)throw new Error(`model data load failed: ${modelRes.status}`);if(!usageRes.ok)throw new Error(`usage data load failed: ${usageRes.status}`);if(!consoleRes.ok)throw new Error(`Console data load failed: ${consoleRes.status}`);const data=await modelRes.json(),usage=await usageRes.json(),consoleData=await consoleRes.json();state.rows=(data.models||[]).map(m=>({...m,...(usage.models?.[m.model]||{}),offering:'go',offering_id:'go:'+m.model}));state.rows.push(...(consoleData.models||[]));state.recommendations=data.recommendations||{};const latestAsOf=[data.as_of,usage.as_of,consoleData.as_of].filter(Boolean).sort().at(-1)||'N/A';const sourceDates=` · Go models ${data.as_of||'N/A'} / Go usage ${usage.as_of||'N/A'} / Console ${consoleData.as_of||'N/A'}`;const p=usage.limit_policy||{};const limitText=[p.five_hour_fraction,p.weekly_fraction,p.monthly_fraction].every(v=>v!=null)?` · Go limit windows: 5h ${Math.round(p.five_hour_fraction*100)}% / week ${Math.round(p.weekly_fraction*100)}% / month ${Math.round(p.monthly_fraction*100)}%`:'';$('#meta').textContent=`Last checked ${LAST_CHECKED} · Data changed ${latestAsOf}${sourceDates} · ${state.rows.length} tracked offerings${limitText}`;const coverage=state.rows.filter(m=>codingScore(m)!==null).length;if($('#benchmark-coverage'))$('#benchmark-coverage').textContent=`Coding: AA Terminal-Bench 4.0 동일 평가 ${coverage}/${data.models.length} Go 모델 · 원모델 평가, Go endpoint 미측정. 미평가는 0점이 아닙니다. Value: 고정 토큰 workload 월 처리 가능량 예시, 성능 등급 아님.`;summary();render();}
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


