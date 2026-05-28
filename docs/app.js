const state = {
  query: "",
  tier: "All",
  hardware: "All",
  category: "All",
  difficulty: "All",
  source: "All",
  frontierOnly: false,
  view: "table"
};

const elements = {
  taskCount: document.querySelector("#taskCount"),
  tierLegend: document.querySelector("#tierLegend"),
  searchInput: document.querySelector("#searchInput"),
  tierFilter: document.querySelector("#tierFilter"),
  hardwareFilter: document.querySelector("#hardwareFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  difficultyFilter: document.querySelector("#difficultyFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  frontierToggle: document.querySelector("#frontierToggle"),
  resetFilters: document.querySelector("#resetFilters"),
  stats: document.querySelector("#stats"),
  charts: document.querySelector("#charts"),
  cardsView: document.querySelector("#cardsView"),
  tableView: document.querySelector("#tableView"),
  taskTable: document.querySelector("#taskTable"),
  viewButtons: document.querySelectorAll(".view-switcher button"),
  dialog: document.querySelector("#detailDialog"),
  detailContent: document.querySelector("#detailContent"),
  closeDialog: document.querySelector("#closeDialog")
};

function uniqueValues(key) {
  return [...new Set(TASKS.flatMap(task => Array.isArray(task[key]) ? task[key] : [task[key]]))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values) {
  select.innerHTML = `<option>All</option>${values.map(value => `<option>${escapeHtml(value)}</option>`).join("")}`;
}

function initFilters() {
  fillSelect(elements.tierFilter, uniqueValues("demoTier"));
  fillSelect(elements.hardwareFilter, uniqueValues("hardware"));
  fillSelect(elements.categoryFilter, uniqueValues("category"));
  fillSelect(elements.difficultyFilter, uniqueValues("difficulty"));
  fillSelect(elements.sourceFilter, uniqueValues("sourceType"));
}

function renderTierLegend() {
  elements.tierLegend.innerHTML = TIER_EXPLANATIONS.map(item => `
    <article class="tier-card">
      <strong>${escapeHtml(item.name)}</strong>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join("");
}

function matchesArrayFilter(task, key, value) {
  if (value === "All") return true;
  const field = task[key];
  return Array.isArray(field) ? field.includes(value) : field === value;
}

function filteredTasks() {
  const query = state.query.trim().toLowerCase();
  return TASKS.filter(task => {
    const searchable = [
      task.task,
      task.rationale,
      task.notes,
      task.sourceType,
      ...task.category,
      ...task.hardware,
      ...task.sourceOrg,
      ...task.complexity
    ].join(" ").toLowerCase();

    return (!query || searchable.includes(query))
      && matchesArrayFilter(task, "demoTier", state.tier)
      && matchesArrayFilter(task, "hardware", state.hardware)
      && matchesArrayFilter(task, "category", state.category)
      && matchesArrayFilter(task, "difficulty", state.difficulty)
      && matchesArrayFilter(task, "sourceType", state.source)
      && (!state.frontierOnly || task.frontierExample);
  });
}

function render() {
  const tasks = filteredTasks();
  elements.taskCount.textContent = `${tasks.length} of ${TASKS.length} tasks`;
  renderStats(tasks);
  renderCharts(tasks);
  renderCards(tasks);
  renderTable(tasks);
}

function renderStats(tasks) {
  const tiers = countBy(tasks, "demoTier");
  const hardware = countByArray(tasks, "hardware");
  elements.stats.innerHTML = `
    <div><strong>${tasks.length}</strong><span>Visible tasks</span></div>
    <div><strong>${tasks.filter(task => task.frontierExample).length}</strong><span>Frontier examples</span></div>
    <div><strong>${tiers["A - Flagship Demo"] || 0}</strong><span>Flagship candidates</span></div>
    <div><strong>${hardware["Dual Franka"] || 0}</strong><span>Dual Franka fit</span></div>
  `;
}

function renderCharts(tasks) {
  const chartData = [
    {
      title: "Hardware Fit",
      note: "multi-select matches",
      counts: countByArray(tasks, "hardware")
    },
    {
      title: "Difficulty",
      note: "tasks",
      counts: countBy(tasks, "difficulty")
    },
    {
      title: "Demo Tier",
      note: "tasks",
      counts: countBy(tasks, "demoTier")
    },
    {
      title: "Source Type",
      note: "tasks",
      counts: countBy(tasks, "sourceType")
    }
  ];

  elements.charts.innerHTML = chartData.map(chart => renderChart(chart)).join("");
}

function renderChart({ title, note, counts }) {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const gradient = conicGradient(entries, total);
  const topLabel = entries[0] ? entries[0][0] : "No data";

  return `
    <article class="chart-card">
      <div class="chart-card__head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(note)}</p>
        </div>
        <strong>${total}</strong>
      </div>
      <div class="chart-card__body">
        <div class="donut" style="background:${gradient}" aria-label="${escapeAttribute(title)} distribution">
          <span>${escapeHtml(String(total))}</span>
        </div>
        <div class="chart-legend">
          ${entries.slice(0, 7).map(([label, count], index) => `
            <div>
              <i style="background:${chartColor(index)}"></i>
              <span>${escapeHtml(label)}</span>
              <b>${count}</b>
            </div>
          `).join("")}
        </div>
      </div>
      <p class="chart-card__foot">Top: ${escapeHtml(topLabel)}</p>
    </article>
  `;
}

function renderCards(tasks) {
  elements.cardsView.innerHTML = tasks.map((task, index) => `
    <article class="task-card" style="--accent:${accentFor(task.demoTier)}">
      <button class="task-card__button" type="button" data-index="${TASKS.indexOf(task)}">
        ${renderVisual(task)}
        <div class="task-card__body">
          <div class="task-card__kicker">
            <span>${escapeHtml(task.demoTier)}</span>
            <span>${escapeHtml(task.difficulty)}</span>
          </div>
          <h3>${escapeHtml(task.task)}</h3>
          <p>${escapeHtml(task.rationale)}</p>
          <div class="chips">${task.hardware.slice(0, 3).map(chip).join("")}</div>
        </div>
      </button>
    </article>
  `).join("");

  elements.cardsView.querySelectorAll("[data-index]").forEach(button => {
    button.addEventListener("click", () => openDetail(TASKS[Number(button.dataset.index)]));
  });
}

function renderVisual(task) {
  const imageUrl = task.imageUrl || inferredImageUrl(task);
  if (imageUrl) {
    return `<img class="task-card__image" src="${escapeAttribute(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  }
  const label = task.category[0] || "Task";
  return `
    <div class="task-card__visual" aria-hidden="true">
      <span>${visualMark(task)}</span>
      <small>${escapeHtml(label)}</small>
    </div>
  `;
}

function renderTable(tasks) {
  elements.taskTable.innerHTML = tasks.map(task => `
    <tr>
      <td><button class="table-link" type="button" data-index="${TASKS.indexOf(task)}">${escapeHtml(task.task)}</button></td>
      <td>${escapeHtml(task.demoTier)}</td>
      <td>${escapeHtml(task.hardware.join(", "))}</td>
      <td>${escapeHtml(task.category.join(", "))}</td>
      <td>${escapeHtml(task.difficulty)}</td>
      <td>${escapeHtml(task.sourceOrg.join(", "))}</td>
    </tr>
  `).join("");

  elements.taskTable.querySelectorAll("[data-index]").forEach(button => {
    button.addEventListener("click", () => openDetail(TASKS[Number(button.dataset.index)]));
  });
}

function openDetail(task) {
  elements.detailContent.innerHTML = `
    <div class="detail">
      ${renderVisual(task)}
      <div>
        <p class="eyebrow">${escapeHtml(task.demoTier)} · ${escapeHtml(task.difficulty)}</p>
        <h2>${escapeHtml(task.task)}</h2>
        <p>${escapeHtml(task.rationale)}</p>
        <dl>
          <dt>Hardware Fit</dt><dd>${escapeHtml(task.hardware.join(", "))}</dd>
          <dt>Category</dt><dd>${escapeHtml(task.category.join(", "))}</dd>
          <dt>Complexity</dt><dd>${escapeHtml(task.complexity.join(", "))}</dd>
          <dt>Source</dt><dd>${escapeHtml(task.sourceOrg.join(", "))}</dd>
          <dt>Notes</dt><dd>${escapeHtml(task.notes || "No notes")}</dd>
        </dl>
        <a class="reference" href="${escapeAttribute(task.reference)}" target="_blank" rel="noreferrer">Open reference</a>
      </div>
    </div>
  `;
  elements.dialog.showModal();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", event => {
    state.query = event.target.value;
    render();
  });

  [
    ["tier", elements.tierFilter],
    ["hardware", elements.hardwareFilter],
    ["category", elements.categoryFilter],
    ["difficulty", elements.difficultyFilter],
    ["source", elements.sourceFilter]
  ].forEach(([key, select]) => {
    select.addEventListener("change", event => {
      state[key] = event.target.value;
      render();
    });
  });

  elements.frontierToggle.addEventListener("click", () => {
    state.frontierOnly = !state.frontierOnly;
    elements.frontierToggle.setAttribute("aria-pressed", String(state.frontierOnly));
    elements.frontierToggle.classList.toggle("is-active", state.frontierOnly);
    render();
  });

  elements.resetFilters.addEventListener("click", () => {
    Object.assign(state, { query: "", tier: "All", hardware: "All", category: "All", difficulty: "All", source: "All", frontierOnly: false });
    elements.searchInput.value = "";
    elements.tierFilter.value = "All";
    elements.hardwareFilter.value = "All";
    elements.categoryFilter.value = "All";
    elements.difficultyFilter.value = "All";
    elements.sourceFilter.value = "All";
    elements.frontierToggle.classList.remove("is-active");
    elements.frontierToggle.setAttribute("aria-pressed", "false");
    render();
  });

  elements.viewButtons.forEach(button => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      elements.viewButtons.forEach(item => item.classList.toggle("is-active", item === button));
      elements.tableView.hidden = state.view !== "table";
      elements.cardsView.hidden = state.view !== "cards";
    });
  });

  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
}

function countBy(tasks, key) {
  return tasks.reduce((counts, task) => {
    counts[task[key]] = (counts[task[key]] || 0) + 1;
    return counts;
  }, {});
}

function countByArray(tasks, key) {
  return tasks.reduce((counts, task) => {
    task[key].forEach(value => counts[value] = (counts[value] || 0) + 1);
    return counts;
  }, {});
}

function conicGradient(entries, total) {
  if (!total) return "#e5e0d6";
  let start = 0;
  const stops = entries.map(([, count], index) => {
    const end = start + (count / total) * 100;
    const stop = `${chartColor(index)} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function chartColor(index) {
  return [
    "#d94f36",
    "#4f7a67",
    "#536f91",
    "#b7791f",
    "#7b5f9e",
    "#c25f83",
    "#69717c",
    "#8b6f47"
  ][index % 8];
}

function chip(value) {
  return `<span>${escapeHtml(value)}</span>`;
}

function visualMark(task) {
  if (task.category.includes("Dexterous Hand")) return "5F";
  if (task.category.includes("Laundry")) return "LD";
  if (task.category.includes("Kitchen")) return "KT";
  if (task.category.includes("Industrial")) return "IN";
  if (task.category.includes("Cleaning")) return "CL";
  if (task.category.includes("Clutter Sorting")) return "CS";
  return "VL";
}

function inferredImageUrl(task) {
  if (task.sourceOrg.includes("Figure AI")) {
    return "https://images.ctfassets.net/qx5k8y1u9drj/2wRk1FxvA5mPvUStmShycO/ce2db2efd18b9e90005dc8b7684cd936/DISHES_1200x630__1.jpg";
  }
  if (task.sourceOrg.includes("Stanford/Mobile ALOHA")) {
    return "https://mobile-aloha.github.io/static/images/preview.gif";
  }
  if (task.sourceOrg.includes("Physical Intelligence")) {
    return "https://www.pi.website/images/pi0-og.png";
  }
  if (task.sourceOrg.includes("ALOHA/ACT")) {
    return "https://tonyzhaozh.github.io/aloha/resources/algo.png";
  }
  if (task.sourceOrg.includes("BridgeData")) {
    if (task.category.includes("Cleaning")) {
      return "https://rail-berkeley.github.io/bridgedata/teaser_videos/bridge_data_v1_berkeley_realkitchen1_counter_pick_up_sponge_and_wipe_plate.jpg";
    }
    if (task.category.includes("Laundry")) {
      return "https://rail-berkeley.github.io/bridgedata/teaser_videos/bridge_data_v2_datacol2_folding_table_fold_cloth_pnp_01.jpg";
    }
    return "https://rail-berkeley.github.io/bridgedata/figures/teaser.png";
  }
  if (task.category.includes("Laundry")) {
    return "https://www.pi.website/images/pi0-og.png";
  }
  if (task.category.includes("Kitchen") || task.category.includes("Household")) {
    return "https://rail-berkeley.github.io/bridgedata/teaser_videos/bridge_data_v1_berkeley_realkitchen1_dishwasher_pick_up_any_cup.jpg";
  }
  if (task.category.includes("Tool Use")) {
    return "https://rail-berkeley.github.io/bridgedata/teaser_videos/bridge_data_v1_berkeley_tool_chest_pick_up_closest_rainbow_Allen_key_set.jpg";
  }
  if (task.category.includes("Clutter Sorting")) {
    return "https://rail-berkeley.github.io/bridgedata/teaser_videos/bridge_data_v2_datacol2_tabletop_dark_wood_many_skills_00.jpg";
  }
  return "";
}

function accentFor(tier) {
  return {
    "A - Flagship Demo": "#d94f36",
    "B - Roadmap Candidate": "#b7791f",
    "C - Capability Milestone": "#3f7f6f",
    "D - Reference Benchmark": "#69717c"
  }[tier] || "#69717c";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

renderTierLegend();
initFilters();
bindEvents();
render();
