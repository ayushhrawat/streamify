"use client";

import LeftPanel from "@/components/home/left-panel";
import RightPanel from "@/components/home/right-panel";
import AuthCheck from "@/components/auth-check";
import { ConversationRefreshProvider } from "@/contexts/conversation-refresh-context";
import { UserRefreshProvider } from "@/contexts/user-refresh-context";

export default function Home() {
	return (
		<AuthCheck>
			<UserRefreshProvider>
				<ConversationRefreshProvider>
					<main className='m-5 relative'>
						{/* Enhanced background decorations */}
						<div className='fixed inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -z-40' />
						<div className='fixed top-0 left-0 w-full h-36 bg-gradient-to-r from-green-primary to-green-secondary dark:bg-transparent -z-30 opacity-80' />
						
						<div className='flex overflow-y-hidden h-[calc(100vh-50px)] max-w-[1700px] mx-auto bg-left-panel/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20'>
							<LeftPanel />
							<RightPanel />
						</div>
					</main>
				</ConversationRefreshProvider>
			</UserRefreshProvider>
		</AuthCheck>
	);
}