const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const courseInput = document.getElementById("task-course");
const descInput = document.getElementById("task-desc");
const dueDateInput = document.getElementById("task-due-date");
const prioritySelect = document.getElementById("task-priority");
const list = document.getElementById("task-list");
const filterButtons = document.querySelectorAll(".filters button");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
let currentFilter = "all";

const priorityOrder = { alta: 0, media: 1, baja: 2 };

function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function formatDueDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-419", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeText(value) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function daysUntilDue(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${date}T00:00:00`);
  return Math.round((dueDate - today) / 86400000);
}

function getRecommendedTasks() {
  return tasks
    .filter(task => !task.done)
    .sort((a, b) => {
      const daysA = a.dueDate ? daysUntilDue(a.dueDate) : Infinity;
      const daysB = b.dueDate ? daysUntilDue(b.dueDate) : Infinity;
      const urgencyA = daysA < 0 ? 0 : daysA <= 2 ? 1 : 2;
      const urgencyB = daysB < 0 ? 0 : daysB <= 2 ? 1 : 2;
      return urgencyA - urgencyB
        || (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
        || daysA - daysB;
    });
}

function getAssistantReply(question) {
  const normalizedQuestion = normalizeText(question);
  const requestedCourse = [...new Set(tasks.map(task => task.course?.trim()).filter(Boolean))]
    .find(course => normalizedQuestion.includes(normalizeText(course)));
  const scopedTasks = requestedCourse
    ? tasks.filter(task => normalizeText(task.course || "") === normalizeText(requestedCourse))
    : tasks;
  const pendingTasks = scopedTasks.filter(task => !task.done);
  const recommendationTerms = /prioriz|urgente|primero|empez|recomiend|deberia|que hago|por donde/;
  const dateTerms = /fecha|vence|venc|plazo|limite|manana|hoy/;
  const completedTerms = /complet|terminad|hech|finaliz/;

  if (/\b(hola|buenas|buenos dias|buenas tardes)\b/.test(normalizedQuestion)) {
    return "¡Hola! Puedo revisar tus tareas y fechas para ayudarte a organizarte. ¿Qué quieres saber?";
  }

  if (recommendationTerms.test(normalizedQuestion)) {
    const recommendedTasks = getRecommendedTasks().filter(task => !requestedCourse
      || normalizeText(task.course || "") === normalizeText(requestedCourse));
    if (!recommendedTasks.length) return "¡Todo al día! No tienes tareas pendientes.";

    const topTasks = recommendedTasks.slice(0, 3).map((task, index) => {
      let reason = `prioridad ${task.priority}`;
      if (task.dueDate) {
        const days = daysUntilDue(task.dueDate);
        reason = days < 0
          ? `venció el ${formatDueDate(task.dueDate)}`
          : days === 0
            ? "vence hoy"
            : days === 1
              ? "vence mañana"
              : `vence el ${formatDueDate(task.dueDate)}`;
      }
      const course = task.course ? `, ${task.course}` : "";
      return `${index + 1}. ${task.title}${course} (${reason})`;
    });
    return `Te recomiendo empezar por:\n${topTasks.join("\n")}\n\nConsideré primero las fechas vencidas o próximas y después la prioridad.`;
  }

  if (dateTerms.test(normalizedQuestion)) {
    const datedTasks = pendingTasks
      .filter(task => task.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (!datedTasks.length) return "No hay fechas límite en tus tareas pendientes.";

    return `Estas son tus próximas fechas límite:\n${datedTasks.slice(0, 5).map(task => {
      const days = daysUntilDue(task.dueDate);
      const timing = days < 0 ? " (vencida)" : days === 0 ? " (hoy)" : days === 1 ? " (mañana)" : "";
      const course = task.course ? ` (${task.course})` : "";
      return `• ${task.title}${course}: ${formatDueDate(task.dueDate)}${timing}`;
    }).join("\n")}`;
  }

  if (completedTerms.test(normalizedQuestion)) {
    const completedCount = scopedTasks.filter(task => task.done).length;
    return `Has completado ${completedCount} ${completedCount === 1 ? "tarea" : "tareas"}.`;
  }

  if (/pendient|resumen|cuantas tareas|cuantas tengo|que tareas tengo/.test(normalizedQuestion)) {
    if (!pendingTasks.length) return "No tienes tareas pendientes. ¡Buen trabajo!";
    if (requestedCourse) {
      return `Tareas pendientes de ${requestedCourse}:\n${pendingTasks.map(task => `• ${task.title}`).join("\n")}`;
    }
    return `Tienes ${pendingTasks.length} ${pendingTasks.length === 1 ? "tarea pendiente" : "tareas pendientes"}. ${pendingTasks.filter(task => task.priority === "alta").length} tienen prioridad alta.`;
  }

  if (requestedCourse) {
    if (!scopedTasks.length) return `No tienes tareas del curso ${requestedCourse}.`;
    return `Tareas de ${requestedCourse}:\n${scopedTasks.map(task => {
      const status = task.done ? "completada" : "pendiente";
      return `• ${task.title} (${status})`;
    }).join("\n")}`;
  }

  const matchingTask = tasks.find(task => normalizeText(task.title).length > 2
    && normalizedQuestion.includes(normalizeText(task.title)));
  if (matchingTask) {
    const status = matchingTask.done ? "completada" : "pendiente";
    const course = matchingTask.course ? ` Es del curso ${matchingTask.course}.` : "";
    const dueDate = matchingTask.dueDate ? ` Su fecha límite es el ${formatDueDate(matchingTask.dueDate)}.` : " No tiene fecha límite.";
    return `“${matchingTask.title}” está ${status} y tiene prioridad ${matchingTask.priority}.${course}${dueDate}`;
  }

  return "Puedo consultar tus prioridades, tareas pendientes, completadas y fechas límite. Prueba con “¿qué debería priorizar?” o “¿qué vence pronto?”";
}

function addChatMessage(text, sender) {
  const message = document.createElement("div");
  message.className = `message ${sender}-message`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage(question) {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return;
  addChatMessage(trimmedQuestion, "user");
  addChatMessage(getAssistantReply(trimmedQuestion), "assistant");
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
      const content = document.createElement("div");
      const heading = document.createElement("div");
      heading.className = "task-heading";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = t.title;
      heading.appendChild(title);
      if (t.course) {
        const course = document.createElement("span");
        course.className = "course";
        course.textContent = t.course;
        heading.appendChild(course);
      }
      content.appendChild(heading);
      if (t.desc) {
        const description = document.createElement("div");
        description.className = "desc";
        description.textContent = t.desc;
        content.appendChild(description);
      }
      if (t.dueDate) {
        const dueDate = document.createElement("div");
        dueDate.className = "due-date";
        dueDate.textContent = `Fecha límite: ${formatDueDate(t.dueDate)}`;
        content.appendChild(dueDate);
      }
      li.appendChild(content);

      const actions = document.createElement("div");
      actions.className = "actions";
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.dataset.toggle = t.id;
      toggleButton.title = "Completar";
      toggleButton.textContent = t.done ? "↩️" : "✅";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.dataset.delete = t.id;
      deleteButton.title = "Eliminar";
      deleteButton.textContent = "🗑️";
      actions.append(toggleButton, deleteButton);
      li.appendChild(actions);
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
    course: courseInput.value.trim(),
    desc: descInput.value.trim(),
    dueDate: dueDateInput.value,
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

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendChatMessage(chatInput.value);
  chatInput.value = "";
  chatInput.focus();
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendChatMessage(button.dataset.prompt));
});