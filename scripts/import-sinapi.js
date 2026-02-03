/**
 * Script de importação SINAPI Não Desonerada
 * Lê a planilha sinapi/nao desonerado.xlsx e popula a tabela sinapi_nao_desonerada no Supabase.
 *
 * Uso: node scripts/import-sinapi.js
 * Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Estrutura esperada da planilha:
 * - Coluna A: Código da Composição
 * - Coluna B: Descrição
 * - Coluna C: Unidade
 * - Colunas D em diante: Custo (R$) por UF, na ordem AC, AL, AM, ..., TO (27 UFs)
 * - Dados a partir da linha 3 (índice 2)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Ordem das UFs na planilha (colunas D a AD = índices 3 a 29)
const UF_ORDER = [
  'ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt',
  'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to'
];

const COL_CODIGO = 0;
const COL_DESCRICAO = 1;
const COL_UNIDADE = 2;
const COL_FIRST_UF = 3;
const DATA_START_ROW = 2; // planilha: primeira linha de dados = linha 3 (0-based = 2)

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Arquivo .env.local não encontrado na raiz do projeto.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

function parseCusto(value) {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value * 100) / 100;
  const str = String(value).trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return Number.isNaN(num) ? null : Math.round(num * 100) / 100;
}

function rowToRecord(row) {
  const codigo = row[COL_CODIGO] != null ? String(row[COL_CODIGO]).trim() : '';
  const descricao = row[COL_DESCRICAO] != null ? String(row[COL_DESCRICAO]).trim() : '';
  const unidade = row[COL_UNIDADE] != null ? String(row[COL_UNIDADE]).trim() : '';
  if (!codigo) return null;

  const record = {
    codigo_composicao: codigo,
    descricao: descricao || '(sem descrição)',
    unidade_medida: unidade || 'UN'
  };

  UF_ORDER.forEach((uf, i) => {
    const colIndex = COL_FIRST_UF + i;
    const value = row[colIndex];
    record[`${uf}_custo`] = parseCusto(value);
  });

  return record;
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
    process.exit(1);
  }

  const planilhaPath = path.resolve(__dirname, '..', 'sinapi', 'nao desonerado.xlsx');
  if (!fs.existsSync(planilhaPath)) {
    console.error('Planilha não encontrada:', planilhaPath);
    process.exit(1);
  }

  console.log('Lendo planilha...');
  const workbook = XLSX.readFile(planilhaPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const records = [];
  for (let r = DATA_START_ROW; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[COL_CODIGO]) continue;
    const record = rowToRecord(row);
    if (record) records.push(record);
  }

  console.log('Linhas de dados encontradas:', records.length);
  if (records.length === 0) {
    console.log('Nenhum registro para importar. Verifique se os dados começam na linha 3 e colunas A, B, C.');
    process.exit(0);
  }

  const supabase = createClient(url, key);
  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('sinapi_nao_desonerada').insert(batch);
    if (error) {
      console.error('Erro no lote', Math.floor(i / BATCH_SIZE) + 1, ':', error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log('Inseridos', inserted, '/', records.length);
    }
  }

  console.log('Concluído. Inseridos:', inserted, 'Erros:', errors);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
