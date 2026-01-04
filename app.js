// --- CONFIG FIREBASE ---
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "https://carnitastiobigotes-default-rtdb.firebaseio.com/",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- VARIABLES GLOBALES ---
let clientName   = localStorage.getItem('clientName')   || "";
let ticketNumber = localStorage.getItem('ticketNumber') || "";
let confirmedOrder = JSON.parse(localStorage.getItem('confirmedOrder') || "[]");
let currentOrder   = JSON.parse(localStorage.getItem('currentOrder')   || "[]");
let totalConfirmed = parseFloat(localStorage.getItem('totalConfirmed')) || 0;
let totalCurrent   = parseFloat(localStorage.getItem('totalCurrent'))   || 0;
let quantities = {};
let clientPassword = "1234";
let groupedMenu = [];

// --- MENÚ POR DEFECTO ---
const defaultMenu = [
  { image: 'imagenes/taco-carnitas.jpg', options: [
    { name: 'Taco de Carnitas', price: 28 },
    { name: 'Paquete 1', price: 80 },
    { name: 'Paquete 2', price: 80 }
  ]},
  { image: 'imagenes/taco-cochinita.jpg', options: [
    { name: 'Taco de Cochinita', price: 28 },
    { name: 'Kilo de Cochinita', price: 100 }
  ]},
  { image: 'imagenes/quesadilla-sesos.jpg', options: [
    { name: 'Quesadilla de Seso', price: 13 }
  ]},
  { image: 'imagenes/agua.jpg', options: [
    { name: 'Agua de sabor medio litro', price: 15 },
    { name: 'Agua de sabor litro', price: 30 }
  ]},
  { image: 'imagenes/refresco.jpg', options: [
    { name: 'Refresco', price: 25 }
  ]}
];

// --- CARGA INICIAL: CONTRASEÑA + MENÚ ---
Promise.all([
  database.ref('configuracion/passwordCliente').once('value'),
  database.ref('menuEditor').once('value'),
  database.ref('configuracion/passwordDelDia').once('value')
]).then(([passSnap, menuSnap, diaSnap]) => {
  if (passSnap.exists()) clientPassword = passSnap.val();
  if (!diaSnap.exists()) database.ref('configuracion/passwordDelDia').set('1234');

  if (menuSnap.exists() && menuSnap.val().length > 0) {
    groupedMenu = menuSnap.val();
  } else {
    groupedMenu = defaultMenu;
    database.ref('menuEditor').set(defaultMenu);
  }

  if (confirmedOrder.length === 0 && currentOrder.length === 0) {
    localStorage.removeItem('ticketNumber');
    localStorage.removeItem('clientName');
  }

  if (clientName && ticketNumber) {
    showWelcome();
    renderMenu();
    document.getElementById('login').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    document.getElementById('order-summary').style.display = 'block';
    updateOrder();
  }
}).catch(error => {
  console.error("Error al cargar datos iniciales:", error);
  groupedMenu = defaultMenu;
  renderMenu();
});

// --- FUNCIONES AUXILIARES ---
function saveSession() {
  localStorage.setItem('clientName', clientName);
  localStorage.setItem('ticketNumber', ticketNumber);
  localStorage.setItem('confirmedOrder', JSON.stringify(confirmedOrder));
  localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
  localStorage.setItem('totalConfirmed', totalConfirmed.toString());
  localStorage.setItem('totalCurrent', totalCurrent.toString());
}

function showWelcome() {
  let now = new Date();
  document.getElementById('welcome').innerHTML = `<h2>Bienvenido, ${clientName}!<br><small>Tu número de ticket es #${ticketNumber}<br>${now.toLocaleDateString()} ${now.toLocaleTimeString()}</small></h2>`;
}

// PASO 1: validar contraseña del día
function validarClaveDia() {
  const clave = document.getElementById('claveDia').value.trim();

  if (clave === '') {
    alert('Escribe la contraseña del día');
    return;
  }

  // Si escribe "admin", pedimos la contraseña de administrador
  if (clave.toLowerCase() === 'admin') {
    const adminPass = prompt('Introduce la contraseña de administrador:');
    if (adminPass === 'carnivoras') {
      document.getElementById('login').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
    } else {
      alert('Contraseña de administrador incorrecta');
    }
    return;
  }

  // Validar contra Firebase
  database.ref('configuracion/passwordDelDia').once('value').then(snapshot => {
    const claveHoy = snapshot.val();
    if (clave !== claveHoy) {
      alert('Solicite la contraseña del día a Tío Bigotes para continuar');
      return;
    }

    // OK → mostrar paso 2 (nombre)
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('nombreCliente').focus();
  });
}

// PASO 2: ingresar con nombre
function ingresarConNombre() {
  const nombre = document.getElementById('nombreCliente').value.trim();
  if (nombre === '') {
    alert('Escribe tu nombre');
    return;
  }
  clientName = nombre;
  if (!ticketNumber) {
    database.ref('contador/ultimoTicket').get().then(snapshot => {
      let ultimo = snapshot.exists() ? snapshot.val() : 0;
      ticketNumber = (ultimo + 1).toString().padStart(4, '0');
      database.ref('contador').set({ ultimoTicket: parseInt(ticketNumber) });
      saveSession();
      showWelcome();
      document.getElementById('login').style.display = 'none';
      renderMenu();
      document.getElementById('menu').style.display = 'block';
      document.getElementById('order-summary').style.display = 'block';
    });
  } else {
    showWelcome();
    renderMenu();
    document.getElementById('login').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    document.getElementById('order-summary').style.display = 'block';
  }
}

function cancelEntry() {
  localStorage.clear();
  window.location.href = "https://www.google.com";
}

function exitSite() {
  localStorage.clear();
  window.location.href = "https://www.google.com";
}

function renderMenu() {
  const menuDiv = document.getElementById('menu');
  menuDiv.innerHTML = '';
  if (!groupedMenu || groupedMenu.length === 0) {
    menuDiv.innerHTML = '<p style="text-align:center;">No hay productos en el menú.</p>';
    return;
  }
  groupedMenu.forEach(group => {
    let menuHtml = `<div class="menu-item"><img src="${group.image}" alt="${group.options[0].name}">`;
    group.options.forEach(item => {
      quantities[item.name] = 0;
      menuHtml += `
        <div class="option-line">
          <span class='product-name'>${item.name} - $${item.price}</span>
          <div class="controls">
            <button class="button-small" onclick="decreaseQuantity('${item.name}')">-</button>
            <span id="qty-${item.name.replace(/\s+/g, '-')}">0</span>
            <button class="button-small" onclick="increaseQuantity('${item.name}', ${item.price})">+</button>
          </div>
        </div>
      `;
    });
    menuHtml += `</div>`;
    menuDiv.innerHTML += menuHtml;
  });
}

function increaseQuantity(name, price) {
  quantities[name]++;
  document.getElementById('qty-' + name.replace(/\s+/g, '-')).innerText = quantities[name];
  currentOrder.push({ producto: name, cantidad: 1, subtotal: price });
  totalCurrent += price;
  updateOrder();
  saveSession();
}

function decreaseQuantity(name) {
  if (quantities[name] > 0) {
    quantities[name]--;
    document.getElementById('qty-' + name.replace(/\s+/g, '-')).innerText = quantities[name];
    let index = currentOrder.findIndex(item => item.producto === name);
    if (index !== -1) {
      totalCurrent -= currentOrder[index].subtotal;
      currentOrder.splice(index, 1);
      updateOrder();
      saveSession();
    }
  }
}

function groupProducts(order) {
  const grouped = {};
  order.forEach(item => {
    if (!grouped[item.producto]) {
      grouped[item.producto] = { cantidad: 0, subtotal: 0 };
    }
    grouped[item.producto].cantidad += item.cantidad;
    grouped[item.producto].subtotal += item.subtotal;
  });
  return grouped;
}

function updateOrder() {
  const list = document.getElementById('order-list');
  list.innerHTML = "<strong>Confirmados:</strong><br>";
  const confirmedGrouped = groupProducts(confirmedOrder);
  const currentGrouped = groupProducts(currentOrder);

  for (const product in confirmedGrouped) {
    list.innerHTML += `<li>${product} x ${confirmedGrouped[product].cantidad} = $${confirmedGrouped[product].subtotal}</li>`;
  }
  if (Object.keys(currentGrouped).length > 0) {
    list.innerHTML += "<hr><strong>En edición:</strong><br>";
    for (const product in currentGrouped) {
      list.innerHTML += `<li>${product} x ${currentGrouped[product].cantidad} = $${currentGrouped[product].subtotal}</li>`;
    }
  }
  document.getElementById('total').textContent = (totalConfirmed + totalCurrent).toFixed(2);
}

function confirmCurrentOrder() {
  if (currentOrder.length === 0) {
    alert("No hay productos para confirmar.");
    return;
  }
  confirmedOrder = confirmedOrder.concat(currentOrder);
  totalConfirmed += totalCurrent;
  currentOrder = [];
  totalCurrent = 0;
  for (let producto in quantities) {
    quantities[producto] = 0;
    const spanQty = document.getElementById('qty-' + producto.replace(/\s+/g, '-'));
    if (spanQty) spanQty.innerText = '0';
  }
  updateOrder();
  saveSession();
  alert("Pedido confirmado. Puedes seguir agregando más productos si deseas.");
}

function prepareCheckout() {
  if (confirmedOrder.length === 0) {
    alert("Debes confirmar al menos un producto antes de pedir la cuenta.");
    return;
  }
  const method = document.getElementById('method-payment').value;
  if (method === "-- Selecciona --") {
    alert("Selecciona un método de pago.");
    return;
  }
  const now = new Date();
  const fechaHoy = getLocalDateYMD();
  const horaRegistro = now.toLocaleTimeString();

  let pedido = {
    cliente: clientName,
    ticket: ticketNumber,
    fecha: fechaHoy,
    hora: horaRegistro,
    metodoPago: method,
    total: totalConfirmed.toFixed(2),
    orden: confirmedOrder
  };

  firebase.database().ref('ventas/ticket-' + ticketNumber).set(pedido)
    .then(() => {
      showTicket(pedido);
      localStorage.clear();
    })
    .catch(error => {
      console.error("Error al guardar pedido:", error);
    });
}

function showTicket(pedido) {
  const ticket = document.getElementById('ticket');
  ticket.innerHTML = `<h2>Ticket #${pedido.ticket}</h2>
    <p>Cliente: ${pedido.cliente}<br>Fecha: ${pedido.fecha} ${pedido.hora}<br>Método de pago: ${pedido.metodoPago}</p><ul>`;
  pedido.orden.forEach(item => {
    ticket.innerHTML += `<li>${item.cantidad} x ${item.producto} - $${item.subtotal}</li>`;
  });
  ticket.innerHTML += `</ul><h3>Total: $${pedido.total}</h3><br>
<h2 style="font-size: 1.5em; font-weight: bold;">Gracias por su preferencia, vuelva pronto, ${pedido.cliente}.</h2>
<br><button onclick="exitSite()" class="button-exit">Salir</button>`;
  document.getElementById('welcome').innerHTML = "";
  document.getElementById('menu').style.display = 'none';
  document.getElementById('order-summary').style.display = 'none';
  ticket.style.display = 'block';
}

function handleExit() {
  if (confirmedOrder.length > 0) {
    const choice = confirm("¿Deseas ordenar más o prefieres pagar?\n\nAceptar = Ordenar más\nCancelar = Pagar y salir");
    if (choice) {
      return;
    } else {
      prepareCheckout();
    }
  } else {
    if (confirm("¿Estás seguro de que deseas salir?")) {
      localStorage.clear();
      window.location.href = "https://www.google.com";
    }
  }
}

function getLocalDateYMD() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60000);
  return localDate.toISOString().split('T')[0];
}

// --- FUNCIONES ADMIN ---
function showTodayTickets() {
  const today = getLocalDateYMD();
  const resultDiv = document.getElementById('admin-results');
  resultDiv.innerHTML = "<h3>Tickets del Día (actualización en tiempo real)</h3>";

  firebase.database().ref('ventas').orderByChild('fecha').equalTo(today).on('value', snapshot => {
    resultDiv.innerHTML = "<h3>Tickets del Día</h3>";
    if (!snapshot.exists()) {
      resultDiv.innerHTML += "<p>No hay tickets hoy.</p>";
      return;
    }

    snapshot.forEach(ticket => {
      const data = ticket.val();
      const agrupado = {};
      data.orden.forEach(item => {
        if (!agrupado[item.producto]) agrupado[item.producto] = { cantidad: 0, subtotal: 0 };
        agrupado[item.producto].cantidad += item.cantidad;
        agrupado[item.producto].subtotal += item.subtotal;
      });

      let detalle = "<ul>";
      for (const p in agrupado) {
        detalle += `<li>${p} x ${agrupado[p].cantidad} = $${agrupado[p].subtotal.toFixed(2)}</li>`;
      }
      detalle += "</ul>";

      resultDiv.innerHTML += `
        <div style="margin-bottom:20px;">
          <strong>Ticket #${data.ticket}</strong><br>
          Cliente: ${data.cliente}<br>
          Fecha: ${data.fecha} ${data.hora}<br>
          Método de Pago: ${data.metodoPago}<br>
          ${detalle}
          <strong>Total: $${parseFloat(data.total).toFixed(2)}</strong>
        </div><hr>`;
    });
  });
}

function showTodaySales() {
  const today = getLocalDateYMD();
  const resultDiv = document.getElementById('admin-results');
  resultDiv.innerHTML = "<h3>Venta del Día (actualización en tiempo real)</h3>";

  firebase.database().ref('ventas').orderByChild('fecha').equalTo(today).on('value', snapshot => {
    if (!snapshot.exists()) {
      resultDiv.innerHTML += "<p>No hay ventas hoy.</p>";
      return;
    }

    const productos = {};
    let totalDia = 0;

    snapshot.forEach(ticket => {
      const data = ticket.val();
      totalDia += parseFloat(data.total);
      data.orden.forEach(item => {
        if (!productos[item.producto]) {
          productos[item.producto] = { cantidad: 0, subtotal: 0 };
        }
        productos[item.producto].cantidad += item.cantidad;
        productos[item.producto].subtotal += item.subtotal;
      });
    });

    resultDiv.innerHTML += "<ul>";
    for (const producto in productos) {
      resultDiv.innerHTML += `<li>${producto}: ${productos[producto].cantidad} piezas = $${productos[producto].subtotal.toFixed(2)}</li>`;
    }
    resultDiv.innerHTML += `</ul><h3>Total Vendido: $${totalDia.toFixed(2)}</h3>`;
  });
}

function guardarPwdDia() {
  const p = document.getElementById('pwdDia').value.trim();
  if (!p) return alert('Escribe una clave');
  database.ref('configuracion/passwordDelDia').set(p).then(() => {
    alert('Clave del día actualizada');
    document.getElementById('pwdDia').value = '';
  });
}

function showExpensesPanel() {
  window.open("gastos.html", "_blank");
}
