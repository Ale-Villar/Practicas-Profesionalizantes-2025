
import React, { useState, useEffect } from 'react';
import { getPurchaseHistory } from '../services/api';
import { formatMovementDate } from '../utils/date';

const PurchaseHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- ESTADOS PARA LOS FILTROS ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');

    // --- ESTADOS PARA SECCIONES REBATIBLES ---
    const [showSearchDate, setShowSearchDate] = useState(true); // Abierto por defecto
    const [showStatusPayment, setShowStatusPayment] = useState(false); // Cerrado por defecto

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await getPurchaseHistory();
                setHistory(response.data);
            } catch (err) {
                setError('No se pudo cargar el historial de compras.');
                console.error('Error fetching purchase history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    // Lógica para filtrar el historial
    const filteredHistory = history.filter(purchase => {
        // Filtro por Fecha
        if (startDate && new Date(purchase.created_at) < new Date(startDate)) return false;
        if (endDate && new Date(purchase.created_at) > new Date(endDate)) return false;

        // Filtro por Búsqueda (Termino)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchSupplier = purchase.supplier?.toLowerCase().includes(term);
            const matchUser = purchase.user?.toLowerCase().includes(term);
            if (!matchSupplier && !matchUser) return false;
        }

        // Filtro por Estado (Si tu objeto lo tiene)
        if (statusFilter && purchase.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;

        // Filtro por Método de Pago (Si tu objeto lo tiene)
        if (paymentFilter && purchase.payment_method?.toLowerCase() !== paymentFilter.toLowerCase()) return false;

        return true;
    });

    if (loading) {
        return <div className="p-4 text-gray-600 font-medium">Cargando historial de compras...</div>;
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
    }

    return (
        <div className="purchase-history-container max-w-5xl mx-auto p-2 md:p-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Historial de Compras Aprobadas</h3>

            {/* ZONA DE FILTROS REBATIBLES */}
            <div className="flex flex-col gap-3 mb-6">

                {/* 1. Contenedor de Fechas y Consulta */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <button
                        onClick={() => setShowSearchDate(!showSearchDate)}
                        className="w-full flex justify-between items-center p-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>Búsqueda y Fechas</span>
                        </div>
                        <span className="text-gray-400">{showSearchDate ? '▲' : '▼'}</span>
                    </button>

                    {showSearchDate && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
                            {/* Fechas puestas arriba */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            {/* Contenedor de consulta debajo de las fechas */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consultar datos</label>
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar proveedor o usuario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Contenedor de Estado y Método de Pago */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <button
                        onClick={() => setShowStatusPayment(!showStatusPayment)}
                        className="w-full flex justify-between items-center p-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>⚙️</span>
                            <span>Estado y Método de Pago</span>
                        </div>
                        <span className="text-gray-400">{showStatusPayment ? '▲' : '▼'}</span>
                    </button>

                    {showStatusPayment && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="aprobado">Aprobado</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                    <select
                                        value={paymentFilter}
                                        onChange={(e) => setPaymentFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="">Todos los métodos</option>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="debito">Débito</option>
                                        <option value="credito">Crédito</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* RESULTADOS DEL HISTORIAL */}
            {filteredHistory.length === 0 ? (
                <div className="text-center p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-gray-500 font-medium">No se encontraron compras con esos filtros.</p>
                </div>
            ) : (
                <ul className="list-container space-y-4">
                    {filteredHistory.map(purchase => (
                        <li key={purchase.id} className="purchase-list-item bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="purchase-header flex justify-between border-b pb-2 mb-3">
                                <strong className="text-lg text-gray-800">Compra #{purchase.id} - {formatMovementDate(purchase.created_at)}</strong>
                                <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    <span>Solicitado por: <strong>{purchase.user}</strong></span>
                                </div>
                            </div>
                            <div className="purchase-details grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 mb-3">
                                <p><strong>Proveedor:</strong> {purchase.supplier}</p>
                                <p><strong>Aprobado por:</strong> {purchase.approved_by} el {formatMovementDate(purchase.approved_at)}</p>
                            </div>
                            <div className="purchase-items bg-gray-50 p-3 rounded-lg mb-3">
                                <strong className="text-sm text-gray-700 mb-2 block">Items:</strong>
                                <ul className="space-y-1">
                                    {purchase.items.map((item, index) => (
                                        <li key={index} className="text-sm text-gray-600 flex justify-between">
                                            <span>{item.productName} (x{item.quantity})</span>
                                            <span className="font-medium">${item.unitPrice}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="purchase-total-display flex justify-end items-center mt-2 pt-2 border-t">
                                <span className="text-sm text-gray-600 mr-2">Total:</span>
                                <strong className="text-xl text-green-700">${purchase.total}</strong>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default PurchaseHistory;