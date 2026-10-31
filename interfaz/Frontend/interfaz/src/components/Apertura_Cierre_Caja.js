import React, { useCallback, useEffect, useState } from 'react';
import { formatMovementDate } from '../utils/date';
import { formatMoney } from '../utils/format';
import api, { getCashRegisterSessions, getCashRegisterStatus, openCashRegister, closeCashRegister, resolveCashRegister, getApiErrorMessage } from '../services/api';

// Roles que pueden abrir y cerrar la caja (todos menos Panadero)
export const ROLES_APERTURA_CAJA = ['Gerente', 'Encargado', 'Cajero'];
// Cierran contando el efectivo a ciegas: el backend no les manda el efectivo que calcula el sistema
const ROLES_QUE_DECLARAN_EFECTIVO = ['Encargado', 'Cajero'];

const EstadoBadge = ({ isOpen }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
        {isOpen ? 'Abierta' : 'Cerrada'}
    </span>
);

const FilaMonto = ({ label, value, className = 'text-gray-800', destacado = false }) => (
    <div className="flex justify-between items-center gap-4">
        <dt className={`text-gray-600 ${destacado ? 'font-semibold' : ''}`}>{label}</dt>
        <dd className={`${className} ${destacado ? 'text-lg font-bold' : 'font-medium'}`}>{formatMoney(value)}</dd>
    </div>
);

const DiferenciaEfectivo = ({ value }) => {
    const diferencia = Number(value) || 0;
    if (diferencia === 0) {
        return <p className="mt-1 font-semibold text-green-700">Coincide con el efectivo calculado</p>;
    }
    return (
        <p className={`mt-1 font-semibold ${diferencia > 0 ? 'text-amber-700' : 'text-red-600'}`}>
            {diferencia > 0 ? `Sobran ${formatMoney(diferencia)}` : `Faltan ${formatMoney(-diferencia)}`}
        </p>
    );
};

const TurnoCard = ({ turno, numero, seesCash, onResolve, cashIsWhole = false }) => {
    const [editingAmount, setEditingAmount] = useState(false);
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [confirmConvalidate, setConfirmConvalidate] = useState(false);
    const [confirmEdit, setConfirmEdit] = useState(null);
    const difference = turno.cash_difference == null ? null : Number(turno.cash_difference);
    const canResolve = seesCash && !turno.is_open && difference != null && difference !== 0 && !turno.cash_resolution;

    const runResolve = async (payload) => {
        setBusy(true);
        setError('');
        try {
            await onResolve(turno.id, payload);
            setEditingAmount(false);
            setConfirmConvalidate(false);
            setConfirmEdit(null);
        } catch (resolveError) {
            setError(getApiErrorMessage(resolveError, 'No se pudo resolver el efectivo del cierre.'));
        } finally {
            setBusy(false);
        }
    };

    return (
    <div className="border border-gray-200 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-800">Turno {numero}</span>
            <EstadoBadge isOpen={turno.is_open} />
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Apertura</p>
                <p className="text-gray-700">{formatMovementDate(turno.opened_at)}</p>
                <p className="text-gray-600">por {turno.opened_by || 'usuario eliminado'}</p>
                <dl className="mt-1 space-y-1">
                    {seesCash && <FilaMonto label="Efectivo" value={turno.opening_cash} />}
                    <FilaMonto label="Total de dinero" value={turno.opening_balance} />
                </dl>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cierre</p>
                {turno.is_open ? (
                    <p className="text-green-700">Todavía abierta</p>
                ) : (
                    <>
                        <p className="text-gray-700">{formatMovementDate(turno.closed_at)}</p>
                        <p className="text-gray-600">por {turno.closed_by || 'usuario eliminado'}</p>
                        <dl className="mt-1 space-y-1">
                            {seesCash && <FilaMonto label="Efectivo" value={turno.closing_cash} />}
                            <FilaMonto label="Total de dinero" value={turno.closing_balance} />
                            {seesCash && turno.declared_closing_cash != null && (
                                <FilaMonto label="Efectivo declarado" value={turno.declared_closing_cash} />
                            )}
                            {seesCash && turno.validated_closing_cash != null && (
                                <FilaMonto
                                    label={turno.cash_resolution === 'convalidada' ? 'Efectivo convalidado' : 'Efectivo corregido'}
                                    value={turno.validated_closing_cash}
                                />
                            )}
                        </dl>
                        {seesCash && turno.cash_difference != null && <DiferenciaEfectivo value={turno.cash_difference} />}
                        {canResolve && (
                            <div className="mt-3 space-y-2">
                                {confirmConvalidate ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                                        <p className="text-xs text-amber-800 mb-2">
                                            El efectivo de la caja pasa a ser {formatMoney(turno.declared_closing_cash)}, el monto que declaró el empleado.
                                        </p>
                                        <div className="flex gap-2">
                                            <button type="button" disabled={busy} onClick={() => runResolve({ action: 'convalidar' })} className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold">Confirmar</button>
                                            <button type="button" disabled={busy} onClick={() => setConfirmConvalidate(false)} className="px-2 py-1 bg-slate-200 rounded text-xs font-semibold">Cancelar</button>
                                        </div>
                                    </div>
                                ) : editingAmount ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-600">
                                            {difference < 0
                                                ? 'Corregí cuánto falta de verdad. La caja se abre con el efectivo del sistema menos ese monto.'
                                                : 'Corregí cuánto sobra de verdad. La caja se abre con el efectivo del sistema más ese monto.'}
                                        </p>
                                        <input
                                            type="number"
                                            min="0"
                                            step={cashIsWhole ? '1' : '0.01'}
                                            value={amount}
                                            onChange={event => setAmount(event.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => {
                                                    const gap = Number(amount);
                                                    const base = Number(turno.closing_cash);
                                                    if (!Number.isFinite(gap) || gap < 0 || !Number.isFinite(base)) {
                                                        setError('Ingresá un monto de cero o más.');
                                                        return;
                                                    }
                                                    if (cashIsWhole && !Number.isInteger(gap)) {
                                                        setError('El efectivo tiene que ser un número entero.');
                                                        return;
                                                    }
                                                    const opening = difference < 0 ? base - gap : base + gap;
                                                    if (opening < 0) {
                                                        setError('La caja no puede abrirse con un monto negativo.');
                                                        return;
                                                    }
                                                    const normalized = cashIsWhole ? Math.round(opening) : Math.round(opening * 100) / 100;
                                                    setError('');
                                                    setConfirmEdit({ amount: normalized, shortage: difference < 0 });
                                                }}
                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                                            >
                                                Guardar
                                            </button>
                                            <button type="button" disabled={busy} onClick={() => { setEditingAmount(false); setConfirmEdit(null); setError(''); }} className="px-2 py-1 bg-slate-200 rounded text-xs font-semibold">Cancelar</button>
                                        </div>
                                        {confirmEdit && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                                                <p className="text-xs text-amber-800 mb-2">
                                                    {confirmEdit.shortage
                                                        ? '¿Estás seguro que desea editar el monto que falta?'
                                                        : '¿Estás seguro que desea editar el monto que sobra?'}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button type="button" disabled={busy} onClick={() => runResolve({ action: 'editar', amount: confirmEdit.amount })} className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold">Guardar</button>
                                                    <button type="button" disabled={busy} onClick={() => setConfirmEdit(null)} className="px-2 py-1 bg-slate-200 rounded text-xs font-semibold">Cancelar</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const gap = Math.abs(Number(turno.cash_difference) || 0);
                                                setAmount(String(cashIsWhole ? Math.round(gap) : gap));
                                                setEditingAmount(true);
                                                setError('');
                                            }}
                                            className="px-2 py-1 bg-slate-800 text-white rounded text-xs font-semibold"
                                        >
                                            Editar lo que falta o sobra
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setConfirmConvalidate(true); setError(''); }}
                                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                                        >
                                            Convalidar monto del empleado
                                        </button>
                                    </div>
                                )}
                                {error && <p className="text-xs text-red-600">{error}</p>}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
            {turno.movements_count} movimientos · Entradas {formatMoney(turno.total_entradas)} · Salidas {formatMoney(turno.total_salidas)}
        </p>
    </div>
    );
};

const Apertura_Cierre_Caja = ({ cashMovements = [], loadCashMovements, userRole }) => {
    const [cashRegister, setCashRegister] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // 'open' | 'close'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [historySessions, setHistorySessions] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMessage, setWithdrawMessage] = useState(null);
    const [withdrawing, setWithdrawing] = useState(false);
    const [declaredCash, setDeclaredCash] = useState('');
    const seesCash = userRole === 'Gerente';
    const mustDeclareCash = ROLES_QUE_DECLARAN_EFECTIVO.includes(userRole);

    const loadStatus = useCallback(async () => {
        try {
            const response = await getCashRegisterStatus();
            setCashRegister(response.data);
        } catch (error) {
            console.error('Error cargando el estado de la caja:', error);
        }
    }, []);

    useEffect(() => {
        loadStatus();
    }, [loadStatus, cashMovements]);

    const today = cashRegister?.today || '';
    const isToday = !selectedDate || selectedDate === today;

    useEffect(() => {
        if (isToday) {
            setHistorySessions(null);
            return undefined;
        }
        let cancelled = false;
        setHistoryLoading(true);
        getCashRegisterSessions(selectedDate)
            .then(response => {
                if (!cancelled) setHistorySessions(Array.isArray(response.data) ? response.data : []);
            })
            .catch(error => {
                console.error('Error cargando los turnos de caja:', error);
                if (!cancelled) setHistorySessions([]);
            })
            .finally(() => {
                if (!cancelled) setHistoryLoading(false);
            });
        return () => { cancelled = true; };
    }, [selectedDate, isToday]);

    if (!cashRegister) {
        return (
            <div className="max-w-5xl mx-auto p-2 md:p-4">
                <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                    Cargando estado de la caja...
                </div>
            </div>
        );
    }

    const {
        is_open: isOpen,
        session,
        current_balance: currentBalance,
        current_cash: currentCash,
        openings_today: openingsToday,
        closings_today: closingsToday,
        max_per_day: maxPerDay,
        can_manage: canManage,
        can_open: canOpen,
        can_close: canClose,
    } = cashRegister;
    const sessionsToShow = isToday ? (cashRegister.today_sessions || []) : (historySessions || []);

    const declaresNow = confirmAction === 'close' && mustDeclareCash;
    const declaredCashValue = declaredCash.trim() === '' ? NaN : Number(declaredCash);
    const declaredCashIsValid = Number.isFinite(declaredCashValue) && declaredCashValue >= 0;

    const requestAction = (action) => {
        setMessage(null);
        setDeclaredCash('');
        setConfirmAction(action);
        loadStatus();
    };

    const handleConfirm = async () => {
        if (declaresNow && !declaredCashIsValid) return;
        setIsSubmitting(true);
        try {
            if (confirmAction === 'open') {
                const { data } = await openCashRegister();
                setMessage({
                    type: 'success',
                    text: seesCash
                        ? `Caja abierta el ${formatMovementDate(data.opened_at)} con ${formatMoney(data.opening_cash)} en efectivo y ${formatMoney(data.opening_balance)} de total de dinero.`
                        : `Caja abierta el ${formatMovementDate(data.opened_at)} con ${formatMoney(data.opening_balance)} de total de dinero.`,
                });
            } else {
                const declared = declaresNow ? Math.round(declaredCashValue * 100) / 100 : null;
                const { data } = await closeCashRegister(declared === null ? {} : { declared_cash: declared });
                setMessage({
                    type: 'success',
                    text: seesCash
                        ? `Caja cerrada el ${formatMovementDate(data.closed_at)} con ${formatMoney(data.closing_cash)} en efectivo y ${formatMoney(data.closing_balance)} de total de dinero.`
                        : `Caja cerrada el ${formatMovementDate(data.closed_at)} con ${formatMoney(data.closing_balance)} de total de dinero.${declared === null ? '' : ` Efectivo declarado: ${formatMoney(declared)}.`}`,
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: getApiErrorMessage(error, 'No se pudo completar la operación. Intentá de nuevo.') });
        } finally {
            setIsSubmitting(false);
            setConfirmAction(null);
            loadStatus();
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-2 md:p-4 space-y-4">
            {message && (
                <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <section className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-bold text-gray-700">Estado de la caja</h3>
                        <EstadoBadge isOpen={isOpen} />
                    </div>

                    {isOpen && session ? (
                        <>
                            <p className="text-sm text-gray-600 mb-3">
                                Abierta por <span className="font-semibold text-gray-800">{session.opened_by || 'usuario eliminado'}</span> el {formatMovementDate(session.opened_at)}
                            </p>
                            <dl className="space-y-2 text-sm">
                                {seesCash && <FilaMonto label="Efectivo al abrir" value={session.opening_cash} />}
                                <FilaMonto label="Total de dinero al abrir" value={session.opening_balance} />
                                <FilaMonto label="Entradas del turno" value={session.total_entradas} className="text-green-600" />
                                <FilaMonto label="Salidas del turno" value={session.total_salidas} className="text-red-600" />
                                <div className="border-t border-gray-200 pt-2 space-y-2">
                                    {seesCash && <FilaMonto label="Efectivo actual en caja" value={currentCash} destacado />}
                                    <FilaMonto label="Total de dinero actual" value={currentBalance} destacado />
                                </div>
                            </dl>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 mb-3">
                                La caja está cerrada. No se pueden registrar ventas, compras ni extracciones para el banco hasta que se abra.
                            </p>
                            <dl className="space-y-2 text-sm">
                                {seesCash && <FilaMonto label="Efectivo actual en caja" value={currentCash} destacado />}
                                <FilaMonto label="Total de dinero actual" value={currentBalance} destacado />
                            </dl>
                        </>
                    )}

                    {canManage && (
                        <div className="mt-4">
                            {isOpen ? (
                                <button
                                    type="button"
                                    onClick={() => requestAction('close')}
                                    disabled={!canClose}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                                >
                                    Cerrar caja
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => requestAction('open')}
                                    disabled={!canOpen}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                                >
                                    Abrir caja
                                </button>
                            )}
                            {!isOpen && openingsToday >= maxPerDay && (
                                <p className="text-xs text-amber-700 mt-2">
                                    Ya se usaron las {maxPerDay} aperturas de hoy. La caja se podrá volver a abrir mañana.
                                </p>
                            )}
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                        Aperturas hoy: {openingsToday} de {maxPerDay} · Cierres hoy: {closingsToday} de {maxPerDay}
                    </p>
                </section>

                <section className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                        <h3 className="text-xl font-bold text-gray-700">
                            {isToday ? 'Turnos de hoy' : `Turnos del ${selectedDate.split('-').reverse().join('/')}`}
                        </h3>
                        <input
                            type="date"
                            value={selectedDate || today}
                            max={today || undefined}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {historyLoading ? (
                        <p className="text-sm text-gray-500 text-center py-6">Cargando turnos...</p>
                    ) : sessionsToShow.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">No hubo aperturas de caja este día.</p>
                    ) : (
                        <div className="space-y-3">
                            {sessionsToShow.map((turno, index) => (
                                <TurnoCard
                                    key={turno.id}
                                    turno={turno}
                                    numero={index + 1}
                                    seesCash={seesCash}
                                    onResolve={async (sessionId, payload) => {
                                        await resolveCashRegister(sessionId, payload);
                                        await loadStatus();
                                    }}
                                    cashIsWhole={Boolean(cashRegister.cash_is_whole)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {userRole === 'Gerente' && (
                <section className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <h3 className="text-xl font-bold text-gray-700 mb-1">Extracción para el banco</h3>
                    {isOpen ? (
                    <>
                    <p className="text-sm text-gray-600 mb-4">
                        Solo se puede extraer con la caja abierta. El monto no puede superar el efectivo que hay en la caja{seesCash ? ` (${formatMoney(currentCash)})` : ''}.
                    </p>
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            const amount = Number(withdrawAmount);
                            if (!amount || amount <= 0) {
                                setWithdrawMessage({ type: 'error', text: 'Ingresá cuánto se saca. Tiene que ser mayor a cero.' });
                                return;
                            }
                            if (seesCash && amount > Number(currentCash)) {
                                setWithdrawMessage({ type: 'error', text: 'La extracción no puede superar el efectivo que hay en la caja.' });
                                return;
                            }
                            setWithdrawing(true);
                            setWithdrawMessage(null);
                            try {
                                await api.post('/cash-movements/', {
                                    type: 'Salida',
                                    amount,
                                    description: 'Depósito en banco',
                                    payment_method: 'Depósito bancario',
                                });
                                setWithdrawAmount('');
                                setWithdrawMessage({ type: 'success', text: `Se descontaron ${formatMoney(amount)} de la caja.` });
                                if (loadCashMovements) await loadCashMovements();
                                await loadStatus();
                            } catch (error) {
                                setWithdrawMessage({ type: 'error', text: getApiErrorMessage(error, 'No se pudo registrar la extracción.') });
                            } finally {
                                setWithdrawing(false);
                            }
                        }}
                    >
                        <label className="block text-sm text-gray-700">
                            Cuánto se saca
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={seesCash ? currentCash : undefined}
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(e.target.value)}
                                className="mt-1 block w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                disabled={withdrawing}
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={withdrawing}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-md font-semibold"
                        >
                            {withdrawing ? 'Registrando...' : 'Registrar extracción'}
                        </button>
                    </form>
                    {withdrawMessage && (
                        <p className={`mt-3 text-sm ${withdrawMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                            {withdrawMessage.text}
                        </p>
                    )}
                    </>
                    ) : (
                        <p className="text-sm text-gray-600">La extracción para el banco solo se puede hacer con la caja abierta.</p>
                    )}
                </section>
                )}
            </div>

            {confirmAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <form
                        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-full overflow-y-auto"
                        onSubmit={event => { event.preventDefault(); handleConfirm(); }}
                    >
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {confirmAction === 'open' ? '¿Abrir la caja?' : '¿Cerrar la caja?'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {confirmAction === 'open'
                                ? `Quedan registradas la fecha, la hora y tu usuario. Los movimientos que se hagan desde ahora quedan asociados a esta apertura. Es la apertura ${openingsToday + 1} de ${maxPerDay} de hoy.`
                                : 'Quedan registradas la fecha, la hora y tu usuario. Después del cierre no se pueden registrar ventas ni movimientos hasta una nueva apertura.'}
                        </p>
                        <dl className="space-y-2 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5">
                            {confirmAction === 'open' ? (
                                <>
                                    {seesCash && <FilaMonto label="Efectivo al abrir" value={currentCash} destacado />}
                                    <FilaMonto label="Total de dinero al abrir" value={currentBalance} destacado />
                                </>
                            ) : (
                                <>
                                    {seesCash && <FilaMonto label="Efectivo al abrir" value={session?.opening_cash} />}
                                    <FilaMonto label="Total de dinero al abrir" value={session?.opening_balance} />
                                    <FilaMonto label="Entradas del turno" value={session?.total_entradas} className="text-green-600" />
                                    <FilaMonto label="Salidas del turno" value={session?.total_salidas} className="text-red-600" />
                                    <div className="border-t border-gray-200 pt-2 space-y-2">
                                        {seesCash && <FilaMonto label="Efectivo al cerrar" value={currentCash} destacado />}
                                        <FilaMonto label="Total de dinero al cerrar" value={currentBalance} destacado />
                                    </div>
                                </>
                            )}
                        </dl>
                        {declaresNow && (
                            <label className="block text-sm font-semibold text-gray-700 mb-5">
                                Efectivo contado en caja
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={declaredCash}
                                    onChange={e => setDeclaredCash(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus
                                    required
                                    placeholder="0,00"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-base font-normal focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="block mt-1 text-xs font-normal text-gray-500">
                                    Contá los billetes y las monedas que hay en la caja y escribí el total. Es obligatorio para cerrar.
                                </span>
                            </label>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || (declaresNow && !declaredCashIsValid)}
                                className={`px-4 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${confirmAction === 'open' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isSubmitting ? 'Procesando...' : confirmAction === 'open' ? 'Confirmar apertura' : 'Confirmar cierre'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Apertura_Cierre_Caja;
