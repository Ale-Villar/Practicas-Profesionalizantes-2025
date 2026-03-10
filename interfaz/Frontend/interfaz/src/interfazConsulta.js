import React, { useState } from 'react';
import api, {
  getCurrentUserData,
  getPurchaseHistory,
  getPendingPurchases,
  getIngredients,
  getIngredientsWithSuggestedUnit,
  getLossRecords,
  getRecipe,
} from '../services/api';

const ENDPOINTS = [
  { id: 'currentUser', label: 'GET /users/me' },
  { id: 'purchaseHistory', label: 'GET /purchases/history' },
  { id: 'pendingPurchases', label: 'GET /purchases/pending-approval' },
  { id: 'ingredients', label: 'GET /products/?is_ingredient=true' },
  { id: 'suggestedUnits', label: 'GET /ingredients/suggested-units' },
  { id: 'lossRecords', label: 'GET /loss-records' },
  { id: 'recipe', label: 'GET /recipe-ingredients/?product_id={id}' },
  { id: 'raw', label: 'Custom (raw path, e.g. /orders/?status=pendiente)' },
];

export default function InterfazConsulta() {
  const [endpoint, setEndpoint] = useState('currentUser');
  const [productId, setProductId] = useState('');
  const [rawPath, setRawPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runQuery = async (e) => {
    e && e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      let res;
      switch (endpoint) {
        case 'currentUser':
          res = await getCurrentUserData();
          setResult(res);
          break;
        case 'purchaseHistory':
          res = await getPurchaseHistory();
          setResult(res.data ?? res);
          break;
        case 'pendingPurchases':
          res = await getPendingPurchases();
          setResult(res.data ?? res);
          break;
        case 'ingredients':
          res = await getIngredients();
          setResult(res.data ?? res);
          break;
        case 'suggestedUnits':
          res = await getIngredientsWithSuggestedUnit();
          setResult(res.data ?? res);
          break;
        case 'lossRecords':
          res = await getLossRecords();
          setResult(res.data ?? res);
          break;
        case 'recipe':
          if (!productId) throw new Error('product_id required for recipe query');
          res = await getRecipe(productId);
          setResult(res.data ?? res);
          break;
        case 'raw':
          if (!rawPath) throw new Error('Provide a raw path (relative to /api)');
          // Allow both absolute and relative paths; axios instance has baseURL
          const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
          res = await api.get(path);
          setResult(res.data ?? res);
          break;
        default:
          throw new Error('Endpoint not supported');
      }
    } catch (err) {
      setError(err?.response?.data || err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResult(null);
    setError('');
  };

  return (
    <div style={{ padding: 12, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h3>Interfaz Consulta</h3>
      <form onSubmit={runQuery} style={{ display: 'grid', gap: 8, maxWidth: 820 }}>
        <label>
          Endpoint
          <select value={endpoint} onChange={(e) => setEndpoint(e.target.value)} style={{ width: '100%', marginTop: 6 }}>
            {ENDPOINTS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>

        {endpoint === 'recipe' && (
          <label>
            product_id
            <input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="e.g. 12"
              style={{ width: '100%', marginTop: 6 }}
            />
          </label>
        )}

        {endpoint === 'raw' && (
          <label>
            Raw path (relative to /api)
            <input
              value={rawPath}
              onChange={(e) => setRawPath(e.target.value)}
              placeholder="/orders/?status=pendiente"
              style={{ width: '100%', marginTop: 6 }}
            />
          </label>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
            {loading ? 'Consultando...' : 'Ejecutar'}
          </button>
          <button type="button" onClick={clear} style={{ padding: '8px 12px' }}>Limpiar</button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        {error && (
          <pre style={{ color: '#b71c1c', background: '#fff0f0', padding: 12, borderRadius: 6 }}>{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</pre>
        )}
        {result !== null && (
          <div>
            <h4>Resultado</h4>
            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}