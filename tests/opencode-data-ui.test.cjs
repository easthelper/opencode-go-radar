const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const compare=read('data/opencode-compare.json'),go=read('data/models.json'),con=read('data/console.json');
const rows=[...go.models.map(m=>({...m,offering:'go',offering_id:'go:'+m.model})),...con.models];
const elements={};const el=id=>elements[id]??={innerHTML:'',textContent:'',listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn;}};
const buttons=['model','reasoning','coding','cost','context','multimodal','tool'].map(key=>({dataset:{ocSort:key},listeners:{},parentElement:{setAttribute(){}},addEventListener(ev,fn){this.listeners[ev]=fn;}}));
const sandbox={console,document:{querySelector:el,querySelectorAll:()=>buttons},fetch:async()=>({ok:true,json:async()=>compare}),filtered:()=>rows.filter(m=>m.offering!=='console-payg')};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'assets/opencode-data.js'),'utf8'),sandbox);
setTimeout(async()=>{
 const api=sandbox.OpenCodeData;
 assert.equal(api.view.rows.length,39);assert.ok(el('#oc-count').textContent.includes('35 대응'));
 assert.ok(el('#oc-models').innerHTML.includes('Jev 1.13 Free'));
 assert.ok(el('#oc-models').innerHTML.includes('N/A · 미측정'));
 const unknown=rows.find(m=>m.model==='Big Pickle');assert.equal(api.score(unknown,'coding'),null);assert.ok(api.details(unknown).includes('N/A'));
 const payg=rows.find(m=>m.offering==='console-payg');assert.ok(api.details(payg).includes('PAYG'));
 const measured=rows.find(m=>api.score(m,'coding')!==null);assert.ok(api.details(measured).includes('원점수와 평가 조건'));assert.ok(api.details(measured).includes('정답률이 아닙니다'));
 const contributor=rows.find(m=>m.model==='Muse Spark 1.3 Contributor');assert.ok(!api.details(contributor).includes('카탈로그 기준 가격'));
 for(const direction of [1,-1]){api.view.sortKey='coding';api.view.sortDir=direction;let missing=false;for(const row of api.ordered(api.view.rows)){if(api.score(row,'coding')===null)missing=true;else assert.ok(!missing);}}
 api.render([]);assert.ok(el('#oc-models').innerHTML.includes('현재 필터에 맞는 모델이 없습니다'));
 api.render([measured]);assert.ok(el('#oc-count').textContent.startsWith('1 offerings'));
 const original=JSON.stringify(rows);buttons.find(b=>b.dataset.ocSort==='coding').listeners.click();assert.equal(JSON.stringify(rows),original);
 let opened; sandbox.openDetails=(id,trigger)=>opened={id,trigger};const trigger={dataset:{ocDetails:measured.offering_id}};el('#oc-models').listeners.click({target:{closest:()=>trigger}});assert.equal(opened.id,measured.offering_id);
 // Missing/support fallbacks must not expose official neutral 50 as measured score.
 const empty=Object.entries(compare.models).find(([,m])=>m.axes.coding.value===null);assert.ok(empty);
 const emptyRow=rows.find(r=>compare.offerings[r.offering_id]?.catalog_id===empty[0]);assert.equal(api.score(emptyRow,'coding'),null);assert.ok(!api.axisCell(emptyRow,'coding').includes('oc-score'));
 // Loading failure remains isolated from all existing data and formulas.
 sandbox.fetch=async()=>({ok:false,status:503});sandbox.console={error(){}};await api.load();assert.ok(el('#oc-status').textContent.includes('기존 가격·AA 점수·추천은 그대로'));
 console.log('PASS: independent OpenCode Data UI, 39 rows/35 mappings, fallback exclusions, missing-last sort, filter rendering, modal dispatch, Contributor price separation and isolated load failure.');
},0);

