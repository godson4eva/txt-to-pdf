import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDownToLine, ArrowRight,
  Bold, Check, ChevronDown, CircleHelp, Clock3, Cloud, Copy, FileImage, FilePlus2,
  FileText, Files, Gauge, Globe2, Highlighter, ImagePlus, Italic, Layers2, LockKeyhole,
  Menu, MoreHorizontal, MoveDown, MoveUp, PanelRight, Plus, Redo2, RotateCw,
  ShieldCheck, Sparkles, Trash2, Underline, Undo2, Upload, WandSparkles, X,
} from 'lucide-react'
import './PdflyApp.css'

type Page = { id: number; title: string; content: string; image?: string; rotation: number }
type Alignment = 'left' | 'center' | 'right' | 'justify'
type History = { pageId: number; content: string }

const initialContent = 'The first light arrived softly, stretching across the desk and finding its way into the pages of an unfinished thought.\n\nThere is something generous about beginning with a blank page. It asks for nothing but attention. One sentence, then another, until the shape of an idea becomes clear.'
const blankPage = (id: number): Page => ({ id, title: 'Untitled page', content: '', rotation: 0 })
const supportedTypes = '.txt,.doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,image/*'
const contactEmail = 'official.avtech@gmail'

const toolCards = [
  { title: 'Text to PDF', description: 'Turn your words into a polished, print-ready document.', icon: FileText },
  { title: 'Image to PDF', description: 'Bring photos and images together in one clean PDF.', icon: FileImage },
  { title: 'PDF Merge', description: 'Combine multiple documents into one seamless file.', icon: Files },
  { title: 'PDF Split', description: 'Separate the pages you need in just a few clicks.', icon: Layers2 },
  { title: 'PDF Compress', description: 'Make large files lighter and easier to share.', icon: Gauge },
  { title: 'PDF to Word', description: 'Move PDF text into an editable document.', icon: FileText },
  { title: 'PDF to Image', description: 'Export pages as crisp, easy-to-share images.', icon: FileImage },
  { title: 'PDF Editor', description: 'Make a quick change without starting over.', icon: WandSparkles },
]

function App() {
  const [pages, setPages] = useState<Page[]>([{ id: 1, title: 'A quiet morning', content: initialContent, rotation: 0 }])
  const [selectedId, setSelectedId] = useState(1)
  const [fontSize, setFontSize] = useState('16')
  const [fontFamily, setFontFamily] = useState('Georgia')
  const [lineSpacing, setLineSpacing] = useState('1.6')
  const [alignment, setAlignment] = useState<Alignment>('left')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderlined, setIsUnderlined] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [textColor, setTextColor] = useState('#333d47')
  const [highlightColor, setHighlightColor] = useState('#fff1c7')
  const [zoom, setZoom] = useState(100)
  const [status, setStatus] = useState('All changes saved')
  const [error, setError] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [history, setHistory] = useState<History[]>([])
  const [future, setFuture] = useState<History[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const page = pages.find((item) => item.id === selectedId) ?? pages[0]
  const currentPageNumber = pages.findIndex((item) => item.id === selectedId) + 1
  const wordCount = useMemo(() => pages.reduce((total, item) => total + item.content.trim().split(/\s+/).filter(Boolean).length, 0), [pages])

  const updatePage = (patch: Partial<Page>) => {
    setPages((items) => items.map((item) => item.id === page.id ? { ...item, ...patch } : item))
    setStatus('Unsaved changes')
  }

  const updateContent = (content: string) => {
    setHistory((items) => [...items.slice(-39), { pageId: page.id, content: page.content }])
    setFuture([])
    updatePage({ content })
  }

  const addPage = (afterId = selectedId) => {
    const newPage = blankPage(Date.now())
    setPages((items) => {
      const index = items.findIndex((item) => item.id === afterId)
      return [...items.slice(0, index + 1), newPage, ...items.slice(index + 1)]
    })
    setSelectedId(newPage.id)
    setStatus('All changes saved')
  }

  const newDocument = () => {
    const newPage = blankPage(Date.now())
    setPages([newPage])
    setSelectedId(newPage.id)
    setError('')
    setHistory([])
    setFuture([])
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' })
  }

  const deletePage = () => {
    if (pages.length === 1) return
    const index = pages.findIndex((item) => item.id === page.id)
    const next = pages[index - 1] ?? pages[index + 1]
    setPages((items) => items.filter((item) => item.id !== page.id))
    setSelectedId(next.id)
  }

  const duplicatePage = () => {
    const duplicate = { ...page, id: Date.now(), title: `${page.title} copy` }
    setPages((items) => {
      const index = items.findIndex((item) => item.id === page.id)
      return [...items.slice(0, index + 1), duplicate, ...items.slice(index + 1)]
    })
    setSelectedId(duplicate.id)
  }

  const movePage = (direction: -1 | 1) => {
    setPages((items) => {
      const index = items.findIndex((item) => item.id === page.id)
      const target = index + direction
      if (target < 0 || target >= items.length) return items
      const next = [...items]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const rotatePage = () => updatePage({ rotation: (page.rotation + 90) % 360 })

  const importFile = async (file: File) => {
    setError('')
    if (file.size > 25 * 1024 * 1024) {
      setError('This file is larger than 25 MB. Choose a smaller file to continue.')
      return
    }
    setStatus(`Importing ${file.name}...`)
    const extension = file.name.split('.').pop()?.toLowerCase()
    try {
      if (extension === 'txt') {
        updatePage({ title: file.name.replace(/\.txt$/i, ''), content: await file.text(), image: undefined })
      } else if (file.type.startsWith('image/')) {
        const image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Could not read image'))
          reader.readAsDataURL(file)
        })
        updatePage({ title: file.name, image, content: '' })
      } else if (['pdf', 'docx', 'doc', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension ?? '')) {
        const importedType = extension?.toUpperCase() ?? 'DOCUMENT'
        updatePage({ title: file.name, content: `[${importedType} uploaded]\n\nThis format is supported for upload, but its contents cannot be edited here yet. You can replace this text with your own and export it as a PDF.` })
      } else {
        throw new Error('That file type is not supported. Choose TXT, DOC, DOCX, PDF, or an image.')
      }
      setStatus('All changes saved')
      document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' })
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed. Please try another file.')
      setStatus('Import failed')
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void importFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files[0]
    if (file) void importFile(file)
  }

  const downloadPdf = async () => {
    setStatus('Preparing your PDF...')
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
    const font = fontFamily === 'Georgia' ? 'times' : fontFamily === 'Courier New' ? 'courier' : 'helvetica'
    const fontStyle = isBold && isItalic ? 'bolditalic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal'
    const toRgb = (hex: string): [number, number, number] => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number]
    pages.forEach((item, index) => {
      if (index > 0) pdf.addPage()
      pdf.setPage(index + 1)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(20)
      pdf.text(item.title || 'Untitled page', 72, 76)
      if (item.image) {
        const imageFormat = item.image.startsWith('data:image/png') ? 'PNG' : item.image.startsWith('data:image/webp') ? 'WEBP' : 'JPEG'
        pdf.addImage(item.image, imageFormat, 72, 110, 468, 330, undefined, 'FAST', item.rotation)
      }
      pdf.setFont(font, fontStyle)
      pdf.setFontSize(Number(fontSize))
      const lines = pdf.splitTextToSize(item.content, 468)
      pdf.setTextColor(...toRgb(textColor))
      const textY = item.image ? 470 : 116
      const textX = alignment === 'center' ? 306 : alignment === 'right' ? 540 : 72
      if (isHighlighted) {
        pdf.setFillColor(...toRgb(highlightColor))
        lines.forEach((line: string, lineIndex: number) => {
          const lineWidth = pdf.getTextWidth(line)
          const lineX = alignment === 'center' ? textX - lineWidth / 2 : alignment === 'right' ? textX - lineWidth : textX
          pdf.rect(lineX - 2, textY + lineIndex * Number(fontSize) * Number(lineSpacing) - Number(fontSize) * 0.78, lineWidth + 4, Number(fontSize) * 1.05, 'F')
        })
      }
      pdf.text(lines, textX, textY, { lineHeightFactor: Number(lineSpacing), align: alignment })
      if (isUnderlined) {
        pdf.setDrawColor(...toRgb(textColor))
        pdf.setLineWidth(0.45)
        lines.forEach((line: string, lineIndex: number) => {
          const lineWidth = pdf.getTextWidth(line)
          const lineX = alignment === 'center' ? textX - lineWidth / 2 : alignment === 'right' ? textX - lineWidth : textX
          const underlineY = textY + lineIndex * Number(fontSize) * Number(lineSpacing) + 2
          pdf.line(lineX, underlineY, lineX + lineWidth, underlineY)
        })
      }
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor('#89919a')
      pdf.text(`${String(index + 1).padStart(2, '0')}  /  ${String(pages.length).padStart(2, '0')}`, 540, 744, { align: 'right' })
    })
    pdf.save('docify-document.pdf')
    setStatus('Your PDF is ready')
  }

  const goTo = (id: string) => {
    setMobileMenuOpen(false)
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setHistory((items) => items.slice(0, -1))
    setFuture((items) => [...items, { pageId: page.id, content: page.content }])
    setPages((items) => items.map((item) => item.id === previous.pageId ? { ...item, content: previous.content } : item))
  }

  const redo = () => {
    const next = future.at(-1)
    if (!next) return
    setFuture((items) => items.slice(0, -1))
    setHistory((items) => [...items, { pageId: page.id, content: page.content }])
    setPages((items) => items.map((item) => item.id === next.pageId ? { ...item, content: next.content } : item))
  }

  const editorStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: lineSpacing,
    textAlign: alignment,
    fontWeight: isBold ? 700 : 400,
    fontStyle: isItalic ? 'italic' : 'normal',
    textDecoration: isUnderlined ? 'underline' : 'none',
    color: textColor,
    backgroundImage: isHighlighted ? `linear-gradient(transparent 60%, ${highlightColor} 60%)` : 'none',
    backgroundSize: '100% 2.15em',
  } as const

  return <div className="pdfly-site">
    <header className="site-header">
      <a className="site-brand" href="#home" onClick={(event) => { event.preventDefault(); goTo('#home') }} aria-label="Docify home">
        <span className="brand-icon"><FileText size={19} strokeWidth={2.2} /></span><span>Docify<span className="brand-period">.</span></span>
      </a>
      <nav className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <a href="#home" onClick={(event) => { event.preventDefault(); goTo('#home') }}>Home</a>
        <a href="#tools" onClick={(event) => { event.preventDefault(); goTo('#tools') }}>PDF Tools</a>
        <a href="#pricing" onClick={(event) => { event.preventDefault(); goTo('#pricing') }}>Pricing</a>
        <a href="#about" onClick={(event) => { event.preventDefault(); goTo('#about') }}>About</a>
        <button className="mobile-signin" onClick={() => setStatus('Sign-in will be available soon')}>Sign in</button>
      </nav>
      <div className="header-actions"><button className="sign-in" onClick={() => setStatus('Sign-in will be available soon')}>Sign in</button><button className="button button-dark button-small" onClick={() => goTo('#workspace')}>Get started <ArrowRight size={15} /></button></div>
      <button className="menu-toggle" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}</button>
    </header>

    <main>
      <section className="hero-section" id="home">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={14} /> YOUR DOCUMENTS, BEAUTIFULLY DONE</div>
          <h1>Create professional PDFs <span>in seconds.</span></h1>
          <p>Write, format, and convert your documents into high-quality PDFs with ease.</p>
          <div className="hero-actions"><button className="button button-dark" onClick={newDocument}>Create a PDF <ArrowRight size={16} /></button><button className="button button-light" onClick={() => goTo('#tools')}>Explore PDF tools <ChevronDown size={15} /></button></div>
          <div className="hero-proof"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span className="avatar-plus">+</span></div><span>Made for work that matters</span><span className="proof-divider" /><span className="proof-rating">★★★★★ <small>4.9 / 5</small></span></div>
        </div>
        <div className="hero-visual" aria-label="Docify document editor preview">
          <div className="visual-ambient" />
          <div className="mock-editor">
            <div className="mock-top"><div className="mock-dots"><i /><i /><i /></div><span>Quarterly notes.pdf</span><span className="mock-cloud"><Cloud size={14} /> Saved</span></div>
            <div className="mock-tools"><span><Bold size={12} /></span><span><Italic size={12} /></span><span className="mock-tool-active"><AlignLeft size={12} /></span><i /><span className="mock-tool-wide">Georgia <ChevronDown size={11} /></span><span className="mock-tool-wide">16 <ChevronDown size={11} /></span></div>
            <div className="mock-document"><div className="mock-doc-label">NOTES · 01</div><h2>A quiet morning</h2><span className="mock-rule" /><p>The first light arrived softly, stretching across the desk and finding its way into the pages of an unfinished thought.</p><p>There is something generous about beginning with a blank page. It asks for nothing but attention.</p><div className="mock-page-number">01 <span>/</span> 01</div></div>
            <div className="mock-footer"><span><span className="mock-green-dot" /> All changes saved</span><span>100%</span></div>
          </div>
          <div className="floating-export"><span className="export-icon"><ArrowDownToLine size={17} /></span><span><strong>Ready to share</strong><small>Your PDF is looking good</small></span><Check size={16} className="export-check" /></div>
          <div className="hero-corner-mark">P<span>.</span></div>
        </div>
        <div className="hero-bottom"><span>AN EASIER WAY TO WORK WITH DOCUMENTS</span><span className="hero-bottom-line" /><span>WRITE · CONVERT · SHARE</span></div>
      </section>

      <section className="workspace-section" id="workspace">
        <div className="section-heading workspace-heading"><div><span className="section-kicker">THE DOCIFY EDITOR</span><h2>Your next great document<br className="desktop-break" /> starts right here.</h2></div><div className="workspace-intro"><p>A quiet, focused space to shape your words and see the final page as you go.</p><span className="workspace-status"><span className="mock-green-dot" /> {status}</span></div></div>
        <div className={`upload-strip ${dragActive ? 'drag-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragActive(true) }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>
          <span className="upload-symbol"><Upload size={19} /></span><span className="upload-copy"><strong>Drop your document here</strong><small>or <button onClick={() => inputRef.current?.click()}>click to browse</button></small></span><span className="upload-types">TXT, DOC, DOCX, PDF, JPG, PNG <span>·</span> Up to 25 MB</span>
          <input ref={inputRef} type="file" accept={supportedTypes} onChange={handleFileChange} hidden />
        </div>
        <div className="editor-app">
          <aside className="document-sidebar">
            <div className="sidebar-topline"><span>DOCUMENT</span><button className="square-icon" aria-label="Add a new page" onClick={() => addPage()}><Plus size={16} /></button></div>
            <button className="new-document-button" onClick={newDocument}><FilePlus2 size={15} /> New document</button>
            <div className="page-list-label">PAGES <span>{String(pages.length).padStart(2, '0')}</span></div>
            <div className="page-thumbnails">{pages.map((item, index) => <button className={`page-thumbnail ${item.id === page.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)} aria-label={`Select page ${index + 1}: ${item.title}`}>
              <span className="thumbnail-paper"><span className="thumbnail-eyebrow" />{item.image ? <img src={item.image} alt="" /> : <><strong>{item.title || 'Untitled page'}</strong><i /><i /><i /><i /></>}</span><span className="thumbnail-caption">{String(index + 1).padStart(2, '0')} <span>{item.title || 'Untitled page'}</span></span>
            </button>)}</div>
            <div className="sidebar-bottom"><div className="page-controls" aria-label="Page controls"><button title="Move page up" aria-label="Move page up" onClick={() => movePage(-1)}><MoveUp size={14} /></button><button title="Move page down" aria-label="Move page down" onClick={() => movePage(1)}><MoveDown size={14} /></button><button title="Duplicate page" aria-label="Duplicate page" onClick={duplicatePage}><Copy size={14} /></button><button title="Rotate page" aria-label="Rotate page" onClick={rotatePage}><RotateCw size={14} /></button><button title="Delete page" aria-label="Delete page" disabled={pages.length === 1} onClick={deletePage}><Trash2 size={14} /></button></div><div className="workspace-user"><span className="user-monogram">JD</span><span><strong>Jordan Davis</strong><small>Free workspace</small></span><MoreHorizontal size={17} /></div></div>
          </aside>

          <section className="writing-panel" aria-label="Document editor">
            <div className="editor-toolbar">
              <div className="toolbar-row toolbar-primary">
                <div className="toolbar-group"><button className="editor-tool" aria-label="Undo" title="Undo" disabled={!history.length} onClick={undo}><Undo2 size={16} /></button><button className="editor-tool" aria-label="Redo" title="Redo" disabled={!future.length} onClick={redo}><Redo2 size={16} /></button></div><span className="toolbar-divider" />
                <select className="font-family-select" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} aria-label="Font family"><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="Verdana">Verdana</option><option value="Courier New">Courier New</option></select><select className="font-size-select" value={fontSize} onChange={(event) => setFontSize(event.target.value)} aria-label="Font size">{['12', '14', '16', '18', '20', '24', '28'].map((size) => <option key={size} value={size}>{size}</option>)}</select>
                <span className="toolbar-divider toolbar-divider-format" /><div className="toolbar-group formatting-group"><button className={`editor-tool ${isBold ? 'tool-selected' : ''}`} aria-label="Bold" aria-pressed={isBold} onClick={() => setIsBold((value) => !value)}><Bold size={15} /></button><button className={`editor-tool ${isItalic ? 'tool-selected' : ''}`} aria-label="Italic" aria-pressed={isItalic} onClick={() => setIsItalic((value) => !value)}><Italic size={15} /></button><button className={`editor-tool ${isUnderlined ? 'tool-selected' : ''}`} aria-label="Underline" aria-pressed={isUnderlined} onClick={() => setIsUnderlined((value) => !value)}><Underline size={15} /></button></div>
                <span className="toolbar-divider toolbar-divider-align" /><div className="toolbar-group align-group">{([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight], ['justify', AlignJustify]] as const).map(([value, Icon]) => <button key={value} className={`editor-tool ${alignment === value ? 'tool-selected' : ''}`} aria-label={`Align ${value}`} aria-pressed={alignment === value} onClick={() => setAlignment(value)}><Icon size={15} /></button>)}</div>
                <span className="toolbar-spacer" /><button className="editor-tool add-image-tool" title="Add image" aria-label="Add image" onClick={() => imageInputRef.current?.click()}><ImagePlus size={16} /></button><input ref={imageInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
              </div>
              <div className="toolbar-row toolbar-secondary"><span className="toolbar-label">TEXT</span><label className="color-control" title="Text color"><span className="color-chip" style={{ backgroundColor: textColor }} /><span>Color</span><input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} aria-label="Text color" /></label><button className={`editor-tool highlight-toggle ${isHighlighted ? 'tool-selected' : ''}`} title="Toggle text highlight" aria-label="Toggle text highlight" aria-pressed={isHighlighted} onClick={() => setIsHighlighted((value) => !value)}><Highlighter size={15} /></button><label className="color-control" title="Highlight color"><span>Highlight</span><input type="color" value={highlightColor} onChange={(event) => setHighlightColor(event.target.value)} aria-label="Highlight color" /></label><span className="toolbar-secondary-divider" /><label className="spacing-control">Line spacing <select aria-label="Line spacing" value={lineSpacing} onChange={(event) => setLineSpacing(event.target.value)}><option value="1.3">1.3</option><option value="1.5">1.5</option><option value="1.6">1.6</option><option value="1.8">1.8</option><option value="2">2</option></select></label><button className="editor-tool page-add-tool" onClick={() => addPage()}><Plus size={14} /> Add page</button>
              </div>
            </div>
            <div className="writing-scroll"><div className="writing-page"><div className="document-label">DOCUMENT <span>·</span> PAGE {String(currentPageNumber).padStart(2, '0')}</div><input className="document-title" value={page.title} onChange={(event) => updatePage({ title: event.target.value })} onBlur={() => setStatus('All changes saved')} aria-label="Document title" placeholder="Untitled document" /><textarea className="document-body" value={page.content} onChange={(event) => updateContent(event.target.value)} onBlur={() => setStatus('All changes saved')} aria-label="Document text" placeholder="Start writing something wonderful..." style={editorStyle} />{page.image && <div className="inserted-image"><img src={page.image} alt={page.title} /><button aria-label="Remove image" onClick={() => updatePage({ image: undefined })}><X size={14} /></button></div>}<div className="writing-page-footer"><span>{wordCount} words <span>·</span> {pages.length} page{pages.length === 1 ? '' : 's'}</span><span>Page {currentPageNumber} of {pages.length}</span></div></div></div>
            <div className="editor-bottom"><span><span className="mock-green-dot" /> Autosaved locally</span><span>Plain text document</span></div>
          </section>

          <aside className="preview-panel"><div className="preview-top"><div><span className="preview-overline"><span className="preview-live-dot" /> LIVE PREVIEW</span><h3>{page.title || 'Untitled document'}</h3></div><button className="square-icon" aria-label="Rotate preview" onClick={rotatePage}><RotateCw size={15} /></button></div><div className="preview-stage"><div className="preview-paper-wrap" style={{ transform: `scale(${zoom / 100})` }}><article className="preview-paper" style={{ transform: `rotate(${page.rotation}deg)` }}><span className="preview-paper-label">DOCIFY <span>·</span> DOCUMENT</span><h2>{page.title || 'Untitled document'}</h2><div className="preview-accent-line" />{page.image && <img className="preview-image" src={page.image} alt="Imported document" />}<div className="preview-content" style={{ ...editorStyle, backgroundImage: 'none' }}>{page.content.split('\n').map((line, index) => line ? <p key={`${index}-${line}`}>{line}</p> : <div className="preview-paragraph-break" key={`blank-${index}`} />)}</div><div className="preview-page-number">{String(currentPageNumber).padStart(2, '0')} <span>/</span> {String(pages.length).padStart(2, '0')}</div></article></div></div><div className="preview-bottom"><span><PanelRight size={14} /> {Math.round(612 * zoom / 100)} × {Math.round(792 * zoom / 100)} pt</span><span className="zoom-controls"><button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(60, value - 10))}>−</button><span>{zoom}%</span><button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(130, value + 10))}>+</button></span></div><button className="preview-download" onClick={downloadPdf}><ArrowDownToLine size={16} /> Download PDF</button></aside>
        </div>
        {error && <div className="error-message" role="alert"><CircleHelp size={16} />{error}<button aria-label="Dismiss message" onClick={() => setError('')}><X size={15} /></button></div>}
      </section>

      <section className="tools-section" id="tools"><div className="section-heading tools-heading"><div><span className="section-kicker">A LITTLE TOOL FOR EVERY TASK</span><h2>Everything you need to<br className="desktop-break" /> work with PDFs.</h2></div><p>From the first draft to the final page, your everyday document tools are all in one place.</p></div><div className="tools-grid">{toolCards.map(({ title, description, icon: Icon }, index) => <article className="tool-card" key={title}><div className={`tool-icon tone-${index % 4}`}><Icon size={19} strokeWidth={1.8} /></div><span className="tool-index">0{index + 1}</span><h3>{title}</h3><p>{description}</p><button aria-label={`Open ${title}`} onClick={() => { setStatus(`${title} workspace selected`); goTo('#workspace') }}>Open tool <ArrowRight size={14} /></button></article>)}</div></section>

      <section className="steps-section"><div className="steps-heading"><span className="section-kicker">THREE STEPS. ONE GREAT PDF.</span><h2>Simple by design.</h2></div><div className="steps-grid"><Step icon={<FileText size={20} />} number="01" title="Write or upload" text="Start with a blank page or bring in a document you already have." /><Step icon={<WandSparkles size={20} />} number="02" title="Make it yours" text="Choose your type, adjust the details, and see every change live." /><Step icon={<ArrowDownToLine size={20} />} number="03" title="Download & share" text="Export a crisp, ready-to-send PDF whenever it feels just right." /></div></section>

      <section className="company-section" id="about"><div className="company-heading"><span className="section-kicker">THE COMPANY BEHIND THE PRODUCT</span><h2>Technology for<br />everyday work.</h2><p>AV Tech builds simple, practical digital solutions that make everyday tasks easier for people, teams, and businesses.</p></div><div className="company-columns"><article className="company-column"><span className="company-label">THE COMPANY</span><h3>About AV Tech</h3><p>AV Tech is a technology company focused on accessible, reliable products designed around real-world needs. Our growing ecosystem spans productivity, documents, business solutions, and more.</p><p className="company-statement">AV Tech — Building technology that makes everyday work simpler.</p><a className="company-contact" href={`mailto:${contactEmail}`}>Contact <span>{contactEmail}</span> <ArrowRight size={14} /></a></article><article className="company-column docify-column"><span className="company-label">THE PRODUCT</span><h3>About Docify</h3><p>Docify is a document productivity platform developed by AV Tech. It brings document creation, editing, conversion, and management together, helping people make polished PDFs, invoices, receipts, CVs, and more.</p><p className="company-subhead">A growing toolkit</p><ul className="company-tools-list"><li>Text, image, and PDF tools</li><li>Merge, split, and compress PDFs</li><li>Invoices, receipts, and quotations</li><li>CVs, resumes, and document management</li></ul><div className="company-principles"><div><strong>Our vision</strong><p>Become a trusted, all-in-one platform for creating and managing professional documents.</p></div><div><strong>Our mission</strong><p>Simplify document work with useful tools, intuitive design, and modern technology.</p></div></div><p className="company-relationship"><strong>AV Tech</strong> — Company <span>·</span> <strong>Docify</strong> — Product</p><p className="docify-tagline">Docify — Create. Manage. Simplify.</p></article></div></section>

      <section className="about-section" id="benefits"><div className="about-copy"><span className="section-kicker">THOUGHTFUL TOOLS, BETTER WORK</span><h2>Good work deserves<br />a beautiful finish.</h2><p>Docify keeps the busywork out of document-making, so you can focus on the thing you came here to say.</p><button className="text-link" onClick={() => goTo('#workspace')}>Make your first PDF <ArrowRight size={15} /></button></div><div className="benefits-grid"><Benefit icon={<Clock3 size={19} />} title="Made for momentum" text="A quick, focused workflow that gets out of your way." /><Benefit icon={<Sparkles size={19} />} title="Easy by nature" text="Clear controls make document work feel effortless." /><Benefit icon={<Globe2 size={19} />} title="Works everywhere" text="A comfortable experience on mobile, tablet, and desktop." /><Benefit icon={<ShieldCheck size={19} />} title="Your files stay yours" text="Documents are handled in your browser, not stored on our servers." /><Benefit icon={<Check size={19} />} title="Crisp by default" text="High-quality PDFs that look right on screen and on paper." /><Benefit icon={<Cloud size={19} />} title="No setup needed" text="Open your workspace and start creating right away." /></div></section>

      <section className="pricing-section" id="pricing"><div className="pricing-heading"><span className="section-kicker">STRAIGHTFORWARD PLANS</span><h2>Room to grow, when you’re ready.</h2><p>Start free. Choose the tools that fit the way you work.</p></div><div className="pricing-grid"><PricePlan name="Free" price="$0" period="forever" description="A thoughtful workspace for everyday documents." features={['Unlimited text documents', 'Essential formatting tools', 'PDF download', 'Up to 25 MB per upload']} action="Get started" onClick={() => goTo('#workspace')} /><PricePlan featured name="Pro" price="$1" period="/ month" description="More room for your ideas and your workflow." features={['Everything in Free', 'Advanced PDF tools', 'Larger file uploads', 'Priority processing']} action="Explore Pro" onClick={() => setStatus('Pro plans are coming soon')} /><PricePlan name="Business" price="$5" period="/ user / month" description="A polished document workflow for your team." features={['Everything in Pro', 'Shared team workspace', 'Centralized billing', 'Dedicated support']} action="Talk to us" onClick={() => setStatus('Business plans are coming soon')} /></div><p className="pricing-note"><LockKeyhole size={13} /> No payment is taken here. Plans are a preview of what’s ahead.</p></section>

      <section className="closing-cta"><div className="closing-mark"><FileText size={18} /></div><div><span className="section-kicker">A BETTER FIRST DRAFT STARTS HERE</span><h2>Make something worth sharing.</h2></div><button className="button button-dark" onClick={newDocument}>Create your PDF <ArrowRight size={16} /></button><span className="closing-spark">✳</span></section>
    </main>

    <footer className="site-footer"><div className="footer-main"><div className="footer-brand-column"><a className="site-brand footer-brand" href="#home" onClick={(event) => { event.preventDefault(); goTo('#home') }} aria-label="Docify home"><span className="brand-icon"><FileText size={19} strokeWidth={2.2} /></span><span>Docify<span className="brand-period">.</span></span></a><p>Clear pages. Better ideas.<br />A more considered way to make PDFs.</p><span className="footer-made">A product by AV Tech</span></div><FooterLinks title="PRODUCT" links={['PDF editor', 'Text to PDF', 'Image to PDF', 'Pricing']} onClick={(label) => label === 'Pricing' ? goTo('#pricing') : goTo('#workspace')} /><FooterLinks title="PDF TOOLS" links={['Merge PDF', 'Split PDF', 'Compress PDF', 'PDF to Word']} onClick={() => goTo('#tools')} /><FooterLinks title="COMPANY" links={['About AV Tech', 'Privacy policy', 'Terms of service', 'Contact']} onClick={(label) => label === 'About AV Tech' ? goTo('#about') : setStatus(`${label} information is coming soon`)} /></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Docify by AV Tech. All rights reserved.</span><a href={`mailto:${contactEmail}`}><LockKeyhole size={13} /> {contactEmail}</a></div></footer>
  </div>
}

function Step({ icon, number, title, text }: { icon: ReactNode; number: string; title: string; text: string }) {
  return <article className="step-item"><div className="step-icon">{icon}</div><span className="step-number">{number} / 03</span><h3>{title}</h3><p>{text}</p></article>
}

function Benefit({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="benefit-item"><span className="benefit-icon">{icon}</span><div><h3>{title}</h3><p>{text}</p></div></article>
}

function PricePlan({ name, price, period, description, features, action, featured, onClick }: { name: string; price: string; period: string; description: string; features: string[]; action: string; featured?: boolean; onClick: () => void }) {
  return <article className={`price-card ${featured ? 'price-featured' : ''}`}>{featured && <span className="popular-tag">MOST POPULAR</span>}<span className="plan-name">{name}</span><div className="plan-price">{price}<small>{period}</small></div><p className="plan-description">{description}</p><button className={`plan-action ${featured ? 'plan-action-featured' : ''}`} onClick={onClick}>{action} <ArrowRight size={14} /></button><span className="plan-includes">INCLUDES</span><ul>{features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul></article>
}

function FooterLinks({ title, links, onClick }: { title: string; links: string[]; onClick: (label: string) => void }) {
  return <div className="footer-links"><h3>{title}</h3>{links.map((label) => label === 'Contact' ? <a key={label} href={`mailto:${contactEmail}`}>{label}</a> : <button key={label} onClick={() => onClick(label)}>{label}</button>)}</div>
}

export default App
