const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-desc");
const prioritySelect = document.getElementById("task-priority");
const list = document.getElementById("task-list");
const filterButtons = document.querySelectorAll(".filters button");

let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
let currentFilter = "all";

const priorityOrder = { alta: 0, media: 1, baja: 2 };

function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function render() {
  list.innerHTML = "";

  const filtered = tasks.filter(t => {
    if (currentFilter === "pending") return !t.done;
    if (currentFilter === "done") return t.done;
    return true;
  });

  filtered
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .forEach(t => {
      const li = document.createElement("li");
      li.className = `task ${t.priority} ${t.done ? "done" : ""}`;
      li.innerHTML = `
        <div>
          <div class="title">${t.title}</div>
          ${t.desc ? `<div class="desc">${t.desc}</div>` : ""}
        </div>
        <div class="actions">
          <button data-toggle="${t.id}" title="Completar">${t.done ? "↩️" : "✅"}</button>
          <button data-delete="${t.id}" title="Eliminar">🗑️</button>
        </div>
      `;
      list.appendChild(li);
    });

  list.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle;
      tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
      save();
      render();
    });
  });

  list.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delete;
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    });
  });
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const task = {
    id: crypto.randomUUID(),
    title: titleInput.value.trim(),
    desc: descInput.value.trim(),
    priority: prioritySelect.value,
    done: false,
  };
  tasks.push(task);
  save();
  form.reset();
  prioritySelect.value = "media";
  render();
});

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

render();