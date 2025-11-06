const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskDetailAPI', {
  onData: (callback) => {
    ipcRenderer.on('task-detail-data', (event, ...args) => callback(...args));
  }
});

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('task-detail-data', (event, data) => {
    const container = document.getElementById('task-content');
    if (!container) return;

    const { task, entityName, user, timestamp } = data;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatStatus = (status) => {
        switch (status) {
            case 'pendiente': return 'Pendiente';
            case 'en_progreso': return 'En Progreso';
            case 'completada': return 'Completada';
            default: return status;
        }
    };

    let assignedUsersHtml = '<p>No hay personal asignado.</p>';
    if (task.assigned_users && task.assigned_users.length > 0) {
        assignedUsersHtml = task.assigned_users.map(u => `<li>${u.name}</li>`).join('');
    }

    // --- Lógica de cálculo de unidades (replicada del frontend) ---
    const convertToBaseUnits = (quantity, unit) => {
        switch (unit?.toLowerCase()) {
            case 'kg': return quantity * 1000;
            case 'g': return quantity;
            case 'l': return quantity * 1000;
            case 'ml': return quantity;
            default: return quantity;
        }
    };

    const calculateNeededUnits = (requiredProduct, suggestedProduct) => {
        if (requiredProduct.required_unit === 'un') {
            return requiredProduct.required_quantity;
        }
        const requiredAmountInBase = convertToBaseUnits(requiredProduct.required_quantity, requiredProduct.required_unit);
        const productAmountInBase = convertToBaseUnits(suggestedProduct.weight, suggestedProduct.unit_of_measure);
        if (productAmountInBase <= 0) return 'N/A';
        return Math.ceil(requiredAmountInBase / productAmountInBase);
    };
    // --- Fin de la lógica de cálculo ---

    let requiredProductsHtml = '<p>No se requieren productos.</p>';
    if (task.requiredProducts && task.requiredProducts.length > 0) {
        requiredProductsHtml = task.requiredProducts.map(p => `
            <div class="product-item">
                <div class="product-required">
                    <span class="product-name">${p.name}</span>
                    <span class="product-quantity">${p.required_quantity.toLocaleString('es-CL')} ${p.required_unit || ''}</span>
                </div>
                ${p.chosenProduct ? `
                    <div class="product-chosen">
                        <span class="arrow">&rarr;</span>
                        <span class="chosen-details">
                            <strong>Elegido:</strong> ${p.chosenProduct.name} - ${p.chosenProduct.brand}
                            <br>
                            <span class="chosen-stock-info">
                                (Stock: ${p.suggestions.find(s => s.id === p.chosen_product_id)?.current_stock || 'N/A'} un.
                                | <strong>Necesitas: ${calculateNeededUnits(p, p.chosenProduct)} un.</strong>)
                            </span>
                        </span>
                    </div>
                ` : `
                    <div class="product-chosen">
                        <span class="text-muted">Sin producto específico asignado.</span>
                    </div>
                `}
            </div>
        `).join('');
    }

    // --- NUEVA LÓGICA PARA RENDERIZAR MENÚS JSON ---
    let menuDetailsHtml = '<p>No hay detalles de menú.</p>';
    if (task.menu_details) {
        try {
            const menuSections = JSON.parse(task.menu_details);
            let generatedHtml = '';
            for (const section of menuSections) {
                generatedHtml += `<h3>${section.title || ''}</h3>`;
                for (const item of section.items) {
                    if (item.dish_id) {
                        generatedHtml += `<div class="dish-item"><h4>${item.name || ''}</h4>`;
                        generatedHtml += '<table><thead><tr><th>PRODUCTO</th><th>GRAMAJE</th><th>CANTIDAD</th><th>TOTAL</th></tr></thead><tbody>';
                        for (const ing of item.ingredients) {
                            const total = (ing.grammage || 0) * (ing.cantidad || 0);
                            generatedHtml += `<tr><td>${ing.product_name || ''}</td><td>${ing.grammage || 0} g</td><td>${ing.cantidad || 1}</td><td>${total} g</td></tr>`;
                        }
                        generatedHtml += '</tbody></table></div>';
                    } else if (item.type === 'salad') {
                        generatedHtml += `<div class="dish-item"><h4>${item.title || 'Salad Bar'}</h4><table><thead><tr><th>PRODUCTO</th><th>FUENTES</th></tr></thead><tbody>`;
                        for (const ing of item.ingredients) generatedHtml += `<tr><td>${ing.product || ''}</td><td>${ing.fuentes || ''}</td></tr>`;
                        generatedHtml += '</tbody></table></div>';
                    } else if (item.type === 'postre') {
                        generatedHtml += `<div class="dish-item"><h4>${item.title || 'Postre'}</h4><table><thead><tr><th>PRODUCTO</th><th>GRAMAJE</th></tr></thead><tbody>`;
                        for (const ing of item.ingredients) generatedHtml += `<tr><td>${ing.product || ''}</td><td>${ing.gramaje || ''} g</td></tr>`;
                        generatedHtml += '</tbody></table></div>';
                    } else if (item.type === 'other' || item.type === 'text') { // Es un ítem de texto
                        generatedHtml += `<p><strong>${item.title}</strong><br>${item.description || ''}</p>`;
                    }
                }
            }
            menuDetailsHtml = generatedHtml;
        } catch (e) { menuDetailsHtml = task.menu_details; } // Si falla, muestra el HTML antiguo
    }

    const html = `
      <div class="header">
        <h1>Pauta de Preparación</h1>
        <div class="company-info">
          <strong>KC Smart Systems</strong><br>
          Generado el: ${new Date(timestamp).toLocaleDateString('es-CL')}
        </div>
      </div>

      <div class="task-meta">
        <div><strong>Pauta:</strong> ${task.title}</div>
        <div><strong>Bodega:</strong> ${entityName}</div>
        <div><strong>Fecha de Entrega:</strong> ${formatDate(task.due_date)}</div>
        <div><strong>Estado:</strong> ${formatStatus(task.status)}</div>
      </div>

      <div class="section">
        <h2>Descripción / Instrucciones</h2>
        <p class="description">${task.description || 'Sin descripción.'}</p>
      </div>

      <div class="section">
        <h2>Personal Asignado</h2>
        <ul class="user-list">
          ${assignedUsersHtml}
        </ul>
      </div>

      <div class="section">
        <h2>Productos Requeridos</h2>
        <ul class="product-list">
          ${requiredProductsHtml}
        </ul>
      </div>

      <!-- NUEVO: Sección de Menús y Raciones -->
      <div class="section">
        <h2>Detalle de Menús (Cocina)</h2>
        <div class="menu-details">${menuDetailsHtml}</div>
      </div>

      <div class="footer">
        <p>Documento generado por Gestor de Inventario.</p>
      </div>
    `;

    container.innerHTML = html;

    // Avisamos a main.js que puede imprimir.
    ipcRenderer.send('do-print');
  });
});