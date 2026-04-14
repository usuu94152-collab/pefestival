// ============================================================
// form.js — 체육대회 참가신청 멀티스텝 폼 로직
// ============================================================

(function () {
  "use strict";

  const DRAFT_KEY = "pefestival_draft";

  // ── 상태 ────────────────────────────────────────────────
  let currentStep = 0;
  // steps: [0=안내, 1=학급정보, 2..N+1=종목별, N+2=확인]
  // totalSteps = 2 + events.length + 1 (확인)
  const INTRO_STEP    = 0;
  const CLASS_STEP    = 1;
  const CONFIRM_STEP  = () => 2 + CONFIG.events.length;
  const COMPLETE_STEP = () => CONFIRM_STEP() + 1;

  // 입력 데이터 저장소
  const formData = {
    grade: "",
    class: "",
    writerName: "",
    teacherName: "",
    roster: [], // [{ num, name }, ...] — 학급 명렬 (GAS에서 fetch)
    events: [], // [{ name, participants:[], skipped:false }, ...]
  };

  // ── DOM 참조 ────────────────────────────────────────────
  const els = {
    draftBanner:   document.getElementById("draft-banner"),
    draftTime:     document.getElementById("draft-banner-time"),
    btnDiscardDraft: document.getElementById("btn-discard-draft"),
    btnRestoreDraft: document.getElementById("btn-restore-draft"),
    progressContainer: document.getElementById("progress-container"),
    progressBar:   document.getElementById("progress-bar"),
    progressText:  document.getElementById("progress-text"),
    btnPrev:       document.getElementById("btn-prev"),
    btnNext:       document.getElementById("btn-next"),
    btnSaveDraft:  document.getElementById("btn-save-draft"),
    bottomNav:     document.getElementById("bottom-nav"),
    submitError:   document.getElementById("submit-error"),
    eventSteps:    document.getElementById("event-steps-container"),
  };

  // ── 초기화 ──────────────────────────────────────────────
  function init() {
    populateMetaInfo();
    populateSelects();
    buildEventSteps();
    initEventListeners();
    checkDraft();
  }

  function populateMetaInfo() {
    document.title = CONFIG.eventTitle + " 참가신청";
    document.getElementById("header-badge").textContent = CONFIG.eventTitle;
    document.getElementById("header-title").textContent = "체육대회 참가신청서";
    document.getElementById("header-subtitle").textContent = CONFIG.schoolName;
    document.getElementById("intro-event-title").textContent = CONFIG.eventTitle;
    document.getElementById("info-date").textContent = CONFIG.eventDate;
    document.getElementById("info-location").textContent = CONFIG.eventLocation;
    document.getElementById("info-events").textContent =
      CONFIG.events.map(e => e.name).join(", ");
    document.getElementById("intro-text").innerHTML = CONFIG.introText;
    document.getElementById("site-footer").textContent =
      CONFIG.schoolName + " " + CONFIG.eventTitle;
  }

  function populateSelects() {
    const gradeEl = document.getElementById("select-grade");
    const classEl = document.getElementById("select-class");
    CONFIG.grades.forEach(g => gradeEl.appendChild(makeOption(g)));
    CONFIG.classes.forEach(c => classEl.appendChild(makeOption(c)));
  }

  function makeOption(val) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = val;
    return opt;
  }

  // ── 종목 스텝 동적 생성 ─────────────────────────────────
  function buildEventSteps() {
    CONFIG.events.forEach((event, idx) => {
      formData.events.push({ name: event.name, participants: [""], skipped: false });
      const panel = createEventPanel(event, idx);
      els.eventSteps.appendChild(panel);
    });
  }

  function createEventPanel(event, idx) {
    const stepNum = idx + 2; // step 0=안내, 1=학급, 2+idx=종목
    const panel = document.createElement("div");
    panel.id = `step-${stepNum}`;
    panel.className = "step-panel hidden";

    const maxLabel = event.maxParticipants > 0
      ? `최대 ${event.maxParticipants}명`
      : "인원 제한 없음";
    const desc = event.description ? `— ${event.description}` : "";

    panel.innerHTML = `
      <div class="card">
        <div class="card-label">STEP ${String(stepNum).padStart(2, "0")}</div>
        <h2 class="card-title">${escHtml(event.name)}</h2>
        <div class="card-title-underline"></div>
        <p class="card-subtitle">${escHtml(maxLabel)} ${escHtml(desc)}</p>

        <div class="participants-list" id="plist-${idx}"></div>

        <button type="button" class="btn-add-participant" id="btn-add-${idx}">
          + 학생 추가
        </button>
        <div class="max-reached-msg hidden" id="max-msg-${idx}">
          최대 인원(${event.maxParticipants}명)에 도달했습니다.
        </div>

        <label class="skip-toggle" id="skip-label-${idx}">
          <input type="checkbox" id="skip-check-${idx}" />
          이 종목에 참가하는 학생이 없습니다 (건너뛰기)
        </label>
      </div>
    `;

    // 이벤트 바인딩 (DOM 삽입 후)
    setTimeout(() => {
      renderParticipants(idx);

      document.getElementById(`btn-add-${idx}`).addEventListener("click", () => {
        formData.events[idx].participants.push("");
        renderParticipants(idx);
      });

      document.getElementById(`skip-check-${idx}`).addEventListener("change", e => {
        formData.events[idx].skipped = e.target.checked;
        updateSkipUI(idx);
      });
    }, 0);

    return panel;
  }

  function renderParticipants(idx) {
    if (formData.roster.length > 0) {
      renderChipPicker(idx);
    } else {
      renderTextInputs(idx);
    }
  }

  // 명렬이 있을 때: 칩(chip) 선택 UI
  function renderChipPicker(idx) {
    const event  = CONFIG.events[idx];
    const data   = formData.events[idx];
    const list   = document.getElementById(`plist-${idx}`);
    const addBtn = document.getElementById(`btn-add-${idx}`);
    const maxMsg = document.getElementById(`max-msg-${idx}`);

    if (addBtn) addBtn.style.display = "none";

    const max      = event.maxParticipants;
    const selected = new Set(data.participants.filter(p => p.trim() !== ""));

    list.className = "chips-grid";
    list.innerHTML = "";

    formData.roster.forEach(student => {
      const isSelected = selected.has(student.name);
      const atMax      = max > 0 && selected.size >= max;
      const isDisabled = data.skipped || (!isSelected && atMax);

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "student-chip"
        + (isSelected  ? " selected"  : "")
        + (isDisabled  ? " is-disabled" : "");
      chip.disabled  = isDisabled;
      const genderClass = student.gender === "남" ? "male" : student.gender === "여" ? "female" : "";
      const genderBadge = student.gender
        ? `<span class="chip-gender ${genderClass}">${escHtml(student.gender)}</span>`
        : "";
      chip.innerHTML = (student.num ? `<span class="chip-num">${escHtml(String(student.num))}</span>` : "")
        + escHtml(student.name)
        + genderBadge;

      chip.addEventListener("click", () => {
        if (selected.has(student.name)) {
          selected.delete(student.name);
        } else {
          if (max > 0 && selected.size >= max) return;
          selected.add(student.name);
        }
        data.participants = Array.from(selected);
        renderChipPicker(idx);
      });

      list.appendChild(chip);
    });

    // 선택 인원 표시
    const countText = max > 0
      ? `${selected.size} / ${max}명 선택`
      : `${selected.size}명 선택됨`;
    maxMsg.textContent = countText;
    maxMsg.classList.remove("hidden");
    maxMsg.className = "chip-count-msg" + (max > 0 && selected.size >= max ? " at-max" : "");
  }

  // 명렬이 없을 때: 기존 텍스트 입력 UI
  function renderTextInputs(idx) {
    const event  = CONFIG.events[idx];
    const data   = formData.events[idx];
    const list   = document.getElementById(`plist-${idx}`);
    const addBtn = document.getElementById(`btn-add-${idx}`);
    const maxMsg = document.getElementById(`max-msg-${idx}`);

    if (addBtn) addBtn.style.display = "";
    list.className = "participants-list";
    list.innerHTML = "";

    data.participants.forEach((name, pIdx) => {
      const item = document.createElement("div");
      item.className = "participant-item";
      item.innerHTML = `
        <span class="participant-number">${pIdx + 1}</span>
        <input type="text" placeholder="학생 이름"
               value="${escHtml(name)}"
               data-pidx="${pIdx}"
               maxlength="20" />
        <button type="button" class="btn-remove-participant"
                title="삭제" data-pidx="${pIdx}">×</button>
      `;
      list.appendChild(item);

      item.querySelector("input").addEventListener("input", e => {
        formData.events[idx].participants[pIdx] = e.target.value;
      });
      item.querySelector(".btn-remove-participant").addEventListener("click", () => {
        if (data.participants.length <= 1) {
          formData.events[idx].participants[0] = "";
          renderParticipants(idx);
          return;
        }
        formData.events[idx].participants.splice(pIdx, 1);
        renderParticipants(idx);
      });
    });

    const max  = event.maxParticipants;
    const atMax = max > 0 && data.participants.length >= max;
    addBtn.disabled = atMax || data.skipped;
    maxMsg.className = "max-reached-msg";
    maxMsg.classList.toggle("hidden", !atMax);
  }

  function updateSkipUI(idx) {
    const data = formData.events[idx];
    const list = document.getElementById(`plist-${idx}`);
    const addBtn = document.getElementById(`btn-add-${idx}`);
    const skipLabel = document.getElementById(`skip-label-${idx}`);

    list.style.opacity       = data.skipped ? "0.4" : "1";
    list.style.pointerEvents = data.skipped ? "none" : "auto";
    addBtn.disabled = data.skipped;
    skipLabel.classList.toggle("is-skipped", data.skipped);
  }

  // ── 이벤트 리스너 ───────────────────────────────────────
  function initEventListeners() {
    els.btnNext.addEventListener("click", handleNext);
    els.btnPrev.addEventListener("click", handlePrev);
    els.btnSaveDraft.addEventListener("click", () => {
      saveDraft();
      showToast("임시저장 완료!");
    });
    els.btnDiscardDraft.addEventListener("click", discardDraft);
    els.btnRestoreDraft.addEventListener("click", restoreDraft);

    // 동의 체크박스 → 시작 버튼 활성화
    document.getElementById("agreement-checkbox").addEventListener("change", e => {
      els.btnNext.disabled = !e.target.checked;
    });
    els.btnNext.disabled = true; // 초기 비활성
  }

  // ── 스텝 네비게이션 ─────────────────────────────────────
  async function handleNext() {
    if (!validateCurrentStep()) return;

    // 확인 단계에서 제출
    if (currentStep === CONFIRM_STEP()) {
      submitForm();
      return;
    }

    // 현재 데이터 자동저장
    saveDraft();

    // 학급 정보 입력 후 → 명렬 fetch
    if (currentStep === CLASS_STEP) {
      await fetchRoster();
    }

    goToStep(currentStep + 1);
  }

  async function fetchRoster() {
    if (!CONFIG.scriptUrl || CONFIG.scriptUrl.includes("YOUR_")) return;

    els.btnNext.disabled = true;
    els.btnNext.innerHTML = '<span class="spinner"></span>';

    try {
      const url = CONFIG.scriptUrl
        + "?action=getRoster"
        + "&grade=" + encodeURIComponent(formData.grade)
        + "&class=" + encodeURIComponent(formData.class);
      const res  = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.students)) {
        formData.roster = json.students;
      }
    } catch (e) {
      formData.roster = [];
    } finally {
      els.btnNext.disabled = false;
      els.btnNext.textContent = "다음";
    }
  }

  function handlePrev() {
    goToStep(currentStep - 1);
  }

  function goToStep(n) {
    // 현재 패널 숨기기
    const currentPanel = getStepPanel(currentStep);
    if (currentPanel) currentPanel.classList.add("hidden");

    currentStep = n;

    // 새 패널 표시
    const newPanel = getStepPanel(currentStep);
    if (newPanel) {
      newPanel.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 이벤트 스텝 진입 시 참가학생 렌더링 (명렬 반영)
    const arrivedEventIdx = currentStep - 2;
    if (arrivedEventIdx >= 0 && arrivedEventIdx < CONFIG.events.length) {
      renderParticipants(arrivedEventIdx);
    }

    // 확인 페이지 진입 시 요약 렌더링
    if (currentStep === CONFIRM_STEP()) renderSummary();

    updateNavUI();
  }

  function getStepPanel(step) {
    if (step === INTRO_STEP)    return document.getElementById("step-0");
    if (step === CLASS_STEP)    return document.getElementById("step-1");
    if (step === CONFIRM_STEP()) return document.getElementById("step-confirm");
    if (step === COMPLETE_STEP()) return document.getElementById("step-complete");
    // 종목 스텝
    const eventIdx = step - 2;
    if (eventIdx >= 0 && eventIdx < CONFIG.events.length) {
      return document.getElementById(`step-${step}`);
    }
    return null;
  }

  function updateNavUI() {
    const total = CONFIRM_STEP(); // 마지막 데이터 입력 스텝
    const isIntro    = currentStep === INTRO_STEP;
    const isComplete = currentStep === COMPLETE_STEP();

    // 완료 화면: 네비 숨기기
    if (isComplete) {
      els.bottomNav.style.display = "none";
      els.progressContainer.style.display = "none";
      return;
    }

    els.bottomNav.style.display = "";
    els.btnPrev.style.display = isIntro ? "none" : "";
    els.btnSaveDraft.style.display = (isIntro || isComplete) ? "none" : "";

    // 다음 버튼 텍스트
    if (isIntro) {
      els.btnNext.textContent = "시작하기";
      els.btnNext.disabled = !document.getElementById("agreement-checkbox").checked;
    } else if (currentStep === CONFIRM_STEP()) {
      els.btnNext.textContent = "제출하기";
      els.btnNext.disabled = false;
    } else {
      els.btnNext.textContent = "다음";
      els.btnNext.disabled = false;
    }

    // 프로그레스 바 (안내 단계 이후)
    if (isIntro) {
      els.progressContainer.style.display = "none";
    } else {
      els.progressContainer.style.display = "";
      // 클래스 입력(1) + 종목들(events.length) + 확인(1)
      const totalSteps = 1 + CONFIG.events.length + 1;
      const doneSteps  = currentStep; // step 1부터 카운트
      const pct = Math.round((doneSteps / totalSteps) * 100);
      els.progressBar.style.width = pct + "%";
      els.progressText.textContent = `${doneSteps} / ${totalSteps}`;
    }
  }

  // ── 유효성 검사 ─────────────────────────────────────────
  function validateCurrentStep() {
    if (currentStep === INTRO_STEP) {
      return document.getElementById("agreement-checkbox").checked;
    }

    if (currentStep === CLASS_STEP) {
      let ok = true;
      const grade = document.getElementById("select-grade");
      const cls   = document.getElementById("select-class");
      const gErr  = document.getElementById("grade-error");
      const cErr  = document.getElementById("class-error");

      if (!grade.value) {
        gErr.textContent = "학년을 선택해주세요.";
        grade.classList.add("input-error");
        ok = false;
      } else {
        gErr.textContent = "";
        grade.classList.remove("input-error");
        formData.grade = grade.value;
      }
      if (!cls.value) {
        cErr.textContent = "반을 선택해주세요.";
        cls.classList.add("input-error");
        ok = false;
      } else {
        cErr.textContent = "";
        cls.classList.remove("input-error");
        formData.class = cls.value;
      }
      return ok;
    }

    // 종목 스텝: 건너뛰지 않았으면 최소 1명 입력
    const eventIdx = currentStep - 2;
    if (eventIdx >= 0 && eventIdx < CONFIG.events.length) {
      const data = formData.events[eventIdx];
      if (!data.skipped) {
        const filled = data.participants.filter(p => p.trim() !== "");
        if (filled.length === 0) {
          // 건너뛰기 체크 안 하고 비워두면 경고만 표시, 강제하지 않음 (선택적)
          // 강제하려면 여기서 return false;
        }
      }
    }

    // 확인 단계: 작성자 이름 필수
    if (currentStep === CONFIRM_STEP()) {
      const writerInput = document.getElementById("sign-writer-name");
      const writerError = document.getElementById("sign-writer-error");
      if (writerInput && !writerInput.value.trim()) {
        writerError.style.display = "";
        writerInput.focus();
        return false;
      }
      if (writerError) writerError.style.display = "none";
    }

    return true;
  }

  // ── 확인 페이지 렌더링 ──────────────────────────────────
  function renderSummary() {
    const container = document.getElementById("summary-content");
    container.innerHTML = "";

    // 학급 정보
    const classCard = document.createElement("div");
    classCard.innerHTML = `
      <table class="summary-table" style="margin-bottom:1rem;">
        <tr>
          <th>학년</th>
          <td>${escHtml(formData.grade)}</td>
        </tr>
        <tr>
          <th>반</th>
          <td>${escHtml(formData.class)}</td>
        </tr>
      </table>
    `;
    container.appendChild(classCard);

    // 종목별 요약
    const eventsTable = document.createElement("table");
    eventsTable.className = "summary-table";
    eventsTable.innerHTML = `
      <thead>
        <tr>
          <th>종목</th>
          <th>참가 학생</th>
        </tr>
      </thead>
      <tbody id="summary-tbody"></tbody>
    `;
    container.appendChild(eventsTable);

    const tbody = eventsTable.querySelector("#summary-tbody");
    formData.events.forEach(ev => {
      const tr = document.createElement("tr");
      const filled = ev.participants.filter(p => p.trim() !== "");

      if (ev.skipped || filled.length === 0) {
        tr.innerHTML = `
          <td>${escHtml(ev.name)}</td>
          <td class="no-participants">참가 없음</td>
        `;
      } else {
        const tags = filled.map(p =>
          `<span class="participant-tag">${escHtml(p)}</span>`
        ).join("");
        tr.innerHTML = `
          <td>${escHtml(ev.name)}</td>
          <td><div class="participants-list-text">${tags}</div></td>
        `;
      }
      tbody.appendChild(tr);
    });

    // 서명란
    const signSection = document.createElement("div");
    signSection.style.cssText = "margin-top:1.75rem;";
    signSection.innerHTML = `
      <p style="font-size:0.82rem; color:var(--color-muted); margin-bottom:0.75rem; font-weight:600; letter-spacing:0.03em;">서명</p>
      <table class="summary-table" style="table-layout:fixed;">
        <tbody>
          <tr>
            <th style="width:7rem;">작성자 이름 <span class="required">*</span></th>
            <td><input type="text" class="sign-input" id="sign-writer-name" placeholder="이름 입력" value="${escHtml(formData.writerName)}" maxlength="20" /></td>
            <th style="width:4rem;">서명</th>
            <td><div class="sign-box" id="sign-writer-sign"></div></td>
          </tr>
          <tr>
            <th>담임교사 이름</th>
            <td><input type="text" class="sign-input" id="sign-teacher-name" placeholder="이름 입력" value="${escHtml(formData.teacherName)}" maxlength="20" /></td>
            <th>서명</th>
            <td><div class="sign-box" id="sign-teacher-sign"></div></td>
          </tr>
        </tbody>
      </table>
      <p id="sign-writer-error" style="color:var(--color-danger); font-size:0.82rem; margin-top:0.4rem; display:none;">작성자 이름을 입력해주세요.</p>
    `;
    container.appendChild(signSection);

    document.getElementById("sign-writer-name").addEventListener("input", e => {
      formData.writerName = e.target.value;
    });
    document.getElementById("sign-teacher-name").addEventListener("input", e => {
      formData.teacherName = e.target.value;
    });
  }

  // ── 제출 ────────────────────────────────────────────────
  async function submitForm() {
    els.btnNext.disabled = true;
    els.btnNext.innerHTML = `<span class="spinner"></span> 제출 중...`;
    els.submitError.classList.add("hidden");

    const payload = {
      grade:       formData.grade,
      class:       formData.class,
      writerName:  formData.writerName,
      teacherName: formData.teacherName,
      events: formData.events.map(ev => ({
        name:         ev.name,
        participants: ev.participants.filter(p => p.trim() !== ""),
        skipped:      ev.skipped,
      })),
    };

    try {
      const res  = await fetch(CONFIG.scriptUrl, {
        method:  "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        clearDraft();
        goToStep(COMPLETE_STEP());
        renderCompleteScreen();
      } else {
        showSubmitError(json.message || "오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      showSubmitError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
    } finally {
      els.btnNext.disabled = false;
      els.btnNext.textContent = "제출하기";
    }
  }

  function showSubmitError(msg) {
    els.submitError.textContent = msg;
    els.submitError.classList.remove("hidden");
    els.submitError.scrollIntoView({ behavior: "smooth" });
  }

  function renderCompleteScreen() {
    const container = document.getElementById("complete-summary");
    const participated = formData.events.filter(ev => {
      return !ev.skipped && ev.participants.filter(p => p.trim()).length > 0;
    });
    if (participated.length === 0) {
      container.innerHTML = "";
      return;
    }
    let html = `<p style="font-size:0.88rem; color:var(--color-muted); margin-bottom:0.75rem;">
                  <strong>${formData.grade} ${formData.class}</strong> 신청 종목:
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">`;
    participated.forEach(ev => {
      html += `<span class="participant-tag">${escHtml(ev.name)}</span>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  // ── 임시저장 ────────────────────────────────────────────
  function saveDraft() {
    const draft = {
      step:        currentStep,
      grade:       formData.grade,
      class:       formData.class,
      writerName:  formData.writerName,
      teacherName: formData.teacherName,
      events:      JSON.parse(JSON.stringify(formData.events)),
      savedAt:     Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // localStorage 사용 불가 시 무시
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function checkDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.savedAt) return;

      const elapsed = Date.now() - draft.savedAt;
      const minutes = Math.floor(elapsed / 60000);
      const timeLabel = minutes < 1 ? "방금 전" : `${minutes}분 전`;

      els.draftBanner.classList.remove("hidden");
      els.draftTime.textContent = `${timeLabel}에 저장된 작성 내용이 있습니다.`;
    } catch (e) {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);

      // 학급 정보 복원
      if (draft.grade) {
        document.getElementById("select-grade").value = draft.grade;
        formData.grade = draft.grade;
      }
      if (draft.class) {
        document.getElementById("select-class").value = draft.class;
        formData.class = draft.class;
      }

      // 종목 데이터 복원 (events 배열 길이가 맞는 경우만)
      if (Array.isArray(draft.events) && draft.events.length === CONFIG.events.length) {
        draft.events.forEach((ev, idx) => {
          formData.events[idx].participants = ev.participants || [""];
          formData.events[idx].skipped      = ev.skipped || false;
          renderParticipants(idx);
          const skipCheck = document.getElementById(`skip-check-${idx}`);
          if (skipCheck) {
            skipCheck.checked = formData.events[idx].skipped;
            updateSkipUI(idx);
          }
        });
      }

      // 작성자/담임교사 복원
      if (draft.writerName)  formData.writerName  = draft.writerName;
      if (draft.teacherName) formData.teacherName = draft.teacherName;

      // 명렬 재fetch (이벤트 스텝에 있을 경우 칩 재렌더링)
      if (formData.grade && formData.class) {
        fetchRoster().then(() => {
          const eventIdx = currentStep - 2;
          if (eventIdx >= 0 && eventIdx < CONFIG.events.length) {
            renderParticipants(eventIdx);
          }
        });
      }

      // 동의 체크박스 자동 체크
      document.getElementById("agreement-checkbox").checked = true;
      els.btnNext.disabled = false;

      els.draftBanner.classList.add("hidden");

      // 저장된 스텝으로 이동
      const targetStep = Math.max(0, Math.min(draft.step || 0, CONFIRM_STEP()));
      if (targetStep > 0) goToStep(targetStep);

    } catch (e) {
      els.draftBanner.classList.add("hidden");
    }
  }

  function discardDraft() {
    clearDraft();
    els.draftBanner.classList.add("hidden");
  }

  // ── 토스트 메시지 ────────────────────────────────────────
  function showToast(msg) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(26,26,46,0.85)",
      color: "#fff",
      padding: "0.6rem 1.25rem",
      borderRadius: "20px",
      fontSize: "0.88rem",
      fontWeight: "600",
      zIndex: "9999",
      pointerEvents: "none",
      transition: "opacity 0.3s",
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 1800);
    setTimeout(() => { toast.remove(); }, 2200);
  }

  // ── 유틸 ────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── 시작 ────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);
})();
