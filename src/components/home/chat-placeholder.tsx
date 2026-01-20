import { Video, MessageCircle, Monitor, Users, Github } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";

const ChatPlaceHolder = () => {
	const handleStartMessaging = () => {
		// Trigger the new chat dialog by clicking the MessageSquareDiff button in the left panel
		const newChatButton = document.querySelector('[data-testid="new-chat-button"]') as HTMLElement;
		if (newChatButton) {
			newChatButton.click();
		} else {
			// Fallback: try to find the MessageSquareDiff button
			const messageSquareButton = document.querySelector('svg[data-lucide="message-square-diff"]')?.closest('button') as HTMLElement;
			if (messageSquareButton) {
				messageSquareButton.click();
			}
		}
	};

	const handleGithubClick = () => {
		window.open('https://github.com/ayushhrawat', '_blank');
	};

	return (
		<div className='w-3/4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center py-16 px-8 relative overflow-hidden'>
			{/* Background decoration */}
			<div className='absolute inset-0 bg-hero-gradient opacity-5'></div>
			<div className='absolute top-10 left-10 w-32 h-32 bg-green-600/10 rounded-full blur-3xl'></div>
			<div className='absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl'></div>
			
			<div className='flex flex-col items-center w-full justify-center py-8 gap-6 relative z-10 max-w-4xl mx-auto'>
				{/* Streamify Logo */}
				<div className='relative mb-4'>
					<div className='w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:shadow-3xl'>
						<Image 
							src="/logo.png" 
							alt="Streamify Logo" 
							width={60} 
							height={60} 
							className="rounded-full object-contain"
						/>
					</div>
					<div className='absolute -top-1 -right-1 w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300'>
						<Video size={12} className='text-white drop-shadow-sm' />
					</div>
				</div>

				{/* Welcome Heading */}
				<h1 className='text-5xl font-bold text-gray-800 dark:text-white mb-4 text-center'>
					Welcome to Streamify
				</h1>
				
				{/* Description */}
				<p className='text-xl text-gray-600 dark:text-gray-300 text-center max-w-2xl leading-relaxed mb-6'>
					Connect instantly with real-time messaging,<br />
					video calling, screen sharing & group chats.
				</p>

				{/* Feature Icons */}
				<div className='flex items-center justify-center gap-12 mb-6'>
					{/* Real-time Messaging */}
					<div className='flex flex-col items-center text-center group'>
						<div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors duration-300 shadow-lg'>
							<MessageCircle size={28} className='text-green-600 dark:text-green-400' />
						</div>
						<h3 className='font-semibold text-gray-800 dark:text-gray-200 text-sm'>Real-time Messaging</h3>
					</div>
					
					{/* Video Calling & Screen Sharing */}
					<div className='flex flex-col items-center text-center group'>
						<div className='w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors duration-300 shadow-lg'>
							<Monitor size={28} className='text-blue-600 dark:text-blue-400' />
						</div>
						<h3 className='font-semibold text-gray-800 dark:text-gray-200 text-sm'>Screen Sharing & Video</h3>
					</div>
					
					{/* Group Chats */}
					<div className='flex flex-col items-center text-center group'>
						<div className='w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors duration-300 shadow-lg'>
							<Users size={28} className='text-purple-600 dark:text-purple-400' />
						</div>
						<h3 className='font-semibold text-gray-800 dark:text-gray-200 text-sm'>Group Chats</h3>
					</div>
				</div>

				{/* Start Messaging Button */}
				<Button 
					onClick={handleStartMessaging}
					className='rounded-full px-10 py-4 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-4'
				>
					Start Messaging
				</Button>

				{/* Footer - Created by */}
				<div className='flex items-center justify-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
					<p className='text-sm text-gray-500 dark:text-gray-400'>
						Created by <span className='font-semibold text-gray-700 dark:text-gray-300'>Ayush Rawat</span>
					</p>
					<button
						onClick={handleGithubClick}
						className='p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 group'
						aria-label="Visit Ayush Rawat's GitHub Profile"
					>
						<Github size={16} className='text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200' />
					</button>
				</div>
			</div>
		</div>
	);
};
export default ChatPlaceHolder;