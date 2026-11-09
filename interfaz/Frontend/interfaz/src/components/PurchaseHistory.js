import React, { useEffect, useRef, useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { nameOptions, productNameOptions, sameName } from '../utils/filterOptions';
import { formatMoney } from '../utils/format';
import api, { getApiErrorMessage } from '../services/api';

const tabButtonClass = (active, color) =>
    `flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active ? color : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

const PurchaseHistory = ({ purchases = [], onPurchaseDeleted, userRole, inventory = [], suppliers = [], isWindowMode = false }) => {
    const [purchasesIdFilter, setPurchasesIdFilter] = useState('');
    const [purchasesIdFilterOp, setPurchasesIdFilterOp] = useState('equals');
    const [purchasesSupplierFilter, setPurchasesSupplierFilter] = useState('');
    const [purchasesTotalFilter, setPurchasesTotalFilter] = useState('');
    const [purchasesTotalFilterOp, setPurchasesTotalFilterOp] = useState('equals');
    const [purchasesDateFrom, setPurchasesDateFrom] = useState('');
    const [purchasesDateTo, setPurchasesDateTo] = useState('');
    const [purchasesProductFilter, setPurchasesProductFilter] = useState('');
    const [purchasesQuantityFilter, setPurchasesQuantityFilter] = useState('');
    const [purchasesQuantityFilterOp, setPurchasesQuantityFilterOp] = useState('equals');
    const [purchasesQuantityUnit, setPurchasesQuantityUnit] = useState('Kg');
    const [isLargeScreen, setIsLargeScreen] = useState(() => window.innerWidth >= 1200);
    const [screenWidth, setScreenWidth] = useState(() => window.innerWidth);
    const [leftPanelWidth, setLeftPanelWidth] = useState(400);
    const isResizingPanel = useRef(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(true);
    const [dialogState, setDialogState] = useState({ x: 70, y: 90, width: 1100, height: 700, minimized: false, maximized: false });
    const dialogRef = useRef(null);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [historyError, setHistoryError] = useState('');
    const [purchaseToDelete, setPurchaseToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [windowPurchases, setWindowPurchases] = useState([]);
    const [windowInventory, setWindowInventory] = useState([]);
    const [windowSuppliers, setWindowSuppliers] = useState([]);
    const [windowRole, setWindowRole] = useState(userRole);
    const historyPurchases = isWindowMode ? windowPurchases : purchases;
    const historyInventory = isWindowMode ? windowInventory : inventory;
    const historySuppliers = isWindowMode ? windowSuppliers : suppliers;
    const historyRole = isWindowMode ? (windowRole || userRole) : userRole;

    const loadWindowData = async () => {
        const [historyResponse, productResponse, supplierResponse, meResponse] = await Promise.all([
            api.get('/purchases/history/'),
            api.get('/products/'),
            api.get('/suppliers/'),
            api.get('/users/me/'),
        ]);
        const asList = (data) => Array.isArray(data) ? data : (data?.results || []);
        setWindowPurchases(asList(historyResponse.data));
        setWindowInventory(asList(productResponse.data));
        setWindowSuppliers(asList(supplierResponse.data));
        const role = meResponse.data?.role;
        setWindowRole(role?.name || role || null);
    };

    useEffect(() => {
        if (!isWindowMode) return;
        loadWindowData().catch(() => setHistoryError('No se pudo cargar el historial de compras.'));
    }, [isWindowMode]);

    useEffect(() => {
        const checkWidth = () => {
            setIsLargeScreen(window.innerWidth >= 1200);
            setScreenWidth(window.innerWidth);
            setDialogState(prev => {
                if (prev.maximized) return prev;
                const next = clampDialog(prev.x, prev.y, prev.minimized ? 380 : prev.width, prev.minimized ? 48 : prev.height);
                if (prev.minimized) {
                    if (next.x === prev.x && next.y === prev.y) return prev;
                    return { ...prev, x: next.x, y: next.y };
                }
                if (next.x === prev.x && next.y === prev.y && next.width === prev.width && next.height === prev.height) return prev;
                return { ...prev, x: next.x, y: next.y, width: next.width, height: next.height };
            });
        };
        checkWidth();
        window.addEventListener('resize', checkWidth);
        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    const navBottom = () => {
        const nav = document.querySelector('nav.navbar');
        return nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    };

    const clampDialog = (x, y, width, height) => {
        const topLimit = navBottom();
        const w = Math.min(Math.max(420, width), window.innerWidth);
        const h = Math.min(Math.max(240, height), Math.max(240, window.innerHeight - topLimit));
        return {
            x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w)),
            y: Math.min(Math.max(topLimit, y), Math.max(topLimit, window.innerHeight - h)),
            width: w,
            height: h,
        };
    };

    const startDrag = (event) => {
        if (dialogState.maximized || event.target.closest('button')) return;
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = dialogState.x;
        const originY = dialogState.y;
        const onMove = (moveEvent) => {
            setDialogState(prev => {
                const width = prev.minimized ? 380 : prev.width;
                const height = prev.minimized ? 48 : prev.height;
                const next = clampDialog(originX + moveEvent.clientX - startX, originY + moveEvent.clientY - startY, width, height);
                return { ...prev, x: next.x, y: next.y };
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const startResize = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const originW = dialogState.width;
        const originH = dialogState.height;
        const onMove = (moveEvent) => {
            setDialogState(prev => {
                const next = clampDialog(prev.x, prev.y, originW + moveEvent.clientX - startX, originH + moveEvent.clientY - startY);
                return { ...prev, width: next.width, height: next.height, x: next.x, y: next.y };
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const getResponsiveConfig = () => {
        if (screenWidth >= 3840) return { leftPanelExtra: 1700, isLargeScreen: true };
        if (screenWidth >= 3440) return { leftPanelExtra: 1680, isLargeScreen: true };
        if (screenWidth >= 3200) return { leftPanelExtra: 1640, isLargeScreen: true };
        if (screenWidth >= 3000) return { leftPanelExtra: 1611, isLargeScreen: true };
        if (screenWidth >= 2800) return { leftPanelExtra: 1050, isLargeScreen: true };
        if (screenWidth >= 2600) return { leftPanelExtra: 1000, isLargeScreen: true };
        if (screenWidth >= 2500) return { leftPanelExtra: 950, isLargeScreen: true };
        if (screenWidth >= 2400) return { leftPanelExtra: 900, isLargeScreen: true };
        if (screenWidth >= 2300) return { leftPanelExtra: 800, isLargeScreen: true };
        if (screenWidth >= 2200) return { leftPanelExtra: 700, isLargeScreen: true };
        if (screenWidth >= 2100) return { leftPanelExtra: 650, isLargeScreen: true };
        if (screenWidth >= 2000) return { leftPanelExtra: 500, isLargeScreen: true };
        return { leftPanelExtra: 0, isLargeScreen: false };
    };

    const startPanelResize = (event) => {
        event.preventDefault();
        event.stopPropagation();
        isResizingPanel.current = true;
        const onMove = (moveEvent) => {
            if (!isResizingPanel.current) return;
            const rect = dialogRef.current?.getBoundingClientRect();
            const fullBleed = isWindowMode || dialogState.maximized;
            const containerWidth = rect ? rect.width : (fullBleed ? window.innerWidth : dialogState.width);
            const responsive = getResponsiveConfig();
            const limits = responsive.isLargeScreen
                ? { min: containerWidth * 0.3, max: containerWidth * 0.7 }
                : { min: 200, max: Math.min(600, Math.max(200, containerWidth - 200)) };
            const containerLeft = rect ? rect.left : 0;
            const nextWidth = Math.max(limits.min, Math.min(limits.max, moveEvent.clientX - containerLeft));
            const extra = fullBleed ? responsive.leftPanelExtra : 0;
            setLeftPanelWidth(Math.max(0, nextWidth - extra));
        };
        const onUp = () => {
            isResizingPanel.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const openInNewWindow = () => {
        const url = `${window.location.origin}${window.location.pathname}?view=purchase-history-window`;
        window.open(url, '_blank', 'width=1200,height=800');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    };

    const getUnitName = (unit) => {
        switch (String(unit || '').toLowerCase()) {
            case 'kg':
            case 'g':
                return 'Kilogramo';
            case 'l':
            case 'ml':
                return 'Litro';
            default:
                return 'Unidad';
        }
    };

    const getPriceLabel = (unit) => `Precio por ${getUnitName(unit)}`;

    const quantityText = (quantity, unit) => {
        const name = getUnitName(unit);
        const amount = Number(quantity);
        if (name === 'Unidad') return `${quantity} ${amount === 1 ? 'Unidad' : 'Unidades'}`;
        return `${quantity} ${amount === 1 ? name : `${name}s`}`;
    };

    const normalizedPurchases = (historyPurchases || []).map(purchase => {
        const itemsArray = Array.isArray(purchase.items) ? purchase.items.map(it => {
            const productName = it.productName || it.product_name || it.product || it.name || '';
            const productId = it.productId ?? it.product_id ?? null;
            const quantity = it.quantity ?? it.qty ?? 0;
            const unitPrice = it.unitPrice ?? it.unit_price ?? it.price ?? 0;
            const total = it.total ?? it.totalAmount ?? ((quantity ?? 0) * (unitPrice ?? 0));
            const unit = it.unit || 'u';
            let category = it.category || it.type || it.productCategory || it.product_category || it.itemKind || '';
            if ((!category || String(category).trim() === '') && (productName || productId)) {
                const found = (historyInventory || []).find(product =>
                    (productId != null && Number(product.id) === Number(productId)) ||
                    (product?.name && productName && String(product.name).toLowerCase() === String(productName).toLowerCase())
                );
                if (found) category = found.type || found.category || (found.is_ingredient ? 'Insumo' : '');
            }
            return { productId, productName, quantity, unitPrice, total, category, unit };
        }) : [];

        const detectedTypes = Array.from(new Set(itemsArray.map(item => String(item.category || '').toLowerCase()).filter(Boolean)));
        let purchaseType = 'Producto';
        if (detectedTypes.length === 1) {
            purchaseType = detectedTypes[0].includes('insumo') ? 'Insumo' : 'Producto';
        } else if (detectedTypes.length > 1) {
            purchaseType = 'Mixto';
        }

        return {
            id: purchase.id,
            date: purchase.created_at || purchase.date,
            approvedAt: purchase.approved_at || purchase.created_at || purchase.date,
            supplier: purchase.supplier_name || purchase.supplier || '',
            supplierId: purchase.supplier_id,
            items: itemsArray,
            total: Number(purchase.total_amount ?? purchase.total ?? 0),
            type: purchaseType,
            approvedBy: purchase.approved_by_name || 'N/A',
            isActive: purchase.is_active !== false,
            deletionReason: purchase.deletion_reason || '',
        };
    });

    const supplierOptions = nameOptions([
        ...(historySuppliers || []).map(supplier => supplier.name),
        ...normalizedPurchases.map(purchase => purchase.supplier),
    ]);
    const productOptions = productNameOptions(historyInventory, {
        extraNames: normalizedPurchases.flatMap(purchase => purchase.items.map(item => item.productName)),
    });

    let filteredPurchases = normalizedPurchases;

    if (purchasesDateFrom || purchasesDateTo) {
        filteredPurchases = filteredPurchases.filter(purchase => {
            if (!purchase.date) return false;
            const purchaseDate = new Date(purchase.date);
            if (isNaN(purchaseDate.getTime())) return false;
            purchaseDate.setHours(0, 0, 0, 0);
            if (purchasesDateFrom) {
                const [year, month, day] = purchasesDateFrom.split('-');
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0);
                if (purchaseDate < startDate) return false;
            }
            if (purchasesDateTo) {
                const [year, month, day] = purchasesDateTo.split('-');
                const endDate = new Date(year, month - 1, day);
                endDate.setHours(0, 0, 0, 0);
                if (purchaseDate > endDate) return false;
            }
            return true;
        });
    }

    if (purchasesIdFilter.trim()) {
        filteredPurchases = filteredPurchases.filter(purchase => {
            const purchaseId = Number(purchase.id);
            const filterId = Number(purchasesIdFilter);
            switch (purchasesIdFilterOp) {
                case 'lt': return purchaseId < filterId;
                case 'lte': return purchaseId <= filterId;
                case 'gt': return purchaseId > filterId;
                case 'gte': return purchaseId >= filterId;
                default: return purchaseId === filterId;
            }
        });
    }

    if (purchasesSupplierFilter) {
        filteredPurchases = filteredPurchases.filter(purchase => sameName(purchase.supplier, purchasesSupplierFilter));
    }

    if (purchasesTotalFilter.trim()) {
        filteredPurchases = filteredPurchases.filter(purchase => {
            const purchaseTotal = Number(purchase.total) || 0;
            const filterTotal = Number(purchasesTotalFilter) || 0;
            switch (purchasesTotalFilterOp) {
                case 'lt': return purchaseTotal < filterTotal;
                case 'lte': return purchaseTotal <= filterTotal;
                case 'gt': return purchaseTotal > filterTotal;
                case 'gte': return purchaseTotal >= filterTotal;
                default: return purchaseTotal === filterTotal;
            }
        });
    }

    if (purchasesProductFilter) {
        filteredPurchases = filteredPurchases.filter(purchase =>
            purchase.items.some(item => sameName(item.productName, purchasesProductFilter))
        );
    }

    if (purchasesQuantityFilter.trim()) {
        filteredPurchases = filteredPurchases.filter(purchase => purchase.items.some(item => {
            const foundProduct = historyInventory.find(product =>
                product?.name && String(product.name).toLowerCase() === String(item.productName || '').toLowerCase()
            );
            if (foundProduct) {
                const productUnit = foundProduct.unit;
                const unitMatches = (
                    (purchasesQuantityUnit === 'Kg' && productUnit === 'g') ||
                    (purchasesQuantityUnit === 'L' && productUnit === 'ml') ||
                    (purchasesQuantityUnit === 'U' && productUnit !== 'g' && productUnit !== 'ml')
                );
                if (!unitMatches) return false;
            } else if (purchasesQuantityUnit !== 'U') {
                return false;
            }
            const itemQuantity = Number(item.quantity) || 0;
            const filterQuantity = Number(purchasesQuantityFilter);
            switch (purchasesQuantityFilterOp) {
                case 'greater': return itemQuantity > filterQuantity;
                case 'greaterOrEqual': return itemQuantity >= filterQuantity;
                case 'less': return itemQuantity < filterQuantity;
                case 'lessOrEqual': return itemQuantity <= filterQuantity;
                default: return itemQuantity === filterQuantity;
            }
        }));
    }

    const kindOf = (item) => {
        const category = String(item.category || '').toLowerCase();
        if (category.includes('insumo')) return 'insumo';
        if (category.includes('producto')) return 'producto';
        return '';
    };

    const sortedPurchases = [...filteredPurchases].sort((a, b) => new Date(b.date) - new Date(a.date));
    const visiblePurchases = sortedPurchases.filter(purchase => {
        if (activeTab === 'insumos') return purchase.items.some(item => kindOf(item) === 'insumo');
        if (activeTab === 'productos') return purchase.items.some(item => kindOf(item) === 'producto');
        return true;
    });
    const visibleKey = visiblePurchases.map(purchase => purchase.id).join(',');

    useEffect(() => {
        const ids = visibleKey ? visibleKey.split(',').map(id => Number(id)) : [];
        setSelectedId(current => {
            if (current != null && ids.includes(Number(current))) return current;
            return isLargeScreen ? (ids[0] ?? null) : null;
        });
    }, [visibleKey, isLargeScreen]);

    const selectedPurchase = visiblePurchases.find(purchase => Number(purchase.id) === Number(selectedId)) || null;

    const activeFiltersCount = [
        purchasesIdFilter, purchasesSupplierFilter, purchasesTotalFilter, purchasesProductFilter,
        purchasesQuantityFilter, purchasesDateFrom, purchasesDateTo,
    ].filter(Boolean).length;

    const openDelete = (purchase) => {
        setDeleteReason('');
        setDeleteError('');
        setPurchaseToDelete(purchase);
    };

    const confirmDelete = async (event) => {
        event.preventDefault();
        const reason = deleteReason.trim();
        if (!purchaseToDelete || !reason) {
            setDeleteError('El motivo de la eliminación es obligatorio.');
            return;
        }
        setDeleting(true);
        setDeleteError('');
        try {
            await api.post(`/purchases/${purchaseToDelete.id}/eliminar/`, { reason });
            if (isWindowMode) {
                await loadWindowData();
            } else if (onPurchaseDeleted) {
                await onPurchaseDeleted();
            }
            setPurchaseToDelete(null);
            setDeleteReason('');
        } catch (error) {
            setDeleteError(getApiErrorMessage(error, 'No se pudo eliminar la compra.'));
        } finally {
            setDeleting(false);
        }
    };

    const renderFilters = () => (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex flex-wrap items-end gap-2 mb-3">
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-medium text-slate-600">ID:</label>
                        <select value={purchasesIdFilterOp} onChange={e => setPurchasesIdFilterOp(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-300 rounded bg-white">
                            <option value="equals">=</option>
                            <option value="lt">&lt;</option>
                            <option value="lte">≤</option>
                            <option value="gt">&gt;</option>
                            <option value="gte">≥</option>
                        </select>
                        <input type="number" value={purchasesIdFilter} onChange={e => setPurchasesIdFilter(e.target.value)} placeholder="ID" className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded" />
                    </div>
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-medium text-slate-600">Proveedor:</label>
                        <div className="w-52">
                            <SearchableSelect options={supplierOptions} value={purchasesSupplierFilter} onChange={setPurchasesSupplierFilter} placeholder="Elegir proveedor..." />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-medium text-slate-600">Total:</label>
                        <select value={purchasesTotalFilterOp} onChange={e => setPurchasesTotalFilterOp(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-300 rounded bg-white">
                            <option value="equals">=</option>
                            <option value="lt">&lt;</option>
                            <option value="lte">≤</option>
                            <option value="gt">&gt;</option>
                            <option value="gte">≥</option>
                        </select>
                        <input type="number" step="0.01" value={purchasesTotalFilter} onChange={e => setPurchasesTotalFilter(e.target.value)} placeholder="Total" className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded" />
                    </div>
                    <div className="flex items-center gap-1">
                        <label className="text-xs font-medium text-slate-600">Cantidad:</label>
                        <select value={purchasesQuantityFilterOp} onChange={e => setPurchasesQuantityFilterOp(e.target.value)} className="px-2 py-1 text-sm border border-slate-300 rounded bg-white">
                            <option value="equals">=</option>
                            <option value="greater">&gt;</option>
                            <option value="greaterOrEqual">≥</option>
                            <option value="less">&lt;</option>
                            <option value="lessOrEqual">≤</option>
                        </select>
                        <input type="number" value={purchasesQuantityFilter} onChange={e => setPurchasesQuantityFilter(e.target.value)} className="w-20 px-2 py-1 text-sm border border-slate-300 rounded" />
                        <select value={purchasesQuantityUnit} onChange={e => setPurchasesQuantityUnit(e.target.value)} className="px-2 py-1 text-sm border border-slate-300 rounded bg-white">
                            <option value="Kg">Kg</option>
                            <option value="L">L</option>
                            <option value="U">U</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1 flex-1 min-w-[220px]">
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Buscar Producto/Insumo</label>
                        <div className="flex-1 min-w-[160px]">
                            <SearchableSelect options={productOptions} value={purchasesProductFilter} onChange={setPurchasesProductFilter} placeholder="Elegir producto o insumo..." />
                        </div>
                    </div>
                </div>
                <div className="border-t border-slate-200 pt-3">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-600 mb-1 block uppercase">Desde</label>
                            <input type="date" value={purchasesDateFrom} onChange={e => setPurchasesDateFrom(e.target.value)} className="w-full max-w-full min-w-0 px-2 py-1.5 text-sm border border-slate-300 rounded" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-600 mb-1 block uppercase">Hasta</label>
                            <input type="date" value={purchasesDateTo} onChange={e => setPurchasesDateTo(e.target.value)} className="w-full max-w-full min-w-0 px-2 py-1.5 text-sm border border-slate-300 rounded" />
                        </div>
                    </div>
                </div>
        </div>
    );

    const renderTabs = () => (
        <div className="flex gap-1">
            <button type="button" onClick={() => setActiveTab('all')} className={tabButtonClass(activeTab === 'all', 'bg-blue-600 text-white')}>Todos</button>
            <button type="button" onClick={() => setActiveTab('insumos')} className={tabButtonClass(activeTab === 'insumos', 'bg-amber-600 text-white')}>Insumos</button>
            <button type="button" onClick={() => setActiveTab('productos')} className={tabButtonClass(activeTab === 'productos', 'bg-green-600 text-white')}>Productos</button>
        </div>
    );

    const renderFicha = (purchase) => {
        if (!purchase) {
            return (
                <div className="h-full flex items-center justify-center text-slate-400 p-6 text-center">
                    Seleccioná una compra para ver el detalle
                </div>
            );
        }
        if (!purchase.isActive) {
            return (
                <div className="p-4 sm:p-6 h-full flex flex-col gap-4">
                    <span className="shrink-0 w-fit bg-slate-800 text-white px-3 py-2 rounded-lg font-mono text-lg font-bold">#{purchase.id}</span>
                    <div>
                        <div className="text-xs uppercase font-bold text-red-700 mb-1">Motivo de la eliminación</div>
                        <p className="text-base text-slate-800 whitespace-pre-wrap">{purchase.deletionReason || 'Sin motivo'}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 sm:p-6 h-full flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <span className="shrink-0 bg-slate-800 text-white px-3 py-2 rounded-lg font-mono text-lg font-bold">#{purchase.id}</span>
                    <div className="flex-1 min-w-0 space-y-3">
                        {purchase.items.map((item, index) => (
                            <div key={`${item.productId || item.productName}-${index}`} className="border-b border-slate-100 pb-3">
                                <div className="font-semibold text-slate-800">{item.productName}</div>
                                <div className="text-sm text-slate-600">
                                    {quantityText(item.quantity, item.unit)}
                                    <span className="mx-2 text-slate-300">·</span>
                                    {getPriceLabel(item.unit)}: {formatMoney(item.unitPrice || 0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="text-xs uppercase font-bold text-slate-400 mb-1">Aprobado por</div>
                    <div className="font-semibold text-slate-800">{purchase.approvedBy}</div>
                    <div className="text-slate-600">{formatDate(purchase.approvedAt)}</div>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-200 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="text-xs uppercase font-bold text-slate-400">Total</div>
                        <div className="text-2xl font-bold text-green-700">{formatMoney(purchase.total || 0)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase font-bold text-slate-400">Proveedor</div>
                        <div className="font-semibold text-slate-800">{purchase.supplier || 'Sin proveedor'}</div>
                    </div>
                </div>
                {historyRole === 'Gerente' && purchase.isActive && (
                    <button type="button" onClick={() => openDelete(purchase)} className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">
                        Eliminar
                    </button>
                )}
            </div>
        );
    };

    const renderListButton = (purchase, compact) => (
        <button
            type="button"
            onClick={() => setSelectedId(purchase.id)}
            className={`w-full text-left border-b border-slate-100 hover:bg-blue-50 ${
                Number(selectedId) === Number(purchase.id) ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
            } ${compact ? 'p-4' : 'px-3 py-3'}`}
        >
            {!purchase.isActive ? (
                <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-400">#{purchase.id}</div>
                    <div className="text-sm text-slate-800">{purchase.deletionReason || 'Sin motivo'}</div>
                </div>
            ) : (
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-400">#{purchase.id}</div>
                    <div className="font-semibold text-slate-800 truncate">{purchase.supplier || 'Sin proveedor'}</div>
                    <div className="text-xs text-slate-500 truncate">{purchase.items.map(item => item.productName).filter(Boolean).join(', ') || 'Sin ítems'}</div>
                </div>
                <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-700">{formatMoney(purchase.total || 0)}</div>
                    <div className="text-[11px] text-slate-400">{formatDate(purchase.date)}</div>
                </div>
            </div>
            )}
        </button>
    );

    const topLimit = navBottom();
    const dialogStyle = dialogState.maximized && !dialogState.minimized ? {
        position: 'fixed',
        left: 0,
        top: topLimit,
        width: '100vw',
        height: `calc(100vh - ${topLimit}px)`,
        zIndex: 1000,
    } : {
        position: 'fixed',
        left: dialogState.x,
        top: dialogState.y,
        width: dialogState.minimized ? 380 : dialogState.width,
        height: dialogState.minimized ? 48 : dialogState.height,
        zIndex: 1000,
    };

    const filterToggle = (
        <button
            type="button"
            onClick={() => setFiltersOpen(open => !open)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${filtersOpen || activeFiltersCount > 0 ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700'}`}
        >
            Filtros {filtersOpen ? 'Ocultar' : 'Mostrar'}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
        </button>
    );

    const purchaseList = (compact) => (
        visiblePurchases.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No hay compras en esta vista.</p>
        ) : visiblePurchases.map(purchase => (
            <div key={purchase.id} className={compact ? 'bg-white' : ''}>{renderListButton(purchase, compact)}</div>
        ))
    );

    const responsiveConfig = getResponsiveConfig();
    const fullBleed = isWindowMode || (dialogState.maximized && !dialogState.minimized);
    const dialogPixelWidth = fullBleed ? screenWidth : dialogState.width;
    const panelLimits = responsiveConfig.isLargeScreen
        ? { min: dialogPixelWidth * 0.3, max: dialogPixelWidth * 0.7 }
        : { min: 200, max: Math.min(600, Math.max(200, dialogPixelWidth - 200)) };
    const extraWidth = fullBleed ? responsiveConfig.leftPanelExtra : 0;
    const desiredPanelWidth = Math.max(
        leftPanelWidth + extraWidth,
        responsiveConfig.isLargeScreen && fullBleed ? 520 + extraWidth : leftPanelWidth
    );
    const panelWidth = Math.min(panelLimits.max, Math.max(panelLimits.min, desiredPanelWidth));

    const deleteModal = purchaseToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
            <form
                className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
                onSubmit={confirmDelete}
            >
                <p className="text-lg text-slate-800 mb-4">¿Estás seguro que deseas eliminar esta compra?</p>
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                    Motivo de la eliminación
                    <textarea
                        value={deleteReason}
                        onChange={event => setDeleteReason(event.target.value)}
                        required
                        rows={4}
                        autoFocus
                        disabled={deleting}
                        placeholder="Escribí por qué se elimina"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-normal focus:ring-2 focus:ring-red-500"
                    />
                </label>
                {deleteError && <p className="text-sm text-red-600 mb-4">{deleteError}</p>}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={() => { setPurchaseToDelete(null); setDeleteReason(''); setDeleteError(''); }}
                        className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={deleting || !deleteReason.trim()}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-60"
                    >
                        {deleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                </div>
            </form>
        </div>
    );

    const splitView = (
        <div className="flex flex-1 min-h-0">
            <div
                style={{ width: panelWidth, minWidth: panelLimits.min, maxWidth: panelLimits.max, flexShrink: 0 }}
                className="relative border-r border-slate-200 flex flex-col min-h-0 min-w-0 bg-white"
            >
                <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs text-slate-500">{visiblePurchases.length} compras</span>
                        {filterToggle}
                    </div>
                    {filtersOpen && (
                        <div className="max-h-[240px] overflow-y-auto mb-2">{renderFilters()}</div>
                    )}
                    {renderTabs()}
                </div>
                <div className="flex-1 overflow-y-auto">{purchaseList(false)}</div>
                <div
                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize bg-slate-200 hover:bg-blue-500 z-30"
                    onMouseDown={startPanelResize}
                />
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50">{renderFicha(selectedPurchase)}</div>
        </div>
    );

    if (isWindowMode) {
        return (
            <div ref={dialogRef} className="h-screen w-screen flex flex-col bg-white overflow-hidden">
                {historyError && <p className="px-4 py-2 text-sm text-red-600 bg-red-50">{historyError}</p>}
                {deleteModal}
                {isLargeScreen ? splitView : (
                    <div className="relative flex-1 min-h-0 overflow-hidden bg-slate-50">
                        <div className={`flex flex-col h-full ${selectedPurchase ? '-translate-x-full absolute inset-0' : ''}`}>
                            <div className="bg-white px-4 py-3 border-b border-slate-200 shrink-0">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="text-base font-bold text-slate-800">Historial de Compras</h3>
                                    {filterToggle}
                                </div>
                                {filtersOpen && (
                                    <div className="max-h-[240px] overflow-y-auto mb-3">{renderFilters()}</div>
                                )}
                                {renderTabs()}
                                <div className="text-xs text-slate-500 mt-2">{visiblePurchases.length} compras</div>
                            </div>
                            <div className="flex-1 overflow-y-auto">{purchaseList(true)}</div>
                        </div>
                        <div className={`absolute inset-0 bg-slate-50 flex flex-col z-20 transition-transform duration-300 ${selectedPurchase ? 'translate-x-0' : 'translate-x-full'}`}>
                            {selectedPurchase && (
                                <>
                                    <div className="bg-white px-3 py-3 border-b border-slate-200 flex items-center gap-2">
                                        <button type="button" onClick={() => setSelectedId(null)} className="px-2 py-1 text-slate-600 font-semibold">←</button>
                                        <span className="font-bold text-slate-800">Detalle de compra</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">{renderFicha(selectedPurchase)}</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="purchase-history-container">
            {historyError && <p className="px-4 py-2 text-sm text-red-600">{historyError}</p>}
            {deleteModal}
            {isLargeScreen ? (
                <>
                    {!dialogOpen && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Historial de Compras</h3>
                            <button
                                type="button"
                                onClick={() => setDialogOpen(true)}
                                className="px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg"
                            >
                                Abrir Historial de Compras
                            </button>
                        </div>
                    )}
                    {dialogOpen && (
                        <div ref={dialogRef} style={dialogStyle} className={`relative bg-white border-2 border-slate-300 flex flex-col overflow-hidden shadow-2xl ${dialogState.maximized && !dialogState.minimized ? 'rounded-none' : 'rounded-lg'}`}>
                            <div
                                className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between shrink-0 cursor-move select-none"
                                onMouseDown={startDrag}
                            >
                                <span className="font-bold text-sm">Historial de Compras</span>
                                <div className="flex items-center gap-1">
                                    {!isWindowMode && (
                                    <button
                                        type="button"
                                        title="Abrir en pestaña nueva"
                                        onClick={openInNewWindow}
                                        className="p-1.5 rounded hover:bg-slate-700"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </button>
                                    )}
                                    <button
                                        type="button"
                                        title={dialogState.minimized ? 'Restaurar' : 'Minimizar'}
                                        onClick={() => setDialogState(prev => ({ ...prev, minimized: !prev.minimized, maximized: false }))}
                                        className="p-1.5 rounded hover:bg-slate-700"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                    </button>
                                    <button
                                        type="button"
                                        title={dialogState.maximized ? 'Restaurar' : 'Maximizar'}
                                        onClick={() => setDialogState(prev => ({ ...prev, maximized: !prev.maximized, minimized: false }))}
                                        className="p-1.5 rounded hover:bg-slate-700"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                    </button>
                                    <button
                                        type="button"
                                        title="Cerrar"
                                        onClick={() => { setDialogOpen(false); setDialogState(prev => ({ ...prev, minimized: false, maximized: false })); }}
                                        className="p-1.5 rounded hover:bg-red-600"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                            {!dialogState.minimized && splitView}
                            {!dialogState.minimized && !dialogState.maximized && (
                                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={startResize} style={{ background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)' }} />
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="relative h-[700px] overflow-hidden border border-slate-200 rounded-xl bg-slate-50">
                    <div className={`flex flex-col h-full ${selectedPurchase ? '-translate-x-full absolute inset-0' : ''}`}>
                        <div className="bg-white px-4 py-3 border-b border-slate-200 shrink-0">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <h3 className="text-base font-bold text-slate-800">Historial de Compras</h3>
                                <div className="flex items-center gap-2">
                                    <button type="button" title="Abrir en pestaña nueva" onClick={openInNewWindow} className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </button>
                                    {filterToggle}
                                </div>
                            </div>
                            {filtersOpen && (
                                <div className="max-h-[240px] overflow-y-auto mb-3">{renderFilters()}</div>
                            )}
                            {renderTabs()}
                            <div className="text-xs text-slate-500 mt-2">{visiblePurchases.length} compras</div>
                        </div>
                        <div className="flex-1 overflow-y-auto">{purchaseList(true)}</div>
                    </div>
                    <div className={`absolute inset-0 bg-slate-50 flex flex-col z-20 transition-transform duration-300 ${selectedPurchase ? 'translate-x-0' : 'translate-x-full'}`}>
                        {selectedPurchase && (
                            <>
                                <div className="bg-white px-3 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <button type="button" onClick={() => setSelectedId(null)} className="px-2 py-1 text-slate-600 font-semibold">←</button>
                                    <span className="font-bold text-slate-800">Detalle de compra</span>
                                </div>
                                <div className="flex-1 overflow-y-auto">{renderFicha(selectedPurchase)}</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseHistory;
