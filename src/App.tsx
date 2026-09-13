import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  DoorOpen,
  GripVertical,
  KeyRound,
  Lock,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Plus,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Unlock,
  WandSparkles,
  X,
} from 'lucide-react';
import Room, { Thumbnail } from './Room';
import {
  catalog,
  checks,
  findSpace,
  issues,
  makeItem,
  preset,
  type Item,
  type Kind,
  type Layout,
  type Proposal,
} from '../shared/layout';

const STORAGE_KEY = 'roomshift-layout-v1';
const promptStarter = 'Give both roommates a study area and keep the middle open.';

function safeInitialLayout(): Layout {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Layout;
      if (parsed && Array.isArray(parsed.items) && typeof parsed.width === 'number') return parsed;
    }
  } catch {
    // A malformed local snapshot should never keep the studio from opening.
  }
  return preset();
}

function itemLabel(item?: Item | null) {
  if (!item) return 'Nothing selected';
  return item.name || catalog[item.kind].name;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function App() {
  const [layout, setLayout] = useState<Layout>(safeInitialLayout);
  const [history, setHistory] = useState<Layout[]>([]);
  const [selected, setSelected] = useState<string | null>('desk-a');
  const [view, setView] = useState<'2D' | '3D'>('3D');
  const [zoom, setZoom] = useState(1);
  const [resetCamera, setResetCamera] = useState(0);
  const [prompt, setPrompt] = useState(promptStarter);
  const [pending, setPending] = useState(false);
  const [proposal, setProposal] = useState<(Proposal & { id: string }) | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [showClearance, setShowClearance] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [checksRun, setChecksRun] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const layoutVersion = useRef(0);

  const selectedItem = useMemo(() => layout.items.find((item) => item.id === selected) ?? null, [layout, selected]);
  const layoutChecks = useMemo(() => checks(layout), [layout]);
  const allIssues = useMemo(() => issues(layout), [layout]);
  const hasIssues = allIssues.length > 0;
  const filteredKinds = useMemo(
    () => (Object.keys(catalog) as Kind[]).filter((kind) => catalog[kind].name.toLowerCase().includes(catalogQuery.toLowerCase())),
    [catalogQuery],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Persistence is best effort in private browsing contexts.
    }
  }, [layout]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
      if (event.key === 'Escape' && proposal) cancelProposal();
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key.toLowerCase() === 'r' && selectedItem) rotateSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const commit = useCallback((next: Layout, message?: string) => {
    setHistory((past) => [...past.slice(-29), layout]);
    layoutVersion.current += 1;
    setLayout(next);
    if (message) setNotice({ tone: 'success', text: message });
  }, [layout]);

  function undo() {
    const previous = history.at(-1);
    if (!previous) {
      setNotice({ tone: 'warning', text: 'Nothing to undo yet.' });
      return;
    }
    setHistory((past) => past.slice(0, -1));
    layoutVersion.current += 1;
    setLayout(previous);
    setNotice({ tone: 'success', text: 'Last change undone.' });
  }

  function select(id: string | null) {
    setSelected(id);
    setNotice(null);
  }

  function tryCommitItem(item: Item, message?: string) {
    const next = { ...layout, items: layout.items.map((current) => (current.id === item.id ? item : current)) };
    const nextIssues = issues(next);
    if (nextIssues.length) {
      setNotice({ tone: 'warning', text: `Move blocked · ${nextIssues[0]}` });
      return false;
    }
    commit(next, message);
    return true;
  }

  function moveItem(id: string, x: number, z: number) {
    const item = layout.items.find((current) => current.id === id);
    if (!item || item.locked) {
      setNotice({ tone: 'warning', text: 'This piece is locked in place.' });
      return;
    }
    tryCommitItem({ ...item, x, z });
  }

  function addItem(kind: Kind, x = 0, z = 0) {
    const requested = makeItem(kind, clamp(x, -layout.width / 2 + 0.2, layout.width / 2 - 0.2), clamp(z, -layout.depth / 2 + 0.2, layout.depth / 2 - 0.2));
    const candidate = issues({ ...layout, items: [...layout.items, requested] }).length === 0
      ? requested
      : findSpace(layout, requested);
    if (!candidate) {
      setNotice({ tone: 'warning', text: 'There is no clear floor space for that piece.' });
      return;
    }
    const next = { ...layout, items: [...layout.items, candidate] };
    commit(next, `${catalog[kind].name} added to the room.`);
    setSelected(candidate.id);
  }

  function deleteSelected() {
    if (!selectedItem) return;
    if (selectedItem.locked) {
      setNotice({ tone: 'warning', text: 'Unlock this piece before deleting it.' });
      return;
    }
    commit({ ...layout, items: layout.items.filter((item) => item.id !== selectedItem.id) }, `${itemLabel(selectedItem)} removed.`);
    setSelected(null);
  }

  function duplicateSelected() {
    if (!selectedItem) return;
    const copy = makeItem(selectedItem.kind, selectedItem.x + 0.45, selectedItem.z + 0.45);
    const duplicate = { ...selectedItem, ...copy, name: `${itemLabel(selectedItem)} copy`, locked: false };
    const candidate = issues({ ...layout, items: [...layout.items, duplicate] }).length === 0 ? duplicate : findSpace(layout, duplicate);
    if (!candidate) {
      setNotice({ tone: 'warning', text: 'There is no clear floor space for a duplicate.' });
      return;
    }
    commit({ ...layout, items: [...layout.items, candidate] }, `${itemLabel(selectedItem)} duplicated.`);
    setSelected(candidate.id);
  }

  function rotateSelected() {
    if (!selectedItem) return;
    if (selectedItem.locked) {
      setNotice({ tone: 'warning', text: 'Unlock this piece before rotating it.' });
      return;
    }
    tryCommitItem({ ...selectedItem, rotation: (selectedItem.rotation + 90) % 360 }, 'Rotated 90°.');
  }

  function patchSelected(patch: Partial<Item>) {
    if (!selectedItem || selectedItem.locked) return;
    const candidate = { ...selectedItem, ...patch };
    tryCommitItem(candidate);
  }

  function toggleLock() {
    if (!selectedItem) return;
    commit({ ...layout, items: layout.items.map((item) => (item.id === selectedItem.id ? { ...item, locked: !item.locked } : item)) }, selectedItem.locked ? 'Piece unlocked.' : 'Piece locked in place.');
  }

  function resetRoom() {
    const next = preset();
    commit(next, 'Shared dorm preset restored.');
    setSelected('desk-a');
    setProposal(null);
    setResetCamera((value) => value + 1);
  }

  function changeRoomDimension(axis: 'width' | 'depth', value: number) {
    const next = { ...layout, [axis]: clamp(value, 3, 10) } as Layout;
    const nextIssues = issues(next);
    if (nextIssues.length) {
      setNotice({ tone: 'warning', text: `Room size blocked · ${nextIssues[0]}` });
      return;
    }
    commit(next, 'Room dimensions updated.');
  }

  function runLayoutChecks() {
    const latest = checks(layout);
    setChecksRun(true);
    const count = Object.values(latest).flat().length;
    setNotice({ tone: count ? 'warning' : 'success', text: count ? `${count} layout issue${count === 1 ? '' : 's'} need review.` : 'Layout checked · room boundaries, overlap, and door clearance all pass.' });
  }

  function saveRoom() {
    const savedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      const file = new Blob([JSON.stringify({ ...layout, savedAt }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'roomshift-layout.json';
      link.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: 'success', text: 'Layout saved locally and exported as roomshift-layout.json.' });
    } catch {
      setNotice({ tone: 'error', text: 'Could not save this layout in the current browser.' });
    }
  }

  async function getToken() {
    if (sessionToken) return sessionToken;
    const response = await fetch('/api/session');
    if (!response.ok) throw new Error('The local planner session could not start.');
    const data = await response.json() as { token: string };
    setSessionToken(data.token);
    return data.token;
  }

  async function rearrange() {
    if (pending || !prompt.trim()) return;
    setPending(true);
    setProposal(null);
    setNotice(null);
    const startingVersion = layoutVersion.current;
    try {
      const token = await getToken();
      const response = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-roomshift-token': token },
        body: JSON.stringify({ prompt: prompt.trim(), layout }),
      });
      const data = await response.json() as Proposal & { id?: string; error?: string; details?: string[] };
      if (layoutVersion.current !== startingVersion) {
        setNotice({ tone: 'warning', text: 'The room changed while Codex was thinking. This proposal was discarded.' });
        return;
      }
      if (!response.ok || !data.id) {
        throw new Error(data.error || 'The local planner could not complete this arrangement.');
      }
      if (data.status === 'impossible') {
        setNotice({ tone: 'warning', text: data.summary });
        return;
      }
      setProposal(data as Proposal & { id: string });
      setNotice({ tone: 'success', text: 'Proposal ready. Review the highlighted arrangement before applying.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The local planner is unavailable.' });
    } finally {
      setPending(false);
    }
  }

  async function applyProposal() {
    if (!proposal) return;
    try {
      const token = await getToken();
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-roomshift-token': token },
        body: JSON.stringify({ id: proposal.id, layout }),
      });
      const data = await response.json() as { layout?: Layout; error?: string };
      if (!response.ok || !data.layout) throw new Error(data.error || 'This proposal is no longer valid.');
      commit(data.layout, 'AI arrangement applied. Undo is available if you want the previous room back.');
      setProposal(null);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The proposal could not be applied.' });
    }
  }

  async function cancelProposal() {
    if (proposal) {
      const token = sessionToken;
      if (token) fetch(`/api/proposal/${proposal.id}`, { method: 'DELETE', headers: { 'x-roomshift-token': token } }).catch(() => undefined);
    }
    setProposal(null);
    setNotice({ tone: 'success', text: 'Proposal dismissed. Your current room is unchanged.' });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand">RoomShift</div>
          <div className="top-divider" />
          <button className="preset-button" onClick={resetRoom} aria-label="Choose room preset">
            <span className="eyebrow">CURRENT ROOM</span>
            <span>Furnished dorm <ChevronDown size={15} /></span>
          </button>
        </div>
        <div className="topbar-center"><span className="sparkle-dot">✦</span> Better spaces. Brighter days.</div>
        <div className="topbar-actions">
          <button className="icon-button" title="Undo" onClick={undo} disabled={!history.length}><Undo2 size={18} /></button>
          <button className="icon-button" title="Reset camera" onClick={() => setResetCamera((value) => value + 1)}><Maximize2 size={18} /></button>
          <button className="save-button" onClick={saveRoom}><Save size={16} /> Save</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="catalog-panel panel">
          <div className="panel-heading catalog-heading"><h1>Catalog</h1><button className="icon-button" aria-label="Search catalog" onClick={() => setSearchOpen(value => !value)}><Search size={21} /></button></div>
          {(searchOpen || catalogQuery) && <div className="search-box"><Search size={16} /><input autoFocus value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search pieces" /></div>}
          <div className="catalog-grid">
            {filteredKinds.map((kind) => (
              <button
                key={kind}
                className="catalog-card"
                draggable
                onDragStart={(event) => { event.dataTransfer.setData('application/roomshift', kind); event.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => addItem(kind)}
                title={`Add ${catalog[kind].name}`}
              >
                <div className="thumb-wrap"><Thumbnail kind={kind} /><span className="drag-handle"><GripVertical size={13} /></span></div>
                <span>{catalog[kind].name}</span>
              </button>
            ))}
          </div>
          <div className="catalog-foot"><MousePointer2 size={14} /> Click to add · drag onto floor</div>
        </aside>

        <section className="stage-panel">
          <div className="stage-toolbar">
            <div className="view-switcher" role="group" aria-label="Room view">
              <button title="Reset camera" onClick={() => setResetCamera(value => value + 1)}><Maximize2 size={21}/></button>
              <button className={view === '2D' ? 'active' : ''} onClick={() => setView('2D')}>2D</button>
              <button className={view === '3D' ? 'active' : ''} onClick={() => setView('3D')}>3D</button>
              <span className="dock-divider" />
              <button aria-label="Zoom out" onClick={() => setZoom(value => clamp(value - .1, .7, 1.35))}><Minus size={21}/></button>
              <button aria-label="Zoom in" onClick={() => setZoom(value => clamp(value + .1, .7, 1.35))}><Plus size={21}/></button>
              <span className="dock-divider" />
              <button title="Fit room" onClick={() => {setZoom(1);setResetCamera(value => value + 1);}}><Maximize2 size={21}/></button>
            </div>
            <div className="stage-meta"><span className="live-dot" /> LIVE EDITOR <span className="meta-separator" /> {layout.width.toFixed(1)} × {layout.depth.toFixed(1)} m</div>
          </div>
          <div className="room-canvas-wrap">
            <Room
              layout={proposal ? { width: layout.width, depth: layout.depth, items: proposal.items } : layout}
              selected={selected}
              onSelect={select}
              onMove={moveItem}
              onAdd={addItem}
              view={view}
              zoom={zoom}
              reset={resetCamera}
              preview={Boolean(proposal)}
              showClearance={showClearance}
            />
            <div className="canvas-legend"><span className="legend-swatch selected-swatch" /> Selected <span className="legend-swatch fixed-swatch" /> Fixed architecture</div>
            {proposal && (
              <div className="proposal-banner">
                <div className="proposal-mark"><Sparkles size={17} /></div>
                <div><strong>AI proposal preview</strong><span>Review the amber layout, then apply when it feels right.</span></div>
              </div>
            )}
            <div className="zoom-controls">
              <button onClick={() => setZoom((value) => clamp(value - 0.1, 0.7, 1.35))}><Minus size={16} /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => clamp(value + 0.1, 0.7, 1.35))}><Plus size={16} /></button>
            </div>
          </div>
          <div className="stage-footer">
            <div><span className="footer-kicker">EDITING TIP</span><span>Drag pieces on the floor · R to rotate · ⌘ Z to undo</span></div>
            <button className="clearance-toggle" onClick={() => setShowClearance((value) => !value)}><DoorOpen size={15} /> {showClearance ? 'Hide' : 'Show'} door clearance</button>
          </div>
        </section>

        <aside className="inspector-panel">
          <section className="panel ai-panel">
            <div className="ai-heading"><div className="ai-icon"><Sparkles size={19} /></div><div><span className="eyebrow">ROOMSHIFT AI</span><h2>AI layout copilot</h2></div><span className="ai-pulse" /></div>
            <p className="ai-intro">Describe the feeling you want. Codex will explore a bounded, collision-checked arrangement while preserving anything locked.</p>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder="Try: keep the middle open…" disabled={pending || Boolean(proposal)} />
            <div className="prompt-chips"><button onClick={() => setPrompt('Keep the middle open and move desks toward the window.')} disabled={pending || Boolean(proposal)}>open center</button><button onClick={() => setPrompt('Give both roommates a study area near the window.')} disabled={pending || Boolean(proposal)}>study zones</button></div>
            <button className="ai-button" onClick={rearrange} disabled={pending || Boolean(proposal) || !prompt.trim()}>{pending ? <><span className="spinner" /> Thinking with Codex…</> : <><WandSparkles size={17} /> Rearrange with AI</>}</button>
            {proposal && <div className="proposal-actions"><button className="apply-button" onClick={applyProposal}><Check size={16} /> Apply proposal</button><button className="cancel-button" onClick={cancelProposal}><X size={15} /> Cancel</button></div>}
            {proposal && <div className="proposal-summary"><span className="summary-label">WHY THIS WORKS</span><p>{proposal.summary}</p></div>}
          </section>

          <section className="panel checks-panel">
            <div className="section-title"><div><span className="eyebrow">SPATIAL SAFETY</span><h2>Layout checks</h2></div><div className="check-heading-actions"><span className={`check-count ${hasIssues ? 'has-issues' : ''}`}>{hasIssues ? `${allIssues.length} issue${allIssues.length > 1 ? 's' : ''}` : checksRun ? 'All clear' : 'Ready'}</span><button className="check-button" onClick={runLayoutChecks}><Check size={13} /> Check layout</button></div></div>
            <CheckRow label="Room boundaries" detail={layoutChecks.boundary[0] || 'Every piece stays inside the room'} ok={!layoutChecks.boundary.length} />
            <CheckRow label="Furniture overlap" detail={layoutChecks.overlap[0] || 'Solid pieces have breathing room'} ok={!layoutChecks.overlap.length} />
            <CheckRow label="Door clearance" detail={layoutChecks.door[0] || 'Entry zone remains clear'} ok={!layoutChecks.door.length} />
            <p className="checks-note">Guidance for this layout, not a building-code or accessibility certification.</p>
          </section>

          <section className="panel room-size-panel">
            <div className="section-title"><div><span className="eyebrow">FIXED ARCHITECTURE</span><h2>Room dimensions</h2></div><span className="dimension-note">meters</span></div>
            <div className="room-size-fields"><RoomField label="Width" value={layout.width} onChange={(value) => changeRoomDimension('width', value)} /><RoomField label="Depth" value={layout.depth} onChange={(value) => changeRoomDimension('depth', value)} /></div>
            <p className="checks-note">Door and window stay fixed as the room grows.</p>
          </section>

          <details className="panel inspector-card" open>
            <summary>Edit {itemLabel(selectedItem).toLowerCase()}</summary>
            <div className="section-title inspector-title"><div><span className="eyebrow">SELECTED PIECE</span><h2>{itemLabel(selectedItem)}</h2></div>{selectedItem && <span className={`lock-badge ${selectedItem.locked ? 'is-locked' : ''}`}>{selectedItem.locked ? <Lock size={12} /> : <Unlock size={12} />} {selectedItem.locked ? 'Locked' : 'Editable'}</span>}</div>
            {!selectedItem ? <div className="empty-inspector"><MousePointer2 size={18} /><span>Click a piece in the room to edit its size, color, and position.</span></div> : <>
              <div className="inspector-actions"><button onClick={rotateSelected} disabled={selectedItem.locked}><RotateCw size={15} /> Rotate 90°</button><button onClick={duplicateSelected}><Copy size={15} /> Duplicate</button><button className="danger-action" onClick={deleteSelected}><Trash2 size={15} /></button></div>
              <div className="field-grid"><Field label="Width" value={selectedItem.width} disabled={selectedItem.locked} onChange={(value) => patchSelected({ width: clamp(value, .2, 4) })} /><Field label="Depth" value={selectedItem.depth} disabled={selectedItem.locked} onChange={(value) => patchSelected({ depth: clamp(value, .2, 4) })} /><Field label="Height" value={selectedItem.height} disabled={selectedItem.locked} onChange={(value) => patchSelected({ height: clamp(value, .02, 2.6) })} /><div className="field color-field"><label htmlFor="color">Finish</label><div className="color-input"><input id="color" type="color" value={selectedItem.color} disabled={selectedItem.locked} onChange={(event) => patchSelected({ color: event.target.value })} /><span>{selectedItem.color.toUpperCase()}</span></div></div></div>
              <div className="position-row"><span>POSITION</span><span>{selectedItem.x.toFixed(2)} m / {selectedItem.z.toFixed(2)} m</span><button onClick={toggleLock}>{selectedItem.locked ? <><Unlock size={14} /> Unlock</> : <><KeyRound size={14} /> Lock piece</>}</button></div>
            </>}
          </details>

          {notice && <div className={`notice ${notice.tone}`} role="status"><span className="notice-icon">{notice.tone === 'success' ? <Check size={14} /> : notice.tone === 'error' ? <X size={14} /> : <span>!</span>}</span><span>{notice.text}</span><button onClick={() => setNotice(null)}><X size={14} /></button></div>}
        </aside>
      </main>
    </div>
  );
}

function CheckRow({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return <div className={`check-row ${ok ? 'ok' : 'issue'}`}><span className="check-icon">{ok ? <Check size={14} /> : <span>!</span>}</span><span className="check-copy"><strong>{label}</strong><small>{detail}</small></span><span className="check-state">{ok ? 'PASS' : 'REVIEW'}</span></div>;
}

function Field({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className="field"><label htmlFor={`field-${label}`}>{label}</label><div className="number-input"><input id={`field-${label}`} type="number" min="0.2" max="4" step="0.05" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value) || value)} /><span>m</span></div></div>;
}

function RoomField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="field"><label htmlFor={`room-${label}`}>{label}</label><div className="number-input"><input id={`room-${label}`} type="number" min="3" max="10" step="0.1" value={value} onChange={(event) => onChange(Number(event.target.value) || value)} /><span>m</span></div></div>;
}

export default App;
