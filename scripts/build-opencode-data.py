#!/usr/bin/env python3
"""Build separate reference metrics from downloaded official catalog.json + api.json.
Usage: python scripts/build-opencode-data.py CATALOG PRICING --checked-at ISO
No network calls or offering/pricing/AA data mutations. See README methodology.
"""
import argparse, collections, hashlib, json, math, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
COMMIT='40cdf4fbdd9d60316f339113e7f9c9a121aece4a'
SOURCE_BASE=f'https://github.com/anomalyco/opencode/blob/{COMMIT}/packages/stats/app/src/routes/'
SOURCES={'catalog':'https://models.opencode.ai/catalog.json','pricing':'https://models.opencode.ai/api.json','methodology':'https://opencode.ai/ko/data/#methodology','formula':SOURCE_BASE+'compare-radar.tsx','normalization':SOURCE_BASE+'model-catalog.ts'}
KEYS=['reasoning','coding','cost','context','multimodal','tool']
LABELS=dict(zip(KEYS,['Reasoning','Coding','Cost efficiency','Context','Multimodal','Tool use']))
def slug(s):return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def idkey(s):return '/'.join(map(slug,s.split('/')))
def norm(s):return re.sub('[^a-z0-9]+',' ',s.lower().replace('τ','tau').replace('²','2').replace('³','3')).strip()
def number(x):return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)
def costval(x):return x if isinstance(x,dict) and number(x.get('input')) and number(x.get('output')) else None
def benchmark_key(b,harness=False):
 n,v=norm(b['name']),norm(b.get('version',''));k=n+' '+v if v and not n.endswith(v) else n
 h=norm(b.get('harness') or b.get('variant') or '')
 return k+' | '+h if harness and h else k
def group_best(bs,harness=False):
 d={}
 for b in bs:
  k=benchmark_key(b,harness);d[k]=max(d.get(k,-math.inf),b['score'])
 return d
def percentile(value,values,lower=False):
 values=[x for x in values if number(x)]
 if not number(value) or len(values)<2:return None
 p=(sum(x<value for x in values)+(sum(x==value for x in values)-1)/2)/(len(values)-1)*100
 return 100-p if lower else p
def features(m):
 mods=m.get('modalities') or {};return len(set([f'input:{x}' for x in mods.get('input',[]) if x!='text']+[f'output:{x}' for x in mods.get('output',[]) if x!='text']+(['attachment'] if m.get('attachment') else [])))
def build(catalog,pricing,go,console,checked_at,hashes):
 costs={}
 for provider,p in pricing.items():
  for m in p.get('models',{}).values():
   c=costval(m.get('cost'));id=m.get('id')
   if c and id:
    costs[idkey(id)]=c;costs[slug(id)]=c
    if '/' not in id:costs[slug(p.get('id',provider))+'/'+slug(id)]=c
 models={}
 for id,m in catalog['models'].items():
  if '/' not in id or not m.get('name'):continue
  m=dict(m);leaf=slug(id.split('/',1)[1]);lab=slug(id.split('/')[0])
  m['cost']=next((costs[k] for k in [idkey(id),lab+'/'+leaf,'opencode-go/'+leaf,leaf] if k in costs),costval(m.get('cost')))
  m['benchmarks']=[b for b in m.get('benchmarks',[]) if b.get('name') and number(b.get('score'))]
  models[id]=m
 groups=[collections.defaultdict(list),collections.defaultdict(list)]
 for m in models.values():
  for h in [False,True]:
   for k,v in group_best(m['benchmarks'],h).items():groups[int(h)][k].append(v)
 allcost=[m['cost']['input']+m['cost']['output'] for m in models.values() if m.get('cost')]
 contexts=[m['limit']['context'] for m in models.values() if number(m.get('limit',{}).get('context'))]
 maximum=max(map(features,models.values()),default=0)
 def axes(m):
  vals={}
  patterns={'reasoning':r'(gpqa|humanity|last exam|reasoning|aime|hmmt|math|mmlu|mrcr|charxiv|cti realm)','coding':r'(swe|aider|code|coding|nl2repo)','tool':r'(terminal bench|claw eval|tau ?(?:bench|2|3))'}
  for key,pat in patterns.items():
   scores=[percentile(v,groups[key=='tool'][k]) for k,v in group_best(m['benchmarks'],key=='tool').items() if re.search(pat,k)]
   scores=[x for x in scores if x is not None]
   vals[key]=sum(scores)/len(scores) if scores and key=='tool' else max(scores) if scores else None
  c=m.get('cost');total=c['input']+c['output'] if c else None
  vals['cost']=100 if total==0 else percentile(total,allcost,True)
  vals['context']=percentile(m.get('limit',{}).get('context'),contexts)
  vals['multimodal']=features(m)/maximum*100 if maximum else None
  out={}
  for k in KEYS:
   v=vals[k];status='price' if k=='cost' else 'specification' if k in ['context','multimodal'] else 'measured';fallback=None;sv=v
   if v is None:
    support=m.get('reasoning' if k=='reasoning' else 'tool_call') if k in ['reasoning','tool'] else None
    status='missing' if support is None else 'support_only' if support else 'unsupported'
    sv=0 if support is False else 50
    fallback={'missing':'No data; neutral placeholder','support_only':'Supported; no comparable benchmark','unsupported':'Not supported; capability flag only'}[status]
   out[k]={'value':round(v,6) if v is not None else None,'source_value':round(sv,6),'status':status,'fallback':fallback}
  return out
 result={'schema_version':1,'checked_at':checked_at,'source_commit':COMMIT,'sources':SOURCES,'input_sha256':hashes,'population':len(models),'axis_keys':KEYS,'axis_labels':LABELS,'models':{},'offerings':{}}
 rows=[dict(m,offering_id='go:'+m['model'],offering='go') for m in go['models']]+[m for m in console['models'] if m['offering']=='console-free']
 for row in rows:
  provider='opencode-go' if row['offering']=='go' else 'opencode';pmodels=pricing.get(provider,{}).get('models',{})
  candidates=[(id,m) for id,m in pmodels.items() if norm(m.get('name',''))==norm(row['model']) or norm(id)==norm(row['model'])]
  selection=row.get('model_id') or (candidates[0][0] if len(candidates)==1 else None)
  p=pmodels.get(selection,{})
  canonical=p.get('canonical_model_id');status='canonical';evidence=SOURCES['pricing'];note='공식 canonical_model_id 대응. 원모델 참고 평가이며 이 제공 endpoint의 실측이 아닙니다.'
  if not canonical and selection in ['muse-spark-1.3-contributor','muse-spark-1.2-contributor']:
   canonical='meta/'+selection.removesuffix('-contributor');status='official_alias';evidence=SOURCES['normalization'];note='공식 Contributor → 기본 모델 벤치 alias. 기본 모델 참고이며 Contributor endpoint·가격·사용 통계와 별개입니다.'
  if not canonical and p:
   # Exact published offering name/ID only; never strip version/checkpoint tokens.
   target=norm(row['model'].removesuffix(' Free'));matches=[id for id,m in models.items() if norm(m['name'])==target or norm(id.split('/',1)[1])==target]
   if len(matches)==1:canonical=matches[0];status='exact_name';note='공개 offering 이름과 카탈로그 모델의 정확한 이름 대응. endpoint·체크포인트 동일성은 별도 미검증인 참고 평가입니다.'
  if canonical not in models:
   canonical=None;status='unmapped';note='공식 canonical ID 또는 유일한 정확한 이름 대응을 확인하지 못했습니다. 익명·불명확 모델은 추정하지 않습니다.'
  result['offerings'][row['offering_id']]={'catalog_id':canonical,'status':status,'selection_id':provider+'/'+selection if selection else None,'evidence':evidence,'note':note}
  if canonical and canonical not in result['models']:
   m=models[canonical];lab,leaf=canonical.split('/',1)
   result['models'][canonical]={'id':canonical,'name':m['name'],'source_url':'https://opencode.ai/ko/data/'+slug(lab)+'/'+slug(leaf),'axes':axes(m),'benchmarks':m['benchmarks'],'catalog_cost':m.get('cost')}
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('catalog');p.add_argument('pricing');p.add_argument('--checked-at',required=True);a=p.parse_args()
 paths=[Path(a.catalog),Path(a.pricing)];inputs=[json.loads(x.read_text()) for x in paths]
 if not inputs[0].get('models') or not inputs[1].get('opencode-go'):raise SystemExit('Empty or invalid official input; previous snapshot preserved')
 data=build(*inputs,json.loads((ROOT/'data/models.json').read_text()),json.loads((ROOT/'data/console.json').read_text()),a.checked_at,dict(zip(['catalog','pricing'],[hashlib.sha256(x.read_bytes()).hexdigest() for x in paths])))
 (ROOT/'data/opencode-compare.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print(f"Built {len(data['offerings'])} offerings, {len(data['models'])} catalog models; mappings: {dict(collections.Counter(x['status'] for x in data['offerings'].values()))}")
