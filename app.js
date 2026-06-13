const STORAGE_KEY = "prokicks-control-v5";

const schemas = {
  clientes: {
    title: "Clientes",
    singular: "Cliente",
    columns: [
      ["nombre", "Nombre"],
      ["empresa", "Club / Empresa"],
      ["contacto", "Contacto"],
      ["ciudad", "Ciudad"],
      ["telefono", "Teléfono"],
      ["email", "Email"],
      ["fuente", "Fuente"],
      ["notas", "Notas"]
    ],
    fields: [
      field("nombre", "Nombre", "text", true),
      field("empresa", "Club / Empresa"),
      field("contacto", "Contacto"),
      field("ciudad", "Ciudad"),
      field("telefono", "Teléfono"),
      field("email", "Email", "email"),
      field("fuente", "Fuente", "select", false, ["Instagram", "Referencia", "LMS", "Venta directa", "Evento"]),
      field("notas", "Notas", "textarea")
    ]
  },
  ventas: {
    title: "Ventas",
    singular: "Venta",
    columns: [
      ["cliente", "Cliente"],
      ["contacto", "Contacto"],
      ["rep", "Rep"],
      ["devices", "Devices"],
      ["monto", "Monto"],
      ["saldo", "Saldo"],
      ["estadoVenta", "Estado venta"],
      ["estadoPago", "Estado pago"],
      ["entrega", "Entrega"],
      ["ciudad", "Ciudad"]
    ],
    fields: [
      field("cliente", "Cliente", "text", true),
      field("contacto", "Contacto"),
      field("rep", "Rep", "select", true, reps()),
      field("devices", "Devices", "number", true),
      field("monto", "Monto total", "number", true),
      field("saldo", "Saldo pendiente", "number"),
      field("estadoVenta", "Estado venta", "select", true, ["EN PROSPECCIÓN", "VENTA INCOMPLETA", "VENTA CERRADA"]),
      field("estadoPago", "Estado pago", "select", false, ["PENDIENTE", "PARCIAL", "PAGADO"]),
      field("formaPago", "Forma de pago", "select", false, ["TRANSFERENCIA", "EFECTIVO", "TARJETA", "POR DEFINIR"]),
      field("entrega", "Entrega", "select", false, ["NO ENVIADO", "ENVIADO", "ENTREGADO", "POR DEFINIR"]),
      field("fechaEntrega", "Fecha entrega"),
      field("ciudad", "Ciudad"),
      field("factura", "Factura", "select", false, ["NO", "SI"]),
      field("notas", "Notas", "textarea")
    ]
  },
  comodatos: {
    title: "Comodatos",
    singular: "Comodato",
    columns: [
      ["cliente", "Cliente"],
      ["contacto", "Contacto"],
      ["rep", "Rep"],
      ["devices", "Devices"],
      ["estado", "Estado"],
      ["fechaEntrega", "Entrega"],
      ["fechaDevolucion", "Devolución"],
      ["ciudad", "Ciudad"],
      ["notas", "Notas"]
    ],
    fields: [
      field("cliente", "Cliente", "text", true),
      field("contacto", "Contacto"),
      field("rep", "Rep", "select", true, reps()),
      field("devices", "Devices", "number", true),
      field("estado", "Estado", "select", true, ["EN USO"]),
      field("fechaEntrega", "Fecha entrega"),
      field("fechaDevolucion", "Fecha devolución"),
      field("ciudad", "Ciudad"),
      field("notas", "Notas", "textarea")
    ]
  }
};

const views = ["dashboard", "clientes", "ventas", "comodatos", "cobranza"];
let state = loadState();
let activeView = "dashboard";
let editing = null;

const els = {
  title: document.querySelector("#viewTitle"),
  search: document.querySelector("#globalSearch"),
  newBtn: document.querySelector("#newRecordBtn"),
  exportBtn: document.querySelector("#exportExcelBtn"),
  resetBtn: document.querySelector("#resetDemoBtn"),
  metricGrid: document.querySelector("#metricGrid"),
  dialog: document.querySelector("#recordDialog"),
  form: document.querySelector("#recordForm"),
  formFields: document.querySelector("#formFields"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogMode: document.querySelector("#dialogMode")
};

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

els.search.addEventListener("input", render);
els.newBtn.addEventListener("click", () => openForm(activeView));
els.exportBtn.addEventListener("click", exportExcel);
els.metricGrid.addEventListener("input", updateManualDashboardValue);
els.metricGrid.addEventListener("change", renderDashboard);
els.resetBtn.addEventListener("click", () => {
  if (!confirm("Esto reemplazará los datos actuales por la demo inicial.")) return;
  state = seedState();
  saveState();
  render();
});

document.querySelector("#closeDialogBtn").addEventListener("click", closeForm);
document.querySelector("#cancelDialogBtn").addEventListener("click", closeForm);
els.form.addEventListener("submit", saveRecord);

setView("dashboard");

function field(key, label, type = "text", required = false, options = []) {
  return { key, label, type, required, options };
}

function reps() {
  return ["PAKO", "PACO", "JORGE", "SEAN", "FER", "FERNANDO", "BILLY", "JONATHAN", "JUAN", "LMS", "LMS/JUAN", "JORGE/FERNANDO"];
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  views.forEach((name) => {
    document.querySelector(`#view-${name}`).classList.toggle("is-active", name === view);
  });
  els.title.textContent = view === "cobranza" ? "Cobranza" : (schemas[view]?.title || "Dashboard");
  els.newBtn.style.display = ["dashboard", "cobranza"].includes(view) ? "none" : "";
  render();
}

function render() {
  renderDashboard();
  renderDataTable("clientes");
  renderDataTable("ventas");
  renderDataTable("comodatos");
  renderCobranza();
}

function renderDashboard() {
  const totalProducidos = Number(state.settings.totalProducidos || 300);
  const dashboard = state.settings.dashboard || {};
  const vendidas = state.ventas.filter((item) => item.estadoVenta === "VENTA CERRADA");
  const incompletas = state.ventas.filter((item) => item.estadoVenta === "VENTA INCOMPLETA");
  const comodatoDevices = sum(state.comodatos, "devices");
  const inventario = Number(state.settings.inventarioRedwood || 0);
  const ventasCerradasCount = dashboard.ventasCerradas ?? vendidas.length;
  const ventasIncompletasCount = dashboard.ventasIncompletas ?? incompletas.length;
  const comodatoCount = dashboard.comodato ?? comodatoDevices;
  const vendidosCount = dashboard.vendidos ?? 0;
  const diferencia = getDashboardDifference(inventario, vendidosCount, comodatoCount, totalProducidos);

  const metrics = [
    { label: "Total producción", value: totalProducidos, key: "totalProducidos", editable: true },
    { label: "Total en inventario", value: inventario, key: "inventarioRedwood", editable: true },
    { label: "Vendidos", value: vendidosCount, key: "vendidos" },
    { label: "En comodato", value: comodatoCount, key: "comodato" },
    { label: "Ventas cerradas", value: ventasCerradasCount },
    { label: "Venta incompleta", value: ventasIncompletasCount },
    { label: "Diferencia", value: diferencia, key: "diferencia" }
  ];

  els.metricGrid.innerHTML = metrics.map(renderMetric).join("");
}

function renderMetric(metric) {
  const editable = metric.editable ? " is-editable" : "";
  const value = Number(metric.value || 0);
  const body = metric.editable
    ? `<input class="metric-input" data-setting="${metric.key}" type="number" min="0" step="1" value="${value}" aria-label="${escapeAttr(metric.label)}">`
    : `<strong data-metric="${escapeAttr(metric.key || "")}">${formatNumber(value)}</strong>`;
  return `<article class="metric${editable}"><span>${escapeHtml(metric.label)}</span>${body}</article>`;
}

function updateManualDashboardValue(event) {
  const input = event.target.closest("[data-setting]");
  if (!input) return;
  const value = Math.max(0, Number(input.value || 0));
  state.settings[input.dataset.setting] = value;
  saveState();
  updateDashboardDerivedNumbers();
}

function updateDashboardDerivedNumbers() {
  const dashboard = state.settings.dashboard || {};
  const inventario = Number(state.settings.inventarioRedwood || 0);
  const vendidos = Number(dashboard.vendidos || 0);
  const comodato = Number(dashboard.comodato || 0);
  const totalProducidos = Number(state.settings.totalProducidos || 0);
  const diferencia = getDashboardDifference(inventario, vendidos, comodato, totalProducidos);
  const differenceEl = document.querySelector('[data-metric="diferencia"]');
  if (differenceEl) differenceEl.textContent = formatNumber(diferencia);
}

function getDashboardDifference(inventario, vendidos, comodato, totalProducidos) {
  return Number(inventario || 0) + Number(vendidos || 0) + Number(comodato || 0) - Number(totalProducidos || 0);
}

function renderDataTable(type) {
  const schema = schemas[type];
  const container = document.querySelector(`#${type}Table`);
  const rows = filterRows(state[type] || []);
  const header = schema.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const body = rows.map((row) => `
    <tr>
      ${schema.columns.map(([key]) => `<td>${formatCell(row[key], key)}</td>`).join("")}
      <td>
        <div class="table-actions">
          <button class="mini-btn" type="button" data-action="edit" data-type="${type}" data-id="${row.id}">Editar</button>
          <button class="mini-btn danger" type="button" data-action="delete" data-type="${type}" data-id="${row.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="panel-header">
      <h3>${escapeHtml(schema.title)}</h3>
      <span>${rows.length} registro(s)</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${header}<th>Acciones</th></tr></thead>
        <tbody>${body || `<tr><td colspan="${schema.columns.length + 1}" class="empty-state">Sin registros</td></tr>`}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "edit") openForm(button.dataset.type, button.dataset.id);
      if (button.dataset.action === "delete") deleteRecord(button.dataset.type, button.dataset.id);
    });
  });
}

function renderCobranza() {
  const container = document.querySelector("#cobranzaTable");
  const rows = filterRows(getCobranzaRows());
  container.innerHTML = `
    <div class="panel-header">
      <h3>Cobranza automática</h3>
      <span>${formatCurrency(sum(rows, "saldo"))}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Rep</th>
            <th>Monto total</th>
            <th>Saldo pendiente</th>
            <th>Estado</th>
            <th>Acción sugerida</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((item) => `
            <tr>
              <td>${escapeHtml(item.cliente)}</td>
              <td>${escapeHtml(item.rep)}</td>
              <td>${formatCurrency(item.monto)}</td>
              <td>${formatCurrency(item.saldo)}</td>
              <td>${status(item.estadoVenta)}</td>
              <td>${escapeHtml(item.accion)}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">Sin cobranza pendiente</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function openForm(type, id = null) {
  if (!schemas[type]) return;
  const schema = schemas[type];
  editing = { type, id };
  const row = id ? state[type].find((item) => item.id === id) : {};
  els.dialogTitle.textContent = schema.singular;
  els.dialogMode.textContent = id ? "Editar" : "Nuevo";
  els.formFields.innerHTML = schema.fields.map((item) => renderField(item, row?.[item.key])).join("");
  els.dialog.showModal();
}

function closeForm() {
  els.dialog.close();
  editing = null;
  els.form.reset();
}

function saveRecord(event) {
  event.preventDefault();
  const { type, id } = editing;
  const schema = schemas[type];
  const data = {};
  schema.fields.forEach((item) => {
    const input = els.form.elements[item.key];
    data[item.key] = item.type === "number" ? Number(input.value || 0) : input.value.trim();
  });

  if (id) {
    state[type] = state[type].map((item) => item.id === id ? { ...item, ...data, updatedAt: nowDate() } : item);
  } else {
    state[type].push({ id: makeId(type), ...data, createdAt: nowDate(), updatedAt: nowDate() });
  }

  saveState();
  closeForm();
  render();
}

function deleteRecord(type, id) {
  if (!confirm("¿Eliminar este registro?")) return;
  state[type] = state[type].filter((item) => item.id !== id);
  saveState();
  render();
}

function renderField(item, value = "") {
  const required = item.required ? "required" : "";
  const full = item.type === "textarea" ? " full" : "";
  if (item.type === "select") {
    const options = [`<option value="">Seleccionar</option>`].concat(
      item.options.map((option) => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
    ).join("");
    return `<div class="field${full}"><label for="${item.key}">${escapeHtml(item.label)}</label><select id="${item.key}" name="${item.key}" ${required}>${options}</select></div>`;
  }
  if (item.type === "textarea") {
    return `<div class="field${full}"><label for="${item.key}">${escapeHtml(item.label)}</label><textarea id="${item.key}" name="${item.key}" ${required}>${escapeHtml(value)}</textarea></div>`;
  }
  return `<div class="field${full}"><label for="${item.key}">${escapeHtml(item.label)}</label><input id="${item.key}" name="${item.key}" type="${item.type}" value="${escapeAttr(value)}" ${required}></div>`;
}

function getCobranzaRows() {
  const manual = state.cobranzaManual || [];
  const manualKeys = new Set(manual.map((item) => normalize(`${item.cliente}|${item.saldo}|${item.estadoVenta}`)));
  const dynamic = state.ventas
    .filter((item) => Number(item.saldo || 0) > 0)
    .map((item) => ({
      ...item,
      accion: Number(item.saldo) >= Number(item.monto) ? "Gestionar cobro urgente" : "Confirmar siguiente pago"
    }))
    .filter((item) => !manualKeys.has(normalize(`${item.cliente}|${item.saldo}|${item.estadoVenta}`)));
  return manual.concat(dynamic);
}

function filterRows(rows) {
  const query = normalize(els.search.value);
  if (!query) return rows;
  return rows.filter((row) => normalize(Object.values(row).join(" ")).includes(query));
}

function formatCell(value, key) {
  if (["monto", "saldo"].includes(key)) return formatCurrency(value);
  if (["estado", "estadoVenta", "estadoPago", "entrega"].includes(key)) return status(value);
  return escapeHtml(value || "");
}

function status(value) {
  const text = value || "POR DEFINIR";
  let tone = "";
  if (["PAGADO", "VENTA CERRADA", "ENTREGADO", "EN INVENTARIO", "EN USO"].includes(text)) tone = "ok";
  if (["PENDIENTE", "PARCIAL", "EN PROSPECCIÓN", "ENVIADO"].includes(text)) tone = "warn";
  if (["VENTA INCOMPLETA", "NO ENVIADO"].includes(text)) tone = "danger";
  return `<span class="status ${tone}">${escapeHtml(text)}</span>`;
}

function exportExcel() {
  const workbook = {
    Clientes: state.clientes,
    Ventas: state.ventas,
    Comodatos: state.comodatos,
    Cobranza: getCobranzaRows()
  };
  const html = Object.entries(workbook).map(([sheet, rows]) => tableForExport(sheet, rows)).join("<br>");
  const blob = new Blob([`\ufeff<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], {
    type: "application/vnd.ms-excel;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prokicks-inventario-${nowDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function tableForExport(title, rows) {
  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return `
    <h2>${escapeHtml(title)}</h2>
    <table border="1">
      <thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(row[key] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function sum(rows, key) {
  return rows.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0));
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function makeId(prefix) {
  return `${prefix.slice(0, 3).toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return seedState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedState() {
  const demo = {
    settings: {
      totalProducidos: 300,
      inventarioRedwood: 242,
      dashboard: {
        ventasCerradas: 19,
        ventasIncompletas: 5,
        vendidos: 24,
        comodato: 41
      }
    },
    clientes: [
      { id: "CLI-001", nombre: "Director de Filiales de Qro", empresa: "", contacto: "Paolo Irizar", ciudad: "", telefono: "", email: "", fuente: "LEADS", notas: "Importado de LEADS" },
      { id: "CLI-002", nombre: "Northridge instituto", empresa: "", contacto: "", ciudad: "", telefono: "", email: "", fuente: "LEADS", notas: "Importado de LEADS" },
      { id: "CLI-003", nombre: "Gerardo Torrado", empresa: "", contacto: "Gerardo Torrado - Dir. Deportivo", ciudad: "Monterrey", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-004", nombre: "Pachuca", empresa: "", contacto: "Armando Martinez", ciudad: "Pachuca", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-005", nombre: "Roberto Santillan", empresa: "", contacto: "Pako", ciudad: "", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-006", nombre: "Fernando Giardi", empresa: "", contacto: "", ciudad: "", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-007", nombre: "Diego Ramirez", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-008", nombre: "Jonathan Levin", empresa: "", contacto: "Jonathan", ciudad: "Phoenix", telefono: "", email: "", fuente: "VENTAS", notas: "Los llevo a Miami" },
      { id: "CLI-009", nombre: "Rick Minnesota", empresa: "", contacto: "Juan", ciudad: "", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-010", nombre: "Eduardo Delgado", empresa: "", contacto: "Jonathan", ciudad: "Florida", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-011", nombre: "Martina Levy", empresa: "", contacto: "Billy", ciudad: "Merida", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-012", nombre: "Venados Merida", empresa: "", contacto: "Jonathan", ciudad: "", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-013", nombre: "America", empresa: "", contacto: "Sean", ciudad: "", telefono: "", email: "", fuente: "VENTAS", notas: "Falta confirmar pago" },
      { id: "CLI-014", nombre: "Jimmy Gomez / Queretaro", empresa: "", contacto: "", ciudad: "Queretaro", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-015", nombre: "Tampico FC", empresa: "", contacto: "Daniel Cruz Vargas", ciudad: "Tampico", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-016", nombre: "Erick Sanchez", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-017", nombre: "Henry Martin", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-018", nombre: "Tepatitlan", empresa: "", contacto: "Amaury Escoto / Bruno Marioni", ciudad: "Tepatitlan", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-019", nombre: "Femexfut", empresa: "", contacto: "", ciudad: "Toluca", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-020", nombre: "Cruz Azul", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada. Pendiente contacto." },
      { id: "CLI-021", nombre: "Chivas FC", empresa: "", contacto: "Mariano Varela - Dir. Deportivo", ciudad: "Guadalajara", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-022", nombre: "Necaxa FC", empresa: "", contacto: "Roberto Esparza - Aux. Tecnico", ciudad: "Aguascalientes", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion a LMS y contacto directo" },
      { id: "CLI-023", nombre: "Atletico San Luis", empresa: "", contacto: "", ciudad: "San Luis Potosi", telefono: "", email: "", fuente: "PROSPECCION", notas: "Pendiente contacto con Club" },
      { id: "CLI-024", nombre: "Monterrey FC", empresa: "", contacto: "Nicolas Marteloto - Dir. Fuerzas Basicas", ciudad: "Monterrey", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-025", nombre: "Pumas UNAM", empresa: "", contacto: "Carlos Gutierrez - Dir. Deportivo", ciudad: "CDMX", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-026", nombre: "Toluca", empresa: "", contacto: "Francisco Suniaga", ciudad: "Toluca", telefono: "", email: "", fuente: "PROSPECCION", notas: "Acercamiento con Arturo Perez Arredondo" },
      { id: "CLI-027", nombre: "Santos", empresa: "", contacto: "Jose Riestra - Dir. Deportivo", ciudad: "", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-028", nombre: "Xolos", empresa: "", contacto: "Sebastian Abreu - DT", ciudad: "Tijuana", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-029", nombre: "Puebla", empresa: "", contacto: "Rafael Garcia - Dir. Deportivo", ciudad: "Puebla", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada a contacto" },
      { id: "CLI-030", nombre: "Atlas", empresa: "", contacto: "Jose Riestra - Dir. Deportivo", ciudad: "Guadalajara", telefono: "", email: "", fuente: "PROSPECCION", notas: "Presentacion entregada al LMS" },
      { id: "CLI-031", nombre: "Leon", empresa: "", contacto: "", ciudad: "Leon", telefono: "", email: "", fuente: "PROSPECCION", notas: "Buscar sinergia con Grupo Pachuca" },
      { id: "CLI-032", nombre: "Atlante", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "PROSPECCION", notas: "Pendiente contacto con Club" },
      { id: "CLI-033", nombre: "U de G", empresa: "", contacto: "Martin Campechano - Dir. Juridico", ciudad: "Guadalajara", telefono: "", email: "", fuente: "PROSPECCION", notas: "Cerrar venta 10-20 dispositivos personalizados" },
      { id: "CLI-034", nombre: "Tapatio", empresa: "", contacto: "Grupo Chivas", ciudad: "Guadalajara", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-035", nombre: "Morelia", empresa: "", contacto: "Zahid Munoz", ciudad: "Morelia", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-036", nombre: "Bravos", empresa: "", contacto: "", ciudad: "Juarez", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-037", nombre: "Cancun FC", empresa: "", contacto: "", ciudad: "Cancun", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-038", nombre: "Dorados FC", empresa: "", contacto: "Grupo Xolos", ciudad: "Culiacan", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-039", nombre: "Celaya FC", empresa: "", contacto: "", ciudad: "Celaya", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-040", nombre: "Zacatecas", empresa: "", contacto: "", ciudad: "Zacatecas", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-041", nombre: "Correcaminos", empresa: "", contacto: "", ciudad: "Tampico", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-042", nombre: "Irapuato", empresa: "", contacto: "", ciudad: "Irapuato", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-043", nombre: "Alebrijes", empresa: "", contacto: "", ciudad: "Oaxaca", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-044", nombre: "La Paz FC", empresa: "", contacto: "", ciudad: "La Paz", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-045", nombre: "Tlaxcala FC", empresa: "", contacto: "", ciudad: "Tlaxcala", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-046", nombre: "Jorge Santin", empresa: "", contacto: "Instagram", ciudad: "San Juan de los Lagos", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-047", nombre: "Tec MTY QRO", empresa: "", contacto: "Jorge", ciudad: "Queretaro", telefono: "", email: "", fuente: "PROSPECCION", notas: "" },
      { id: "CLI-048", nombre: "Elenna Lemus", empresa: "", contacto: "Jonathan - Sean", ciudad: "", telefono: "", email: "", fuente: "VENTAS", notas: "" },
      { id: "CLI-049", nombre: "Rodrigo Aguirre / Tigres", empresa: "", contacto: "", ciudad: "Monterrey", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-050", nombre: "Joel Huiqui / Cruz Azul", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-051", nombre: "Kings League", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-052", nombre: "Alejandro Zendejas", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-053", nombre: "Sport and Chips", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-054", nombre: "AFA Academy Gustavo Grossi", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-055", nombre: "Linda", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-056", nombre: "Fernando", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "Aparece tres veces en comodato" },
      { id: "CLI-057", nombre: "Alejandro Vargas", empresa: "", contacto: "", ciudad: "GDL", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-058", nombre: "Juan", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-059", nombre: "Julian Argentina", empresa: "", contacto: "", ciudad: "Buenos Aires", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-060", nombre: "America Femenil", empresa: "", contacto: "", ciudad: "", telefono: "", email: "", fuente: "COMODATO/COBRANZA", notas: "" },
      { id: "CLI-061", nombre: "Dary", empresa: "", contacto: "", ciudad: "", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-062", nombre: "Billy", empresa: "", contacto: "", ciudad: "", telefono: "", email: "", fuente: "COMODATO", notas: "" },
      { id: "CLI-063", nombre: "Seleccion Mexicana", empresa: "", contacto: "", ciudad: "CDMX", telefono: "", email: "", fuente: "COMODATO", notas: "" }
    ],
    ventas: [
      { id: "VEN-001", cliente: "Gerardo Torrado", contacto: "Gerardo Torrado - Dir. Deportivo", rep: "SEAN", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "Nov 29, 2025", ciudad: "MONTERREY", factura: "", notas: "" },
      { id: "VEN-002", cliente: "Pachuca", contacto: "Armando Martinez", rep: "PAKO", devices: 2, monto: 12000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "Nov 30, 2025", ciudad: "PACHUCA", factura: "SI", notas: "" },
      { id: "VEN-003", cliente: "Roberto Santillan", contacto: "PAKO", rep: "PAKO", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "", factura: "SI", notas: "" },
      { id: "VEN-004", cliente: "Fernando Giardi", contacto: "", rep: "", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "", factura: "", notas: "" },
      { id: "VEN-005", cliente: "Diego Ramirez", contacto: "", rep: "SEAN", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "CDMX", factura: "", notas: "" },
      { id: "VEN-006", cliente: "Jonathan Levin", contacto: "", rep: "", devices: 2, monto: 12000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "PHOENIX", factura: "", notas: "" },
      { id: "VEN-007", cliente: "Rick Minnesota", contacto: "Juan", rep: "JUAN", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "", factura: "", notas: "" },
      { id: "VEN-008", cliente: "Eduardo Delgado", contacto: "Jonathan", rep: "JONATHAN", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "FLORIDA", factura: "SI", notas: "" },
      { id: "VEN-009", cliente: "Martina Levy", contacto: "Billy", rep: "BILLY", devices: 1, monto: 6000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "Mar 11, 2026", ciudad: "MERIDA", factura: "", notas: "" },
      { id: "VEN-010", cliente: "Venados Merida", contacto: "Jonathan", rep: "JONATHAN", devices: 2, monto: 12000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "", factura: "", notas: "" },
      { id: "VEN-011", cliente: "Jonathan Levin", contacto: "Jonathan", rep: "JONATHAN", devices: 2, monto: 0, saldo: 0, estadoVenta: "", estadoPago: "PENDIENTE", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "", factura: "", notas: "Los llevo a Miami" },
      { id: "VEN-012", cliente: "America", contacto: "Sean", rep: "SEAN", devices: 2, monto: 12000, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PENDIENTE", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "", factura: "", notas: "Falta confirmar pago" },
      { id: "VEN-013", cliente: "Jimmy Gomez / Queretaro", contacto: "", rep: "JORGE", devices: 1, monto: 6000, saldo: 3000, estadoVenta: "VENTA INCOMPLETA", estadoPago: "PENDIENTE", formaPago: "TRANSFERENCIA", entrega: "ENTREGADO", fechaEntrega: "Mar 9, 2026", ciudad: "QUERETARO", factura: "", notas: "" },
      { id: "VEN-014", cliente: "Tampico FC", contacto: "Daniel Cruz Vargas", rep: "JORGE", devices: 1, monto: 6000, saldo: 3000, estadoVenta: "VENTA INCOMPLETA", estadoPago: "PENDIENTE", formaPago: "", entrega: "ENVIADO", fechaEntrega: "", ciudad: "TAMPICO", factura: "", notas: "" },
      { id: "VEN-015", cliente: "Erick Sanchez", contacto: "", rep: "SEAN", devices: 1, monto: 6000, saldo: 6000, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "EFECTIVO", entrega: "ENTREGADO", fechaEntrega: "", ciudad: "CDMX", factura: "", notas: "" },
      { id: "VEN-016", cliente: "Henry Martin", contacto: "", rep: "SEAN", devices: 1, monto: 6000, saldo: 6000, estadoVenta: "VENTA INCOMPLETA", estadoPago: "PAGADO", formaPago: "", entrega: "NO ENVIADO", fechaEntrega: "", ciudad: "CDMX", factura: "", notas: "" },
      { id: "VEN-017", cliente: "Tepatitlan", contacto: "Amaury Escoto / Bruno Marioni", rep: "JORGE/FERNANDO", devices: 1, monto: 0, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "TEPATITLAN", factura: "", notas: "" },
      { id: "VEN-018", cliente: "Femexfut", contacto: "", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "TOLUCA", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-019", cliente: "Cruz Azul", contacto: "", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "CDMX", factura: "", notas: "Presentacion entregada. Pendiente contacto." },
      { id: "VEN-020", cliente: "Chivas FC", contacto: "Mariano Varela - Dir. Deportivo", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "GUADALAJARA", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-021", cliente: "Necaxa FC", contacto: "Roberto Esparza - Aux. Tecnico", rep: "FERNANDO", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "AGUASCALIENTES", factura: "", notas: "Presentacion a LMS y contacto directo" },
      { id: "VEN-022", cliente: "Atletico San Luis", contacto: "", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "SAN LUIS POTOSI", factura: "", notas: "Pendiente contacto con Club" },
      { id: "VEN-023", cliente: "Monterrey FC", contacto: "Nicolas Marteloto - Dir. Fuerzas Basicas", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "MONTERREY", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-024", cliente: "Pumas UNAM", contacto: "Carlos Gutierrez - Dir. Deportivo", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "CDMX", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-025", cliente: "Toluca", contacto: "Francisco Suniaga", rep: "LMS/JUAN", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "TOLUCA", factura: "", notas: "Acercamiento con Arturo Perez Arredondo" },
      { id: "VEN-026", cliente: "Santos", contacto: "Jose Riestra - Dir. Deportivo", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-027", cliente: "Xolos", contacto: "Sebastian Abreu - DT", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "TIJUANA", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-028", cliente: "Puebla", contacto: "Rafael Garcia - Dir. Deportivo", rep: "FERNANDO", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "PUEBLA", factura: "", notas: "Presentacion entregada a contacto" },
      { id: "VEN-029", cliente: "Atlas", contacto: "Jose Riestra - Dir. Deportivo", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "GUADALAJARA", factura: "", notas: "Presentacion entregada al LMS" },
      { id: "VEN-030", cliente: "Leon", contacto: "", rep: "PACO", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "LEON", factura: "", notas: "Buscar sinergia con Grupo Pachuca" },
      { id: "VEN-031", cliente: "Atlante", contacto: "", rep: "LMS", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "CDMX", factura: "", notas: "Pendiente contacto con Club" },
      { id: "VEN-032", cliente: "U de G", contacto: "Martin Campechano - Dir. Juridico", rep: "FERNANDO", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "GUADALAJARA", factura: "", notas: "Cerrar venta 10-20 dispositivos personalizados" },
      { id: "VEN-033", cliente: "Tapatio", contacto: "Grupo Chivas", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "GUADALAJARA", factura: "", notas: "" },
      { id: "VEN-034", cliente: "Morelia", contacto: "Zahid Munoz", rep: "JORGE", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "MORELIA", factura: "", notas: "" },
      { id: "VEN-035", cliente: "Bravos", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "JUAREZ", factura: "", notas: "" },
      { id: "VEN-036", cliente: "Cancun FC", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "CANCUN", factura: "", notas: "" },
      { id: "VEN-037", cliente: "Dorados FC", contacto: "Grupo Xolos", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "CULIACAN", factura: "", notas: "" },
      { id: "VEN-038", cliente: "Celaya FC", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "CELAYA", factura: "", notas: "" },
      { id: "VEN-039", cliente: "Zacatecas", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "ZACATECAS", factura: "", notas: "" },
      { id: "VEN-040", cliente: "Correcaminos", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "TAMPICO", factura: "", notas: "" },
      { id: "VEN-041", cliente: "Irapuato", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "IRAPUATO", factura: "", notas: "" },
      { id: "VEN-042", cliente: "Alebrijes", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "OAXACA", factura: "", notas: "" },
      { id: "VEN-043", cliente: "La Paz FC", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "LA PAZ", factura: "", notas: "" },
      { id: "VEN-044", cliente: "Tlaxcala FC", contacto: "", rep: "", devices: 0, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "TLAXCALA", factura: "", notas: "" },
      { id: "VEN-045", cliente: "Jorge Santin", contacto: "Instagram", rep: "", devices: 1, monto: 6900, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "PAGADO", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "SAN JUAN DE LOS LAGOS", factura: "NO", notas: "" },
      { id: "VEN-046", cliente: "Tec MTY QRO", contacto: "Jorge", rep: "", devices: 2, monto: 0, saldo: 0, estadoVenta: "EN PROSPECCIÓN", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "QUERETARO", factura: "", notas: "" },
      { id: "VEN-047", cliente: "Elenna Lemus", contacto: "Jonathan - Sean", rep: "", devices: 1, monto: 0, saldo: 0, estadoVenta: "VENTA CERRADA", estadoPago: "", formaPago: "", entrega: "", fechaEntrega: "", ciudad: "", factura: "", notas: "" }
    ],
    comodatos: [
      { id: "COM-001", cliente: "Rodrigo Aguirre / Tigres", contacto: "", rep: "SEAN", devices: 3, estado: "EN USO", fechaEntrega: "Nov 2025", fechaDevolucion: "", ciudad: "MONTERREY", notas: "" },
      { id: "COM-002", cliente: "Joel Huiqui / Cruz Azul", contacto: "", rep: "SEAN", devices: 1, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-003", cliente: "Kings League", contacto: "", rep: "SEAN", devices: 1, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-004", cliente: "Alejandro Zendejas", contacto: "", rep: "SEAN", devices: 1, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-005", cliente: "Sport and Chips", contacto: "", rep: "PAKO", devices: 1, estado: "EN USO", fechaEntrega: "Nov 2025", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-006", cliente: "AFA Academy Gustavo Grossi", contacto: "", rep: "JORGE", devices: 1, estado: "EN USO", fechaEntrega: "feb-26", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-007", cliente: "Linda", contacto: "", rep: "BILLY", devices: 1, estado: "EN USO", fechaEntrega: "mar-26", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-008", cliente: "Fernando", contacto: "", rep: "BILLY", devices: 1, estado: "EN USO", fechaEntrega: "mar-26", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-009", cliente: "Fernando", contacto: "", rep: "BILLY", devices: 1, estado: "EN USO", fechaEntrega: "mar-26", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-010", cliente: "Alejandro Vargas", contacto: "", rep: "JONATHAN", devices: 1, estado: "EN USO", fechaEntrega: "mar-26", fechaDevolucion: "", ciudad: "GDL", notas: "" },
      { id: "COM-011", cliente: "Fernando", contacto: "", rep: "BILLY", devices: 1, estado: "EN USO", fechaEntrega: "mar-26", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-012", cliente: "Juan", contacto: "", rep: "JUAN", devices: 1, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "CDMX", notas: "" },
      { id: "COM-013", cliente: "Julian Argentina", contacto: "", rep: "JORGE", devices: 1, estado: "EN USO", fechaEntrega: "abr-26", fechaDevolucion: "", ciudad: "BUENOS AIRES", notas: "" },
      { id: "COM-014", cliente: "America Femenil", contacto: "", rep: "SEAN", devices: 3, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "", notas: "" },
      { id: "COM-015", cliente: "Dary", contacto: "", rep: "SEAN", devices: 1, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "", notas: "" },
      { id: "COM-016", cliente: "Billy", contacto: "", rep: "BILLY", devices: 14, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "", notas: "" },
      { id: "COM-017", cliente: "Jonathan", contacto: "", rep: "JONATHAN", devices: 2, estado: "EN USO", fechaEntrega: "", fechaDevolucion: "", ciudad: "", notas: "" },
      { id: "COM-018", cliente: "Seleccion Mexicana", contacto: "", rep: "FER", devices: 6, estado: "EN USO", fechaEntrega: "jun-26", fechaDevolucion: "", ciudad: "CDMX", notas: "" }
    ],
    cobranzaManual: [
      { id: "COB-001", cliente: "Erick Sanchez", rep: "SEAN", monto: 6000, saldo: 6000, estadoVenta: "VENTA CERRADA", accion: "Gestionar cobro urgente" },
      { id: "COB-002", cliente: "America Femenil", rep: "SEAN", monto: 18000, saldo: 18000, estadoVenta: "VENTA INCOMPLETA", accion: "Confirmar 2do pago" },
      { id: "COB-003", cliente: "Jimmy Gomez / Queretaro", rep: "JORGE", monto: 6000, saldo: 3000, estadoVenta: "VENTA INCOMPLETA", accion: "Confirmar 2do pago" },
      { id: "COB-004", cliente: "Tampico FC", rep: "JORGE", monto: 6000, saldo: 3000, estadoVenta: "VENTA INCOMPLETA", accion: "Confirmar 2do pago" },
      { id: "COB-005", cliente: "Henry Martin", rep: "SEAN", monto: 6000, saldo: 6000, estadoVenta: "VENTA INCOMPLETA", accion: "Confirmar 2do pago" }
    ]
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
  return demo;
}
