const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
});

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('consolidated-exit-data', (event, data) => {
    // ¡MODIFICADO! Extraemos el nombre del usuario que genera el reporte.
    const { reportTitle, dateRange, entityName, groups, generatedBy } = data;

    // Poblar el encabezado
    document.getElementById('report-title').textContent = reportTitle || 'Reporte de Salidas';
    document.getElementById('entity-name').innerHTML = `<strong>Bodega:</strong> ${entityName || 'Todas'}`;
    document.getElementById('date-range').innerHTML = `<strong>Período:</strong> ${formatDate(dateRange.start)} al ${formatDate(dateRange.end)}`;
    document.getElementById('generation-date').textContent = new Date().toLocaleDateString('es-CL');
    // ¡NUEVO! Añadimos el nombre del usuario que generó el reporte en la firma.
    document.getElementById('generated-by-name').textContent = generatedBy || 'Usuario del Sistema';
    
    // Poblar los grupos de salidas
    const container = document.getElementById('groups-container');
    container.innerHTML = ''; // Limpiar por si acaso

    if (groups && groups.length > 0) {
      groups.forEach(group => {
        // ¡NUEVO! Calculamos el total de items por grupo.
        const totalItemsInGroup = group.items.reduce((sum, item) => sum + item.quantity, 0);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';

        const itemsHtml = group.items.map(item => `
          <li>
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">${item.quantity}</span>
          </li>
        `).join('');

        groupDiv.innerHTML = `
          <div class="group-header">
            <div>
              <h2>${group.notes || 'Salida sin motivo'}</h2>
              <p class="group-meta">Realizado por: ${group.user_name}</p>
            </div>
            <div class="group-meta">
              <p>${formatTimestamp(group.timestamp)}</p>
              <p><strong>Total Items: ${totalItemsInGroup}</strong></p>
            </div>
          </div>
          <ul>${itemsHtml}</ul>
        `;
        container.appendChild(groupDiv);
      });

      // ¡NUEVO! Calculamos y mostramos el total general de unidades.
      const grandTotalQuantity = groups.reduce((total, group) => 
        total + group.items.reduce((groupSum, item) => groupSum + item.quantity, 0), 
        0
      );
      document.getElementById('grand-total-quantity').textContent = grandTotalQuantity.toLocaleString('es-CL');

    } else {
      container.innerHTML = '<p style="text-align:center; color: #888;">No se encontraron salidas para este período.</p>';
    }

    // Una vez que todo está renderizado, manda a imprimir.
    ipcRenderer.send('do-print');
  });
});

// Funciones de ayuda para formatear fechas
function formatDate(dateString) {
  // Añadimos 'T00:00:00' para asegurar que la fecha se interprete en la zona horaria local y no en UTC.
  return new Date(dateString + 'T00:00:00').toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTimestamp(tsString) {
  return new Date(tsString).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}
