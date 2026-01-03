/****************************************************
 *  EDITOR DE MENÚ – Guarda todo en /menuEditor
 ***************************************************/
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
const db = firebase.database();

let menuGlobal = [];

/* ==========  MENÚ POR DEFECTO  ========== */
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

/* ==========  INICIO  ========== */
db.ref("menuEditor").once("value", snap => {
  if (snap.exists() && snap.val().length > 0) {
    menuGlobal = snap.val();
  } else {
    menuGlobal = defaultMenu;
    db.ref('menuEditor').set(defaultMenu);
  }
  renderEditor();
});

/* ==========  RENDER  ========== */
function renderEditor() {
  const wrap = document.getElementById('menu-editor');
  wrap.innerHTML = '';

  if (!menuGlobal || menuGlobal.length === 0) {
    wrap.innerHTML = '<p style="text-align:center;">No hay productos en el menú.</p>';
  }

  menuGlobal.forEach((group, gIdx) => {
    const card = document.createElement('div');
    card.className = 'group-card';

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
      <img id="img-${gIdx}" src="${group.image}" alt="Imagen del grupo">
      <div>
        <input type="file" id="file-${gIdx}" accept="image/*" style="display:none">
        <button class="upload-btn" onclick="document.getElementById('file-${gIdx}').click()">Cambiar imagen</button>
        <br><small>O pega una URL:</small><br>
        <input type="text" placeholder="https://..." id="url-${gIdx}" style="width:260px" value="${group.image}">
        <button class="upload-btn" onclick="useUrl(${gIdx})">Usar URL</button>
      </div>`;
    card.appendChild(header);

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Producto</th><th style="width:90px">Precio</th><th></th></tr></thead><tbody id="tb-${gIdx}"></tbody></table>`;
    card.appendChild(table);

    const tbody = table.querySelector('tbody');
    group.options.forEach((opt, pIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input value="${opt.name}" onblur="updateOption(${gIdx}, ${pIdx}, 'name', this.value)"></td>
        <td><input type="number" min="0" step="0.01" value="${opt.price}" onblur="updateOption(${gIdx}, ${pIdx}, 'price', parseFloat(this.value)||0)"></td>
        <td><button class="btn-sm btn-del" onclick="delProduct(${gIdx},${pIdx})">✖</button></td>`;
      tbody.appendChild(tr);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Agregar producto';
    addBtn.className = 'btn-sm btn-add';
    addBtn.onclick = () => addProduct(gIdx);
    card.appendChild(addBtn);

    wrap.appendChild(card);
    document.getElementById(`file-${gIdx}`).onchange = e => handleFile(e, gIdx);
  });

  // 🔽 BOTÓN PARA AGREGAR NUEVO BLOQUE COMPLETO
  const addGroupBtn = document.createElement('button');
  addGroupBtn.textContent = '+ Agregar nuevo bloque de productos';
  addGroupBtn.className = 'btn-save';
  addGroupBtn.style.backgroundColor = '#28a745';
  addGroupBtn.onclick = addNewGroup;
  wrap.appendChild(addGroupBtn);

  const save = document.createElement('button');
  save.textContent = 'Guardar cambios en Firebase';
  save.className = 'btn-save';
  save.onclick = saveMenu;
  wrap.appendChild(save);
}

/* ==========  EDICIÓN  ========== */
function updateOption(gIdx, pIdx, key, val) {
  menuGlobal[gIdx].options[pIdx][key] = val;
}
function addProduct(gIdx) {
  menuGlobal[gIdx].options.push({ name: 'Nuevo producto', price: 0 });
  renderEditor();
}
function delProduct(gIdx, pIdx) {
  menuGlobal[gIdx].options.splice(pIdx, 1);
  renderEditor();
}

/* ==========  NUEVO BLOQUE COMPLETO  ========== */
function addNewGroup() {
  const imageUrl = prompt("Pega la URL de la imagen del nuevo bloque:");
  if (!imageUrl) return;

  const newGroup = {
    image: imageUrl,
    options: []
  };

  // Agregar al menos un producto
  const productName = prompt("Nombre del primer producto:");
  const productPrice = parseFloat(prompt("Precio del producto:")) || 0;
  if (productName) {
    newGroup.options.push({ name: productName, price: productPrice });
  }

  menuGlobal.push(newGroup);
  renderEditor();
}

/* ==========  IMÁGENES  ========== */
function useUrl(gIdx) {
  const url = document.getElementById(`url-${gIdx}`).value.trim();
  if (url) {
    menuGlobal[gIdx].image = url;
    document.getElementById(`img-${gIdx}`).src = url;
  }
}
function handleFile(e, gIdx) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    menuGlobal[gIdx].image = dataUrl;
    document.getElementById(`img-${gIdx}`).src = dataUrl;
    document.getElementById(`url-${gIdx}`).value = '';
  };
  reader.readAsDataURL(file);
}

/* ==========  GUARDAR  ========== */
function saveMenu() {
  db.ref('menuEditor').set(menuGlobal, err => {
    if (err) { alert('Error al guardar: ' + err); } 
    else { alert('Menú guardado correctamente'); }
  });
}