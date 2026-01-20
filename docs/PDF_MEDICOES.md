# Funcionalidade de Geração de PDF para Medições

## Visão Geral

Foi implementada uma funcionalidade completa de geração de PDF para os boletins de medição do sistema. O PDF é gerado em **orientação horizontal (paisagem)** para proporcionar mais espaço para as descrições e informações detalhadas.

## Características do PDF

### Layout e Design
- **Orientação**: Horizontal (paisagem) para melhor aproveitamento do espaço
- **Design**: Moderno, profissional e intuitivo
- **Cores**: Esquema de cores azul profissional com destaques em verde para valores
- **Tipografia**: Helvetica para melhor legibilidade

### Seções do PDF

#### 1. Cabeçalho
- Título "BOLETIM DE MEDIÇÃO"
- Subtítulo "Sistema de Controle de Obras"
- Número da medição e contrato
- Data de geração
- Período da medição
- Status (Aprovado/Pendente) com cores distintivas

#### 2. Informações da Obra
- Nome da obra
- Número e tipo do contrato
- Descrição do contrato
- Engenheiro responsável

#### 3. Dados do Fornecedor
- Nome completo
- Código do fornecedor
- Documento (CNPJ/CPF)
- Informações de contato (telefone, email)

#### 4. Resumo da Medição
- Período de execução
- Status atual
- Quantidade de itens medidos
- Observações
- Valor total destacado

#### 5. Tabela de Itens
- Descrição detalhada dos itens
- Unidade de medida
- Quantidade total contratada
- Quantidade medida
- Percentual executado
- Valor unitário
- Valor total por item
- **Total geral** destacado
- **Desconto** (se aplicável)

#### 6. Seção de Assinaturas
- Campo para assinatura do Responsável Técnico
- Campo para assinatura do Fornecedor
- Campo para assinatura de Aprovação
- Espaços para datas

#### 7. Rodapé
- Informações de geração automática
- Data e hora de criação

## Pontos de Acesso

### 1. Lista de Medições (`/medicoes`)
- **Localização**: Coluna "AÇÕES" da tabela
- **Ícone**: FileText (ícone de documento)
- **Cor**: Verde
- **Tooltip**: "Gerar PDF"

### 2. Detalhes da Medição (`/medicoes/visualizar/[id]`)
- **Localização**: Barra superior de ações
- **Botão**: "Gerar PDF" com ícone
- **Cor**: Azul
- **Estados**: Normal / "Gerando PDF..." (durante processamento)

## Implementação Técnica

### Componente Principal
```typescript
// src/components/medicoes/PDFMedicao.tsx
```

### Bibliotecas Utilizadas
- `@react-pdf/renderer`: Geração de PDF no React
- Estilos customizados para layout profissional

### Fluxo de Funcionamento

1. **Usuário clica** no botão/ícone de gerar PDF
2. **Sistema busca** os dados da medição e itens (se necessário)
3. **Componente PDF** é renderizado em background
4. **Download automático** é iniciado
5. **Arquivo PDF** é salvo com nome padronizado

### Nomenclatura dos Arquivos
```
medicao_[NUMERO_CONTRATO]_[NUMERO_ORDEM].pdf

Exemplo: medicao_CT_0001_1.pdf
```

## Características Técnicas

### Responsividade
- Layout otimizado para impressão A4 paisagem
- Tabelas com larguras proporcionais
- Quebras de linha automáticas para textos longos

### Performance
- Renderização assíncrona
- Componente carregado apenas quando necessário
- Limpeza automática de recursos após download

### Acessibilidade
- Estrutura semântica clara
- Contraste adequado de cores
- Fontes legíveis

## Benefícios

1. **Profissionalismo**: Layout moderno e organizado
2. **Completude**: Todas as informações relevantes incluídas
3. **Praticidade**: Download direto sem necessidade de configuração
4. **Padronização**: Formato consistente para todos os boletins
5. **Assinaturas**: Espaços dedicados para validação oficial
6. **Rastreabilidade**: Informações completas de geração

## Casos de Uso

- **Apresentação para clientes**
- **Documentação oficial de obra**
- **Arquivo para auditoria**
- **Comprovação de execução**
- **Relatórios gerenciais**
- **Documentação contratual**

## Manutenção

O componente é modular e pode ser facilmente:
- Customizado para diferentes layouts
- Estendido com novas seções
- Adaptado para outros tipos de documento
- Integrado com sistemas de assinatura digital

## Observações Importantes

- O PDF é gerado no lado do cliente (browser)
- Não há dependência de serviços externos
- Funciona offline após carregamento inicial
- Compatível com todos os navegadores modernos 