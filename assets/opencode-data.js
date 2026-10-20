/* OpenCode Data is a separate reference view. It never writes offering prices,
 * quotas, privacy, AA Coding/Value, or recommendations. */
(() => {
  'use strict';
  const axisKeys = ['reasoning','coding','cost','context','multimodal','tool'];
  const labels = {reasoning:'Reasoning',coding:'Coding',cost:'Cost efficiency',context:'Context',multimodal:'Multimodal',tool:'Tool use'};
  const view = {data:null,rows:[],sortKey:'model',sortDir:1,error:null};
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = id => document.querySelector(id);
  const link = (url,label) => /^https:\/\//i.test(url || '') ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : escape(label);
  const mapping = row => view.data?.offerings?.[row.offering_id] || null;
  const catalog = row => view.data?.models?.[mapping(row)?.catalog_id] || null;
  const mappingLabel = item => ({canonical:'공식 ID 대응 · 원모델 참고',exact_name:'동명 원모델 참고',official_alias:'공식 alias · 기본 모델 참고',unmapped:'대응 미확인'})[item?.status] || '비교 범위 밖';
  const fallbackLabel = axis => axis?.status === 'support_only' ? '지원만 확인' : axis?.status === 'unsupported' ? '미지원' : 'N/A · 미측정';
  const score = (row,key) => {
    const axis = catalog(row)?.axes?.[key];
    return axis && ['measured','specification','price'].includes(axis.status) && typeof axis.value === 'number' && Number.isFinite(axis.value) ? axis.value : null;
  };
  function axisCell(row,key) {
    const axis = catalog(row)?.axes?.[key], value = score(row,key);
    if(value === null) return `<span class="oc-fallback" title="${escape(axis?.fallback || '확인 가능한 수치 없음')}">${fallbackLabel(axis)}</span>`;
    const detail = axis.status === 'measured' ? '공개 벤치 상대 지수' : axis.status === 'price' ? '카탈로그 가격 상대 지수' : '카탈로그 사양 상대 지수';
    return `<span class="oc-score" title="${escape(detail)}">${Math.round(value)}</span><div class="oc-meter" aria-hidden="true"><span style="width:${Math.max(0,Math.min(100,value))}%"></span></div>`;
  }
  function ordered(rows) {
    return [...rows].sort((a,b)=>{
      if(view.sortKey==='model') return view.sortDir*a.model.localeCompare(b.model);
      const av=score(a,view.sortKey),bv=score(b,view.sortKey);
      if(av===null&&bv===null)return a.model.localeCompare(b.model);
      if(av===null)return 1;if(bv===null)return -1;
      return view.sortDir*(av-bv)||a.model.localeCompare(b.model);
    });
  }
  function render(rows) {
    if(rows) view.rows=rows;
    const body=el('#oc-models');if(!body)return;
    if(!view.data){body.innerHTML='';return;}
    const orderedRows=ordered(view.rows);
    body.innerHTML=orderedRows.length?orderedRows.map(row=>{
      const item=mapping(row);
      return `<tr><td>${escape(row.model)}<span class="offering-label">${escape(row.offering==='go'?'Go':row.offering==='console-free'?'Console · Free':'Console · PAYG')}</span><span class="oc-mapping ${item?.status==='official_alias'?'reference':''}">${escape(mappingLabel(item))}</span><button type="button" class="details-button" data-oc-details="${escape(row.offering_id)}" aria-haspopup="dialog" aria-controls="model-dialog" aria-label="${escape(row.model)} OpenCode Data 원점수 및 조건">원점수 / 조건</button></td>${axisKeys.map(key=>`<td>${axisCell(row,key)}</td>`).join('')}</tr>`;
    }).join(''):'<tr><td colspan="7" class="oc-empty">현재 필터에 맞는 모델이 없습니다.</td></tr>';
    const mapped=orderedRows.filter(row=>catalog(row)).length;
    const benchmarked=orderedRows.filter(row=>(catalog(row)?.benchmarks?.length||0)>0).length;
    el('#oc-count').textContent=`${orderedRows.length} offerings · ${mapped} 대응 · ${benchmarked} 원점수 있음`;
    document.querySelectorAll('[data-oc-sort]').forEach(button=>button.parentElement?.setAttribute('aria-sort',button.dataset.ocSort===view.sortKey?(view.sortDir===1?'ascending':'descending'):'none'));
  }
  function details(row) {
    const item=mapping(row),model=catalog(row);
    if(!view.data) return `<section class="oc-detail"><h3>OpenCode Data 비교</h3><p>${view.error?'비교 자료를 불러오지 못했습니다. 기존 모델 자료는 그대로 유지됩니다.':'비교 자료를 불러오는 중입니다. 잠시 뒤 상세를 다시 열어 주세요.'}</p></section>`;
    if(!model) return `<section class="oc-detail"><h3>OpenCode Data 비교 · N/A</h3><p>${escape(item?.note || (row.offering==='console-payg'?'이 비교 자료는 Go + Free 범위입니다. PAYG 모델로 추정 대응하지 않습니다.':'공식 카탈로그에서 정확한 모델 대응을 확인하지 못했습니다.'))}</p></section>`;
    const benchmarks=model.benchmarks||[];
    const axes=axisKeys.map(key=>`<div class="oc-axis-item"><dt>${labels[key]}</dt><dd>${axisCell(row,key)}</dd></div>`).join('');
    const raw=benchmarks.map(b=>`<li><strong>${escape(b.name)}${b.version?' · '+escape(b.version):''}: ${escape(b.score)}</strong><small>${escape([b.metric&&'metric: '+b.metric,b.harness&&'harness: '+b.harness,b.variant&&'variant: '+b.variant,b.dataset&&'dataset: '+b.dataset].filter(Boolean).join(' · ') || '측정 조건 미기재')}</small>${b.source?link(b.source,'원 평가 출처'):'<small>평가 출처 미기재</small>'}</li>`).join('');
    const cp=item.status==='official_alias'||/contributor/i.test(row.model)?null:model.catalog_cost;
    return `<section class="oc-detail"><h3>OpenCode Data · 원모델 참고</h3><p>${escape(mappingLabel(item))} · ${escape(model.name)}<br>${escape(model.id)}</p><p>${escape(item.note||'')} Go/Free endpoint 실측 결과가 아닙니다. 별도 제공 방식의 성능·가격·프라이버시를 보장하지 않습니다.</p>${item.evidence?`<p>대응 근거: ${/^https:\/\//.test(item.evidence)?link(item.evidence,'공식 대응 자료'):escape(item.evidence)}</p>`:''}<dl class="oc-axis-list">${axes}</dl><p>0~100은 카탈로그 상대 지수이며 정답률이 아닙니다. 원문의 결측 50점과 지원 여부 fallback은 수치에서 제외했습니다. 평가 버전·harness·dataset·metric이 다른 원점수를 한 순위로 합치지 마세요.</p>${cp?`<p>카탈로그 기준 가격 (USD/1M tokens): input ${escape(cp.input)} / output ${escape(cp.output)}. Cost 축의 참고 가격일 뿐, 현재 offering의 무료·Go 요금과 한도를 대체하지 않습니다.</p>`:''}<p>${link(model.source_url,'OpenCode 모델 자료')} · ${link(view.data.sources?.methodology,'방법론')} · 확인 ${escape(view.data.checked_at)} · 정규화 모집단 ${escape(view.data.population)} 모델</p><details><summary>원점수와 평가 조건 ${benchmarks.length}건</summary>${benchmarks.length?`<ul class="oc-benchmarks">${raw}</ul>`:'<p>공식 카탈로그에 공개된 벤치마크 원점수가 없습니다. 미측정은 성능 0점이 아닙니다.</p>'}</details></section>`;
  }
  async function load() {
    try {
      const response=await fetch('data/opencode-compare.json',{cache:'no-store'});
      if(!response.ok)throw new Error(`OpenCode Data load failed: ${response.status}`);
      const data=await response.json();
      if(data.schema_version!==1||!data.models||!data.offerings)throw new Error('Invalid OpenCode Data schema');
      view.data=data;view.error=null;
      el('#oc-status').innerHTML=`확인 ${escape(data.checked_at)} · 정규화 모집단 ${escape(data.population)} 모델 · ${link(data.sources?.catalog,'공식 원본')} · ${link(data.sources?.formula,'산식')} · ${link(data.sources?.methodology,'방법론')}. 카탈로그 상대 지수는 모집단 갱신에 따라 달라질 수 있습니다.`;
      render(typeof filtered==='function'?filtered():view.rows);
    } catch(error) {
      view.error=error;
      if(el('#oc-status'))el('#oc-status').textContent='비교 자료를 불러오지 못했습니다. 기존 가격·AA 점수·추천은 그대로 표시됩니다.';
      if(el('#oc-count'))el('#oc-count').textContent='비교 자료 확인 불가';
      console.error(error);
    }
  }
  globalThis.OpenCodeData={render,details,load,view,score,ordered,axisCell,mappingLabel};
  document.querySelectorAll('[data-oc-sort]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.ocSort;
    if(view.sortKey===key)view.sortDir*=-1;else{view.sortKey=key;view.sortDir=key==='model'?1:-1;}
    render();
  }));
  el('#oc-models')?.addEventListener('click',event=>{
    const trigger=event.target.closest('button[data-oc-details]');
    if(trigger&&typeof openDetails==='function')openDetails(trigger.dataset.ocDetails,trigger);
  });
  load();
})();
