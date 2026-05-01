const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const defaultProcesses = [
  { id: "P1", arrival: 0, burst: 7, priority: 2 },
  { id: "P2", arrival: 2, burst: 4, priority: 1 },
  { id: "P3", arrival: 4, burst: 1, priority: 4 },
  { id: "P4", arrival: 5, burst: 4, priority: 3 },
];

let processList = structuredClone(defaultProcesses);
let pageAlgorithm = "fifo";
let sem = { value: 1, queue: [], inside: null, step: 0 };
let tasks = [
  { pid: 101, name: "init", cpu: 0.4, ram: 96, status: "running" },
  { pid: 214, name: "browser", cpu: 8.8, ram: 1240, status: "running" },
  { pid: 318, name: "compiler", cpu: 16.2, ram: 640, status: "running" },
  { pid: 427, name: "database", cpu: 3.5, ram: 860, status: "sleeping" },
  { pid: 512, name: "music-player", cpu: 1.1, ram: 180, status: "running" },
];

const deadlockScenarios = [
  {
    id: "classic",
    name: "Deadlock 3 tiến trình",
    description: "P1 giữ R1 chờ R2, P2 giữ R2 chờ R3, P3 giữ R3 chờ R1.",
    resources: ["R1", "R2", "R3", "R4"],
    processes: [
      { id: "P1", burst: 7, priority: 2, abortCost: 8, holds: ["R1"], waits: ["R2"], status: "running" },
      { id: "P2", burst: 4, priority: 1, abortCost: 5, holds: ["R2"], waits: ["R3"], status: "running" },
      { id: "P3", burst: 3, priority: 4, abortCost: 3, holds: ["R3"], waits: ["R1"], status: "running" },
      { id: "P4", burst: 5, priority: 3, abortCost: 7, holds: [], waits: ["R4"], status: "running" },
    ],
  },
  {
    id: "multi",
    name: "Deadlock 4 tiến trình",
    description: "Chu trình dài hơn để minh họa lựa chọn nạn nhân theo chi phí và độ ưu tiên.",
    resources: ["R1", "R2", "R3", "R4", "R5"],
    processes: [
      { id: "P1", burst: 8, priority: 5, abortCost: 9, holds: ["R1"], waits: ["R2"], status: "running" },
      { id: "P2", burst: 4, priority: 2, abortCost: 4, holds: ["R2"], waits: ["R3"], status: "running" },
      { id: "P3", burst: 6, priority: 3, abortCost: 6, holds: ["R3"], waits: ["R4"], status: "running" },
      { id: "P4", burst: 2, priority: 1, abortCost: 2, holds: ["R4"], waits: ["R1"], status: "running" },
      { id: "P5", burst: 5, priority: 4, abortCost: 7, holds: ["R5"], waits: [], status: "running" },
    ],
  },
  {
    id: "safe",
    name: "Hệ thống an toàn",
    description: "Có yêu cầu tài nguyên nhưng không tạo chu trình chờ vòng tròn.",
    resources: ["R1", "R2", "R3", "R4"],
    processes: [
      { id: "P1", burst: 6, priority: 2, abortCost: 6, holds: ["R1"], waits: ["R2"], status: "running" },
      { id: "P2", burst: 3, priority: 1, abortCost: 4, holds: [], waits: ["R3"], status: "running" },
      { id: "P3", burst: 5, priority: 3, abortCost: 7, holds: ["R4"], waits: [], status: "running" },
    ],
  },
];

let deadlockState = structuredClone(deadlockScenarios[0]);
let recoveryStrategy = "terminate";
let deadlockCycle = [];
let deadlockSteps = 0;
let recoveryTimeline = [];

function numberValue(selector, fallback = 0) {
  const value = Number($(selector).value);
  return Number.isFinite(value) ? value : fallback;
}

function bindTabs() {
  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".tab").forEach((tab) => tab.classList.remove("active"));
      $$(".module").forEach((module) => module.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.tab}`).classList.add("active");
    });
  });
}

function activeDeadlockProcesses() {
  return deadlockState.processes.filter((process) => process.status !== "terminated");
}

function deadlockOwner(resourceId) {
  return activeDeadlockProcesses().find((process) => process.holds.includes(resourceId));
}

function buildWaitForGraph() {
  const graph = new Map(activeDeadlockProcesses().map((process) => [process.id, []]));
  activeDeadlockProcesses().forEach((process) => {
    process.waits.forEach((resourceId) => {
      const owner = deadlockOwner(resourceId);
      if (owner && owner.id !== process.id) {
        graph.get(process.id).push({ processId: owner.id, resourceId });
      }
    });
  });
  return graph;
}

function findDeadlockCycle() {
  const graph = buildWaitForGraph();
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function dfs(processId) {
    visiting.add(processId);
    stack.push(processId);

    for (const edge of graph.get(processId) || []) {
      if (visiting.has(edge.processId)) {
        return [...stack.slice(stack.indexOf(edge.processId)), edge.processId];
      }

      if (!visited.has(edge.processId)) {
        const found = dfs(edge.processId);
        if (found.length) return found;
      }
    }

    stack.pop();
    visiting.delete(processId);
    visited.add(processId);
    return [];
  }

  for (const process of activeDeadlockProcesses()) {
    if (!visited.has(process.id)) {
      const cycle = dfs(process.id);
      if (cycle.length) return cycle;
    }
  }

  return [];
}

function renderDeadlockScenarioOptions() {
  $("#deadlockScenario").innerHTML = deadlockScenarios
    .map((scenario) => `<option value="${scenario.id}">${scenario.name}</option>`)
    .join("");
}

function loadDeadlockScenario(id = $("#deadlockScenario").value || deadlockScenarios[0].id) {
  const scenario = deadlockScenarios.find((item) => item.id === id) || deadlockScenarios[0];
  deadlockState = structuredClone(scenario);
  deadlockCycle = [];
  deadlockSteps = 0;
  recoveryTimeline = [];
  $("#deadlockLog").innerHTML = "";
  syncDeadlockInputs();
  logDeadlock(`Nạp kịch bản "${scenario.name}". ${scenario.description}`);
  updateDeadlockStatus("neutral", "Chưa phân tích", "Không có chu trình");
  renderDeadlock();
}

function syncDeadlockInputs() {
  $("#deadlockResourcesInput").value = deadlockState.resources.join(",");
  $("#deadlockProcessInput").value = deadlockState.processes
    .map((process) => {
      const holds = process.holds.length ? process.holds.join("|") : "-";
      const waits = process.waits.length ? process.waits.join("|") : "-";
      return `${process.id}, ${process.burst}, ${process.priority}, ${process.abortCost}, ${holds}, ${waits}`;
    })
    .join("\n");
}

function parseResourceList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseResourceCell(value) {
  const clean = value.trim();
  if (!clean || clean === "-") return [];
  return clean
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyDeadlockInput() {
  const resources = parseResourceList($("#deadlockResourcesInput").value);
  const processes = $("#deadlockProcessInput")
    .value.split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, burst, priority, abortCost, holds = "-", waits = "-"] = line.split(",").map((part) => part.trim());
      return {
        id,
        burst: Math.max(1, Number(burst) || 1),
        priority: Math.max(1, Number(priority) || 1),
        abortCost: Math.max(1, Number(abortCost) || 1),
        holds: parseResourceCell(holds),
        waits: parseResourceCell(waits),
        status: "running",
      };
    })
    .filter((process) => process.id);

  if (!resources.length || !processes.length) {
    logDeadlock("Dữ liệu nhập chưa hợp lệ: cần ít nhất một tài nguyên và một tiến trình.");
    return;
  }

  deadlockState = {
    id: "custom",
    name: "Dữ liệu nhập thủ công",
    description: "Kịch bản do người dùng nhập.",
    resources,
    processes,
  };
  deadlockCycle = [];
  deadlockSteps = 0;
  recoveryTimeline = [];
  $("#deadlockLog").innerHTML = "";
  logDeadlock("Đã áp dụng dữ liệu nhập thủ công và đặt lại trạng thái phân tích.");
  updateDeadlockStatus("neutral", "Chưa phân tích", "Không có chu trình");
  renderDeadlock();
}

function logDeadlock(message) {
  const item = document.createElement("li");
  item.textContent = message;
  $("#deadlockLog").prepend(item);
}

function updateDeadlockStatus(kind, label, cycleLabel) {
  $("#deadlockState").className = `pill ${kind}`;
  $("#deadlockState").textContent = label;
  $("#cycleText").textContent = cycleLabel;
}

function detectDeadlock() {
  deadlockSteps += 1;
  deadlockCycle = findDeadlockCycle();

  if (deadlockCycle.length) {
    updateDeadlockStatus("danger", "Phát hiện deadlock", `Chu trình: ${deadlockCycle.join(" -> ")}`);
    logDeadlock(`Wait-For Graph có chu trình: ${deadlockCycle.join(" -> ")}.`);
  } else {
    updateDeadlockStatus("success", "An toàn", "Không có chu trình chờ vòng tròn");
    logDeadlock("Không phát hiện deadlock. Hệ thống có thể tiếp tục cấp phát tài nguyên.");
  }

  renderDeadlock();
}

function chooseDeadlockVictim(cycle) {
  const cycleIds = [...new Set(cycle)];
  const candidates = activeDeadlockProcesses().filter((process) => cycleIds.includes(process.id));
  if (!$("#autoVictim").checked) {
    return candidates.find((process) => process.id === $("#victimSelect").value) || candidates[0];
  }

  return [...candidates].sort((a, b) => {
    const scoreA = a.abortCost * 10 + a.priority + a.burst * 0.1;
    const scoreB = b.abortCost * 10 + b.priority + b.burst * 0.1;
    return scoreA - scoreB;
  })[0];
}

function recoverDeadlock() {
  const cycle = deadlockCycle.length ? deadlockCycle : findDeadlockCycle();
  if (!cycle.length) {
    deadlockSteps += 1;
    updateDeadlockStatus("success", "An toàn", "Không có deadlock để khôi phục");
    logDeadlock("Bỏ qua khôi phục vì hệ thống không có chu trình deadlock.");
    renderDeadlock();
    return false;
  }

  const victim = chooseDeadlockVictim(cycle);
  deadlockSteps += 1;
  const start = recoveryTimeline.at(-1)?.end ?? 0;

  if (recoveryStrategy === "terminate") {
    const released = [...victim.holds];
    victim.status = "terminated";
    victim.holds = [];
    victim.waits = [];
    recoveryTimeline.push({ id: `Kill ${victim.id}`, start, end: start + Math.max(1, Math.ceil(victim.burst / 2)) });
    logDeadlock(`Kết thúc ${victim.id}, giải phóng ${released.length ? released.join(", ") : "không tài nguyên"}.`);
  } else {
    const resourceId = victim.holds[0];
    recoveryTimeline.push({ id: `Preempt ${victim.id}`, start, end: start + 1 });
    if (!resourceId) {
      victim.status = "terminated";
      logDeadlock(`${victim.id} không giữ tài nguyên, hệ thống kết thúc tiến trình này như phương án dự phòng.`);
    } else {
      victim.holds = victim.holds.filter((item) => item !== resourceId);
      const waiter = activeDeadlockProcesses().find((process) => process.waits.includes(resourceId));
      if (waiter) {
        waiter.waits = waiter.waits.filter((item) => item !== resourceId);
        waiter.holds.push(resourceId);
        logDeadlock(`Chiếm lại ${resourceId} từ ${victim.id} và cấp cho ${waiter.id}.`);
      } else {
        logDeadlock(`Chiếm lại ${resourceId} từ ${victim.id}; tài nguyên trở về trạng thái rảnh.`);
      }
    }
  }

  deadlockCycle = findDeadlockCycle();
  if (deadlockCycle.length) {
    updateDeadlockStatus("danger", "Còn deadlock", `Chu trình: ${deadlockCycle.join(" -> ")}`);
    logDeadlock(`Sau khôi phục vẫn còn chu trình: ${deadlockCycle.join(" -> ")}.`);
  } else {
    updateDeadlockStatus("success", "Đã khôi phục", "Deadlock đã được phá vỡ");
    logDeadlock("Hệ thống đã thoát khỏi deadlock.");
  }
  renderDeadlock();
  return deadlockCycle.length > 0;
}

function autoRecoverDeadlock() {
  let guard = 0;
  deadlockCycle = findDeadlockCycle();
  if (!deadlockCycle.length) {
    detectDeadlock();
    return;
  }

  while (deadlockCycle.length && guard < 8) {
    recoverDeadlock();
    guard += 1;
  }
}

function renderDeadlockVictims() {
  $("#victimSelect").innerHTML = activeDeadlockProcesses()
    .map(
      (process) =>
        `<option value="${process.id}">${process.id} - burst ${process.burst}, ưu tiên ${process.priority}, cost ${process.abortCost}</option>`,
    )
    .join("");
  $("#victimSelect").disabled = $("#autoVictim").checked;
}

function deadlockPositions() {
  const positions = new Map();
  const processes = deadlockState.processes;
  const resources = deadlockState.resources;
  processes.forEach((process, index) => {
    positions.set(process.id, { x: ((index + 1) / (processes.length + 1)) * 88 + 6, y: 25 });
  });
  resources.forEach((resourceId, index) => {
    positions.set(resourceId, { x: ((index + 1) / (resources.length + 1)) * 88 + 6, y: 74 });
  });
  return positions;
}

function graphEdge(from, to, kind, positions) {
  const a = positions.get(from);
  const b = positions.get(to);
  if (!a || !b) return "";
  const color = kind === "request" ? "#b7791f" : "#218358";
  const dash = kind === "request" ? 'stroke-dasharray="7 6"' : "";
  return `<line x1="${a.x}%" y1="${a.y}%" x2="${b.x}%" y2="${b.y}%" stroke="${color}" stroke-width="3" ${dash} marker-end="url(#arrow-${kind})" />`;
}

function renderResourceGraph() {
  const positions = deadlockPositions();
  const cycleIds = new Set(deadlockCycle);
  const edges = [];

  deadlockState.processes.forEach((process) => {
    if (process.status === "terminated") return;
    process.holds.forEach((resourceId) => edges.push(graphEdge(resourceId, process.id, "assign", positions)));
    process.waits.forEach((resourceId) => edges.push(graphEdge(process.id, resourceId, "request", positions)));
  });

  const processNodes = deadlockState.processes
    .map((process) => {
      const pos = positions.get(process.id);
      const classes = ["graph-node", "process-node"];
      if (cycleIds.has(process.id)) classes.push("in-cycle");
      if (process.status === "terminated") classes.push("terminated-node");
      return `
        <div class="${classes.join(" ")}" style="left:${pos.x}%;top:${pos.y}%">
          <strong>${process.id}</strong>
          <span>${process.status === "terminated" ? "killed" : `burst ${process.burst}`}</span>
        </div>
      `;
    })
    .join("");

  const resourceNodes = deadlockState.resources
    .map((resourceId) => {
      const pos = positions.get(resourceId);
      const owner = deadlockOwner(resourceId);
      const classes = ["graph-node", "resource-node"];
      if (owner && cycleIds.has(owner.id)) classes.push("in-cycle");
      return `
        <div class="${classes.join(" ")}" style="left:${pos.x}%;top:${pos.y}%">
          <strong>${resourceId}</strong>
          <span>${owner ? `giữ bởi ${owner.id}` : "rảnh"}</span>
        </div>
      `;
    })
    .join("");

  $("#resourceGraph").innerHTML = `
    <svg class="edge-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <marker id="arrow-request" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10z" fill="#b7791f"></path>
        </marker>
        <marker id="arrow-assign" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10z" fill="#218358"></path>
        </marker>
      </defs>
      ${edges.join("")}
    </svg>
    ${processNodes}
    ${resourceNodes}
  `;
}

function renderRecoveryGantt() {
  if (!recoveryTimeline.length) {
    $("#recoveryGantt").innerHTML = '<div class="empty-gantt">Chưa có thao tác khôi phục</div>';
    return;
  }

  const total = Math.max(...recoveryTimeline.map((segment) => segment.end), 1);
  $("#recoveryGantt").innerHTML = recoveryTimeline
    .map((segment) => {
      const width = ((segment.end - segment.start) / total) * 100;
      return `
        <div class="gantt-segment recovery" style="width:${width}%">
          <strong>${segment.id}</strong>
          <span>${segment.start} - ${segment.end}</span>
        </div>
      `;
    })
    .join("");
}

function renderDeadlockTable() {
  $("#deadlockRows").innerHTML = deadlockState.processes
    .map((process) => {
      const blocked = process.status !== "terminated" && process.waits.length > 0;
      const status = process.status === "terminated" ? "terminated" : blocked ? "blocked" : "running";
      const label = process.status === "terminated" ? "Đã kết thúc" : blocked ? "Đang chờ" : "Sẵn sàng";
      return `
        <tr>
          <td><strong>${process.id}</strong></td>
          <td>${process.burst}</td>
          <td>${process.priority}</td>
          <td>${process.abortCost}</td>
          <td>${process.holds.join(", ") || "-"}</td>
          <td>${process.waits.join(", ") || "-"}</td>
          <td><span class="badge ${status}">${label}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderDeadlockMetrics() {
  $("#deadProcessCount").textContent = deadlockState.processes.length;
  $("#deadResourceCount").textContent = deadlockState.resources.length;
  $("#deadStepCount").textContent = deadlockSteps;
}

function renderDeadlock() {
  renderDeadlockVictims();
  renderResourceGraph();
  renderRecoveryGantt();
  renderDeadlockTable();
  renderDeadlockMetrics();
}

function renderProcessInputs() {
  $("#processInputs").innerHTML = processList
    .map(
      (process, index) => `
        <div class="process-card">
          <strong>${process.id}</strong>
          <label>Đến<input type="number" min="0" value="${process.arrival}" data-proc="${index}" data-field="arrival" /></label>
          <label>Burst<input type="number" min="1" value="${process.burst}" data-proc="${index}" data-field="burst" /></label>
          <label>Ưu tiên<input type="number" min="1" value="${process.priority}" data-proc="${index}" data-field="priority" /></label>
          <button class="remove-process" data-remove="${index}" title="Xóa tiến trình">×</button>
        </div>
      `,
    )
    .join("");

  $$("[data-proc]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.proc);
      processList[index][input.dataset.field] = Math.max(0, Number(input.value) || 0);
      if (input.dataset.field === "burst") processList[index].burst = Math.max(1, processList[index].burst);
      if (input.dataset.field === "priority") processList[index].priority = Math.max(1, processList[index].priority);
    });
  });

  $$(".remove-process").forEach((button) => {
    button.addEventListener("click", () => {
      if (processList.length <= 1) return;
      processList.splice(Number(button.dataset.remove), 1);
      processList = processList.map((process, index) => ({ ...process, id: `P${index + 1}` }));
      renderProcessInputs();
      runSchedule();
    });
  });
}

function addProcess() {
  processList.push({
    id: `P${processList.length + 1}`,
    arrival: processList.length ? Math.max(...processList.map((p) => p.arrival)) + 1 : 0,
    burst: 3,
    priority: processList.length + 1,
  });
  renderProcessInputs();
}

function schedule(processes, algorithm, quantum) {
  const jobs = processes.map((p) => ({
    ...p,
    remaining: p.burst,
    completion: 0,
    firstStart: null,
  }));
  const segments = [];
  let time = Math.min(...jobs.map((p) => p.arrival));
  let done = 0;
  const ready = [];
  const queued = new Set();

  const enqueueArrivals = (excludedId = null) => {
    jobs
      .filter((job) => job.id !== excludedId && job.arrival <= time && job.remaining > 0 && !queued.has(job.id))
      .sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id))
      .forEach((job) => {
        ready.push(job);
        queued.add(job.id);
      });
  };

  while (done < jobs.length) {
    enqueueArrivals();
    if (!ready.length) {
      const nextArrival = Math.min(...jobs.filter((job) => job.remaining > 0).map((job) => job.arrival));
      if (nextArrival > time) segments.push({ id: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      enqueueArrivals();
    }

    if (algorithm === "sjf") ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    if (algorithm === "priority") ready.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);

    const current = ready.shift();
    queued.delete(current.id);
    if (current.firstStart === null) current.firstStart = time;

    const duration = algorithm === "rr" ? Math.min(quantum, current.remaining) : current.remaining;
    const start = time;
    time += duration;
    current.remaining -= duration;
    segments.push({ id: current.id, start, end: time });
    enqueueArrivals(current.id);

    if (current.remaining > 0) {
      ready.push(current);
      queued.add(current.id);
    } else {
      current.completion = time;
      done += 1;
    }
  }

  const rows = jobs.map((job) => {
    const turnaround = job.completion - job.arrival;
    const waiting = turnaround - job.burst;
    const response = job.firstStart - job.arrival;
    return { ...job, turnaround, waiting, response };
  });

  return {
    segments: mergeSegments(segments),
    rows,
    avgWaiting: average(rows.map((row) => row.waiting)),
    avgTurnaround: average(rows.map((row) => row.turnaround)),
    avgResponse: average(rows.map((row) => row.response)),
  };
}

function mergeSegments(segments) {
  return segments.reduce((acc, segment) => {
    const last = acc.at(-1);
    if (last && last.id === segment.id && last.end === segment.start) {
      last.end = segment.end;
    } else {
      acc.push({ ...segment });
    }
    return acc;
  }, []);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function runSchedule() {
  const algorithm = $("#algorithmSelect").value;
  const result = schedule(processList, algorithm, Math.max(1, numberValue("#quantumInput", 2)));
  const total = Math.max(...result.segments.map((segment) => segment.end), 1);
  const names = { fcfs: "FCFS", sjf: "SJF", priority: "Priority", rr: "Round Robin" };
  $("#scheduleName").textContent = names[algorithm];
  $("#ganttChart").innerHTML = result.segments
    .map((segment) => {
      const width = ((segment.end - segment.start) / total) * 100;
      return `
        <div class="gantt-segment ${segment.id === "Idle" ? "idle" : ""}" style="width:${width}%">
          <strong>${segment.id}</strong>
          <span>${segment.start} - ${segment.end}</span>
        </div>
      `;
    })
    .join("");

  $("#avgWaiting").textContent = result.avgWaiting.toFixed(2);
  $("#avgTurnaround").textContent = result.avgTurnaround.toFixed(2);
  $("#avgResponse").textContent = result.avgResponse.toFixed(2);
  $("#scheduleRows").innerHTML = result.rows
    .map(
      (row) => `
        <tr>
          <td><strong>${row.id}</strong></td>
          <td>${row.arrival}</td>
          <td>${row.burst}</td>
          <td>${row.priority}</td>
          <td>${row.completion}</td>
          <td>${row.waiting}</td>
          <td>${row.response}</td>
        </tr>
      `,
    )
    .join("");
}

function compareSchedules() {
  const quantum = Math.max(1, numberValue("#quantumInput", 2));
  const algorithms = ["fcfs", "sjf", "priority", "rr"];
  const names = { fcfs: "FCFS", sjf: "SJF", priority: "Priority", rr: "Round Robin" };
  $("#comparison").innerHTML = algorithms
    .map((algo) => {
      const result = schedule(processList, algo, quantum);
      return `
        <div>
          <strong>${names[algo]}</strong>
          <span>Chờ: ${result.avgWaiting.toFixed(2)}</span>
          <span>Đáp ứng: ${result.avgResponse.toFixed(2)}</span>
        </div>
      `;
    })
    .join("");
}

function resetSemaphore() {
  sem = {
    value: Math.max(1, numberValue("#semaphoreValue", 1)),
    queue: [],
    inside: null,
    step: 0,
  };
  $("#semLog").innerHTML = "";
  logSemaphore("Semaphore đã sẵn sàng. Mỗi bước gọi wait/signal để ngăn xung đột tài nguyên.");
  renderSemaphore();
}

function logSemaphore(text) {
  const item = document.createElement("li");
  item.textContent = text;
  $("#semLog").prepend(item);
}

function stepSemaphore() {
  const sequence = ["P1", "P2", "P3", "release", "P2", "release", "P3", "release"];
  const action = sequence[sem.step % sequence.length];
  sem.step += 1;

  if (action === "release") {
    if (!sem.inside) {
      logSemaphore("Không có tiến trình trong vùng găng, semaphore giữ nguyên.");
    } else {
      logSemaphore(`${sem.inside} gọi signal(), rời vùng găng.`);
      sem.inside = null;
      sem.value += 1;
      if (sem.queue.length && sem.value > 0) {
        sem.inside = sem.queue.shift();
        sem.value -= 1;
        logSemaphore(`${sem.inside} được đánh thức và đi vào vùng găng.`);
      }
    }
  } else if (sem.value > 0 && !sem.inside) {
    sem.value -= 1;
    sem.inside = action;
    logSemaphore(`${action} gọi wait() thành công và vào vùng găng.`);
  } else if (!sem.queue.includes(action) && sem.inside !== action) {
    sem.queue.push(action);
    logSemaphore(`${action} bị chặn vì tài nguyên đang được ${sem.inside} sử dụng.`);
  } else {
    logSemaphore(`${action} vẫn đang chờ, semaphore không cho vào vùng găng.`);
  }

  renderSemaphore();
}

function renderSemaphore() {
  $("#semState").textContent = `S = ${sem.value}`;
  $("#semProcesses").innerHTML = ["P1", "P2", "P3"]
    .map((id) => {
      const state = sem.inside === id ? "critical" : sem.queue.includes(id) ? "waiting" : "ready";
      const label = state === "critical" ? "Vùng găng" : state === "waiting" ? "Đang chờ" : "Sẵn sàng";
      return `<div class="lane ${state}"><strong>${id}</strong><span>${label}</span></div>`;
    })
    .join("");
}

function translateAddress() {
  const logical = Math.max(0, numberValue("#logicalAddress", 0));
  const pageSize = Math.max(1, numberValue("#pageSize", 1024));
  const page = Math.floor(logical / pageSize);
  const offset = logical % pageSize;
  const table = new Map(
    $("#pageTableInput")
      .value.split(/\n+/)
      .map((line) => line.trim().split(":").map((part) => Number(part.trim())))
      .filter(([logicalPage, frame]) => Number.isFinite(logicalPage) && Number.isFinite(frame)),
  );
  const frame = table.get(page);
  if (frame === undefined) {
    $("#addressResult").innerHTML = `<div class="error-box">Page fault: trang ${page} chưa có trong bảng trang.</div>`;
    return;
  }
  const physical = frame * pageSize + offset;
  $("#addressResult").innerHTML = `
    <div class="formula">Trang = floor(${logical} / ${pageSize}) = <strong>${page}</strong></div>
    <div class="formula">Offset = ${logical} mod ${pageSize} = <strong>${offset}</strong></div>
    <div class="formula">Khung trang = <strong>${frame}</strong></div>
    <div class="result-box">Địa chỉ vật lý = ${frame} × ${pageSize} + ${offset} = <strong>${physical}</strong></div>
  `;
}

function runPaging() {
  const refs = $("#referenceString").value.split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const frameCount = Math.max(1, numberValue("#frameCount", 3));
  const frames = [];
  const lastUsed = new Map();
  const queue = [];
  const steps = [];
  let faults = 0;

  refs.forEach((page, index) => {
    let fault = false;
    if (!frames.includes(page)) {
      fault = true;
      faults += 1;
      if (frames.length < frameCount) {
        frames.push(page);
        queue.push(page);
      } else if (pageAlgorithm === "fifo") {
        const victim = queue.shift();
        frames[frames.indexOf(victim)] = page;
        queue.push(page);
      } else {
        const victim = [...frames].sort((a, b) => (lastUsed.get(a) ?? -1) - (lastUsed.get(b) ?? -1))[0];
        frames[frames.indexOf(victim)] = page;
      }
    }
    lastUsed.set(page, index);
    steps.push({ page, frames: [...frames], fault });
  });

  $("#faultBadge").textContent = `${faults} lỗi trang`;
  $("#pagingTimeline").innerHTML = steps
    .map(
      (step) => `
        <div class="page-step ${step.fault ? "fault" : "hit"}">
          <strong>${step.page}</strong>
          ${Array.from({ length: frameCount }, (_, index) => `<span>${step.frames[index] ?? "-"}</span>`).join("")}
          <em>${step.fault ? "Fault" : "Hit"}</em>
        </div>
      `,
    )
    .join("");
}

function renderTasks() {
  $("#taskRows").innerHTML = tasks
    .map(
      (task) => `
        <tr>
          <td>${task.pid}</td>
          <td><strong>${task.name}</strong></td>
          <td>${task.cpu.toFixed(1)}%</td>
          <td>${task.ram} MB</td>
          <td><span class="badge ${task.status}">${task.status}</span></td>
          <td><button class="danger-link" data-kill="${task.pid}" ${task.status === "killed" ? "disabled" : ""}>Kill</button></td>
        </tr>
      `,
    )
    .join("");

  $$("[data-kill]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = tasks.find((item) => item.pid === Number(button.dataset.kill));
      task.status = "killed";
      task.cpu = 0;
      renderTasks();
    });
  });
}

function refreshTasks() {
  tasks = tasks.map((task) => {
    if (task.status === "killed") return task;
    return {
      ...task,
      cpu: Math.max(0.1, task.cpu + (Math.random() * 8 - 4)),
      ram: Math.max(40, Math.round(task.ram + (Math.random() * 80 - 40))),
    };
  });
  renderTasks();
}

function bindEvents() {
  bindTabs();
  $("#deadlockScenario").addEventListener("change", () => loadDeadlockScenario($("#deadlockScenario").value));
  $("#resetDeadlockBtn").addEventListener("click", () => loadDeadlockScenario($("#deadlockScenario").value));
  $("#applyDeadlockInputBtn").addEventListener("click", applyDeadlockInput);
  $("#detectDeadlockBtn").addEventListener("click", detectDeadlock);
  $("#recoverDeadlockBtn").addEventListener("click", recoverDeadlock);
  $("#autoRecoverBtn").addEventListener("click", autoRecoverDeadlock);
  $("#autoVictim").addEventListener("change", renderDeadlockVictims);
  $$(".recovery-strategy").forEach((button) => {
    button.addEventListener("click", () => {
      recoveryStrategy = button.dataset.recovery;
      $$(".recovery-strategy").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      logDeadlock(`Chọn chiến lược khôi phục: ${button.textContent}.`);
    });
  });
  $("#addProcessBtn").addEventListener("click", addProcess);
  $("#runScheduleBtn").addEventListener("click", runSchedule);
  $("#compareScheduleBtn").addEventListener("click", compareSchedules);
  $("#algorithmSelect").addEventListener("change", runSchedule);
  $("#quantumInput").addEventListener("input", runSchedule);
  $("#semStepBtn").addEventListener("click", stepSemaphore);
  $("#semResetBtn").addEventListener("click", resetSemaphore);
  $("#translateBtn").addEventListener("click", translateAddress);
  $("#runPagingBtn").addEventListener("click", runPaging);
  $("#refreshTasksBtn").addEventListener("click", refreshTasks);
  $$(".page-algo").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".page-algo").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      pageAlgorithm = button.dataset.pageAlgo;
      runPaging();
    });
  });
}

bindEvents();
renderDeadlockScenarioOptions();
loadDeadlockScenario(deadlockScenarios[0].id);
renderProcessInputs();
runSchedule();
compareSchedules();
resetSemaphore();
translateAddress();
runPaging();
renderTasks();
