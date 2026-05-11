// ============================================================
// day.js - 체육대회 당일 운영 화면
// ============================================================

(function () {
  "use strict";

  let allRecords = [];
  let allEntries = [];
  let scoreResults = [];
  let judgeScores = [];
  let currentView = "schedule";
  let activeEventName = "";
  let activeJudgeGrade = "";
  let judgePassword = "";
  let judgeName = "";

  const els = {};

  const SCORE_RULES = {
    "단거리 달리기": {
      type: "rank",
      scores: { 1: 50, 2: 40, 3: 30, 4: 30 },
      bonus: 20,
      note: "1위 50점, 2위 40점, 3/4위 30점. 기록 최우수(조별 기준)는 20점 추가.",
    },
    "파도타기 릴레이": {
      type: "rank",
      scores: { 1: 120, 2: 100 },
      bonus: 30,
      note: "1위 120점, 2위 100점. 기록 최우수(조별 기준)는 30점 추가.",
    },
    "태풍의 눈": {
      type: "rank",
      scores: { 1: 120, 2: 100 },
      bonus: 30,
      note: "1위 120점, 2위 100점. 기록 최우수(조별 기준)는 30점 추가.",
    },
    "줄다리기": {
      type: "rank",
      scores: { 1: 120, 2: 100, 3: 80, 4: 60 },
      note: "1위 120점, 2위 100점, 3위 80점, 4위 60점.",
    },
    "긴 줄넘기 (8자 마라톤)": {
      type: "rank",
      scores: { 1: 100, 2: 80, 3: 60 },
      note: "1위 100점, 2위 80점, 3위 60점.",
    },
    "긴 줄넘기 (함께 뛰기)": {
      type: "rank",
      scores: { 1: 100, 2: 80, 3: 60 },
      note: "1위 100점, 2위 80점, 3위 60점.",
    },
    "2인3각 / 4인5각": {
      type: "rank",
      scores: { 1: 100, 2: 80, 3: 60 },
      note: "1위 100점, 2위 80점, 3위 60점.",
    },
    "이어 달리기": {
      type: "rank",
      scores: { 1: 80, 2: 60, 3: 40, 4: 40 },
      note: "1위 80점, 2위 60점, 3/4위 40점.",
    },
    "사제동행 가위바위보 릴레이": {
      type: "count",
      multiplier: 10,
      max: 120,
      note: "득점 인원수 × 10점. 최대 120점.",
    },
    "테마 퍼레이드": {
      type: "parade",
      scores: { basic: 50, best: 100 },
      note: "기본 점수 50점, 우수 학급 100점.",
    },
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    activeJudgeGrade = CONFIG.grades[0] || "";
    populateHeader();
    populateFilters();
    populateJudgeSelects();
    bindEvents();
    loadData();
  }

  function cacheElements() {
    [
      "day-ui",
      "day-badge",
      "day-title",
      "day-subtitle",
      "day-filter-row",
      "day-event-filter-field",
      "day-filter-event",
      "day-filter-grade",
      "day-filter-class",
      "day-filter-search",
      "day-refresh-btn",
      "day-print-btn",
      "day-export-btn",
      "day-count-badge",
      "day-alert",
      "day-event-nav",
      "day-event-cards",
      "day-student-body",
      "day-student-empty",
      "day-loading",
      "day-stat-classes",
      "day-stat-events",
      "day-stat-participants",
      "day-stat-updated",
      "day-view-schedule",
      "day-view-events",
      "day-view-students",
      "day-view-results",
      "day-tab-schedule",
      "day-tab-events",
      "day-tab-students",
      "day-tab-results",
      "day-tab-judge",
      "day-judge-open",
      "score-summary-body",
      "score-summary-empty",
      "day-view-judge",
      "judge-login-overlay",
      "judge-name",
      "judge-password",
      "judge-login-error",
      "judge-login-btn",
      "judge-login-cancel-btn",
      "judge-logout-btn",
      "judge-session-label",
      "judge-grade-tabs",
      "judge-event",
      "judge-grade",
      "judge-class",
      "judge-rule-note",
      "judge-rank-board",
      "judge-single-class-row",
      "judge-count-row",
      "judge-count",
      "judge-parade-row",
      "judge-parade-options",
      "judge-parade-basic",
      "judge-parade-best",
      "judge-memo",
      "judge-score-value",
      "judge-save-btn",
      "judge-save-status",
      "judge-score-body",
      "judge-score-empty",
      "judge-refresh-scores-btn",
    ].forEach(id => {
      els[id] = document.getElementById(id);
    });
  }

  function populateHeader() {
    els["day-badge"].textContent = CONFIG.eventBadge || "운영";
    els["day-title"].textContent = `${CONFIG.schoolName} ${CONFIG.eventTitle} 정보 시스템`;
    els["day-subtitle"].textContent = [CONFIG.eventDate, CONFIG.eventLocation]
      .filter(Boolean)
      .join(", ");
  }

  function populateFilters() {
    CONFIG.events.forEach(event => addOption(els["day-filter-event"], event.name));
    CONFIG.grades.forEach(grade => addOption(els["day-filter-grade"], grade));
    CONFIG.classes.forEach(className => addOption(els["day-filter-class"], className));
  }

  function populateJudgeSelects() {
    renderJudgeGradeTabs();
    CONFIG.grades.forEach(grade => addOption(els["judge-grade"], grade));
    addOption(els["judge-class"], "", "반 선택");
    CONFIG.classes.forEach(className => addOption(els["judge-class"], className));
    syncJudgeGradeSelect();
    populateJudgeEventSelect();
    renderJudgeInputs();
  }

  function renderJudgeGradeTabs() {
    els["judge-grade-tabs"].innerHTML = CONFIG.grades.map(grade => {
      const active = grade === activeJudgeGrade;
      return `
        <button
          type="button"
          class="judge-grade-tab${active ? " active" : ""}"
          data-grade="${escHtml(grade)}"
          role="tab"
          aria-selected="${active ? "true" : "false"}"
        >${escHtml(grade)}</button>
      `;
    }).join("");
  }

  function populateJudgeEventSelect(preferredEvent) {
    const events = getJudgeEventsForGrade(activeJudgeGrade);
    const currentEvent = preferredEvent || els["judge-event"].value;

    els["judge-event"].innerHTML = "";
    events.forEach(eventName => addOption(els["judge-event"], eventName));

    if (events.includes(currentEvent)) {
      els["judge-event"].value = currentEvent;
    } else if (events.length > 0) {
      els["judge-event"].value = events[0];
    }
  }

  function getJudgeEventsForGrade(grade) {
    return Object.keys(SCORE_RULES).filter(eventName => {
      const eventConfig = CONFIG.events.find(event => event.name === eventName);
      if (eventConfig && Array.isArray(eventConfig.allowedGrades)) {
        return eventConfig.allowedGrades.includes(grade);
      }
      if (eventName === "파도타기 릴레이") return grade === "1학년";
      if (eventName === "태풍의 눈") return grade === "2학년";
      return true;
    });
  }

  function setJudgeGrade(grade) {
    if (!grade || grade === activeJudgeGrade) return;

    activeJudgeGrade = grade;
    syncJudgeGradeSelect();
    resetJudgeEntryInputs();
    renderJudgeGradeTabs();
    populateJudgeEventSelect();
    renderJudgeInputs();
    renderJudgeScores();
  }

  function syncJudgeGradeSelect() {
    els["judge-grade"].value = activeJudgeGrade;
  }

  function resetJudgeEntryInputs() {
    els["judge-class"].value = "";
    els["judge-count"].value = "0";
    setParadeValue("basic");
  }

  function setParadeValue(value) {
    els["judge-parade-basic"].checked = value !== "best";
    els["judge-parade-best"].checked = value === "best";
  }

  function getParadeValue() {
    return els["judge-parade-best"].checked ? "best" : "basic";
  }

  function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label || value;
    select.appendChild(option);
  }

  function bindEvents() {
    els["day-refresh-btn"].addEventListener("click", loadData);
    els["day-print-btn"].addEventListener("click", () => window.print());
    els["day-export-btn"].addEventListener("click", exportCSV);
    els["day-judge-open"].addEventListener("click", openJudgeArea);
    els["judge-login-btn"].addEventListener("click", attemptJudgeLogin);
    els["judge-login-cancel-btn"].addEventListener("click", closeJudgeLogin);
    els["judge-password"].addEventListener("keydown", event => {
      if (event.key === "Enter") attemptJudgeLogin();
    });
    els["judge-logout-btn"].addEventListener("click", logoutJudge);
    els["judge-save-btn"].addEventListener("click", saveJudgeScore);
    els["judge-refresh-scores-btn"].addEventListener("click", loadJudgeScores);
    els["judge-score-body"].addEventListener("click", event => {
      const button = event.target.closest("[data-delete-score]");
      if (button) deleteJudgeScore(button.dataset.deleteScore);
    });
    els["judge-grade-tabs"].addEventListener("click", event => {
      const button = event.target.closest("[data-grade]");
      if (button) setJudgeGrade(button.dataset.grade);
    });

    [
      "judge-event",
      "judge-class",
      "judge-count",
    ].forEach(id => {
      els[id].addEventListener("input", renderJudgeInputs);
      els[id].addEventListener("change", renderJudgeInputs);
    });
    els["judge-rank-board"].addEventListener("input", renderJudgeInputs);
    els["judge-rank-board"].addEventListener("change", renderJudgeInputs);
    els["judge-parade-options"].addEventListener("change", event => {
      const value = event.target.dataset.paradeValue;
      if (!value) return;
      if (event.target.checked) {
        setParadeValue(value);
      } else {
        setParadeValue("basic");
      }
      renderJudgeInputs();
    });

    [
      "day-filter-event",
      "day-filter-grade",
      "day-filter-class",
      "day-filter-search",
    ].forEach(id => {
      els[id].addEventListener("input", renderCurrentView);
    });

    ["schedule", "events", "students", "results", "judge"].forEach(view => {
      els[`day-tab-${view}`].addEventListener("click", () => switchView(view));
    });
  }

  async function loadData() {
    setLoading(true);
    hideAlert();

    try {
      const dayJson = await fetchAction("getDayData");

      if (!dayJson.success) {
        showAlert(dayJson.message || "데이터를 불러오지 못했습니다.");
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(dayJson, "records")) {
        showAlert("운영 화면용 Apps Script가 아직 배포되지 않았습니다. gas/Code.gs를 다시 배포해주세요.");
      }

      allRecords = Array.isArray(dayJson.records) ? dayJson.records : [];
      allEntries = Array.isArray(dayJson.entries) ? normalizeEventEntries(dayJson.entries) : [];

      if (allEntries.length === 0) {
        allEntries = buildEntriesFromRecords(allRecords);
      }

      await loadScoreResults();
      ensureActiveEvent();
      renderStats();
      renderEventNav();
      renderCurrentView();
    } catch (err) {
      showAlert(`데이터를 불러오지 못했습니다. ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function normalizeEventEntries(entries) {
    return entries
      .filter(entry => entry.event && entry.studentName)
      .map(entry => ({
        timestamp: entry.timestamp,
        grade: String(entry.grade || ""),
        class: String(entry.class || ""),
        event: String(entry.event || ""),
        role: String(entry.role || ""),
        studentName: String(entry.studentName || ""),
        gender: String(entry.gender || ""),
        writerName: String(entry.writerName || ""),
        teacherName: String(entry.teacherName || ""),
      }));
  }

  async function fetchAction(action) {
    const url = new URL(CONFIG.scriptUrl);
    url.searchParams.set("action", action);

    const res = await fetch(url.toString());
    return res.json();
  }

  async function loadScoreResults() {
    try {
      const json = await fetchAction("getScoreResults");
      scoreResults = Array.isArray(json.data) ? normalizeScoreResults(json.data) : [];
      if (scoreResults.length === 0 && isJudgeLoggedIn()) {
        const judgeJson = await fetchActionWithParams("getJudgeScores", { password: judgePassword });
        scoreResults = Array.isArray(judgeJson.data) ? normalizeScoreResults(judgeJson.data) : [];
      }
    } catch (err) {
      scoreResults = [];
    }
  }

  function normalizeScoreResults(records) {
    return records.map(record => ({
      timestamp: record.timestamp || "",
      rowNumber: Number(record.rowNumber || 0),
      event: String(record.event || ""),
      grade: String(record.grade || ""),
      class: String(record.class || ""),
      recordLabel: String(record.recordLabel || record.recordValue || ""),
      recordValue: String(record.recordValue || ""),
      score: Number(record.score || 0),
      judgeName: String(record.judgeName || ""),
      memo: String(record.memo || ""),
    }));
  }

  async function fetchActionWithParams(action, params) {
    const url = new URL(CONFIG.scriptUrl);
    url.searchParams.set("action", action);
    Object.entries(params || {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const res = await fetch(url.toString());
    return res.json();
  }

  async function postAction(payload) {
    const res = await fetch(CONFIG.scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  function setLoading(show) {
    els["day-loading"].style.display = show ? "block" : "none";
  }

  function showAlert(message) {
    els["day-alert"].textContent = message;
    els["day-alert"].classList.remove("hidden");
  }

  function hideAlert() {
    els["day-alert"].classList.add("hidden");
    els["day-alert"].textContent = "";
  }

  function renderStats() {
    const submittedClasses = new Set(allRecords.map(record => classKey(record))).size;
    const eventCount = new Set(
      allRecords
        .filter(record => !record.skipped && String(record.participants || "").trim())
        .map(record => record.event)
    ).size;
    const updatedAt = allRecords
      .map(record => record.timestamp)
      .filter(Boolean)
      .slice(-1)[0];

    els["day-stat-classes"].textContent = submittedClasses;
    els["day-stat-events"].textContent = eventCount;
    els["day-stat-participants"].textContent = allEntries.length;
    els["day-stat-updated"].textContent = updatedAt ? formatShortDate(updatedAt) : "-";
  }

  function renderEventNav() {
    els["day-event-nav"].innerHTML = "";
    ensureActiveEvent();

    CONFIG.events.forEach((event, index) => {
      const count = getEntriesForEvent(event.name).length;
      const button = createEventNavButton(`${pad(index + 1)} ${event.name}`, event.name, count);
      els["day-event-nav"].appendChild(button);
    });
  }

  function createEventNavButton(label, value, count) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-event-chip" + (value === activeEventName ? " active" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", value === activeEventName ? "true" : "false");
    button.dataset.event = value;
    button.innerHTML = `${escHtml(label)}${Number.isFinite(count) ? `<span>${count}명</span>` : ""}`;
    button.addEventListener("click", () => {
      activeEventName = value;
      updateEventNavActive();
      renderCurrentView();
    });
    return button;
  }

  function updateEventNavActive() {
    ensureActiveEvent();
    els["day-event-nav"].querySelectorAll(".day-event-chip").forEach(button => {
      const selected = button.dataset.event === activeEventName;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function switchView(view, force) {
    if (view === "judge" && !force && !isJudgeLoggedIn()) {
      openJudgeLogin();
      return;
    }

    currentView = view;

    ["schedule", "events", "students", "results", "judge"].forEach(item => {
      els[`day-view-${item}`].classList.toggle("hidden", item !== view);
      els[`day-tab-${item}`].className =
        item === view ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm";
    });
    updateControlVisibility();

    renderCurrentView();
  }

  function renderCurrentView() {
    updateControlVisibility();
    updateEventNavActive();

    if (currentView === "judge") {
      renderJudgeInputs();
      renderJudgeScores();
    } else if (currentView === "results") {
      renderScoreResults();
    } else if (currentView === "students") {
      renderStudentView();
    } else if (currentView === "schedule") {
      renderScheduleView();
    } else {
      renderEventView();
    }
  }

  function updateControlVisibility() {
    els["day-filter-row"].classList.toggle("hidden", currentView === "schedule");
    els["day-event-filter-field"].classList.toggle("hidden", currentView === "events" || currentView === "schedule");
  }

  function renderScheduleView() {
    els["day-count-badge"].textContent = "13개 일정";
  }

  function renderEventView() {
    const container = els["day-event-cards"];
    container.innerHTML = "";
    ensureActiveEvent();

    const event = getEventConfig(activeEventName);
    if (!event) {
      container.innerHTML = `<div class="card day-empty-card">표시할 종목이 없습니다.</div>`;
      els["day-count-badge"].textContent = "0명 표시 중";
      return;
    }

    const entries = filterEntries(getEntriesForEvent(event.name));
    const records = filterRecords(getRecordsForEvent(event.name));

    if (entries.length === 0 && records.length === 0 && hasActiveSearch()) {
      container.innerHTML = `<div class="card day-empty-card">표시할 종목이 없습니다.</div>`;
    } else {
      container.appendChild(buildEventCard(event, getEventOrder(event.name, 0), entries, records));
    }

    els["day-count-badge"].textContent = `${entries.length}명 표시 중`;
  }

  function buildEventCard(event, order, entries, records) {
    const card = document.createElement("article");
    card.className = "card day-event-card";

    const grouped = groupEntriesByClass(entries);
    const classCount = grouped.length || countRecordClasses(records);
    const participantCount = entries.length || countParticipantsFromRecords(records);
    const maxLabel = event.maxParticipants > 0 ? `학급당 최대 ${event.maxParticipants}명` : "인원 제한 없음";
    const targetLabel = event.allowedGrades ? event.allowedGrades.join(", ") : "전체 학년";
    const method = event.method ? String(event.method) : "";

    card.innerHTML = `
      <div class="day-event-head">
        <div>
          <div class="card-label">진행 ${pad(order)}</div>
          <h2 class="day-event-title">${escHtml(event.name)}</h2>
          <div class="day-event-meta">
            <span>${escHtml(event.description || "종목")}</span>
            <span>${escHtml(targetLabel)}</span>
            <span>${escHtml(event.personnel || maxLabel)}</span>
          </div>
        </div>
        <div class="day-event-count">
          <strong>${participantCount}</strong>
          <span>${classCount}학급</span>
        </div>
      </div>
      ${method ? `<div class="day-method">${escHtml(method)}</div>` : ""}
      ${buildClassTablesHtml(grouped, records)}
    `;

    return card;
  }

  function buildClassTablesHtml(grouped, records) {
    if (grouped.length > 0) {
      return `
        <div class="day-class-list">
          ${grouped.map(group => `
            <section class="day-class-block">
              <div class="day-class-title">
                <strong>${escHtml(group.label)}</strong>
                <span>${group.entries.length}명</span>
              </div>
              <div class="day-participant-grid">
                ${group.entries.map(entry => `
                  <span class="day-participant-pill">
                    ${entry.role ? `<em>${escHtml(entry.role)}</em>` : ""}
                    ${entry.gender ? `<small>${escHtml(entry.gender)}</small>` : ""}
                    ${escHtml(entry.studentName)}
                  </span>
                `).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      `;
    }

    const activeRecords = records.filter(record => !record.skipped && String(record.participants || "").trim());
    if (activeRecords.length === 0) {
      return `<p class="day-muted">참가 신청 없음</p>`;
    }

    return `
      <table class="summary-table day-record-table">
        <thead><tr><th>학급</th><th>참가 학생</th></tr></thead>
        <tbody>
          ${activeRecords.map(record => `
            <tr>
              <td>${escHtml(classLabel(record))}</td>
              <td>${escHtml(record.participants)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderStudentView() {
    const tbody = els["day-student-body"];
    const empty = els["day-student-empty"];
    const canShowStudents = hasStudentSearchCriteria();
    const entries = canShowStudents ? filterEntries(allEntries).sort(compareEntries) : [];

    tbody.innerHTML = "";
    empty.textContent = canShowStudents
      ? "표시할 참가자가 없습니다."
      : "검색어를 입력하거나 종목, 학년, 반을 선택하면 참가 학생이 표시됩니다.";
    empty.classList.toggle("hidden", entries.length !== 0);

    entries.forEach((entry, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${escHtml(entry.studentName)}</strong></td>
        <td>${escHtml(entry.gender || "-")}</td>
        <td>${escHtml(classLabel(entry))}</td>
        <td>${escHtml(entry.event)}</td>
        <td>${escHtml(entry.role || "-")}</td>
      `;
      tbody.appendChild(tr);
    });

    els["day-count-badge"].textContent = canShowStudents
      ? `${entries.length}명 표시 중`
      : "검색 후 표시";
  }

  function openJudgeArea() {
    if (isJudgeLoggedIn()) {
      switchView("judge", true);
    } else {
      openJudgeLogin();
    }
  }

  function openJudgeLogin() {
    els["judge-login-error"].textContent = "";
    els["judge-login-overlay"].classList.remove("hidden");
    setTimeout(() => els["judge-password"].focus(), 0);
  }

  function closeJudgeLogin() {
    els["judge-login-overlay"].classList.add("hidden");
  }

  function isJudgeLoggedIn() {
    return Boolean(judgePassword && judgeName);
  }

  async function attemptJudgeLogin() {
    const password = els["judge-password"].value.trim();
    const name = els["judge-name"].value.trim();

    if (!name) {
      els["judge-login-error"].textContent = "심판 이름을 입력해주세요.";
      return;
    }
    if (!password) {
      els["judge-login-error"].textContent = "비밀번호를 입력해주세요.";
      return;
    }

    els["judge-login-error"].textContent = "";

    try {
      const json = await fetchActionWithParams("judgeLogin", { password });
      if (!json.success || json.judge !== true) {
        els["judge-login-error"].textContent =
          json.message || "심판 로그인 기능을 사용하려면 Apps Script를 다시 배포해주세요.";
        return;
      }

      judgePassword = password;
      judgeName = name;
      els["judge-session-label"].textContent = `${judgeName} 심판으로 로그인 중`;
      closeJudgeLogin();
      await loadJudgeScores();
      switchView("judge", true);
    } catch (err) {
      els["judge-login-error"].textContent = "로그인 중 오류가 발생했습니다.";
    }
  }

  function logoutJudge() {
    judgePassword = "";
    judgeName = "";
    judgeScores = [];
    els["judge-password"].value = "";
    els["judge-session-label"].textContent = "심판 로그인이 필요합니다.";
    renderJudgeScores();
    switchView("events", true);
  }

  function renderJudgeInputs() {
    const rule = getSelectedScoreRule();
    if (!rule) {
      els["judge-rule-note"].textContent = "선택한 학년에 입력 가능한 종목이 없습니다.";
      els["judge-rank-board"].classList.add("hidden");
      els["judge-single-class-row"].classList.add("hidden");
      els["judge-count-row"].classList.add("hidden");
      els["judge-parade-row"].classList.add("hidden");
      els["judge-score-value"].textContent = "0";
      return;
    }

    els["judge-rule-note"].textContent = `${activeJudgeGrade} 기준 · ${rule.note}`;
    els["judge-rank-board"].classList.toggle("hidden", rule.type !== "rank");
    els["judge-single-class-row"].classList.toggle("hidden", rule.type === "rank");
    els["judge-count-row"].classList.toggle("hidden", rule.type !== "count");
    els["judge-parade-row"].classList.toggle("hidden", rule.type !== "parade");

    if (rule.type === "rank") {
      renderRankBoard(rule);
    }

    els["judge-score-value"].textContent = calculateJudgeScore().score;
  }

  function renderRankBoard(rule) {
    const ranks = Object.keys(rule.scores);
    const ruleSignature = [
      activeJudgeGrade,
      els["judge-event"].value,
      JSON.stringify(rule.scores),
      Number(rule.bonus || 0),
    ].join("|");
    if (els["judge-rank-board"].dataset.ruleSignature === ruleSignature) return;

    els["judge-rank-board"].innerHTML = ranks.map(rank => {
      const baseScore = rule.scores[rank] || 0;
      const hasBonus = Number(rule.bonus || 0) > 0;
      const bonusHtml = Number(rule.bonus || 0) > 0
        ? `<label class="judge-check judge-rank-bonus">
            <input type="checkbox" class="judge-rank-bonus-input" data-rank="${rank}" />
            <span>기록 최우수 +${rule.bonus}점</span>
          </label>`
        : "";
      return `
        <div class="judge-rank-line${hasBonus ? "" : " no-bonus"}" data-rank="${rank}">
          <div class="judge-rank-label">
            <strong>${rank}위</strong>
            <span>기본 ${baseScore}점</span>
          </div>
          <select class="judge-rank-class" data-rank="${rank}" aria-label="${activeJudgeGrade} ${rank}위 반">
            <option value="">반</option>
            ${CONFIG.classes.map(className => `<option value="${escHtml(className)}">${escHtml(className)}</option>`).join("")}
          </select>
          ${bonusHtml}
          <div class="judge-rank-score" data-rank="${rank}">0점</div>
        </div>
      `;
    }).join("");
    els["judge-rank-board"].dataset.ruleSignature = ruleSignature;
  }

  function getRankEntries() {
    const rule = getSelectedScoreRule();
    if (!rule || rule.type !== "rank") return [];

    return Object.keys(rule.scores).map(rank => {
      const row = els["judge-rank-board"].querySelector(`.judge-rank-line[data-rank="${rank}"]`);
      const grade = activeJudgeGrade;
      const className = row ? row.querySelector(".judge-rank-class").value : "";
      const bonusInput = row ? row.querySelector(".judge-rank-bonus-input") : null;
      const bonus = Boolean(bonusInput && bonusInput.checked);
      const baseScore = Number(rule.scores[rank] || 0);
      const score = grade && className
        ? baseScore + (bonus ? Number(rule.bonus || 0) : 0)
        : 0;

      if (row) {
        row.querySelector(".judge-rank-score").textContent = `${score}점`;
      }

      return {
        event: els["judge-event"].value,
        grade,
        class: className,
        recordType: "순위",
        rank,
        recordValue: `${rank}위`,
        recordLabel: bonus ? `${rank}위 + 기록 최우수` : `${rank}위`,
        bonus,
        score,
      };
    });
  }

  function getSelectedScoreRule() {
    return SCORE_RULES[els["judge-event"].value];
  }

  function calculateJudgeScore() {
    const eventName = els["judge-event"].value;
    const rule = getSelectedScoreRule();
    if (!rule) {
      return {
        event: eventName,
        recordType: "",
        rank: "",
        recordValue: "",
        bonus: false,
        score: 0,
        recordLabel: "",
      };
    }

    if (rule.type === "rank") {
      const entries = getRankEntries();
      return {
        event: eventName,
        recordType: "순위",
        rank: "",
        recordValue: "",
        bonus: entries.some(entry => entry.bonus),
        score: entries.reduce((sum, entry) => sum + entry.score, 0),
        recordLabel: `${entries.filter(entry => entry.grade && entry.class).length}개 순위 입력`,
        entries,
      };
    }

    if (rule.type === "count") {
      const count = Math.max(0, Number(els["judge-count"].value || 0));
      const score = Math.min(count * rule.multiplier, rule.max);
      return {
        event: eventName,
        recordType: "득점 인원",
        rank: "",
        recordValue: `${count}명`,
        bonus: false,
        score,
        recordLabel: `득점 ${count}명`,
      };
    }

    if (rule.type === "parade") {
      const value = getParadeValue();
      const score = rule.scores[value] || 0;
      const label = value === "best" ? "우수 학급" : "기본 점수";
      return {
        event: eventName,
        recordType: "입장식 평가",
        rank: "",
        recordValue: label,
        bonus: false,
        score,
        recordLabel: label,
      };
    }
  }

  async function saveJudgeScore() {
    if (!isJudgeLoggedIn()) {
      openJudgeLogin();
      return;
    }

    const scoreData = calculateJudgeScore();
    const saveRows = scoreData.entries
      ? scoreData.entries.filter(entry => entry.grade && entry.class)
      : [{
        event: scoreData.event,
        grade: activeJudgeGrade,
        class: els["judge-class"].value,
        recordType: scoreData.recordType,
        rank: scoreData.rank,
        recordValue: scoreData.recordValue,
        recordLabel: scoreData.recordLabel,
        bonus: scoreData.bonus,
        score: scoreData.score,
      }].filter(entry => entry.event && entry.grade && entry.class);

    if (saveRows.length === 0) {
      setJudgeStatus("저장할 학반을 선택해주세요.", true);
      return;
    }

    const classKeys = saveRows.map(row => `${row.grade} ${row.class}`);
    if (new Set(classKeys).size !== classKeys.length) {
      setJudgeStatus("같은 학반이 여러 순위에 입력되어 있습니다.", true);
      return;
    }

    setJudgeStatus("저장 중...", false);
    els["judge-save-btn"].disabled = true;

    try {
      for (const row of saveRows) {
        const json = await postAction({
          action: "saveJudgeScore",
          password: judgePassword,
          judgeName,
          event: row.event,
          grade: row.grade,
          class: row.class,
          recordType: row.recordType,
          rank: row.rank,
          recordValue: row.recordValue,
          recordLabel: row.recordLabel,
          bonus: row.bonus,
          score: row.score,
          memo: els["judge-memo"].value.trim(),
        });

        if (!json.success) {
          setJudgeStatus(json.message || "점수를 저장하지 못했습니다.", true);
          return;
        }
      }

      setJudgeStatus(`${activeJudgeGrade} ${scoreData.event} ${saveRows.length}건 저장 완료`, false);
      els["judge-memo"].value = "";
      await loadJudgeScores();
      await loadScoreResults();
    } catch (err) {
      setJudgeStatus("점수 저장 중 오류가 발생했습니다.", true);
    } finally {
      els["judge-save-btn"].disabled = false;
    }
  }

  async function loadJudgeScores() {
    if (!isJudgeLoggedIn()) return;

    try {
      const json = await fetchActionWithParams("getJudgeScores", { password: judgePassword });
      if (!json.success) {
        setJudgeStatus(json.message || "점수 목록을 불러오지 못했습니다.", true);
        return;
      }
      judgeScores = Array.isArray(json.data) ? normalizeScoreResults(json.data) : [];
      scoreResults = judgeScores;
      renderJudgeScores();
      if (currentView === "results") renderScoreResults();
    } catch (err) {
      setJudgeStatus("점수 목록을 불러오지 못했습니다.", true);
    }
  }

  async function deleteJudgeScore(rowNumber) {
    if (!isJudgeLoggedIn()) {
      openJudgeLogin();
      return;
    }

    const target = judgeScores.find(score => String(score.rowNumber) === String(rowNumber));
    const label = target
      ? `${classLabel(target)} ${target.event} ${target.recordLabel || target.recordValue || ""}`
      : "선택한 점수 기록";

    if (!rowNumber || !window.confirm(`${label}을(를) 삭제할까요?`)) return;

    setJudgeStatus("삭제 중...", false);

    try {
      const json = await postAction({
        action: "deleteJudgeScore",
        password: judgePassword,
        rowNumber,
      });

      if (!json.success) {
        setJudgeStatus(json.message || "점수 기록을 삭제하지 못했습니다.", true);
        return;
      }

      setJudgeStatus("점수 기록을 삭제했습니다.", false);
      await loadJudgeScores();
      await loadScoreResults();
    } catch (err) {
      setJudgeStatus("점수 기록 삭제 중 오류가 발생했습니다.", true);
    }
  }

  function renderJudgeScores() {
    const tbody = els["judge-score-body"];
    const empty = els["judge-score-empty"];
    const visibleScores = judgeScores.filter(score => score.grade === activeJudgeGrade);
    tbody.innerHTML = "";

    empty.classList.toggle("hidden", visibleScores.length !== 0);

    visibleScores.slice().reverse().forEach(score => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="white-space:nowrap;">${escHtml(score.timestamp || "")}</td>
        <td><strong>${escHtml(score.event || "")}</strong></td>
        <td>${escHtml([score.grade, score.class].filter(Boolean).join(" "))}</td>
        <td>${escHtml(score.recordLabel || score.recordValue || "")}</td>
        <td><strong>${escHtml(score.score || "0")}</strong></td>
        <td>${escHtml(score.judgeName || "")}</td>
        <td>
          ${score.rowNumber
            ? `<button class="btn btn-danger btn-sm" data-delete-score="${escHtml(score.rowNumber)}">삭제</button>`
            : `<span class="day-muted">재배포 필요</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderScoreResults() {
    const scores = filterScoreResults(scoreResults);
    const summary = buildScoreSummary(scores);

    els["day-count-badge"].textContent = `${summary.length}개 학급 표시 중`;
    renderScoreSummary(summary);
  }

  function filterScoreResults(scores) {
    const selectedEvent = getSelectedEventFilter();
    const selectedGrade = els["day-filter-grade"].value;
    const selectedClass = els["day-filter-class"].value;
    const keyword = els["day-filter-search"].value.trim().toLowerCase();

    return scores.filter(score => {
      if (selectedEvent && score.event !== selectedEvent) return false;
      if (selectedGrade && score.grade !== selectedGrade) return false;
      if (selectedClass && score.class !== selectedClass) return false;
      if (!keyword) return true;

      return [
        score.event,
        score.grade,
        score.class,
        score.recordLabel,
        score.judgeName,
        score.memo,
      ].join(" ").toLowerCase().includes(keyword);
    });
  }

  function buildScoreSummary(scores) {
    const map = new Map();
    scores.forEach(score => {
      const key = classKey(score);
      if (!map.has(key)) {
        map.set(key, {
          grade: score.grade,
          class: score.class,
          total: 0,
        });
      }

      const item = map.get(key);
      item.total += Number(score.score || 0);
    });

    const summary = Array.from(map.values());
    summary.sort((a, b) =>
      toNumber(a.grade) - toNumber(b.grade)
      || Number(b.total) - Number(a.total)
      || toNumber(a.class) - toNumber(b.class)
    );

    let currentGrade = "";
    let rank = 0;
    let previousTotal = null;
    summary.forEach((item, index) => {
      if (item.grade !== currentGrade) {
        currentGrade = item.grade;
        rank = 1;
        previousTotal = item.total;
      } else if (item.total !== previousTotal) {
        rank += 1;
        previousTotal = item.total;
      }
      item.rank = rank;
      item.groupIndex = index;
    });

    return summary;
  }

  function renderScoreSummary(summary) {
    const tbody = els["score-summary-body"];
    const empty = els["score-summary-empty"];
    tbody.innerHTML = "";
    empty.classList.toggle("hidden", summary.length !== 0);

    summary.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escHtml(item.rank)}위</strong></td>
        <td>${escHtml(item.grade)}</td>
        <td>${escHtml(item.class)}</td>
        <td><strong class="score-total">${escHtml(item.total)}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function setJudgeStatus(message, isError) {
    els["judge-save-status"].textContent = message;
    els["judge-save-status"].className = `alert ${isError ? "alert-error" : "alert-info"}`;
    els["judge-save-status"].classList.remove("hidden");
  }

  function getEntriesForEvent(eventName) {
    return allEntries.filter(entry => entry.event === eventName);
  }

  function getRecordsForEvent(eventName) {
    return allRecords.filter(record => record.event === eventName);
  }

  function filterEntries(entries) {
    const selectedEvent = getSelectedEventFilter();
    const selectedGrade = els["day-filter-grade"].value;
    const selectedClass = els["day-filter-class"].value;
    const query = getSearchQuery();

    return entries.filter(entry => {
      if (selectedEvent && entry.event !== selectedEvent) return false;
      if (selectedGrade && entry.grade !== selectedGrade) return false;
      if (selectedClass && entry.class !== selectedClass) return false;
      if (query && !entryMatchesQuery(entry, query)) return false;
      return true;
    });
  }

  function filterRecords(records) {
    const selectedEvent = getSelectedEventFilter();
    const selectedGrade = els["day-filter-grade"].value;
    const selectedClass = els["day-filter-class"].value;
    const query = getSearchQuery();

    return records.filter(record => {
      if (selectedEvent && record.event !== selectedEvent) return false;
      if (selectedGrade && record.grade !== selectedGrade) return false;
      if (selectedClass && record.class !== selectedClass) return false;
      if (query && !recordMatchesQuery(record, query)) return false;
      return true;
    });
  }

  function entryMatchesQuery(entry, query) {
    return [
      entry.studentName,
      entry.gender,
      entry.grade,
      entry.class,
      entry.event,
      entry.role,
      classLabel(entry),
    ].some(value => String(value || "").toLowerCase().includes(query));
  }

  function recordMatchesQuery(record, query) {
    return [
      record.grade,
      record.class,
      record.event,
      record.participants,
      classLabel(record),
    ].some(value => String(value || "").toLowerCase().includes(query));
  }

  function groupEntriesByClass(entries) {
    const map = new Map();

    entries.sort(compareEntries).forEach(entry => {
      const key = classKey(entry);
      if (!map.has(key)) {
        map.set(key, {
          label: classLabel(entry),
          entries: [],
        });
      }
      map.get(key).entries.push(entry);
    });

    return Array.from(map.values());
  }

  function buildEntriesFromRecords(records) {
    const entries = [];

    records.forEach(record => {
      if (record.skipped || !String(record.participants || "").trim()) return;

      parseParticipantText(record.participants).forEach(item => {
        entries.push({
          timestamp: record.timestamp,
          grade: String(record.grade || ""),
          class: String(record.class || ""),
          event: String(record.event || ""),
          role: item.role,
          studentName: item.studentName,
          gender: item.gender,
          writerName: record.writerName || "",
          teacherName: record.teacherName || "",
        });
      });
    });

    return entries;
  }

  function parseParticipantText(text) {
    const rows = [];
    let currentRole = "";

    String(text || "")
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)
      .forEach(item => {
        const roleMatch = item.match(/^([^:：]+)[:：]\s*(.+)$/);
        let nameText = item;

        if (roleMatch) {
          currentRole = roleMatch[1].trim();
          nameText = roleMatch[2].trim();
        }

        const parsed = parseGenderName(nameText);
        if (parsed.studentName) {
          rows.push({
            role: currentRole,
            gender: parsed.gender,
            studentName: parsed.studentName,
          });
        }
      });

    return rows;
  }

  function parseGenderName(value) {
    const match = String(value || "").trim().match(/^(남|여)\s+(.+)$/);
    if (match) {
      return { gender: match[1], studentName: match[2].trim() };
    }
    return { gender: "", studentName: String(value || "").trim() };
  }

  function exportCSV() {
    if (currentView === "students" && !hasStudentSearchCriteria()) {
      alert("학생 확인 탭에서는 검색어를 입력하거나 종목, 학년, 반을 선택한 뒤 내보낼 수 있습니다.");
      return;
    }

    const entries = filterEntries(allEntries);
    if (entries.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }

    const BOM = "\uFEFF";
    const headers = ["번호", "학년", "반", "학생", "성별", "종목", "역할/조"];
    const rows = entries.sort(compareEntries).map((entry, index) => [
      index + 1,
      entry.grade,
      entry.class,
      entry.studentName,
      entry.gender,
      entry.event,
      entry.role,
    ]);

    const csv = BOM + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${CONFIG.eventTitle.replace(/\s+/g, "_")}_당일운영명단_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function hasActiveSearch() {
    return Boolean(
      els["day-filter-grade"].value ||
      els["day-filter-class"].value ||
      getSearchQuery()
    );
  }

  function hasStudentSearchCriteria() {
    return Boolean(
      els["day-filter-event"].value ||
      els["day-filter-grade"].value ||
      els["day-filter-class"].value ||
      getSearchQuery()
    );
  }

  function getSearchQuery() {
    return els["day-filter-search"].value.trim().toLowerCase();
  }

  function getSelectedEventFilter() {
    return currentView === "events" ? activeEventName : els["day-filter-event"].value;
  }

  function ensureActiveEvent() {
    if (CONFIG.events.some(event => event.name === activeEventName)) return;
    activeEventName = CONFIG.events[0] ? CONFIG.events[0].name : "";
  }

  function getEventConfig(eventName) {
    return CONFIG.events.find(event => event.name === eventName);
  }

  function getEventOrder(eventName, fallbackIndex) {
    const index = CONFIG.events.findIndex(event => event.name === eventName);
    return index >= 0 ? index + 1 : fallbackIndex + 1;
  }

  function compareEntries(a, b) {
    return getEventOrder(a.event, 999) - getEventOrder(b.event, 999)
      || toNumber(a.grade) - toNumber(b.grade)
      || toNumber(a.class) - toNumber(b.class)
      || String(a.role || "").localeCompare(String(b.role || ""), "ko")
      || String(a.studentName || "").localeCompare(String(b.studentName || ""), "ko");
  }

  function countRecordClasses(records) {
    return new Set(records.map(record => classKey(record))).size;
  }

  function countParticipantsFromRecords(records) {
    return records.reduce((sum, record) => {
      if (record.skipped || !String(record.participants || "").trim()) return sum;
      return sum + parseParticipantText(record.participants).length;
    }, 0);
  }

  function classKey(item) {
    return `${item.grade || ""}-${item.class || ""}`;
  }

  function classLabel(item) {
    return [item.grade, item.class].filter(Boolean).join(" ");
  }

  function formatShortDate(value) {
    return String(value).replace(/:\d{2}(?=\s|$)/, "");
  }

  function toNumber(value) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 999;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
