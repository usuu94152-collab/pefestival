// ============================================================
// admin.js — 체육대회 관리자 페이지 로직
// ============================================================

(function () {
  "use strict";

  let allRecords    = [];
  let filteredRecs  = [];
  let authedPw      = "";
  let currentTab    = "table";

  // ── 로그인 ──────────────────────────────────────────────
  function initLogin() {
    const loginBtn = document.getElementById("login-btn");
    const pwInput  = document.getElementById("admin-password");

    loginBtn.addEventListener("click", attemptLogin);
    pwInput.addEventListener("keydown", e => { if (e.key === "Enter") attemptLogin(); });
  }

  function attemptLogin() {
    const pw = document.getElementById("admin-password").value;
    const err = document.getElementById("login-error");

    if (!pw) {
      err.textContent = "비밀번호를 입력해주세요.";
      return;
    }
    err.textContent = "";
    authedPw = pw;
    loadData();
  }

  function showAdminUI() {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("admin-ui").classList.remove("hidden");

    document.getElementById("admin-badge").textContent = CONFIG.eventBadge || CONFIG.eventTitle;
    document.getElementById("admin-title").textContent =
      CONFIG.schoolName + " " + CONFIG.eventTitle + " 신청 현황";

    populateFilters();
    bindAdminEvents();
  }

  function bindAdminEvents() {
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("btn-refresh").addEventListener("click", loadData);
    document.getElementById("btn-export-csv").addEventListener("click", exportCSV);

    ["filter-grade", "filter-class", "filter-event", "filter-search"].forEach(id => {
      document.getElementById(id).addEventListener("input", applyFilters);
    });

    document.getElementById("tab-table").addEventListener("click", () => switchTab("table"));
    document.getElementById("tab-summary").addEventListener("click", () => switchTab("summary"));
  }

  function logout() {
    authedPw = "";
    allRecords = [];
    document.getElementById("admin-ui").classList.add("hidden");
    document.getElementById("login-overlay").classList.remove("hidden");
    document.getElementById("admin-password").value = "";
    document.getElementById("login-error").textContent = "";
  }

  // ── 데이터 로드 ─────────────────────────────────────────
  async function loadData() {
    showLoading(true);
    try {
      const url = new URL(CONFIG.scriptUrl);
      url.searchParams.set("action",   "getData");
      url.searchParams.set("password", authedPw);

      const res  = await fetch(url.toString());
      const json = await res.json();

      if (!json.success) {
        if (json.message && json.message.includes("비밀번호")) {
          document.getElementById("login-error").textContent = json.message;
          document.getElementById("login-overlay").classList.remove("hidden");
          document.getElementById("admin-ui").classList.add("hidden");
        } else {
          alert("오류: " + json.message);
        }
        return;
      }

      // 첫 성공 로드 시 UI 표시
      if (document.getElementById("admin-ui").classList.contains("hidden")) {
        showAdminUI();
      }

      allRecords = json.data || [];
      applyFilters();
      renderStats();
      if (currentTab === "summary") renderSummaryView();

    } catch (err) {
      alert("데이터를 불러오지 못했습니다: " + err.message);
    } finally {
      showLoading(false);
    }
  }

  // ── 필터 셀렉트 초기화 ──────────────────────────────────
  function populateFilters() {
    CONFIG.grades.forEach(g  => addOption("filter-grade", g));
    CONFIG.classes.forEach(c => addOption("filter-class", c));
    CONFIG.events.forEach(ev => addOption("filter-event", ev.name));
  }

  function addOption(selectId, value) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = value;
    document.getElementById(selectId).appendChild(opt);
  }

  // ── 필터링 ──────────────────────────────────────────────
  function applyFilters() {
    const grade  = document.getElementById("filter-grade").value;
    const cls    = document.getElementById("filter-class").value;
    const event  = document.getElementById("filter-event").value;
    const search = document.getElementById("filter-search").value.trim().toLowerCase();

    filteredRecs = allRecords.filter(r => {
      if (grade  && r.grade !== grade)               return false;
      if (cls    && r.class !== cls)                 return false;
      if (event  && r.event !== event)               return false;
      if (search && !r.participants.toLowerCase().includes(search)) return false;
      return true;
    });

    renderTable(filteredRecs);
    document.getElementById("filtered-count").textContent =
      `${filteredRecs.length}개 행 표시 중`;
  }

  // ── 테이블 렌더링 ───────────────────────────────────────
  function renderTable(records) {
    const tbody = document.getElementById("table-body");
    const empty = document.getElementById("table-empty");
    tbody.innerHTML = "";

    if (records.length === 0) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    records.forEach((r, idx) => {
      const tr = document.createElement("tr");
      const participantsHtml = r.skipped
        ? `<span style="color:var(--color-muted); font-style:italic;">참가 없음</span>`
        : escHtml(r.participants);

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td style="white-space:nowrap;">${escHtml(String(r.timestamp))}</td>
        <td>${escHtml(r.grade)}</td>
        <td>${escHtml(r.class)}</td>
        <td><strong>${escHtml(r.event)}</strong></td>
        <td>${participantsHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ── 통계 렌더링 ─────────────────────────────────────────
  function renderStats() {
    document.getElementById("stat-total").textContent = allRecords.length;

    // 신청 학급 수 (학년+반 조합 중복 제거)
    const classSet = new Set(allRecords.map(r => r.grade + r.class));
    document.getElementById("stat-classes").textContent = classSet.size;

    // 총 참가 인원 (쉼표 기준 카운트, 건너뛴 종목 제외)
    let total = 0;
    allRecords.forEach(r => {
      if (!r.skipped && r.participants && r.participants.trim() !== "") {
        total += r.participants.split(",").filter(p => p.trim()).length;
      }
    });
    document.getElementById("stat-participants").textContent = total;
  }

  // ── 종목별 요약 뷰 ──────────────────────────────────────
  function renderSummaryView() {
    const container = document.getElementById("summary-cards");
    container.innerHTML = "";

    CONFIG.events.forEach(ev => {
      const eventRecords = allRecords.filter(r =>
        r.event === ev.name && !r.skipped && r.participants.trim() !== ""
      );

      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "1rem";

      let bodyHtml = "";
      if (eventRecords.length === 0) {
        bodyHtml = `<p style="color:var(--color-muted); font-size:0.88rem;">신청 없음</p>`;
      } else {
        // 학급별 그룹
        const byClass = {};
        eventRecords.forEach(r => {
          const key = `${r.grade} ${r.class}`;
          if (!byClass[key]) byClass[key] = [];
          r.participants.split(",").forEach(p => {
            const name = p.trim();
            if (name) byClass[key].push(name);
          });
        });

        bodyHtml = `<table class="summary-table" style="margin-top:0.75rem;">
          <thead><tr><th>학급</th><th>참가 학생</th></tr></thead>
          <tbody>`;
        Object.entries(byClass).forEach(([cls, names]) => {
          const tags = names.map(n =>
            `<span class="participant-tag">${escHtml(n)}</span>`
          ).join(" ");
          bodyHtml += `<tr>
            <td style="white-space:nowrap;">${escHtml(cls)}</td>
            <td><div class="participants-list-text">${tags}</div></td>
          </tr>`;
        });
        bodyHtml += `</tbody></table>`;
      }

      // 총 인원 계산
      let totalCount = 0;
      eventRecords.forEach(r => {
        totalCount += r.participants.split(",").filter(p => p.trim()).length;
      });

      card.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
          <div>
            <div class="card-label" style="margin-bottom:0.2rem;">${escHtml(ev.name)}</div>
            <span style="font-size:0.85rem; color:var(--color-muted);">
              ${eventRecords.length}개 학급 · 총 ${totalCount}명
            </span>
          </div>
        </div>
        ${bodyHtml}
      `;
      container.appendChild(card);
    });
  }

  // ── 탭 전환 ─────────────────────────────────────────────
  function switchTab(tab) {
    currentTab = tab;
    document.getElementById("view-table").classList.toggle("hidden",   tab !== "table");
    document.getElementById("view-summary").classList.toggle("hidden", tab !== "summary");
    document.getElementById("tab-table").className   = tab === "table"   ? "btn btn-primary btn-sm"   : "btn btn-secondary btn-sm";
    document.getElementById("tab-summary").className = tab === "summary" ? "btn btn-primary btn-sm"   : "btn btn-secondary btn-sm";

    if (tab === "summary") renderSummaryView();
  }

  // ── CSV 내보내기 ────────────────────────────────────────
  function exportCSV() {
    if (filteredRecs.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }

    const BOM     = "\uFEFF";
    const headers = ["번호", "등록일시", "학년", "반", "종목", "참가학생", "건너뜀"];
    const rows    = filteredRecs.map((r, idx) => [
      idx + 1,
      r.timestamp,
      r.grade,
      r.class,
      r.event,
      r.participants,
      r.skipped ? "Y" : "N",
    ]);

    const csv = BOM + [headers, ...rows]
      .map(row => row.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${CONFIG.eventTitle.replace(/\s+/g, "_")}_신청명단_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── 로딩 표시 ───────────────────────────────────────────
  function showLoading(show) {
    const el = document.getElementById("table-loading");
    if (el) el.style.display = show ? "block" : "none";
  }

  // ── 유틸 ────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || "")
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;");
  }

  // ── 시작 ────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", initLogin);
})();
