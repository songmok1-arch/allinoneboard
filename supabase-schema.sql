-- PM 올인원 보드 — Supabase 스키마
-- 프로젝트보드(마일스톤·이슈·승인·회의) + 루틴보드(상태보고·워크로드·리스크·회고) 8개 기능을
-- 프로젝트 하나(공유 링크 하나) 아래 통합한 스키마입니다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

create extension if not exists pgcrypto;

-- ===================== 최상위: 프로젝트 =====================

create table if not exists aob_projects (
  id uuid primary key default gen_random_uuid(),
  share_code text unique not null,
  title text not null,
  created_at timestamptz not null default now()
);

-- 이미 설치된 프로젝트에도 접근 암호(PIN) 컬럼을 추가합니다.
-- (기존 "create table if not exists"는 이미 만들어진 테이블에는 컬럼을 추가해주지 않으므로,
--  이 문장을 별도로 둡니다. 스키마 파일 전체를 다시 실행해도 안전합니다.)
alter table aob_projects add column if not exists access_pin text;

-- ===================== 실행 현황 (구 프로젝트보드) =====================

create table if not exists aob_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'planned' check (status in ('planned', 'doing', 'done')),
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists aob_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  title text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  owner text,
  status text not null default 'open' check (status in ('open', 'doing', 'resolved')),
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists aob_feedback_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists aob_feedback_comments (
  id uuid primary key default gen_random_uuid(),
  feedback_item_id uuid not null references aob_feedback_items(id) on delete cascade,
  author_name text not null,
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists aob_meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  title text not null,
  meeting_date date,
  created_at timestamptz not null default now()
);

create table if not exists aob_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references aob_meetings(id) on delete cascade,
  task text not null,
  owner text,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at timestamptz not null default now()
);

-- ===================== 정기 루틴 (구 루틴보드) =====================
-- 기존 루틴보드의 rb_reports/rb_tasks/rb_risks/rb_retro_items는 routine_id로
-- 별도 최상위(rb_routines)를 참조했으나, 이 통합판에서는 테이블 접두사를 aob_로 새로 부여하고
-- aob_projects를 공통 최상위로 써서 project_id로 참조합니다.
-- (기존 프로젝트보드의 pjb_*, 루틴보드의 rb_*와는 이름이 겹치지 않는 완전히 별개의 테이블이라,
--  같은 Supabase 프로젝트에 세 모듈을 함께 설치해도 데이터가 서로 섞이지 않습니다.)

create table if not exists aob_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  report_date date not null default current_date,
  health text not null default 'good' check (health in ('good', 'warning', 'risk')),
  progress_summary text,
  risks_issues text,
  next_week_plan text,
  created_at timestamptz not null default now()
);

create table if not exists aob_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  title text not null,
  owner_name text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_date date,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists aob_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  title text not null,
  probability text not null default 'medium' check (probability in ('low', 'medium', 'high')),
  impact text not null default 'medium' check (impact in ('low', 'medium', 'high')),
  owner text,
  mitigation_plan text,
  status text not null default 'open' check (status in ('open', 'mitigating', 'closed')),
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists aob_retro_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references aob_projects(id) on delete cascade,
  category text not null check (category in ('good', 'improve', 'action')),
  content text not null,
  author_name text not null default '익명',
  created_at timestamptz not null default now()
);

-- ===================== 인덱스 =====================

create index if not exists aob_milestones_project_id_idx on aob_milestones (project_id);
create index if not exists aob_issues_project_id_idx on aob_issues (project_id);
create index if not exists aob_feedback_items_project_id_idx on aob_feedback_items (project_id);
create index if not exists aob_feedback_comments_feedback_item_id_idx on aob_feedback_comments (feedback_item_id);
create index if not exists aob_meetings_project_id_idx on aob_meetings (project_id);
create index if not exists aob_action_items_meeting_id_idx on aob_action_items (meeting_id);
create index if not exists aob_reports_project_id_idx on aob_reports (project_id);
create index if not exists aob_tasks_project_id_idx on aob_tasks (project_id);
create index if not exists aob_risks_project_id_idx on aob_risks (project_id);
create index if not exists aob_retro_items_project_id_idx on aob_retro_items (project_id);

-- ===================== RLS =====================
-- MVP 정책: 링크(share_code)를 아는 사람은 누구나 읽고 쓸 수 있습니다.
-- 별도 로그인이 없는 대신, 링크 자체가 비밀번호 역할을 합니다.
-- 실제 회사 내부 정보를 다루게 되면 나중에 이메일 인증 등으로 강화하는 것을 권장합니다.
--
-- aob_projects.access_pin(선택 항목)은 board.html/report.html 화면에 들어가기 전
-- 화면 잠금을 하나 더 거는 용도입니다. 다만 RLS 자체는 여전히 완전히 개방되어 있어
-- Supabase API를 직접 호출하면 이 PIN도 우회할 수 있습니다 — "같은 회사 동료가 실수로
-- 다른 프로젝트 링크를 열어보는 것"을 막는 수준이지, 진짜 접근 통제는 아닙니다.
-- 더 강한 보호가 필요하면 Supabase Auth 기반 로그인 + RLS 정책으로 교체해야 합니다.

alter table aob_projects enable row level security;
alter table aob_milestones enable row level security;
alter table aob_issues enable row level security;
alter table aob_feedback_items enable row level security;
alter table aob_feedback_comments enable row level security;
alter table aob_meetings enable row level security;
alter table aob_action_items enable row level security;
alter table aob_reports enable row level security;
alter table aob_tasks enable row level security;
alter table aob_risks enable row level security;
alter table aob_retro_items enable row level security;

drop policy if exists "public read aob_projects" on aob_projects;
create policy "public read aob_projects" on aob_projects for select using (true);
drop policy if exists "public insert aob_projects" on aob_projects;
create policy "public insert aob_projects" on aob_projects for insert with check (true);

drop policy if exists "public read aob_milestones" on aob_milestones;
create policy "public read aob_milestones" on aob_milestones for select using (true);
drop policy if exists "public insert aob_milestones" on aob_milestones;
create policy "public insert aob_milestones" on aob_milestones for insert with check (true);
drop policy if exists "public update aob_milestones" on aob_milestones;
create policy "public update aob_milestones" on aob_milestones for update using (true);
drop policy if exists "public delete aob_milestones" on aob_milestones;
create policy "public delete aob_milestones" on aob_milestones for delete using (true);

drop policy if exists "public read aob_issues" on aob_issues;
create policy "public read aob_issues" on aob_issues for select using (true);
drop policy if exists "public insert aob_issues" on aob_issues;
create policy "public insert aob_issues" on aob_issues for insert with check (true);
drop policy if exists "public update aob_issues" on aob_issues;
create policy "public update aob_issues" on aob_issues for update using (true);
drop policy if exists "public delete aob_issues" on aob_issues;
create policy "public delete aob_issues" on aob_issues for delete using (true);

drop policy if exists "public read aob_feedback_items" on aob_feedback_items;
create policy "public read aob_feedback_items" on aob_feedback_items for select using (true);
drop policy if exists "public insert aob_feedback_items" on aob_feedback_items;
create policy "public insert aob_feedback_items" on aob_feedback_items for insert with check (true);
drop policy if exists "public update aob_feedback_items" on aob_feedback_items;
create policy "public update aob_feedback_items" on aob_feedback_items for update using (true);
drop policy if exists "public delete aob_feedback_items" on aob_feedback_items;
create policy "public delete aob_feedback_items" on aob_feedback_items for delete using (true);

drop policy if exists "public read aob_feedback_comments" on aob_feedback_comments;
create policy "public read aob_feedback_comments" on aob_feedback_comments for select using (true);
drop policy if exists "public insert aob_feedback_comments" on aob_feedback_comments;
create policy "public insert aob_feedback_comments" on aob_feedback_comments for insert with check (true);
drop policy if exists "public delete aob_feedback_comments" on aob_feedback_comments;
create policy "public delete aob_feedback_comments" on aob_feedback_comments for delete using (true);

drop policy if exists "public read aob_meetings" on aob_meetings;
create policy "public read aob_meetings" on aob_meetings for select using (true);
drop policy if exists "public insert aob_meetings" on aob_meetings;
create policy "public insert aob_meetings" on aob_meetings for insert with check (true);
drop policy if exists "public delete aob_meetings" on aob_meetings;
create policy "public delete aob_meetings" on aob_meetings for delete using (true);

drop policy if exists "public read aob_action_items" on aob_action_items;
create policy "public read aob_action_items" on aob_action_items for select using (true);
drop policy if exists "public insert aob_action_items" on aob_action_items;
create policy "public insert aob_action_items" on aob_action_items for insert with check (true);
drop policy if exists "public update aob_action_items" on aob_action_items;
create policy "public update aob_action_items" on aob_action_items for update using (true);
drop policy if exists "public delete aob_action_items" on aob_action_items;
create policy "public delete aob_action_items" on aob_action_items for delete using (true);

drop policy if exists "public read aob_reports" on aob_reports;
create policy "public read aob_reports" on aob_reports for select using (true);
drop policy if exists "public insert aob_reports" on aob_reports;
create policy "public insert aob_reports" on aob_reports for insert with check (true);
drop policy if exists "public update aob_reports" on aob_reports;
create policy "public update aob_reports" on aob_reports for update using (true);
drop policy if exists "public delete aob_reports" on aob_reports;
create policy "public delete aob_reports" on aob_reports for delete using (true);

drop policy if exists "public read aob_tasks" on aob_tasks;
create policy "public read aob_tasks" on aob_tasks for select using (true);
drop policy if exists "public insert aob_tasks" on aob_tasks;
create policy "public insert aob_tasks" on aob_tasks for insert with check (true);
drop policy if exists "public update aob_tasks" on aob_tasks;
create policy "public update aob_tasks" on aob_tasks for update using (true);
drop policy if exists "public delete aob_tasks" on aob_tasks;
create policy "public delete aob_tasks" on aob_tasks for delete using (true);

drop policy if exists "public read aob_risks" on aob_risks;
create policy "public read aob_risks" on aob_risks for select using (true);
drop policy if exists "public insert aob_risks" on aob_risks;
create policy "public insert aob_risks" on aob_risks for insert with check (true);
drop policy if exists "public update aob_risks" on aob_risks;
create policy "public update aob_risks" on aob_risks for update using (true);
drop policy if exists "public delete aob_risks" on aob_risks;
create policy "public delete aob_risks" on aob_risks for delete using (true);

drop policy if exists "public read aob_retro_items" on aob_retro_items;
create policy "public read aob_retro_items" on aob_retro_items for select using (true);
drop policy if exists "public insert aob_retro_items" on aob_retro_items;
create policy "public insert aob_retro_items" on aob_retro_items for insert with check (true);
drop policy if exists "public delete aob_retro_items" on aob_retro_items;
create policy "public delete aob_retro_items" on aob_retro_items for delete using (true);
