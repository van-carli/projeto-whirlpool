-- Histórico de configurações do dashboard Ignis.
--
-- Cada configuração salva guarda o nome dado pelo usuário, um código gerado pelo banco
-- (WHBR0001, WHMX0001), os oito campos de entrada do modelo e os componentes usados,
-- identificados por código mascarado. Nenhuma temperatura, prevista ou medida, e nenhum
-- nome real de componente é gravado aqui: a correspondência entre código e nome fica só
-- no componentes.csv local do front, e a predição é refeita no front ao abrir um card.
--
-- O acesso é feito pelo servidor local do dashboard (frontend/servir.py) com a chave
-- service_role. O RLS fica ligado em todas as tabelas, sem política para anon ou
-- authenticated, de modo que a chave pública não lê nem grava nada.
--
-- A extensão .pgsql é proposital: o .gitignore do projeto ignora *.sql, na lista de
-- proteção de dados. Este arquivo só contém o esquema. Para aplicar, o conteúdo é colado
-- no editor SQL do painel do Supabase.

create extension if not exists pg_trgm with schema extensions;


-- ---------------------------------------------------------------- componentes

create table public.componentes (
    codigo        varchar(11) primary key,
    area          varchar(13) not null,
    limite_ativo  varchar(20) not null,
    limite_c      smallint,
    constraint componentes_area_valida check (area in (
        'coil_temps', 'ct_knobs', 'ipc_comp', 'ipc_cooling', 'main_vent_sys', 'mainback', 'oven_hmi')),
    -- prefixo da área mais seis caracteres de um HMAC do nome (frontend/dados/mascara.py)
    constraint componentes_codigo_formato check (codigo ~ '^(COIL|CTK|IPCC|IPC|MVS|MBK|HMI)-[0-9A-F]{6}$'),
    constraint componentes_prefixo_da_area check (split_part(codigo, '-', 1) = case area
        when 'coil_temps' then 'COIL' when 'ct_knobs' then 'CTK' when 'ipc_comp' then 'IPC'
        when 'ipc_cooling' then 'IPCC' when 'main_vent_sys' then 'MVS' when 'mainback' then 'MBK'
        when 'oven_hmi' then 'HMI' end),
    constraint componentes_limite_faixa check (limite_c is null or limite_c between 0 and 400)
);

comment on table public.componentes is
    'Catálogo mascarado: código, área e limite de cada componente. O nome real não é gravado.';


-- ---------------------------------------------------------------- configurações

create table public.historico_contadores (
    linha   char(2) primary key check (linha in ('br', 'mx')),
    ultimo  integer not null default 0 check (ultimo between 0 and 9999)
);

insert into public.historico_contadores (linha) values ('br'), ('mx');

comment on table public.historico_contadores is
    'Último número usado no código das configurações de cada linha (WHBR0001, WHMX0001).';


create table public.historico_configuracoes (
    id                     uuid primary key default gen_random_uuid(),
    codigo                 varchar(8) not null unique,
    nome                   varchar(100) not null check (length(btrim(nome)) > 0),
    linha                  char(2) not null check (linha in ('br', 'mx')),
    blower_direction       varchar(8) not null check (blower_direction in ('to back', 'to front')),
    housing                varchar(6) not null check (housing in ('closed', 'open')),
    board_position         varchar(6) not null check (board_position in ('center', 'right')),
    deflector_hole         varchar(6) not null check (deflector_hole in ('closed', 'open')),
    material_coil_support  varchar(9) not null check (material_coil_support in ('aluminium', 'plastic')),
    run_case               varchar(17) not null check (run_case in (
                               'broil c1', 'broil c2', 'broil qualitative', 'pyro')),
    -- nulo quando o ensaio não declara perfil de perdas, como em seis ensaios da base
    losses                 varchar(40) check (losses in (
                               'broil c2 simone - 240/145/180/180', 'broil c2 simone - front order',
                               'broil miro - front order', 'c1 simone - 240/145/180/180', 'miro',
                               'miro - front order', 'miro qualitative - back order',
                               'miro qualitative - front order', 'no losses', 'qual simone - front order',
                               'simone', 'simone losses', 'simone modified - back order')),
    reason                 varchar(14) not null check (reason in (
                               'air_path', 'heatsink_cover', 'plate', 'position_study', 'other', 'not_declared')),
    versao_modelo          varchar(40) not null,
    criado_em              timestamptz not null default now(),
    atualizado_em          timestamptz not null default now(),
    constraint historico_codigo_formato check (codigo ~ '^WH(BR|MX)[0-9]{4}$')
);

comment on table public.historico_configuracoes is
    'Configurações salvas pelo dashboard, com os oito campos de entrada do modelo.';


create table public.historico_componentes (
    configuracao_id    uuid not null references public.historico_configuracoes (id) on delete cascade,
    componente_codigo  varchar(11) not null references public.componentes (codigo) on update cascade,
    primary key (configuracao_id, componente_codigo)
);

comment on table public.historico_componentes is
    'Componentes usados em cada configuração salva.';


-- ---------------------------------------------------------------- índices

create index historico_configuracoes_codigo_trgm
    on public.historico_configuracoes using gin (codigo extensions.gin_trgm_ops);
create index historico_configuracoes_nome_trgm
    on public.historico_configuracoes using gin (nome extensions.gin_trgm_ops);
create index historico_configuracoes_criado_em
    on public.historico_configuracoes (criado_em desc);
create index historico_componentes_componente
    on public.historico_componentes (componente_codigo);


-- ---------------------------------------------------------------- gatilhos

-- Gera o código a partir do contador da linha. O update trava a linha do contador, de
-- modo que dois salvamentos simultâneos nunca recebem o mesmo número.
create or replace function public.historico_gerar_codigo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    numero integer;
begin
    update public.historico_contadores
       set ultimo = ultimo + 1
     where linha = new.linha
    returning ultimo into numero;
    new.codigo := 'WH' || upper(new.linha) || lpad(numero::text, 4, '0');
    return new;
end;
$$;

create trigger historico_configuracoes_codigo
    before insert on public.historico_configuracoes
    for each row execute function public.historico_gerar_codigo();


create or replace function public.historico_tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.atualizado_em := now();
    return new;
end;
$$;

create trigger historico_configuracoes_atualizado_em
    before update on public.historico_configuracoes
    for each row execute function public.historico_tocar_atualizado_em();


-- ---------------------------------------------------------------- salvamento

-- Grava a configuração e os seus componentes numa única transação e devolve o código
-- gerado. Códigos de componente desconhecidos interrompem o salvamento inteiro.
create or replace function public.salvar_configuracao(
    p_nome           text,
    p_linha          text,
    p_configuracao   jsonb,
    p_componentes    text[],
    p_versao_modelo  text
)
returns table (id uuid, codigo varchar)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
    novo_id      uuid;
    novo_codigo  varchar;
    faltando     text[];
begin
    if p_componentes is null or cardinality(p_componentes) = 0 then
        raise exception 'a configuração precisa de ao menos um componente';
    end if;

    select array_agg(c) into faltando
      from unnest(p_componentes) as c
     where not exists (select 1 from public.componentes k where k.codigo = c);
    if faltando is not null then
        raise exception 'componentes desconhecidos: %', array_to_string(faltando, ', ');
    end if;

    -- o código fica a cargo do gatilho historico_gerar_codigo
    insert into public.historico_configuracoes (
        nome, linha, blower_direction, housing, board_position, deflector_hole,
        material_coil_support, run_case, losses, reason, versao_modelo)
    values (
        btrim(p_nome), p_linha,
        p_configuracao ->> 'blower_direction', p_configuracao ->> 'housing',
        p_configuracao ->> 'board_position', p_configuracao ->> 'deflector_hole',
        p_configuracao ->> 'material_coil_support', p_configuracao ->> 'run_case',
        p_configuracao ->> 'losses', p_configuracao ->> 'reason', p_versao_modelo)
    returning historico_configuracoes.id, historico_configuracoes.codigo into novo_id, novo_codigo;

    insert into public.historico_componentes (configuracao_id, componente_codigo)
    select novo_id, c from (select distinct unnest(p_componentes) as c) as u;

    return query select novo_id, novo_codigo;
end;
$$;


-- ---------------------------------------------------------------- acesso

alter table public.componentes              enable row level security;
alter table public.historico_contadores     enable row level security;
alter table public.historico_configuracoes  enable row level security;
alter table public.historico_componentes    enable row level security;

-- Nenhuma política é criada: anon e authenticated não leem nem gravam. A chave
-- service_role, usada apenas pelo frontend/servir.py, ignora o RLS.
revoke all on public.componentes, public.historico_contadores,
              public.historico_configuracoes, public.historico_componentes
    from anon, authenticated;

revoke execute on function public.salvar_configuracao(text, text, jsonb, text[], text) from public, anon, authenticated;
revoke execute on function public.historico_gerar_codigo() from public, anon, authenticated;
revoke execute on function public.historico_tocar_atualizado_em() from public, anon, authenticated;
grant execute on function public.salvar_configuracao(text, text, jsonb, text[], text) to service_role;
