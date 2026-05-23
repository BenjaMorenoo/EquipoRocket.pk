import React from 'react';
import { FaBomb } from 'react-icons/fa';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 28, maxWidth: 920, margin: '40px auto', background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}><FaBomb style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18 }}>Ha ocurrido un error en la aplicación</div>
              <div style={{ color: 'var(--color-pk-muted)', marginTop: 6 }}>Revisa la consola para más detalles. Puedes recargar la página.</div>
            </div>
          </div>
          <details style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>
            <summary style={{ cursor: 'pointer' }}>Detalles del error</summary>
            <div style={{ marginTop: 8, color: 'var(--color-pk-subtle)' }}>{String(this.state.error && this.state.error.toString())}</div>
            <div style={{ marginTop: 8, color: 'var(--color-pk-subtle)' }}>{this.state.info?.componentStack}</div>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
