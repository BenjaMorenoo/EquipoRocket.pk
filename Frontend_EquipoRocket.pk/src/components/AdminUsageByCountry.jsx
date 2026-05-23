import { useEffect, useState } from 'react';
import { getTypesByCountry, getUsersByAge, getUsersAgeBuckets } from '../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#ef4444', '#f59e0b', '#7c3aed', '#06b6d4', '#f97316', '#10b981'];

export default function AdminUsageByCountry() {
  const [typesData, setTypesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState(25);
  const [ageResult, setAgeResult] = useState([]);
  const [ageBuckets, setAgeBuckets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [res, buckets] = await Promise.all([getTypesByCountry(), getUsersAgeBuckets()]);
        if (!mounted) return;
        setTypesData(res?.data || []);
        setAgeBuckets(buckets?.data || []);
      } catch (e) {
        console.error('getTypesByCountry', e.message || e);
        setError(e.message || 'Error cargando tipos');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleFetchAge = async () => {
    setError('');
    try {
      const res = await getUsersByAge(age);
      setAgeResult(res?.data || []);
    } catch (e) {
      console.error('getUsersByAge', e.message || e);
      setError(e.message || 'Error consultando usuarios por edad');
    }
  };

  // transform typesData into grouped by country
  const byCountry = {};
  for (const r of typesData) {
    const cname = r.country || 'Sin país';
    if (!byCountry[cname]) byCountry[cname] = [];
    byCountry[cname].push({ type: r.type, uses: Number(r.uses || 0) });
  }

  // prepare buckets summary (sum users across countries)
  const bucketsSummary = {};
  for (const b of ageBuckets) {
    const key = b.bucket || '—';
    bucketsSummary[key] = (bucketsSummary[key] || 0) + Number(b.users || 0);
  }
  const bucketsChartData = Object.entries(bucketsSummary).map(([bucket, users]) => ({ bucket, users }));

  const [selectedBucket, setSelectedBucket] = useState(null);
  const countriesForSelected = ageBuckets.filter(b => b.bucket === selectedBucket).sort((a,b)=>b.users-a.users);

  // COUNTRY selector + single pie + country comparison for top type
  const countriesList = Object.keys(byCountry).sort((a,b)=>a.localeCompare(b));
  const [selectedCountry, setSelectedCountry] = useState(null);

  // set default selected country when data loads
  useEffect(() => {
    if (!selectedCountry && countriesList.length) setSelectedCountry(countriesList[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesData]);

  const selectedTypes = selectedCountry ? (byCountry[selectedCountry] || []) : [];
  selectedTypes.sort((a,b)=>b.uses - a.uses);
  const pieData = selectedTypes.map(t => ({ name: t.type, value: t.uses }));
  const topType = selectedTypes[0]?.type || null;

  const countryComparisonData = Object.entries(byCountry).map(([country, types]) => {
    const found = types.find(tt => tt.type === topType);
    return { country, uses: Number(found?.uses || 0) };
  }).sort((a,b)=>b.uses - a.uses).slice(0, 20);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="pk-card" style={{ padding: 12 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Tipos más usados por país</h3>
        {loading && <div>Cargando...</div>}
        {error && <div style={{ color: '#ef4444' }}>{error}</div>}
        {!loading && !error && (
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.keys(byCountry).length === 0 ? (
              <div>No hay datos.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontWeight: 700, fontSize: 13 }}>Seleccionar país:</label>
                  <select value={selectedCountry || ''} onChange={e => setSelectedCountry(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--color-pk-border)' }}>
                    {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 260 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedCountry}</div>
                    <div style={{ width: 220, height: 160 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={64} label>
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {selectedTypes.slice(0,6).map((t,i) => (
                        <div key={t.type} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 12, height: 12, background: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: 3 }} />
                          <div style={{ fontSize: 13 }}>{t.type} <span style={{ color: 'var(--color-pk-muted)', marginLeft: 8 }}>({t.uses})</span></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 320 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Comparación por países — tipo: {topType || '—'}</div>
                    <div style={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer>
                        <BarChart data={countryComparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="country" type="category" width={140} />
                          <Tooltip />
                          <Bar dataKey="uses" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="pk-card" style={{ padding: 12 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Distribución por rangos de edad</h3>
        {bucketsChartData.length === 0 ? (
          <div style={{ color: 'var(--color-pk-muted)' }}>No hay datos de edad.</div>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={bucketsChartData} onClick={(e)=>{ if (e && e.activeLabel) setSelectedBucket(e.activeLabel); }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#2563eb" name="Usuarios" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', marginTop: 8 }}>Haga clic en una barra para ver distribución por país.</div>
          </div>
        )}

        {selectedBucket && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '6px 0' }}>Países con usuarios en {selectedBucket}</h4>
            {countriesForSelected.length === 0 ? (
              <div>No hay países con datos en este rango.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>País</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Usuarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countriesForSelected.map(r => (
                      <tr key={`${r.country || 'c'}-${r.region || 'r'}`}>
                        <td style={{ padding: '8px' }}>{r.country || '—'}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{r.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <button className="pk-btn" onClick={() => setSelectedBucket(null)}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
