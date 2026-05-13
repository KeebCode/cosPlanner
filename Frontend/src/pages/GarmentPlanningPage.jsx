import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { auth } from '../firebase';

const API      = (import.meta.env.VITE_API_BASE_URL || '') + '/api/garment';
const BASE_API = (import.meta.env.VITE_API_BASE_URL || '');

async function authFetch(url, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PIXELS_PER_CM = 4;
const GRID_CM       = 5;
const RULER_SIZE    = 32;

const GRAIN_COLORS = {
  grainline:  '#22d3ee',
  crossgrain: '#f59e0b',
  truebias:   '#a78bfa',
  none:       '#94a3b8',
};

const GRAIN_ICONS = {
  grainline:  '↕',
  crossgrain: '↔',
  truebias:   '↗',
  none:       '○',
};

const MEASUREMENT_FIELDS = [
  ['Waist',    'costume_waist_length'],
  ['Head',     'costume_head_circumference'],
  ['Hip',      'costume_hip_length'],
  ['Shoulder', 'costume_shoulder_length'],
  ['Arm',      'costume_arm_length'],
  ['Torso',    'costume_torso_length'],
  ['Leg',      'costume_legs_length'],
  ['Neck',     'costume_neck_length'],
  ['Inseam',   'costume_inner_seam_size'],
  ['Shoe',     'costume_shoe_size'],
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function rectVertices(w, h) {
  return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
}

function measurementsToBlock(m) {
  const w = parseFloat(m.width)  || 20;
  const h = parseFloat(m.height) || 30;
  return rectVertices(w, h);
}

function prettyGrain(g) {
  const labels = { grainline: 'Grainline', crossgrain: 'Cross Grain', truebias: 'True Bias', none: 'None' };
  return labels[g] ?? g;
}

function rulerLabel(cm, zoom) {
  if (zoom >= 1.5) return `${cm}`;
  if (zoom >= 0.5) return cm % 10 === 0 ? `${cm}` : '';
  return cm % 20 === 0 ? `${cm}` : '';
}

function rulerStep(zoom) {
  if (zoom >= 2)   return 1;
  if (zoom >= 1)   return 5;
  if (zoom >= 0.5) return 10;
  return 20;
}

// ── DXF Import ────────────────────────────────────────────────────────────────

function cleanLayerName(layer) {
  return layer.replace(/^BLOCK_/, '').replace(/_/g, ' ')
    .toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || 'Imported';
}

function parseDXFBlocks(text) {
  // Tokenize into [groupCode, value] pairs
  const lines = text.replace(/^﻿/, '').split(/\r?\n/); // strip BOM
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    if (!isNaN(code)) pairs.push([code, lines[i + 1].trim()]);
  }

  // Detect unit scale from $INSUNITS header variable (4=mm → scale 0.1; default cm=1)
  let unitScale = 1;
  for (let i = 0; i < pairs.length - 1; i++) {
    if (pairs[i][0] === 9 && pairs[i][1] === '$INSUNITS') {
      const u = parseInt(pairs[i + 1][1], 10);
      if (u === 4) unitScale = 0.1;       // mm → cm
      else if (u === 1) unitScale = 2.54;  // inches → cm
      else if (u === 6) unitScale = 100;   // meters → cm
      break;
    }
  }

  // Skip to ENTITIES section
  let idx = 0;
  while (idx < pairs.length && !(pairs[idx][0] === 2 && pairs[idx][1] === 'ENTITIES')) idx++;
  if (idx >= pairs.length) return [];
  idx++; // move past the [2, 'ENTITIES'] marker

  const SKIP = new Set(['FABRIC', 'GRAINLINE', 'GRAINLINE_TEXT', 'TEXT', '0', 'DEFPOINTS', '']);
  const layerBounds = {}; // layerName → { xs: [], ys: [] }

  // Walk every entity in ENTITIES, collect all X/Y coords grouped by layer
  while (idx < pairs.length) {
    const [code, val] = pairs[idx];
    if (code === 0 && val === 'ENDSEC') break;

    if (code === 0) {
      let layer = '0';
      const xs = [], ys = [];
      idx++;

      while (idx < pairs.length && pairs[idx][0] !== 0) {
        const [c, v] = pairs[idx];
        if (c === 8) layer = v;
        // X-family group codes: 10–18 (covers LWPOLYLINE vertices, LINE endpoints, SPLINE knots, ARC/CIRCLE center)
        if (c >= 10 && c <= 18) xs.push(parseFloat(v));
        // Y-family group codes: 20–28
        if (c >= 20 && c <= 28) ys.push(parseFloat(v));
        idx++;
      }

      if (!SKIP.has(layer) && xs.length > 0 && ys.length > 0) {
        if (!layerBounds[layer]) layerBounds[layer] = { xs: [], ys: [] };
        layerBounds[layer].xs.push(...xs);
        layerBounds[layer].ys.push(...ys);
      }
      continue;
    }
    idx++;
  }

  // Convert each layer's coordinate cloud to a bounding-box block
  const result = [];
  for (const [layer, { xs, ys }] of Object.entries(layerBounds)) {
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    let w = (maxX - minX) * unitScale;
    let h = (maxY - minY) * unitScale;
    if (w < 0.5 || h < 0.5) continue;

    // Auto-scale fallback: if still suspiciously large (>500 cm), treat as mm
    if (unitScale === 1 && (w > 500 || h > 500)) { w *= 0.1; h *= 0.1; }

    result.push({
      name: cleanLayerName(layer),
      vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
    });
  }

  console.log('[DXF] parsed blocks:', result.map(r => `${r.name} (${r.vertices[2].x.toFixed(1)}×${r.vertices[2].y.toFixed(1)}cm)`));
  return result;
}

function parseDXFFile(text) {
  const parsed = parseDXFBlocks(text);
  return parsed.map(p => {
    const xs = p.vertices.map(v => v.x);
    const ys = p.vertices.map(v => v.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    const w = Math.max(1, Math.round((maxX - minX) * 10) / 10);
    const h = Math.max(1, Math.round((maxY - minY) * 10) / 10);
    const norm = p.vertices.map(v => ({ x: +(v.x - minX).toFixed(2), y: +(v.y - minY).toFixed(2) }));
    return { name: p.name, w, h, norm };
  });
}

function findFreePosition(existingBlocks, newW, newH, fabricW = 150) {
  const GAP = 2;
  if (existingBlocks.length === 0) return { x: GAP, y: GAP };

  // Candidate positions: top-left corners derived from existing block edges
  const candidates = [{ x: GAP, y: GAP }];
  for (const b of existingBlocks) {
    const bx = parseFloat(b.pos_x_cm) || 0;
    const by = parseFloat(b.pos_y_cm) || 0;
    const bw = parseFloat(b.block_width_cm) || 0;
    const bh = parseFloat(b.block_height_cm) || 0;
    candidates.push({ x: bx + bw + GAP, y: by });
    candidates.push({ x: bx,            y: by + bh + GAP });
    candidates.push({ x: bx + bw + GAP, y: by + bh + GAP });
  }

  const valid = candidates
    .filter(p => p.x >= GAP && p.y >= GAP && p.x + newW <= fabricW - GAP)
    .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

  for (const pos of valid) {
    const blocked = existingBlocks.some(b => {
      const bx = parseFloat(b.pos_x_cm) || 0;
      const by = parseFloat(b.pos_y_cm) || 0;
      const bw = parseFloat(b.block_width_cm) || 0;
      const bh = parseFloat(b.block_height_cm) || 0;
      return !(pos.x + newW + GAP <= bx || pos.x >= bx + bw + GAP ||
               pos.y + newH + GAP <= by || pos.y >= by + bh + GAP);
    });
    if (!blocked) return pos;
  }

  const maxBottom = Math.max(...existingBlocks.map(b =>
    (parseFloat(b.pos_y_cm) || 0) + (parseFloat(b.block_height_cm) || 0)
  ));
  return { x: GAP, y: maxBottom + GAP };
}

function blocksOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || ax >= bx + bw || ay + ah <= by || ay >= by + bh);
}

function resolvePosition(others, newW, newH, dropX, dropY, fabricW = 150) {
  const noOverlap = (x, y) => !others.some(b =>
    blocksOverlap(x, y, newW, newH,
      parseFloat(b.pos_x_cm) || 0, parseFloat(b.pos_y_cm) || 0,
      parseFloat(b.block_width_cm) || 0, parseFloat(b.block_height_cm) || 0)
  );

  if (noOverlap(dropX, dropY)) return { x: dropX, y: dropY };

  // For each colliding block, try pushing in each cardinal direction
  const candidates = [];
  for (const b of others) {
    const bx = parseFloat(b.pos_x_cm) || 0;
    const by = parseFloat(b.pos_y_cm) || 0;
    const bw = parseFloat(b.block_width_cm) || 0;
    const bh = parseFloat(b.block_height_cm) || 0;
    if (!blocksOverlap(dropX, dropY, newW, newH, bx, by, bw, bh)) continue;
    candidates.push({ x: bx - newW, y: dropY });  // push left of this block
    candidates.push({ x: bx + bw,   y: dropY });  // push right
    candidates.push({ x: dropX,     y: by - newH }); // push above
    candidates.push({ x: dropX,     y: by + bh  }); // push below
  }

  const best = candidates
    .filter(p => p.x >= 0 && p.y >= 0 && p.x + newW <= fabricW && noOverlap(p.x, p.y))
    .sort((a, b) => (a.x - dropX) ** 2 + (a.y - dropY) ** 2 - ((b.x - dropX) ** 2 + (b.y - dropY) ** 2));

  return best.length > 0 ? best[0] : findFreePosition(others, newW, newH, fabricW);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Ruler({ orientation, length, zoom, offset }) {
  const step    = rulerStep(zoom);
  const pxPerCm = PIXELS_PER_CM * zoom;
  const ticks   = [];
  const totalCm = Math.ceil(length / pxPerCm) + step * 2;

  for (let cm = 0; cm <= totalCm; cm += step) {
    const pos = cm * pxPerCm - offset;
    if (pos < -pxPerCm || pos > length + pxPerCm) continue;
    ticks.push({ pos, label: rulerLabel(cm, zoom), isMajor: cm % (step * 2) === 0 });
  }

  const isH = orientation === 'horizontal';

  return (
    <div style={{
      position: 'absolute',
      top: isH ? 0 : RULER_SIZE,
      left: isH ? RULER_SIZE : 0,
      width:  isH ? `calc(100% - ${RULER_SIZE}px)` : RULER_SIZE,
      height: isH ? RULER_SIZE : `calc(100% - ${RULER_SIZE}px)`,
      background: '#0f172a',
      borderBottom: isH ? '1px solid #1e293b' : 'none',
      borderRight:  isH ? 'none' : '1px solid #1e293b',
      overflow: 'hidden', userSelect: 'none', zIndex: 10, pointerEvents: 'none',
    }}>
      {ticks.map(({ pos, isMajor }, i) => (
        <div key={i} style={{
          position: 'absolute',
          [isH ? 'left' : 'top']: pos,
          [isH ? 'bottom' : 'right']: 0,
          [isH ? 'width' : 'height']: 1,
          [isH ? 'height' : 'width']: isMajor ? 14 : 8,
          background: isMajor ? '#94a3b8' : '#334155',
        }} />
      ))}
      {ticks.filter(t => t.label).map(({ pos, label }, i) => (
        <div key={`l${i}`} style={{
          position: 'absolute',
          [isH ? 'left' : 'top']: pos + 2,
          [isH ? 'top' : 'left']: 2,
          fontSize: 9, color: '#64748b', fontFamily: 'monospace',
          writingMode: isH ? 'horizontal-tb' : 'vertical-lr', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      ))}
    </div>
  );
}

function GrainlineIndicator({ alignment, width, height }) {
  const angle = { grainline: 90, crossgrain: 0, truebias: 45, none: null }[alignment];
  if (angle === null) return null;
  const color = GRAIN_COLORS[alignment];
  const cx = width / 2, cy = height / 2;
  const len = Math.min(width, height) * 0.35;
  const rad = (angle * Math.PI) / 180;
  const x1 = cx - len * Math.cos(rad), y1 = cy - len * Math.sin(rad);
  const x2 = cx + len * Math.cos(rad), y2 = cy + len * Math.sin(rad);
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
         viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray="4 2" />
      <polygon
        points={`${x2},${y2} ${x2 - 4 * Math.cos(rad - 0.4)},${y2 - 4 * Math.sin(rad - 0.4)} ${x2 - 4 * Math.cos(rad + 0.4)},${y2 - 4 * Math.sin(rad + 0.4)}`}
        fill={color} />
    </svg>
  );
}

function PatternBlock({ block, zoom, selected, onSelect, onDragEnd, onDelete, onGrainChange }) {
  const pxPerCm  = PIXELS_PER_CM * zoom;
  const dragStart = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localPos, setLocalPos] = useState({ x: block.pos_x_cm, y: block.pos_y_cm });

  useEffect(() => {
    setLocalPos({ x: block.pos_x_cm, y: block.pos_y_cm });
  }, [block.pos_x_cm, block.pos_y_cm]);

  const w = parseFloat(block.block_width_cm) * pxPerCm;
  const h = parseFloat(block.block_height_cm) * pxPerCm;

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(block.block_id);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: localPos.x, oy: localPos.y };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = (e.clientX - dragStart.current.mx) / pxPerCm;
      const dy = (e.clientY - dragStart.current.my) / pxPerCm;
      setLocalPos({ x: Math.max(0, dragStart.current.ox + dx), y: Math.max(0, dragStart.current.oy + dy) });
    };
    const onUp = () => { setDragging(false); onDragEnd(block.block_id, localPos.x, localPos.y); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const grainColor = GRAIN_COLORS[block.grain_alignment] || '#94a3b8';

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: localPos.x * pxPerCm, top: localPos.y * pxPerCm,
        width: w, height: h,
        border: `2px solid ${selected ? '#38bdf8' : grainColor}`,
        background: selected ? 'rgba(56,189,248,0.10)' : 'rgba(30,41,59,0.75)',
        borderRadius: 3,
        cursor: dragging ? 'grabbing' : 'grab',
        boxShadow: selected ? '0 0 0 3px rgba(56,189,248,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: dragging ? 'none' : 'box-shadow 0.15s',
        userSelect: 'none', overflow: 'hidden',
        zIndex: selected ? 20 : 10,
        transform: `rotate(${block.rotation_deg || 0}deg)`,
        transformOrigin: '0 0',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: 4, right: 4,
        fontSize: Math.max(8, Math.min(12, pxPerCm * 1.5)),
        color: '#e2e8f0', fontFamily: 'monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        pointerEvents: 'none', fontWeight: 600,
      }}>
        {block.block_name}
      </div>

      <GrainlineIndicator alignment={block.grain_alignment} width={w} height={h} />

      {selected && (
        <div style={{ position: 'absolute', bottom: 3, left: 3, display: 'flex', gap: 3 }}>
          {['grainline', 'crossgrain', 'truebias', 'none'].map(g => (
            <button key={g} onClick={(e) => { e.stopPropagation(); onGrainChange(block.block_id, g); }}
              title={prettyGrain(g)}
              style={{
                width: 18, height: 18, padding: 0, border: 'none', borderRadius: 3,
                background: block.grain_alignment === g ? GRAIN_COLORS[g] : '#1e293b',
                color: block.grain_alignment === g ? '#fff' : '#64748b',
                cursor: 'pointer', fontSize: 10,
              }}>
              {GRAIN_ICONS[g]}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(block.block_id); }}
          style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, padding: 0, border: 'none', borderRadius: 2,
            background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
      )}
    </div>
  );
}

function AddBlockModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    block_name: '', width: '20', height: '30', grain_alignment: 'grainline',
    waist: '', chest: '', hip: '', shoulder: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.block_name.trim()) return;
    const w = parseFloat(form.width) || 20;
    const h = parseFloat(form.height) || 30;
    onAdd({
      block_name:      form.block_name,
      block_vertices:  measurementsToBlock(form),
      block_width_cm:  w,
      block_height_cm: h,
      pos_x_cm: 5, pos_y_cm: 5, rotation_deg: 0,
      grain_alignment: form.grain_alignment,
      measurements: { waist: form.waist, chest: form.chest, hip: form.hip, shoulder: form.shoulder, notes: form.notes },
    });
    onClose();
  };

  const inputStyle = {
    width: '100%', background: '#0f172a', border: '1px solid #1e293b',
    borderRadius: 6, padding: '7px 10px', color: '#e2e8f0',
    fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, color: '#64748b', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
          padding: 28, width: 460, color: '#e2e8f0',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>New Pattern Block</h3>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Block Name *</label>
            <input style={inputStyle} value={form.block_name} onChange={e => set('block_name', e.target.value)} placeholder="e.g. Front Bodice" required />
          </div>
          <div>
            <label style={labelStyle}>Width (cm)</label>
            <input style={inputStyle} type="number" value={form.width} onChange={e => set('width', e.target.value)} min="1" step="0.5" />
          </div>
          <div>
            <label style={labelStyle}>Height (cm)</label>
            <input style={inputStyle} type="number" value={form.height} onChange={e => set('height', e.target.value)} min="1" step="0.5" />
          </div>
          <div>
            <label style={labelStyle}>Waist (cm)</label>
            <input style={inputStyle} type="number" value={form.waist} onChange={e => set('waist', e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label style={labelStyle}>Chest (cm)</label>
            <input style={inputStyle} type="number" value={form.chest} onChange={e => set('chest', e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label style={labelStyle}>Hip (cm)</label>
            <input style={inputStyle} type="number" value={form.hip} onChange={e => set('hip', e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label style={labelStyle}>Shoulder (cm)</label>
            <input style={inputStyle} type="number" value={form.shoulder} onChange={e => set('shoulder', e.target.value)} placeholder="optional" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Grain Alignment</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['grainline', 'crossgrain', 'truebias', 'none'].map(g => (
                <button type="button" key={g} onClick={() => set('grain_alignment', g)}
                  style={{
                    flex: 1, padding: '7px 4px',
                    border: `1.5px solid ${form.grain_alignment === g ? GRAIN_COLORS[g] : '#334155'}`,
                    borderRadius: 6,
                    background: form.grain_alignment === g ? `${GRAIN_COLORS[g]}22` : '#0f172a',
                    color: form.grain_alignment === g ? GRAIN_COLORS[g] : '#64748b',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  }}>
                  {GRAIN_ICONS[g]} {prettyGrain(g)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Notes</label>
            <input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="seam allowance, notches…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '9px 20px', border: '1px solid #334155', borderRadius: 7, background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button type="submit"
            style={{ padding: '9px 24px', border: 'none', borderRadius: 7, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            Add Block
          </button>
        </div>
      </form>
    </div>
  );
}

function ImportReviewModal({ items, fileName, onClose, onConfirm }) {
  const [grains, setGrains] = useState(() => items.map(() => 'grainline'));
  const setGrain = (i, g) => setGrains(prev => prev.map((v, idx) => idx === i ? g : v));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', color: '#e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Import DXF</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {fileName && <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, fontFamily: 'monospace' }}>{fileName}</div>}
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
          Set grain alignment for each block before importing.
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{item.name}</span>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{item.w} × {item.h} cm</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['grainline', 'crossgrain', 'truebias', 'none'].map(g => (
                  <button key={g} type="button" onClick={() => setGrain(i, g)}
                    style={{
                      flex: 1, padding: '6px 4px',
                      border: `1.5px solid ${grains[i] === g ? GRAIN_COLORS[g] : '#334155'}`,
                      borderRadius: 6,
                      background: grains[i] === g ? `${GRAIN_COLORS[g]}22` : '#0f172a',
                      color: grains[i] === g ? GRAIN_COLORS[g] : '#64748b',
                      cursor: 'pointer', fontSize: 10, fontWeight: 600,
                    }}>
                    {GRAIN_ICONS[g]} {prettyGrain(g)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #334155', borderRadius: 7, background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(items.map((item, i) => ({ ...item, grain_alignment: grains[i] })))}
            style={{ padding: '9px 24px', border: 'none', borderRadius: 7, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            Import {items.length} Block{items.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function FabricSettingsPanel({ fabric, onUpdate }) {
  const inputStyle = {
    background: '#0f172a', border: '1px solid #1e293b', borderRadius: 5,
    padding: '5px 8px', color: '#e2e8f0', fontSize: 12, width: 72,
    fontFamily: 'monospace', outline: 'none',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fabric</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
        W
        <input type="number" style={inputStyle} value={fabric.fabric_width_cm} min="10" max="500" step="5"
          onChange={e => onUpdate({ fabric_width_cm: parseFloat(e.target.value) })} />
        cm
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
        L
        <input type="number" style={inputStyle} value={fabric.fabric_length_cm} min="10" max="2000" step="10"
          onChange={e => onUpdate({ fabric_length_cm: parseFloat(e.target.value) })} />
        cm
      </label>
    </div>
  );
}

function ToolBtn({ icon, label, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', border: `1px solid ${primary ? '#0ea5e9' : '#1e293b'}`,
        borderRadius: 6,
        background: primary ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : '#0f172a',
        color: disabled ? '#334155' : primary ? '#fff' : '#94a3b8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: primary ? 700 : 500, whiteSpace: 'nowrap',
      }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label && <span style={{ fontSize: 11 }}>{label}</span>}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function GarmentPlanningPage() {
  const { id } = useParams();
  const COSTUME_ID = parseInt(id);

  const [layout, setLayout]         = useState(null);
  const [blocks, setBlocks]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const [zoom, setZoom]             = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [showModal, setShowModal]   = useState(false);
  const [status, setStatus]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [measurements, setMeasurements]           = useState(null);
  const [editingMeasurements, setEditingMeasurements] = useState(false);
  const [measurementForm, setMeasurementForm]     = useState({});
  const [dragOver, setDragOver]                   = useState(false);
  const [pendingImport, setPendingImport]         = useState(null);

  const workspaceRef    = useRef(null);
  const isPanning       = useRef(false);
  const panStart        = useRef(null);
  const creatingLayout  = useRef(false);
  const importInputRef  = useRef(null);

  const pxPerCm = PIXELS_PER_CM * zoom;

  // load or create layout
  useEffect(() => {
    creatingLayout.current = false;
    (async () => {
      try {
        const res = await authFetch(`${API}/layouts/${COSTUME_ID}`);
        const data = await res.json();
        if (data.length > 0) {
          // backend returns newest first — use data[0]
          setLayout(data[0]);
          loadBlocks(data[0].layout_id);
        } else {
          if (creatingLayout.current) return;
          creatingLayout.current = true;
          const r2 = await authFetch(`${API}/layout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout_costume_id: COSTUME_ID, layout_name: 'Layout 1', fabric_width_cm: 150, fabric_length_cm: 300 }),
          });
          const newLayout = await r2.json();
          setLayout(newLayout);
        }
      } catch {
        setLayout({ layout_id: null, layout_name: 'Demo Layout', fabric_width_cm: 150, fabric_length_cm: 300, fabric_grain: 'grainline' });
        setStatus('⚡ Offline demo mode — changes won\'t be saved');
      }
    })();
  }, [COSTUME_ID]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${BASE_API}/api/projects/${COSTUME_ID}`);
        const data = await res.json();
        setMeasurements(data);
        const form = {};
        MEASUREMENT_FIELDS.forEach(([, key]) => { form[key] = data[key] ?? ''; });
        setMeasurementForm(form);
      } catch { /* silently skip if unavailable */ }
    })();
  }, [COSTUME_ID]);

  const openImportReview = async (file) => {
    if (!file) return;
    setStatus(`Parsing ${file.name}…`);
    try {
      const items = parseDXFFile(await file.text());
      if (items.length === 0) {
        setStatus('No pattern blocks found — check the DXF has layered entities');
        console.warn('[DXF] zero blocks found in', file.name);
        return;
      }
      setStatus(`Found ${items.length} block${items.length !== 1 ? 's' : ''} — review below`);
      setPendingImport({ items, fileName: file.name });
    } catch (err) {
      console.error('[DXF] parse error', err);
      setStatus('Failed to parse DXF file');
    }
  };

  const handleImportDXF = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    openImportReview(file);
  };

  const handleDropDXF = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.name.toLowerCase().endsWith('.dxf'));
    if (!file) { setStatus('Drop a .dxf file to import'); return; }
    openImportReview(file);
  };

  const handleConfirmImport = async (itemsWithGrain) => {
    setPendingImport(null);
    const fabricW = parseFloat(layout?.fabric_width_cm) || 150;
    const placed = [...blocks];
    const added = [];
    try {
      for (const item of itemsWithGrain) {
        const pos = findFreePosition(placed, item.w, item.h, fabricW);
        const payload = {
          block_name: item.name, block_vertices: item.norm,
          block_width_cm: item.w, block_height_cm: item.h,
          pos_x_cm: pos.x, pos_y_cm: pos.y,
          rotation_deg: 0, grain_alignment: item.grain_alignment, measurements: {},
          block_layout_id: layout?.layout_id || 0,
        };
        if (layout?.layout_id) {
          const res = await authFetch(`${API}/block`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const saved = await res.json();
          placed.push(saved); added.push(saved);
        } else {
          const local = { ...payload, block_id: Date.now() + added.length };
          placed.push(local); added.push(local);
        }
      }
      setBlocks(prev => [...prev, ...added]);
      setStatus(`✓ Imported ${added.length} block${added.length !== 1 ? 's' : ''}`);
    } catch { setStatus('Import failed'); }
  };

  const saveMeasurements = async () => {
    try {
      await authFetch(`${BASE_API}/api/projects/${COSTUME_ID}/measurements`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurementForm),
      });
      setMeasurements(prev => ({ ...prev, ...measurementForm }));
      setEditingMeasurements(false);
      setStatus('✓ Measurements saved');
    } catch { setStatus('Failed to save measurements'); }
  };

  const loadBlocks = async (layoutId) => {
    const res = await authFetch(`${API}/layout/${layoutId}/blocks`);
    const data = await res.json();
    setBlocks(data);
  };

  const updateFabric = async (changes) => {
    const updated = { ...layout, ...changes };
    setLayout(updated);
    if (!layout.layout_id) return;
    await authFetch(`${API}/layout/${layout.layout_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  };

  const handleAddBlock = async (blockData) => {
    if (!layout) return;
    const pos = findFreePosition(blocks, parseFloat(blockData.block_width_cm), parseFloat(blockData.block_height_cm), parseFloat(layout.fabric_width_cm));
    const payload = { ...blockData, block_layout_id: layout.layout_id || 0, pos_x_cm: pos.x, pos_y_cm: pos.y };
    if (layout.layout_id) {
      const res = await authFetch(`${API}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();
      setBlocks(prev => [...prev, saved]);
    } else {
      setBlocks(prev => [...prev, { ...payload, block_id: Date.now() }]);
    }
  };

  const handleDragEnd = useCallback(async (id, x, y) => {
    const block = blocks.find(b => b.block_id === id);
    if (!block) return;
    const others = blocks.filter(b => b.block_id !== id);
    const fabricW = parseFloat(layout?.fabric_width_cm) || 150;
    const { x: fx, y: fy } = resolvePosition(
      others,
      parseFloat(block.block_width_cm),
      parseFloat(block.block_height_cm),
      x, y, fabricW
    );
    setBlocks(prev => prev.map(b => b.block_id === id ? { ...b, pos_x_cm: fx, pos_y_cm: fy } : b));
    if (!layout?.layout_id) return;
    await authFetch(`${API}/block/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...block, pos_x_cm: fx, pos_y_cm: fy }),
    });
  }, [blocks, layout]);

  const handleDelete = async (id) => {
    setBlocks(prev => prev.filter(b => b.block_id !== id));
    setSelected(null);
    if (layout?.layout_id) await authFetch(`${API}/block/${id}`, { method: 'DELETE' });
  };

  const handleGrainChange = async (id, grain) => {
    setBlocks(prev => prev.map(b => b.block_id === id ? { ...b, grain_alignment: grain } : b));
    if (!layout?.layout_id) return;
    const block = blocks.find(b => b.block_id === id);
    if (!block) return;
    await authFetch(`${API}/block/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...block, grain_alignment: grain }),
    });
  };

  const handleOptimize = async () => {
    if (!layout?.layout_id) {
      const fw = parseFloat(layout.fabric_width_cm);
      let x = 2, y = 2, rowH = 0;
      const placed = blocks.map(b => {
        const bw = parseFloat(b.block_width_cm) + 2;
        const bh = parseFloat(b.block_height_cm);
        if (x + bw > fw) { x = 2; y += rowH + 2; rowH = 0; }
        const result = { ...b, pos_x_cm: x, pos_y_cm: y };
        x += bw; rowH = Math.max(rowH, bh);
        return result;
      });
      setBlocks(placed);
      setStatus('✓ Optimized locally');
      return;
    }
    setLoading(true); setStatus('Optimizing…');
    try {
      const res = await authFetch(`${API}/layout/${layout.layout_id}/optimize`, { method: 'POST' });
      const data = await res.json();
      if (data.blocks) setBlocks(data.blocks);
      setStatus('✓ Optimized!');
    } catch { setStatus('Optimization failed'); }
    finally { setLoading(false); }
  };

  const handleExportDXF = async () => {
    if (!layout?.layout_id) {
      // offline fallback: build client-side DXF
      const fw = parseFloat(layout.fabric_width_cm), fl = parseFloat(layout.fabric_length_cm);
      const L = (x1,y1,x2,y2,lyr='0') => `  0\nLINE\n  8\n${lyr}\n 10\n${x1.toFixed(3)}\n 20\n${y1.toFixed(3)}\n 30\n0\n 11\n${x2.toFixed(3)}\n 21\n${y2.toFixed(3)}\n 31\n0`;
      const T = (x,y,s,lyr='TEXT') => `  0\nTEXT\n  8\n${lyr}\n 10\n${x.toFixed(3)}\n 20\n${y.toFixed(3)}\n 30\n0\n 40\n2\n  1\n${s}`;
      const lines = ['  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1009\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES'];
      lines.push(L(0,0,fw,0,'FABRIC'),L(fw,0,fw,fl,'FABRIC'),L(fw,fl,0,fl,'FABRIC'),L(0,fl,0,0,'FABRIC'));
      lines.push(L(fw/2,5,fw/2,fl-5,'GRAINLINE'),T(fw/2+1,fl/2,'GRAIN','GRAINLINE'));
      for (const b of blocks) {
        const px=parseFloat(b.pos_x_cm),py=parseFloat(b.pos_y_cm),rot=(parseFloat(b.rotation_deg||0)*Math.PI/180);
        const lyr=`BLOCK_${b.block_name.replace(/\s+/g,'_').toUpperCase()}`;
        const v=b.block_vertices||rectVertices(parseFloat(b.block_width_cm),parseFloat(b.block_height_cm));
        for(let i=0;i<v.length;i++){const a=v[i],bv=v[(i+1)%v.length];
          lines.push(L(px+a.x*Math.cos(rot)-a.y*Math.sin(rot),py+a.x*Math.sin(rot)+a.y*Math.cos(rot),px+bv.x*Math.cos(rot)-bv.y*Math.sin(rot),py+bv.x*Math.sin(rot)+bv.y*Math.cos(rot),lyr));}
        lines.push(T(px+1,py+1,b.block_name,lyr));
      }
      lines.push('  0\nENDSEC\n  0\nEOF');
      const blob = new Blob([lines.join('\n')], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${layout.layout_name || 'layout'}.dxf`; a.click(); URL.revokeObjectURL(url);
      return;
    }
    try {
      const res = await authFetch(`${API}/layout/${layout.layout_id}/export/dxf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `layout_${layout.layout_id}.dxf`; a.click(); URL.revokeObjectURL(url);
    } catch { setStatus('Export failed'); }
  };

  // zoom / pan
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setZoom(z => Math.max(0.1, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    } else {
      setSelected(null);
    }
  };
  const handleMouseMove = (e) => {
    if (!isPanning.current) return;
    setPan({ x: panStart.current.px + e.clientX - panStart.current.mx, y: panStart.current.py + e.clientY - panStart.current.my });
  };
  const handleMouseUp = () => { isPanning.current = false; };

  const fabricW = layout ? parseFloat(layout.fabric_width_cm) * pxPerCm : 0;
  const fabricH = layout ? parseFloat(layout.fabric_length_cm) * pxPerCm : 0;

  const gridLines = useMemo(() => {
    if (!layout) return [];
    const lines = [];
    const stepPx = GRID_CM * pxPerCm;
    for (let x = 0; x <= fabricW; x += stepPx) lines.push({ type: 'v', pos: x });
    for (let y = 0; y <= fabricH; y += stepPx) lines.push({ type: 'h', pos: y });
    return lines;
  }, [fabricW, fabricH, pxPerCm, layout]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#020818', color: '#e2e8f0' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8', marginRight: 8 }}>✂ Garment Planner</span>
        <div style={{ width: 1, height: 20, background: '#1e293b' }} />
        {layout && <FabricSettingsPanel fabric={layout} onUpdate={updateFabric} />}
        <div style={{ width: 1, height: 20, background: '#1e293b' }} />
        <ToolBtn icon="＋" label="Add Pattern Block" primary onClick={() => setShowModal(true)} />
        <ToolBtn icon="⚡" label="Optimize Fit" onClick={handleOptimize} disabled={loading} />
        <ToolBtn icon="⬆" label="Import DXF" onClick={() => importInputRef.current?.click()} />
        <input ref={importInputRef} type="file" accept=".dxf" style={{ display: 'none' }} onChange={handleImportDXF} />
        <ToolBtn icon="⬇" label="Export DXF" onClick={handleExportDXF} />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ToolBtn icon="−" label="" onClick={() => setZoom(z => Math.max(0.1, z / 1.25))} />
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', minWidth: 44, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <ToolBtn icon="＋" label="" onClick={() => setZoom(z => Math.min(5, z * 1.25))} />
          <ToolBtn icon="⌂" label="Reset view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} />
        </div>
        {status && <span style={{ fontSize: 11, color: '#22d3ee', marginLeft: 8, opacity: 0.8 }}>{status}</span>}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '5px 16px', background: '#0a1628', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        {Object.entries(GRAIN_COLORS).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
            <span style={{ display: 'inline-block', width: 20, height: 2, background: c, borderRadius: 1 }} />
            {prettyGrain(k)}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
          Alt+drag to pan · Ctrl+scroll to zoom · Scroll to pan
        </span>
      </div>

      {/* Workspace + Measurements panel */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

      {/* Workspace */}
      <div
        ref={workspaceRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
        onDrop={handleDropDXF}
        style={{ position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0, background: '#020818', cursor: 'default' }}
      >
        {/* Drop overlay */}
        {dragOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(14,165,233,0.1)',
            border: '2px dashed #38bdf8',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>Drop DXF file to import</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Blocks will be placed automatically</div>
          </div>
        )}
        {layout && (
          <>
            <Ruler orientation="horizontal" length={workspaceRef.current?.clientWidth || 800} zoom={zoom} offset={-pan.x - RULER_SIZE} />
            <Ruler orientation="vertical"   length={workspaceRef.current?.clientHeight || 600} zoom={zoom} offset={-pan.y - RULER_SIZE} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: RULER_SIZE, height: RULER_SIZE, background: '#0f172a', zIndex: 11, borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }} />

            <div style={{ position: 'absolute', top: RULER_SIZE, left: RULER_SIZE, transform: `translate(${pan.x}px, ${pan.y}px)`, transformOrigin: '0 0', overflow: 'visible' }}>
              {/* Dot grid */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '200%', pointerEvents: 'none' }}>
                <defs>
                  <pattern id="dots" x="0" y="0" width={GRID_CM * pxPerCm} height={GRID_CM * pxPerCm} patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.8" fill="#1e293b" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>

              {/* Fabric rectangle */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: fabricW, height: fabricH, background: 'rgba(248,250,252,0.03)', border: '1.5px solid #334155', borderRadius: 2 }}>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                     viewBox={`0 0 ${fabricW} ${fabricH}`} preserveAspectRatio="none">
                  {gridLines.filter(l => l.type === 'v').map((l, i) => (
                    <line key={`v${i}`} x1={l.pos} y1={0} x2={l.pos} y2={fabricH} stroke="#1e293b" strokeWidth={0.5} />
                  ))}
                  {gridLines.filter(l => l.type === 'h').map((l, i) => (
                    <line key={`h${i}`} x1={0} y1={l.pos} x2={fabricW} y2={l.pos} stroke="#1e293b" strokeWidth={0.5} />
                  ))}
                  <line x1={fabricW/2} y1={8} x2={fabricW/2} y2={fabricH-8} stroke="#22d3ee" strokeWidth={1} strokeDasharray="8 4" opacity={0.4} />
                  <polygon points={`${fabricW/2},10 ${fabricW/2-5},22 ${fabricW/2+5},22`} fill="#22d3ee" opacity={0.4} />
                  <text x={fabricW/2+5} y={fabricH/2} fill="#22d3ee" fontSize={Math.max(8, 12/zoom)} opacity={0.4} style={{ fontFamily: 'monospace' }}>GRAIN ↑</text>
                  <line x1={8} y1={fabricH/2} x2={fabricW-8} y2={fabricH/2} stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="6 6" opacity={0.25} />
                  <line x1={0} y1={0} x2={Math.min(fabricW,fabricH)} y2={Math.min(fabricW,fabricH)} stroke="#a78bfa" strokeWidth={0.5} strokeDasharray="4 8" opacity={0.2} />
                </svg>

                {blocks.map(block => (
                  <PatternBlock
                    key={block.block_id}
                    block={block}
                    zoom={zoom}
                    selected={selected === block.block_id}
                    onSelect={setSelected}
                    onDragEnd={handleDragEnd}
                    onDelete={handleDelete}
                    onGrainChange={handleGrainChange}
                  />
                ))}
              </div>

              <div style={{ position: 'absolute', top: fabricH + 6, left: fabricW/2 - 40, fontSize: 11, color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                ←{layout.fabric_width_cm}cm→
              </div>
              <div style={{ position: 'absolute', top: fabricH/2 - 20, left: fabricW + 6, fontSize: 11, color: '#64748b', fontFamily: 'monospace', writingMode: 'vertical-lr' }}>
                ↕{layout.fabric_length_cm}cm
              </div>
            </div>
          </>
        )}

        {!layout && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', fontSize: 14 }}>
            Loading layout…
          </div>
        )}
      </div>

      {/* Measurements panel */}
      <div style={{
        width: 172, flexShrink: 0,
        background: '#0f172a', borderLeft: '1px solid #1e293b',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Measurements
          </span>
          {!editingMeasurements ? (
            <button
              onClick={() => {
                const form = {};
                MEASUREMENT_FIELDS.forEach(([, key]) => { form[key] = measurements?.[key] ?? ''; });
                setMeasurementForm(form);
                setEditingMeasurements(true);
              }}
              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}
            >
              Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  const form = {};
                  MEASUREMENT_FIELDS.forEach(([, key]) => { form[key] = measurements?.[key] ?? ''; });
                  setMeasurementForm(form);
                  setEditingMeasurements(false);
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: 0 }}
              >
                Cancel
              </button>
              <button
                onClick={saveMeasurements}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!measurements && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 8 }}>Loading…</div>
          )}

          {measurements && MEASUREMENT_FIELDS.map(([label, key]) => (
            editingMeasurements ? (
              <div key={key}>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={measurementForm[key] ?? ''}
                    onChange={(e) => setMeasurementForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      flex: 1, background: '#020818', border: '1px solid #1e293b',
                      borderRadius: 4, padding: '4px 6px', color: '#e2e8f0',
                      fontSize: 12, fontFamily: 'monospace', outline: 'none', width: 0,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#1e293b'; }}
                  />
                  <span style={{ fontSize: 10, color: '#475569' }}>cm</span>
                </div>
              </div>
            ) : (
              (measurements[key] != null && measurements[key] !== 0) ? (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {measurements[key]}<span style={{ fontSize: 9, color: '#475569', marginLeft: 2 }}>cm</span>
                  </span>
                </div>
              ) : null
            )
          ))}

          {measurements && !editingMeasurements && MEASUREMENT_FIELDS.every(([, key]) => !measurements[key]) && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
              No measurements yet.<br />
              <button
                onClick={() => setEditingMeasurements(true)}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 4 }}
              >
                Add them here
              </button>
            </div>
          )}
        </div>
      </div>

      </div>{/* end workspace row */}

      {showModal && <AddBlockModal onClose={() => setShowModal(false)} onAdd={handleAddBlock} />}
      {pendingImport && (
        <ImportReviewModal
          items={pendingImport.items}
          fileName={pendingImport.fileName}
          onClose={() => setPendingImport(null)}
          onConfirm={handleConfirmImport}
        />
      )}
    </div>
  );
}
