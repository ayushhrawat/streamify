import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import SupabaseProvider from "@/providers/supabase-provider";
import { MessageStatusProvider } from "@/contexts/message-status-context";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Streamify",
	description: "A modern messaging app built with Next.js and Supabase",
	icons: {
		icon: "/logo.png",
		shortcut: "/logo.png",
		apple: "/logo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={inter.className}>
				<ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
					<SupabaseProvider>
						<MessageStatusProvider>
							{children}
							<Toaster />
						</MessageStatusProvider>
					</SupabaseProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}