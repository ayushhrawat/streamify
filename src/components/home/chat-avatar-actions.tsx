import { IMessage, useConversationStore } from "@/store/chat-store";
import { Ban, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import React from "react";
import { useKickUser } from "@/hooks/use-users";
import { useCreateConversation } from "@/hooks/use-conversations";

type ChatAvatarActionsProps = {
	message: IMessage;
	me: any;
};

const ChatAvatarActions = ({ me, message }: ChatAvatarActionsProps) => {
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	const { kickUser, loading: kickLoading } = useKickUser();
	const { createConversation, loading: createLoading } = useCreateConversation();

	const isMember = selectedConversation?.participants.includes(message.sender._id);
	const fromAI = message.sender?.name === "ChatGPT" || message.sender?.name === "AI Assistant";
	const isGroup = selectedConversation?.isGroup;

	const handleKickUser = async (e: React.MouseEvent) => {
		if (fromAI || kickLoading) return;
		e.stopPropagation();
		if (!selectedConversation) return;
		
		try {
			await kickUser({
				conversationId: selectedConversation.id || selectedConversation._id,
				userId: message.sender._id
			});
			
			setSelectedConversation({
				...selectedConversation,
				participants: selectedConversation.participants.filter((id) => id !== message.sender._id),
			});
			
			toast.success("User removed from group");
		} catch (error) {
			console.error('Error kicking user:', error);
			toast.error("Failed to remove user");
		}
	};

	const handleCreateConversation = async () => {
		if (fromAI || createLoading) return;

		try {
			const conversationId = await createConversation({
				participants: [message.sender._id],
				isGroup: false
			});
			
			setSelectedConversation({
				id: conversationId,
				_id: conversationId,
				participants: [me._id || me.id, message.sender._id],
				is_group: false,
				isGroup: false,
				name: message.sender.name,
				image: message.sender.image,
				isOnline: message.sender.isOnline,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			});
			
			toast.success("Conversation created!");
		} catch (error) {
			console.error('Error creating conversation:', error);
			toast.error("Failed to create conversation");
		}
	};

	return (
		<div
			className='text-[11px] flex gap-4 justify-between font-bold cursor-pointer group'
			onClick={handleCreateConversation}
		>
			{isGroup && message.sender.name}

			{!isMember && !fromAI && isGroup && <Ban size={16} className='text-red-500' />}
			{isGroup && isMember && selectedConversation?.admin === me._id && (
				<LogOut size={16} className='text-red-500 opacity-0 group-hover:opacity-100' onClick={handleKickUser} />
			)}
		</div>
	);
};
export default ChatAvatarActions;