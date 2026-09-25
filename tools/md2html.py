# -*- coding: utf-8 -*-
"""確認事項一覧.md を印刷用HTMLに変換する（この文書の書式に合わせた簡易版）"""
import html, re, sys, pathlib

src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
out = pathlib.Path(sys.argv[2])

def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'`(.+?)`', r'<code>\1</code>', t)
    return t

body, rows, in_table = [], [], False

def flush_table():
    global rows, in_table
    if not rows:
        return
    head, *rest = rows
    rest = [r for r in rest if not re.match(r'^[\s:|-]+$', '|'.join(r))]
    ths = ''.join(f'<th>{inline(c)}</th>' for c in head)
    trs = []
    for r in rest:
        tds = []
        for i, c in enumerate(r):
            cls = ''
            if c.strip() in ('0', '1') and i == len(r) - 1:
                cls = f' class="flag flag--{c.strip()}"'
                c = c.strip()
            tds.append(f'<td{cls}>{inline(c)}</td>')
        trs.append('<tr>' + ''.join(tds) + '</tr>')
    body.append(f'<table><thead><tr>{ths}</tr></thead><tbody>{"".join(trs)}</tbody></table>')
    rows, in_table = [], False

for line in src.split('\n'):
    s = line.rstrip()
    if s.startswith('|'):
        rows.append([c.strip() for c in s.strip('|').split('|')])
        in_table = True
        continue
    if in_table:
        flush_table()
    if not s.strip():
        continue
    if s.startswith('### '):
        body.append(f'<h3>{inline(s[4:])}</h3>')
    elif s.startswith('## '):
        body.append(f'<h2>{inline(s[3:])}</h2>')
    elif s.startswith('# '):
        body.append(f'<h1>{inline(s[2:])}</h1>')
    elif re.match(r'^\d+\.\s', s):
        body.append(f'<li class="ol">{inline(re.sub(r"^\d+\.\s", "", s))}</li>')
    elif s.startswith('- '):
        body.append(f'<li>{inline(s[2:])}</li>')
    else:
        body.append(f'<p>{inline(s)}</p>')
flush_table()

# 連続する li を ul / ol にまとめる
merged, buf, kind = [], [], None
for el in body:
    m = re.match(r'<li( class="ol")?>', el)
    if m:
        k = 'ol' if m.group(1) else 'ul'
        if kind and k != kind:
            merged.append(f'<{kind}>' + ''.join(buf) + f'</{kind}>'); buf = []
        kind = k; buf.append(el.replace(' class="ol"', ''))
    else:
        if buf:
            merged.append(f'<{kind}>' + ''.join(buf) + f'</{kind}>'); buf, kind = [], None
        merged.append(el)
if buf:
    merged.append(f'<{kind}>' + ''.join(buf) + f'</{kind}>')

css = """
@page { size: A4 landscape; margin: 12mm 12mm 14mm; }
* { box-sizing: border-box; }
body {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif;
  color: #2b2621; font-size: 9pt; line-height: 1.65; margin: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
h1 { font-size: 17pt; letter-spacing: .04em; margin: 0 0 4pt; border-bottom: 2px solid #2f4858; padding-bottom: 6pt; }
h2 { font-size: 12pt; margin: 18pt 0 6pt; color: #2f4858; border-left: 4px solid #b5543a; padding-left: 8pt; }
p  { margin: 0 0 4pt; }
body > p:first-of-type, body > p:nth-of-type(2) { color: #6d635a; font-size: 8.5pt; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 0; table-layout: fixed; }
th, td { border: .5pt solid #c9c0b2; padding: 4pt 5pt; vertical-align: top; text-align: left; word-wrap: break-word; }
th { background: #2f4858; color: #fff; font-weight: 600; font-size: 8.5pt; }
tbody tr:nth-child(even) td { background: #faf7f1; }
tr { page-break-inside: avoid; }
thead { display: table-header-group; }
col.c1 { width: 4%; }  col.c2 { width: 13%; } col.c3 { width: 24%; }
col.c4 { width: 52%; } col.c5 { width: 7%; }
td.flag { text-align: center; font-weight: 700; }
td.flag--1 { background: #e3ede4 !important; color: #2f6b3f; }
td.flag--0 { background: #fbeeea !important; color: #b5543a; }
strong { color: #8f3f28; }
code { font-family: "SFMono-Regular", Menlo, monospace; font-size: 8pt; background: #f2ece1; padding: 0 2pt; }
ul, ol { margin: 4pt 0 0; padding-left: 16pt; break-inside: avoid; page-break-inside: avoid; }
h2 { break-after: avoid; page-break-after: avoid; }
li { margin-bottom: 2pt; }
"""

htmlstr = ('<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">'
           '<title>民宿もりもり 確認事項一覧</title><style>' + css + '</style></head><body>'
           + ''.join(merged).replace(
               '<table>',
               '<table><colgroup><col class="c1"><col class="c2"><col class="c3">'
               '<col class="c4"><col class="c5"></colgroup>', 1)
           + '</body></html>')
out.write_text(htmlstr, encoding='utf-8')
print('HTML生成:', out)
