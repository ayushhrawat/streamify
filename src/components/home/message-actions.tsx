"use client";

import { IMessage } from "@/store/chat-store";

interface MessageActionsProps {
	message: IMessage;
	fromMe: boolean;
	onDeleteMessage: (messageId: string, deleteForEveryone: boolean) => void;
}

const MessageActions = ({ message, fromMe, onDeleteMessage }: MessageActionsProps) => {
	// Message actions feature is disabled
	return null;
};

export default MessageActions;