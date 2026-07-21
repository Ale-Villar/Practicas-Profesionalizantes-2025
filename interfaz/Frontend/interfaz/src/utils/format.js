const LOCALE = 'es-AR';

export const isCountUnit = (unit) => {
    if (!unit) return true;
    const normalized = String(unit).toLowerCase().trim();
    return ['u', 'unidad', 'unidades', 'uds', 'un', 'unid'].includes(normalized);
};

export const formatNumber = (value, options = {}) => {
    const {
        minimumFractionDigits = 0,
        maximumFractionDigits = 2,
    } = options;
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return new Intl.NumberFormat(LOCALE, {
            minimumFractionDigits,
            maximumFractionDigits,
        }).format(0);
    }
    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(num);
};

export const formatInteger = (value) =>
    formatNumber(Math.round(Number(value) || 0), {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

export const formatDecimal = (value, decimals = 2) =>
    formatNumber(Number(value) || 0, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

export const formatMoney = (value) => `$${formatDecimal(value, 2)}`;

export const safeToFixed = (value, decimals = 2) => formatDecimal(value, decimals);

export const parseLocaleDecimal = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(',', '.');
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : null;
};

export const isValidDecimalInput = (value) => value === '' || /^\d*(,\d*)?$/.test(value);

export const formatDecimalInput = (value, { maximumFractionDigits = 1, minimumFractionDigits = 0 } = {}) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return formatNumber(num, { minimumFractionDigits, maximumFractionDigits });
};

/** Cantidad de pérdida (almacenada en kg, L o unidades según lo ingresó el usuario) */
export const formatLossQuantity = (quantity, unit) => {
    const num = parseFloat(quantity) || 0;
    if (isCountUnit(unit)) {
        return `${formatInteger(num)} unid.`;
    }
    if (unit === 'g' || unit === 'gramos') {
        return `${formatNumber(num, { maximumFractionDigits: 3 })} Kg`;
    }
    if (unit === 'ml' || unit === 'mililitros') {
        return `${formatNumber(num, { maximumFractionDigits: 3 })} L`;
    }
    return formatDisplayQuantity(quantity, unit);
};

/** Stock del inventario (almacenado en g, ml o unidades base) */
export const formatStockWithUnit = (stock, unit) => {
    const stockNum = parseFloat(stock) || 0;

    if (isCountUnit(unit)) {
        return `${formatInteger(stockNum)}U`;
    }
    if (unit === 'g' || unit === 'gramos') {
        return `${formatNumber(stockNum / 1000, { maximumFractionDigits: 3 })}Kg`;
    }
    if (unit === 'ml' || unit === 'mililitros') {
        return `${formatNumber(stockNum / 1000, { maximumFractionDigits: 3 })}L`;
    }
    return `${formatNumber(stockNum)}${unit || ''}`;
};

/** Stock para dashboard con palabras completas: "2,5 kilos", "12 unid" */
export const formatStockDisplay = (stock, unit) => {
    const stockNum = parseFloat(stock);
    if (Number.isNaN(stockNum)) {
        return '0 unid';
    }

    if (isCountUnit(unit)) {
        return `${formatInteger(stockNum)} unid`;
    }
    if (unit === 'g' || unit === 'gramos' || unit === 'kg') {
        const value = unit === 'kg' ? stockNum : stockNum / 1000;
        return `${formatNumber(value, { maximumFractionDigits: 3 })} kilos`;
    }
    if (unit === 'ml' || unit === 'mililitros' || unit === 'l') {
        const value = unit === 'l' ? stockNum : stockNum / 1000;
        return `${formatNumber(value, { maximumFractionDigits: 3 })} litros`;
    }
    return `${formatNumber(stockNum)} ${unit || ''}`;
};

/** Cantidad ya en unidad de visualización (compras, recetas, etc.) */
export const formatDisplayQuantity = (quantity, unit, { withSuffix = true, longSuffix = false } = {}) => {
    const num = parseFloat(quantity) || 0;

    if (isCountUnit(unit)) {
        const formatted = formatInteger(num);
        if (!withSuffix) return formatted;
        return longSuffix ? `${formatted} unidades` : `${formatted} U`;
    }
    if (unit === 'g' || unit === 'gramos' || unit === 'kg') {
        const formatted = formatNumber(num, { maximumFractionDigits: 3 });
        if (!withSuffix) return formatted;
        return longSuffix ? `${formatted} kilos` : `${formatted} Kg`;
    }
    if (unit === 'ml' || unit === 'mililitros' || unit === 'l') {
        const formatted = formatNumber(num, { maximumFractionDigits: 3 });
        if (!withSuffix) return formatted;
        return longSuffix ? `${formatted} litros` : `${formatted} L`;
    }
    const formatted = formatNumber(num, { maximumFractionDigits: 3 });
    return withSuffix ? `${formatted} ${unit || ''}` : formatted;
};

export const formatCompraItemLine = (productName, quantity, unit) => {
    if (!productName) return '';
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return productName;
    return `${productName} ${formatDisplayQuantity(qty, unit)}`;
};

export const formatStockTotal = (value, unitSymbol) => {
    if (!value) return null;
    const formatted = unitSymbol === 'U'
        ? formatInteger(value)
        : formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${formatted}${unitSymbol}`;
};

/** Cantidad con conversión g→kg, ml→L para recetas */
export const formatQuantityWithConversion = (quantity, unit) => {
    const num = parseFloat(quantity) || 0;

    if (isCountUnit(unit)) {
        return `${formatInteger(num)} ${unit === 'unidades' ? 'unidades' : unit || 'U'}`;
    }
    if (unit === 'g') {
        if (num >= 1000) {
            return `${formatNumber(num, { maximumFractionDigits: 1 })} g (${formatNumber(num / 1000, { maximumFractionDigits: 2 })} kg)`;
        }
        return `${formatNumber(num, { maximumFractionDigits: 1 })} g`;
    }
    if (unit === 'ml') {
        if (num >= 1000) {
            return `${formatNumber(num, { maximumFractionDigits: 1 })} ml (${formatNumber(num / 1000, { maximumFractionDigits: 2 })} L)`;
        }
        return `${formatNumber(num, { maximumFractionDigits: 1 })} ml`;
    }
    return `${formatNumber(num, { maximumFractionDigits: 1 })} ${unit || ''}`;
};

export const formatThresholdDisplay = (threshold, unit) => {
    const thresholdNum = parseFloat(threshold) || 10;
    if (isCountUnit(unit)) {
        return formatInteger(thresholdNum);
    }
    if (unit === 'g' || unit === 'gramos') {
        return formatNumber(thresholdNum / 1000, { maximumFractionDigits: 3 });
    }
    if (unit === 'ml' || unit === 'mililitros') {
        return formatNumber(thresholdNum / 1000, { maximumFractionDigits: 3 });
    }
    return formatNumber(thresholdNum, { maximumFractionDigits: 3 });
};
