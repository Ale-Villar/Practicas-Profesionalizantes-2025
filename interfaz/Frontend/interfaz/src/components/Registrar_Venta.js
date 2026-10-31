import React, { useState, useEffect } from 'react';
import api, { getApiErrorMessage } from '../services/api';

const Registrar_Venta = ({ products, loadProducts, loadCashMovements, isCashRegisterClosed = false }) => {
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([
        { method: 'efectivo', amount: '' }
    ]);
    const [message, setMessage] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    
    // Estados de filtros
    const [stockComparator, setStockComparator] = useState('');
    const [stockValue, setStockValue] = useState('');
    const [priceComparator, setPriceComparator] = useState('');
    const [priceValue, setPriceValue] = useState('');

    const compareValues = (productValue, filterValue, comparator) => {
        const pVal = parseFloat(productValue);
        const fVal = parseFloat(filterValue);
        
        switch(comparator) {
            case 'gt': return pVal > fVal;
            case 'gte': return pVal >= fVal;
            case 'lt': return pVal < fVal;
            case 'lte': return pVal <= fVal;
            case 'eq': return pVal === fVal;
            default: return true;
        }
    };

    const availableProducts = products.filter(product => {
        if (product.category !== 'Producto' || product.stock <= 0) return false;
        if (searchTerm !== '' && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        
        if (stockComparator && stockValue !== '') {
            if (!compareValues(product.stock, stockValue, stockComparator)) return false;
        }
        if (priceComparator && priceValue !== '') {
            if (!compareValues(product.price, priceValue, priceComparator)) return false;
        }
        return true;
    });

    const addProductToCart = (product) => {
        if (product.stock <= 0) {
            setMessage('No hay stock disponible para este producto.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.product.id === product.id);
            if (existingItem) {
                const newQuantity = existingItem.quantity + 1;
                if (newQuantity > product.stock) {
                    setMessage(`No hay suficiente stock de ${product.name}. Stock disponible: ${product.stock}`);
                    setTimeout(() => setMessage(''), 3000);
                    return prevItems;
                }
                return prevItems.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            } else {
                return [...prevItems, { product: product, quantity: 1 }];
            }
        });
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity === '' || Number.isNaN(parseInt(newQuantity, 10)) || parseInt(newQuantity, 10) <= 0) {
            removeFromCart(productId);
            return;
        }

        const product = products.find(p => p.id === productId);
        const parsedQuantity = parseInt(newQuantity, 10);

        if (parsedQuantity > product.stock) {
            setMessage(`No puedes vender más de ${product.stock} unidades de ${product.name}.`);
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setCartItems(prevItems =>
            prevItems.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: parsedQuantity }
                    : item
            )
        );
    };

    const handleQuantityInputChange = (product, value) => {
        if (value === '') {
            updateQuantity(product.id, '');
            return;
        }

        const integerValue = value.replace(/\D/g, '');
        if (integerValue === '') {
            updateQuantity(product.id, '');
            return;
        }

        updateQuantity(product.id, integerValue);
    };

    const getCartQuantity = (productId) => {
        const item = cartItems.find(cartItem => cartItem.product.id === productId);
        return item ? item.quantity : 0;
    };

    const removeFromCart = (productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
    };

    useEffect(() => {
        const newTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        setTotal(newTotal);
    }, [cartItems]);

    const addPaymentMethod = () => {
        setPaymentMethods([...paymentMethods, { method: 'efectivo', amount: '' }]);
    };

    const updatePaymentMethod = (index, field, value) => {
        const updated = [...paymentMethods];
        updated[index][field] = value;
        setPaymentMethods(updated);
    };

    const removePaymentMethod = (index) => {
        if (paymentMethods.length > 1) {
            setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
        }
    };

    const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    const totalPaid = paymentMethods.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0);
    const cashPaid = paymentMethods.reduce((sum, pm) => pm.method === 'efectivo' ? sum + (parseFloat(pm.amount) || 0) : sum, 0);
    const remaining = round2(total - totalPaid);
    const change = round2(Math.max(0, totalPaid - total));
    const canConfirmSale = !isCashRegisterClosed && cartItems.length > 0 && remaining <= 0 && (change <= 0.01 || cashPaid >= change - 0.01);

    const clearCart = () => {
        setCartItems([]);
        setPaymentMethods([{ method: 'efectivo', amount: '' }]);
        setMessage('');
    };

    const handleConfirmSale = async () => {
        if (cartItems.length === 0) {
            setMessage('El carrito está vacío.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const invalidPayments = paymentMethods.filter(pm => !pm.amount || parseFloat(pm.amount) <= 0);
        if (invalidPayments.length > 0) {
            setMessage('Todos los medios de pago deben tener un monto válido.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const roundedRemaining = round2(total - totalPaid);
        const roundedChange = round2(Math.max(0, totalPaid - total));

        if (roundedRemaining > 0.01) {
            setMessage(`Faltan: $${roundedRemaining.toFixed(2)}. El total debe estar completo.`);
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        if (roundedRemaining < -0.01 && cashPaid < roundedChange - 0.01) {
            setMessage('Para dar vuelto, el pago en efectivo debe cubrir el cambio.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        if (roundedChange > 0.01 && cashPaid < roundedChange - 0.01) {
            setMessage('Para dar vuelto, el pago en efectivo debe cubrir el cambio.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const saleItems = cartItems.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            price: item.product.price
        }));

        try {
            await api.post('/sales/', {
                total_amount: total,
                payment_method: paymentMethods.map(pm => pm.method).join(', '),
                items: saleItems
            });

            const itemsForThisMethod = cartItems.map(item =>
                `${item.product.name} x${item.quantity} @${item.product.price}`
            ).join(', ');

            let remainingChange = change;

            for (const pm of paymentMethods) {
                const tenderedAmount = parseFloat(pm.amount) || 0;
                const settledAmount = pm.method === 'efectivo' && remainingChange > 0
                    ? Math.max(0, tenderedAmount - remainingChange)
                    : tenderedAmount;

                if (pm.method === 'efectivo' && remainingChange > 0) {
                    remainingChange = Math.max(0, remainingChange - tenderedAmount);
                }

                await api.post('/cash-movements/', {
                    type: 'Entrada',
                    amount: settledAmount,
                    description: `Venta: ${itemsForThisMethod}`,
                    payment_method: pm.method
                });
            }

            await loadProducts();
            if (loadCashMovements) await loadCashMovements();

            setMessage('✅ Venta registrada exitosamente');
            setTimeout(() => {
                clearCart();
            }, 2000);
        } catch (err) {
            console.error('Error registrando venta:', err);
            setMessage(`❌ ${getApiErrorMessage(err, 'No se pudo registrar la venta en el servidor.')}`);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-1 md:p-2">
            {isCashRegisterClosed && (
                <div className="mb-3 p-3 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                    La caja está cerrada: no se pueden registrar ventas hasta que un Gerente, Encargado o Cajero la abra.
                </div>
            )}
            {message && (
                <div className={`mb-3 p-3 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="w-full mx-auto px-1 sm:px-2">
                {/* En celulares y tablets chicas el total va arriba, en el flujo normal.
                    A partir de 1100px queda al costado y se pega al hacer scroll, sin tapar la tabla. */}
                <div className="flex flex-col min-[1100px]:flex-row min-[1100px]:items-start gap-3">
                    
                    <div className="w-full min-w-0 min-[1100px]:w-80 min-[1100px]:shrink-0 min-[1100px]:sticky min-[1100px]:top-2 min-[1100px]:z-20 min-[1100px]:max-h-[calc(100vh-1rem)] min-[1100px]:overflow-y-auto space-y-3">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-gray-800">🔍 Filtros</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowFilters(prev => !prev)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        {showFilters ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>

                                {showFilters && (
                                    <>
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                                            <select
                                                value={stockComparator}
                                                onChange={(e) => setStockComparator(e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                                            >
                                                <option value="">Sin filtro</option>
                                                <option value="gt">Mayor que</option>
                                                <option value="gte">Mayor o igual</option>
                                                <option value="lt">Menor que</option>
                                                <option value="lte">Menor o igual</option>
                                                <option value="eq">Igual a</option>
                                            </select>
                                            {stockComparator && (
                                                <input
                                                    type="number"
                                                    value={stockValue}
                                                    onChange={(e) => setStockValue(e.target.value)}
                                                    placeholder="Cantidad"
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Precio</label>
                                            <select
                                                value={priceComparator}
                                                onChange={(e) => setPriceComparator(e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                                            >
                                                <option value="">Sin filtro</option>
                                                <option value="gt">Mayor que</option>
                                                <option value="gte">Mayor o igual</option>
                                                <option value="lt">Menor que</option>
                                                <option value="lte">Menor o igual</option>
                                                <option value="eq">Igual a</option>
                                            </select>
                                            {priceComparator && (
                                                <input
                                                    type="number"
                                                    value={priceValue}
                                                    onChange={(e) => setPriceValue(e.target.value)}
                                                    placeholder="Monto"
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setStockComparator('');
                                                setStockValue('');
                                                setPriceComparator('');
                                                setPriceValue('');
                                            }}
                                            className="w-full py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Limpiar filtros
                                        </button>
                                    </>
                                )}
                            </div>

                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-gray-800">Total</h3>
                                <button onClick={clearCart} className="text-red-600 hover:text-red-700 text-sm font-medium">
                                    Limpiar carrito
                                </button>
                            </div>

                            <div className="border-t-2 border-gray-300 pt-3 mb-4">
                                <div className="flex justify-between items-center text-xl font-bold">
                                    <span>Total</span>
                                    <span className="text-black">${total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-gray-700">Desglose de Pago</h4>
                                    <button onClick={addPaymentMethod} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                        + Agregar medio
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {paymentMethods.map((pm, index) => (
                                        <div key={index} className="flex flex-wrap gap-2 items-center">
                                            <select
                                                value={pm.method}
                                                onChange={(e) => updatePaymentMethod(index, 'method', e.target.value)}
                                                className="min-w-0 flex-1 basis-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            >
                                                <option value="efectivo">Efectivo</option>
                                                <option value="debito">Débito</option>
                                                <option value="credito">Crédito</option>
                                                <option value="transferencia">Transferencia</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={pm.amount}
                                                onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                                                placeholder="Monto"
                                                className="w-full min-[420px]:w-28 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                            {paymentMethods.length > 1 && (
                                                <button onClick={() => removePaymentMethod(index)} className="text-red-500 hover:text-red-700">
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 text-sm space-y-1">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Total a pagar:</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Total ingresado:</span>
                                        <span>${totalPaid.toFixed(2)}</span>
                                    </div>
                                    <div className={`flex justify-between font-bold ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                                        <span>{remaining > 0 ? 'Faltan:' : remaining < 0 ? 'Vuelto:' : 'Completo:'}</span>
                                        <span>${Math.abs(remaining).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmSale}
                                disabled={!canConfirmSale}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors duration-200"
                            >
                                ✅ Confirmar Venta
                            </button>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 w-full space-y-2">
                        <div className="bg-white rounded-lg shadow-md p-2 w-full">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="🔍 Buscar producto..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
                            <div className="overflow-x-auto min-[1100px]:max-h-[calc(100vh-9rem)] min-[1100px]:overflow-y-auto">
                                <table className="w-full min-w-[34rem] table-fixed text-left border-collapse">
                                    <thead className="bg-slate-100 border-b-2 border-slate-200 text-xs uppercase text-slate-600 font-semibold sticky top-0 z-10 [&_th]:overflow-hidden">
                                        <tr>
                                            <th className="py-3 px-2 w-20 text-center text-[11px] leading-tight">Marcar</th>
                                            <th className="py-3 px-2 sm:px-4">Producto</th>
                                            <th className="py-3 px-2 sm:px-3 w-28 sm:w-36 text-right leading-tight">Precio por unidad</th>
                                            <th className="py-3 px-2 sm:px-3 w-24 sm:w-28 text-center leading-tight">Cantidad</th>
                                            <th className="py-3 px-2 sm:px-3 w-20 text-center leading-tight">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {availableProducts.map(product => {
                                            const isInCart = getCartQuantity(product.id) > 0;
                                            const cartQuantity = getCartQuantity(product.id);
                                            return (
                                                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-2.5 px-2 sm:px-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isInCart}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    addProductToCart(product);
                                                                } else {
                                                                    removeFromCart(product.id);
                                                                }
                                                            }}
                                                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-2 sm:px-4 font-medium text-slate-800 break-words">{product.name}</td>
                                                    <td className="py-2.5 px-2 sm:px-4 text-right font-bold text-slate-700">${product.price}</td>
                                                    <td className="py-2.5 px-2 sm:px-4 text-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={cartQuantity}
                                                            onChange={(e) => handleQuantityInputChange(product, e.target.value)}
                                                            className="w-full max-w-24 px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-2 sm:px-4 text-center text-slate-500">{parseInt(product.stock, 10)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {availableProducts.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">No hay productos disponibles</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Registrar_Venta;