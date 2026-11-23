import json
import re
import textwrap
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Preformatted, KeepTogether,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'swagger.json'
OUTPUT = ROOT / 'output/pdf/GoPlan_Documentacion_API.pdf'
spec = json.loads(SOURCE.read_text(encoding='utf-8'))
description = spec['info']['description']

pdfmetrics.registerFont(TTFont('Segoe', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFont(TTFont('Consolas', 'C:/Windows/Fonts/consola.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold', italic='Segoe', boldItalic='SegoeBold')
INK = colors.HexColor('#18343C')
TEAL = colors.HexColor('#08776E')
MUTED = colors.HexColor('#53656B')
PALE = colors.HexColor('#F0F5F5')
LINE = colors.HexColor('#D7E2E1')
W, H = A4
WIDTH = W - 104

styles = {
    'Body': ParagraphStyle('Body', fontName='Segoe', fontSize=9.5, leading=14, textColor=INK, spaceAfter=8),
    'Small': ParagraphStyle('Small', fontName='Segoe', fontSize=8.2, leading=11.5, textColor=MUTED, spaceAfter=6),
    'H1': ParagraphStyle('DocH1', fontName='SegoeBold', fontSize=23, leading=29, textColor=INK, spaceAfter=17),
    'H2': ParagraphStyle('DocH2', fontName='SegoeBold', fontSize=12, leading=17, textColor=TEAL, spaceBefore=13, spaceAfter=7, keepWithNext=True),
    'Cell': ParagraphStyle('Cell', fontName='Segoe', fontSize=8.2, leading=11.5, textColor=INK),
    'Header': ParagraphStyle('Header', fontName='SegoeBold', fontSize=8.2, leading=11.5, textColor=colors.white),
    'Code': ParagraphStyle('Code', fontName='Consolas', fontSize=7.7, leading=11, textColor=INK, backColor=PALE, borderPadding=10, spaceBefore=3, spaceAfter=12),
    'CoverTitle': ParagraphStyle('CoverTitle', fontName='SegoeBold', fontSize=54, leading=61, textColor=INK, spaceAfter=8),
    'CoverSub': ParagraphStyle('CoverSub', fontName='Segoe', fontSize=23, leading=31, textColor=TEAL, spaceAfter=18),
}

def markup(text):
    text = escape(text.strip())
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`([^`]+)`', r'<font name="Consolas">\1</font>', text)
    return text

def para(text, style='Body'):
    return Paragraph(markup(text), styles[style])

def table(rows, widths=None):
    content = [[Paragraph(markup(cell), styles['Header' if i == 0 else 'Cell']) for cell in row] for i, row in enumerate(rows)]
    t = Table(content, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), INK),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, PALE]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, LINE),
    ]))
    return [t, Spacer(1, 9)]

def code(text):
    lines = []
    for line in text.splitlines():
        indent = len(line) - len(line.lstrip())
        lines.extend(textwrap.wrap(line, width=91, subsequent_indent=' ' * min(indent + 2, 12), replace_whitespace=False, drop_whitespace=False) or [''])
    return Preformatted('\n'.join(lines), styles['Code'])

def markdown(text):
    lines = text.splitlines()
    out = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
        elif line.startswith('```'):
            block = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                block.append(lines[i]); i += 1
            out.append(code('\n'.join(block)))
            i += 1
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+', x) for x in cells): rows.append(cells)
                i += 1
            n = len(rows[0])
            if rows[0][0] == 'Código':
                rows = [rows[0]] + sorted(rows[1:], key=lambda row: int(row[0]))
            widths = [WIDTH * r for r in ([.14, .86] if n == 2 else [.18, .14, .18, .50] if n == 4 else [1/n]*n)]
            out.extend(table(rows, widths))
        elif line.startswith('#'):
            heading = line.lstrip('#').strip()
            out.append(para(heading, 'H2')); i += 1
        elif line.startswith('- '):
            out.append(para('• ' + line[2:])); i += 1
        else:
            block = [line]; i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(('#', '|', '```', '- ')):
                block.append(lines[i].strip()); i += 1
            out.append(para(' '.join(block)))
    return out

class Document(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'DocH1':
            text = flowable.getPlainText()
            key = 'section-' + str(self.page)
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0, closed=False)
            self.notify('TOCEntry', (0, text, self.page, key))

def page(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(TEAL)
        canvas.rect(0, H-17, W, 17, fill=1, stroke=0)
        canvas.setFillColor(PALE)
        canvas.rect(W-125, 0, 125, 140, fill=1, stroke=0)
    else:
        canvas.setStrokeColor(LINE)
        canvas.line(52, H-43, W-52, H-43)
        canvas.setFont('SegoeBold', 9)
        canvas.setFillColor(TEAL)
        canvas.drawString(52, H-32, 'GoPlan')
        canvas.setFont('Segoe', 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(W-52, H-32, 'Taller de programación 2  |  21BYA  |  2026')
        canvas.line(52, 43, W-52, 43)
        canvas.drawString(52, 29, 'Documentación de la API  •  OpenAPI ' + spec['openapi'])
        canvas.drawRightString(W-52, 29, str(doc.page))
    canvas.restoreState()

doc = Document(str(OUTPUT), pagesize=A4, leftMargin=52, rightMargin=52, topMargin=65, bottomMargin=61,
               title=spec['info']['title'], author='María del Pilar Le Gammari Fraguas; Leon Felizzola; Lautaro Jose Luis Gijon')
doc.addPageTemplates(PageTemplate(id='normal', frames=Frame(52, 61, WIDTH, H-126, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0), onPage=page))
story = [Spacer(1, 50), para('INSTITUTO DE TECNOLOGÍA ORT', 'Small'), Spacer(1, 47),
         para('GoPlan', 'CoverTitle'), Paragraph('Documentación<br/>de la API', styles['CoverSub'])]
# Cover is populated from the academic information embedded in Swagger.
course = re.search(r'\*\*Curso:\*\*\s*(.+)', description).group(1).strip()
year = re.search(r'\*\*Año:\*\*\s*(.+)', description).group(1).strip()
members = description.split('### Integrantes', 1)[1].split('## Índice', 1)[0]
story += [para('Gestión de actividades y reservas'), Spacer(1, 28),
          para('Taller de programación 2', 'H2'), para(f'Curso {course}  |  Año {year}'),
          Spacer(1, 22), para('INTEGRANTES', 'Small')]
for name in re.findall(r'^- (.+)$', members, re.M): story.append(para(name))
story += [Spacer(1, 36), para('Versión ' + spec['info']['version'] + '  |  Fuente: swagger.json', 'Small'), PageBreak()]

story += [Paragraph('Índice', ParagraphStyle('IndexTitle', parent=styles['H1']))]
toc = TableOfContents()
toc.levelStyles = [ParagraphStyle('TOC', fontName='Segoe', fontSize=11, leading=19, textColor=INK, spaceBefore=10, leftIndent=0, firstLineIndent=0)]
story += [toc, Spacer(1, 26), para('Guía de lectura', 'H2'),
          para('Cada recurso detalla la solicitud HTTP, los parámetros, los cuerpos de entrada y salida y los códigos de estado. El servicio PDF incluye su formato de descarga y funcionamiento interno.'),
          para('Esta entrega contiene las cinco operaciones seleccionadas; no representa toda la API de GoPlan.', 'Small'), PageBreak()]

story.append(Paragraph('01 / Introducción', styles['H1']))
intro = description.split('## Introducción', 1)[1].split('## Base URL', 1)[0]
story.extend(markdown(intro))
story.extend(markdown('## Base URL\n\n```text\n' + spec['servers'][0]['url'].replace('{puerto}', spec['servers'][0]['variables']['puerto']['default']) + '\n```\n\nEl puerto se configura con PORT. Ajustar el servidor si se utiliza otro valor.'))
story.append(PageBreak())
story.append(Paragraph('02 / Acceso y alcance', styles['H1']))
usage = description.split('## Alcance de la documentación', 1)[1]
story.extend(markdown('## Alcance de la documentación\n' + usage))
story.extend(table([['Método', 'Operación'], *[[method.upper(), path] for path,item in spec['paths'].items() for method in item]], [WIDTH*.17, WIDTH*.83]))

for index, (path, methods) in enumerate(spec['paths'].items(), 3):
    for method, operation in methods.items():
        story.append(PageBreak())
        resource = operation['tags'][0].removeprefix('Recurso ')
        story.append(Paragraph(f'{index:02d} / {escape(resource)}', styles['H1']))
        story.extend(table([['Método HTTP', 'Endpoint'], [method.upper(), path]], [WIDTH*.21, WIDTH*.79]))
        text = operation['description']
        # Avoid repeating the opening description in the considerations section.
        if '### Consideraciones' in text:
            main, considerations = text.split('### Consideraciones', 1)
            paragraphs = considerations.strip().split('\n\n')
            text = main + ('### Detalles del servicio\n\n' + '\n\n'.join(paragraphs[1:]) if len(paragraphs) > 1 else '')
        story.extend(markdown(text))

doc.multiBuild(story)
print(OUTPUT)
