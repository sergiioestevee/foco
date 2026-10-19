-- Run after every migration. Must return zero rows: any table listed here is exposed without RLS.
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and not rowsecurity;
