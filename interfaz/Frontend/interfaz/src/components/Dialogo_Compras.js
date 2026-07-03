import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import api from '../services/api';

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
                        updates.unit = mapBackendUnitToFrontend(product.unit);
                        updates.unitPrice = product.price || 0;
                        updates.isExisting = true;
                        if (updates.unit === 'u') updates.quantity = Math.floor(item.quantity);
                    } else {
                        updates.isExisting = false;
                    }
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

    // ... (rest of the component logic) ...

    return (
        <div className="dialog-container">
            {/* Tabla de Insumos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        <tr>
                            <th className="py-3 px-4">Producto/Insumo</th>
                            <th className="py-3 px-4 text-center">Cantidad</th>
                            <th className="py-3 px-4 text-center">Unidad</th>
                            <th className="py-3 px-4 text-right">Precio Unit.</th>
                            <th className="py-3 px-4 text-right">Total</th>
                            <th className="py-3 px-4 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {purchaseData.items.map((item) => {
                            const isUnit = item.unit === 'u';
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-4">
                                        <Select
                                            options={productOptions}
                                            value={item.productName ? { value: item.productName, label: item.productName } : null}
                                            onChange={(selected) => updateItem(item.id, 'productName', selected ? selected.value : '')}
                                            isClearable
                                        />
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                            min={isUnit ? "1" : "0.01"}
                                            step={isUnit ? "1" : "0.01"}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm text-center"
                                        />
                                    </td>
                                    <td className="py-2.5 px-4 text-center text-sm">{item.unit}</td>
                                    <td className="py-2.5 px-4">
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm text-right"
                                        />
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 text-sm">
                                        ${(item.total || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                        <button onClick={() => setPurchaseData(prev => ({...prev, items: prev.items.filter(i => i.id !== item.id)}))}>
                                            X
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DialogoCompras;
