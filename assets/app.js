const state = { rows: [], recommendations: {}, sortKey: 'model', sortDir: 1 };
const $ = (s) => document.querySelector(s);
const gradeRank = { S: 4, A: 3, B: 2, C: 1 };

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function cost(m) {
  return +(m.input_price + m.output_price * 0.2).toFixed(3);
}

function badge(v, prefix = 'grade') {
  return `<span class="badge ${prefix}-${esc(v)}">${esc(v)}</span>`;
}

function chinaClass(v) {
  return v === 'Yes' ? 'yes' : v === 'Possible' ? 'possible' : v === 'No evidence' ? 'no-evidence' : '';
}

function fmtInt(v) {
  return v == null ? 'N/A' : Number(v).toLocaleString();
}

function isPromotionActive(m) {
  if (!m?.promotion) return false;
  if (!m.promotion_end) return true;
  const today = new Date().toISOString().slice(0, 10);
  return today <= m.promotion_end;
}

function effectiveMonthlyUsage(m) {
  return isPromotionActive(m) ? (m.promotional_monthly_usage_usd ?? m.monthly_usage_usd ?? null) : (m.monthly_usage_usd ?? null);
}

function effectiveRequestsMonth(m) {
  return isPromotionActive(m) ? (m.promotional_requests_month ?? m.requests_month ?? null) : (m.requests_month ?? null);
}

function cmp(a, b, key) {
  let av = key === 'estimated_cost' ? cost(a) : key === 'monthly_usage_usd' ? effectiveMonthlyUsage(a) : key === 'requests_month' ? effectiveRequestsMonth(a) : a[key];
  let bv = key === 'estimated_cost' ? cost(b) : key === 'monthly_usage_usd' ? effectiveMonthlyUsage(b) : key === 'requests_month' ? effectiveRequestsMonth(b) : b[key];
  if (key === 'coding_grade' || key === 'value_grade') {
    av = gradeRank[av] || 0;
    bv = gradeRank[bv] || 0;
  }
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
}

function filtered() {
  const q = $('#search').value.trim().toLowerCase();
  const privacy = $('#privacy').value;
  const china = $('#china').value;
  const pos = $('#position').value;
  return state.rows
    .filter((m) => {
      const hay = JSON.stringify(m).toLowerCase();
      return (!q || hay.includes(q)) && (!privacy || m.privacy_risk === privacy) && (!china || m.china_transfer === china) && (!pos || (m.positioning || []).includes(pos));
    })
    .sort((a, b) => state.sortDir * cmp(a, b, state.sortKey));
}

function render() {
  const rows = filtered();
  $('#count').textContent = `${rows.length} models`;
  $('#models').innerHTML = rows.map((m) => `<tr><td>${esc(m.model)}${isPromotionActive(m) ? `<span class="promotion-badge">${esc(m.promotion)}</span>` : ''}</td><td>${esc(m.developer)}</td><td>${badge(m.coding_grade)}</td><td>${badge(m.value_grade)}</td><td class="usage"><strong>$${Number(effectiveMonthlyUsage(m) || 0).toFixed(0)}</strong></td><td>${fmtInt(effectiveRequestsMonth(m))}</td><td>$${cost(m).toFixed(3)}</td><td>$${Number(m.input_price).toFixed(3)}</td><td>$${Number(m.output_price).toFixed(3)}</td><td>${m.cached_input == null ? 'N/A' : '$' + Number(m.cached_input).toFixed(4)}</td><td>${esc(m.context)}</td><td>${esc(m.benchmark || 'N/A')}</td><td>${esc(m.training)}</td><td>${esc(m.retention)}</td><td>${esc(m.hosting)}</td><td class="${chinaClass(m.china_transfer)}">${esc(m.china_transfer)}</td><td>${badge(m.privacy_risk, 'risk')}</td><td><div class="tags">${(m.positioning || []).map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></td></tr>`).join('');
}

function modelByName(name) {
  return state.rows.find((m) => m.model === name);
}

function summary() {
  const r = state.recommendations || {};
  const performance = modelByName(r.absolute_performance);
  const value = modelByName(r.best_value);
  const privacy = modelByName(r.sensitive_code);
  const cheap = modelByName(r.cheap_subagent);
  const usageDetail = (m) => m ? `$${effectiveMonthlyUsage(m)} monthly limit · 약 ${fmtInt(effectiveRequestsMonth(m))} req/mo` : '';
  const cards = [
    ['절대 성능', performance?.model || '검증 필요', performance ? `long-horizon 종합 1순위 · ${usageDetail(performance)}` : ''],
    ['가성비', value?.model || '검증 필요', value ? `Est. $${cost(value).toFixed(3)} · ${usageDetail(value)}${isPromotionActive(value) ? ' · ' + value.promotion : ''}` : ''],
    ['민감 코드', privacy?.model || '검증 필요', privacy ? `현재 Go 내 조건부 추천 · ${usageDetail(privacy)}` : ''],
    ['저가 서브에이전트', cheap?.model || '-', cheap ? `Est. $${cost(cheap).toFixed(3)} · ${usageDetail(cheap)}` : '']
  ];
  $('#summary').innerHTML = cards.map(([k, v, d]) => `<article class="card"><span class="kicker">${esc(k)}</span><span class="value">${esc(v || '-')}</span><div class="detail">${esc(d)}</div></article>`).join('');
}

async function init() {
  const [modelRes, usageRes] = await Promise.all([
    fetch('data/models.json', { cache: 'no-store' }),
    fetch('data/usage.json', { cache: 'no-store' })
  ]);
  if (!modelRes.ok) throw new Error(`model data load failed: ${modelRes.status}`);
  if (!usageRes.ok) throw new Error(`usage data load failed: ${usageRes.status}`);
  const data = await modelRes.json();
  const usage = await usageRes.json();
  state.rows = (data.models || []).map((m) => ({ ...m, ...(usage.models?.[m.model] || {}) }));
  state.recommendations = data.recommendations || {};
  const latestAsOf = [data.as_of, usage.as_of].filter(Boolean).sort().at(-1) || 'N/A';
  const sourceDates = data.as_of === usage.as_of ? '' : ` · models ${data.as_of || 'N/A'} / usage ${usage.as_of || 'N/A'}`;
  const p = usage.limit_policy || {};
  const limitText = [p.five_hour_fraction, p.weekly_fraction, p.monthly_fraction].every((v) => v != null)
    ? ` · per-model limit windows: 5h ${Math.round(p.five_hour_fraction * 100)}% / week ${Math.round(p.weekly_fraction * 100)}% / month ${Math.round(p.monthly_fraction * 100)}%`
    : '';
  $('#meta').textContent = `Data as of ${latestAsOf}${sourceDates} · ${state.rows.length} tracked models${limitText}`;
  summary();
  render();
}

['search', 'privacy', 'china', 'position'].forEach((id) => $(`#${id}`).addEventListener(id === 'search' ? 'input' : 'change', render));
$('#reset').addEventListener('click', () => {
  ['search', 'privacy', 'china', 'position'].forEach((id) => $(`#${id}`).value = '');
  render();
});
document.querySelectorAll('th[data-key]').forEach((th) => th.addEventListener('click', () => {
  const k = th.dataset.key;
  if (state.sortKey === k) state.sortDir *= -1;
  else {
    state.sortKey = k;
    state.sortDir = 1;
  }
  render();
}));

init().catch((err) => {
  $('#meta').textContent = 'Failed to load model data';
  console.error(err);
});
