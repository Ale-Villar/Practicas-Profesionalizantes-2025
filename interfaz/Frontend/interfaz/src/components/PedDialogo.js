// PedDialogo.js
import React, { useState, useEffect, useRef } from 'react';
import { updateOrderStatus } from '../services/api';

const safeToFixed = (value, decimals = 2) => {
    const num = parseFloat(value);
    return isNaN(num) ? (0).toFixed(decimals) : num.toFixed(decimals);
};

const formatMovementDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'N/A';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (e) {
        return 'N/A';
    }
};

function PedDialogo({ orders, setOrders, isOpen, onClose, onMinimize, isMinimized, onOpenNewTab, isFullscreen = false }) {
    const [ordersIdFilter, setOrdersIdFilter] = useState('');
    const [ordersIdFilterOp, setOrdersIdFilterOp] = useState('equals');
    const [ordersCustomerFilter, setOrdersCustomerFilter] = useState('');
    const [ordersCustomerFilterOp, setOrdersCustomerFilterOp] = useState('contains');
    
    // ESTADOS DE FECHA SIMPLIFICADOS
    const [ordersDateFrom, setOrdersDateFrom] = useState('');
    const [ordersDateTo, setOrdersDateTo] = useState('');

    const [ordersPaymentMethodFilter, setOrdersPaymentMethodFilter] = useState([]);
    const [ordersStatusFilter, setOrdersStatusFilter] = useState([]);
    const [ordersProductFilter, setOrdersProductFilter] = useState('');
    const [ordersUnitsFilter, setOrdersUnitsFilter] = useState('');
    const [ordersUnitsFilterOp, setOrdersUnitsFilterOp] = useState('equals');
    
    // Estado para controlar qué pedidos tienen abierto el menú de productos
    const [openProducts, setOpenProducts] = useState({});
    // Estado para controlar si los filtros están desplegados
    const [showFilters, setShowFilters] = useState(false);

    const toggleProducts = (orderId) => {
        setOpenProducts(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    // Estados para drag & drop
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dialogRef = useRef(null);

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            setOrders(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
        } catch (err) {
            console.error('Error actualizando estado del pedido:', err);
        }
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('.dialog-header') && !e.target.closest('button')) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const minX = 0;
            const minY = 0;
            const dialogWidth = dialogRef.current?.offsetWidth || 400;
            const dialogHeight = dialogRef.current?.offsetHeight || 200;
            const maxX = window.innerWidth - 200; // igual que caja
            const maxY = window.innerHeight - 50; // igual que caja
            let newX = Math.max(minX, Math.min(maxX, e.clientX - dragOffset.x));
            let newY = Math.max(minY, Math.min(maxY, e.clientY - dragOffset.y));
            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    if (!isOpen) return null;

    const filteredOrders = orders.filter(order => {
        // Filtro por ID
        if (ordersIdFilter) {
            const orderId = Number(order.id);
            const filterValue = Number(ordersIdFilter);
            if (ordersIdFilterOp === 'equals' && orderId !== filterValue) return false;
            if (ordersIdFilterOp === 'lt' && orderId >= filterValue) return false;
            if (ordersIdFilterOp === 'lte' && orderId > filterValue) return false;
            if (ordersIdFilterOp === 'gt' && orderId <= filterValue) return false;
            if (ordersIdFilterOp === 'gte' && orderId < filterValue) return false;
        }
        
        // Filtro por cliente
        if (ordersCustomerFilter) {
            const customerName = (order.customerName || '').toLowerCase();
            const filterLower = ordersCustomerFilter.toLowerCase();
            if (ordersCustomerFilterOp === 'contains' && !customerName.includes(filterLower)) return false;
            if (ordersCustomerFilterOp === 'equals' && customerName !== filterLower) return false;
        }
        
        // FILTRO DE FECHAS (Corrección de zona horaria y formato simplificado)
        if (ordersDateFrom || ordersDateTo) {
            const rawDate = order.fecha_de_orden_del_pedido || order.created_at || order.date;
            if (!rawDate) return false;
            
            const orderDate = new Date(rawDate);
            if (isNaN(orderDate.getTime())) return false;
            
            orderDate.setHours(0, 0, 0, 0);

            if (ordersDateFrom) {
                const [year, month, day] = ordersDateFrom.split('-');
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0);
                if (orderDate < startDate) return false;
            }

            if (ordersDateTo) {
                const [year, month, day] = ordersDateTo.split('-');
                const endDate = new Date(year, month - 1, day);
                endDate.setHours(0, 0, 0, 0);
                if (orderDate > endDate) return false;
            }
        }
        
        // Filtro por método de pago
        if (ordersPaymentMethodFilter.length > 0) {
            if (!ordersPaymentMethodFilter.includes(order.paymentMethod)) return false;
        }
        
        // Filtro por estado
        if (ordersStatusFilter.length > 0) {
            if (!ordersStatusFilter.includes(order.status)) return false;
        }
        
        // Filtro por producto
        if (ordersProductFilter) {
            const hasProduct = order.items.some(item => 
                (item.productName || '').toLowerCase().includes(ordersProductFilter.toLowerCase())
            );
            if (!hasProduct) return false;
        }
        
        // Filtro por unidades
        if (ordersUnitsFilter) {
            const filterValue = Number(ordersUnitsFilter);
            const hasMatchingQuantity = order.items.some(item => {
                const quantity = Number(item.quantity) || 0;
                if (ordersUnitsFilterOp === 'equals' && quantity === filterValue) return true;
                if (ordersUnitsFilterOp === 'greater' && quantity > filterValue) return true;
                if (ordersUnitsFilterOp === 'greaterOrEqual' && quantity >= filterValue) return true;
                if (ordersUnitsFilterOp === 'less' && quantity < filterValue) return true;
                if (ordersUnitsFilterOp === 'lessOrEqual' && quantity <= filterValue) return true;
                return false;
            });
            if (!hasMatchingQuantity) return false;
        }
        
        return true;
    });

    return (
        <div
            ref={dialogRef}
            className={`fixed bg-white flex flex-col ${
                isFullscreen 
                    ? 'inset-0 rounded-none' 
                    : `rounded-lg shadow-2xl border-2 border-gray-300 ${isMinimized ? 'h-auto' : 'min-h-[600px]'}`
            }`}
            style={{
                left: isFullscreen ? 0 : `${position.x}px`,
                top: isFullscreen ? 0 : `${position.y}px`,
                width: isFullscreen ? '100vw' : (isMinimized ? 'auto' : '90vw'),
                maxWidth: isFullscreen ? '100vw' : (isMinimized ? 'fit-content' : '1400px'),
                height: isFullscreen ? '100vh' : 'auto',
                maxHeight: isFullscreen ? '100vh' : 'auto',
                zIndex: 1000,
                resize: (isFullscreen || isMinimized) ? 'none' : 'both',
                overflow: isMinimized ? 'hidden' : 'auto'
            }}
        >
            {/* Header */}
            <div 
                className={`dialog-header bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 ${isMinimized ? 'py-2 min-h-[56px]' : 'py-3'} ${isFullscreen ? '' : 'rounded-t-lg cursor-move'} flex items-center justify-between`}
                onMouseDown={isFullscreen ? undefined : handleMouseDown}
                style={isMinimized ? {overflow: 'hidden'} : {}}
            >
                <h3 className="text-lg font-bold flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis w-full">
                    <span>Historial de Pedidos</span>
                    {/* No mostrar el contador de pedidos cuando está minimizado */}
                    {!isMinimized && <span className="text-sm font-normal">({filteredOrders.length} pedidos)</span>}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {!isFullscreen && (
                        <button
                            onClick={onOpenNewTab}
                            className="hover:bg-blue-800 p-1.5 rounded transition-colors"
                            title="Abrir en pestaña nueva"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                    )}
                    {!isFullscreen && (
                        <button
                            onClick={onMinimize}
                            className="hover:bg-blue-800 p-1.5 rounded transition-colors"
                            title={isMinimized ? "Maximizar" : "Minimizar"}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMinimized ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                )}
                            </svg>
                        </button>
                    )}
                    {isFullscreen && (
                        <button
                            onClick={onClose}
                            className="hover:bg-red-600 p-1.5 rounded transition-colors"
                            title="Cerrar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {!isFullscreen && (
                        <button
                            onClick={onClose}
                            className="hover:bg-red-600 p-1.5 rounded transition-colors"
                            title="Cerrar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Contenido */}
            {!isMinimized && (
                <div className="flex-1 overflow-auto p-6 bg-gray-50">
                    {/* Filtros */}
                    <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <h4 className="text-lg font-bold text-gray-800">🔍 Filtros de Búsqueda</h4>
                            <svg className={`w-6 h-6 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {showFilters && (
                        <div className="p-6 border-t border-gray-200">
                        
                        {/* Filtro ID */}
                        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3" style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <label className="font-medium text-gray-700 sm:min-w-[80px]">ID:</label>
                            <select 
                                value={ordersIdFilterOp} 
                                onChange={e => setOrdersIdFilterOp(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="equals">Es igual</option>
                                <option value="lt">&lt;</option>
                                <option value="lte">&le;</option>
                                <option value="gt">&gt;</option>
                                <option value="gte">&ge;</option>
                            </select>
                            <input 
                                type="number" 
                                value={ordersIdFilter} 
                                onChange={e => setOrdersIdFilter(e.target.value)} 
                                placeholder="ID del pedido..." 
                                className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            />
                        </div>

                        {/* Filtro Cliente */}
                        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3" style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <label className="font-medium text-gray-700 sm:min-w-[80px]">Cliente:</label>
                            <select 
                                value={ordersCustomerFilterOp} 
                                onChange={e => setOrdersCustomerFilterOp(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="contains">Contiene</option>
                                <option value="equals">Es igual</option>
                            </select>
                            <input 
                                type="text" 
                                value={ordersCustomerFilter} 
                                onChange={e => setOrdersCustomerFilter(e.target.value)} 
                                placeholder="Nombre del cliente..." 
                                className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            />
                        </div>

                        {/* Filtro Fecha (Calendario Nativo) */}
                        <div className="mb-4">
                            <label className="font-medium text-gray-700 block mb-2">Filtrar por Fechas:</label>
                            <p className="text-sm text-gray-600 italic mb-3">
                                🗓️ <strong>Filtro inteligente:</strong> Selecciona el rango para filtrar el historial de pedidos.
                            </p>
                            
                            <div className={`flex gap-4 ${isFullscreen ? 'flex-row' : 'flex-col sm:flex-row'}`}>
                                <div className="flex-1 bg-gray-50 p-4 rounded-md border border-gray-200">
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Desde:</label>
                                    <input 
                                        type="date" 
                                        value={ordersDateFrom} 
                                        onChange={e => setOrdersDateFrom(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                                    />
                                </div>

                                <div className="flex-1 bg-gray-50 p-4 rounded-md border border-gray-200">
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Hasta:</label>
                                    <input 
                                        type="date" 
                                        value={ordersDateTo} 
                                        onChange={e => setOrdersDateTo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Filtro Métodos de Pago + Estados (en pantalla completa lado a lado) */}
                        {isFullscreen ? (
                            <div className="mb-4 flex flex-wrap gap-6">
                                <div className="flex-1 min-w-[220px]">
                                    <label className="font-medium text-gray-700 block mb-2">Métodos de Pago:</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['debito', 'credito', 'transferencia', 'efectivo'].map(method => (
                                            <label key={method} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={ordersPaymentMethodFilter.includes(method)} 
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setOrdersPaymentMethodFilter([...ordersPaymentMethodFilter, method]);
                                                        } else {
                                                            setOrdersPaymentMethodFilter(ordersPaymentMethodFilter.filter(m => m !== method));
                                                        }
                                                    }} 
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700 capitalize">{method}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-[220px]" style={{ marginLeft: '-25px' }}>
                                    <label className="font-medium text-gray-700 block mb-2">Estados:</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'].map(status => (
                                            <label key={status} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={ordersStatusFilter.includes(status)} 
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setOrdersStatusFilter([...ordersStatusFilter, status]);
                                                        } else {
                                                            setOrdersStatusFilter(ordersStatusFilter.filter(s => s !== status));
                                                        }
                                                    }} 
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700">{status}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Filtro Métodos de Pago */}
                                <div className="mb-4">
                                    <label className="font-medium text-gray-700 block mb-2">Métodos de Pago:</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['debito', 'credito', 'transferencia', 'efectivo'].map(method => (
                                            <label key={method} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={ordersPaymentMethodFilter.includes(method)} 
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setOrdersPaymentMethodFilter([...ordersPaymentMethodFilter, method]);
                                                        } else {
                                                            setOrdersPaymentMethodFilter(ordersPaymentMethodFilter.filter(m => m !== method));
                                                        }
                                                    }} 
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700 capitalize">{method}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Filtro Estados */}
                                <div className="mb-4">
                                    <label className="font-medium text-gray-700 block mb-2">Estados:</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'].map(status => (
                                            <label key={status} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={ordersStatusFilter.includes(status)} 
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setOrdersStatusFilter([...ordersStatusFilter, status]);
                                                        } else {
                                                            setOrdersStatusFilter(ordersStatusFilter.filter(s => s !== status));
                                                        }
                                                    }} 
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700">{status}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {/* Filtro Producto */}
                        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3" style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <label className="font-medium text-gray-700 sm:min-w-[120px]">Buscar Producto:</label>
                            <input 
                                type="text" 
                                value={ordersProductFilter} 
                                onChange={e => setOrdersProductFilter(e.target.value)} 
                                placeholder="Nombre del producto..." 
                                className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            />
                        </div>
                        
                        {/* Filtro Unidades */}
                        <div className="mb-0 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3" style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <label className="font-medium text-gray-700 sm:min-w-[80px]">Unidades:</label>
                            <select 
                                value={ordersUnitsFilterOp} 
                                onChange={e => setOrdersUnitsFilterOp(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="equals">=</option>
                                <option value="greater">&gt;</option>
                                <option value="greaterOrEqual">&gt;=</option>
                                <option value="less">&lt;</option>
                                <option value="lessOrEqual">&lt;=</option>
                            </select>
                            <input 
                                type="number" 
                                value={ordersUnitsFilter} 
                                onChange={e => setOrdersUnitsFilter(e.target.value)} 
                                placeholder="Cantidad..." 
                                className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            />
                        </div>
                        </div>
                        )}
                    </div>

                    {/* Lista de Pedidos */}
                    <div className={`grid gap-4 ${
                        isFullscreen
                            ? 'grid-cols-1 min-[1200px]:grid-cols-2 min-[1600px]:grid-cols-3 min-[2000px]:grid-cols-4'
                            : 'grid-cols-1 min-[1400px]:grid-cols-2 min-[1800px]:grid-cols-3'
                    }`}>
                        {filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
                                <p className="text-gray-500 text-lg">No hay pedidos que mostrar</p>
                            </div>
                        ) : (
                            filteredOrders.map(order => (
                                <div key={order.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                    {/* Header del pedido */}
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">
                                                Pedido #{order.id} - <span className="text-gray-600 text-base">Registrado: {formatMovementDate(order.fecha_de_orden_del_pedido)}</span>
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                                order.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'En Preparación' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'Listo' ? 'bg-green-100 text-green-800' :
                                                order.status === 'Entregado' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {order.status}
                                            </span>
                                            <select 
                                                value={order.status} 
                                                onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                                                className="px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="En Preparación">En Preparación</option>
                                                <option value="Listo">Listo</option>
                                                <option value="Entregado">Entregado</option>
                                                <option value="Cancelado">Cancelado</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* Contenido del pedido */}
                                    <div className="p-6 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-700">Cliente:</span>
                                            <span className="text-gray-900">{order.customerName}</span>
                                            <span className="text-gray-400">|</span>
                                            <span className="font-bold text-gray-700">Entrega:</span>
                                            <span className="text-gray-900">
                                                {order.fecha_para_la_que_se_quiere_el_pedido ? 
                                                    new Date(order.fecha_para_la_que_se_quiere_el_pedido).toISOString().split('T')[0].replace(/-/g, '/') 
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-700">Método de Pago:</span>
                                            <span className="font-medium">{order.paymentMethod}</span>
                                        </div>
                                        <div>
                                            <button
                                                className="flex items-center gap-2 font-bold text-gray-700 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                onClick={() => toggleProducts(order.id)}
                                                aria-expanded={!!openProducts[order.id]}
                                                aria-controls={`productos-${order.id}`}
                                            >
                                                <span>Productos solicitados</span>
                                                <svg className={`w-5 h-5 transform transition-transform ${openProducts[order.id] ? 'rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                            {openProducts[order.id] && (
                                                <ul id={`productos-${order.id}`} className="bg-gray-50 rounded-md p-4 space-y-1 border border-gray-200">
                                                    {order.items.map((item, index) => (
                                                        <li key={index} className="text-gray-800">
                                                            <span className="font-medium">{item.productName}</span> - {item.quantity || 0} unidades 
                                                            × ${safeToFixed(item.unitPrice)} = <span className="font-semibold">${safeToFixed(item.total)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                            <span className="text-2xl font-bold text-gray-800">
                                                Total: <span className="text-black">${safeToFixed(order.totalAmount)}</span>
                                            </span>
                                        </div>
                                        {order.notes && (
                                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                                <span className="font-bold text-gray-700">Notas:</span>
                                                <p className="text-gray-800 mt-1">{order.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PedDialogo;