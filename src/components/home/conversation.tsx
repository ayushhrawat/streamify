import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSeenSvg, MessageSeenBlueSvg } from "@/lib/svgs";
import { ImageIcon, Users, VideoIcon, Trash2 } from "lucide-react";
import { useConversationStore } from "@/store/chat-store";
import { useSupabase } from "@/providers/supabase-provider";
import { useState, useEffect } from "react";
import { useReadReceipts } from "@/hooks/use-read-receipts";
import { ContextMenu, ContextMenuItem } from "../ui/context-menu";
import toast from "react-hot-toast";
import { addDeletedConversation } from "@/lib/deleted-conversations";
import { useSimpleReadStatus } from "@/hooks/use-simple-read-status";
import MessageStatusIndicator, { MessageStatus } from "../ui/message-status";
import { useMemo } from "react";

const Conversation = ({ conversation }: { conversation: any }) => {
	const conversationImage = conversation.groupImage || conversation.image;
	const conversationName = conversation.groupName || conversation.name;
	const lastMessage = conversation.lastMessage;
	const lastMessageType = lastMessage?.messageType;
	
	// Use current user from Supabase
	const { currentUser } = useSupabase();

	const { setSelectedConversation, selectedConversation } = useConversationStore();
	const activeBgClass = selectedConversation?._id === conversation._id;
	
	// Get read receipt status for this conversation
	const { isMessageRead } = useReadReceipts(conversation.id || conversation._id);
	
	// Local state to immediately hide unread count when conversation is selected
	const [localUnreadCleared, setLocalUnreadCleared] = useState(false);
	
	// Context menu state
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const [isDeleted, setIsDeleted] = useState(false);
	
	// Check if the last message was sent by the current user
	const isLastMessageFromCurrentUser = lastMessage?.sender === currentUser?.id || conversation.last_message_sender === currentUser?.id;
	
	// Calculate if there are unread messages
	// If the current user sent the last message, they shouldn't see unread count (they just sent it)
	// Otherwise, show unread count if it exists and hasn't been locally cleared
	const actualUnreadCount = conversation.unread_count || 0;
	const hasUnreadMessages = !localUnreadCleared && 
		actualUnreadCount > 0 && 
		!isLastMessageFromCurrentUser;
	
	// Reset local state when conversation changes or when unread count actually changes
	useEffect(() => {
		if (selectedConversation?._id !== conversation._id) {
			setLocalUnreadCleared(false);
		}
		// Also reset if the actual unread count becomes 0
		if (actualUnreadCount === 0) {
			setLocalUnreadCleared(false);
		}
	}, [selectedConversation?._id, conversation._id, actualUnreadCount]);
	
	// Handle conversation selection with immediate unread clearing
	const handleConversationClick = () => {
		setSelectedConversation(conversation);
		if (hasUnreadMessages) {
			setLocalUnreadCleared(true);
		}
	};
	
	// Handle right-click context menu
	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY });
	};
	
	// Close context menu
	const closeContextMenu = () => {
		setContextMenu(null);
	};
	
	// Handle delete conversation
	const handleDeleteConversation = () => {
		// Add to deleted conversations in localStorage
		addDeletedConversation(conversation.id || conversation._id, currentUser?.id);
		
		// Dispatch custom event for same-tab updates
		window.dispatchEvent(new CustomEvent('conversationDeleted', {
			detail: { conversationId: conversation.id || conversation._id }
		}));
		
		// Set local state for immediate UI update
		setIsDeleted(true);
		
		// Clear selected conversation if it was the deleted one
		if (selectedConversation?._id === conversation._id) {
			setSelectedConversation(null);
		}
		
		toast.success('Conversation deleted successfully');
		closeContextMenu();
	};
	
	// For blue tick: show when current user sent the last message and it has been read by the receiver
	// We check if the last message (if sent by current user) has been read
	const lastMessageId = lastMessage?._id || `${conversation.id}_last`;
	const showBlueTick = isLastMessageFromCurrentUser && 
		isMessageRead(lastMessageId, currentUser?.id || '');
	
	// For gray tick: show when current user sent the last message but it hasn't been read yet
	const showGrayTick = isLastMessageFromCurrentUser && !showBlueTick;

	// Don't render if conversation is deleted
	if (isDeleted) {
		return null;
	}

	return (
		<>
			<div
				className={`flex gap-2 items-center p-3 hover:bg-chat-hover cursor-pointer relative
					${activeBgClass ? "bg-gray-tertiary" : ""}
					${hasUnreadMessages ? "bg-blue-50 dark:bg-blue-900/20" : ""}
				`}
				onClick={handleConversationClick}
				onContextMenu={handleContextMenu}
			>
				<Avatar className='border border-gray-900 overflow-visible relative'>
					{conversation.isOnline && (
						<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-foreground' />
					)}
					<AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover rounded-full' />
					<AvatarFallback>
						<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
					</AvatarFallback>
				</Avatar>
				<div className='w-full'>
					<div className='flex items-center'>
						<div className='flex items-center gap-1'>
							<h3 className={`text-sm ${hasUnreadMessages ? 'font-bold' : 'font-medium'}`}>
								{conversationName}
							</h3>
						</div>
						<div className='ml-auto flex items-center gap-2'>
							{hasUnreadMessages && (
								<div className='bg-green-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5'>
									{conversation.unread_count > 99 ? '99+' : conversation.unread_count}
								</div>
							)}
							<span className='text-xs text-gray-500'>
								{formatDate(
									lastMessage?._creationTime || 
									(conversation.last_message_created_at ? new Date(conversation.last_message_created_at).getTime() : null) ||
									(conversation.created_at ? new Date(conversation.created_at).getTime() : Date.now())
								)}
							</span>
						</div>
					</div>
					<p className={`text-[12px] mt-1 text-gray-500 flex items-center gap-1 ${hasUnreadMessages ? 'font-semibold' : ''}`}>
						{showBlueTick && <MessageSeenBlueSvg />}
						{showGrayTick && <MessageSeenSvg />}
						{conversation.isGroup && <Users size={16} />}
						{!lastMessage && !conversation.last_message_content && "Say Hi!"}
						{(lastMessageType === "text" || !lastMessageType) && (lastMessage?.content || conversation.last_message_content) ? (
							(lastMessage?.content || conversation.last_message_content)!.length > 30 ? (
								<span>{(lastMessage?.content || conversation.last_message_content)!.slice(0, 30)}...</span>
							) : (
								<span>{lastMessage?.content || conversation.last_message_content}</span>
							)
						) : null}
						{lastMessageType === "image" && <ImageIcon size={16} />}
						{lastMessageType === "video" && <VideoIcon size={16} />}
					</p>
				</div>
			</div>
			
			{/* Context Menu */}
			{contextMenu && (
				<ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu}>
					<ContextMenuItem 
						onClick={handleDeleteConversation}
						icon={<Trash2 size={16} />}
						destructive
					>
						Delete Conversation
					</ContextMenuItem>
				</ContextMenu>
			)}
			
			<hr className='h-[1px] mx-10 bg-gray-primary' />
		</>
	);
};
export default Conversation;