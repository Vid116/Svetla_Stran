import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSQL() {
  if (!_sql) {
    _sql = neon(process.env.NEON_DB_URL!, { fullResults: false });
  }
  return _sql;
}
