import { create } from "zustand";
import { Conversation as SupabaseConversation, Message, User } from "@/lib/supabase";

// Extended conversation type for the store
export type Conversation = SupabaseConversation & {
	// Legacy fields for compatibility
	_id: string;
	image?: string;
	isGroup: boolean;
	name?: string;
	groupImage?: string;
	groupName?: string;
	isOnline?: boolean;
	lastMessage?: {
		_id: string;
		conversation: string;
		content: string;
		sender: string;
	};
};

type ConversationStore = {
	selectedConversation: Conversation | null;
	setSelectedConversation: (conversation: Conversation | null) => void;
};

export const useConversationStore = create<ConversationStore>((set) => ({
	selectedConversation: null,
	setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
}));

// Extended message interface for compatibility
export interface IMessage {
	_id: string;
	content: string;
	_creationTime: number;
	messageType: "text" | "image" | "video";
	sender: {
		_id: string;
		image: string;
		name?: string;
		tokenIdentifier: string;
		email: string;
		_creationTime: number;
		isOnline: boolean;
	};
}

// Helper function to convert Supabase conversation to store format
export const convertSupabaseConversation = (
	supabaseConv: SupabaseConversation,
	currentUserId?: string
): Conversation => {
	return {
		...supabaseConv,
		_id: supabaseConv.id,
		isGroup: supabaseConv.is_group,
		name: supabaseConv.is_group 
			? supabaseConv.group_name 
			: supabaseConv.other_user_name,
		image: supabaseConv.is_group 
			? supabaseConv.group_image 
			: supabaseConv.other_user_image,
		groupImage: supabaseConv.group_image,
		groupName: supabaseConv.group_name,
		isOnline: supabaseConv.other_user_is_online,
		lastMessage: supabaseConv.last_message_content ? {
			_id: `msg_${supabaseConv.id}_last`, // Use conversation ID for consistent mock ID
			conversation: supabaseConv.id,
			content: supabaseConv.last_message_content,
			sender: supabaseConv.last_message_sender || ''
		} : undefined
	};
};

// Helper function to convert Supabase message to IMessage format
export const convertSupabaseMessage = (
	supabaseMsg: Message,
	senderUser: User
): IMessage => {
	return {
		_id: supabaseMsg.id,
		content: supabaseMsg.content,
		_creationTime: new Date(supabaseMsg.created_at).getTime(),
		messageType: supabaseMsg.message_type,
		sender: {
			_id: senderUser.id,
			image: senderUser.image,
			name: senderUser.name,
			tokenIdentifier: senderUser.token_identifier,
			email: senderUser.email,
			_creationTime: new Date(senderUser.created_at).getTime(),
			isOnline: senderUser.is_online
		}
	};
};
