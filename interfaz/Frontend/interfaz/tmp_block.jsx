import React from "react";
const x = () => (
                    {/* TABLA DE RESULTADOS */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[200px] sm:min-h-[300px] max-h-[50vh] sm:max-h-[60vh]">
                        {!queryResults ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4 sm:p-8 bg-slate-50/50">
                                <div className="bg-white p-3 sm:p-4 rounded-full shadow-sm mb-3">
                                    <Search size={28} className="sm:w-8 sm:h-8 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-600 text-sm sm:text-base">Esperando Parámetros</h3>
                                <p className="text-[10px] sm:text-xs mt-1 text-center max-w-sm">Configura la consulta y presiona "Consultar".</p>
                            </div>
                        ) : queryResults.data && queryResults.data.length > 0 ? (
                            <>
                                <div className="bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                                    <h3 className="font-bold text-slate-700 text-xs sm:text-sm truncate">{queryResults.title}</h3>
                                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap ml-2">{queryResults.data.length} registros</span>
                                </div>
                                <div className="flex-1 overflow-x-auto overflow-y-auto">
                                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[500px] text-xs sm:text-sm">
                                        {(() => {
                                            const sample = queryResults.data[0] || {};
                                            let cols = Object.keys(sample).filter(k => k !== '_raw');
                                            
                                            if (selectedQuery === 'ventas' || (sample.product && sample.quantity !== undefined && sample.total !== undefined)) {
                                                cols = ['id','date','product','quantity','total','user'];
                                            } else if (selectedQuery === 'movimientos_caja') {
                                                cols = ['id', 'date', 'type', 'amount', 'payment_method', 'description', 'user'];
                                            } else if (sample.customerName || sample.customer_name) {
                                                cols = ['id','date','customerName','paymentMethod','status','products','units'];
                                            } else if (selectedQuery === 'compras') {
                                                cols = ['id', 'date', 'supplier', 'type', 'items', 'total'];
                                            } else if (selectedQuery === 'proveedores') {
                                                cols = ['id', 'name', 'cuit', 'phone', 'address', 'products'];
                                            }

                                            const numericCols = ['quantity', 'total', 'amount', 'units'];

                                            return (
                                                <>
                                                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                                        <tr>
                                                            {cols.map(key => (
                                                                <th key={key} className={`px-2 sm:px-4 py-2 sm:py-3 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50 ${numericCols.includes(key) ? 'text-right' : ''}`}>
                                                                    {headerTranslationMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {queryResults.data.map((row, index) => (
                                                            <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                                                {cols.map((k, ci) => (
                                                                    <td key={ci} className={`px-2 sm:px-4 py-1.5 sm:py-2 ${numericCols.includes(k) ? 'text-right font-mono' : 'text-slate-700'}`}>
                                                                        {k === 'items' && selectedQuery === 'compras' 
                                                                            ? (Array.isArray(row[k]) ? row[k].map(it => `${it.productName||it.name||''} (${it.quantity||0})`).join(', ') : String(row[k]))
                                                                            : renderCellValue(row[k] ?? row[k === 'products' ? 'items' : k], k)
                                                                        }
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </>
                                            );
                                        })()}
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4 sm:p-8">
                                <AlertCircle size={28} className="sm:w-8 sm:h-8 text-orange-400 mb-3" />
                                <h3 className="font-bold text-slate-600 text-sm sm:text-base">No se encontraron datos</h3>
                                <p className="text-[10px] sm:text-xs mt-1 text-center">Intenta ajustando los filtros o el rango de fechas.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
);