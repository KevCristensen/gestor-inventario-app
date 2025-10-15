const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
});

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('consolidated-exit-data', (event, data) => {
    const { reportTitle, dateRange, entityName, groups } = data;

    // Poblar el encabezado
    document.getElementById('report-title').textContent = reportTitle || 'Reporte de Salidas';
    document.getElementById('entity-name').innerHTML = `<strong>Bodega:</strong> ${entityName || 'Todas'}`;
    document.getElementById('date-range').innerHTML = `<strong>Período:</strong> ${formatDate(dateRange.start)} al ${formatDate(dateRange.end)}`;
    document.getElementById('generation-date').textContent = new Date().toLocaleDateString('es-CL');
    
    // Poblar los grupos de salidas
    const container = document.getElementById('groups-container');
    container.innerHTML = ''; // Limpiar por si acaso

    if (groups && groups.length > 0) {
      groups.forEach(group => {
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
              <p class="group-meta">Por: ${group.user_name}</p>
            </div>
            <p class="group-meta">${formatTimestamp(group.timestamp)}</p>
          </div>
          <ul>${itemsHtml}</ul>
        `;
        container.appendChild(groupDiv);
      });
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
