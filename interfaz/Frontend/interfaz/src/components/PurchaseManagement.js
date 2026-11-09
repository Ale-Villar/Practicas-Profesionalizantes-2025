import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import api, { getApiErrorMessage } from '../services/api';
import { formatMoney } from '../utils/format';
import { productsForSuppliers, productLabel, suppliersForProduct } from '../utils/supplierCatalog';
import PurchaseRequests from './PurchaseRequests';
import PurchaseHistory from './PurchaseHistory';
import DialogoCompras from './Dialogo_Compras';
import SearchableSelect, { portalSelectProps, portalMenuStyle } from './SearchableSelect';

const PurchaseManagement = ({ userRole, inventory = [], suppliers = [], products = [], purchases = [], reloadPurchases, reloadProducts, loadCashBalance }) => {
    const [pendingPurchases, setPendingPurchases] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [view, setView] = useState('requests'); // 'requests', 'history', or 'create'
    const [message, setMessage] = useState('');
    const [showAddPurchase, setShowAddPurchase] = useState(false);
    const [showConfirmPurchase, setShowConfirmPurchase] = useState(false); // Confirmación para registrar compra
    const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
    const [newPurchase, setNewPurchase] = useState({
        date: '',
        supplierId: '', // Legacy - mantener para compatibilidad
        selectedSupplierIds: [], // Nuevo: array de IDs de proveedores seleccionados
        items: [] // Array de items con id único para sistema de tarjetas
    });
    const [itemsToAdd, setItemsToAdd] = useState(1);
    
    // Estados para el diálogo en pantallas grandes
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const [showDialog, setShowDialog] = useState(false);
    const [externalWindow, setExternalWindow] = useState(null);

    // Manejar resize de pantalla
    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Determinar si usar diálogo (pantallas >= 1100px)
    const useDialogMode = screenWidth >= 926;

    // Función para mapear unidades del backend al frontend - DEBE estar antes de productOptions
    const mapBackendUnitToFrontend = (backendUnit) => {
        switch (backendUnit) {
            case 'g':
                return 'kg';
            case 'ml':
                return 'l';
            case 'unidades':
                return 'u';
            default:
                return 'u';
        }
    };

    // Opciones para react-select con unidad incluida
    const catalogProducts = newPurchase.selectedSupplierIds.length
        ? productsForSuppliers(inventory, suppliers, newPurchase.selectedSupplierIds)
        : (inventory || []);
    const productOptions = catalogProducts.map(product => ({
        value: product.id,
        label: productLabel(product),
        unit: mapBackendUnitToFrontend(product.unit),
        price: product.price
    }));

    const fetchPendingPurchases = async () => {
        try {
            console.log('Fetching pending purchases...');
            const response = await api.get('/purchases/pending-approval/');
            console.log('Pending purchases response:', response.data);
            setPendingPurchases(response.data);
        } catch (error) {
            console.error('Error fetching pending purchases:', error);
            // setMessage('Error al cargar las solicitudes de compra.');
        }
    };

    const fetchPurchaseHistory = async () => {
        try {
            console.log('Fetching purchase history...');
            const response = await api.get('/purchases/history/');
            console.log('Purchase history response:', response.data);
            setPurchaseHistory(response.data);
        } catch (error) {
            console.error('Error fetching purchase history:', error);
            setMessage('Error al cargar el historial de compras.');
        }
    };

    // Función para agregar nuevos items (tarjetas) a la compra
    const addItems = (count = 1) => {
        const validCount = Math.max(1, Math.min(100, parseInt(count) || 1));
        const newItems = Array(validCount).fill(null).map(() => ({
            id: Date.now() + Math.random(),
            productId: '',
            productName: '',
            supplierId: '',
            quantity: 1,
            unit: 'u',
            unitPrice: 0,
            total: 0,
            isExisting: false,
            itemKind: ''
        }));
        setNewPurchase(prev => ({
            ...prev,
            items: [...prev.items, ...newItems]
        }));
    };

    // Función para eliminar un item de la compra por id
    const removeItem = (itemId) => {
        setNewPurchase(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== itemId)
        }));
    };

    // Función para actualizar un item por id
    const updateItem = (itemId, field, value) => {
        setNewPurchase(prev => {
            const updatedItems = prev.items.map(item => {
                if (item.id !== itemId) return item;

                let updates = { [field]: value };

                if (field === 'productId' || field === 'productName') {
                    const product = field === 'productId'
                        ? inventory.find(p => Number(p.id) === Number(value))
                        : inventory.find(p => String(p.name || '').toLowerCase() === String(value || '').trim().toLowerCase());
                    if (product) {
                        const linked = suppliersForProduct(suppliers, product.id);
                        const selectedIds = prev.selectedSupplierIds.map(Number);
                        const sellers = selectedIds.length
                            ? linked.filter(supplier => selectedIds.includes(Number(supplier.id)))
                            : linked;
                        updates.productName = product.name;
                        updates.productId = product.id;
                        updates.unit = mapBackendUnitToFrontend(product.unit);
                        updates.unitPrice = product.price || 0;
                        updates.stock = Number(product.stock) || 0;
                        updates.isExisting = true;
                        updates.itemKind = '';
                        updates.supplierId = sellers.length === 1
                            ? sellers[0].id
                            : (sellers.some(supplier => Number(supplier.id) === Number(item.supplierId)) ? item.supplierId : '');
                    } else if (String(value || '').trim()) {
                        updates.productId = '';
                        updates.productName = String(value).trim();
                        updates.stock = 0;
                        updates.isExisting = false;
                    } else {
                        updates.productName = '';
                        updates.productId = '';
                        updates.isExisting = false;
                        updates.itemKind = '';
                        updates.stock = 0;
                        updates.supplierId = '';
                        updates.unit = 'u';
                        updates.unitPrice = 0;
                    }
                }

                const newItem = { ...item, ...updates };
                
                // Recalcular total
                if (field === 'quantity' || field === 'unitPrice' || field === 'productId' || field === 'productName') {
                    const qty = parseFloat(newItem.quantity) || 0;
                    const price = parseFloat(newItem.unitPrice) || 0;
                    newItem.total = qty * price;
                }

                return newItem;
            });

            return {
                ...prev,
                selectedSupplierIds: field === 'supplierId' && value
                    ? Array.from(new Set([...prev.selectedSupplierIds.map(Number), Number(value)]))
                    : prev.selectedSupplierIds,
                items: updatedItems,
            };
        });
    };

    // Función para calcular el total de la compra
    const calculatePurchaseTotal = () => {
        return newPurchase.items.reduce((sum, item) => sum + item.total, 0);
    };

    const handleAddPurchase = async (e) => {
        e.preventDefault();

        // Validaciones (las mismas que antes)
        if (!newPurchase.date) {
            setMessage('Por favor, ingrese una fecha.');
            return;
        }

        if (newPurchase.items.length === 0) {
            setMessage('Agregá al menos un producto o insumo a la orden.');
            return;
        }

        // Cada ítem lleva el proveedor que lo vende: con eso se arma una compra por proveedor
        const hasInvalidItems = newPurchase.items.some(item =>
            !String(item.productName || '').trim() || !item.supplierId || item.quantity <= 0 || (!item.isExisting && !item.itemKind)
        );

        if (hasInvalidItems) {
            setMessage('Elegí el producto o escribí uno nuevo, indicá si es producto o insumo, el proveedor y una cantidad mayor a cero.');
            return;
        }

        // Mostrar modal de confirmación (más visible)
        setShowConfirmPurchase(true);
    };

    // Confirmar registro de compra (ejecuta la petición)
    const confirmAddPurchase = async () => {
        setShowConfirmPurchase(false);
        try {
            // Obtener los IDs de proveedores (soportar tanto legacy como nuevo formato)
            const groups = new Map();
            newPurchase.items.forEach(item => {
                const key = String(item.supplierId);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(item);
            });

            for (const [supplierId, items] of groups) {
                const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                const purchaseData = {
                    date: newPurchase.date,
                    supplier_id: parseInt(supplierId, 10),
                    items: items.map(item => ({
                        product_id: item.productId || null,
                        productName: item.productName,
                        quantity: parseFloat(item.quantity),
                        unit: item.unit,
                        unitPrice: parseFloat(item.unitPrice),
                        total: parseFloat(item.total),
                        itemKind: item.itemKind || ''
                    })),
                    total_amount: totalAmount,
                };

                console.log('Enviando datos de compra:', purchaseData);
                const response = await api.post('/purchases/', purchaseData);
                console.log('Respuesta del servidor:', response.data);
            }

            setMessage('');
            setShowPurchaseSuccess(true);

            // Limpiar el formulario
            setNewPurchase({
                date: '',
                supplierId: '',
                selectedSupplierIds: [],
                items: []
            });
            setItemsToAdd(1);

            // Recargar las compras
            if (userRole === 'Gerente') {
                fetchPurchaseHistory();
            } else {
                fetchPendingPurchases();
            }
            if (reloadProducts) {
                reloadProducts();
            }
        } catch (error) {
            console.error('Error al registrar la compra:', error);
            setMessage(getApiErrorMessage(error, 'Error al registrar la compra. Por favor, intente nuevamente.'));
        }
    };

    // Función para cancelar la confirmación de compra
    const handleCancelPurchase = () => {
        setShowConfirmPurchase(false);
        setMessage('');
    };

    const handlePurchaseDeleted = async () => {
        await fetchPurchaseHistory();
        if (reloadProducts) await reloadProducts();
        if (loadCashBalance) await loadCashBalance();
    };

    useEffect(() => {
        // Establecer la vista inicial basada en el rol
        if (userRole === 'Encargado') {
            setView('create');
        } else {
            setView('requests');
        }
    }, [userRole]);

    useEffect(() => {
        if (userRole === 'Gerente') {
            fetchPendingPurchases();
        }
        fetchPurchaseHistory();
    }, [userRole]);

    const handleApprove = async (purchaseId) => {
        try {
            console.log('Approving purchase:', purchaseId);
            await api.post(`/purchases/${purchaseId}/approve/`);
            console.log('Purchase approved successfully');
            setMessage('Compra aprobada con éxito.');
            // Actualizar la lista de compras pendientes (la compra aprobada ya no debería aparecer)
            setPendingPurchases(prev => {
                const filtered = prev.filter(p => p.id !== purchaseId);
                console.log('Updated pending purchases:', filtered);
                return filtered;
            });
            // Recargar el historial para mostrar la compra aprobada
            fetchPurchaseHistory();
            // Limpiar el mensaje después de 3 segundos
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error approving purchase:', error);
            setMessage(getApiErrorMessage(error, 'Error al aprobar la compra.'));
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleReject = async (purchaseId) => {
        try {
            console.log('Rejecting purchase:', purchaseId);
            await api.post(`/purchases/${purchaseId}/reject/`);
            console.log('Purchase rejected successfully');
            setMessage('Compra rechazada y eliminada con éxito.');
            // Actualizar la lista de compras pendientes (la compra rechazada ya no debería aparecer)
            setPendingPurchases(prev => {
                const filtered = prev.filter(p => p.id !== purchaseId);
                console.log('Updated pending purchases after rejection:', filtered);
                return filtered;
            });
            // Limpiar el mensaje después de 3 segundos
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error rejecting purchase:', error);
            setMessage('Error al rechazar la compra.');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Manejar submit desde el diálogo
    const handleDialogSubmit = async (purchaseData) => {
        try {
            // Por cada proveedor seleccionado, crear una compra
            const groups = new Map();
            purchaseData.items.forEach(item => {
                const key = String(item.supplierId);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(item);
            });

            for (const [supplierId, items] of groups) {
                const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                const data = {
                    date: purchaseData.date,
                    supplier_id: parseInt(supplierId, 10),
                    items: items.map(item => ({
                        product_id: item.productId || null,
                        productName: item.productName,
                        quantity: parseFloat(item.quantity),
                        unit: item.unit,
                        unitPrice: parseFloat(item.unitPrice),
                        total: parseFloat(item.total),
                        itemKind: item.itemKind || ''
                    })),
                    total_amount: totalAmount,
                };

                console.log('Enviando datos de compra desde diálogo:', data);
                await api.post('/purchases/', data);
            }

            setMessage('');
            setShowPurchaseSuccess(true);

            setShowDialog(false);
            
            // Cerrar ventana externa si existe
            if (externalWindow && !externalWindow.closed) {
                externalWindow.close();
            }
            setExternalWindow(null);

            // Recargar las compras
            if (userRole === 'Gerente') {
                fetchPurchaseHistory();
            } else {
                fetchPendingPurchases();
            }
            if (reloadProducts) {
                reloadProducts();
            }
        } catch (error) {
            console.error('Error al registrar la compra desde diálogo:', error);
            throw error;
        }
    };

    // Cerrar diálogo
    const handleCloseDialog = () => {
        setShowDialog(false);
        if (externalWindow && !externalWindow.closed) {
            externalWindow.close();
        }
        setExternalWindow(null);
    };

    return (
        <div className="purchase-management-container">
            <h2>Gestión de Compras</h2>
            {message && <p className="message">{message}</p>}

            {/* Modal de confirmación para registrar compra */}
            {showConfirmPurchase && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
                    <div className="bg-white p-5 rounded-lg w-[90%] max-w-[480px] shadow-xl">
                        <h3 className="mt-0">Confirmar registro de compra</h3>
                        <p>¿Estás seguro que deseas {userRole === 'Gerente' ? 'registrar esta compra' : 'enviar esta solicitud de compra'}?</p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={confirmAddPurchase} className="action-button primary">Confirmar</button>
                            <button onClick={handleCancelPurchase} className="action-button secondary">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {showPurchaseSuccess && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="purchase-success-title"
                    onKeyDown={e => { if (e.key === 'Escape') setShowPurchaseSuccess(false); }}
                >
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border-t-8 border-green-500 p-6 sm:p-8 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
                            <span className="text-5xl font-bold leading-none text-green-600" aria-hidden="true">✓</span>
                        </div>
                        <h3 id="purchase-success-title" className="mt-0 mb-6 text-2xl font-bold text-gray-800">
                            {userRole === 'Gerente' ? 'Compra registrada con éxito' : 'Solicitud de compra registrada con éxito'}
                        </h3>
                        <button
                            type="button"
                            autoFocus
                            onClick={() => setShowPurchaseSuccess(false)}
                            className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-lg font-bold text-white"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            <div className="purchase-tabs-container flex flex-wrap gap-1 xs:gap-1.5 sm:gap-2 mb-4 p-1 bg-slate-100 rounded-xl">
                <button
                    className={`purchase-tab-btn flex-1 min-w-[90px] px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        view === 'create'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'bg-transparent text-slate-600 hover:bg-white/50 hover:text-slate-800'
                    }`}
                    onClick={() => setView('create')}
                >
                    {userRole === 'Encargado' ? 'Solicitar Compra' : 'Crear Compra'}
                </button>
                {userRole === 'Gerente' && (
                    <button
                        className={`purchase-tab-btn flex-1 min-w-[90px] px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                            view === 'requests'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'bg-transparent text-slate-600 hover:bg-white/50 hover:text-slate-800'
                        }`}
                        onClick={() => setView('requests')}
                    >
                        <span className="hidden xs:inline">Solicitudes Pendientes</span>
                        <span className="xs:hidden">Pendientes</span>
                    </button>
                )}
                <button
                    className={`purchase-tab-btn flex-1 min-w-[90px] px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        view === 'history'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'bg-transparent text-slate-600 hover:bg-white/50 hover:text-slate-800'
                    }`}
                    onClick={() => setView('history')}
                >
                    <span className="hidden xs:inline">Historial de Compras</span>
                    <span className="xs:hidden">Historial</span>
                </button>
            </div>

            {view === 'create' ? (
                <>
                    {/* Diálogo para pantallas >= 926px */}
                    {useDialogMode && (
                        <div className="relative min-h-[600px]">
                            {!showDialog && !externalWindow ? (
                                <div className="flex flex-col items-center justify-center py-15 px-5 text-center">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6">
                                        <svg width="40" height="40" fill="none" stroke="white" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-3">
                                        {userRole === 'Encargado' ? 'Solicitar Nueva Compra' : 'Registrar Nueva Compra'}
                                    </h3>
                                    <p className="text-slate-500 mb-6 max-w-[400px]">
                                        Haz clic en el botón para abrir el formulario de compra. 
                                        Podrás agregar múltiples productos y seleccionar proveedores.
                                    </p>
                                    <button
                                        onClick={() => setShowDialog(true)}
                                        className="px-7 py-3.5 border-none rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white cursor-pointer text-base font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
                                    >
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                                        </svg>
                                        Abrir Formulario de Compra
                                    </button>
                                </div>
                            ) : null}
                            
                            <DialogoCompras
                                isOpen={showDialog}
                                onClose={handleCloseDialog}
                                inventory={inventory}
                                suppliers={suppliers}
                                userRole={userRole}
                                onSubmit={handleDialogSubmit}
                                externalWindow={externalWindow}
                                setExternalWindow={setExternalWindow}
                            />
                        </div>
                    )}

                    {/* Formulario del diálogo, incrustado en pantallas < 926px */}
                    {!useDialogMode && (
                        <DialogoCompras
                            isEmbedded
                            isOpen
                            onClose={() => {}}
                            inventory={inventory}
                            suppliers={suppliers}
                            userRole={userRole}
                            onSubmit={handleDialogSubmit}
                            externalWindow={externalWindow}
                            setExternalWindow={setExternalWindow}
                        />
                    )}
                </>
            ) : view === 'requests' ? (
                <PurchaseRequests
                    purchases={pendingPurchases}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    userRole={userRole}
                />
            ) : (
                <PurchaseHistory 
                    purchases={purchaseHistory} 
                    onPurchaseDeleted={handlePurchaseDeleted}
                    userRole={userRole}
                    inventory={inventory}
                    suppliers={suppliers}
                />
            )}
        </div>
    );
};

export default PurchaseManagement;
