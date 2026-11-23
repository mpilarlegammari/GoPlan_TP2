import json
import re
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT

ROOT = Path(__file__).resolve().parents[2]
spec = json.loads((ROOT / 'swagger.json').read_text(encoding='utf-8'))
description = spec['info']['description']
doc = Document()
section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = section.bottom_margin = Cm(2)
section.left_margin = section.right_margin = Cm(1.9)
section.header_distance = section.footer_distance = Cm(.9)
section.different_first_page_header_footer = True

for name in ['Normal', 'Body Text', 'Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3']:
    doc.styles[name].font.name = 'Calibri'
normal = doc.styles['Normal']
normal.font.size = Pt(10)
normal.font.color.rgb = RGBColor.from_string('18343C')
normal.paragraph_format.space_after = Pt(7)
normal.paragraph_format.line_spacing = 1.12
for name, size in [('Heading 1', 22), ('Heading 2', 12), ('Heading 3', 11)]:
    st = doc.styles[name]
    st.font.size = Pt(size)
    st.font.color.rgb = RGBColor.from_string('08776E' if name != 'Heading 1' else '18343C')
    st.paragraph_format.space_before = Pt(12)
    st.paragraph_format.space_after = Pt(7)
    st.paragraph_format.keep_with_next = True
doc.styles['Title'].font.size = Pt(42)
doc.styles['Title'].font.color.rgb = RGBColor(0, 0, 0)
doc.styles['Subtitle'].font.size = Pt(23)
doc.styles['Subtitle'].font.color.rgb = RGBColor.from_string('08776E')
# Eliminar el borde decorativo heredado del estilo Title de la plantilla de Word.
for element in doc.styles.element.iter():
    for child in list(element):
        if child.tag == qn('w:pBdr'):
            element.remove(child)
code_style = doc.styles.add_style('Codigo API', 1)
code_style.font.name = 'Consolas'
code_style.font.size = Pt(8)
code_style.paragraph_format.line_spacing = 1.02
code_style.paragraph_format.space_after = Pt(9)
code_style.paragraph_format.keep_together = True

def rich(p, text):
    for part in re.split(r'(\*\*.*?\*\*|`[^`]+`)', text):
        if not part: continue
        r = p.add_run(part[2:-2] if part.startswith('**') else part[1:-1] if part.startswith('`') else part)
        if part.startswith('**'): r.bold = True
        if part.startswith('`'): r.font.name = 'Consolas'; r.font.size = Pt(9)
    return p

def para(text='', style=None):
    return rich(doc.add_paragraph(style=style), text)

def shade(element, fill):
    shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), fill); element.append(shd)

def table(rows):
    t = doc.add_table(rows=0, cols=len(rows[0]))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    fractions = [.15, .85] if len(rows[0]) == 2 else [.18, .13, .18, .51]
    for c, fraction in zip(t.columns, fractions): c.width = Cm(17.2 * fraction)
    if rows[0][0] == 'Código': rows = [rows[0]] + sorted(rows[1:], key=lambda r: int(r[0]))
    for i, data in enumerate(rows):
        cells = t.add_row().cells
        for cell, text, fraction in zip(cells, data, fractions):
            cell.width = Cm(17.2 * fraction)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            p = rich(cell.paragraphs[0], text)
            p.paragraph_format.space_after = p.paragraph_format.space_before = Pt(5)
            p.paragraph_format.line_spacing = 1.05
            if rows[0][0] == 'Código':
                p.paragraph_format.keep_with_next = i < len(rows) - 1
            for r in p.runs:
                r.font.size = Pt(9)
                if i == 0: r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)
            if i == 0 or i % 2 == 0: shade(cell._tc.get_or_add_tcPr(), '18343C' if i == 0 else 'F0F5F5')
        trpr = t.rows[-1]._tr.get_or_add_trPr()
        trpr.append(OxmlElement('w:cantSplit'))
        if i == 0: trpr.append(OxmlElement('w:tblHeader'))
    doc.add_paragraph().paragraph_format.space_after = Pt(0)

def markdown(text):
    lines = text.splitlines(); i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line: i += 1; continue
        if line.startswith('```'):
            i += 1; block = []
            while i < len(lines) and not lines[i].strip().startswith('```'):
                block.append(lines[i]); i += 1
            p = doc.add_paragraph('\n'.join(block), style='Codigo API')
            shade(p._p.get_or_add_pPr(), 'F0F5F5')
            i += 1
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+', c) for c in cells): rows.append(cells)
                i += 1
            table(rows)
        elif line.startswith('#'):
            heading = doc.add_heading(line.lstrip('#').strip().replace(':', ''), level=2)
            if line.lstrip('#').strip() == 'Detalles del servicio':
                heading.paragraph_format.page_break_before = True
            i += 1
        elif line.startswith('- '): para(line[2:], 'List Bullet'); i += 1
        else:
            block = [line]; i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(('#', '|', '```', '- ')):
                block.append(lines[i].strip()); i += 1
            para(' '.join(block))

bookmarks = []
def heading(text, key):
    p = doc.add_heading(text, level=1)
    start = OxmlElement('w:bookmarkStart'); start.set(qn('w:id'), str(len(bookmarks)+1)); start.set(qn('w:name'), key)
    end = OxmlElement('w:bookmarkEnd'); end.set(qn('w:id'), str(len(bookmarks)+1))
    p._p.insert(0, start); p._p.append(end)
    bookmarks.append((text, key))

def link(p, title, anchor):
    h = OxmlElement('w:hyperlink'); h.set(qn('w:anchor'), anchor)
    r = OxmlElement('w:r'); props = OxmlElement('w:rPr'); col = OxmlElement('w:color'); col.set(qn('w:val'), '08776E'); props.append(col); r.append(props)
    text = OxmlElement('w:t'); text.text = title; r.append(text); h.append(r); p._p.append(h)

# Running academic identification and page field are ordinary editable Word content.
hp = section.header.paragraphs[0]
hp.add_run('GoPlan').bold = True
hp.add_run('    Taller de programación 2  |  21BYA  |  2026')
for r in hp.runs: r.font.size = Pt(8); r.font.color.rgb = RGBColor.from_string('53656B')
fp = section.footer.paragraphs[0]
fp.add_run('Documentación de la API    |    ')
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); fp._p.append(field)
for r in fp.runs: r.font.size = Pt(8)

para('INSTITUTO DE TECNOLOGÍA ORT').paragraph_format.space_before = Pt(45)
doc.add_paragraph('GoPlan', 'Title').paragraph_format.space_before = Pt(45)
doc.add_paragraph('Documentación de la API', 'Subtitle')
para('Gestión de actividades y reservas').paragraph_format.space_after = Pt(27)
para('**Taller de programación 2**')
course = re.search(r'\*\*Curso:\*\*\s*(.+)', description).group(1).strip()
year = re.search(r'\*\*Año:\*\*\s*(.+)', description).group(1).strip()
para(f'Curso {course}  |  Año {year}').paragraph_format.space_after = Pt(24)
para('**Integrantes**')
members = description.split('### Integrantes',1)[1].split('## Índice',1)[0]
for member in re.findall(r'^- (.+)$', members, re.M): para(member)
para('Versión '+spec['info']['version']).paragraph_format.space_before = Pt(30)
doc.add_page_break()

index_title = doc.add_paragraph('Índice')
index_title.runs[0].font.size = Pt(24); index_title.runs[0].bold = True
index_placeholder = index_title._p
index_paragraphs = []
for i in range(7):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(15); index_paragraphs.append(p)
para('Cada sección reúne la solicitud HTTP, los parámetros, los ejemplos de entrada y salida y los códigos de estado. El comprobante PDF incluye sus detalles de generación.').paragraph_format.space_before = Pt(20)
doc.add_page_break()

heading('Introducción', 'introduccion')
markdown(description.split('## Introducción',1)[1].split('## Base URL',1)[0])
markdown('## Base URL\n\n```text\nhttp://localhost:8080\n```\n\nEl puerto se configura con PORT. Ajustar el servidor si se utiliza otro valor.')
doc.add_page_break()
heading('Acceso y alcance', 'acceso')
markdown('## Alcance de la documentación\n'+description.split('## Alcance de la documentación',1)[1])
table([['Método', 'Operación'], *[[method.upper(), path] for path,item in spec['paths'].items() for method in item]])

for i,(path, methods) in enumerate(spec['paths'].items()):
    for method, operation in methods.items():
        doc.add_page_break()
        heading(operation['tags'][0].removeprefix('Recurso '), f'recurso_{i}')
        table([['Método HTTP','Endpoint'], [method.upper(),path]])
        text = operation['description']
        if '### Consideraciones' in text:
            main, detail = text.split('### Consideraciones',1)
            paragraphs = detail.strip().split('\n\n')
            text = main + ('### Detalles del servicio\n\n'+'\n\n'.join(paragraphs[1:]) if len(paragraphs)>1 else '')
        markdown(text)

for p,(title,key) in zip(index_paragraphs,bookmarks): link(p,title,key)
doc.core_properties.title = 'Documentación de la API de GoPlan'
doc.core_properties.author = '; '.join(re.findall(r'^- (.+)$',members,re.M))
out = ROOT / 'output/docx/GoPlan_Documentacion_API.docx'
out.parent.mkdir(parents=True,exist_ok=True)
doc.save(out)
print(out)
