// ============================================================
// config.js — 체육대회 참가신청 시스템 설정 파일
// 이 파일의 값을 수정하여 모든 설정을 변경하세요.
// ============================================================

const CONFIG = {
  // ── 학교 / 행사 정보 ──────────────────────────────────────
  schoolName: "대진고등학교",
  eventTitle: "2026 체육대회",
  eventDate: "2026년 5월 15일",
  eventLocation: "학교 운동장",

  // ── Google Apps Script 배포 URL ───────────────────────────
  // Apps Script 배포 후 발급되는 URL을 붙여넣으세요
  scriptUrl: "https://script.google.com/macros/s/AKfycbyKrGG_w-yuWzEwIVb9II-pd6ocZ9JFnW1EQ9mwheNf-R-6q-9ROisA07ND32ngM-b5/exec",

  // ── 관리자 비밀번호 ───────────────────────────────────────
  // Apps Script의 ADMIN_PASSWORD와 반드시 동일하게 설정하세요
  adminPassword: "admin1234",

  // ── 학년 / 반 목록 ────────────────────────────────────────
  grades: ["1학년", "2학년", "3학년"],
  classes: Array.from({ length: 10 }, (_, i) => `${i + 1}반`),

  // ── 안내 문구 (HTML 가능) ─────────────────────────────────
  introText: `
    <p>안녕하세요. 체육대회 참가 신청을 안내드립니다.</p>
    <p>각 학급의 반장 또는 담당자가 학급 전체의 종목별 참가 학생을 입력해 주세요.</p>
    <p>종목별로 한 페이지씩 이동하며 참가 학생 이름을 입력하시면 됩니다.</p>
    <p>작성 중 임시저장 버튼을 누르면 나중에 이어서 작성할 수 있습니다.</p>
  `,

  // ── 종목 목록 ─────────────────────────────────────────────
  // name: 종목명
  // maxParticipants: 최대 참가 인원 (0 = 무제한)
  // description: 종목 설명 (선택)
  events: [
    { name: "100m 달리기", maxParticipants: 2, description: "남녀 각 1명" },
    { name: "200m 달리기", maxParticipants: 2, description: "남녀 각 1명" },
    { name: "400m 계주", maxParticipants: 4, description: "4명 1팀" },
    { name: "멀리뛰기", maxParticipants: 2, description: "남녀 각 1명" },
    { name: "높이뛰기", maxParticipants: 2, description: "남녀 각 1명" },
    { name: "축구", maxParticipants: 11, description: "최대 11명" },
    { name: "농구", maxParticipants: 5, description: "5명 1팀" },
    { name: "배구", maxParticipants: 6, description: "6명 1팀" },
    { name: "줄다리기", maxParticipants: 10, description: "10명 1팀" },
    { name: "줄넘기", maxParticipants: 3, description: "3명 1팀" },
    { name: "피구", maxParticipants: 10, description: "최대 10명" },
    { name: "이어달리기", maxParticipants: 4, description: "4명 1팀" },
  ],
};
