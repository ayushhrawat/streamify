"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, X, Settings } from "lucide-react";
import MessageInput from "./message-input";
import MessageContainer from "./message-container";
import ChatPlaceHolder from "@/components/home/chat-placeholder";
import GroupMembersDialog from "./group-members-dialog";
import GroupManagementDialog from "./group-management-dialog";
import { useConversationStore } from "@/store/chat-store";
import { useUser } from "@clerk/nextjs";
import { useSupabase } from "@/providers/supabase-provider";

const RightPanel = () => {
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	const { isLoaded } = useUser();
	const { currentUser } = useSupabase();

	if (!isLoaded) return null;
	if (!selectedConversation) return <ChatPlaceHolder />;

	const conversationName = selectedConversation.groupName || selectedConversation.name;
	const conversationImage = selectedConversation.groupImage || selectedConversation.image;
	const isAdmin = selectedConversation.admin === currentUser?.id;

	return (
		<div className='w-3/4 flex flex-col'>
			<div className='w-full sticky top-0 z-50'>
				{/* Header */}
				<div className='flex justify-between bg-gray-primary p-3'>
					<div className='flex gap-3 items-center'>
						<Avatar>
							<AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover' />
							<AvatarFallback>
								<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full' />
							</AvatarFallback>
						</Avatar>
						<div className='flex flex-col'>
							<p>{conversationName}</p>
							{selectedConversation.isGroup && (
								<div className="flex items-center gap-2">
									<GroupMembersDialog selectedConversation={selectedConversation} />
									{isAdmin && (
										<span className="text-xs text-yellow-600 dark:text-yellow-400">
											• Admin
										</span>
									)}
								</div>
							)}
						</div>
					</div>

					<div className='flex items-center gap-4 mr-5'>
						{selectedConversation.isGroup && (
							<GroupManagementDialog 
								conversation={selectedConversation}
								trigger={
									<button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
										<Settings size={18} />
									</button>
								}
							/>
						)}
						<a href='/video-call' target='_blank'>
							<Video size={23} />
						</a>
						<X size={16} className='cursor-pointer' onClick={() => setSelectedConversation(null)} />
					</div>
				</div>
			</div>
			{/* CHAT MESSAGES */}
			<MessageContainer />

			{/* INPUT */}
			<MessageInput />
		</div>
	);
};
export default RightPanel;
