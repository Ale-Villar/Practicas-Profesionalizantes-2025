# Resumen de los 25 archivos tocados

Listado de lo que se cambió en esta tanda de trabajo: apertura y cierre de caja, vínculo proveedor–producto, selectores con búsqueda, historial de pérdidas y la orden de compra.

## Archivos editados en el Frontend

Rutas relativas a la carpeta del proyecto.

- `Frontend/interfaz/src/App.js` — la pestaña de ventas usa el componente nuevo de ventas, Proveedores recibe el inventario, y se conectan las llamadas de caja.
- `Frontend/interfaz/src/services/api.js` — llamadas para ver, abrir y cerrar la caja.
- `Frontend/interfaz/src/utils/supplierCatalog.js` — funciones para saber qué productos vende cada proveedor y qué proveedores venden un producto.
- `Frontend/interfaz/src/components/Proveedores.js` — el alta y la edición eligen los productos con un selector múltiple con búsqueda. En la tarjeta, la lista va en fichas dentro de un recuadro con scroll.
- `Frontend/interfaz/src/components/Registrar_Venta.js` — no deja confirmar la venta si la caja está cerrada.
- `Frontend/interfaz/src/components/Movimientos_De_Caja.js` — los movimientos quedan ligados a la sesión de caja abierta.

### Consultar datos (dos archivos distintos)

- `Frontend/interfaz/src/DataConsultation.js` — pantalla principal de Consultar Datos. El stock bajo o nulo queda primero. Los filtros de producto, insumo, proveedor y usuario pasaron a selectores con búsqueda.
- `Frontend/interfaz/src/components/Dialogo_interfaz_Consultar_Datos.js` — el mismo tipo de consulta, pero en el diálogo. Mismos filtros, incluido el de usuario en movimientos de caja.

### Compras (tres archivos distintos)

- `Frontend/interfaz/src/components/PurchaseManagement.js` — pantalla de compras en pantallas chicas. El formulario de crear compra filtra el catálogo según los proveedores elegidos y el listado de proveedores es un selector múltiple con búsqueda.
- `Frontend/interfaz/src/components/Dialogo_Compras.js` — crear compra en el diálogo grande y en la ventana aparte. Misma lógica de catálogo y el mismo selector de proveedores.
- `Frontend/interfaz/src/components/PurchaseHistory.js` — historial de compras. Los filtros de proveedor y de producto son selectores con búsqueda.

No se tocó `Frontend/interfaz/src/components/PurchaseRequests.js`.

### Pedidos (dos archivos distintos)

- `Frontend/interfaz/src/components/Pedidos.js` — pantalla de pedidos. El filtro de producto es un selector con búsqueda. El nombre del cliente sigue siendo texto libre.
- `Frontend/interfaz/src/components/PedDialogo.js` — el mismo filtro de producto, en el diálogo de pedidos.

### Historial de pérdidas

- `Frontend/interfaz/src/components/dialogoHistorialDePerdidas.js` — el panel izquierdo tiene un mínimo y un máximo medidos sobre el cuadro del diálogo, y los filtros hacen scroll adentro de ese panel.

No se tocó `Frontend/interfaz/src/components/historial_De_Perdidas_Para_Pantallas_Menores_Que_1200_width.js`.

## Archivos creados en el Frontend

- `Frontend/interfaz/src/components/Apertura_Cierre_Caja.js` — pantalla para abrir y cerrar la caja, con el dinero al abrir y al cerrar.
- `Frontend/interfaz/src/components/SalesView.js` — pestaña de ventas separada de `App.js` para que no se vuelva a montar al cambiar de sección.
- `Frontend/interfaz/src/components/SearchableSelect.js` — selector con búsqueda reutilizable. Sirve para uno o varios valores, y el menú se dibuja por encima de los cuadros.
- `Frontend/interfaz/src/utils/filterOptions.js` — arma las opciones de los filtros a partir del inventario y de los nombres que ya aparecen en ventas, pedidos, compras y caja.

## Archivos editados en el Backend

- `Backend/Interfaz/api/models.py` — sesión de caja (`CashRegisterSession`), vínculo de cada movimiento con esa sesión, y la relación de muchos a muchos `Supplier.supplied_products`. El campo de texto viejo `products` del proveedor se dejó en la base y no se usa en la interfaz.
- `Backend/Interfaz/api/serializers.py` — la caja, y los productos de cada proveedor como lista de ids.
- `Backend/Interfaz/api/views.py` — abrir, ver y cerrar la caja; las ventas, los movimientos y la entrega de un pedido exigen caja abierta; los proveedores traen sus productos vinculados.
- `Backend/Interfaz/Interfaz/urls.py` — ruta de la caja.

## Archivos creados en el Backend

No se creó ningún módulo nuevo de código. Los únicos archivos nuevos del backend son las dos migraciones de la sección siguiente.

## Migraciones creadas y aplicadas

Las dos están aplicadas en la base. No queda ninguna migración pendiente de estas.

- `Backend/Interfaz/api/migrations/0042_cashregistersession_cashmovement_session.py` — tabla de sesiones de caja y la columna que une cada movimiento de caja con su sesión.
- `Backend/Interfaz/api/migrations/0043_supplier_supplied_products.py` — tabla intermedia entre proveedores y productos (`api_supplier_supplied_products`).

## Otros archivos

- `docs/plan-vinculo-proveedor-insumos.md` — plan escrito antes de implementar el vínculo proveedor–producto y los selectores con búsqueda.
