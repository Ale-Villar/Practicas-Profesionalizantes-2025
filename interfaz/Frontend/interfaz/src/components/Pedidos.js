import React, { useState } from 'react';
import Select from 'react-select';
import { formatMovementDate } from '../utils/date';
import { safeToFixed } from '../utils/format';
import api, { updateOrderStatus, updateOrder, getApiErrorMessage } from '../services/api';
import SearchableSelect from './SearchableSelect';
import PedDialogo from './PedDialogo';
import { productNameOptions, sameName } from '../utils/filterOptions';
import {
    round2,
    calculateItemsTotal,
    PaymentDifferencePanel,
    ConfirmDeliveryModal,
    ExitEnCambioModal,
} from './OrderPedidoModals';

const ORDER_STATUSES = ['Pendiente', 'En Preparación', 'Listo', 'En cambio', 'Entregado', 'Cancelado'];

const getStatusClasses = (status) => {
    switch (status) {
        case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
        case 'En Preparación': return 'bg-blue-100 text-blue-800';
        case 'Listo': return 'bg-green-100 text-green-800';
        case 'En cambio': return 'bg-orange-100 text-orange-800';
        case 'Entregado': return 'bg-gray-100 text-gray-800';
        default: return 'bg-red-100 text-red-800';
    }
};

const normalizeOrder = (created) => ({
    id: created.id,
    fecha_para_la_que_se_quiere_el_pedido: created.fecha_para_la_que_se_quiere_el_pedido,
    fecha_de_orden_del_pedido: created.fecha_de_orden_del_pedido,
    created_at: created.fecha_de_orden_del_pedido || created.created_at,
    date: created.fecha_de_orden_del_pedido || created.created_at,
    customerName: created.customer_name || '',
    paymentMethod: created.payment_method || '',
    items: Array.isArray(created.items) ? created.items.map(it => ({
        productName: it.product_name || '',
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unit_price) || 0,
        total: Number(it.total) || 0,
    })) : [],
    totalAmount: Number(created.total_amount) || 0,
    status: created.status || 'Pendiente',
    notes: created.notes || '',
    cashReceived: created.cash_received,
    changeGiven: created.change_given,
    paidTotalAtChange: created.paid_total_at_change != null ? Number(created.paid_total_at_change) : null,
    paymentDifference: created.payment_difference != null ? Number(created.payment_difference) : null,
});

const Pedidos = ({ orders, setOrders, products, loadCashBalance }) => {
    const [showAddOrder, setShowAddOrder] = useState(false);
    const [newOrder, setNewOrder] = useState({
        customerName: '',
        fecha_para_la_que_se_quiere_el_pedido: new Date().toISOString().split('T')[0],
        paymentMethods: {
            efectivo: false,
            debito: false,
            credito: false,
            transferencia: false,
        },
        items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }],
        notes: '',
        cashReceived: '',
    });
    const [message, setMessage] = useState('');
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [editOrderForm, setEditOrderForm] = useState(null);
    const [confirmDelivery, setConfirmDelivery] = useState(null);
    const [exitEnCambio, setExitEnCambio] = useState(null);

    const [ordersIdFilter, setOrdersIdFilter] = useState('');
    const [ordersIdFilterOp, setOrdersIdFilterOp] = useState('equals');
    const [ordersCustomerFilter, setOrdersCustomerFilter] = useState('');
    const [ordersCustomerFilterOp, setOrdersCustomerFilterOp] = useState('contains');
    
    // NUEVOS ESTADOS DE FECHA (Simplificados)
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

    const addItem = () => {
        setNewOrder({
            ...newOrder,
            items: [...newOrder.items, { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }]
        });
    };

    const removeItem = (index) => {
        if (newOrder.items.length > 1) {
            const updatedItems = newOrder.items.filter((_, i) => i !== index);
            setNewOrder({ ...newOrder, items: updatedItems });
        }
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...newOrder.items];
        const currentItem = { ...updatedItems[index] };
    
        if (field === 'product') {
            const selectedProduct = value;
            currentItem.productId = selectedProduct ? selectedProduct.value : '';
            currentItem.productName = selectedProduct ? selectedProduct.label : '';
            const productData = products.find(p => p.id === currentItem.productId);
            if (productData) {
                currentItem.unitPrice = productData.price;
            }
        } else {
            currentItem[field] = value;
        }
    
        // Recalculate total for the item
        const quantity = parseFloat(currentItem.quantity) || 0;
        const unitPrice = parseFloat(currentItem.unitPrice) || 0;
        currentItem.total = quantity * unitPrice;
    
        updatedItems[index] = currentItem;
        setNewOrder({ ...newOrder, items: updatedItems });
    };

    const handlePaymentMethodChange = (method) => {
        setNewOrder(prevOrder => ({
            ...prevOrder,
            paymentMethods: {
                ...prevOrder.paymentMethods,
                [method]: !prevOrder.paymentMethods[method]
            }
        }));
    };

    const calculateOrderTotal = () => {
        return newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
    };

    const calculateEditOrderTotal = () => {
        if (!editOrderForm) return 0;
        return calculateItemsTotal(editOrderForm.items);
    };

    const orderTotal = calculateOrderTotal();
    const paysWithCash = newOrder.paymentMethods.efectivo;
    const cashReceivedNum = parseFloat(newOrder.cashReceived) || 0;
    const changeAmount = paysWithCash ? round2(Math.max(0, cashReceivedNum - orderTotal)) : 0;
    const remainingCash = paysWithCash ? round2(orderTotal - cashReceivedNum) : 0;

    const openEditOrder = (order) => {
        const paidTotal = round2(Number(order.paidTotalAtChange ?? order.totalAmount) || 0);
        setEditingOrderId(order.id);
        setEditOrderForm({
            paidTotal,
            items: (order.items || []).map(item => {
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                return {
                    productId: products.find(p => p.name === item.productName)?.id || '',
                    productName: item.productName || '',
                    quantity: qty || 1,
                    unitPrice,
                    total: round2(qty * unitPrice),
                };
            }),
            notes: order.notes || '',
        });
    };

    const closeEditOrder = () => {
        setEditingOrderId(null);
        setEditOrderForm(null);
    };

    const addEditItem = () => {
        setEditOrderForm(prev => ({
            ...prev,
            items: [...prev.items, { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }],
        }));
    };

    const removeEditItem = (index) => {
        if (editOrderForm.items.length <= 1) return;
        setEditOrderForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const updateEditItem = (index, field, value) => {
        setEditOrderForm(prev => {
            const updatedItems = [...prev.items];
            const currentItem = { ...updatedItems[index] };

            if (field === 'product') {
                const selectedProduct = value;
                currentItem.productId = selectedProduct ? selectedProduct.value : '';
                currentItem.productName = selectedProduct ? selectedProduct.label : '';
                const productData = products.find(p => p.id === currentItem.productId);
                if (productData) {
                    currentItem.unitPrice = Number(productData.price) || 0;
                }
            } else {
                currentItem[field] = value;
            }

            const quantity = Number(currentItem.quantity) || 0;
            const unitPrice = Number(currentItem.unitPrice) || 0;
            currentItem.total = round2(quantity * unitPrice);
            updatedItems[index] = currentItem;
            return { ...prev, items: updatedItems };
        });
    };

    const handleSaveEditOrder = async (e) => {
        e.preventDefault();
        const validItems = editOrderForm.items.filter(item =>
            item.productName.trim() && Number(item.quantity) > 0 && Number(item.unitPrice) > 0
        );
        if (validItems.length === 0) {
            setMessage('❌ Error: Debe tener al menos un producto válido.');
            return;
        }

        try {
            const payload = {
                items: validItems.map(i => {
                    const qty = Number(i.quantity);
                    const unitPrice = Number(i.unitPrice);
                    return {
                        product_name: i.productName,
                        quantity: qty,
                        unit_price: unitPrice,
                        total: round2(qty * unitPrice),
                    };
                }),
                notes: editOrderForm.notes,
            };
            const res = await updateOrder(editingOrderId, payload);
            const updated = normalizeOrder(res.data);
            setOrders(prev => prev.map(order =>
                order.id === editingOrderId ? { ...order, ...updated } : order
            ));
            closeEditOrder();
            setMessage(`✅ Pedido #${editingOrderId} actualizado correctamente.`);
        } catch (err) {
            console.error('Error actualizando pedido:', err, err.response?.data);
            setMessage('❌ Error al actualizar el pedido. Revisá la consola.');
        }
    };

    const handleAddOrder = async (e) => {
        e.preventDefault();
        
        if (!newOrder.customerName.trim()) {
            setMessage('❌ Error: Debe ingresar el nombre del cliente.');
            return;
        }

        const selectedPaymentMethods = Object.entries(newOrder.paymentMethods)
            .filter(([_, isSelected]) => isSelected)
            .map(([method]) => method);

        if (selectedPaymentMethods.length === 0) {
            setMessage('❌ Error: Debe seleccionar al menos un método de pago.');
            return;
        }

        if (newOrder.paymentMethods.efectivo) {
            if (!newOrder.cashReceived || cashReceivedNum <= 0) {
                setMessage('❌ Error: Ingrese el monto entregado en efectivo.');
                return;
            }
            if (remainingCash > 0.01) {
                setMessage(`❌ Error: Faltan $${safeToFixed(remainingCash)} para cubrir el total del pedido.`);
                return;
            }
        }
        
        const validItems = newOrder.items.filter(item => 
            item.productName.trim() && item.quantity > 0 && item.unitPrice > 0
        );
        
        if (validItems.length === 0) {
            setMessage('❌ Error: Debe seleccionar al menos un producto con cantidad y precio válidos.');
            return;
        }
        
        try {
            const payload = {
                customer_name: newOrder.customerName,
                fecha_para_la_que_se_quiere_el_pedido: newOrder.fecha_para_la_que_se_quiere_el_pedido,
                payment_method: selectedPaymentMethods.join(', '),
                items: validItems.map(i => ({ 
                    product_name: i.productName, 
                    quantity: Number(i.quantity), 
                    unit_price: Number(i.unitPrice), 
                    total: Number(i.total) 
                })),
                notes: newOrder.notes,
                total_amount: calculateOrderTotal(),
                cash_received: newOrder.paymentMethods.efectivo ? cashReceivedNum : null,
                change_given: newOrder.paymentMethods.efectivo ? changeAmount : null,
            };

            const res = await api.post('/orders/', payload);
            if (res && res.data) {
                const createdNormalized = normalizeOrder(res.data);
                setOrders(prev => [...prev, createdNormalized]);
                setNewOrder({ 
                    customerName: '', 
                    fecha_para_la_que_se_quiere_el_pedido: new Date().toISOString().split('T')[0],
                    paymentMethods: { efectivo: false, debito: false, credito: false, transferencia: false }, 
                    items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }], 
                    notes: '',
                    cashReceived: '',
                });
                setShowAddOrder(false);
                setMessage('✅ Pedido de cliente registrado exitosamente.');
            } else {
                setMessage('⚠️ Pedido creado localmente, pero no se obtuvo confirmación del servidor.');
            }
        } catch (err) {
            console.error('Error enviando pedido al backend:', err, err.response && err.response.data);
            setMessage('❌ Error guardando el pedido en el servidor. Revisar consola.');
        }
    };

    const applyStatusUpdate = async (orderId, newStatus) => {
        try {
            const res = await updateOrderStatus(orderId, newStatus);
            const updated = res?.data ? normalizeOrder(res.data) : null;
            setOrders(prev => prev.map(order => {
                if (order.id !== orderId) return order;
                return updated ? { ...order, ...updated } : { ...order, status: newStatus };
            }));
            if (newStatus === 'Entregado' && loadCashBalance) {
                await loadCashBalance();
            }
            setMessage(`✅ Estado del pedido #${orderId} actualizado a "${newStatus}"`);
        } catch (error) {
            console.error('Error actualizando estado del pedido:', error);
            setMessage(`❌ ${getApiErrorMessage(error, 'Error al actualizar el estado del pedido. Revisá la consola.')}`);
        }
    };

    const handleStatusChangeRequest = (order, newStatus) => {
        if (newStatus === order.status) return;

        if (newStatus === 'Entregado') {
            setConfirmDelivery({ orderId: order.id, newStatus });
            return;
        }

        if (order.status === 'En cambio' && newStatus !== 'En cambio') {
            setExitEnCambio({ order, newStatus });
            return;
        }

        applyStatusUpdate(order.id, newStatus);
    };

    const productOptions = products
        .filter(p => p.category === 'Producto')
        .map(p => ({ value: p.id, label: p.name }));
    const productFilterOptions = productNameOptions(products, {
        type: 'Producto',
        extraNames: orders.flatMap(order => (order.items || []).map(item => item.productName)),
    });

    return (
        <div className="management-container">
            <h2 className="text-3xl font-extrabold mb-4">Gestión de Pedidos de Clientes</h2>
            {message && <p className="message">{message}</p>}
            <div className="flex items-center gap-4 mb-6">
                {!showAddOrder && (
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => setShowAddOrder(true)}>
                        Registrar Nuevo Pedido de Cliente
                    </button>
                )}
                {/* Botón para abrir historial de pedidos */}
                {!showAddOrder && (
                    <button
                        className="hidden min-[790px]:inline-block bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold py-2 px-4 rounded shadow hover:from-blue-700 hover:to-blue-500 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('openPedDialogo'))}
                    >
                         Abrir Historial de Pedidos
                    </button>
                )}
            </div>
            {showAddOrder && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                        <form onSubmit={handleAddOrder}>
                            <h3 className="text-lg font-bold mb-4">Registrar Pedido de Cliente</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre del cliente</label>
                                    <input 
                                        type="text" 
                                        value={newOrder.customerName} 
                                        onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })} 
                                        placeholder="Nombre del cliente" 
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>

                                    <label className="block text-sm font-medium text-gray-700">Fecha de Entrega</label>
                                    <input 
                                        type="date" 
                                        value={newOrder.fecha_para_la_que_se_quiere_el_pedido} 
                                        onChange={e => setNewOrder({ ...newOrder, fecha_para_la_que_se_quiere_el_pedido: e.target.value })} 
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Métodos de Pago</label>
                                    <div className="mt-2 flex space-x-4">
                                        {Object.keys(newOrder.paymentMethods).map(method => (
                                            <label key={method} className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 text-indigo-600"
                                                    checked={newOrder.paymentMethods[method]}
                                                    onChange={() => handlePaymentMethodChange(method)}
                                                />
                                                <span className="ml-2 text-gray-700">{method.charAt(0).toUpperCase() + method.slice(1)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {paysWithCash && (
                                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Monto entregado (efectivo)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newOrder.cashReceived}
                                                onChange={e => setNewOrder({ ...newOrder, cashReceived: e.target.value })}
                                                placeholder="Ej: 10000"
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                required={paysWithCash}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Total del pedido</label>
                                            <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md font-semibold">
                                                ${safeToFixed(orderTotal)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Vuelto</label>
                                            <div className={`mt-1 px-3 py-2 border rounded-md font-bold ${
                                                remainingCash > 0.01
                                                    ? 'bg-red-50 border-red-300 text-red-700'
                                                    : 'bg-green-100 border-green-300 text-green-800'
                                            }`}>
                                                {remainingCash > 0.01
                                                    ? `Faltan $${safeToFixed(remainingCash)}`
                                                    : `$${safeToFixed(changeAmount)}`}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h4 className="text-md font-bold mt-6 mb-2">Productos del Pedido</h4>
                            
                            {newOrder.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-center mb-2">
                                    <div className="col-span-6">
                                        <Select
                                            options={productOptions}
                                            value={productOptions.find(opt => opt.value === item.productId)}
                                            onChange={selectedOption => updateItem(index, 'product', selectedOption)}
                                            placeholder="Buscar y seleccionar producto..."
                                            isClearable
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={e => updateItem(index, 'quantity', e.target.value)}
                                            placeholder="Cant." 
                                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            min="1"
                                            required 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="number" 
                                            value={item.unitPrice} 
                                            readOnly 
                                            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 sm:text-sm"
                                            placeholder="Precio" 
                                        />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <span>${safeToFixed(item.total)}</span>
                                    </div>
                                    <div className="col-span-1">
                                        {newOrder.items.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeItem(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                &#x274C;
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            <button type="button" onClick={addItem} className="mt-2 text-indigo-600 hover:text-indigo-900">
                                &#x2795; Agregar Producto
                            </button>
                            
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Notas adicionales</label>
                                <textarea 
                                    value={newOrder.notes} 
                                    onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })} 
                                    placeholder="Notas adicionales del pedido"
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                                />
                            </div>
                            
                            <div className="mt-4 text-right font-bold text-lg">
                                Total del Pedido: ${safeToFixed(calculateOrderTotal())}
                            </div>
                            
                            <div className="mt-6 flex justify-end space-x-4">
                                <button type="button" className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded" onClick={() => setShowAddOrder(false)}>Cancelar</button>
                                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Registrar Pedido</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
    
            <div className="min-[790px]:hidden mt-6">
                <PedDialogo
                    isEmbedded
                    isOpen
                    orders={orders}
                    setOrders={setOrders}
                    products={products}
                    loadCashBalance={loadCashBalance}
                    onClose={() => {}}
                    onMinimize={() => {}}
                    isMinimized={false}
                    onOpenNewTab={() => {
                        const url = `${window.location.origin}${window.location.pathname}?pedidos-fullscreen=true`;
                        window.open(url, '_blank');
                    }}
                />
            </div>


            {editingOrderId && editOrderForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                        <form onSubmit={handleSaveEditOrder}>
                            <h3 className="text-lg font-bold mb-4">Editar Pedido #{editingOrderId}</h3>
                            <p className="text-sm text-orange-700 mb-4 bg-orange-50 border border-orange-200 rounded p-3">
                                Podés cambiar el pedido completo o modificar uno o más productos.
                            </p>

                            {editOrderForm.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-center mb-2">
                                    <div className="col-span-6">
                                        <Select
                                            options={productOptions}
                                            value={productOptions.find(opt => opt.value === item.productId)}
                                            onChange={selectedOption => updateEditItem(index, 'product', selectedOption)}
                                            placeholder="Buscar y seleccionar producto..."
                                            isClearable
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateEditItem(index, 'quantity', e.target.value)}
                                            placeholder="Cant."
                                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md sm:text-sm"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            readOnly
                                            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md sm:text-sm"
                                        />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <span>${safeToFixed(round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}</span>
                                    </div>
                                    <div className="col-span-1">
                                        {editOrderForm.items.length > 1 && (
                                            <button type="button" onClick={() => removeEditItem(index)} className="text-red-500 hover:text-red-700">
                                                &#x274C;
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <button type="button" onClick={addEditItem} className="mt-2 text-indigo-600 hover:text-indigo-900">
                                &#x2795; Agregar Producto
                            </button>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Notas</label>
                                <textarea
                                    value={editOrderForm.notes}
                                    onChange={e => setEditOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm resize-none"
                                />
                            </div>

                            <PaymentDifferencePanel
                                paidTotal={editOrderForm.paidTotal}
                                newTotal={calculateEditOrderTotal()}
                            />

                            <div className="mt-4 text-right font-bold text-lg">
                                Nuevo total del pedido: ${safeToFixed(calculateEditOrderTotal())}
                            </div>

                            <div className="mt-6 flex justify-end space-x-4">
                                <button type="button" className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded" onClick={closeEditOrder}>
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
                                    Guardar cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDelivery && (
                <ConfirmDeliveryModal
                    orderId={confirmDelivery.orderId}
                    onConfirm={() => {
                        applyStatusUpdate(confirmDelivery.orderId, confirmDelivery.newStatus);
                        setConfirmDelivery(null);
                    }}
                    onCancel={() => setConfirmDelivery(null)}
                />
            )}

            {exitEnCambio && (
                <ExitEnCambioModal
                    order={exitEnCambio.order}
                    newStatus={exitEnCambio.newStatus}
                    onConfirm={() => {
                        applyStatusUpdate(exitEnCambio.order.id, exitEnCambio.newStatus);
                        setExitEnCambio(null);
                    }}
                    onCancel={() => setExitEnCambio(null)}
                />
            )}
        </div>
    );
};

export default Pedidos;