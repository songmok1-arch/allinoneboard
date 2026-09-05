// PM 올인원 보드 — Supabase 연동 공통 로직
// 프로젝트보드(실행 현황) + 루틴보드(정기 루틴) 8개 기능을 프로젝트 하나 아래 통합했습니다.
// index.html, board.html에서 함께 사용합니다.

const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

function genShareCode(len = 6) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // 헷갈리는 글자(0,o,1,l) 제외
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

async function createProject(title, accessPin) {
  const share_code = genShareCode();
  const payload = { title, share_code };
  if (accessPin) payload.access_pin = accessPin;
  const { data, error } = await supabaseClient
    .from("aob_projects")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function loadProjectByCode(code) {
  const { data, error } = await supabaseClient
    .from("aob_projects")
    .select("*")
    .eq("share_code", code)
    .single();
  if (error) throw error;
  return data;
}

// 화면 잠금(PIN)을 나중에 설정/변경/해제할 때 씁니다. pin이 빈 문자열/null이면 잠금을 해제합니다.
// 주의: RLS가 완전히 개방되어 있어 이 PIN은 화면 UI 단의 잠금일 뿐, 진짜 접근 통제는 아닙니다.
async function setProjectPin(projectId, pin) {
  const { error } = await supabaseClient
    .from("aob_projects")
    .update({ access_pin: pin || null })
    .eq("id", projectId);
  if (error) throw error;
}

// sessionStorage에 "이 브라우저 탭에서는 이미 PIN을 확인했다"를 기록/조회하는 헬퍼.
function pinSessionKey(shareCode) {
  return `aob_pin_ok_${shareCode}`;
}
function isPinUnlocked(shareCode) {
  try {
    return sessionStorage.getItem(pinSessionKey(shareCode)) === "1";
  } catch (e) {
    return false;
  }
}
function markPinUnlocked(shareCode) {
  try {
    sessionStorage.setItem(pinSessionKey(shareCode), "1");
  } catch (e) {
    /* 세션스토리지를 못 쓰는 환경이면 그냥 매번 다시 물어봅니다. */
  }
}

// board.html/report.html 공통: 프로젝트에 access_pin이 설정되어 있으면 잠금 화면을 띄우고,
// 맞는 PIN을 입력해야 통과시킵니다. 통과하면 true, 사용자가 취소하면 false를 반환합니다.
function guardProjectPin(project) {
  if (!project.access_pin) return true;
  if (isPinUnlocked(project.share_code)) return true;
  while (true) {
    const input = window.prompt("이 프로젝트는 접근 암호로 보호되어 있습니다. 암호를 입력하세요.");
    if (input === null) return false; // 사용자가 취소
    if (input === project.access_pin) {
      markPinUnlocked(project.share_code);
      return true;
    }
    window.alert("암호가 올바르지 않습니다. 다시 시도해주세요.");
  }
}

/* ==================== 실행 현황 (구 프로젝트보드) ==================== */

/* ---------------- 마일스톤 ---------------- */

async function loadMilestones(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addMilestone(projectId, { title, due_date, memo }) {
  const { data, error } = await supabaseClient
    .from("aob_milestones")
    .insert({ project_id: projectId, title, due_date: due_date || null, memo: memo || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateMilestoneStatus(id, status) {
  const { error } = await supabaseClient.from("aob_milestones").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteMilestone(id) {
  const { error } = await supabaseClient.from("aob_milestones").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- 이슈/리스크 ---------------- */

async function loadIssues(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_issues")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function addIssue(projectId, { title, severity, owner, memo }) {
  const { data, error } = await supabaseClient
    .from("aob_issues")
    .insert({ project_id: projectId, title, severity: severity || "medium", owner: owner || null, memo: memo || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateIssueStatus(id, status) {
  const { error } = await supabaseClient.from("aob_issues").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteIssue(id) {
  const { error } = await supabaseClient.from("aob_issues").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- 피드백/승인 요청 ---------------- */

async function loadFeedbackItems(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_feedback_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function addFeedbackItem(projectId, { title, description }) {
  const { data, error } = await supabaseClient
    .from("aob_feedback_items")
    .insert({ project_id: projectId, title, description: description || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateFeedbackStatus(id, status) {
  const { error } = await supabaseClient.from("aob_feedback_items").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteFeedbackItem(id) {
  const { error } = await supabaseClient.from("aob_feedback_items").delete().eq("id", id);
  if (error) throw error;
}

async function loadFeedbackComments(feedbackItemIds) {
  if (!feedbackItemIds.length) return [];
  const { data, error } = await supabaseClient
    .from("aob_feedback_comments")
    .select("*")
    .in("feedback_item_id", feedbackItemIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addFeedbackComment(feedbackItemId, { author_name, comment }) {
  const { data, error } = await supabaseClient
    .from("aob_feedback_comments")
    .insert({ feedback_item_id: feedbackItemId, author_name, comment })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------------- 회의록 / 액션아이템 ---------------- */

async function loadMeetings(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_meetings")
    .select("*")
    .eq("project_id", projectId)
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function addMeeting(projectId, { title, meeting_date }) {
  const { data, error } = await supabaseClient
    .from("aob_meetings")
    .insert({ project_id: projectId, title, meeting_date: meeting_date || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteMeeting(id) {
  const { error } = await supabaseClient.from("aob_meetings").delete().eq("id", id);
  if (error) throw error;
}

async function loadActionItems(meetingIds) {
  if (!meetingIds.length) return [];
  const { data, error } = await supabaseClient
    .from("aob_action_items")
    .select("*")
    .in("meeting_id", meetingIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addActionItem(meetingId, { task, owner, due_date }) {
  const { data, error } = await supabaseClient
    .from("aob_action_items")
    .insert({ meeting_id: meetingId, task, owner: owner || null, due_date: due_date || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateActionItemStatus(id, status) {
  const { error } = await supabaseClient.from("aob_action_items").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteActionItem(id) {
  const { error } = await supabaseClient.from("aob_action_items").delete().eq("id", id);
  if (error) throw error;
}

function actionItemStatusLabel(status) {
  return { todo: "할 일", doing: "진행중", done: "완료" }[status] || status;
}
function nextActionItemStatus(status) {
  return { todo: "doing", doing: "done", done: "todo" }[status] || "todo";
}

/* ---------------- 라벨 / 상태 순환 (실행 현황) ---------------- */

function milestoneStatusLabel(status) {
  return { planned: "예정", doing: "진행중", done: "완료" }[status] || status;
}
function nextMilestoneStatus(status) {
  return { planned: "doing", doing: "done", done: "planned" }[status] || "planned";
}

function issueStatusLabel(status) {
  return { open: "미해결", doing: "진행중", resolved: "해결됨" }[status] || status;
}
function nextIssueStatus(status) {
  return { open: "doing", doing: "resolved", resolved: "open" }[status] || "open";
}

function severityLabel(sev) {
  return { low: "낮음", medium: "보통", high: "높음", critical: "긴급" }[sev] || sev;
}

function feedbackStatusLabel(status) {
  return { pending: "대기중", approved: "승인됨", rejected: "반려됨" }[status] || status;
}

/* ==================== 정기 루틴 (구 루틴보드) ==================== */
/* 모든 함수는 projectId를 받아 project_id로 조회/저장합니다. */

/* ---------------- 상태보고서 ---------------- */

async function loadReports(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function addReport(projectId, { report_date, health, progress_summary, risks_issues, next_week_plan }) {
  const { data, error } = await supabaseClient
    .from("aob_reports")
    .insert({
      project_id: projectId,
      report_date: report_date || new Date().toISOString().slice(0, 10),
      health: health || "good",
      progress_summary: progress_summary || null,
      risks_issues: risks_issues || null,
      next_week_plan: next_week_plan || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteReport(id) {
  const { error } = await supabaseClient.from("aob_reports").delete().eq("id", id);
  if (error) throw error;
}

function healthLabel(health) {
  return { good: "정상", warning: "주의", risk: "위험" }[health] || health;
}

/* ---------------- 워크로드 ---------------- */

async function loadTasks(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addTask(projectId, { title, owner_name, due_date, memo }) {
  const { data, error } = await supabaseClient
    .from("aob_tasks")
    .insert({
      project_id: projectId,
      title,
      owner_name,
      due_date: due_date || null,
      memo: memo || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateTaskStatus(id, status) {
  const { error } = await supabaseClient.from("aob_tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteTask(id) {
  const { error } = await supabaseClient.from("aob_tasks").delete().eq("id", id);
  if (error) throw error;
}

function taskStatusLabel(status) {
  return { todo: "할일", doing: "진행중", done: "완료" }[status] || status;
}
function nextTaskStatus(status) {
  return { todo: "doing", doing: "done", done: "todo" }[status] || "todo";
}

function groupByOwner(tasks) {
  const map = new Map();
  tasks.forEach((t) => {
    if (!map.has(t.owner_name)) {
      map.set(t.owner_name, { owner_name: t.owner_name, tasks: [], activeCount: 0 });
    }
    const group = map.get(t.owner_name);
    group.tasks.push(t);
    if (t.status !== "done") group.activeCount += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.activeCount - a.activeCount);
}

/* ---------------- 리스크매트릭스 ---------------- */

async function loadRisks(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_risks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  rows.sort((a, b) => riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact));
  return rows;
}

async function addRisk(projectId, { title, probability, impact, owner, mitigation_plan }) {
  const { data, error } = await supabaseClient
    .from("aob_risks")
    .insert({
      project_id: projectId,
      title,
      probability: probability || "medium",
      impact: impact || "medium",
      owner: owner || null,
      mitigation_plan: mitigation_plan || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateRiskStatus(id, status) {
  const { error } = await supabaseClient.from("aob_risks").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteRisk(id) {
  const { error } = await supabaseClient.from("aob_risks").delete().eq("id", id);
  if (error) throw error;
}

function riskStatusLabel(status) {
  return { open: "미대응", mitigating: "대응중", closed: "종결" }[status] || status;
}
function nextRiskStatus(status) {
  return { open: "mitigating", mitigating: "closed", closed: "open" }[status] || "open";
}
function probabilityLabel(p) {
  return { low: "낮음", medium: "보통", high: "높음" }[p] || p;
}
function impactLabel(i) {
  return { low: "낮음", medium: "보통", high: "높음" }[i] || i;
}

function riskScore(probability, impact) {
  const w = { low: 1, medium: 2, high: 3 };
  return (w[probability] || 1) * (w[impact] || 1);
}

function riskLevel(probability, impact) {
  const score = riskScore(probability, impact);
  if (score <= 2) return "낮음";
  if (score <= 4) return "보통";
  if (score <= 6) return "높음";
  return "매우높음";
}

function riskLevelClass(probability, impact) {
  const level = riskLevel(probability, impact);
  return { "낮음": "risklevel-low", "보통": "risklevel-medium", "높음": "risklevel-high", "매우높음": "risklevel-veryhigh" }[level];
}

/* ---------------- 회고 ---------------- */

async function loadRetroItems(projectId) {
  const { data, error } = await supabaseClient
    .from("aob_retro_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addRetroItem(projectId, { category, content, author_name }) {
  const { data, error } = await supabaseClient
    .from("aob_retro_items")
    .insert({
      project_id: projectId,
      category,
      content,
      author_name: author_name && author_name.trim() ? author_name.trim() : "익명",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteRetroItem(id) {
  const { error } = await supabaseClient.from("aob_retro_items").delete().eq("id", id);
  if (error) throw error;
}

function itemsByCategory(items, category) {
  return items.filter((i) => i.category === category);
}

function categoryLabel(category) {
  return { good: "잘한 점", improve: "아쉬운 점", action: "다음 액션" }[category] || category;
}

/* ==================== 내보내기 / 유틸 ==================== */

async function loadEverything(projectId) {
  const [meetings, milestones, issues, feedbackItems, reports, tasks, risks, retroItems] = await Promise.all([
    loadMeetings(projectId),
    loadMilestones(projectId),
    loadIssues(projectId),
    loadFeedbackItems(projectId),
    loadReports(projectId),
    loadTasks(projectId),
    loadRisks(projectId),
    loadRetroItems(projectId),
  ]);
  const [actionItems, feedbackComments] = await Promise.all([
    loadActionItems(meetings.map((m) => m.id)),
    loadFeedbackComments(feedbackItems.map((f) => f.id)),
  ]);
  return { meetings, milestones, issues, feedbackItems, feedbackComments, reports, tasks, risks, retroItems, actionItems };
}

function csvField(v) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function csvRow(fields) {
  return fields.map(csvField).join(",");
}

function buildCSVExport(project, data) {
  const { milestones, issues, feedbackItems, feedbackComments, meetings, actionItems, reports, tasks, risks, retroItems } = data;
  const lines = [];
  lines.push(csvRow(["프로젝트", project.title]));
  lines.push(csvRow(["내보낸 시각", new Date().toLocaleString("ko-KR")]));
  lines.push("");

  lines.push("[회의록]");
  lines.push(csvRow(["제목", "날짜"]));
  meetings.forEach((m) => lines.push(csvRow([m.title, m.meeting_date || ""])));
  lines.push("");

  lines.push("[액션아이템]");
  lines.push(csvRow(["회의", "할일", "담당자", "마감일", "상태"]));
  actionItems.forEach((a) => {
    const meeting = meetings.find((m) => m.id === a.meeting_id);
    lines.push(csvRow([meeting ? meeting.title : "", a.task, a.owner || "", a.due_date || "", actionItemStatusLabel(a.status)]));
  });
  lines.push("");

  lines.push("[마일스톤]");
  lines.push(csvRow(["제목", "마감일", "상태", "메모"]));
  milestones.forEach((m) => lines.push(csvRow([m.title, m.due_date || "", milestoneStatusLabel(m.status), m.memo || ""])));
  lines.push("");

  lines.push("[이슈-리스크]");
  lines.push(csvRow(["제목", "심각도", "담당자", "상태", "메모"]));
  issues.forEach((it) => lines.push(csvRow([it.title, severityLabel(it.severity), it.owner || "", issueStatusLabel(it.status), it.memo || ""])));
  lines.push("");

  lines.push("[피드백-승인요청]");
  lines.push(csvRow(["제목", "설명", "상태"]));
  feedbackItems.forEach((f) => lines.push(csvRow([f.title, f.description || "", feedbackStatusLabel(f.status)])));
  lines.push("");

  lines.push("[피드백 댓글]");
  lines.push(csvRow(["요청 제목", "작성자", "댓글"]));
  feedbackComments.forEach((c) => {
    const item = feedbackItems.find((f) => f.id === c.feedback_item_id);
    lines.push(csvRow([item ? item.title : "", c.author_name, c.comment]));
  });
  lines.push("");

  lines.push("[상태보고서]");
  lines.push(csvRow(["날짜", "신호등", "이번 주 진행 요약", "이슈-리스크", "다음 주 계획"]));
  reports.forEach((r) => lines.push(csvRow([r.report_date, healthLabel(r.health), r.progress_summary || "", r.risks_issues || "", r.next_week_plan || ""])));
  lines.push("");

  lines.push("[워크로드]");
  lines.push(csvRow(["담당자", "업무", "상태", "마감일", "메모"]));
  tasks.forEach((t) => lines.push(csvRow([t.owner_name, t.title, taskStatusLabel(t.status), t.due_date || "", t.memo || ""])));
  lines.push("");

  lines.push("[리스크매트릭스]");
  lines.push(csvRow(["제목", "확률", "영향", "종합 위험도", "담당자", "상태", "대응 계획"]));
  risks.forEach((r) => lines.push(csvRow([r.title, probabilityLabel(r.probability), impactLabel(r.impact), riskLevel(r.probability, r.impact), r.owner || "", riskStatusLabel(r.status), r.mitigation_plan || ""])));
  lines.push("");

  lines.push("[회고]");
  lines.push(csvRow(["구분", "작성자", "내용"]));
  retroItems.forEach((i) => lines.push(csvRow([categoryLabel(i.category), i.author_name, i.content])));

  return lines.join("\n");
}

function buildJSONExport(project, data) {
  return JSON.stringify({
    project: { title: project.title, share_code: project.share_code, exported_at: new Date().toISOString() },
    ...data,
  }, null, 2);
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFileName(title) {
  return (title || "프로젝트").replace(/[\\/:*?"<>|]/g, "_").trim() || "프로젝트";
}

function exportMarkdown(project, data) {
  const { milestones, issues, feedbackItems, meetings, actionItems, reports, tasks, risks, retroItems } = data;
  const lines = [`# ${project.title} — PM 올인원 보드 현황`, ""];

  lines.push("## 실행 현황");
  lines.push("");

  lines.push("### 회의록 / 액션아이템");
  if (!meetings || meetings.length === 0) lines.push("- (없음)");
  (meetings || []).forEach((mt) => {
    const date = mt.meeting_date ? ` (${mt.meeting_date})` : "";
    lines.push(`#### ${mt.title}${date}`);
    const items = (actionItems || []).filter((a) => a.meeting_id === mt.id);
    if (items.length === 0) lines.push("- (액션아이템 없음)");
    items.forEach((a) => {
      const box = a.status === "done" ? "[x]" : "[ ]";
      const owner = a.owner ? ` (${a.owner})` : "";
      const due = a.due_date ? ` — ${a.due_date}까지` : "";
      lines.push(`- ${box} ${a.task}${owner}${due}`);
    });
  });
  lines.push("");

  lines.push("### 마일스톤");
  if (milestones.length === 0) lines.push("- (없음)");
  milestones.forEach((m) => {
    const box = m.status === "done" ? "[x]" : "[ ]";
    const due = m.due_date ? ` — ${m.due_date}까지` : "";
    lines.push(`- ${box} ${m.title}${due} (${milestoneStatusLabel(m.status)})`);
  });
  lines.push("", "### 이슈/리스크");
  if (issues.length === 0) lines.push("- (없음)");
  issues.forEach((it) => {
    const owner = it.owner ? ` — 담당: ${it.owner}` : "";
    lines.push(`- [${severityLabel(it.severity)}] ${it.title}${owner} (${issueStatusLabel(it.status)})`);
  });
  lines.push("", "### 피드백/승인 요청");
  if (feedbackItems.length === 0) lines.push("- (없음)");
  feedbackItems.forEach((f) => {
    lines.push(`- ${f.title} (${feedbackStatusLabel(f.status)})`);
  });

  lines.push("", "## 정기 루틴", "");

  lines.push("### 상태보고서");
  if (reports.length === 0) lines.push("- (없음)");
  reports.forEach((r) => {
    lines.push(`#### ${r.report_date} (${healthLabel(r.health)})`);
    lines.push("");
    lines.push("**이번 주 진행 요약**");
    lines.push(r.progress_summary ? r.progress_summary : "-");
    lines.push("");
    lines.push("**이슈·리스크**");
    lines.push(r.risks_issues ? r.risks_issues : "-");
    lines.push("");
    lines.push("**다음 주 계획**");
    lines.push(r.next_week_plan ? r.next_week_plan : "-");
    lines.push("");
  });

  lines.push("### 워크로드");
  const groups = groupByOwner(tasks);
  if (groups.length === 0) lines.push("- (없음)");
  groups.forEach((g) => {
    lines.push(`#### ${g.owner_name} (진행중 ${g.activeCount}건)`);
    g.tasks.forEach((t) => {
      const checked = t.status === "done" ? "x" : " ";
      const due = t.due_date ? ` (마감: ${t.due_date})` : "";
      const memo = t.memo ? ` — ${t.memo}` : "";
      lines.push(`- [${checked}] ${t.title} [${taskStatusLabel(t.status)}]${due}${memo}`);
    });
    lines.push("");
  });

  lines.push("### 리스크매트릭스");
  const sortedRisks = [...risks].sort((a, b) => riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact));
  if (sortedRisks.length === 0) lines.push("- (없음)");
  sortedRisks.forEach((r) => {
    const owner = r.owner ? ` — 담당: ${r.owner}` : "";
    const plan = r.mitigation_plan ? ` / 대응 계획: ${r.mitigation_plan}` : "";
    lines.push(`- [${riskLevel(r.probability, r.impact)}] ${r.title} (확률: ${probabilityLabel(r.probability)} · 영향: ${impactLabel(r.impact)})${owner} (${riskStatusLabel(r.status)})${plan}`);
  });
  lines.push("");

  lines.push("### 회고");
  const sections = [
    { category: "good", heading: "#### 👍 잘한 점" },
    { category: "improve", heading: "#### 🤔 아쉬운 점" },
    { category: "action", heading: "#### ➡ 다음 액션" },
  ];
  sections.forEach(({ category, heading }) => {
    lines.push(heading);
    const list = itemsByCategory(retroItems, category);
    if (list.length === 0) {
      lines.push("- (없음)");
    } else {
      list.forEach((i) => {
        lines.push(`- (${i.author_name}) ${i.content}`);
      });
    }
    lines.push("");
  });

  return lines.join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      document.body.removeChild(ta);
      return false;
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 최근 만든 프로젝트 (이 브라우저에서만 기억됨 — 로그인/서버 없이 localStorage만 사용)
// PM 올인원 보드는 프로젝트 하나에 8개 기능(실행 현황 4개 + 정기 루틴 4개)이 모두 들어있으므로,
// "프로젝트" 단위로 최근 목록을 기억합니다.
const RECENT_PROJECTS_KEY = "ao_recent_projects";
const RECENT_PROJECTS_MAX = 10;

function getRecentProjects() {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveRecentProject(title, share_code) {
  try {
    let list = getRecentProjects().filter((p) => p.share_code !== share_code);
    list.unshift({ title, share_code, created_at: Date.now() });
    list = list.slice(0, RECENT_PROJECTS_MAX);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage를 못 쓰는 환경(시크릿 모드 등)이면 조용히 무시
  }
}

function removeRecentProject(share_code) {
  try {
    const list = getRecentProjects().filter((p) => p.share_code !== share_code);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage를 못 쓰는 환경이면 조용히 무시
  }
}

function clearRecentProjects() {
  try {
    localStorage.removeItem(RECENT_PROJECTS_KEY);
  } catch (e) {
    // localStorage를 못 쓰는 환경이면 조용히 무시
  }
}

function handleRemoveRecentProject(share_code, containerId, cardId) {
  removeRecentProject(share_code);
  renderRecentProjects(containerId, cardId);
}

function handleClearRecentProjects(containerId, cardId) {
  clearRecentProjects();
  renderRecentProjects(containerId, cardId);
}

function renderRecentProjects(containerId, cardId) {
  const list = getRecentProjects();
  const card = document.getElementById(cardId);
  const container = document.getElementById(containerId);
  if (!card || !container) return;
  if (list.length === 0) {
    card.style.display = "none";
    container.innerHTML = "";
    return;
  }
  const rows = list
    .map((p) => {
      const d = new Date(p.created_at);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const code = encodeURIComponent(p.share_code);
      return `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--line);">
        <a href="board.html?p=${code}" style="font-size:0.92rem;">${escapeHtml(p.title)}</a>
        <span style="display:flex; align-items:center; gap:8px;">
          <span class="item-meta">${dateStr}</span>
          <button type="button" class="btn danger-text" style="padding:2px 6px;" onclick="handleRemoveRecentProject('${p.share_code}', '${containerId}', '${cardId}')">목록에서 지우기</button>
        </span>
      </div>`;
    })
    .join("");
  const clearRow = `<div style="text-align:right; padding-top:8px;">
    <button type="button" class="btn ghost" onclick="handleClearRecentProjects('${containerId}', '${cardId}')">목록 모두 지우기</button>
  </div>`;
  container.innerHTML = rows + clearRow;
  card.style.display = "block";
}
