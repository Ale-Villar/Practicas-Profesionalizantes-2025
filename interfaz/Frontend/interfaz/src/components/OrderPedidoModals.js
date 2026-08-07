import React from 'react';
import { safeToFixed } from '../utils/format';

export const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Suma ítems siempre como números (qty × precio), evita concatenación de strings */
export const calculateItemsTotal = (items) => round2(
    (items || []).reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0)
);

/** diferencia = total pagado − nuevo total (positivo = a favor del cliente) */
export const computePaymentDifference = (paidTotal, newTotal) =>
    round2(Number(paidTotal) - Number(newTotal));

export const PaymentDifferencePanel = ({ paidTotal, newTotal, difference: differenceProp }) => {
    const paid = Number(paidTotal) || 0;
    const nuevo = Number(newTotal) || 0;
    const difference = differenceProp != null
        ? Number(differenceProp)
        : computePaymentDifference(paid, nuevo);

    const diffLabel = difference > 0
        ? 'Saldo a favor del cliente'
        : difference < 0
            ? 'Saldo en contra del cliente'
            : 'Sin diferencia de pago';

    const diffColor = difference > 0
        ? 'text-green-700 bg-green-50 border-green-200'
        : difference < 0
            ? 'text-red-700 bg-red-50 border-red-200'
            : 'text-gray-700 bg-gray-50 border-gray-200';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Total pagado</p>
                <p className="text-lg font-bold text-gray-900">${safeToFixed(paid)}</p>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Nuevo total</p>
                <p className="text-lg font-bold text-gray-900">${safeToFixed(nuevo)}</p>
            </div>
            <div className={`p-2 rounded-md border ${diffColor}`}>
                <p className="text-xs font-semibold uppercase">{diffLabel}</p>
                <p className="text-lg font-bold">${safeToFixed(difference)}</p>
            </div>
        </div>
    );
};

export const ConfirmDeliveryModal = ({ orderId, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-60 flex items-center justify-center z-[70]">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmar entrega</h3>
            <p className="text-gray-700 mb-6">
                ¿Estás seguro que deseás marcar el pedido #{orderId} como entregado?
            </p>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-md"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md"
                >
                    Aceptar
                </button>
            </div>
        </div>
    </div>
);

export const ExitEnCambioModal = ({ order, newStatus, onConfirm, onCancel }) => {
    const paidTotal = Number(order.paidTotalAtChange ?? order.totalAmount) || 0;
    const newTotal = Number(order.totalAmount) || 0;
    const persistedDiff = order.paymentDifference;
    const difference = persistedDiff != null
        ? Number(persistedDiff)
        : computePaymentDifference(paidTotal, newTotal);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-60 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Salir de &quot;En cambio&quot;</h3>
                <p className="text-sm text-gray-600 mb-4">
                    El pedido #{order.id} pasará a &quot;{newStatus}&quot;. Revisá la diferencia de pago:
                </p>
                <PaymentDifferencePanel
                    paidTotal={paidTotal}
                    newTotal={newTotal}
                    difference={difference}
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-md"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};
