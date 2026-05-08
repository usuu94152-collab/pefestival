// ============================================================
// Code.gs — 체육대회 참가신청 시스템 Google Apps Script 백엔드
//
// [배포 방법]
// 1. Google Sheets 열기 → 확장 프로그램 → Apps Script
// 2. 이 파일 내용을 붙여넣기
// 3. ADMIN_PASSWORD를 실제 비밀번호로 변경
// 4. 배포 → 새 배포 → 웹 앱
//    - 다음 사용자로 실행: 나 (Me)
//    - 액세스 권한: 모든 사용자 (Anyone)
// 5. 배포 URL을 js/config.js의 scriptUrl에 붙여넣기
//
// [시트 구성]
// - "신청목록" 시트: 관리자 페이지용 종목별 신청 현황 (자동 생성)
// - "학급별제출" 시트: 각반별 전체 참가신청서 내용 (자동 생성)
// - "종목별검색" 시트: 종목/학생/역할별 검색용 신청 내역 (자동 생성)
// - "명렬" 시트: 학급별 학생 명단 (직접 작성)
//   컬럼: A=학년, B=반, C=번호, D=이름, E=성별
//   예시: 1 | 1 | 1 | 김철수 | 남
// ============================================================

const SHEET_NAME               = "신청목록";
const CLASS_SUMMARY_SHEET_NAME = "학급별제출";
const EVENT_SEARCH_SHEET_NAME  = "종목별검색";
const ROSTER_SHEET_NAME        = "명렬";
const SCORE_SHEET_NAME         = "점수기록";
const ADMIN_PASSWORD           = "CHANGE_ME"; // ← Apps Script 배포 전 실제 비밀번호로 변경하세요
const JUDGE_PASSWORD           = "CHANGE_ME"; // ← 심판 로그인 비밀번호로 변경하세요

// ── POST 핸들러: 참가신청 저장 ────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "saveJudgeScore") {
      return saveJudgeScore(data);
    }

    if (!data.grade || !data.class) {
      return buildResponse({ success: false, message: "학년과 반을 입력해주세요." });
    }
    if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
      return buildResponse({ success: false, message: "종목 데이터가 없습니다." });
    }

    const sheet = getOrCreateSheet();
    const classSummarySheet = getOrCreateClassSummarySheet();
    const eventSearchSheet = getOrCreateEventSearchSheet();
    const timestamp = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    // 중복 제출 확인
    if (hasExistingSubmission(sheet, classSummarySheet, data.grade, data.class)) {
      return buildResponse({
        success: false,
        message: `${data.grade} ${data.class}은(는) 이미 신청이 완료되었습니다. 수정이 필요하면 정경희, 유성욱 선생님께 문의하세요.`
      });
    }

    const normalizedEvents = data.events.map(normalizeEventEntry);

    // 관리자 페이지용: 종목별로 각각 행 추가
    const eventRows = normalizedEvents.map(eventEntry => [
        timestamp,
        data.grade,
        data.class,
        eventEntry.name,
        eventEntry.skipped ? "참가 없음" : eventEntry.participantText,
        eventEntry.skipped ? "Y" : "N",
        data.writerName  || "",
        data.teacherName || ""
    ]);
    appendRows(sheet, eventRows);

    // 각반별 원문 확인용: 한 학급당 한 행
    const classSummaryText = normalizedEvents.map(eventEntry => {
      const detail = eventEntry.skipped ? "참가 없음" : (eventEntry.participantText || "참가 없음");
      return `${eventEntry.name}: ${detail}`;
    }).join("\n");
    appendRows(classSummarySheet, [[
      timestamp,
      data.grade,
      data.class,
      data.writerName  || "",
      data.teacherName || "",
      classSummaryText
    ]]);

    // 종목/학생 검색용: 참가 학생 1명당 한 행
    const searchRows = [];
    normalizedEvents.forEach(eventEntry => {
      if (eventEntry.skipped) return;
      eventEntry.participantRows.forEach(row => {
        searchRows.push([
          timestamp,
          data.grade,
          data.class,
          eventEntry.name,
          row.role || "",
          row.studentName || "",
          row.gender || "",
          data.writerName  || "",
          data.teacherName || ""
        ]);
      });
    });
    appendRows(eventSearchSheet, searchRows);

    return buildResponse({ success: true, message: "신청이 완료되었습니다!" });

  } catch (err) {
    return buildResponse({ success: false, message: "서버 오류: " + err.message });
  }
}

// ── GET 핸들러 ────────────────────────────────────────────
function doGet(e) {
  try {
    // 명렬 조회
    if (e.parameter.action === "getRoster") {
      return getRosterData(e.parameter.grade, e.parameter.class);
    }

    // 당일 운영 화면: 비밀번호 없는 읽기 전용 조회
    if (e.parameter.action === "getDayData") {
      return getDayData();
    }

    // 심판 로그인 확인
    if (e.parameter.action === "judgeLogin") {
      if (e.parameter.password !== JUDGE_PASSWORD) {
        return buildResponse({ success: false, message: "심판 비밀번호가 올바르지 않습니다." });
      }
      return buildResponse({ success: true, judge: true });
    }

    // 심판 점수 조회
    if (e.parameter.action === "getJudgeScores") {
      if (e.parameter.password !== JUDGE_PASSWORD) {
        return buildResponse({ success: false, message: "심판 비밀번호가 올바르지 않습니다." });
      }
      return getJudgeScoreData();
    }

    // 당일 운영 화면: 종목별 참가자 상세 조회
    if (e.parameter.action === "getEventEntries") {
      if (e.parameter.password !== ADMIN_PASSWORD) {
        return buildResponse({ success: false, message: "비밀번호가 올바르지 않습니다." });
      }

      return getEventEntryData();
    }

    // 관리자 데이터 조회
    if (e.parameter.action === "getData") {
      if (e.parameter.password !== ADMIN_PASSWORD) {
        return buildResponse({ success: false, message: "비밀번호가 올바르지 않습니다." });
      }

      const sheet = getOrCreateSheet();
      const rows  = sheet.getDataRange().getValues();

      if (rows.length <= 1) {
        return buildResponse({ success: true, data: [], total: 0 });
      }

      const records = rows.slice(1).map(row => ({
        timestamp:   row[0],
        grade:       row[1],
        class:       row[2],
        event:       row[3],
        participants: row[4],
        skipped:     row[5] === "Y",
        writerName:  row[6] || "",
        teacherName: row[7] || ""
      }));

      return buildResponse({ success: true, data: records, total: records.length });
    }

    // 헬스체크
    return buildResponse({ success: true, message: "사제동행 체육 한마당 참가신청 API 정상 동작 중" });

  } catch (err) {
    return buildResponse({ success: false, message: "서버 오류: " + err.message });
  }
}

// ── 당일 운영 화면용 공개 조회 ───────────────────────────────
function getDayData() {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  const records = rows.length <= 1
    ? []
    : rows.slice(1).map(row => ({
      timestamp:   row[0],
      grade:       row[1],
      class:       row[2],
      event:       row[3],
      participants: row[4],
      skipped:     row[5] === "Y",
      writerName:  row[6] || "",
      teacherName: row[7] || ""
    }));

  const eventSearchSheet = getOrCreateEventSearchSheet();
  const eventRows = eventSearchSheet.getDataRange().getValues();
  const entries = eventRows.length <= 1
    ? []
    : eventRows.slice(1)
      .map(row => ({
        timestamp:   row[0],
        grade:       row[1],
        class:       row[2],
        event:       row[3],
        role:        row[4] || "",
        studentName: row[5] || "",
        gender:      row[6] || "",
        writerName:  row[7] || "",
        teacherName: row[8] || ""
      }))
      .filter(row => row.event && row.studentName);

  return buildResponse({
    success: true,
    records: records,
    entries: entries,
    totalRecords: records.length,
    totalEntries: entries.length
  });
}

// ── 심판 점수 저장 ─────────────────────────────────────────
function saveJudgeScore(data) {
  if (data.password !== JUDGE_PASSWORD) {
    return buildResponse({ success: false, message: "심판 비밀번호가 올바르지 않습니다." });
  }

  if (!data.event || !data.grade || !data.class) {
    return buildResponse({ success: false, message: "종목, 학년, 반을 모두 입력해주세요." });
  }

  const score = Number(data.score);
  if (isNaN(score)) {
    return buildResponse({ success: false, message: "점수 값이 올바르지 않습니다." });
  }

  const sheet = getOrCreateScoreSheet();
  const timestamp = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  appendRows(sheet, [[
    timestamp,
    data.event,
    data.grade,
    data.class,
    data.recordType || "",
    data.rank || "",
    data.recordValue || "",
    data.recordLabel || "",
    data.bonus === true ? "Y" : "N",
    score,
    data.judgeName || "",
    data.memo || ""
  ]]);

  return buildResponse({ success: true, message: "점수가 저장되었습니다.", score: score });
}

// ── 심판 점수 조회 ─────────────────────────────────────────
function getJudgeScoreData() {
  const sheet = getOrCreateScoreSheet();
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return buildResponse({ success: true, data: [], total: 0 });
  }

  const records = rows.slice(1).map(row => ({
    timestamp:   row[0],
    event:       row[1],
    grade:       row[2],
    class:       row[3],
    recordType:  row[4] || "",
    rank:        row[5] || "",
    recordValue: row[6] || "",
    recordLabel: row[7] || "",
    bonus:       row[8] === "Y",
    score:       row[9],
    judgeName:   row[10] || "",
    memo:        row[11] || ""
  }));

  return buildResponse({ success: true, data: records, total: records.length });
}

// ── 명렬 조회 ─────────────────────────────────────────────
function getRosterData(grade, className) {
  if (!grade || !className) {
    return buildResponse({ success: false, message: "학년과 반을 입력해주세요." });
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ROSTER_SHEET_NAME);

  if (!sheet) {
    return buildResponse({ success: true, students: [] });
  }

  // 폼은 "1학년"/"1반" 형식으로 보내므로 숫자만 추출해서 비교
  const gradeNum = String(grade).replace(/학년$/, "").trim();
  const classNum = String(className).replace(/반$/, "").trim();

  const rows     = sheet.getDataRange().getValues();
  const students = [];

  for (let i = 1; i < rows.length; i++) {
    const rowGrade = String(rows[i][0]).trim();
    const rowClass = String(rows[i][1]).trim();
    if (rowGrade === gradeNum && rowClass === classNum) {
      // 성별 정규화: 남자→남, 여자→여
      const rawGender = String(rows[i][4] || "").trim();
      const gender = rawGender === "남자" ? "남"
                   : rawGender === "여자" ? "여"
                   : rawGender;
      students.push({
        num:    rows[i][2] || i,
        name:   String(rows[i][3]).trim(),
        gender: gender
      });
    }
  }

  students.sort((a, b) => Number(a.num) - Number(b.num));

  return buildResponse({ success: true, students: students });
}

// ── 당일 운영 화면용 참가자 상세 조회 ─────────────────────────
function getEventEntryData() {
  const sheet = getOrCreateEventSearchSheet();
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return buildResponse({ success: true, data: [], total: 0 });
  }

  const records = rows.slice(1)
    .map(row => ({
      timestamp:   row[0],
      grade:       row[1],
      class:       row[2],
      event:       row[3],
      role:        row[4] || "",
      studentName: row[5] || "",
      gender:      row[6] || "",
      writerName:  row[7] || "",
      teacherName: row[8] || ""
    }))
    .filter(row => row.event && row.studentName);

  return buildResponse({ success: true, data: records, total: records.length });
}

// ── 제출 데이터 정리 ─────────────────────────────────────
function normalizeEventEntry(eventEntry) {
  const participants = Array.isArray(eventEntry.participants)
    ? eventEntry.participants
        .map(item => String(item || "").trim())
        .filter(item => item !== "")
    : [];

  const participantRows = Array.isArray(eventEntry.participantRows)
    ? eventEntry.participantRows
        .map(normalizeParticipantRow)
        .filter(row => row !== null)
    : buildSearchRowsFromParticipants(participants);

  return {
    name: String(eventEntry.name || "").trim(),
    participantText: participants.join(", "),
    participantRows: participantRows,
    skipped: eventEntry.skipped === true || (participants.length === 0 && participantRows.length === 0)
  };
}

function normalizeParticipantRow(row) {
  const studentName = String(row.studentName || row.name || "").trim();
  if (!studentName) return null;
  return {
    role: String(row.role || "").trim(),
    studentName: studentName,
    gender: String(row.gender || "").trim()
  };
}

function buildSearchRowsFromParticipants(participants) {
  const rows = [];
  participants.forEach(item => {
    const text = String(item || "").trim();
    if (!text) return;

    const colonIndex = text.indexOf(":");
    if (colonIndex >= 0) {
      const role = text.slice(0, colonIndex).trim();
      const names = text.slice(colonIndex + 1).split(",");
      names.forEach(nameText => {
        const parsed = parseGenderName(nameText);
        if (parsed.studentName) {
          rows.push({
            role: role,
            studentName: parsed.studentName,
            gender: parsed.gender
          });
        }
      });
    } else {
      const parsed = parseGenderName(text);
      rows.push({
        role: "",
        studentName: parsed.studentName,
        gender: parsed.gender
      });
    }
  });
  return rows;
}

function parseGenderName(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(남|여)\s+(.+)$/);
  if (match) {
    return { gender: match[1], studentName: match[2].trim() };
  }
  return { gender: "", studentName: text };
}

function hasExistingSubmission(eventSheet, classSummarySheet, grade, className) {
  if (hasClassRow(classSummarySheet, grade, className)) return true;
  return hasClassRow(eventSheet, grade, className);
}

function hasClassRow(sheet, grade, className) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === grade && rows[i][2] === className) {
      return true;
    }
  }
  return false;
}

function appendRows(sheet, rows) {
  if (!rows || rows.length === 0) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ── 신청목록 시트 초기화 ─────────────────────────────────
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ["등록일시", "학년", "반", "종목", "참가학생", "건너뜀", "작성자", "담임교사"];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#2A6AE8")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 70);
    sheet.setColumnWidth(3, 50);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 300);
    sheet.setColumnWidth(6, 70);
    sheet.setColumnWidth(7, 90);
    sheet.setColumnWidth(8, 90);
  }

  return sheet;
}

// ── 학급별제출 시트 초기화 ────────────────────────────────
function getOrCreateClassSummarySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CLASS_SUMMARY_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CLASS_SUMMARY_SHEET_NAME);
    const headers = ["등록일시", "학년", "반", "작성자", "담임교사", "신청내용"];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#2A6AE8")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 70);
    sheet.setColumnWidth(3, 60);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(6, 700);
  }

  return sheet;
}

// ── 종목별검색 시트 초기화 ────────────────────────────────
function getOrCreateEventSearchSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(EVENT_SEARCH_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(EVENT_SEARCH_SHEET_NAME);
    const headers = ["등록일시", "학년", "반", "종목", "역할/조", "학생명", "성별", "작성자", "담임교사"];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#2A6AE8")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 70);
    sheet.setColumnWidth(3, 60);
    sheet.setColumnWidth(4, 170);
    sheet.setColumnWidth(5, 110);
    sheet.setColumnWidth(6, 110);
    sheet.setColumnWidth(7, 60);
    sheet.setColumnWidth(8, 90);
    sheet.setColumnWidth(9, 90);
  }

  return sheet;
}

// ── 점수기록 시트 초기화 ───────────────────────────────────
function getOrCreateScoreSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SCORE_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SCORE_SHEET_NAME);
    const headers = [
      "입력일시",
      "종목",
      "학년",
      "반",
      "기록방식",
      "순위",
      "기록값",
      "기록표시",
      "기록최우수",
      "점수",
      "심판",
      "메모"
    ];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#2A6AE8")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 70);
    sheet.setColumnWidth(4, 60);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 70);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 160);
    sheet.setColumnWidth(9, 90);
    sheet.setColumnWidth(10, 70);
    sheet.setColumnWidth(11, 90);
    sheet.setColumnWidth(12, 240);
  }

  return sheet;
}

// ── JSON 응답 빌더 ────────────────────────────────────────
function buildResponse(payload) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
