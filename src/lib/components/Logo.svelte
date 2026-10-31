<script lang="ts">
	let { size = 72 }: { size?: number } = $props();
</script>

<img src="/logo.svg" width={size} height={size} alt="Vintry" style="border-radius: {size * 0.22}px" />
