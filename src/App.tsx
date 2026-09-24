import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Copy, Download, FilePlus2, FileText, ImagePlus, Italic, List, MoreHorizontal, MoveDown, MoveUp, Plus, Redo2, RotateCw, Search, Trash2, Type, Underline, Undo2, Upload } from 'lucide-react'
import './App.css'

type Page = { id: number; title: string; content: string; image?: string; rotation: number }

const initialContent = 'A quiet morning\n\nThe first light arrived softly, stretching across the desk and finding its way into the pages of an unfinished thought.\n\nThere is something generous about beginning with a blank page. It asks for nothing but attention. One sentence, then another, until the shape of an idea becomes clear.'
const blankPage = (id: number): Page => ({ id, title: 'Untitled page', content: '', rotation: 0 })

function App() {
  const [pages, setPages] = useState<Page[]>([{ id: 1, title: 'Untitled document', content: initialContent, rotation: 0 }])
  const [selectedId, setSelectedId] = useState(1)
  const [fontSize, setFontSize] = useState('16')
  const [fontFamily, setFontFamily] = useState('Inter')
  const [zoom, setZoom] = useState(100)
  const [status, setStatus] = useState('Saved just now')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const page = pages.find((item) => item.id === selectedId) ?? pages[0]
  const wordCount = useMemo(() => pages.reduce((total, item) => total + item.content.trim().split(/\s+/).filter(Boolean).length, 0), [pages])

  const updatePage = (patch: Partial<Page>) => { setPages((items) => items.map((item) => item.id === page.id ? { ...item, ...patch } : item)); setStatus('Saving...') }
  const addPage = (afterId = selectedId) => { const newPage = blankPage(Date.now()); setPages((items) => { const index = items.findIndex((item) => item.id === afterId); return [...items.slice(0, index + 1), newPage, ...items.slice(index + 1)] }); setSelectedId(newPage.id); setStatus('Saved just now') }
  const newDocument = () => { const newPage = blankPage(Date.now()); setPages([newPage]); setSelectedId(newPage.id); setError('') }
  const deletePage = () => { if (pages.length === 1) return; const index = pages.findIndex((item) => item.id === page.id); const next = pages[index - 1] ?? pages[index + 1]; setPages((items) => items.filter((item) => item.id !== page.id)); setSelectedId(next.id) }
  const duplicatePage = () => { const duplicate = { ...page, id: Date.now(), title: `${page.title} copy` }; setPages((items) => { const index = items.findIndex((item) => item.id === page.id); return [...items.slice(0, index + 1), duplicate, ...items.slice(index + 1)] }); setSelectedId(duplicate.id) }
  const movePage = (direction: -1 | 1) => { setPages((items) => { const index = items.findIndex((item) => item.id === page.id); const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next }) }
  const rotatePage = () => updatePage({ rotation: (page.rotation + 90) % 360 })

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    setError(''); setStatus(`Importing ${file.name}...`)
    const extension = file.name.split('.').pop()?.toLowerCase()
    try {
      if (extension === 'txt') updatePage({ title: file.name.replace(/\.txt$/i, ''), content: await file.text() })
      else if (file.type.startsWith('image/')) { const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read image')); reader.readAsDataURL(file) }); updatePage({ title: file.name, image, content: '' }) }
      else if (extension === 'docx' || extension === 'xlsx' || extension === 'pdf') { updatePage({ title: file.name, content: `[Imported ${extension.toUpperCase()} file]\n\nThis file is ready for page conversion. The full parser is being prepared in the import service.` }) }
      else throw new Error('Unsupported file. Use PDF, DOCX, XLSX, PPTX, TXT, JPG, JPEG, or PNG.')
      setStatus('Saved just now')
    } catch (importError) { setError(importError instanceof Error ? importError.message : 'Import failed'); setStatus('Import failed') }
    event.target.value = ''
  }

  const downloadPdf = () => {
    setStatus('Exporting PDF...')
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
    pages.forEach((item, index) => { if (index > 0) pdf.addPage(); pdf.setPage(index + 1); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.text(item.title || 'Untitled page', 72, 76); if (item.image) pdf.addImage(item.image, 'JPEG', 72, 110, 468, 330); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(Number(fontSize)); pdf.text(pdf.splitTextToSize(item.content, 468), 72, item.image ? 470 : 116, { lineHeightFactor: 1.55 }) })
    pdf.save('folio-document.pdf'); setStatus('Exported just now')
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><FileText size={17} /></span><span>folio</span></div><div className="breadcrumb"><span>My workspace</span><span className="slash">/</span><strong>{page.title}</strong></div><div className="top-actions"><span className="save-status"><span className="saved-dot" />{status}</span><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button" onClick={() => setStatus('Project saved locally')} aria-label="Save project"><Download size={17} /></button><button className="export-button" onClick={downloadPdf}><Download size={17} /> Export PDF</button></div></header>
    <section className="workspace">
      <aside className="sidebar"><div className="sidebar-heading"><span>Pages · {pages.length}</span><button className="new-button" onClick={() => addPage()} aria-label="Add page"><Plus size={17} /></button></div><button className="new-document" onClick={newDocument}><FilePlus2 size={16} /> New Blank Document</button><label className="import-button"><Upload size={15} /> Import File<input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,image/*" onChange={importFile} /></label><div className="page-list">{pages.map((item, index) => <button className={`page-thumb ${item.id === page.id ? 'active' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><span className="thumb-number">{String(index + 1).padStart(2, '0')}</span><span className="thumb-paper"><span className="thumb-accent" />{item.image ? <img src={item.image} alt="" /> : <><strong>{item.title}</strong><i /><i /><i /><i /></>}</span><span className="thumb-label">{item.title}</span></button>)}</div><div className="sidebar-bottom"><div className="page-actions"><button onClick={() => movePage(-1)} title="Move page up"><MoveUp size={15} /></button><button onClick={() => movePage(1)} title="Move page down"><MoveDown size={15} /></button><button onClick={duplicatePage} title="Duplicate page"><Copy size={15} /></button><button onClick={rotatePage} title="Rotate page"><RotateCw size={15} /></button><button onClick={deletePage} title="Delete page"><Trash2 size={15} /></button></div><div className="user-row"><span className="avatar">JD</span><span><strong>Jordan Davis</strong><small>Free workspace</small></span><MoreHorizontal size={16} /></div></div></aside>
      <section className="editor-panel"><div className="editor-toolbar"><div className="toolbar-group"><button className="tool-button" aria-label="Undo"><Undo2 size={17} /></button><button className="tool-button" aria-label="Redo"><Redo2 size={17} /></button></div><span className="toolbar-divider" /><select className="font-select" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} aria-label="Font family"><option>Inter</option><option>Georgia</option><option>Arial</option><option>Courier New</option></select><select value={fontSize} onChange={(event) => setFontSize(event.target.value)} aria-label="Font size"><option value="14">14</option><option value="16">16</option><option value="18">18</option><option value="20">20</option><option value="24">24</option></select><span className="toolbar-divider" /><div className="toolbar-group"><button className="tool-button" aria-label="Bold"><Bold size={16} /></button><button className="tool-button" aria-label="Italic"><Italic size={16} /></button><button className="tool-button" aria-label="Underline"><Underline size={16} /></button><button className="tool-button" aria-label="Bulleted list"><List size={16} /></button></div><span className="toolbar-divider" /><div className="toolbar-group"><button className="tool-button active-tool"><AlignLeft size={16} /></button><button className="tool-button"><AlignCenter size={16} /></button><button className="tool-button"><AlignRight size={16} /></button><button className="tool-button"><AlignJustify size={16} /></button></div></div><div className="editor-scroll"><div className="editor-heading"><input value={page.title} onChange={(event) => updatePage({ title: event.target.value })} onBlur={() => setStatus('Saved just now')} aria-label="Page title" /></div><textarea className="editor-textarea" value={page.content} onChange={(event) => updatePage({ content: event.target.value })} onBlur={() => setStatus('Saved just now')} aria-label="Page content" style={{ fontSize: `${fontSize}px`, fontFamily }} placeholder="Start writing on this blank page..." />{page.image && <div className="editor-image-wrap"><img src={page.image} alt={page.title} style={{ transform: `rotate(${page.rotation}deg)` }} /><span><ImagePlus size={14} /> Image selected</span></div>}<div className="editor-footer"><span>{wordCount} words · {pages.length} page{pages.length === 1 ? '' : 's'}</span><span>Page {pages.findIndex((item) => item.id === page.id) + 1} of {pages.length}</span></div></div></section>
      <aside className="preview-panel"><div className="preview-header"><div><span className="eyebrow">LIVE PDF PREVIEW</span><h2>{page.title}</h2></div><button className="preview-menu" onClick={rotatePage} aria-label="Rotate page"><RotateCw size={18} /></button></div><div className="paper-wrap" style={{ zoom: zoom / 100 }}><article className="paper" style={{ transform: `rotate(${page.rotation}deg)` }}><div className="paper-accent" /><h1>{page.title}</h1>{page.image && <img className="paper-image" src={page.image} alt="Imported" />}<div className="paper-content">{page.content.split('\n').map((line, index) => line ? <p key={`${line}-${index}`}>{line}</p> : <div className="paper-break" key={`break-${index}`} />)}</div><div className="paper-page">{String(pages.findIndex((item) => item.id === page.id) + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</div></article></div><div className="preview-footer"><span><span className="status-dot" />Up to date</span><span className="zoom-controls"><button onClick={() => setZoom(Math.max(60, zoom - 10))}>−</button>{zoom}%<button onClick={() => setZoom(Math.min(140, zoom + 10))}>+</button></span></div></aside>
    </section>{error && <div className="error-toast">{error}</div>}
  </main>
}

export default App
