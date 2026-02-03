/**
 * Script de importação Insumo Preço Unitário
 * Lê a planilha sinapi/insumo_preco_unitario.xlsx e popula a tabela insumo_preco_unitario no Supabase.
 *
 * Uso: node scripts/import-insumo-preco-unitario.js
 * Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Estrutura esperada da planilha:
 * - Linha 0: Título (ignorada)
 * - Linha 1: Cabeçalhos - Classificação, Código do Insumo, Descrição do Insumo, Unidade, Origem de Preço, AC, AL, ..., TO
 * - Linha 2+: Dados
 * - Colunas 5 a 31: Preços por UF (AC, AL, AM, ..., TO)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const UF_ORDER = [
  'ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt',
  'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to'
];

const COL_CLASSIFICACAO = 0;
const COL_CODIGO = 1;
const COL_DESCRICAO = 2;
const COL_UNIDADE = 3;
const COL_ORIGEM_PRECO = 4;
const COL_FIRST_UF = 5;
const DATA_START_ROW = 2;

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
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value * 100) / 100;
  const str = String(value).trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return Number.isNaN(num) ? null : Math.round(num * 100) / 100;
}

function rowToRecord(row) {
  const codigo = row[COL_CODIGO] != null ? String(row[COL_CODIGO]).trim() : '';
  const classificacao = row[COL_CLASSIFICACAO] != null ? String(row[COL_CLASSIFICACAO]).trim() : '';
  const descricao = row[COL_DESCRICAO] != null ? String(row[COL_DESCRICAO]).trim() : '';
  const unidade = row[COL_UNIDADE] != null ? String(row[COL_UNIDADE]).trim() : '';
  const origemPreco = row[COL_ORIGEM_PRECO] != null ? String(row[COL_ORIGEM_PRECO]).trim() : '';
  if (!codigo) return null;

  const record = {
    codigo_insumo: codigo,
    classificacao: classificacao || null,
    descricao: descricao || '(sem descrição)',
    unidade_medida: unidade || 'UN',
    origem_preco: origemPreco || null
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

  const planilhaPath = path.resolve(__dirname, '..', 'sinapi', 'insumo_preco_unitario.xlsx');
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
    if (!row || (row[COL_CODIGO] === null || row[COL_CODIGO] === undefined || row[COL_CODIGO] === '')) continue;
    const record = rowToRecord(row);
    if (record) records.push(record);
  }

  console.log('Linhas de dados encontradas:', records.length);
  if (records.length === 0) {
    console.log('Nenhum registro para importar. Verifique se os dados começam na linha 3.');
    process.exit(0);
  }

  const supabase = createClient(url, key);

  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('insumo_preco_unitario')
      .upsert(batch, { onConflict: 'codigo_insumo' });
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
