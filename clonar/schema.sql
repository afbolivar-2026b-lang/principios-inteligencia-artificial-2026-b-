-- Esquema de referencia de la app de gastos personal.
-- Versión 1: estas tablas se guardan en IndexedDB (Dexie) dentro del celular.
-- Si algún día se activa la sincronización, este SQL sirve tal cual en Postgres (Supabase),
-- agregando user_id y row level security a cada tabla.

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  icono text not null default 'tag',
  color text not null default '#888888',
  tipo text not null default 'gasto' check (tipo in ('gasto','ingreso')),
  orden integer not null default 0,
  archivada boolean not null default false,
  creado_en timestamptz not null default now(),
  editado_en timestamptz not null default now()
);
create unique index on categorias (lower(nombre), tipo) where not archivada;

create table recurrentes (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  monto integer not null check (monto > 0),          -- pesos, sin centavos
  moneda text not null default 'COP',
  categoria_id uuid not null references categorias(id) on delete restrict,
  dia_del_mes smallint not null check (dia_del_mes between 1 and 31),
  recordar_dias_antes smallint not null default 3 check (recordar_dias_antes between 0 and 15),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  editado_en timestamptz not null default now()
);
create index on recurrentes (categoria_id);

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('gasto','ingreso')),
  monto integer not null check (monto > 0),          -- pesos, sin centavos
  moneda text not null default 'COP',
  categoria_id uuid not null references categorias(id) on delete restrict,
  fecha date not null,                               -- día local en Colombia (UTC-5)
  descripcion text not null default '',
  medio_pago text check (medio_pago in ('efectivo','tarjeta','nequi','daviplata','pse','transferencia','otro')),
  origen text not null default 'manual' check (origen in ('manual','frase','voz','foto','recurrente')),
  recurrente_id uuid references recurrentes(id) on delete set null,
  creado_en timestamptz not null default now(),
  editado_en timestamptz not null default now()
);
create index on movimientos (fecha desc);
create index on movimientos (categoria_id, fecha);
create unique index on movimientos (recurrente_id, fecha) where recurrente_id is not null;  -- un gasto fijo por mes

create table presupuestos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  mes char(7) not null check (mes ~ '^[0-9]{4}-[0-9]{2}$'),   -- AAAA-MM
  limite integer not null check (limite > 0),
  umbral_alerta smallint not null default 80 check (umbral_alerta between 1 and 100),
  creado_en timestamptz not null default now(),
  editado_en timestamptz not null default now(),
  unique (categoria_id, mes)
);

create table metas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monto_objetivo integer not null check (monto_objetivo > 0),
  fecha_limite date,
  creado_en timestamptz not null default now(),
  editado_en timestamptz not null default now()
);

create table abonos_meta (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references metas(id) on delete cascade,
  monto integer not null check (monto <> 0),          -- negativo = retiro
  fecha date not null,
  creado_en timestamptz not null default now()
);
create index on abonos_meta (meta_id, fecha);

create table ajustes (
  id smallint primary key default 1 check (id = 1),  -- una sola fila
  moneda_principal text not null default 'COP',
  modo_oscuro text not null default 'sistema' check (modo_oscuro in ('claro','oscuro','sistema')),
  modo_privacidad boolean not null default false,
  bloqueo text not null default 'ninguno' check (bloqueo in ('ninguno','pin','huella')),
  ultimo_respaldo timestamptz,
  tutorial_visto boolean not null default false,
  editado_en timestamptz not null default now()
);
