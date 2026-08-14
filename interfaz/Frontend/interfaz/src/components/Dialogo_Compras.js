import React, { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';

const DialogoCompras = ({ 
    isOpen, 
    onClose, 
    inventory = [], 
    suppliers = [], 
    userRole,
    onSubmit,
    externalWindow,
    setExternalWindow
}) => {
    const [purchaseData, setPurchaseData] = useState({
        date: new Date().toISOString().split('T')[0],
        selectedSuppliers: [],
        items: []
    });
    const [message, setMessage] = useState('');
    const [itemsToAdd, setItemsToAdd] = useState(1);

    // Si no está abierto, no renderizamos nada
    if (!isOpen && !externalWindow) return null;

    // Función unificada para actualizar items con validación de enteros
    const updateItem = (itemId, field, value) => {
        setPurchaseData(prev => {
            const updatedItems = prev.items.map(item => {
                if (item.id !== itemId) return item;

                let updates = { [field]: value };

                // Lógica de validación: Restricción de enteros si la unidad es 'u'
                if (field === 'quantity') {
                    let parsedQty = parseFloat(value) || 0;
                    if (item.unit === 'u' || updates.unit === 'u') {
                        parsedQty = Math.floor(parsedQty);
                    }
                    updates.quantity = parsedQty;
                }

                // Lógica para cambio de producto
                if (field === 'productName') {
                    const product = inventory.find(p => p.name.toLowerCase() === value.toLowerCase());
                    if (product) {
                        const newUnit = mapBackendUnitToFrontend(product.unit);
                        updates.unit = newUnit;
                        updates.unitPrice = product.price || 0;
                        updates.isExisting = true;
                        if (updates.unit === 'u') updates.quantity = Math.floor(item.quantity || 0);
                    } else {
                        updates.isExisting = false;
                    }
                }

                // Si cambian a unidad manual 'u', redondear cantidad actual
                if (field === 'unit' && value === 'u') {
                    updates.quantity = Math.floor(item.quantity || 0);
                }

                const newItem = { ...item, ...updates };
                newItem.total = (parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unitPrice) || 0);
                return newItem;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const mapBackendUnitToFrontend = (backendUnit) => {
        switch (backendUnit) {
            case 'g': return 'kg';
            case 'ml': return 'l';
            case 'unidades': return 'u';
            default: return 'u';
        }
    };

    const productOptions = inventory.map(p => ({ 
        value: p.name, 
        label: `${p.name} (${mapBackendUnitToFrontend(p.unit)})` 
    }));

    const handleAddItem = () => {
        const newItems = Array.from({ length: itemsToAdd }).map(() => ({
            id: Date.now() + Math.random(),
            productName: '',
            quantity: 1,
            unit: 'u',
            unitPrice: 0,
            total: 0
        }));
        setPurchaseData(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
    };

    const toggleSupplier = (supplierId) => {
        setPurchaseData(prev => ({
            ...prev,
            selectedSuppliers: prev.selectedSuppliers.includes(supplierId)
                ? prev.selectedSuppliers.filter(id => id !== supplierId)
                : [...prev.selectedSuppliers, supplierId]
        }));
    };

    const totalAmount = purchaseData.items.reduce((sum, item) => sum + (item.total || 0), 0);

    const handleConfirm = () => {
        setMessage('');
        
        if (!purchaseData.date) {
            setMessage('Por favor, ingrese una fecha.');
            return;
        }
        
        if (purchaseData.selectedSuppliers.length === 0) {
            setMessage('Por favor, seleccione al menos un proveedor.');
            return;
        }

        if (purchaseData.items.length === 0) {
            setMessage('Debe agregar al menos un producto a la compra.');
            return;
        }

        const hasInvalidItems = purchaseData.items.some(item => !item.productName || item.quantity <= 0);
        if (hasInvalidItems) {
            setMessage('Complete todos los productos y asegúrese de que las cantidades sean mayores a 0.');
            return;
        }

        onSubmit({
            date: purchaseData.date,
            supplierIds: purchaseData.selectedSuppliers,
            items: purchaseData.items,
            totalAmount: totalAmount
        });
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
                
                {/* Cabecera del Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 m-0">
                        {userRole === 'Encargado' ? 'Solicitar Nueva Compra' : 'Registrar Nueva Compra'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* Cuerpo del Modal (Scrolleable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {message && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold border border-red-200">
                            {message}
                        </div>
                    )}

                    {/* Controles: Fecha y Proveedores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Fecha *</label>
                            <input 
                                type="date" 
                                value={purchaseData.date} 
                                onChange={(e) => setPurchaseData({...purchaseData, date: e.target.value})} 
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Proveedores *</label>
                            <div className="flex flex-wrap gap-2">
                                {suppliers.map(sup => {
                                    const isSelected = purchaseData.selectedSuppliers.includes(sup.id);
                                    return (
                                        <label 
                                            key={sup.id} 
                                            className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 transition-all select-none ${isSelected ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={isSelected} 
                                                onChange={() => toggleSupplier(sup.id)}
                                            />
                                            {sup.name}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Control para agregar Filas */}
                    <div className="flex items-center gap-3 mb-4">
                        <input 
                            type="number" 
                            min="1" 
                            max="50" 
                            value={itemsToAdd} 
                            onChange={(e) => setItemsToAdd(Math.max(1, parseInt(e.target.value) || 1))} 
                            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:border-blue-500" 
                        />
                        <button 
                            onClick={handleAddItem} 
                            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                            </svg>
                            Agregar Filas
                        </button>
                    </div>

                    {/* Tabla de Insumos */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                                <tr>
                                    <th className="py-3 px-4 w-5/12">Producto/Insumo</th>
                                    <th className="py-3 px-4 text-center w-2/12">Cantidad</th>
                                    <th className="py-3 px-4 text-center w-1/12">Unidad</th>
                                    <th className="py-3 px-4 text-right w-2/12">Precio Unit.</th>
                                    <th className="py-3 px-4 text-right w-2/12">Total</th>
                                    <th className="py-3 px-4 text-center w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {purchaseData.items.map((item) => {
                                    const isUnit = item.unit === 'u';
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 px-4">
                                                <CreatableSelect
                                                    options={productOptions}
                                                    value={item.productName ? { value: item.productName, label: item.productName } : null}
                                                    onChange={(selected) => updateItem(item.id, 'productName', selected ? selected.value : '')}
                                                    formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`}
                                                    isClearable
                                                    placeholder="Buscar o escribir nuevo..."
                                                    styles={{
                                                        control: (base) => ({ ...base, minHeight: '38px', fontSize: '14px', borderRadius: '0.5rem' })
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2.5 px-4">
                                                <input
                                                    type="number"
                                                    value={item.quantity === 0 ? '' : item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                    min={isUnit ? "1" : "0.01"}
                                                    step={isUnit ? "1" : "0.01"}
                                                    placeholder="0"
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <select
                                                    value={item.unit}
                                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                    disabled={item.isExisting}
                                                    className={`w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none ${item.isExisting ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
                                                >
                                                    <option value="u">u</option>
                                                    <option value="kg">kg</option>
                                                    <option value="l">l</option>
                                                </select>
                                            </td>
                                            <td className="py-2.5 px-4">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                    onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-bold text-slate-800 text-sm">
                                                ${(item.total || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <button 
                                                    onClick={() => setPurchaseData(prev => ({...prev, items: prev.items.filter(i => i.id !== item.id)}))}
                                                    className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                                                    title="Eliminar fila"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        {/* Mensaje de tabla vacía */}
                        {purchaseData.items.length === 0 && (
                            <div className="p-10 text-center text-slate-400 bg-slate-50/50">
                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                </svg>
                                No hay productos en esta compra. Usa el botón "Agregar Filas" arriba para comenzar.
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie del Modal */}
                <div className="p-6 border-t border-slate-200 bg-white flex items-center justify-between">
                    <div>
                        <span className="text-slate-500 text-sm font-medium uppercase tracking-wide block mb-1">Total de la Compra</span>
                        <div className="text-2xl font-black text-blue-600">${totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-3 rounded-xl font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm} 
                            className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                            </svg>
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DialogoCompras;
