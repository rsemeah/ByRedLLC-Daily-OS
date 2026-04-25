const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const taskForm = document.querySelector("#quick-add");
const taskInput = document.querySelector("#task-input");
const taskLane = document.querySelector("#task-lane");
const taskList = document.querySelector("#task-list");
const clearComplete = document.querySelector("#clear-complete");
const openCount = document.querySelector("#open-tasks-count");
const leadCount = document.querySelector("#leads-count");
const proofCount = document.querySelector("#receipts-count");
const leadForm = document.querySelector("#lead-form");
const leadName = document.querySelector("#lead-name");
const leadProblem = document.querySelector("#lead-problem");
const leadStage = document.querySelector("#lead-stage");
const pipelineBoard = document.querySelector("#pipeline-board");
const proofForm = document.querySelector("#proof-form");
const proofStatus = document.querySelector("#proof-status");
const proofText = document.querySelector("#proof-text");
const proofList = document.querySelector("#proof-list");
const metricWebsite = document.querySelector("#metric-website");
const metricTasks = document.querySelector("#metric-tasks");
const metricLeads = document.querySelector("#metric-leads");
const metricReceipts = document.querySelector("#metric-receipts");

const stages = ["New Lead", "Conversation", "Proposal", "Won"];

const state = {
  tasks: load("pe.tasks", [
    { id: crypto.randomUUID(), text: "Verify website form destination", lane: "Proof", complete: false },
    { id: crypto.randomUUID(), text: "Package AI Automation Audit offer", lane: "Revenue", complete: false },
    { id: crypto.randomUUID(), text: "Draft client onboarding workflow", lane: "Delivery", complete: false },
  ]),
  leads: load("pe.leads", [
    { id: crypto.randomUUID(), name: "Example: Local service business", problem: "Slow lead response", stage: "New Lead" },
    { id: crypto.randomUUID(), name: "Example: Founder referral", problem: "Manual client intake", stage: "Conversation" },
  ]),
  proofs: load("pe.proofs", [
    { id: crypto.randomUUID(), status: "VERIFIED", text: "pennenterprisesllc.com screenshots show AI automation agency positioning." },
    { id: crypto.randomUUID(), status: "MISSING", text: "Form submission routing has not been tested in this workspace." },
  ]),
};

function load(key, fallback) {
  const saved = localStorage.getItem(key);
  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function save() {
  localStorage.setItem("pe.tasks", JSON.stringify(state.tasks));
  localStorage.setItem("pe.leads", JSON.stringify(state.leads));
  localStorage.setItem("pe.proofs", JSON.stringify(state.proofs));
}

function activateView(viewId) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
}

function focusAfterViewChange(targetId) {
  window.setTimeout(() => {
    document.getElementById(targetId)?.focus();
  }, 100);
}

function bindMetricAction(metric, action) {
  metric.addEventListener("click", action);
  metric.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  });
}

function renderTasks() {
  taskList.replaceChildren();

  state.tasks.forEach((task) => {
    const item = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    const lane = document.createElement("b");

    checkbox.type = "checkbox";
    checkbox.checked = task.complete;
    checkbox.addEventListener("change", () => {
      task.complete = checkbox.checked;
      save();
      renderTasks();
    });

    text.textContent = task.text;
    lane.textContent = task.lane;
    label.append(checkbox, text);
    item.classList.toggle("complete", task.complete);
    item.append(label, lane);
    taskList.append(item);
  });
}

function renderLeads() {
  pipelineBoard.replaceChildren();

  stages.forEach((stage) => {
    const column = document.createElement("article");
    const title = document.createElement("h2");
    const count = document.createElement("span");
    const list = document.createElement("div");
    const leads = state.leads.filter((lead) => lead.stage === stage);

    title.textContent = stage;
    count.textContent = `${leads.length} active`;
    list.className = "lead-stack";

    leads.forEach((lead) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "lead-card";
      card.innerHTML = `<strong></strong><small></small>`;
      card.querySelector("strong").textContent = lead.name;
      card.querySelector("small").textContent = lead.problem;
      card.addEventListener("click", () => advanceLead(lead.id));
      list.append(card);
    });

    column.append(title, count, list);
    pipelineBoard.append(column);
  });
}

function advanceLead(id) {
  const lead = state.leads.find((item) => item.id === id);
  const currentIndex = stages.indexOf(lead.stage);
  lead.stage = stages[Math.min(currentIndex + 1, stages.length - 1)];
  save();
  render();
}

function renderProofs() {
  proofList.replaceChildren();

  state.proofs.forEach((proof) => {
    const row = document.createElement("div");
    row.className = `proof-row ${proof.status.toLowerCase()}`;
    row.innerHTML = `<b></b><span></span>`;
    row.querySelector("b").textContent = proof.status;
    row.querySelector("span").textContent = proof.text;
    proofList.append(row);
  });
}

function renderCounts() {
  openCount.textContent = String(state.tasks.filter((task) => !task.complete).length);
  leadCount.textContent = String(state.leads.length);
  proofCount.textContent = String(state.proofs.length);
}

function render() {
  renderTasks();
  renderLeads();
  renderProofs();
  renderCounts();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => activateView(item.dataset.view));
});

bindMetricAction(metricWebsite, () => {
  window.open("https://pennenterprisesllc.com", "_blank", "noopener,noreferrer");
});

bindMetricAction(metricTasks, () => {
  activateView("command");
  focusAfterViewChange("task-list");
});

bindMetricAction(metricLeads, () => {
  activateView("leads");
  focusAfterViewChange("pipeline-board");
});

bindMetricAction(metricReceipts, () => {
  activateView("proof");
  focusAfterViewChange("proof-list");
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    taskInput.focus();
    return;
  }

  state.tasks.unshift({ id: crypto.randomUUID(), text, lane: taskLane.value, complete: false });
  taskInput.value = "";
  save();
  render();
});

clearComplete.addEventListener("click", () => {
  state.tasks = state.tasks.filter((task) => !task.complete);
  save();
  render();
});

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = leadName.value.trim();
  const problem = leadProblem.value.trim();

  if (!name || !problem) {
    (name ? leadProblem : leadName).focus();
    return;
  }

  state.leads.unshift({ id: crypto.randomUUID(), name, problem, stage: leadStage.value });
  leadName.value = "";
  leadProblem.value = "";
  save();
  render();
});

proofForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = proofText.value.trim();

  if (!text) {
    proofText.focus();
    return;
  }

  state.proofs.unshift({ id: crypto.randomUUID(), status: proofStatus.value, text });
  proofText.value = "";
  save();
  render();
});

render();

/* ── DeepSeek AI metric summaries ─────────────────────────── */
const METRICS_ENDPOINT = "/api/summarize-metrics";

async function loadAISummaries() {
  const tasks  = state.tasks;
  const leads  = state.leads;
  const proofs = state.proofs;

  try {
    const res = await fetch(METRICS_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tasks, leads, proofs }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const summary = await res.json();

    if (summary.tasks)    openCount.textContent  = summary.tasks;
    if (summary.leads)    leadCount.textContent  = summary.leads;
    if (summary.receipts) proofCount.textContent = summary.receipts;
  } catch (err) {
    console.error("AI summary failed, keeping numeric counts:", err);
  }
}

loadAISummaries();
setInterval(loadAISummaries, 5 * 60 * 1000);
