const state = { rows: [], recommendations: {}, sortKey: 'coding_grade', sortDir: -1 };
const DEFAULT_OFFERING = 'go-free';
const LAST_CHECKED = '2026-10-23';
const $ = (s) => document.querySelector(s);
// Coding is one named evaluation, not a synthetic cross-benchmark grade.
const CODING_COHORT = 'aa-terminalbench-4.0-mini-swe';
function codingScore(m) { const e=m.coding_evaluation; return m.offering==='go' && e?.cohort===CODING_COHORT && e.status==='matched' && Number.isFinite(e.score_pct) ? e.score_pct : null; }
function codingReason(m) { return m.offering!=='go' ? 'Console 제공 항목은 Go 평가·조건을 자동 상속하지 않습니다.' : m.coding_evaluation?.reason || '동일 평가의 정확한 모델 결과를 확인하지 못했습니다.'; }
function codingCell(m) { const score=codingScore(m);return `<span class="badge" title="${esc(codingReason(m))}">${score===null?'미평가':score.toFixed(1)+'%'}</span>${score===null?'': '<span class="metric-note">AA TB4</span>'}`; }
// A token-budget illustration, NOT official request estimates or successful tasks.
function workloadCapacity(m) { const i=activePrice(m,'input_price'),o=activePrice(m,'output_price'),c=Number.isFinite(i)&&Number.isFinite(o)?i+o*0.2:null,u=effectiveMonthlyUsage(m); return m.offering==='go' && !m.unlimited && c>0 && Number.isFinite(u) ? u/c : null; }
function workloadCost(m) { const i=activePrice(m,'input_price'),o=activePrice(m,'output_price'); return Number.isFinite(i)&&Number.isFinite(o)?i+o*0.2:null; }
function performancePerDollar(m) { const score=codingScore(m),c=workloadCost(m); return score!==null && !m.unlimited && c>0 ? score/c : null; }
function valueRaw(m) { const score=codingScore(m),n=workloadCapacity(m); return score!==null && n!==null && n>0 ? score*n : null; }
function valueIndex(m,rows=state.rows) { const raw=valueRaw(m),values=rows.map(valueRaw).filter(v=>v!==null),max=Math.max(0,...values); return raw!==null && max>0 ? raw/max*100 : null; }
function valueCell(m) { const n=valueIndex(m); return m.offering!=='go' ? '<span class="metric-note">Go 전용</span>' : m.unlimited ? '<span class="metric-note">한시 무료<br>비교 제외</span>' : codingScore(m)===null ? '<span class="metric-note">벤치 미평가</span>' : n===null ? '<span class="metric-note">조건 미확인</span>' : `<strong>${n.toLocaleString(undefined,{maximumFractionDigits:1})}</strong><span class="metric-note">가성비 지수</span>`; }
function metricDetails(m) {
 const e=m.coding_evaluation,score=codingScore(m),n=workloadCapacity(m);
 const coding=score===null?codingReason(m):`${e.benchmark} · ${score.toFixed(2)}% · ${e.evaluator} 독립 평가 · ${e.evaluated_model} · ${e.harness} · ${e.metric} · effort ${e.effort||"미공개"}. 동일 taskset/harness라도 모델별 effort·토큰 사용량은 다를 수 있습니다. 원모델 평가이며 Go endpoint 직접 측정이 아닙니다. Go의 checkpoint/effort 일치는 검증되지 않았습니다.`;
 const reference=e?.reference?`<p>별도 checkpoint 참고: ${esc(e.reference.evaluated_model)} · ${esc(e.reference.score_pct)}% (${esc(e.reference.benchmark)}). Go 모델 매핑 미확정이므로 Coding 정렬에서 제외.</p>`:'';
 const idx=valueIndex(m),raw=valueRaw(m),perDollar=performancePerDollar(m);
 const value=m.offering!=='go'?'Console에는 Go 가성비·사용량을 적용하지 않습니다.':m.unlimited?'한시 무료는 무한 가성비나 최고 등급으로 변환하지 않습니다.':score===null?'동일 코호트의 벤치 결과가 없어 가성비를 산정하지 않습니다.':idx===null?'가격·Effective Usage 또는 비교 기준이 미확인입니다.':`Go 구독 가성비 지수 ${idx.toFixed(2)} = (AA TB4 ${score.toFixed(4)}%p × 월 토큰 용량 ${n.toFixed(4)}) ÷ 전체 Go 평가 가능 코호트의 최대 곱 × 100. 원시 곱 ${raw.toFixed(4)}, 성능/비용 ${perDollar.toFixed(4)} %p/$입니다. 같은 월 구독비에서 성능과 용량을 선형으로 결합한 대리지수로, 낮은 성능의 저가 모델이 높아질 수 있으며 절대 추천·성공확률·해결 작업 수·실측 성공당 비용을 뜻하지 않습니다. 기준 데이터 2026-10-23, 전체 Go 동일 AA TB4 코호트 최고=100이며 필터와 무관합니다. effort와 실제 토큰 사용량은 모델별로 다릅니다.`;
 const capacity=n===null?'':`보조 월 용량 ${n.toFixed(2)} workloads/mo = 현재 Effective Usage ${money(effectiveMonthlyUsage(m),2)} ÷ workload 비용 ${money(workloadCost(m),4)}. 1 workload는 여러 짧은-context 요청에 걸친 input 1M + output 200K tokens, 캐시 0%, 기본 가격(DeepSeek off-peak) 가정입니다. 활성 프로모션을 반영하고 만료 시 가격·한도·지수를 재계산합니다. 공유 Go quota와 5h/주간 제한이 함께 적용되어 모델별 용량을 더할 수 없습니다. 공식 Req/mo와 별도이며 실제 요청 수가 아닙니다.`;
 return `<h3>Coding / Value 산정 근거</h3><p>${esc(coding)}</p>${e?.source?`<p><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">평가 원문 · ${esc(e.checked_at)}</a>${e.methodology_source?` · <a href="${esc(e.methodology_source)}" target="_blank" rel="noopener noreferrer">평가 방법</a>`:''}</p>`:''}${reference}<p>${esc(value)}</p><p>${esc(capacity)}</p>`;
}

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function activePrice(m, key) { return m.base_prices && !isPromotionActive(m) ? m.base_prices[key] : m[key]; }
function cost(m) { const i=activePrice(m,'input_price'),o=activePrice(m,'output_price'); return i==null||o==null ? null : +(i+o*0.2).toFixed(3); }
function money(v, digits=3) { return v==null ? 'N/A' : '$'+Number(v).toFixed(digits); }
function offeringLabel(m) { return ({go:'Go subscription','console-free':'Console · Free','console-payg':'Console · Pay-as-you-go'})[m.offering] || 'Go subscription'; }
function monthlyLabel(m) { return m.offering!=='go' ? (m.offering==='console-free'?'Not stated':'N/A · PAYG') : m.unlimited?'Unlimited':money(effectiveMonthlyUsage(m),0); }
function details(m) { return `${metricDetails(m)}${privacyFilterDetails(m)}<p>${esc(m.notes||'')}</p>${m.selection_id?`<p>Model ID: ${esc(m.selection_id)}</p>`:''}<p>Training: ${esc(m.training||'Unknown')} · Retention: ${esc(m.retention||'Unknown')}</p><p>Hosting: ${esc(m.hosting||'Unknown')} · China transfer: ${esc(m.china_transfer||'Unknown')}</p><p>Developer: ${esc(m.developer||'Unknown')} · Provider: ${esc(m.provider||'Unknown')}</p><p>Context: ${esc(m.context||'Unknown')}</p><p>Benchmark: ${esc(m.benchmark||'N/A')}</p><p>Token prices · USD / 1M (input / output / cache read / cache write): ${money(m.input_price,4)} / ${money(m.output_price,4)} / ${money(m.cached_input,6)} / ${money(m.cached_write,4)}</p><p>Reasoning: ${m.reasoning==null?'Unknown':esc(m.reasoning)} ${esc(m.reasoning_effort||'')}</p>${m.offering==='go'?`<p>Go base monthly usage: ${money(m.monthly_usage_usd,0)} · base requests (5h / week / month): ${fmtInt(m.requests_5h)} / ${fmtInt(m.requests_week)} / ${fmtInt(m.requests_month)}</p><p>Current effective monthly usage: ${monthlyLabel(m)} · requests/month: ${m.unlimited?'Unlimited':fmtInt(effectiveRequestsMonth(m))}</p>`:''}${m.limits?`<p>Limits: ${esc(m.limits)}</p>`:''}${m.promotion?`<p>Promotion end: ${esc(m.promotion_end||'Unknown')}</p>`:''}${m.price_tiers?`<p>Published tiers as of ${esc(m.checked_at)} · USD / 1M tokens (input / output / cache read / cache write):</p>${(m.base_prices&&!isPromotionActive(m)?[{...m.base_prices,label:'Base prices after recorded promotion expiry',cached_write:m.cached_write}]:m.price_tiers).map(t=>`<p>${esc(t.label)}: ${money(t.input_price)} / ${money(t.output_price)} / ${money(t.cached_input,4)} / ${money(t.cached_write,4)}</p>`).join('')}`:''}${m.sources?.length?`<p>Additional sources: ${m.sources.map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`).join(' · ')}</p>`:''}${m.source?`<p><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">Official source</a> · ${esc(m.checked_at)}</p>`:''}`; }
function badge(v, prefix = 'grade') { return `<span class="badge ${prefix}-${esc(v)}">${esc(v)}</span>`; }
function chinaClass(v) { return v === 'Yes' ? 'yes' : v === 'Possible' ? 'possible' : v === 'No evidence' ? 'no-evidence' : ''; }
function fmtInt(v) { return v == null ? 'N/A' : Number(v).toLocaleString(); }
function isPromotionActive(m) { if (!m?.promotion) return false; if (!m.promotion_end) return true; return new Date().toISOString().slice(0, 10) <= m.promotion_end; }
function effectiveMonthlyUsage(m) { return isPromotionActive(m) ? (m.promotional_monthly_usage_usd ?? m.monthly_usage_usd ?? null) : (m.monthly_usage_usd ?? null); }
function effectiveRequestsMonth(m) { return isPromotionActive(m) ? (m.promotional_requests_month ?? m.requests_month ?? null) : (m.requests_month ?? null); }
function cmp(a,b,key){
 const value=m=>key==='coding_grade'?codingScore(m):key==='value_grade'?valueIndex(m):key==='estimated_cost'?cost(m):key==='monthly_usage_usd'?effectiveMonthlyUsage(m):key==='requests_month'?effectiveRequestsMonth(m):['input_price','output_price','cached_input'].includes(key)?activePrice(m,key):m[key];
 const av=value(a),bv=value(b);
 if(av==null&&bv==null)return a.model.localeCompare(b.model);
 // Missing or excluded evaluations stay last in either sort direction.
 if(av==null)return state.sortDir; if(bv==null)return -state.sortDir;
 if(typeof av==='number'&&typeof bv==='number')return av-bv;
 return String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
}
// Fail closed: only the exact recorded offering policy is eligible, never a model-name match.
// Unknown upstream region does not override an explicit offering-level policy or prove region safety.
function privacyEligibility(m, today = new Date().toISOString().slice(0,10)) {
 const training = typeof m.training === 'string' ? m.training.trim() : null;
 const retention = typeof m.retention === 'string' ? m.retention.trim() : null;
 const dated = /^0 days \(ZDR valid through (\d{4}-\d{2}-\d{2})\)$/.exec(retention || '');
 const validDate = dated && Number.isFinite(Date.parse(dated[1]+'T00:00:00Z')) && new Date(dated[1]+'T00:00:00Z').toISOString().slice(0,10) === dated[1];
 const noTraining = training === 'No Training';
 const zeroRetention = retention === '0 days' || Boolean(validDate && today <= dated[1]);
 return { noTraining, zeroRetention, validThrough: validDate ? dated[1] : null, expired: Boolean(validDate && today > dated[1]) };
}
function privacyFilterDetails(m) {
 const p=privacyEligibility(m);
 return `<p>프라이버시 필터: 학습 미사용 ${p.noTraining?'확인':'미확인 또는 학습 허용'} · Retention 0 ${p.zeroRetention?'확인':p.expired?'확인 기한 만료':'미확인 또는 보존 있음'}${p.validThrough?' (확인 기한 '+esc(p.validThrough)+', UTC 날짜 기준)':''}. 제공 방식별 공개 정책 기준이며 실제 upstream·처리 지역 확인이나 민감 코드 사용 승인을 뜻하지 않습니다.</p>`;
}
function filtered(){const q=$('#search').value.trim().toLowerCase(),privacy=$('#privacy').value,china=$('#china').value,pos=$('#position').value,offering=$('#offering').value;return state.rows.filter(m=>{const hay=JSON.stringify(m).toLowerCase();return(!$('#no-training')?.checked||privacyEligibility(m).noTraining)&&(!$('#zero-retention')?.checked||privacyEligibility(m).zeroRetention)&&(!offering||(offering==='go-free'?['go','console-free'].includes(m.offering):m.offering===offering))&&(!q||hay.includes(q))&&(!privacy||m.privacy_risk===privacy)&&(!china||m.china_transfer===china)&&(!pos||(m.positioning||[]).includes(pos));}).sort((a,b)=>state.sortDir*cmp(a,b,state.sortKey));}
function render(){const rows=filtered();renderShortlist(rows);$('#count').textContent=`${rows.length} offerings`;$('#models').innerHTML=rows.map(m=>`<tr><td>${esc(m.model)}<span class="offering-label">${esc(offeringLabel(m))}</span><button type="button" class="details-button" data-offering-id="${esc(m.offering_id)}" aria-haspopup="dialog" aria-controls="model-dialog" aria-label="${esc(m.model)} · ${esc(offeringLabel(m))} 상세 / 조건">상세 / 조건</button>${isPromotionActive(m)?`<span class="promotion-badge">${esc(m.promotion)}</span>`:''}</td><td>${esc(m.developer)}</td><td>${codingCell(m)}</td><td>${valueCell(m)}</td><td class="usage"><strong>${monthlyLabel(m)}</strong></td><td>${m.offering!=='go'?'N/A':m.unlimited?'Unlimited':fmtInt(effectiveRequestsMonth(m))}</td><td>${money(cost(m))}</td><td>${money(activePrice(m,'input_price'))}</td><td>${money(activePrice(m,'output_price'))}</td><td>${money(activePrice(m,'cached_input'),4)}</td><td>${esc(m.context)}</td><td>${esc(m.benchmark||'N/A')}</td><td>${esc(m.training)}</td><td>${esc(m.retention)}</td><td>${esc(m.hosting)}</td><td class="${chinaClass(m.china_transfer)}">${esc(m.china_transfer)}</td><td>${badge(m.privacy_risk,'risk')}</td><td><div class="tags">${(m.positioning||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></td></tr>`).join('');if(globalThis.OpenCodeData)globalThis.OpenCodeData.render(rows);}
function modelByName(name){return state.rows.find(m=>m.offering==='go'&&m.model===name);}
async function init(){const[modelRes,usageRes,consoleRes]=await Promise.all([fetch('data/models.json',{cache:'no-store'}),fetch('data/usage.json',{cache:'no-store'}),fetch('data/console.json',{cache:'no-store'})]);if(!modelRes.ok)throw new Error(`model data load failed: ${modelRes.status}`);if(!usageRes.ok)throw new Error(`usage data load failed: ${usageRes.status}`);if(!consoleRes.ok)throw new Error(`Console data load failed: ${consoleRes.status}`);const data=await modelRes.json(),usage=await usageRes.json(),consoleData=await consoleRes.json();state.rows=(data.models||[]).map(m=>({...m,...(usage.models?.[m.model]||{}),offering:'go',offering_id:'go:'+m.model}));state.rows.push(...(consoleData.models||[]));state.recommendations=data.recommendations||{};const latestAsOf=[data.as_of,usage.as_of,consoleData.as_of].filter(Boolean).sort().at(-1)||'N/A';const sourceDates=` · Go models ${data.as_of||'N/A'} / Go usage ${usage.as_of||'N/A'} / Console ${consoleData.as_of||'N/A'}`;const p=usage.limit_policy||{};const limitText=[p.five_hour_fraction,p.weekly_fraction,p.monthly_fraction].every(v=>v!=null)?` · Go limit windows: 5h ${Math.round(p.five_hour_fraction*100)}% / week ${Math.round(p.weekly_fraction*100)}% / month ${Math.round(p.monthly_fraction*100)}%`:'';$('#meta').textContent=`Last checked ${LAST_CHECKED} · Data changed ${latestAsOf}${sourceDates} · ${state.rows.length} tracked offerings${limitText}`;const coverage=state.rows.filter(m=>codingScore(m)!==null).length;if($('#benchmark-coverage'))$('#benchmark-coverage').textContent=`Coding: AA Terminal-Bench 4.0 동일 평가 ${coverage}/${data.models.length} Go 모델 · 원모델 평가, Go endpoint 미측정. 미평가는 0점이 아닙니다. Value: 동일 Go 구독비 기준 성능 × 월 토큰 용량 가성비 지수(평가 가능 최고=100).`;summary();render();loadPopularity();}
$('#offering').value=DEFAULT_OFFERING;
['no-training','zero-retention'].forEach(id=>{if($(`#${id}`))$(`#${id}`).checked=false;});
['search','privacy','china','position','offering','no-training','zero-retention'].forEach(id=>$(`#${id}`)?.addEventListener(id==='search'?'input':'change',render));
$('#reset').addEventListener('click',()=>{['no-training','zero-retention'].forEach(id=>{if($(`#${id}`))$(`#${id}`).checked=false;});['search','privacy','china','position'].forEach(id=>$(`#${id}`).value='');$('#offering').value=DEFAULT_OFFERING;state.sortKey='coding_grade';state.sortDir=-1;if($('#rank-axis'))$('#rank-axis').value='coding_grade';render();});
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
  $('#model-dialog-content').innerHTML = (globalThis.OpenCodeData?.details(model) || '') + details(model);
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






// Decisions use existing, auditable metrics. No combined quality/popularity score.
function decisionLeaders(rows=state.rows) {
 const ranked=key=>rows.filter(m=>key(m)!==null).slice().sort((a,b)=>key(b)-key(a)||a.model.localeCompare(b.model));
 return {performance:ranked(codingScore)[0]||null,value:ranked(valueRaw)[0]||null,balanced:rows.find(m=>m.offering==='go'&&m.model===state.recommendations.best_value)||null};
}
function summary(){
 const r=decisionLeaders(),p=r.performance,v=r.value,b=r.balanced;
 const card=(kind,title,m,metric,why,caveat)=>`<article class="card ${kind}"><span class="kicker">${title}</span><h3>${esc(m?.model||'판단 보류')}</h3><div class="decision-metric">${esc(metric)}</div><p>${esc(why)}</p><p class="tradeoff">${esc(caveat)}</p>${m?`<button type="button" data-offering-id="${esc(m.offering_id)}" aria-haspopup="dialog" aria-controls="model-dialog">근거와 조건 보기 ↗</button>`:''}</article>`;
 $('#summary').innerHTML=card('performance','Go · 측정 성능 선두',p,p?`AA TB4 ${codingScore(p).toFixed(1)}%`:'측정 없음','동일 AA Terminal-Bench 4.0 코호트의 가장 높은 기록. 난도 높은 작업의 비교 출발점입니다.','기본 모델 평가이며 Go endpoint 실측이 아닙니다. effort 차이·미확인 checkpoint 제외로 절대 최고를 뜻하지 않습니다.')+card('value','Go · 계산 Value 선두',v,v?`Value ${valueIndex(v).toFixed(1)} / 100`:'계산 불가','측정 성능 × 월 토큰 대리용량을 전체 Go 적격 코호트 최고=100으로 정규화합니다.','낮은 단가·높은 용량에 유리합니다. 실제 성공률이나 보편적 최선이 아니며 무료는 계산에서 제외합니다.')+card('balanced','Go · 실용 후보',b,b?`작업량당 ${money(cost(b))}`:'조건 재검토','기존 검토 추천인 MiMo-V2.6-Flash. 반복 작업에서 비용과 측정 성능을 함께 확인할 출발 후보입니다.','계산 Value 1위와 별개인 편집 추천입니다. 1M 입력 + 200K 출력·캐시 0% 기준이며 어려운 작업은 성능 선두와 직접 비교하세요.');
}
function renderShortlist(rows){
 document.querySelectorAll('th[data-key]').forEach(th=>th.setAttribute('aria-sort',th.dataset.key===state.sortKey?(state.sortDir===-1?'descending':'ascending'):'none'));
 if(!$('#shortlist'))return;
 const k=state.sortKey,metric=m=>k==='coding_grade'?(codingScore(m)===null?'미평가':codingScore(m).toFixed(1)+'%'):k==='value_grade'?(valueIndex(m)===null?'계산 제외':valueIndex(m).toFixed(1)):k==='estimated_cost'?money(cost(m)):offeringLabel(m);
 $('#rank-explanation').textContent=({coding_grade:'AA TB4 동일 코호트의 Go 기본 모델 측정값입니다. 미평가·checkpoint 미확인은 마지막에 표시합니다. 작은 점수 차이는 확정적 우열이 아닙니다.',value_grade:'Go 성능 × 대리용량 지수입니다. 저가·대용량에 유리하며 프로모션 만료에 따라 달라집니다. 전체 Go 정규화 기준은 필터로 바뀌지 않습니다.',estimated_cost:'입력 1M + 출력 200K, 캐시 0%의 예상 토큰 비용입니다. Go 월 구독료나 실제 성공한 작업의 비용과 다릅니다.'})[k]||'현재 표 정렬 순서입니다. 추천 카드는 전체 Go 기준을 유지합니다.';
 $('#shortlist').innerHTML=rows.length?rows.slice(0,6).map((m,i)=>`<article class="shortlist-item"><span class="rank-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(m.model)}</h3><span class="offering-label">${esc(offeringLabel(m))}</span></div><strong>${esc(metric(m))}</strong><button type="button" data-offering-id="${esc(m.offering_id)}" aria-haspopup="dialog" aria-controls="model-dialog" aria-label="${esc(m.model)} 근거와 조건">근거 / 조건</button></article>`).join(''):'<p class="empty">조건에 맞는 모델이 없습니다. 필터를 초기화하거나 조건을 줄여보세요.</p>';
}
function popularityCandidates(entry,rows=state.rows){return rows.filter(m=>entry.mapping_status==='family_reference_only'&&entry.candidate_offering_ids.includes(m.offering_id));}
async function loadPopularity(){
 try{const res=await fetch('data/popularity.json',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const d=await res.json();if(d.schema_version!==1||!Array.isArray(d.models))throw Error('Invalid popularity schema');
 $('#popularity-meta').textContent=`지난 7일 토큰 순위 · 일간 사용자: ${d.users_date} · 공식 갱신: ${d.updated_at.replace('T',' ').replace('Z',' UTC')} · 확인 ${d.checked_at} · UTC 기준 · 공식 표시 반올림값 · 토큰은 입력/출력/추론/캐시 포함, 사용자는 근사 고유 수`;
 state.popularity=d;renderPopularity(d);
 }catch(err){if($('#popularity-meta'))$('#popularity-meta').textContent='사용 통계를 불러오지 못했습니다. 공식 Data 링크에서 확인하세요. 모델 비교는 계속 사용할 수 있습니다.';console.error(err);}
}
function popularityRows(d,axis='tokens'){return d.models.filter(m=>axis==='users'?Number.isFinite(m.daily_unique_users):Number.isFinite(m.tokens_trillion)).slice().sort((a,b)=>axis==='users'?b.daily_unique_users-a.daily_unique_users:b.tokens_trillion-a.tokens_trillion);}
function renderPopularity(d){
 $('#popularity-list').innerHTML=popularityRows(d,$('#popularity-axis')?.value||'tokens').map((m,i)=>`<article class="popularity-row"><span class="rank-number">${String(i+1).padStart(2,'0')}</span><div class="pop-model"><h3>${esc(m.model)}</h3><p>대응 후보 ${popularityCandidates(m).length}개 제공 항목 · 경로별 귀속 미확인</p><details><summary>제공 항목 대응 근거</summary><p>${esc(m.mapping_note)}</p><ul>${popularityCandidates(m).map(x=>`<li>${esc(x.offering_id)}</li>`).join('')}</ul></details></div><div><strong>${m.tokens_trillion===null?'—':esc(m.tokens_trillion)+'T'}</strong><span>7일 토큰 · 캐시 포함</span></div><div><strong>${m.change_pct===null?'—':(m.change_pct>0?'+':'')+esc(m.change_pct)+'%'}</strong><span>이전 주 대비</span></div><div><strong>${(m.daily_unique_users/1000).toLocaleString('en-US')}K</strong><span>일간 사용자(근사)</span></div></article>`).join('');
}
$('#popularity-axis')?.addEventListener('change',()=>{if(state.popularity)renderPopularity(state.popularity);});
$('#rank-axis')?.addEventListener('change',()=>{state.sortKey=$('#rank-axis').value;state.sortDir=['coding_grade','value_grade'].includes(state.sortKey)?-1:1;render();});
['summary','shortlist'].forEach(id=>$(`#${id}`)?.addEventListener('click',event=>{const trigger=event.target.closest('button[data-offering-id]');if(trigger)openDetails(trigger.dataset.offeringId,trigger);}));
document.querySelectorAll('th[data-key]').forEach(th=>{
 th.innerHTML=`<button type="button" class="sort-button" aria-label="${esc(th.textContent)} 정렬">${esc(th.textContent)}</button>`;
});


