/* =========================
   Actividad 2: Gestor de tareas
   Aquí yo implemento POO + ES6+ + DOM + LocalStorage
   ========================= */

/* Aquí yo creo una función para escapar texto y evitar que se rompa el HTML */
const escapeHTML = (text) => {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

/* Aquí yo creo un id único usando lo moderno (y con fallback si el navegador no lo soporta) */
const crearId = () => (crypto?.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);

/* =========================
   Aquí yo defino la clase Tarea (POO)
   ========================= */
class Tarea {
  constructor({ id = crearId(), nombre, completa = false, prioridad = "media", createdAt = Date.now() }) {
    // Aquí yo guardo las propiedades mínimas: nombre + estado (y agrego prioridad/id para hacerlo más completo)
    this.id = id;
    this.nombre = nombre;
    this.completa = completa;
    this.prioridad = prioridad;
    this.createdAt = createdAt;
  }

  // Aquí yo cambio el estado de la tarea (completa/incompleta)
  alternarEstado() {
    this.completa = !this.completa;
  }

  // Aquí yo edito el contenido (nombre) de la tarea
  editar(nuevoNombre) {
    this.nombre = nuevoNombre;
  }

  // Aquí yo cambio la prioridad si lo necesito
  setPrioridad(nuevaPrioridad) {
    this.prioridad = nuevaPrioridad;
  }

  // Aquí yo convierto la tarea a un objeto plano para guardarlo en LocalStorage
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      completa: this.completa,
      prioridad: this.prioridad,
      createdAt: this.createdAt,
    };
  }
}

/* =========================
   Aquí yo defino la clase GestorDeTareas (POO)
   ========================= */
class GestorDeTareas {
  constructor() {
    // Aquí yo guardo la lista principal de tareas
    this.tareas = [];

    // Aquí yo guardo el estado de filtros/búsqueda
    this.filtro = "todas";   // todas | pendientes | completadas
    this.busqueda = "";

    // Aquí yo defino una llave para LocalStorage (persistencia)
    this.storageKey = "karlay_tareas_v1";

    // Aquí yo tomo referencias del DOM
    this.$input = document.getElementById("nueva-tarea");
    this.$selectPrioridad = document.getElementById("prioridad");
    this.$btnAgregar = document.getElementById("agregar-tarea");
    this.$error = document.getElementById("error");

    this.$buscar = document.getElementById("buscar-tareas");
    this.$chips = document.querySelectorAll(".todo__chip");

    this.$contador = document.getElementById("contador-tareas");
    this.$btnLimpiar = document.getElementById("limpiar-tareas");
    this.$lista = document.getElementById("lista-tareas");

    this.$progresoFill = document.getElementById("progreso-fill");
    this.$progresoPct = document.getElementById("progreso-porcentaje");

    // Aquí yo cargo lo guardado y luego renderizo
    this.cargar()
      .then(() => this.render())
      .catch(() => this.render());

    // Aquí yo conecto eventos (uso funciones flecha)
    this.iniciarEventos();
  }

  /* Aquí yo registro eventos del DOM usando ES6+ */
  iniciarEventos() {
    // Aquí yo agrego tarea al dar click
    this.$btnAgregar.addEventListener("click", () => this.agregarDesdeUI());

    // Aquí yo agrego tarea al presionar Enter en el input
    this.$input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.agregarDesdeUI();
    });

    // Aquí yo filtro en vivo por texto
    this.$buscar.addEventListener("input", (e) => {
      this.busqueda = e.target.value.trim().toLowerCase();
      this.render();
    });

    // Aquí yo cambio filtros (Todas/Pendientes/Completadas)
    this.$chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        this.filtro = chip.dataset.filter;
        this.actualizarChips();
        this.render();
      });
    });

    // Aquí yo limpio todo con confirmación
    this.$btnLimpiar.addEventListener("click", () => {
      if (this.tareas.length === 0) return;
      const ok = confirm("¿Seguro que quieres eliminar TODAS las tareas?");
      if (!ok) return;

      this.tareas = [];
      this.guardar().then(() => this.render());
    });

    // Aquí yo uso delegación de eventos para la lista (editar/eliminar/checkbox)
    this.$lista.addEventListener("click", (e) => {
      const item = e.target.closest(".todo__item");
      if (!item) return;

      const id = item.dataset.id;

      // Aquí yo elimino
      if (e.target.matches('[data-action="eliminar"]')) {
        this.eliminarTarea(id);
        return;
      }

      // Aquí yo edito
      if (e.target.matches('[data-action="editar"]')) {
        this.editarTareaPrompt(id);
        return;
      }
    });

    // Aquí yo detecto el cambio de checkbox (completar/incompletar)
    this.$lista.addEventListener("change", (e) => {
      if (!e.target.matches(".todo__check")) return;
      const item = e.target.closest(".todo__item");
      if (!item) return;
      this.alternarEstado(item.dataset.id);
    });
  }

  /* Aquí yo muestro cuál filtro está activo visualmente */
  actualizarChips() {
    this.$chips.forEach((chip) => {
      const activo = chip.dataset.filter === this.filtro;
      chip.classList.toggle("is-active", activo);
      chip.setAttribute("aria-pressed", activo ? "true" : "false");
    });
  }

  /* =========================
     Persistencia (LocalStorage con promesas)
     ========================= */

  // Aquí yo guardo en LocalStorage pero envuelto en Promise (como pide la rúbrica)
  guardar() {
    const payload = JSON.stringify(this.tareas.map((t) => t.toJSON()));
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(this.storageKey, payload);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Aquí yo leo LocalStorage (también con Promise)
  cargar() {
    return new Promise((resolve) => {
      try {
        const raw = localStorage.getItem(this.storageKey);
        const data = raw ? JSON.parse(raw) : [];
        this.tareas = data.map((obj) => new Tarea(obj));
      } catch {
        this.tareas = [];
      }
      resolve();
    });
  }

  /* =========================
     Operaciones principales (CRUD)
     ========================= */

  // Aquí yo valido y agrego desde lo que el usuario escribió
  agregarDesdeUI() {
    const nombre = this.$input.value.trim();
    const prioridad = this.$selectPrioridad.value;

    // Aquí yo valido que no esté vacío (ni con espacios)
    if (!nombre) {
      this.mostrarError("No puedo agregar una tarea vacía. Escribe algo primero.");
      return;
    }

    // Aquí yo creo la tarea y la agrego a la lista
    this.tareas.push(new Tarea({ nombre, prioridad }));

    // Aquí yo limpio el input y vuelvo a enfocarlo
    this.$input.value = "";
    this.$input.focus();

    // Aquí yo guardo y renderizo
    this.guardar().then(() => this.render());
  }

  // Aquí yo elimino una tarea por id
  eliminarTarea(id) {
    this.tareas = this.tareas.filter((t) => t.id !== id);
    this.guardar().then(() => this.render());
  }

  // Aquí yo alterno completa/incompleta por id
  alternarEstado(id) {
    const t = this.tareas.find((x) => x.id === id);
    if (!t) return;

    t.alternarEstado();
    this.guardar().then(() => this.render());
  }

  // Aquí yo edito la tarea usando un prompt (simple y funcional)
  editarTareaPrompt(id) {
    const t = this.tareas.find((x) => x.id === id);
    if (!t) return;

    const nuevo = prompt("Edita tu tarea:", t.nombre);
    if (nuevo === null) return; // aquí yo detecto si canceló

    const limpio = nuevo.trim();
    if (!limpio) {
      this.mostrarError("No puedo guardar una tarea vacía. Escribe un texto válido.");
      return;
    }

    t.editar(limpio);
    this.guardar().then(() => this.render());
  }

  /* =========================
     Render (DOM dinámico)
     ========================= */

  // Aquí yo aplico búsqueda + filtro y regreso lo visible
  obtenerTareasVisibles() {
    let lista = [...this.tareas];

    // Aquí yo filtro por búsqueda
    if (this.busqueda) {
      lista = lista.filter((t) => t.nombre.toLowerCase().includes(this.busqueda));
    }

    // Aquí yo filtro por estado
    if (this.filtro === "pendientes") lista = lista.filter((t) => !t.completa);
    if (this.filtro === "completadas") lista = lista.filter((t) => t.completa);

    return lista;
  }

  // Aquí yo actualizo contador y barra de progreso
  actualizarResumen() {
    const total = this.tareas.length;
    const completadas = this.tareas.filter((t) => t.completa).length;

    this.$contador.textContent = `${completadas}/${total} completadas`;

    const pct = total === 0 ? 0 : Math.round((completadas / total) * 100);
    this.$progresoFill.style.width = `${pct}%`;
    this.$progresoPct.textContent = `${pct}%`;
  }

  // Aquí yo pinto todo en pantalla usando template literals y forEach
  render() {
    this.actualizarResumen();

    const visibles = this.obtenerTareasVisibles();

    // Aquí yo muestro un mensaje si no hay tareas visibles
    if (visibles.length === 0) {
      this.$lista.innerHTML = `<li class="todo__empty">Aún no hay tareas. Agrega la primera arriba.</li>`;
      return;
    }

    let html = "";

    // Aquí yo recorro con forEach (ES6+) y construyo cada item
    visibles.forEach((t) => {
      const nombreSeguro = escapeHTML(t.nombre);
      const doneClass = t.completa ? "is-done" : "";
      const checked = t.completa ? "checked" : "";
      const pr = (t.prioridad || "media").toLowerCase();

      html += `
        <li class="todo__item ${doneClass}" data-id="${t.id}">
          <div class="todo__left">
            <input class="todo__check" type="checkbox" ${checked} aria-label="Marcar como completada" />
            <span class="pill pill--${pr}">${pr.toUpperCase()}</span>
            <span class="todo__name" title="${nombreSeguro}">${nombreSeguro}</span>
          </div>

          <div class="todo__actions">
            <button class="todo__btn" type="button" data-action="editar">Editar</button>
            <button class="todo__btn todo__btn--danger" type="button" data-action="eliminar">Eliminar</button>
          </div>
        </li>
      `;
    });

    this.$lista.innerHTML = html;
  }

  /* =========================
     UI helpers
     ========================= */

  // Aquí yo muestro errores de forma clara
  mostrarError(mensaje) {
    this.$error.textContent = mensaje;
    this.$error.style.display = "block";

    // Aquí yo oculto el error después de un rato para no estorbar
    setTimeout(() => {
      this.$error.style.display = "none";
      this.$error.textContent = "";
    }, 2500);
  }
}

/* Aquí yo inicializo mi aplicación cuando el DOM ya está listo (por defer) */
new GestorDeTareas();
