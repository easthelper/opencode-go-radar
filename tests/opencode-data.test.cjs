const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const d=read('data/opencode-compare.json'),go=read('data/models.json'),con=read('data/console.json');
assert.equal(d.schema_version,1);assert.equal(d.population,555);assert.ok(!Number.isNaN(Date.parse(d.checked_at)));
assert.equal(Object.keys(d.offerings).length,go.models.length+con.models.filter(m=>m.offering==='console-free').length);
for(const m of go.models)assert.ok(d.offerings['go:'+m.model]);
for(const m of con.models)assert.equal(Boolean(d.offerings[m.offering_id]),m.offering==='console-free');
for(const [id,m] of Object.entries(d.offerings)){
 assert.ok(m.note);assert.ok(['canonical','exact_name','official_alias','unmapped'].includes(m.status));
 if(m.catalog_id){assert.ok(d.models[m.catalog_id]);assert.notEqual(m.status,'unmapped');}else assert.equal(m.status,'unmapped');
 for(const field of ['input_price','output_price','training','retention','monthly_usage_usd','coding_evaluation'])assert.ok(!(field in m));
}
for(const name of ['jev-1.13-free','big-pickle','flint-40b-free','exo-free'])assert.equal(d.offerings['console:'+name].catalog_id,null);
assert.equal(d.offerings['go:Beam Free'].catalog_id,'reflection/beam-1.0-501b-a23b');
assert.equal(d.offerings['go:Gemini 4 Argon Contributor'].status,'canonical');
assert.equal(d.offerings['go:Muse Spark 1.3 Contributor'].status,'official_alias');
assert.equal(d.offerings['go:DeepSeek V4 Pro'].status,'exact_name');
const fixtures={'deepseek/deepseek-v4.1-flash':[100,100,59,81,33,92],'meta/muse-spark-1.3':[100,90,31,92,83,100],'zhipuai/glm-5.3-flash':[56,35,75,81,67,0]};
for(const[id,expected]of Object.entries(fixtures))assert.deepEqual(d.axis_keys.map(k=>Math.round(d.models[id].axes[k].source_value)),expected);
assert.equal(d.models['zhipuai/glm-5.3-flash'].axes.tool.value,0);assert.equal(d.models['zhipuai/glm-5.3-flash'].axes.tool.status,'measured');
let missing=0,benchmarks=0;
for(const m of Object.values(d.models)){
 assert.equal(m.source_url.startsWith('https://opencode.ai/ko/data/'),true);
 for(const k of d.axis_keys){const a=m.axes[k];assert.ok(a.source_value>=0&&a.source_value<=100);
 if(['missing','support_only','unsupported'].includes(a.status)){assert.equal(a.value,null);assert.ok(a.fallback);missing++;}
 else {assert.equal(typeof a.value,'number');assert.ok(a.value>=0&&a.value<=100);assert.equal(a.fallback,null);}}
 for(const b of m.benchmarks){assert.equal(typeof b.score,'number');assert.ok(b.name);if(b.source)assert.match(b.source,/^https:\/\//);benchmarks++;}
}
assert.ok(missing>0);assert.ok(benchmarks>0);
assert.equal(d.models['minimax/MiniMax-M3.1-Flash'].axes.coding.value,null);
console.log(`PASS: ${Object.keys(d.offerings).length} offerings, ${Object.keys(d.models).length} source models, ${benchmarks} raw benchmark records, ${missing} explicit fallback axes; source fixtures, mapping isolation, measured zero, unknowns.`);

