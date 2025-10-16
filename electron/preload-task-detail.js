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

    let assignedUsersHtml = '<p>No hay personal asignado.</p>';
    if (task.assignedUsers && task.assignedUsers.length > 0) {
        assignedUsersHtml = task.assignedUsers.map(u => `<li>${u.name}</li>`).join('');
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
        <div><strong>Estado:</strong> ${task.status}</div>
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

      <div class="footer">
        <p>Documento generado por Gestor de Inventario.</p>
      </div>
    `;

    container.innerHTML = html;

    // Avisamos a main.js que puede imprimir.
    ipcRenderer.send('do-print');
  });
});