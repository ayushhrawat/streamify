"use client";
import { ListFilter, Search, X } from "lucide-react";
import { Input } from "../ui/input";
import Conversation from "./conversation";
import { UserButton } from "@clerk/nextjs";
import SettingsMenu from "./settings-menu";

import UserListDialog from "./user-list-dialog";
import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { useConversationStore, convertSupabaseConversation } from "@/store/chat-store";
import { mockConversations } from "@/lib/mock-data";
import { useSupabase } from "@/providers/supabase-provider";
import { useConversations } from "@/hooks/use-conversations";
import { useConversationUpdates } from "@/hooks/use-conversation-updates";
import { getDeletedConversations } from "@/lib/deleted-conversations";

const LeftPanel = () => {
	const { isLoaded, isSignedIn, user } = useUser();
	const { currentUser } = useSupabase();
	const { conversations, loading: isLoading, error, refetch: refetchConversations } = useConversations();
	const { addUpdateListener, triggerUpdate } = useConversationUpdates();
	
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	
	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	
	// State to trigger re-renders when conversations are deleted
	const [deletedConversationsUpdate, setDeletedConversationsUpdate] = useState(0);
	
	// State to force re-render when conversations are updated
	const [conversationUpdateTrigger, setConversationUpdateTrigger] = useState(0);
	
	// Handle search input
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};
	
	// Handle search clear
	const handleSearchClear = () => {
		setSearchQuery("");
	};
	
	// Handle key press in search
	const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			handleSearchClear();
		}
	};

	// Listen to conversation updates
	useEffect(() => {
		const removeListener = addUpdateListener(() => {
			console.log('🔄 Conversation update received in left panel');
			// Trigger conversation refetch
			refetchConversations();
			// Also trigger local re-render
			setConversationUpdateTrigger(prev => prev + 1);
		});

		return removeListener;
	}, [addUpdateListener, refetchConversations]);

	// Convert Supabase conversations to store format and deduplicate
	const convertedConversations = useMemo(() => {
		// Simple deduplication by ID - keep the first occurrence
		const seenIds = new Set();
		const uniqueConversations = conversations.filter(conv => {
			if (seenIds.has(conv.id)) {
				return false;
			}
			seenIds.add(conv.id);
			return true;
		});
		
		return uniqueConversations.map(conv => convertSupabaseConversation(conv, currentUser?.id));
	}, [conversations, currentUser?.id, conversationUpdateTrigger]);

	// Use mock data if there's an error or no conversations and user is not signed in
	const allConversations = isSignedIn && currentUser 
		? convertedConversations 
		: (convertedConversations.length > 0 ? convertedConversations : mockConversations);
	
	// Filter conversations based on search query and deleted status
	const finalConversations = useMemo(() => {
		// First filter out deleted conversations and ensure valid conversations
		const deletedConversationIds = getDeletedConversations(currentUser?.id);
		const validConversations = allConversations.filter((conversation) => {
			// Filter out deleted conversations
			if (deletedConversationIds.includes(conversation.id || conversation._id)) {
				return false;
			}
			
			// Ensure conversation has valid data
			if (!conversation.id && !conversation._id) {
				return false;
			}
			
			// For non-group conversations, ensure we have other user info
			if (!conversation.isGroup && !conversation.name && !conversation.other_user_name) {
				return false;
			}
			
			// For group conversations, ensure we have group name
			if (conversation.isGroup && !conversation.groupName && !conversation.group_name) {
				return false;
			}
			
			return true;
		});
		
		// Then apply search filter
		if (!searchQuery.trim()) {
			return validConversations;
		}
		
		return validConversations.filter((conversation) => {
			const conversationName = conversation.groupName || conversation.name || '';
			return conversationName.toLowerCase().includes(searchQuery.toLowerCase());
		});
	}, [allConversations, searchQuery, currentUser?.id, deletedConversationsUpdate, conversationUpdateTrigger]);

	const conversationIds = useMemo(() => 
		finalConversations?.map((conversation) => conversation.id || conversation._id) || [], 
		[finalConversations]
	);

	// Listen for storage changes and custom events to update deleted conversations
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key?.includes('streamify_deleted_conversations')) {
				setDeletedConversationsUpdate(prev => prev + 1);
			}
		};
		
		const handleConversationDeleted = () => {
			setDeletedConversationsUpdate(prev => prev + 1);
		};
		
		const handleConversationCreated = (event: CustomEvent) => {
			console.log('Conversation created event received:', event.detail);
			// Trigger immediate refresh of conversations
			refetchConversations();
			// Also trigger a re-render by updating the deleted conversations state
			setDeletedConversationsUpdate(prev => prev + 1);
			// Trigger conversation update
			triggerUpdate();
		};

		// Listen for message events to trigger conversation updates
		const handleMessageSent = () => {
			console.log('📨 Message sent event received, updating conversations');
			// Small delay to ensure message is saved to database
			setTimeout(() => {
				refetchConversations();
				setConversationUpdateTrigger(prev => prev + 1);
			}, 500);
		};
		
		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('conversationDeleted', handleConversationDeleted);
		window.addEventListener('conversationCreated', handleConversationCreated as EventListener);
		window.addEventListener('messageSent', handleMessageSent);
		
		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('conversationDeleted', handleConversationDeleted);
			window.removeEventListener('conversationCreated', handleConversationCreated as EventListener);
			window.removeEventListener('messageSent', handleMessageSent);
		};
	}, [refetchConversations, triggerUpdate]);

	useEffect(() => {
		if (selectedConversation && conversationIds && !conversationIds.includes(selectedConversation.id || selectedConversation._id)) {
			setSelectedConversation(null);
		}
	}, [conversationIds, selectedConversation, setSelectedConversation]);

	if (!isLoaded) return null;

	return (
		<div className='w-1/4 border-gray-600 border-r'>
			<div className='sticky top-0 bg-left-panel z-10'>
				{/* Header */}
				<div className='flex justify-between bg-gray-primary p-3 items-center'>
					<UserButton />

					<div className='flex items-center gap-3'>
						{isSignedIn && <UserListDialog />}
						<SettingsMenu />
					</div>
				</div>
				<div className='p-3 flex items-center'>
					{/* Search */}
					<div className='relative h-10 mx-3 flex-1'>
						<Search
							className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10'
							size={18}
						/>
						<Input
							type='text'
							placeholder='Search or start a new chat'
							className='pl-10 pr-10 py-2 text-sm w-full rounded shadow-sm bg-gray-primary focus-visible:ring-transparent'
							value={searchQuery}
							onChange={handleSearchChange}
							onKeyDown={handleSearchKeyPress}
						/>
						{searchQuery && (
							<button
								onClick={handleSearchClear}
								className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 z-10'
							>
								<X size={16} />
							</button>
						)}
					</div>
					<ListFilter className='cursor-pointer' />
				</div>
				
				{/* Connection Status */}
				{error && (
					<div className='px-3 pb-2'>
						<div className='bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded'>
							⚠️ Error loading conversations: {error}
						</div>
					</div>
				)}
				
				{!isSignedIn && (
					<div className='px-3 pb-2'>
						<div className='bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded'>
							ℹ️ Sign in to view your conversations
						</div>
					</div>
				)}
			</div>

			{/* Chat List */}
			<div className='my-3 flex flex-col gap-0 max-h-[80%] overflow-auto'>
				{/* Loading state */}
				{isLoading && (
					<div className='text-center text-gray-500 text-sm mt-3'>
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
						Loading conversations...
					</div>
				)}
				
				{/* Search message */}
				{searchQuery.trim() && (
					<div className='px-3 pb-2'>
						<div className='bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded'>
							Users based on your search
						</div>
					</div>
				)}
				
				{/* Conversations */}
				{finalConversations?.map((conversation) => (
					<Conversation key={`${conversation.id || conversation._id}-${conversationUpdateTrigger}`} conversation={conversation} />
				))}

				{finalConversations?.length === 0 && !isLoading && (
					<>
						{searchQuery.trim() ? (
							<p className='text-center text-gray-500 text-sm mt-3'>
								No users found matching "{searchQuery}"
							</p>
						) : (
							<>
								<p className='text-center text-gray-500 text-sm mt-3'>No conversations yet</p>
								<p className='text-center text-gray-500 text-sm mt-3 '>
									We understand {"you're"} an introvert, but {"you've"} got to start somewhere 😊
								</p>
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
};
export default LeftPanel;