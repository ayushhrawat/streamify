import { IMessage, useConversationStore } from "@/store/chat-store";
import ChatBubbleAvatar from "./chat-bubble-avatar";
import DateIndicator from "./date-indicator";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription } from "../ui/dialog";
import ReactPlayer from "react-player";
import ChatAvatarActions from "./chat-avatar-actions";
import { Bot, Palette } from "lucide-react";
import { useSimpleReadStatus } from "@/hooks/use-simple-read-status";
import MessageStatusIndicator, { MessageStatus } from "../ui/message-status";
import LoadingMessage from "../ui/loading-message";
import LoadingImage from "../ui/loading-image";

type ChatBubbleProps = {
	message: IMessage;
	me: any;
	previousMessage?: IMessage;
};

const ChatBubble = ({ me, message, previousMessage }: ChatBubbleProps) => {
	const date = new Date(message._creationTime);
	const hour = date.getHours().toString().padStart(2, "0");
	const minute = date.getMinutes().toString().padStart(2, "0");
	const time = `${hour}:${minute}`;

	const { selectedConversation } = useConversationStore();
	const { isConversationRead, readMessages } = useSimpleReadStatus(selectedConversation?.id || selectedConversation?._id || null);
	
	const isMember = selectedConversation?.participants.includes(message.sender?._id) || false;
	const isGroup = selectedConversation?.isGroup;
	const fromMe = message.sender?._id === me._id || message.sender?._id === me.id;
	
	// Handle both string and object sender types
	const senderName = typeof message.sender === 'string' ? '' : message.sender?.name;
	const senderId = typeof message.sender === 'string' ? message.sender : message.sender?._id;
	
	const fromAI = senderName === "ChatGPT" || senderName === "AI Assistant" || senderId === "ai-assistant";
	const fromAIArtist = senderId === "ai-artist" || senderName === "AI Artist";
	const isAIMessage = fromAI || fromAIArtist;
	
	// Check if this is a loading message
	const isLoadingMessage = message.content === "🤖 Generating response..." || message.content === "🎨 Generating image...";
	const isAILoadingMessage = message.content === "🤖 Generating response...";
	const isImageLoadingMessage = message.content === "🎨 Generating image...";
	
	const bgClass = fromMe ? "bg-blue-500 text-white" : !isAIMessage ? "bg-white dark:bg-gray-primary border border-gray-200 dark:border-gray-600" : "bg-blue-500 text-white";

	// Check if this conversation has been read by the receiver
	const conversationIsRead = fromMe && selectedConversation && isConversationRead(selectedConversation.id || selectedConversation._id);

	// Force re-render when read status changes
	const [, forceUpdate] = useState(0);
	useEffect(() => {
		forceUpdate(prev => prev + 1);
	}, [readMessages]);

	// Determine message status based on conversation read status
	const getMessageStatus = useMemo((): MessageStatus => {
		if (!fromMe) return 'read'; // Don't show status for received messages
		
		// Check if message is still being sent (temporary ID)
		if (message._id.startsWith('temp-') || message._id.startsWith('optimistic-')) return 'sending';
		
		// Show 'read' when receiver has opened the conversation
		if (conversationIsRead) return 'read';
		
		// For very recent messages (less than 3 seconds old), show as sent
		const messageAge = Date.now() - new Date(message._creationTime).getTime();
		if (messageAge < 3000) return 'sent';
		
		// Message has been sent and delivered but not read yet
		return 'delivered';
	}, [fromMe, message._id, message._creationTime, conversationIsRead, readMessages]);

	const [open, setOpen] = useState(false);

	const renderMessageContent = () => {
		// Handle loading messages with special animations
		if (isLoadingMessage) {
			if (isAILoadingMessage) {
				return <LoadingMessage message="Generating response..." className="py-1" />;
			} else if (isImageLoadingMessage) {
				return <LoadingImage message="Generating image..." className="py-1" />;
			}
		}

		// Handle regular messages
		switch (message.messageType) {
			case "text":
				return <TextMessage message={message} />;
			case "image":
				return <ImageMessage message={message} handleClick={() => setOpen(true)} />;
			case "video":
				return <VideoMessage message={message} />;
			default:
				return null;
		}
	};

	if (!fromMe) {
		return (
			<>
				<DateIndicator message={message} previousMessage={previousMessage} />
				<div className='flex gap-1 w-2/3 group'>
					<ChatBubbleAvatar isGroup={isGroup} isMember={isMember} message={message} fromAI={isAIMessage} />
					<div className={`flex flex-col z-20 max-w-fit px-2 pt-1 rounded-md shadow-md relative ${bgClass}`}>
						{!isAIMessage && <OtherMessageIndicator />}
						{fromAI && <Bot size={16} className='absolute bottom-[2px] left-2 text-white' />}
						{fromAIArtist && <Palette size={16} className='absolute bottom-[2px] left-2 text-white' />}
						{!isLoadingMessage && <ChatAvatarActions message={message} me={me} />}
						{renderMessageContent()}
						{open && <ImageDialog src={message.content} open={open} onClose={() => setOpen(false)} />}
						{!isLoadingMessage && (
							<MessageTime 
								time={time} 
								fromMe={fromMe} 
								messageStatus={getMessageStatus}
							/>
						)}
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<DateIndicator message={message} previousMessage={previousMessage} />

			<div className='flex gap-1 w-2/3 ml-auto group'>
				<div className={`flex flex-col z-20 max-w-fit px-2 pt-1 rounded-md shadow-md ml-auto relative ${bgClass}`}>
					<SelfMessageIndicator />
					{renderMessageContent()}
					{open && <ImageDialog src={message.content} open={open} onClose={() => setOpen(false)} />}
					<MessageTime 
						time={time} 
						fromMe={fromMe} 
						messageStatus={getMessageStatus}
					/>
				</div>
			</div>
		</>
	);
};
export default ChatBubble;

const VideoMessage = ({ message }: { message: IMessage }) => {
	return <ReactPlayer url={message.content} width='250px' height='250px' controls={true} light={true} />;
};

const ImageMessage = ({ message, handleClick }: { message: IMessage; handleClick: () => void }) => {
	return (
		<div className='w-[250px] h-[250px] m-2 relative'>
			<Image
				src={message.content}
				fill
				className='cursor-pointer object-cover rounded'
				alt='image'
				onClick={handleClick}
			/>
		</div>
	);
};

const ImageDialog = ({ src, onClose, open }: { open: boolean; src: string; onClose: () => void }) => {
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className='min-w-[750px]'>
				<DialogDescription className='relative h-[450px] flex justify-center'>
					<Image src={src} fill className='rounded-lg object-contain' alt='image' />
				</DialogDescription>
			</DialogContent>
		</Dialog>
	);
};

const MessageTime = ({ 
	time, 
	fromMe, 
	messageStatus
}: { 
	time: string; 
	fromMe: boolean; 
	messageStatus?: MessageStatus;
}) => {
	return (
		<p className='text-[10px] mt-2 self-end flex gap-2 items-center'>
			{time} 
			{fromMe && messageStatus && (
				<MessageStatusIndicator 
					status={messageStatus} 
					size="sm"
				/>
			)}
		</p>
	);
};

const OtherMessageIndicator = () => (
	<div className='absolute bg-white dark:bg-gray-primary top-0 -left-[4px] w-3 h-3 rounded-bl-full' />
);

const SelfMessageIndicator = () => (
	<div className='absolute bg-blue-500 top-0 -right-[3px] w-3 h-3 rounded-br-full overflow-hidden' />
);

const TextMessage = ({ message }: { message: IMessage }) => {
	const isLink = /^(ftp|http|https):\/\/[^ "]+$/.test(message.content); // Check if the content is a URL

	return (
		<div>
			{isLink ? (
				<a
					href={message.content}
					target='_blank'
					rel='noopener noreferrer'
					className={`mr-2 text-sm font-light text-blue-400 underline`}
				>
					{message.content}
				</a>
			) : (
				<p className={`mr-2 text-sm font-light`}>{message.content}</p>
			)}
		</div>
	);
};