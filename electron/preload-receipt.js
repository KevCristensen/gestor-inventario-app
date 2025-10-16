const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('receiptAPI', {
  onData: (callback) => {
    ipcRenderer.on('receipt-data', (event, ...args) => callback(...args));
  }
});

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('receipt-data', (event, data) => {
    const container = document.getElementById('receipt-content');
    if (!container) return;

    const { type, timestamp, user, entityName, notes, items } = data;

    let itemsHtml = '';
    items.forEach(item => {
      itemsHtml += `
        <tr>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity}</td>
        </tr>
      `;
    });

    const html = `
      <div class="header">
        <h1>Comprobante de ${type}</h1>
        <div class="company-info">
          <strong>KC Smart Systems</strong><br>
          Generado el: ${new Date(timestamp).toLocaleDateString('es-CL')}
        </div>
      </div>

      <div class="receipt-meta">
        <div><strong>Fecha y Hora:</strong> ${new Date(timestamp).toLocaleString('es-CL')}</div>
        <div><strong>Bodega:</strong> ${entityName}</div>
        <div><strong>Usuario:</strong> ${user.name}</div>
        ${notes ? `<div><strong>Motivo:</strong> ${notes}</div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="text-right">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <p class="footer">Documento generado por Gestor de Inventario.</p>
    `;

    container.innerHTML = html;

    // Una vez que todo está renderizado, le avisamos a main.js que puede imprimir.
    ipcRenderer.send('do-print');
  });
});