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
// ============================================================

const SHEET_NAME = "신청목록";
const ADMIN_PASSWORD = "admin1234"; // ← 반드시 변경하세요

// ── POST 핸들러: 참가신청 저장 ────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 필수값 검증
    if (!data.grade || !data.class) {
      return buildResponse({ success: false, message: "학년과 반을 입력해주세요." });
    }
    if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
      return buildResponse({ success: false, message: "종목 데이터가 없습니다." });
    }

    const sheet = getOrCreateSheet();
    const timestamp = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    // 중복 제출 확인 (같은 학년+반)
    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][1] === data.grade && existing[i][2] === data.class) {
        return buildResponse({
          success: false,
          message: `${data.grade} ${data.class}은(는) 이미 신청이 완료되었습니다. 수정이 필요하면 담당 선생님께 문의하세요.`
        });
      }
    }

    // 종목별로 각각 행 추가
    data.events.forEach(eventEntry => {
      const participants = Array.isArray(eventEntry.participants)
        ? eventEntry.participants.filter(p => p && p.trim() !== "").join(", ")
        : "";
      const isSkipped = eventEntry.skipped === true;

      sheet.appendRow([
        timestamp,
        data.grade,
        data.class,
        eventEntry.name,
        isSkipped ? "참가 없음" : participants,
        isSkipped ? "Y" : "N"
      ]);
    });

    return buildResponse({ success: true, message: "신청이 완료되었습니다!" });

  } catch (err) {
    return buildResponse({ success: false, message: "서버 오류: " + err.message });
  }
}

// ── GET 핸들러: 관리자 데이터 조회 ───────────────────────
function doGet(e) {
  try {
    if (e.parameter.action === "getData") {
      if (e.parameter.password !== ADMIN_PASSWORD) {
        return buildResponse({ success: false, message: "비밀번호가 올바르지 않습니다." });
      }

      const sheet = getOrCreateSheet();
      const rows = sheet.getDataRange().getValues();

      if (rows.length <= 1) {
        return buildResponse({ success: true, data: [], total: 0 });
      }

      // rows[0]은 헤더
      const records = rows.slice(1).map(row => ({
        timestamp:    row[0],
        grade:        row[1],
        class:        row[2],
        event:        row[3],
        participants: row[4],
        skipped:      row[5] === "Y"
      }));

      return buildResponse({ success: true, data: records, total: records.length });
    }

    // 헬스체크
    return buildResponse({ success: true, message: "체육대회 참가신청 API 정상 동작 중" });

  } catch (err) {
    return buildResponse({ success: false, message: "서버 오류: " + err.message });
  }
}

// ── 시트 초기화 ───────────────────────────────────────────
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ["등록일시", "학년", "반", "종목", "참가학생", "건너뜀"];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    // 헤더 스타일
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#2A6AE8")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    // 컬럼 너비 설정
    sheet.setColumnWidth(1, 160); // 등록일시
    sheet.setColumnWidth(2, 70);  // 학년
    sheet.setColumnWidth(3, 50);  // 반
    sheet.setColumnWidth(4, 120); // 종목
    sheet.setColumnWidth(5, 300); // 참가학생
    sheet.setColumnWidth(6, 70);  // 건너뜀
  }

  return sheet;
}

// ── JSON 응답 빌더 ────────────────────────────────────────
function buildResponse(payload) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
