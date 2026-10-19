const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const go=read('data/models.json'),usage=read('data/usage.json'),con=read('data/console.json');
assert.equal(con.schema_version,1);
assert.equal(new Set(con.models.map(m=>m.offering_id)).size,con.models.length);
for(const m of con.models){assert.equal(m.offering_id,'console:'+m.model_id);assert.equal(m.selection_id,'opencode/'+m.model_id);assert.ok(['console-free','console-payg'].includes(m.offering));assert.ok(!('monthly_usage_usd'in m));assert.ok(!('requests_month'in m));assert.ok(!('unlimited'in m));assert.ok(!con.excluded_models.some(x=>x.model_id===m.model_id));assert.ok(m.source.startsWith('https://opencode.ai/'));for(const k of ['input_price','output_price','cached_input'])assert.ok(m[k]===null||typeof m[k]==='number');}
for(const name of Object.values(go.recommendations).filter(Boolean))assert.ok(go.models.some(m=>m.model===name));
assert.deepEqual(Object.keys(usage.models).sort(),go.models.map(m=>m.model).sort());
const free=con.models.find(m=>m.model_id==='deepseek-v4.1-flash-free');assert.equal(free.input_price,0);assert.equal(free.training,'No Training');assert.equal(free.retention,'0 days');assert.equal(free.promotion_end,null);assert.ok(!JSON.stringify(free).includes('2026-10-31'));
const els={};const el=id=>els[id]??={value:'',textContent:'',innerHTML:'',listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn}};
const sandbox={console,Date,document:{body:{classList:{add(){},remove(){}}},querySelector:el,querySelectorAll:()=>[]},fetch:async f=>({ok:true,json:async()=>read(f)})};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),sandbox);
setTimeout(()=>{const run=s=>vm.runInContext(s,sandbox);assert.equal(run('state.rows.length'),go.models.length+con.models.length);assert.ok(el('#summary').innerHTML.includes('Go ·'));
assert.equal(el('#offering').value,'go-free');
assert.equal(run('filtered().length'),go.models.length+con.models.filter(m=>m.offering==='console-free').length);
assert.ok(!el('#models').innerHTML.includes('<details>'));
assert.ok(el('#models').innerHTML.includes('aria-haspopup="dialog"'));
for (const [value,count] of [['',go.models.length+con.models.length],['go',go.models.length],['console-payg',con.models.filter(m=>m.offering==='console-payg').length],['console-free',con.models.filter(m=>m.offering==='console-free').length]]) {el('#offering').value=value;assert.equal(run('filtered().length'),count);}
let focused=false;const trigger={isConnected:true,focus(){focused=true}};
el('#model-dialog').showModal=function(){this.open=true};
el('#model-dialog').close=function(){this.open=false;this.listeners.close()};
sandbox.trigger=trigger;
run("openDetails('console:deepseek-v4.1-flash-free', trigger)");
assert.equal(el('#model-dialog').open,true);
assert.ok(el('#model-dialog-content').innerHTML.includes('opencode/deepseek-v4.1-flash-free'));
assert.ok(el('#model-dialog-content').innerHTML.includes('Context:'));
assert.ok(el('#model-dialog-content').innerHTML.includes('Benchmark:'));
assert.ok(el('#model-dialog-content').innerHTML.includes('Additional sources:'));
assert.equal(el('#model-dialog-content').scrollTop,0);
el('#close-details').listeners.click();assert.equal(el('#model-dialog').open,false);assert.equal(focused,true);
run("openDetails('console:deepseek-v4.1-flash-free', trigger)");
el('#model-dialog').listeners.click({target:el('#model-dialog'),currentTarget:Object.assign(el('#model-dialog'),{getBoundingClientRect:()=>({left:10,right:100,top:10,bottom:100})}),clientX:0,clientY:0});
assert.equal(el('#model-dialog').open,false);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('<dialog id="model-dialog" aria-labelledby="model-dialog-title">'));
assert.ok(html.indexOf('<dialog')>html.indexOf('</table>'));
const css=fs.readFileSync(path.join(root,'assets/style.css'),'utf8');assert.ok(css.includes('max-height:calc(100dvh - 34px)'));assert.ok(css.includes('overflow-y:auto'));
el('#offering').value='console-free';run('render()');assert.equal(run('filtered().length'),con.models.filter(m=>m.offering==='console-free').length);assert.ok(el('#models').innerHTML.includes('Not stated'));assert.ok(!el('#models').innerHTML.includes('Unlimited'));el('#search').value='deepseek';run('render()');assert.equal(run('filtered().length'),1);assert.ok(el('#models').innerHTML.includes('console:deepseek-v4.1-flash-free'));assert.ok(run('details(filtered()[0])').includes('opencode/deepseek-v4.1-flash-free')); el('#reset').listeners.click();assert.equal(run('filtered().length'),go.models.length+con.models.filter(m=>m.offering==='console-free').length);assert.equal(run('monthlyLabel({offering:"go",monthly_usage_usd:null})'),'N/A');assert.equal(run('cost({input_price:null,output_price:2})'),null);assert.ok(el('#meta').textContent.includes(con.as_of));assert.ok(!el('#models').innerHTML.includes('NaN'));console.log(`PASS: ${go.models.length} Go, ${con.models.length} Console offerings, ${con.excluded_models.length} inactive exclusions; identity, usage isolation, recommendations, free privacy, filters/reset, nulls and metadata.`);},0);




setTimeout(()=>{const run=s=>vm.runInContext(s,sandbox);
assert.equal(run('codingScore({offering:"go",coding_evaluation:{cohort:CODING_COHORT,status:"matched",score_pct:0}})'),0);
assert.equal(run('codingScore({offering:"console-free",coding_evaluation:{cohort:CODING_COHORT,status:"matched",score_pct:99}})'),null);
assert.equal(run('codingScore({offering:"go",coding_evaluation:{cohort:"other",status:"matched",score_pct:99}})'),null);
assert.equal(run('codingScore({offering:"go",coding_evaluation:{cohort:CODING_COHORT,status:"checkpoint_unconfirmed",score_pct:99}})'),null);
assert.equal(run('workloadCapacity({offering:"go",monthly_usage_usd:60,input_price:1,output_price:1})'),50);
assert.equal(run('workloadCapacity({offering:"console-free",monthly_usage_usd:60,input_price:1,output_price:1})'),null);
assert.equal(run('workloadCapacity({offering:"go",unlimited:true,input_price:0,output_price:0})'),null);
assert.equal(run('workloadCapacity({offering:"go",monthly_usage_usd:null,input_price:1,output_price:1})'),null);
assert.equal(run('workloadCapacity({offering:"go",monthly_usage_usd:15,promotion:"test",promotion_end:"2099-01-01",promotional_monthly_usage_usd:60,input_price:1,output_price:1})'),50);
assert.equal(run('workloadCapacity({offering:"go",monthly_usage_usd:15,promotion:"expired",promotion_end:"2020-01-01",promotional_monthly_usage_usd:60,input_price:1,output_price:1})'),12.5);
assert.ok(run('metricDetails({offering:"go",monthly_usage_usd:60,input_price:1,output_price:1})').includes('공식 Req/mo와 별도'));
assert.ok(run('valueCell({offering:"console-payg"})').includes('Go 전용'));
assert.ok(el('#benchmark-coverage').textContent.includes('미평가는 0점이 아닙니다'));
for(const dir of [1,-1]) { run(`state.sortDir=${dir};state.sortKey='coding_grade'`);el('#offering').value='go';const scores=run('filtered().map(codingScore)');let missing=false;for(const score of scores){if(score===null)missing=true;else assert.ok(!missing,'missing scores must sort last');}}
console.log('PASS: zero score, cohort/Console exclusion, nulls, finite capacity, promo expiry, missing-last sorting and rubric explanations.');
},0);
