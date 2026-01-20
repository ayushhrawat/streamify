/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{ hostname: "oaidalleapiprodscus.blob.core.windows.net" },
			{ hostname: "qtnhiwhtgnewwlplpebo.supabase.co" },
		],
	},
};

export default nextConfig;
