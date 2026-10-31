/** A short, human name for the device behind a user agent ("iPhone · Safari") */
export function deviceLabel(ua: string | null | undefined): string | null {
	if (!ua) return null;
	const os = /iPhone/.test(ua)
		? 'iPhone'
		: /iPad/.test(ua)
			? 'iPad'
			: /Android/.test(ua)
				? 'Android'
				: /Macintosh/.test(ua)
					? 'Mac'
					: /Windows/.test(ua)
						? 'Windows'
						: /Linux/.test(ua)
							? 'Linux'
							: null;
	// order matters: Chrome's UA also says Safari, Edge's says Chrome
	const browser = /Edg\//.test(ua)
		? 'Edge'
		: /Firefox\/|FxiOS/.test(ua)
			? 'Firefox'
			: /Chrome\/|CriOS/.test(ua)
				? 'Chrome'
				: /Safari\//.test(ua)
					? 'Safari'
					: null;
	return [os, browser].filter(Boolean).join(' · ') || null;
}
