const fs = require('fs');
const rows = JSON.parse(fs.readFileSync('C:/Svetla_Stran/Code/output/headlines_import.json', 'utf8'));

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function escArr(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  return "'{" + arr.map(e => '"' + String(e).replace(/"/g, '\\"') + '"').join(',') + "}'";
}

const values = rows.map(r => {
  return '(' + [
    esc(r.raw_title),
    esc(r.raw_content),
    esc(r.full_content),
    esc(r.source_url),
    esc(r.source_name),
    esc(r.content_hash),
    r.ai_score !== null ? r.ai_score : 'NULL',
    escArr(r.ai_emotions),
    esc(r.ai_reason),
    esc(r.ai_category),
    esc(r.ai_headline),
    esc(r.ai_antidote),
    esc(r.ai_rejected_because),
    esc(r.status)
  ].join(', ') + ')';
});

const sql = 'INSERT INTO headlines (raw_title, raw_content, full_content, source_url, source_name, content_hash, ai_score, ai_emotions, ai_reason, ai_category, ai_headline, ai_antidote, ai_rejected_because, status) VALUES\n' + values.join(',\n') + ';';

fs.writeFileSync('C:/Svetla_Stran/Code/output/headlines_insert.sql', sql);
console.log('SQL file written, length:', sql.length, 'chars');
