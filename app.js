// Data Model
const MENU = {
    "Cuero": 60.00,
    "Deshebrada": 60.00,
    "Pata": 60.00,
    "Lomo": 60.00,
    "Mixta": 70.00,
    "Sencilla": 30.00,
    "Coca": 18.00
};

const TOSTADAS = ["Cuero", "Deshebrada", "Pata", "Lomo", "Mixta", "Sencilla"];
const BEBIDAS = ["Coca"];

const COLORES = {
    "Cuero": "#E8913A",
    "Deshebrada": "#C0392B",
    "Pata": "#27AE60",
    "Lomo": "#8E44AD",
    "Mixta": "#2980B9",
    "Sencilla": "#F39C12",
    "Coca": "#D32F2F"
};

const ICONOS = {
    "Cuero": "🫓",
    "Deshebrada": "🥩",
    "Pata": "🦶",
    "Lomo": "🥓",
    "Mixta": "🌮",
    "Sencilla": "🥙",
    "Coca": "🥤"
};

// Application State
const state = {
    pedidoActual: [],
    pedidosPendientes: [],
    ventasTotales: 0,
    historialVentas: [],
    tostadasVendidas: {}
};

// Initialize Counters
Object.keys(MENU).forEach(k => state.tostadasVendidas[k] = 0);

// App Controller
const app = {
    selectedProduct: null,

    init() {
        this.loadData();
        this.renderMenu();
        this.updateDate();
        setInterval(() => this.updateDate(), 60000); // update every minute
        this.refreshUI();
        this.attachEvents();
    },

    // ── DATA PERSISTENCE ──
    loadData() {
        const stored = localStorage.getItem('ventas_registro');
        state.historialVentas = stored ? JSON.parse(stored) : [];
        this.calculateDailyStats();

        const pending = localStorage.getItem('pedidos_pendientes');
        if (pending) state.pedidosPendientes = JSON.parse(pending);
    },

    saveData() {
        localStorage.setItem('ventas_registro', JSON.stringify(state.historialVentas));
        localStorage.setItem('pedidos_pendientes', JSON.stringify(state.pedidosPendientes));
    },

    calculateDailyStats() {
        state.ventasTotales = 0;
        Object.keys(MENU).forEach(k => state.tostadasVendidas[k] = 0);

        const today = new Date().toISOString().split('T')[0];
        
        state.historialVentas.forEach(v => {
            if (v.fecha.startsWith(today)) {
                state.ventasTotales += v.total;
                v.productos.forEach(p => {
                    if (state.tostadasVendidas[p.nombre] !== undefined) {
                        state.tostadasVendidas[p.nombre] += p.cantidad;
                    }
                });
            }
        });
    },

    // ── UI RENDERING ──
    renderMenu() {
        const renderGroup = (arr, containerId) => {
            const container = document.getElementById(containerId);
            arr.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-menu';
                btn.style.backgroundColor = COLORES[item];
                btn.innerHTML = `<span>${ICONOS[item]}</span> <span>${item} — $${MENU[item].toFixed(2)}</span>`;
                btn.onclick = () => this.abrirModalCantidad(item);
                container.appendChild(btn);
            });
        };
        renderGroup(TOSTADAS, 'menu-tostadas');
        renderGroup(BEBIDAS, 'menu-bebidas');
    },

    updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let str = new Date().toLocaleDateString('es-ES', options);
        document.getElementById('fecha-hoy').innerText = "📅 " + str.charAt(0).toUpperCase() + str.slice(1);
    },

    refreshUI() {
        // Pedido List
        const list = document.getElementById('lista-pedido');
        list.innerHTML = '';
        let total = 0;

        if (state.pedidoActual.length === 0) {
            list.innerHTML = '<div class="empty-state">Sin productos</div>';
        } else {
            state.pedidoActual.forEach((p, idx) => {
                const div = document.createElement('div');
                div.className = 'order-item';
                div.innerHTML = `
                    <div class="col-prod item-${p.nombre.toLowerCase()}">${ICONOS[p.nombre]} ${p.nombre}</div>
                    <div class="col-cant">${p.cantidad}</div>
                    <div class="col-pu">$${p.precio.toFixed(2)}</div>
                    <div class="col-sub">$${p.subtotal.toFixed(2)}</div>
                `;
                list.appendChild(div);
                total += p.subtotal;
            });
        }

        // Totals
        document.getElementById('lbl-total-gran').innerText = `$${total.toFixed(2)}`;
        document.getElementById('lbl-cobro-total').innerText = `Total: $${total.toFixed(2)}`;
        document.getElementById('caja-total').innerText = `$${state.ventasTotales.toLocaleString('en-US', {minimumFractionDigits:2})}`;
        
        // Pendientes badge
        const btnPend = document.getElementById('btn-pendientes');
        const numP = state.pedidosPendientes.length;
        btnPend.innerText = `📌 Pendientes (${numP})`;
        btnPend.style.backgroundColor = numP > 0 ? 'var(--warning)' : 'var(--bg-hover)';

        // Preview Cambio
        this.previewCambio();
        
        // Refresh Resumen Box
        this.refreshResumen();
    },

    refreshResumen() {
        const box = document.getElementById('resumen-productos');
        box.innerHTML = '';
        let totalQty = 0;
        
        Object.keys(MENU).forEach(nombre => {
            const cant = state.tostadasVendidas[nombre];
            if (cant > 0) {
                totalQty += cant;
                const div = document.createElement('div');
                div.className = 'summary-item text-sm';
                div.innerHTML = `<span>${ICONOS[nombre]} ${nombre}</span> <strong>${cant}</strong>`;
                box.appendChild(div);
            }
        });
        
        document.getElementById('lbl-total-vendidos').innerText = totalQty;
        
        // Historial text
        const txt = document.getElementById('txt-historial');
        const today = new Date().toISOString().split('T')[0];
        const todaysSales = state.historialVentas.filter(v => v.fecha.startsWith(today)).reverse(); // latest first
        
        if (todaysSales.length === 0) {
            txt.value = "Aún no hay ventas hoy.";
        } else {
            txt.value = todaysSales.map(v => {
                let time = v.fecha.split('T')[1].substring(0, 5);
                return `[${time}] Venta: $${v.total.toFixed(2)}`;
            }).join('\n');
        }
    },

    previewCambio() {
        const total = this.getTotalPedido();
        const input = document.getElementById('input-pago');
        const lbl = document.getElementById('lbl-preview-cambio');
        
        if (total === 0) {
            lbl.innerText = "";
            return;
        }
        
        const pago = parseFloat(input.value) || 0;
        if (pago >= total) {
            const cambio = pago - total;
            lbl.innerText = `Cambio estimado: $${cambio.toFixed(2)}`;
            lbl.className = 'preview-text text-success';
        } else {
            lbl.innerText = `Faltan: $${(total - pago).toFixed(2)}`;
            lbl.className = 'preview-text text-pending';
        }
    },

    getTotalPedido() {
        return state.pedidoActual.reduce((acc, p) => acc + p.subtotal, 0);
    },

    // ── ACTIONS ──
    abrirModalCantidad(nombre) {
        this.selectedProduct = nombre;
        document.getElementById('modal-cant-title').innerText = `Agregar ${nombre}`;
        const input = document.getElementById('input-cant');
        input.value = 1;
        this.mostrarModal('modal-cantidad');
        setTimeout(() => { input.focus(); input.select(); }, 100);
    },

    confirmAddProduct() {
        const cant = parseInt(document.getElementById('input-cant').value);
        if (isNaN(cant) || cant <= 0) return;
        
        state.pedidoActual.push({
            nombre: this.selectedProduct,
            cantidad: cant,
            precio: MENU[this.selectedProduct],
            subtotal: cant * MENU[this.selectedProduct]
        });
        
        this.cerrarModal('modal-cantidad');
        this.refreshUI();
    },

    quitarUltimo() {
        if (state.pedidoActual.length > 0) {
            state.pedidoActual.pop();
            this.refreshUI();
        }
    },

    limpiarPedido() {
        state.pedidoActual = [];
        this.refreshUI();
    },

    abrirModalEspera() {
        if (state.pedidoActual.length === 0) {
            alert('No hay pedido para poner en espera.');
            return;
        }
        document.getElementById('input-espera-nombre').value = '';
        this.mostrarModal('modal-espera');
        setTimeout(() => document.getElementById('input-espera-nombre').focus(), 100);
    },

    confirmEspera() {
        const name = document.getElementById('input-espera-nombre').value.trim();
        if (!name) return;
        
        state.pedidosPendientes.push({
            cliente: name,
            pedido: [...state.pedidoActual],
            total: this.getTotalPedido(),
            hora: new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})
        });
        
        this.saveData();
        this.limpiarPedido();
        this.cerrarModal('modal-espera');
    },

    abrirModalPendientes() {
        if (state.pedidosPendientes.length === 0) {
            alert('No hay pedidos pendientes.');
            return;
        }
        
        const list = document.getElementById('lista-ver-pendientes');
        list.innerHTML = '';
        
        state.pedidosPendientes.forEach((ped, idx) => {
            const div = document.createElement('div');
            div.style.backgroundColor = 'rgba(0,0,0,0.2)';
            div.style.padding = '12px';
            div.style.borderRadius = 'var(--radius-sm)';
            div.style.marginBottom = '8px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            
            div.innerHTML = `
                <div>
                    <div class="fw-bold">👤 ${ped.cliente}</div>
                    <div class="text-xs text-muted">🕒 ${ped.hora}</div>
                </div>
                <div class="text-gold fw-bold">$${ped.total.toFixed(2)}</div>
                <button class="btn btn-success" onclick="app.reanudarPendiente(${idx})">Reanudar</button>
            `;
            list.appendChild(div);
        });
        
        this.mostrarModal('modal-ver-pendientes');
    },

    reanudarPendiente(idx) {
        if (state.pedidoActual.length > 0) {
            if(!confirm("Tiene un pedido actual. Se borrará si reanuda este sin ponerlo en espera.\n¿Continuar?")) return;
        }
        
        const ped = state.pedidosPendientes.splice(idx, 1)[0];
        state.pedidoActual = ped.pedido;
        this.saveData();
        this.refreshUI();
        this.cerrarModal('modal-ver-pendientes');
    },

    pagoRapido(monto) {
        const total = this.getTotalPedido();
        if (total === 0) return;
        const input = document.getElementById('input-pago');
        input.value = monto === 0 ? total : monto;
        this.previewCambio();
    },

    cobrar() {
        const total = this.getTotalPedido();
        if (total === 0) {
            alert("No hay nada que cobrar.");
            return;
        }
        
        const pago = parseFloat(document.getElementById('input-pago').value);
        if (isNaN(pago) || pago < total) {
            alert("El pago ingresado no es válido o es insuficiente.");
            return;
        }
        
        const cambio = pago - total;
        const now = new Date();
        const fechaIso = now.toISOString().split('.')[0]; // YYYY-MM-DDTHH:mm:ss
        
        const venta = {
            fecha: fechaIso,
            productos: [...state.pedidoActual],
            total: total,
            pago: pago,
            cambio: cambio
        };
        
        state.historialVentas.push(venta);
        this.saveData();
        this.calculateDailyStats();
        
        this.limpiarPedido();
        document.getElementById('input-pago').value = '';
        this.previewCambio();
        
        this.mostrarTicket(venta);
    },

    mostrarTicket(venta) {
        const time = venta.fecha.split('T')[1].substring(0, 5);
        document.getElementById('ticket-hora').innerText = `🕒 ${time}`;
        
        const list = document.getElementById('ticket-items');
        list.innerHTML = venta.productos.map(p => `
            <div class="ticket-item">
                <div class="name" style="color:${COLORES[p.nombre]}">${ICONOS[p.nombre]} ${p.nombre}</div>
                <div class="qty">x${p.cantidad}</div>
                <div class="sub">$${p.subtotal.toFixed(2)}</div>
            </div>
        `).join('');
        
        document.getElementById('ticket-total').innerText = `$${venta.total.toFixed(2)}`;
        document.getElementById('ticket-pago').innerText = `$${venta.pago.toFixed(2)}`;
        
        const cambioEl = document.getElementById('ticket-cambio');
        const cambioBox = document.getElementById('ticket-cambio-box');
        cambioEl.innerText = `$${venta.cambio.toFixed(2)}`;
        
        if (venta.cambio > 0) {
            cambioEl.className = 'h1 fw-bold text-pending';
            cambioBox.style.backgroundColor = 'rgba(243, 156, 18, 0.1)';
        } else {
            cambioEl.className = 'h1 fw-bold text-success';
            cambioBox.style.backgroundColor = 'rgba(46, 204, 113, 0.1)';
        }
        
        this.mostrarModal('modal-ticket');
    },

    abrirHistorial() {
        // Group by Date
        const grouped = {};
        state.historialVentas.forEach(v => {
            const d = v.fecha.split('T')[0];
            if (!grouped[d]) grouped[d] = { total: 0, list: [] };
            grouped[d].total += v.total;
            grouped[d].list.push(v);
        });
        
        const listEl = document.getElementById('lista-dias');
        listEl.innerHTML = '';
        const detailEl = document.getElementById('txt-detalle-dia');
        detailEl.value = 'Seleccione un día para ver el detalle...';
        
        const dates = Object.keys(grouped).sort().reverse();
        if (dates.length === 0) {
            listEl.innerHTML = '<div class="text-muted p-3">No hay datos históricos.</div>';
            this.mostrarModal('modal-historial');
            return;
        }
        
        dates.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary w-100 d-flex justify-between mb-2 text-left p-3';
            btn.innerHTML = `<span>📅 ${d}</span> <span class="text-gold fw-bold">$${grouped[d].total.toFixed(2)}</span>`;
            
            btn.onclick = () => {
                let lines = [`=== VENTAS DEL ${d} ===`, `TOTAL: $${grouped[d].total.toFixed(2)}`, `VENTAS: ${grouped[d].list.length}\n`];
                grouped[d].list.forEach(v => {
                    const time = v.fecha.split('T')[1];
                    lines.push(`[${time}] - Venta: $${v.total.toFixed(2)}`);
                    v.productos.forEach(p => {
                        lines.push(`  - ${p.cantidad}x ${p.nombre} ($${p.subtotal.toFixed(2)})`);
                    });
                });
                detailEl.value = lines.join('\n');
            };
            listEl.appendChild(btn);
        });
        
        this.mostrarModal('modal-historial');
    },

    terminarDia() {
        if(!confirm("¿Está seguro de cerrar la caja de hoy?\nSe mostrará el resumen final y solo quedará registrado en el historial.")) return;
        
        let resumen = `=== RESUMEN DE VENTAS ===\n`;
        resumen += `Total en Caja: $${state.ventasTotales.toFixed(2)}\n\nProductos:\n`;
        
        let found = false;
        Object.keys(state.tostadasVendidas).forEach(k => {
            if (state.tostadasVendidas[k] > 0) {
                resumen += `- ${k}: ${state.tostadasVendidas[k]}\n`;
                found = true;
            }
        });
        if (!found) resumen += " Ninguno\n";
        
        alert(resumen);
        // Note: in the Python app, data is kept. Here it's also kept in localStorage.
    },

    // ── MODAL UTILS ──
    mostrarModal(id) { document.getElementById(id).classList.remove('hidden'); },
    cerrarModal(id) { document.getElementById(id).classList.add('hidden'); },

    // ── BINDINGS ──
    attachEvents() {
        document.getElementById('btn-quitar-ultimo').onclick = () => this.quitarUltimo();
        document.getElementById('btn-limpiar').onclick = () => this.limpiarPedido();
        document.getElementById('btn-poner-espera').onclick = () => this.abrirModalEspera();
        document.getElementById('btn-pendientes').onclick = () => this.abrirModalPendientes();
        document.getElementById('btn-historial').onclick = () => this.abrirHistorial();
        document.getElementById('btn-terminar-dia').onclick = () => this.terminarDia();
        document.getElementById('btn-cobrar').onclick = () => this.cobrar();
        
        document.getElementById('input-pago').addEventListener('input', () => this.previewCambio());
        
        // Modal Confirmation bindings
        document.getElementById('btn-confirm-add').onclick = () => this.confirmAddProduct();
        document.getElementById('btn-confirm-espera').onclick = () => this.confirmEspera();
        
        // Enter key support in modals
        document.getElementById('input-cant').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.confirmAddProduct();
        });
        document.getElementById('input-pago').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.cobrar();
        });
        document.getElementById('input-espera-nombre').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.confirmEspera();
        });
    }
};

window.onload = () => app.init();
