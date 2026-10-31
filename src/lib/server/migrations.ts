/** Append only. Index + 1 is the version. */
export const migrations: string[] = [
	/* sql */ `
	create table users (
		id uuid primary key default gen_random_uuid(),
		name text not null check (length(name) between 1 and 60),
		webauthn_id text not null unique,
		is_admin boolean not null default false,
		locale text not null default 'en' check (locale in ('en', 'de')),
		created_at timestamptz not null default now()
	);

	create table credentials (
		id text primary key,
		user_id uuid not null references users on delete cascade,
		public_key bytea not null,
		counter bigint not null default 0,
		transports text[] not null default '{}',
		label text,
		created_at timestamptz not null default now(),
		last_used_at timestamptz
	);
	create index credentials_user on credentials (user_id);

	create table sessions (
		id text primary key,
		user_id uuid not null references users on delete cascade,
		expires_at timestamptz not null,
		created_at timestamptz not null default now()
	);
	create index sessions_user on sessions (user_id);

	create table invites (
		id text primary key,
		created_by uuid references users on delete cascade,
		for_user uuid references users on delete cascade,
		is_admin boolean not null default false,
		note text,
		expires_at timestamptz not null,
		used_at timestamptz,
		created_at timestamptz not null default now()
	);

	create table challenges (
		id text primary key,
		challenge text not null,
		kind text not null check (kind in ('register', 'login')),
		invite_id text references invites on delete cascade,
		user_id uuid references users on delete cascade,
		pending_name text,
		pending_webauthn_id text,
		expires_at timestamptz not null
	);

	create table wines (
		id uuid primary key default gen_random_uuid(),
		user_id uuid not null references users on delete cascade,
		name text not null check (length(name) between 1 and 200),
		producer text,
		vintage smallint check (vintage between 1800 and 2200),
		color text not null default 'red'
			check (color in ('red', 'white', 'rose', 'sparkling', 'sweet', 'fortified')),
		country char(2),
		region text,
		grapes text[] not null default '{}',
		alcohol numeric(4, 1) check (alcohol between 0 and 99),
		size_ml int check (size_ml > 0),
		quantity int not null default 1 check (quantity >= 0),
		drink_from smallint,
		drink_to smallint,
		body smallint check (body between 1 and 5),
		acidity smallint check (acidity between 1 and 5),
		tannin smallint check (tannin between 1 and 5),
		sweetness smallint check (sweetness between 1 and 5),
		rating smallint check (rating between 1 and 5),
		notes text,
		purchased_on date,
		purchased_at text,
		price numeric(10, 2) check (price >= 0),
		gifted_by text,
		location text,
		ocr_text text,
		has_photo boolean not null default false,
		created_at timestamptz not null default now(),
		updated_at timestamptz not null default now()
	);
	create index wines_user on wines (user_id);

	create table wine_photos (
		wine_id uuid primary key references wines on delete cascade,
		image bytea not null,
		thumb bytea not null,
		updated_at timestamptz not null default now()
	);

	create table drinks (
		id uuid primary key default gen_random_uuid(),
		wine_id uuid not null references wines on delete cascade,
		user_id uuid not null references users on delete cascade,
		drunk_on date not null default current_date,
		rating smallint check (rating between 1 and 5),
		note text,
		created_at timestamptz not null default now()
	);
	create index drinks_user on drinks (user_id, drunk_on desc);
	create index drinks_wine on drinks (wine_id);
	`
];
