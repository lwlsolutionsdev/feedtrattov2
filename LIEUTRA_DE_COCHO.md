1. Visão geral da funcionalidade
Objetivo da leitura de cocho no sistema

Ajustar automaticamente a quantidade de alimento ofertada por lote, dia a dia, com base:

Na leitura da manhã (situação do cocho + comportamento dos animais).

Na leitura noturna (vazio / normal / cheio).

Reduzir desperdício e evitar fome / suboferta, seguindo a lógica do manejo descrito no manual. 

Manual-de-leitura-de-cocho-_-Ma…

No sistema, o fluxo diário será:

À noite (2–3h após o último trato): operador registra leitura_noturna de cada lote.

Na manhã seguinte (≈1h antes do primeiro trato): operador registra:

Situação do cocho

Comportamento dos animais

Fase da dieta do lote (adaptação/crescimento ou terminação)

O sistema:

Calcula nota de cocho (escala -2 a 3) e % de ajuste.

Sugere nova quantidade de dieta (kg/animal e total do lote).

Armazena histórico de leituras e ajustes.

2. Conceitos de negócio
2.1 Escala de notas de cocho (escore)

Escala geral recomendada: -2, -1, 0, 0,5, 1, 1,5, 2, 3 

Manual-de-leitura-de-cocho-_-Ma…

Nota	Situação resumida	Ação na dieta (base)
-2	Cocho limpo, muita fome, agressividade (situação crítica)	Aumentar +15%
-1	Cocho limpo, animais com fome / agitados	Aumentar +10%
0	Cocho vazio, animais esperando ou deitados	Aumentar +5%
0,5	Cocho vazio “fino”, ajuste mais suave	Aumentar +2,5%
1	Pouca sobra (situação desejável em muitos casos)	Manter 0%
1,5	Fina camada de sobra	Reduzir -2,5%
2	Sobra moderada	Reduzir -5%
3	Muita sobra	Reduzir -10%

A lógica do manual: a nota define se mantém, aumenta ou diminui a quantidade de alimento. 

Manual-de-leitura-de-cocho-_-Ma…

2.2 Fase da dieta

adaptacao_crescimento

terminacao

Fase importa porque:

Em adaptação/crescimento são tolerados escores negativos (aumento forte de dieta) nos primeiros dias. 

Manual-de-leitura-de-cocho-_-Ma…

Em terminação o manual não recomenda uso de notas negativas. 

Manual-de-leitura-de-cocho-_-Ma…

2.3 Leituras

Leitura noturna: feita 2–3h após último trato; classificada como:

vazio

normal

cheio 

Manual-de-leitura-de-cocho-_-Ma…

Leitura da manhã:

Comportamento dos animais

Situação do cocho
Ambos combinados com a leitura noturna formam a nota final.

3. Modelo de dados (sugestão para Next.js + DB SQL/Supabase)
3.1 Enums (TypeScript)
export type DietPhase = 'adaptacao_crescimento' | 'terminacao';

export type NightReading = 'vazio' | 'normal' | 'cheio';

export type MorningBehavior =
  | 'maioria_em_pe_muita_fome'
  | 'alguns_em_pe_fome'
  | 'alguns_em_pe'
  | 'deitados_calmos';

export type MorningBunkStatus =
  | 'limpo_lambido'
  | 'limpo_sem_lambida'
  | 'pouca_sobra'
  | 'muitas_sobras'
  | 'com_sobras';

3.2 Tabela/Lente bunk_readings

Campos principais:

id

lote_id

data_referencia (date) – dia do ajuste (data do primeiro trato).

diet_phase (DietPhase)

dias_de_cocho (int)

Leitura noturna (do dia anterior):

night_reading (NightReading ou null se não houver)

night_reading_at (datetime)

Leitura da manhã:

morning_behavior (MorningBehavior)

morning_bunk_status (MorningBunkStatus)

morning_reading_at (datetime)

Resultados calculados:

score (decimal, ex: -2.0, -1.0, 0.5, etc.)

percent_adjustment (decimal, ex: 15, 10, -5)

previous_feed_kg_per_head (decimal)

new_feed_kg_per_head (decimal)

delta_kg_per_head (decimal)

num_animals (int)

total_previous_feed_kg (decimal)

total_new_feed_kg (decimal)

total_delta_kg (decimal)

4. Regras de negócio detalhadas
4.1 Regras gerais de variação

Aumentos > 10% são raros; usados principalmente na adaptação (nota -2 = +15%) e com muito cuidado para não dar 2x seguidas. 

Manual-de-leitura-de-cocho-_-Ma…

Reduções > 10% também só em situações específicas (nota 3 = -10%). 

Manual-de-leitura-de-cocho-_-Ma…

Considerar sempre:

Dias de cocho

Fase da dieta

Eventos climáticos, falhas de trato, etc. 

Manual-de-leitura-de-cocho-_-Ma…

4.2 Regras específicas por nota (leitura da manhã)

Baseado nas descrições do manual: 

Manual-de-leitura-de-cocho-_-Ma…

Nota 0 ou 0,5 (cocho vazio)

Ação:

0 → +5%

0,5 → +2,5%

Quando usar (regra de negócio):

Cocho vazio, animais esperando ou deitados.

Podem estar levemente agitados, mas não em situação crítica.

Atenção:

Em terminação com > 30 dias de cocho, evitar nota 0; preferir 0,5.

Após duas leituras 0,5 consecutivas, subir para 1. (isso você pode implementar como regra opcional/padrão). 

Manual-de-leitura-de-cocho-_-Ma…

Nota 1

Ação: manter 0% (mesma quantidade de dieta).

Quando:

Poucas sobras.

Situação desejável principalmente nos primeiros 30 dias de adaptação/terminação. 

Manual-de-leitura-de-cocho-_-Ma…

Nota 1,5

Ação: -2,5%.

Quando:

Fina camada de alimento, mas é importante diferenciar sobras reais de “seleção de ingredientes”.

Atenção:

Checar fermentação / deterioração → se tiver, limpar cocho. 

Manual-de-leitura-de-cocho-_-Ma…

Nota 2,0

Ação: -5%.

Quando:

Maior quantidade de sobra.

Geralmente associada a:

Erros na quantidade fornecida

Quebra de maquinário

Mudança de rotina

Problemas de mistura

Eventos climáticos

Atenção:

Verificar também qualidade da água e limpeza de bebedouros. 

Manual-de-leitura-de-cocho-_-Ma…

Nota 3,0

Ação: -10%.

Quando:

Sobra em excesso, geralmente extremos dos problemas acima. 

Manual-de-leitura-de-cocho-_-Ma…

Nota -1,0

Ação: +10%.

Quando:

Cocho limpo, com saliva (lambido).

Animais com fome/agressividade, em pé aguardando, todos vão ao cocho quando o trato passa.

Atenção:

Comum nos primeiros ~20 dias de confinamento; pode repetir até 2 dias seguidos no início. 

Manual-de-leitura-de-cocho-_-Ma…

Nota -2,0

Ação: +15%.

Quando:

Situação emergencial: cocho limpo, saliva, animais agressivos, todos no cocho, fome evidente.

Atenção:

Normal nos primeiros 10 dias quando -1 não ajusta.

Evitar duas notas -2 seguidas. 

Manual-de-leitura-de-cocho-_-Ma…

5. Regras de combinação Leitura Noturna + Manhã
5.1 Adaptação e crescimento

Tabela do manual (organizada para implementar): 

Manual-de-leitura-de-cocho-_-Ma…

Noite	Comportamento manhã	Situação cocho manhã	Nota	Ajuste
vazio	maioria em pé, muita fome	limpo, lambido	-2	+15%
vazio	alguns em pé, fome	limpo, lambido	-1	+10%
vazio	alguns em pé	limpo, sem lambida	-1	+10%
normal	alguns em pé	limpo, sem lambida	0	+5%
normal/cheio	deitados e calmos	limpo, sem lambida	0,5	+2,5%
normal/cheio	deitados e calmos	pouca sobra	1	0%
cheio	deitados e calmos	com poucas sobras	2	-5%
cheio	deitados e calmos	com muitas sobras	3	-10%
5.2 Terminação

Tabela do manual: 

Manual-de-leitura-de-cocho-_-Ma…

Noite	Comportamento manhã	Situação cocho manhã	Nota	Ajuste
vazio	alguns em pé, fome	limpo, lambido	0,5	+2,5%
vazio	alguns em pé	limpo, sem lambida	0,5	+2,5%
normal	alguns em pé	limpo, sem lambida	1	0%
normal/cheio	deitados e calmos	limpo, sem lambida	1	0%
normal/cheio	deitados e calmos	pouca sobra	1,5	-2,5%
cheio	deitados e calmos	com sobras	1,5	-5%

Regra importante: em dietas de terminação, não usar notas negativas. 

Manual-de-leitura-de-cocho-_-Ma…

6. Algoritmo de cálculo (para backend Next.js)
6.1 Passos

Entrada (por lote):

diet_phase: DietPhase

night_reading: NightReading | null

morning_behavior: MorningBehavior

morning_bunk_status: MorningBunkStatus

dias_de_cocho: number

previous_feed_kg_per_head: number

num_animals: number

Saída:

score: number

percent_adjustment: number

new_feed_kg_per_head: number

total_new_feed_kg: number

total_delta_kg: number

6.2 Pseudocódigo
function getScoreAndAdjustment(
  dietPhase: DietPhase,
  night: NightReading | null,
  behavior: MorningBehavior,
  bunk: MorningBunkStatus,
  diasDeCocho: number
): { score: number; percent: number } {
  // 1) Selecionar tabela base (adaptação/crescimento ou terminação)
  if (dietPhase === 'adaptacao_crescimento') {
    // Implementar as combinações conforme tabela 5.1
    // Exemplo:
    if (night === 'vazio' && behavior === 'maioria_em_pe_muita_fome' && bunk === 'limpo_lambido') {
      return { score: -2, percent: 15 };
    }
    if (night === 'vazio' && behavior === 'alguns_em_pe_fome' && bunk === 'limpo_lambido') {
      return { score: -1, percent: 10 };
    }
    // ... completar todas combinações da tabela
  } else {
    // terminação – tabela 5.2
    if (night === 'vazio' && behavior === 'alguns_em_pe_fome' && bunk === 'limpo_lambido') {
      return { score: 0.5, percent: 2.5 };
    }
    // ... completar
  }

  // 2) Regras adicionais (exemplo de refinamento)
  // - Em terminação com >30 dias de cocho, evitar nota 0
  // - Evitar notas negativas em terminação
  // - Ajustes finos 0 vs 0.5

  // fallback: caso não caia em nenhuma regra clara
  return { score: 1, percent: 0 }; // manter
}

function calcularAjusteDieta(
  dietPhase: DietPhase,
  night: NightReading | null,
  behavior: MorningBehavior,
  bunk: MorningBunkStatus,
  diasDeCocho: number,
  previousFeedKgPerHead: number,
  numAnimals: number
) {
  const { score, percent } = getScoreAndAdjustment(
    dietPhase,
    night,
    behavior,
    bunk,
    diasDeCocho
  );

  const factor = 1 + percent / 100;
  const newFeedKgPerHead = Number((previousFeedKgPerHead * factor).toFixed(3));

  const totalPrevious = previousFeedKgPerHead * numAnimals;
  const totalNew = newFeedKgPerHead * numAnimals;
  const totalDelta = totalNew - totalPrevious;

  return {
    score,
    percent_adjustment: percent,
    previous_feed_kg_per_head: previousFeedKgPerHead,
    new_feed_kg_per_head: newFeedKgPerHead,
    total_previous_feed_kg: totalPrevious,
    total_new_feed_kg: totalNew,
    total_delta_kg: totalDelta,
  };
}

7. Arquitetura Next.js Full Stack (sugestão)
7.1 Rotas API (Route Handlers, app/api/.../route.ts)

POST /api/bunk-readings/night
Grava leitura noturna de um lote.

Request body:

{
  "lote_id": "uuid",
  "date": "2025-11-15",
  "night_reading": "vazio"
}


POST /api/bunk-readings/morning
Recebe dados da manhã, calcula nota e ajuste e grava tudo.

Request body:

{
  "lote_id": "uuid",
  "date": "2025-11-16",
  "diet_phase": "adaptacao_crescimento",
  "dias_de_cocho": 12,
  "morning_behavior": "alguns_em_pe_fome",
  "morning_bunk_status": "limpo_lambida", // ou similar, conforme enum
  "previous_feed_kg_per_head": 8.5,
  "num_animals": 120
}


Processo no backend:

Buscar night_reading do dia anterior (date - 1) para esse lote_id.

Rodar calcularAjusteDieta.

Gravar registro completo em bunk_readings.

Retornar JSON com resultado.

GET /api/bunk-readings?lote_id=...&from=...&to=...
Consulta histórico de leituras e ajustes para relatórios e gráficos.

7.2 Fluxo de tela (frontend)

Tela Leitura Noturna:

Lista de lotes.

Para cada lote: select vazio / normal / cheio + botão salvar.

Tela Leitura da Manhã:

Seleciona lote.

Campos:

Fase da dieta

Dias de cocho

Comportamento (select)

Situação do cocho (select)

Consumo anterior (kg/cab) – pode vir preenchido automático do dia anterior.

Ao enviar:

Chama /api/bunk-readings/morning.

Exibe:

Nota calculada

% de ajuste

Novo kg/cab

Total do lote

Delta em kg.

8. Dicas de implementação prática (baseado no manual)

Do manual, vale transformar em validações / alertas dentro do sistema: 

Manual-de-leitura-de-cocho-_-Ma…

Bloquear ou alertar quando:

Usuário tentar registrar nota -2 duas vezes seguidas no mesmo lote.

Usuário tentar registrar nota 0 em terminação com >30 dias (sugerir 0,5).

Em terminação, se o usuário escolher comportamento que levaria a nota negativa, forçar nota mínima 0 ou 0,5 e avisar na UI.

Checklist rápido na tela:

“Verificar espaçamento de cocho adequado”

“Não aumentar/diminuir oferta em dias com alteração de formulação”

“Verificar MS dos ingredientes e água/bebedouros”
(pode ser um card de lembrete ao lado do resultado).