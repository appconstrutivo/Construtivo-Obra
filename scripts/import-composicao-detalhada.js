/**
 * Script de importação Composição Detalhada
 * Lê a planilha sinapi/composicao_detalhada.xlsx (Relatório Analítico de Composições)
 * e popula a tabela composicao_detalhada no Supabase.
 *
 * Uso: node scripts/import-composicao-detalhada.js
 * Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Estrutura esperada da planilha:
 * - Coluna A: Grupo (não importada)
 * - Coluna B: Código da Composição
 * - Coluna C: Tipo Item (COMPOSICAO ou INSUMO)
 * - Coluna D: Código do Item
 * - Coluna E: Descrição
 * - Coluna F: Unidade
 * - Coluna G: Coeficiente
 * - Importa apenas linhas em que Tipo Item = COMPOSICAO ou INSUMO
 * - Dados a partir da linha 3 (índice 2)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const COL_GRUPO = 0;
const COL_CODIGO_COMPOSICAO = 1;
const COL_TIPO_ITEM = 2;
const COL_CODIGO_ITEM = 3;
const COL_DESCRICAO = 4;
const COL_UNIDADE = 5;
const COL_COEFICIENTE = 6;
const DATA_START_ROW = 2; // primeira linha de dados = linha 3 (0-based = 2)

const TIPOS_VALIDOS = ['COMPOSICAO', 'INSUMO'];

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

function parseCoeficiente(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value * 10000) / 10000;
  const str = String(value).trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return Number.isNaN(num) ? null : Math.round(num * 10000) / 10000;
}

function rowToRecord(row) {
  const codigoComposicao = row[COL_CODIGO_COMPOSICAO] != null ? String(row[COL_CODIGO_COMPOSICAO]).trim() : '';
  const tipoItem = row[COL_TIPO_ITEM] != null ? String(row[COL_TIPO_ITEM]).trim().toUpperCase() : '';
  const codigoItem = row[COL_CODIGO_ITEM] != null ? String(row[COL_CODIGO_ITEM]).trim() : '';
  const descricao = row[COL_DESCRICAO] != null ? String(row[COL_DESCRICAO]).trim() : '';
  const unidade = row[COL_UNIDADE] != null ? String(row[COL_UNIDADE]).trim() : '';
  const coeficiente = parseCoeficiente(row[COL_COEFICIENTE]);

  if (!codigoComposicao || !TIPOS_VALIDOS.includes(tipoItem) || !codigoItem) return null;
  if (coeficiente == null || coeficiente < 0) return null;

  return {
    codigo_composicao: codigoComposicao,
    tipo_item: tipoItem,
    codigo_item: codigoItem,
    descricao: descricao || '(sem descrição)',
    unidade_medida: unidade || 'UN',
    coeficiente,
  };
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
    process.exit(1);
  }

  const planilhaPath = path.resolve(__dirname, '..', 'sinapi', 'composicao_detalhada.xlsx');
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
    if (!row) continue;
    const record = rowToRecord(row);
    if (record) records.push(record);
  }

  console.log('Linhas de detalhamento encontradas:', records.length);
  if (records.length === 0) {
    console.log('Nenhum registro para importar. Verifique se os dados começam na linha 3 e se Tipo Item é COMPOSICAO ou INSUMO.');
    process.exit(0);
  }

  const supabase = createClient(url, key);
  const BATCH_SIZE = 200;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('composicao_detalhada').insert(batch);
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
