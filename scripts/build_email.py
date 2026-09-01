#!/usr/bin/env python3
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "models.json"
OUT = ROOT / "reports" / "email-latest.html"


def esc(v):
    return html.escape(str(v if v is not None else ""))


def est(m):
    return round(float(m["input_price"]) + float(m["output_price"]) * 0.2, 3)


def badge(text, tone):
    colors = {
        "green": ("#0f5132", "#d1e7dd", "#badbcc"),
        "yellow": ("#664d03", "#fff3cd", "#ffecb5"),
        "red": ("#842029", "#f8d7da", "#f5c2c7"),
        "blue": ("#084298", "#cfe2ff", "#b6d4fe"),
        "gray": ("#41464b", "#e2e3e5", "#d3d6d8"),
    }
    fg, bg, border = colors[tone]
    return f'<span style="display:inline-block;padding:3px 7px;border-radius:999px;background:{bg};color:{fg};border:1px solid {border};font-size:11px;font-weight:700;white-space:nowrap">{esc(text)}</span>'


def tone_for_grade(v):
    return {"S": "green", "A": "blue", "B": "yellow", "C": "red"}.get(v, "gray")


def tone_for_risk(v):
    return {"Low": "green", "Medium": "yellow", "High": "red"}.get(v, "gray")


def tone_for_china(v):
    return {"Yes": "red", "Possible": "yellow", "No evidence": "green"}.get(v, "gray")


def build():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    models = data["models"]
    models_sorted = sorted(models, key=lambda m: (-{"S": 4, "A": 3, "B": 2, "C": 1}.get(m.get("coding_grade"), 0), est(m)))

    alerts = []
    for m in models:
        if "pending" in m.get("retention", "").lower() or "unconfirmed" in m.get("retention", "").lower():
            alerts.append(f"{m['model']}: {m['retention']}")
        if m.get("promotion"):
            alerts.append(f"{m['model']}: {m['promotion']}")

    rows = []
    for m in models_sorted:
        rows.append(f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0;font-weight:700">{esc(m['model'])}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0">{badge(m.get('coding_grade','N/A'), tone_for_grade(m.get('coding_grade')))}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0">{badge(m.get('value_grade','N/A'), tone_for_grade(m.get('value_grade')))}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0;white-space:nowrap">${est(m):.3f}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0">{esc(m.get('training','Unknown'))}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0">{esc(m.get('retention','Unknown'))}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0">{badge(m.get('china_transfer','Unknown'), tone_for_china(m.get('china_transfer')))}</td>
          <td style="padding:10px;border-bottom:1px solid #e7eaf0">{badge(m.get('privacy_risk','Unknown'), tone_for_risk(m.get('privacy_risk')))}</td>
        </tr>""")

    alert_html = "".join(f'<div style="margin:6px 0;padding:10px 12px;background:#fff8e1;border:1px solid #ffe08a;border-radius:8px;color:#674d00">⚠ {esc(a)}</div>' for a in alerts)
    if not alert_html:
        alert_html = '<div style="padding:10px 12px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;color:#1b5e20">주요 경고 없음</div>'

    document = f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenCode Go Radar — {esc(data['as_of'])}</title></head>
<body style="margin:0;background:#f3f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#202938">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f8"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:980px;background:white;border:1px solid #e1e5eb;border-radius:14px;overflow:hidden">
<tr><td style="padding:30px;background:#0e1730;color:white"><div style="font-size:12px;letter-spacing:.12em;color:#8fb0ff;font-weight:700">OPENCODE GO · DAILY MODEL INTELLIGENCE</div><h1 style="margin:8px 0 8px;font-size:30px">OpenCode Go Radar</h1><div style="color:#bcc8df">{esc(data['as_of'])} · Input 1M + Output 200K 기준 비용</div></td></tr>
<tr><td style="padding:24px"><h2 style="margin:0 0 12px;font-size:18px">오늘의 체크 포인트</h2>{alert_html}
<h2 style="margin:26px 0 10px;font-size:18px">모델 비교</h2>
<div style="overflow-x:auto"><table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:12px;min-width:780px"><thead><tr style="background:#f7f8fa;color:#586174"><th align="left" style="padding:10px">Model</th><th align="left" style="padding:10px">Coding</th><th align="left" style="padding:10px">Value</th><th align="left" style="padding:10px">Est. Cost*</th><th align="left" style="padding:10px">Training</th><th align="left" style="padding:10px">Retention</th><th align="left" style="padding:10px">China transfer</th><th align="left" style="padding:10px">Privacy</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p style="margin:20px 0 0;color:#6b7280;font-size:12px">* Estimated Cost = Input $/M × 1.0 + Output $/M × 0.2. 서로 다른 benchmark harness 점수는 직접 통합하지 않습니다.</p>
<p style="margin:12px 0 0;font-size:13px"><a href="https://easthelper.github.io/opencode-go-radar/" style="color:#315bd6;font-weight:700">정렬·검색·필터 가능한 전체 대시보드 보기 →</a></p>
</td></tr></table></td></tr></table></body></html>"""

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(document, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
