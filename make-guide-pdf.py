"""
Generate a branded PDF of GUIA-JENN-GOOGLE.md using ReportLab.
- Parses markdown into structured elements
- Uses brand colors (pink, purple, teal, yellow)
- Preserves emojis via Windows Segoe UI Emoji font where possible
- Adds page numbers + branded header stripe
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re, os

# Register Windows Segoe UI fonts for good Unicode coverage + emoji-ish glyphs
fonts = [
    ('Body', 'C:/Windows/Fonts/segoeui.ttf'),
    ('BodyBold', 'C:/Windows/Fonts/segoeuib.ttf'),
    ('BodyItalic', 'C:/Windows/Fonts/segoeuii.ttf'),
]
for name, path in fonts:
    try:
        pdfmetrics.registerFont(TTFont(name, path))
    except Exception as e:
        print(f"Font {name} fallback to Helvetica: {e}")

BODY_FONT = 'Body'
BOLD_FONT = 'BodyBold'

# Brand palette
PINK = HexColor('#E83E8C')
PURPLE = HexColor('#4B2A78')
PURPLE_DEEP = HexColor('#23123c')
TEAL = HexColor('#2BBFB4')
YELLOW = HexColor('#FFC83D')
INK = HexColor('#3a2a4d')
INK_SOFT = HexColor('#6b5b7d')
PINK_LIGHT = HexColor('#FFF0F7')

def make_style(name, **kw):
    base = dict(fontName=BODY_FONT, fontSize=11, leading=16, textColor=INK,
                spaceBefore=6, spaceAfter=6)
    base.update(kw)
    return ParagraphStyle(name, **base)

H1 = make_style('H1', fontName=BOLD_FONT, fontSize=24, leading=30, textColor=PURPLE_DEEP, spaceBefore=20, spaceAfter=12)
H2 = make_style('H2', fontName=BOLD_FONT, fontSize=18, leading=24, textColor=PINK, spaceBefore=18, spaceAfter=10)
H3 = make_style('H3', fontName=BOLD_FONT, fontSize=14, leading=20, textColor=PURPLE, spaceBefore=14, spaceAfter=6)
BODY = make_style('Body')
BULLET = make_style('Bullet', leftIndent=20, bulletIndent=8)
QUOTE = make_style('Quote', leftIndent=16, textColor=PURPLE_DEEP, fontSize=10, leading=14,
                   backColor=PINK_LIGHT, borderPadding=10, borderColor=PINK, borderWidth=0)
CODE = make_style('Code', fontName='Courier', fontSize=9, leading=12, textColor=PURPLE_DEEP,
                  backColor=HexColor('#F4F0F7'), borderPadding=8, leftIndent=10, rightIndent=10)
CHECK = make_style('Check', leftIndent=20, textColor=INK, fontSize=11, leading=18)

def parse_inline(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<![*\w])\*([^\*]+?)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'`([^`]+?)`', r'<font name="Courier" color="#4B2A78">\1</font>', text)
    text = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', r'<link href="\2" color="#E83E8C"><u>\1</u></link>', text)
    return text

def escape_xml(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def md_to_story(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')
    story = []
    i = 0
    in_code = False
    code_lines = []
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('```'):
            if in_code:
                if code_lines:
                    story.append(Paragraph('<br/>'.join(code_lines).replace(' ', '&nbsp;'), CODE))
                    story.append(Spacer(1, 6))
                code_lines = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_lines.append(escape_xml(line))
            i += 1
            continue
        if line.strip() == '---':
            story.append(Spacer(1, 8))
            story.append(HRFlowable(width="100%", thickness=1, color=PINK, spaceBefore=4, spaceAfter=8))
            i += 1; continue
        if line.startswith('# '):
            story.append(Paragraph(parse_inline(line[2:]), H1)); i += 1; continue
        if line.startswith('## '):
            story.append(Paragraph(parse_inline(line[3:]), H2)); i += 1; continue
        if line.startswith('### '):
            story.append(Paragraph(parse_inline(line[4:]), H3)); i += 1; continue
        if line.startswith('> '):
            story.append(Paragraph(parse_inline(line[2:]), QUOTE)); i += 1; continue
        if line.startswith('- ') or line.startswith('* '):
            text = line[2:]
            if text.startswith(('☐ ', '☑ ', '✅ ', '❌ ', '🚫 ')):
                story.append(Paragraph(parse_inline(text), CHECK))
            else:
                story.append(Paragraph('• ' + parse_inline(text), BULLET))
            i += 1; continue
        # Table
        if line.startswith('|') and i+1 < len(lines) and re.match(r'^\|[\s\-:|]+\|$', lines[i+1].strip()):
            header = [c.strip() for c in line.strip().strip('|').split('|')]
            i += 2
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                row = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                rows.append(row)
                i += 1
            th_style = make_style('th', fontName=BOLD_FONT, fontSize=10, textColor=PURPLE_DEEP, leading=14, spaceBefore=0, spaceAfter=0)
            td_style = make_style('td', fontSize=10, leading=14, spaceBefore=0, spaceAfter=0)
            data = [[Paragraph(parse_inline(c), th_style) for c in header]]
            for r in rows:
                data.append([Paragraph(parse_inline(c), td_style) for c in r])
            col_width = (letter[0] - 2*0.8*inch) / max(len(header), 1)
            t = Table(data, colWidths=[col_width]*len(header), repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), PINK_LIGHT),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
                ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E8D5F0')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [Color(1,1,1,1), HexColor('#FAF6FB')]),
            ]))
            story.append(Spacer(1, 6))
            story.append(t)
            story.append(Spacer(1, 8))
            continue
        if line.strip() == '':
            story.append(Spacer(1, 4))
            i += 1; continue
        story.append(Paragraph(parse_inline(line), BODY))
        i += 1
    return story

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont(BODY_FONT, 8)
    canvas.setFillColor(INK_SOFT)
    canvas.drawCentredString(letter[0]/2, 0.45*inch,
        f"Guía para Jenn · Party Learners Kids Studio · Página {doc.page}")
    canvas.setFillColor(PINK)
    canvas.rect(0, letter[1] - 0.15*inch, letter[0], 0.15*inch, fill=1, stroke=0)
    canvas.restoreState()

src = 'GUIA-JENN-GOOGLE.md'
out = 'GUIA-JENN-GOOGLE.pdf'
doc = SimpleDocTemplate(out, pagesize=letter,
    rightMargin=0.8*inch, leftMargin=0.8*inch,
    topMargin=0.6*inch, bottomMargin=0.7*inch,
    title="Guía para Jenn — Aparecer en Google",
    author="Party Learners Kids Studio",
    subject="SEO Local Guide")
story = md_to_story(src)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
size_kb = os.path.getsize(out) // 1024
print(f"PDF generated: {out} ({size_kb} KB)")
