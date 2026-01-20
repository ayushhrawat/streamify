import type { Config } from "tailwindcss";

const config = {
	darkMode: ["class"],
	content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			backgroundColor: {
				container: "hsl(var(--container))",
				"gray-primary": "hsl(var(--gray-primary))",
				"gray-secondary": "hsl(var(--gray-secondary))",
				"gray-tertiary": "hsl(var(--gray-tertiary))",
				"left-panel": "hsl(var(--left-panel))",
				"chat-hover": "hsl(var(--chat-hover))",
				"green-primary": "hsl(var(--green-primary))",
				"green-secondary": "hsl(var(--green-secondary))",
				"green-chat": "hsl(var(--green-chat))",
			},
			backgroundImage: {
				"chat-tile-light": "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
				"chat-tile-dark": "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
				"hero-gradient": "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
				"chat-pattern-light": "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)",
				"chat-pattern-dark": "radial-gradient(circle at 20% 50%, rgba(255, 107, 107, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(238, 90, 36, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(255, 159, 67, 0.15) 0%, transparent 50%)",
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
