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
	`,
	/* sql */ `
	-- signed-in devices in settings
	alter table sessions add column user_agent text;
	alter table sessions add column last_seen_at timestamptz not null default now();
	`,
	/* sql */ `
	-- wines you want, not own yet
	alter table wines add column wishlist boolean not null default false;
	`,
	/* sql */ `
	-- label reading by Claude: each user opts in, and spends from a monthly allowance
	alter table users add column label_reader text not null default 'local'
		check (label_reader in ('local', 'claude'));
	alter table users add column claude_consent_at timestamptz;
	create table claude_usage (
		user_id uuid not null references users on delete cascade,
		month date not null,
		requests int not null default 0,
		input_tokens bigint not null default 0,
		output_tokens bigint not null default 0,
		primary key (user_id, month)
	);
	`,
	/* sql */ `
	-- the back label: alcohol, grapes and the small print are often only there
	create table wine_back_photos (
		wine_id uuid primary key references wines on delete cascade,
		image bytea not null,
		updated_at timestamptz not null default now()
	);
	`,
	/* sql */ `
	-- personal access tokens, for apps such as Claude reaching the cellar over MCP
	create table api_tokens (
		id text primary key,
		user_id uuid not null references users on delete cascade,
		label text not null check (length(label) between 1 and 60),
		created_at timestamptz not null default now(),
		last_used_at timestamptz
	);
	create index api_tokens_user on api_tokens (user_id);
	`,
	/* sql */ `
	-- the bottle's retail barcode, to know it again; looking barcodes up online is opt-in
	alter table wines add column barcode text check (barcode ~ '^[0-9]{8,14}$');
	create index wines_barcode on wines (user_id, barcode) where barcode is not null;
	alter table users add column barcode_lookup boolean not null default false;
	-- answers from Open Food Facts, shared: a barcode and its product, nothing about who asked
	create table barcode_cache (
		code text primary key,
		found boolean not null,
		data jsonb,
		fetched_at timestamptz not null default now()
	);
	`,
	/* sql */ `
	-- a reference list of wines (X-Wines, public domain), loaded from data/xwines.tsv.gz on start
	create table ref_wines (
		id serial primary key,
		producer text not null,
		name text not null,
		producer_key text not null,
		name_key text not null,
		color text,
		country text,
		region text,
		grapes text[] not null default '{}',
		alcohol numeric(4, 1),
		body smallint
	);
	create index ref_wines_producer on ref_wines (producer_key text_pattern_ops);
	create index ref_wines_name on ref_wines (name_key);
	create table ref_meta (
		source text primary key,
		version text not null,
		loaded_at timestamptz not null default now()
	);
	`,
	/* sql */ `
	-- answers cached before fa9afe0 were stored as a JSON string: unwrap them
	update barcode_cache set data = (data #>> '{}')::jsonb where jsonb_typeof(data) = 'string';
	`,
	/* sql */ `
	-- the reference list searched by any word read from a label, producer or wine
	create index ref_wines_words on ref_wines
		using gin (to_tsvector('simple', producer_key || ' ' || name_key));
	`,
	/* sql */ `
	-- label photos and their text sent by the iPhone Shortcut (Live Text read them on the phone),
	-- waiting on the add page until used; a run's photos share a batch, the first is the front
	create table pending_scans (
		id uuid primary key default gen_random_uuid(),
		user_id uuid not null references users on delete cascade,
		batch text not null,
		front bytea not null,
		front_text text not null,
		back bytea,
		back_text text,
		created_at timestamptz not null default now(),
		unique (user_id, batch)
	);
	`,
	/* sql */ `
	-- links for sending a wine's label photos over MCP: the app (e.g. Claude) uploads the file
	-- itself, since a model can't write megabytes into a tool call. Only the hash is stored.
	create table photo_uploads (
		token_hash text primary key,
		user_id uuid not null references users on delete cascade,
		wine_id uuid not null references wines on delete cascade,
		expires_at timestamptz not null
	);
	`
];
