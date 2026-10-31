import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    console.log('🛡️ ErrorBoundary constructor called');
  }

  static getDerivedStateFromError(error) {
    console.error('🚨 [ErrorBoundary] getDerivedStateFromError triggered with:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Puedes enviar logs a un endpoint aquí si lo deseas
    console.error('🚨 [ErrorBoundary] Caught error:', error, info);
    console.error('🚨 [ErrorBoundary] Error stack:', error.stack);
    console.error('🚨 [ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const detail = this.state.error && (this.state.error.message || String(this.state.error));
      return (
        <div style={{padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif'}}>
          <h2>Ocurrió un error cargando la interfaz</h2>
          <p>Recargá la página. Si sigue igual, cerrá sesión y volvé a entrar.</p>
          {detail ? (
            <p style={{margin: '16px auto', maxWidth: 640, color: '#7f1d1d', fontSize: 14, wordBreak: 'break-word'}}>
              {detail}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => { window.location.href = window.location.origin + window.location.pathname; }}
            style={{padding: '8px 16px', cursor: 'pointer'}}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
