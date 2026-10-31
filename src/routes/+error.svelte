<script lang="ts">
	import { page } from '$app/state';
	import { useI18n } from '#lib/i18n.ts';
	const { t } = useI18n();
</script>

<main class="page stack" style="text-align:center; padding-top: 25vh">
	<h1>{page.status}</h1>
	<p class="muted">{page.status === 404 ? page.error?.message : t('common.error')}</p>
	<a class="btn" href="/">{t('nav.cellar')}</a>
</main>
