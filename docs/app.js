const state = {
  query: "",
  tier: "All",
  hardware: "All",
  category: "All",
  difficulty: "All",
  source: "All",
  frontierOnly: false,
  view: "table",
  guide: "Demo Tier"
};

const elements = {
  taskCount: document.querySelector("#taskCount"),
  guideTitle: document.querySelector("#guideTitle"),
  guideSummary: document.querySelector("#guideSummary"),
  guideTabs: document.querySelector("#guideTabs"),
  guideLegend: document.querySelector("#guideLegend"),
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

const GUIDE_SECTIONS = {
  "Demo Tier": {
    summary: "A neutral public-facing ranking for selecting demo candidates, roadmap targets, internal milestones, and benchmark references.",
    items: [
      ["A - Flagship Demo", "Public-facing hero demo candidate. The outcome should be immediately legible to a non-technical viewer."],
      ["B - Roadmap Candidate", "Medium-term target that may need more hardware integration, data, or a staged version."],
      ["C - Capability Milestone", "Internal milestone for validating skills, data collection, or model behavior before a stronger demo."],
      ["D - Reference Benchmark", "Frontier or benchmark reference used to calibrate ambition, not necessarily a near-term demo."]
    ]
  },
  "Hardware": {
    summary: "Hardware labels are grouped into five public-facing embodiments so the roadmap stays readable.",
    items: [
      ["Single arm", "One robot arm with a gripper for tabletop, appliance, wiping, sorting, and tool-use milestones."],
      ["Dual arm", "Two arms working together for bimanual handling, deformables, folding, packaging, and assembly."],
      ["5-finger hand", "Dexterous hand tasks involving fingertips, in-hand motion, tactile control, and small objects."],
      ["Mobile", "Manipulator on a mobile base for room-scale tasks, delivery, appliances, and navigation plus manipulation."],
      ["Humanoid", "Upper-body or full-body humanoid direction for human-space kitchen, home, and industrial station demos."]
    ]
  },
  "Difficulty": {
    summary: "Difficulty estimates physical complexity, integration risk, data burden, and demo reliability.",
    items: [
      ["Medium", "Feasible as a near-term milestone with constrained setup and moderate data collection."],
      ["High", "Requires robust perception, contact handling, sequencing, or bimanual coordination."],
      ["Frontier", "Comparable to frontier company or advanced benchmark demos; useful as a roadmap anchor."]
    ]
  },
  "Source Type": {
    summary: "Source labels separate frontier company examples, academic work, benchmarks, open-source references, and lab-level reproductions.",
    items: [
      ["Frontier Company", "Public examples from companies building general-purpose robot models or humanoid systems."],
      ["Academic", "Research demos or papers that provide strong task inspiration."],
      ["Benchmark", "Structured evaluation tasks useful for capability tracking."],
      ["Open-source", "Tasks from released models, datasets, or project pages."],
      ["Lab-level", "Tasks that labs or makers have shown with lower-cost platforms and can be adapted locally."]
    ]
  }
};

const HARDWARE_GROUPS = {
  "Franka single arm": "Single arm",
  "Dual Franka": "Dual arm",
  "Right 5-finger hand": "5-finger hand",
  "Mobile manipulator": "Mobile",
  "Future humanoid": "Humanoid",
  "SO101/ALOHA": "Dual arm"
};

function uniqueValues(key) {
  return [...new Set(TASKS.flatMap(task => Array.isArray(task[key]) ? task[key] : [task[key]]))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function hardwareLabels(task) {
  return [...new Set(task.hardware.map(value => HARDWARE_GROUPS[value] || value))];
}

function fillSelect(select, values) {
  select.innerHTML = `<option>All</option>${values.map(value => `<option>${escapeHtml(value)}</option>`).join("")}`;
}

function initFilters() {
  fillSelect(elements.tierFilter, uniqueValues("demoTier"));
  fillSelect(elements.hardwareFilter, [...new Set(TASKS.flatMap(hardwareLabels))].sort((a, b) => a.localeCompare(b)));
  fillSelect(elements.categoryFilter, uniqueValues("category"));
  fillSelect(elements.difficultyFilter, uniqueValues("difficulty"));
  fillSelect(elements.sourceFilter, uniqueValues("sourceType"));
}

function renderGuide() {
  const guide = GUIDE_SECTIONS[state.guide];
  elements.guideTitle.textContent = state.guide;
  elements.guideSummary.textContent = guide.summary;
  elements.guideTabs.innerHTML = Object.keys(GUIDE_SECTIONS).map(name => `
    <button class="${name === state.guide ? "is-active" : ""}" type="button" data-guide="${escapeAttribute(name)}">${escapeHtml(name)}</button>
  `).join("");
  elements.guideLegend.innerHTML = guide.items.map(([name, description]) => `
    <article class="tier-card">
      <strong>${escapeHtml(name)}</strong>
      <p>${escapeHtml(description)}</p>
    </article>
  `).join("");

  elements.guideTabs.querySelectorAll("[data-guide]").forEach(button => {
    button.addEventListener("click", () => {
      state.guide = button.dataset.guide;
      renderGuide();
    });
  });
}

function matchesArrayFilter(task, key, value) {
  if (value === "All") return true;
  if (key === "hardware") return hardwareLabels(task).includes(value);
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
  elements.stats.innerHTML = "";
}

function renderCharts(tasks) {
  const chartData = [
    {
      title: "Hardware Fit",
      note: "multi-select matches",
      counts: countHardware(tasks)
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
          <div class="chips">${hardwareLabels(task).slice(0, 3).map(chip).join("")}</div>
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
      <td>${escapeHtml(hardwareLabels(task).join(", "))}</td>
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
      <div class="detail__media">${renderVisual(task)}</div>
      <div class="detail__content">
        <p class="eyebrow">${escapeHtml(task.demoTier)} · ${escapeHtml(task.difficulty)}</p>
        <h2>${escapeHtml(task.task)}</h2>
        <p>${escapeHtml(task.rationale)}</p>
        <dl>
          <dt>Hardware Fit</dt><dd>${escapeHtml(hardwareLabels(task).join(", "))}</dd>
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

function countHardware(tasks) {
  return tasks.reduce((counts, task) => {
    hardwareLabels(task).forEach(value => counts[value] = (counts[value] || 0) + 1);
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
  const bridge = "https://rail-berkeley.github.io/bridgedata/";
  const images = {
    "Laundry folding from random pile": "https://www.pi.website/images/pi_partner.png",
    "Table bussing: dishes, trash, cups, utensils": `${bridge}teaser_videos/bridge_data_v1_berkeley_realkitchen1_dishwasher_pick_up_any_cup.jpg`,
    "Clutter sorting across many objects": `${bridge}teaser_videos/bridge_data_v2_datacol2_tabletop_dark_wood_many_skills_00.jpg`,
    "Grocery bagging by spoken/category instruction": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen4_put_banana_in_pot_or_pan.jpg`,
    "Box building from flattened cardboard": "https://www.pi.website/images/pi0-og.png",
    "Food-to-go packing and closing container": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen1_put_banana_on_plate.jpg`,
    "Egg packing into carton and closing lid": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen6_put_beet_in_pot_sink.jpg`,
    "Dish rack organization: cups, bowls, plates": `${bridge}teaser_videos/bridge_data_v1_berkeley_realkitchen1_dishwasher_pick_up_any_cup.jpg`,
    "Dishwasher unload/load across kitchen": "https://images.ctfassets.net/qx5k8y1u9drj/2wRk1FxvA5mPvUStmShycO/ce2db2efd18b9e90005dc8b7684cd936/DISHES_1200x630__1.jpg",
    "Microwave operation: open, insert, close": `${bridge}teaser_videos/bridge_data_v2_datacol2_toykitchen7_drawer_pnp_01.jpg`,
    "Coffee pouring with changing pot weight": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen2_room8052_turn_lever_vertical_to_front.jpg`,
    "Bottle cap unscrewing with tactile/force control": "https://www.pi.website/images/olympics-og.png",
    "Pill extraction from medicine organizer": "https://images.ctfassets.net/qx5k8y1u9drj/2wRk1FxvA5mPvUStmShycO/ce2db2efd18b9e90005dc8b7684cd936/DISHES_1200x630__1.jpg",
    "Syringe 5 ml precise dispense": "https://www.pi.website/images/olympics-og.png",
    "Rotate hex nut with fingertips": "https://www.chenbao.tech/dexart/static/images/conclusion2.jpg",
    "Use key in lock without putting key down": "https://www.pi.website/images/olympics-og.png",
    "Peanut butter sandwich with knife spreading": "https://www.pi.website/images/olympics-og.png",
    "Clean window with spray bottle and paper towel": "https://www.pi.website/images/olympics-og.png",
    "Clean greasy pan with water and sponge": `${bridge}teaser_videos/bridge_data_v1_berkeley_realkitchen1_counter_pick_up_sponge_and_wipe_plate.jpg`,
    "Dryer unloading into basket": `${bridge}teaser_videos/bridge_data_v1_berkeley_laundry_machine_put_clothes_in_laundry_machine.jpg`,
    "Living room tidying with mixed clutter": "https://www.pi.website/images/pi0-og.png",
    "Put heavy pot into two-door cabinet": "https://mobile-aloha.github.io/static/images/preview.gif",
    "Sauté shrimp and serve": "https://mobile-aloha.github.io/static/images/preview.gif",
    "Call elevator and enter": "https://mobile-aloha.github.io/static/images/preview.gif",
    "Cable tie threading": "https://tonyzhaozh.github.io/aloha/resources/algo.png",
    "Battery slot insertion": "https://tonyzhaozh.github.io/aloha/resources/algo.png",
    "GPU rail insertion / connector assembly": "https://tonyzhaozh.github.io/aloha/resources/algo.png",
    "Set dining table": `${bridge}teaser_videos/rss_toykitchen2_set_table_00.jpg`,
    "Set study table: books, pen, laptop, cup": `${bridge}teaser_videos/bridge_data_v1_berkeley_tool_chest_pick_up_closest_rainbow_Allen_key_set.jpg`,
    "Find unseen object in clutter": `${bridge}goals/unseen_pnp.jpg`,
    "Wipe countertop / erase marker stroke with cloth": `${bridge}teaser_videos/bridge_data_v1_berkeley_realkitchen1_counter_pick_up_sponge_and_wipe_plate.jpg`,
    "Build simple electrical circuit with clips and batteries": `${bridge}teaser_videos/bridge_data_v1_berkeley_tool_chest_pick_up_closest_rainbow_Allen_key_set.jpg`,
    "SO101 bimanual t-shirt folding": `${bridge}teaser_videos/bridge_data_v2_datacol2_folding_table_fold_cloth_pnp_01.jpg`,
    "Dexterous in-hand reorientation": "https://www.chenbao.tech/dexart/static/images/conclusion3.jpg",
    "Dexterous tool use with tweezers/dropper/scissors": "https://www.chenbao.tech/dexart/static/images/conclusion4.jpg",
    "Furniture assembly": "https://clvrai.github.io/furniture-bench/website_img/thumbnail.jpg",
    "Clean entire kitchen from high-level prompt": "https://robocasa.ai/assets/images/og-image.png",
    "Clean bedroom / make bed from high-level prompt": "https://www.pi.website/images/pi0-og.png",
    "Bed making / pillow rearrangement": "https://www.pi.website/images/pi0-og.png",
    "Turn sock inside-out": "https://www.pi.website/images/olympics-og.png",
    "Use dog poop bag: open, cover gripper, pick, invert": "https://www.pi.website/images/olympics-og.png",
    "Peel orange with tool or fingertips": "https://www.pi.website/images/olympics-og.png",
    "Pick moving object from conveyor": "https://images.ctfassets.net/qx5k8y1u9drj/2wRk1FxvA5mPvUStmShycO/ce2db2efd18b9e90005dc8b7684cd936/DISHES_1200x630__1.jpg",
    "Rinse used pan at faucet": `${bridge}teaser_videos/bridge_data_v1_berkeley_realkitchen1_counter_pick_up_sponge_and_wipe_plate.jpg`,
    "Ziploc bag slide open/close": "https://tonyzhaozh.github.io/aloha/resources/algo.png",
    "Open translucent condiment cup": "https://tonyzhaozh.github.io/aloha/resources/algo.png",
    "Bimanual chip handover": "https://robocasa.ai/assets/images/og-image.png",
    "RoboCasa kitchen tasks: appliance/object routines": "https://robocasa.ai/assets/images/og-image.png",
    "Place-by-color with yarn balls and misoriented objects": `${bridge}teaser_videos/bridge_data_v2_datacol2_tabletop_dark_wood_many_skills_00.jpg`,
    "Reorient cup and plate before final placement": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen2_room8052_flip_salt_upright.jpg`,
    "Rearrange chemistry tubes": `${bridge}teaser_videos/bridge_data_v1_berkeley_toysink1_room8052_flip_pot_upright_which_is_in_sink.jpg`,
    "Make juice / cool drink": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen2_room8052_turn_lever_vertical_to_front.jpg`,
    "Hammer nail": `${bridge}teaser_videos/bridge_data_v1_berkeley_tool_chest_pick_up_closest_rainbow_Allen_key_set.jpg`,
    "Open drawer and put multiple items inside": `${bridge}teaser_videos/bridge_data_v2_datacol2_toykitchen7_drawer_pnp_01.jpg`,
    "Sweep dirt/granular media into dustpan": `${bridge}teaser_videos/bridge_data_v2_datacol2_toykitchen7_sweep_granular_00.jpg`,
    "Open/close jar": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen5_close_cabinet.jpg`,
    "Stack cups / stack bowls": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen1_put_banana_on_plate.jpg`,
    "Stack wine bottle into rack": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen2_room8052_flip_salt_upright.jpg`,
    "Put money/object in safe and close": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen5_close_cabinet.jpg`,
    "Sort shapes into shape sorter": `${bridge}teaser_videos/flap_toykitchen_sequential_tasks_toykitchen2_put_blueberry_on_plate_and_spoon_in_pot_or_pan_in_sink.jpg`,
    "Toggle switch / LED color sequence": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen2_room8052_turn_lever_vertical_to_front.jpg`,
    "Sliding door + drawer + block sequence": `${bridge}teaser_videos/bridge_data_v2_datacol2_toykitchen7_drawer_pnp_01.jpg`,
    "SO101 screw insertion into sleeve": `${bridge}teaser_videos/bridge_data_v1_berkeley_tool_chest_pick_up_closest_rainbow_Allen_key_set.jpg`,
    "Flip tube upright and balance on tiny platform": `${bridge}teaser_videos/bridge_data_v1_berkeley_toykitchen2_room8052_flip_salt_upright.jpg`,
    "DexArt articulated-object hand manipulation": "https://www.chenbao.tech/dexart/static/images/pipeline.png",
    "Bimanual dexterous two-hand manipulation": "https://www.chenbao.tech/dexart/static/images/conclusion1.jpg"
  };

  if (images[task.task]) return images[task.task];
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

renderGuide();
initFilters();
bindEvents();
render();
