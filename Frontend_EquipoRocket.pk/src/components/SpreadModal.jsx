import { useState } from 'react';

export default function SpreadModal({ open, onClose, onCreate, defaultNature = '', defaultEv = '0/0/0/0/0/0' }) {
  const [nature, setNature] = useState(defaultNature);
  const [evString, setEvString] = useState(defaultEv);

  if (!open) return null;

  const handleCreate = () => {
    // basic validation: ensure 6 parts
    const parts = String(evString).split('/').map(p => Number(p) || 0);
    if (parts.length < 6) return alert('EVs deben tener 6 valores separados por /.');
    onCreate({ nature, ev: parts.slice(0,6).join('/') });
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60 }}>
      <div style={{ width:520, background:'#fff', borderRadius:12, padding:20 }}>
        <h3 style={{ margin:0, marginBottom:12 }}>Crear spread</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <label style={{ fontSize:12, fontWeight:700 }}>Naturaleza</label>
          <input className="pk-input" value={nature} onChange={e => setNature(e.target.value)} placeholder="Ej: Adamant" />
          <label style={{ fontSize:12, fontWeight:700 }}>EVs (hp/atk/def/spa/spd/spe)</label>
          <input className="pk-input" value={evString} onChange={e => setEvString(e.target.value)} placeholder="0/252/0/0/4/252" />
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button className="pk-btn pk-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="pk-btn pk-btn-primary" onClick={handleCreate}>Crear</button>
        </div>
      </div>
    </div>
  );
}
