-- PM 올인원 보드 — 제거(언인스톨) 스크립트
-- 이 모듈의 테이블만 삭제합니다. 접두사가 다른 모듈과 고유하므로
-- 같은 Supabase 프로젝트에 다른 모듈을 함께 설치했더라도 그 데이터에는 영향이 없습니다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

drop table if exists aob_retro_items cascade;
drop table if exists aob_risks cascade;
drop table if exists aob_tasks cascade;
drop table if exists aob_reports cascade;
drop table if exists aob_action_items cascade;
drop table if exists aob_meetings cascade;
drop table if exists aob_feedback_comments cascade;
drop table if exists aob_feedback_items cascade;
drop table if exists aob_issues cascade;
drop table if exists aob_milestones cascade;
drop table if exists aob_projects cascade;
