-- Use the same existing Vault binding as the Sleeper and lineup schedulers.
-- Keep delivery paused until the verified frontend release is live.
select cron.alter_job(jobid,command:=replace(command,'dfl_sleeper_sync_token','dfl_sleeper_cron_token'),active:=false)
 from cron.job where jobname='dfl-live-football';
