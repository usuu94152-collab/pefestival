// ============================================================
// config.js — 체육대회 참가신청 시스템 설정 파일
// 이 파일의 값을 수정하여 모든 설정을 변경하세요.
// ============================================================

const CONFIG = {
  // ── 학교 / 행사 정보 ──────────────────────────────────────
  schoolName: "대진고등학교",
  eventTitle: "사제동행 체육 한마당",
  eventBadge: "2026 ‘스포츠로 가르치는 인성교육’",
  eventDate: "2026년 5월 15일(금) 08:30~12:30",
  eventLocation: "학교 운동장",

  // ── Google Apps Script 배포 URL ───────────────────────────
  // Apps Script 배포 후 발급되는 URL을 붙여넣으세요
  scriptUrl: "https://script.google.com/macros/s/AKfycbyKrGG_w-yuWzEwIVb9II-pd6ocZ9JFnW1EQ9mwheNf-R-6q-9ROisA07ND32ngM-b5/exec",

  // ── 학년 / 반 목록 ────────────────────────────────────────
  grades: ["1학년", "2학년"],
  classes: Array.from({ length: 8 }, (_, i) => `${i + 1}반`),

  // ── 안내 문구 (HTML 가능) ─────────────────────────────────
  introText: `
    <p>안녕하세요. 사제동행 체육 한마당 참가 신청을 안내드립니다.</p>
    <p>각 학급의 반장 또는 담당자가 학급 전체의 종목별 참가 학생을 입력해 주세요.</p>
    <p>종목별로 한 페이지씩 이동하며 참가 학생 이름을 입력하시면 됩니다.</p>
    <p>작성 중 임시저장 버튼을 누르면 나중에 이어서 작성할 수 있습니다.</p>
  `,

  // ── 종목 목록 ─────────────────────────────────────────────
  // name: 종목명
  // maxParticipants: 최대 참가 인원 (0 = 무제한)
  // description: 종목 구분
  // personnel: 참가 인원 안내 (선택)
  // allowedGrades: 참가 가능 학년 (선택)
  // groupByGrade: 학년별 조 편성 규칙 (선택)
  // genderLimits: 성별별 최대 참가 인원 (선택)
  // waveRelay: 파도타기 릴레이 역할 편성 규칙 (선택)
  // method: 경기 방법 (선택)
  events: [
    {
      name: "단거리 달리기",
      maxParticipants: 2,
      description: "개인",
      personnel: "남.여각1명",
      method: "◾ 남, 여 선수가 각각 단거리 직선 주로를 달려서 승부 겨루기.",
    },
    {
      name: "파도타기 릴레이",
      maxParticipants: 26,
      description: "단체 경기",
      personnel: "26명 (주자 10명: 남1/여1 x 5조 / 점프학생 16명)",
      allowedGrades: ["1학년"],
      waveRelay: {
        runnerGroupCount: 5,
        runnerGenders: ["남", "여"],
        jumpCount: 16,
      },
      method: [
        "◾ 선수들은 일정 간격을 유지하며 1열 종대로 서서 대기하다가 주자의 줄이 오면 제자리에서 가볍게 점프 동작을 취한다.",
        "◾ 주자들은 줄을 양쪽에서 잡고 달려가며 점프하는 선수들의 발 밑으로 줄을 이동해야 하며 반환점의 최종 선수를 통과하여 출발선까지 반복 동작으로 되돌아온다. (줄은 반드시 바닥에 닿아서 이동)",
        "◾ 출발부터 결승선 도착 때까지의 시간을 측정하여 기록이 빠른 순으로 순위 결정",
      ].join("\n"),
    },
    {
      name: "태풍의 눈",
      maxParticipants: 25,
      description: "단체 경기",
      personnel: "25명(5명 x 5조)",
      allowedGrades: ["2학년"],
      groupCount: 5,
      groupSize: 5,
      method: [
        "◾ 5인이 한 조가 되어 2.5m 길이의 봉을 잡고 협동하여 달리는 경기로 직선 중간에 놓여진 라바콘 2개를 반드시 회전 이동해야 하며 반환점 이후부터는 직선으로 달려 출발선으로 되돌아온다.",
        "◾ 릴레이 경기로 마지막 조가 결승선에 도착하는 순서대로 순위 결정",
      ].join("\n"),
    },
    {
      name: "줄다리기",
      maxParticipants: 26,
      description: "단체 경기",
      personnel: "26명(남 최대 16명)",
      genderLimits: { "남": 16 },
      method: "◾ 각 팀 양쪽으로 나누어 줄을 잡고 신호음과 동시에 줄을 당기며 제한 시간 30초 이내 승부 결정 (3전 2승)",
    },
    {
      name: "긴 줄넘기 (8자 마라톤)",
      maxParticipants: 10,
      description: "단체 경기",
      personnel: "10명 (남,여 구분 없음)",
      allowedGrades: ["1학년", "2학년"],
      method: [
        "◾ 긴 줄 8자 마라톤",
        "◾ 2명이 줄을 돌리고 한 명씩 차례로 대각선으로 줄 통과하기",
        "◾ 넘는 도중 줄에 걸리는 경우 횟수로 인정하지 않음. (2분)",
      ].join("\n"),
    },
    {
      name: "긴 줄넘기 (함께 뛰기)",
      maxParticipants: 10,
      description: "단체 경기",
      personnel: "10명 (남,여 구분 없음)",
      allowedGrades: ["1학년", "2학년"],
      method: [
        "◾ 2명이 줄을 돌리고 10명이 줄 안에서 동시에 함께 뛰기",
        "◾ 넘는 도중 줄에 걸리는 경우 횟수로 인정하지 않음. (90초)",
      ].join("\n"),
    },
    {
      name: "2인3각 / 4인5각",
      maxParticipants: 12,
      description: "단체 경기",
      personnel: "12명 (1학년: 2명 x 6조 / 2학년: 4명 x 3조)",
      allowedGrades: ["1학년", "2학년"],
      groupByGrade: {
        "1학년": { label: "2인3각", groupCount: 6, groupSize: 2 },
        "2학년": { label: "4인5각", groupCount: 3, groupSize: 4 },
      },
      method: [
        "◾ 두 명이 한 쪽 발을 묶어 직선 거리 25m 반환점 돌아오기",
        "◾ 남.여학생 반환점 간격은 1.5M 상이 조절",
        "◾ 1학년은 2인 3각, 2학년은 4인 5각으로 진행",
      ].join("\n"),
    },
    {
      name: "이어 달리기",
      maxParticipants: 6,
      description: "단체 경기",
      personnel: "6명(여3/남3)",
      allowedGrades: ["1학년", "2학년"],
      genderLimits: { "남": 3, "여": 3 },
      method: [
        "◾ 각반 대표 선수끼리 운동장 한 바퀴씩 이어달리기 경기",
        "◾ 여-남-여-남학생 순",
      ].join("\n"),
    },
    {
      name: "사제동행 가위바위보 릴레이",
      maxParticipants: 12,
      description: "화합 경기",
      personnel: "12명 (1,2학년 학급)",
      allowedGrades: ["1학년", "2학년"],
      method: [
        "◾ 주자는 출발선에서 25m 거리에 있는 선생님 앞으로 달려가 가위바위보 겨루기를 한다. 선생님을 이기면 다음 주자가 출발하며, 비기거나 졌을 경우 출발선으로 돌아와서 순서대로 재도전에 참여",
        "◾ 제한 시간(3분) 내 득점 인원 숫자만큼 점수 부여 (120점 만점)",
      ].join("\n"),
    },
  ],
};
