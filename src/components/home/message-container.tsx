import ChatBubble from "./chat-bubble";
import { useConversationStore, convertSupabaseMessage } from "@/store/chat-store";
import { useEffect, useRef, useMemo, useState } from "react";
import { mockMessages, mockCurrentUser } from "@/lib/mock-data";
import { useSocketMessages } from "@/hooks/use-socket-messages";
import { useSupabase } from "@/providers/supabase-provider";
import { useUsers } from "@/hooks/use-users";
import { useAutoMarkAsRead } from "@/hooks/use-message-read-status";
import { useInstantTyping } from "@/hooks/use-realtime-instant";
import { useSimpleReadStatus } from "@/hooks/use-simple-read-status";
import Image from "next/image";

const MessageContainer = () => {
	const { selectedConversation } = useConversationStore();
	const { currentUser } = useSupabase();
	const { users } = useUsers();
	
	// Get messages for the selected conversation using Socket.IO real-time messaging
	const { messages: supabaseMessages, loading: messagesLoading } = useSocketMessages(
		selectedConversation ? (selectedConversation.id || selectedConversation._id) : null
	);
	
	// Automatically mark messages as read when viewing conversation
	const { hasMarkedAsRead } = useAutoMarkAsRead(
		selectedConversation ? (selectedConversation.id || selectedConversation._id) : null
	);
	
	// Handle read receipts and typing indicators
	const { sendReadReceipt } = useSimpleReadStatus(
		selectedConversation ? (selectedConversation.id || selectedConversation._id) : null
	);
	
	const { typingUsers } = useInstantTyping(
		selectedConversation ? (selectedConversation.id || selectedConversation._id) : null
	);
	
	// Convert Supabase messages to IMessage format
	const messages = useMemo(() => {
		if (!supabaseMessages.length) {
			return selectedConversation ? mockMessages : [];
		}
		
		return supabaseMessages.map(msg => {
			// First check if the sender is the current user
			let senderUser = null;
			
			if (currentUser && msg.sender === currentUser.id) {
				senderUser = currentUser;
			} else if (msg.sender === 'AI Assistant' || msg.sender === 'ChatGPT' || msg.sender === 'AI Artist') {
				// Handle AI messages with a mock AI user
				const aiId = msg.sender === 'AI Artist' ? 'ai-artist' : 'ai-assistant';
				const aiName = msg.sender === 'AI Artist' ? 'AI Artist' : 'AI Assistant';
				senderUser = {
					id: aiId,
					name: aiName,
					email: `${aiId}@streamify.com`,
					image: '/ai-avatar.png', // You can add an AI avatar image
					token_identifier: aiId,
					is_online: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};
			} else {
				// Look for the sender in the users list
				senderUser = users.find(u => u.id === msg.sender);
			}
			
			if (!senderUser) {
				console.warn('Could not find sender for message:', msg.id, 'sender:', msg.sender);
				// Create a fallback user for unknown senders
				senderUser = {
					id: msg.sender,
					name: 'Unknown User',
					email: 'unknown@streamify.com',
					image: '/default-avatar.png',
					token_identifier: msg.sender,
					is_online: false,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};
			}
			
			return convertSupabaseMessage(msg, senderUser);
		}).filter((msg): msg is NonNullable<typeof msg> => msg !== null);
	}, [supabaseMessages, users, currentUser, selectedConversation]);
	
	const me = currentUser || mockCurrentUser;
	const lastMessageRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTimeout(() => {
			lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}, [messages]);

	// Send read receipt when messages are marked as read
	useEffect(() => {
		if (hasMarkedAsRead && selectedConversation) {
			const conversationId = selectedConversation.id || selectedConversation._id;
			console.log('📖 Sending read receipt for conversation:', conversationId);
			sendReadReceipt(conversationId);
		}
	}, [hasMarkedAsRead, selectedConversation, sendReadReceipt]);

	return (
		<div className='relative p-3 flex-1 overflow-auto h-full bg-chat-tile-light dark:bg-chat-tile-dark bg-chat-pattern-light dark:bg-chat-pattern-dark'>
			<div className='mx-12 flex flex-col gap-3'>
				{messages?.map((msg, idx) => (
					<div key={msg._id} ref={lastMessageRef}>
						<ChatBubble message={msg} me={me} previousMessage={idx > 0 ? messages[idx - 1] : undefined} />
					</div>
				))}
				{!selectedConversation && (
					<div className='text-center text-gray-500 mt-10'>
						{/* Logo Section */}
						<div className='mb-8 flex justify-center'>
							<LogoDisplay />
						</div>
						
						{/* Welcome Text */}
						<div className='space-y-4'>
							<h1 className='text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2'>
								Welcome to Streamify
							</h1>
							<p className='text-lg text-gray-600 dark:text-gray-400'>
								Select a conversation from the left panel or start a new chat!
							</p>
							<p className='text-sm mt-4 text-blue-500 font-medium'>
								Click the &quot;New Chat&quot; button to get started
							</p>
						</div>
					</div>
				)}
				{selectedConversation && messages?.length === 0 && !messagesLoading && (
					<div className='text-center text-gray-500 mt-10'>
						<p>No messages yet. Start the conversation!</p>
					</div>
				)}
				{typingUsers.length > 0 && (
					<div className='flex items-center gap-2 text-gray-500 text-sm px-4 py-2 bg-white dark:bg-gray-800 rounded-lg mx-4 shadow-sm'>
						<div className='flex gap-1'>
							<div className='w-2 h-2 bg-green-500 rounded-full animate-bounce' style={{ animationDelay: '0ms' }}></div>
							<div className='w-2 h-2 bg-green-500 rounded-full animate-bounce' style={{ animationDelay: '150ms' }}></div>
							<div className='w-2 h-2 bg-green-500 rounded-full animate-bounce' style={{ animationDelay: '300ms' }}></div>
						</div>
						<span className='font-medium'>
							{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
						</span>
					</div>
				)}
			</div>
		</div>
	);
};

// Logo Display Component with fallback
const LogoDisplay = () => {
	const [logoError, setLogoError] = useState(false);

	return (
		<div className='relative w-32 h-32 mb-4'>
			{!logoError ? (
				<Image
					src="/logo.png" // Replace with your actual logo filename
					alt="Streamify Logo"
					fill
					className='object-contain drop-shadow-lg hover:scale-105 transition-transform duration-300'
					priority
					onError={() => setLogoError(true)}
				/>
			) : (
				// Fallback design if logo doesn't exist
				<div className='w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105'>
					<div className='text-center'>
						<span className='text-white text-4xl font-bold mb-1 block'>S</span>
						<span className='text-white text-xs font-medium opacity-90'>STREAMIFY</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default MessageContainer;