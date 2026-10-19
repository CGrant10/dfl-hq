-- Isolated database bootstrap only. Never run this fixture in production.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
end$$;
grant usage on schema public to anon,authenticated;
create table public.members(id bigint primary key,active boolean,sleeper_user_id text);
create table public.sleeper_leagues(id bigint primary key,season integer,sleeper_league_id text);
create table public.sleeper_rosters(id bigint primary key,season integer,roster_id integer,league_id text,sleeper_user_id text,players jsonb,synced_at timestamptz);
insert into public.members values(1,true,'u1'),(2,true,'u2'),(3,true,'u3'),(4,true,'u4'),(5,false,'u5');
insert into public.sleeper_leagues values(1,2026,'123456');
insert into public.sleeper_rosters values(1,2026,1,'123456','u1','["a","aa","ab","ac","ad"]',now()),(2,2026,2,'123456','u2','["b","bb","bc","bd","be"]',now()),(3,2026,3,'123456','u3','["c","cc"]',now()),(4,2026,4,'123456','u4','["d"]',now());
create function public.request_member_id() returns bigint language sql stable as $$select (nullif(current_setting('request.headers',true),'')::jsonb->>'x-member-id')::bigint$$;
-- Existing optional profile PIN contract: locked manager 2 must supply their PIN.
create function public.keeper_self_identity_ok(target_member bigint,attempted_pin text) returns boolean language sql stable as $$select target_member<>2 or attempted_pin='1234'$$;
\ir ../migrations/20261019173555_trade_negotiation_room.sql
\ir ../migrations/20261019173815_trade_room_active_inbox.sql
create function pg_temp.check(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',message;end if;end$$;
create function pg_temp.denied(statement text,expected text) returns void language plpgsql as $$begin execute statement;raise exception 'Unexpected success: %',statement;exception when others then if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;end$$;
set role anon;
select pg_temp.denied('select public.trade_room_list()', '42501');
set request.headers='{"x-member-id":"5"}';
select pg_temp.denied('select public.trade_room_list()', '42501');
set request.headers='{"x-member-id":"1"}';
select pg_temp.denied('select * from public.trade_rooms','42501');
select pg_temp.denied('select * from public.trade_room_events','42501');
select pg_temp.denied('select dfl_trade_private.actor(null)','42501');
select public.trade_room_command('save',p_season=>2026,p_proposal=>'{"teamIds":["1","2","3"],"sends":[["a"],["b"],["c"]],"destinations":{"a":"3","b":"1","c":"2"}}',p_request_id=>'11111111-1111-4111-8111-111111111111')->>'id' as room_id \gset
select pg_temp.check(jsonb_array_length(public.trade_room_list())=1,'Owner sees draft');
set request.headers='{"x-member-id":"2"}';
select pg_temp.denied('select public.trade_room_list()', '42501');
select pg_temp.denied('select public.trade_room_list(''0000'')', '42501');
select pg_temp.check(public.trade_room_list('1234')='[]'::jsonb,'Recipient cannot see unsent draft');
select pg_temp.denied(format('select public.trade_room_read(%s,''1234'')',:room_id),'42501');
set request.headers='{"x-member-id":"1"}';
select public.trade_room_command('send',:room_id,1,2026,'{"teamIds":["1","2","3"],"sends":[["a"],["b"],["c"]],"destinations":{"a":"3","b":"1","c":"2"}}');
select pg_temp.denied(format('select public.trade_room_command(''withdraw'',%s,1)',:room_id),'40001');
set request.headers='{"x-member-id":"4"}';
select pg_temp.check(public.trade_room_list()='[]'::jsonb,'Uninvolved manager has empty inbox');
select pg_temp.denied(format('select public.trade_room_read(%s)',:room_id),'42501');
select pg_temp.denied(format('select public.trade_room_command(''accept'',%s,2)',:room_id),'42501');
set request.headers='{"x-member-id":"2"}';
select pg_temp.check(jsonb_array_length(public.trade_room_list('1234'))=1,'Recipient sees sent offer');
select pg_temp.denied(format('select public.trade_room_command(''counter'',%s,2,2026,''{"teamIds":["3","1","2"],"sends":[["c"],["a"],["b"]],"destinations":{"a":"3","b":"1","c":"2"}}'',''1234'')',:room_id),'22023');
select pg_temp.denied(format('select public.trade_room_command(''counter'',%s,2,2026,''{"teamIds":["1","2","4"],"sends":[["a"],["b"],["d"]],"destinations":{"a":"4","b":"1","d":"2"}}'',''1234'')',:room_id),'22023');
select public.trade_room_command('accept',:room_id,2,p_pin=>'1234');
select pg_temp.check(public.trade_room_read(:room_id,'1234')->>'status'='pending','Three-way agreement waits for third manager');
select pg_temp.denied(format('select public.trade_room_command(''accept'',%s,3,p_pin=>''1234'')',:room_id),'40001');
select public.trade_room_command('counter',:room_id,3,2026,'{"teamIds":["1","2","3"],"sends":[["aa"],["b"],["c"]],"destinations":{"aa":"3","b":"1","c":"2"}}','1234');
select pg_temp.check(public.trade_room_read(:room_id,'1234')->'accepted_ids'='[2]'::jsonb,'Counter resets every previous agreement');
select pg_temp.denied(format('select public.trade_room_command(''withdraw'',%s,3,p_pin=>''1234'')',:room_id),'40001');
set request.headers='{"x-member-id":"1"}';
select public.trade_room_command('accept',:room_id,4);
set request.headers='{"x-member-id":"3"}';
select public.trade_room_command('accept',:room_id,5);
select pg_temp.check(public.trade_room_read(:room_id)->>'status'='agreed','All managers agree to the same revision');
select pg_temp.check(jsonb_array_length(public.trade_room_read(:room_id)->'events')=6,'History contains every successful action once');
select pg_temp.check(public.trade_room_read(:room_id)->'proposal'->'destinations'->>'aa'='3','Three-way route preserved');
select pg_temp.denied(format('select public.trade_room_command(''decline'',%s,6)',:room_id),'42501');
set request.headers='{"x-member-id":"1"}';
select public.trade_room_command('send',p_season=>2026,p_proposal=>'{"teamIds":["1","2"],"sends":[["a"],["b"]],"destinations":{"a":"2","b":"1"}}',p_request_id=>'22222222-2222-4222-8222-222222222222')->>'id' as second_id \gset
select pg_temp.check(public.trade_room_command('send',p_season=>2026,p_proposal=>'{"teamIds":["1","2"],"sends":[["a"],["b"]],"destinations":{"a":"2","b":"1"}}',p_request_id=>'22222222-2222-4222-8222-222222222222')->>'id'=:second_id::text,'Retry creates one offer');
select pg_temp.denied(format('select public.trade_room_command(''accept'',%s,1)',:second_id),'40001');
select pg_temp.denied(format('select public.trade_room_command(''remove'',%s,1)',:second_id),'42501');
reset role;
update public.sleeper_rosters set players='["bb"]' where roster_id=2;
set role anon;
set request.headers='{"x-member-id":"2"}';
select pg_temp.denied(format('select public.trade_room_command(''accept'',%s,1,p_pin=>''1234'')',:second_id),'22023');
select public.trade_room_command('decline',:second_id,1,p_pin=>'1234');
set request.headers='{"x-member-id":"1"}';
select pg_temp.denied('select public.trade_room_command(''send'',p_season=>2025,p_proposal=>''{}'',p_request_id=>''33333333-3333-4333-8333-333333333333'')','22023');
select pg_temp.denied('select public.trade_room_command(''send'',p_season=>2026,p_proposal=>''{"teamIds":["1","2"],"sends":[["a"],["bb"]],"destinations":{"a":"1","bb":"1"}}'',p_request_id=>''33333333-3333-4333-8333-333333333333'')','22023');
select pg_temp.denied('select public.trade_room_command(''send'',p_season=>2026,p_proposal=>''{"teamIds":["1","2"],"sends":[["a","a"],["bb"]],"destinations":{"a":"2","bb":"1"}}'',p_request_id=>''33333333-3333-4333-8333-333333333333'')','22023');
select pg_temp.denied('select public.trade_room_command(''send'',p_season=>2026,p_proposal=>''{"teamIds":["1","2"],"sends":[["bb"],["a"]],"destinations":{"a":"2","bb":"1"}}'',p_request_id=>''33333333-3333-4333-8333-333333333333'')','22023');
select pg_temp.denied('select public.trade_room_command(''send'',p_season=>2026,p_proposal=>''{"teamIds":["1","3"],"sends":[["a","aa","ab","ac","ad"],["c","cc","missing","missing2"]],"destinations":{}}'',p_request_id=>''33333333-3333-4333-8333-333333333333'')','22023');
select public.trade_room_command('save',p_season=>2026,p_proposal=>'{"teamIds":["1","3"],"sends":[["a"],["c"]],"destinations":{"a":"3","c":"1"}}',p_request_id=>'33333333-3333-4333-8333-333333333333')->>'id' as draft_id \gset
select public.trade_room_command('remove',:draft_id,1);
select pg_temp.denied(format('select public.trade_room_read(%s)',:draft_id),'42501');
reset role;
select pg_temp.check(not exists(select 1 from public.trade_room_events where room_id=:draft_id),'Draft deletion removes its history');
select pg_temp.check((select relrowsecurity from pg_class where oid='public.trade_rooms'::regclass),'Rooms have RLS');
select pg_temp.check((select relrowsecurity from pg_class where oid='public.trade_room_events'::regclass),'Events have RLS');
select pg_temp.check(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'trade_room_%' and prosecdef),'Exposed wrappers are invokers');
insert into public.trade_rooms(season,league_id,owner_id,client_key,member_ids,sender_id,proposal,status,updated_at)
select season,league_id,owner_id,gen_random_uuid(),member_ids,sender_id,proposal,'declined',now()+interval '1 hour' from public.trade_rooms cross join generate_series(1,55) where id=:room_id;
insert into public.trade_rooms(season,league_id,owner_id,client_key,member_ids,sender_id,proposal,status,updated_at)
select season,league_id,owner_id,gen_random_uuid(),member_ids,sender_id,proposal,'pending','2000-01-01' from public.trade_rooms where id=:room_id returning id as old_open_id \gset
set role anon;
set request.headers='{"x-member-id":"1"}';
select pg_temp.check(exists(select 1 from jsonb_array_elements(public.trade_room_list()) r where r->>'id'=:old_open_id::text),'Old open offers survive a full closed archive');
select pg_temp.check((select count(*) from jsonb_array_elements(public.trade_room_list()) r where r->>'status' in ('agreed','declined','withdrawn'))=30,'Closed archive remains bounded');
reset role;
select 'Trade room database checks passed' as result;
