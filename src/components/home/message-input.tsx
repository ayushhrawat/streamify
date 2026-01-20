import { Laugh, Mic, Plus, Send, Bot } from "lucide-react";
import { Input } from "../ui/input";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { useConversationStore } from "@/store/chat-store";
import toast from "react-hot-toast";
import useComponentVisible from "@/hooks/useComponentVisible";
import EmojiPicker, { Theme } from "emoji-picker-react";
import MediaDropdown from "./media-dropdown";
import { useSendSocketMessage } from "@/hooks/use-socket-messages";
import { useDirectMessages } from "@/hooks/use-direct-messages";
import { useSupabase } from "@/providers/supabase-provider";
import { useConversationUpdates } from "@/hooks/use-conversation-updates";
import { useInstantTyping } from "@/hooks/use-realtime-instant";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { useAIAssistant } from "@/hooks/use-ai-assistant";

const MessageInput = () => {
	const [msgText, setMsgText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const { selectedConversation } = useConversationStore();
	const { ref, isComponentVisible, setIsComponentVisible } = useComponentVisible(false);
	const { sendTextMessage } = useSendSocketMessage();
	const { sendMessage: sendDirectMessage } = useDirectMessages();
	const { currentUser } = useSupabase();
	const { triggerUpdate } = useConversationUpdates();
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	
	// Use INSTANT typing system
	const { startTyping, stopTyping } = useInstantTyping(
		selectedConversation ? (selectedConversation.id || selectedConversation._id) : null
	);

	// Use image generation hook
	const { generateImage, isGenerating } = useImageGeneration();

	// Use AI assistant hook
	const { askAI, isGenerating: isAskingAI } = useAIAssistant();

	const handleSendTextMsg = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!msgText.trim() || !selectedConversation || !currentUser || isSending) {
			return;
		}
		
		// Stop typing indicator when sending message
		stopTyping();
		
		const messageContent = msgText.trim();
		setIsSending(true);
		
		try {
			// Check for image generation commands
			const isImageCommand = messageContent.toLowerCase().startsWith('/generate') || 
								  messageContent.toLowerCase().startsWith('/img') ||
								  messageContent.toLowerCase().startsWith('/image');
			
			// Check if message starts with @ai or @gpt
			const isAICommand = messageContent.toLowerCase().startsWith('@ai') || 
							   messageContent.toLowerCase().startsWith('@gpt');
			
			if (isImageCommand) {
				// Extract the image prompt (remove the command prefix)
				const prompt = messageContent.replace(/^\/(generate|img|image)\s*/i, '').trim();
				if (prompt) {
					// Clear input immediately for better UX
					setMsgText("");
					
					// Send user's prompt message
					try {
						await sendTextMessage({
							conversationId: selectedConversation.id || selectedConversation._id,
							content: messageContent
						});
					} catch (error) {
						await sendDirectMessage({
							conversationId: selectedConversation.id || selectedConversation._id,
							content: messageContent,
							messageType: 'text'
						});
					}
					
					// Generate the image
					await generateImage(prompt);
				} else {
					toast.error("Please provide a description for the image to generate");
				}
			} else if (isAICommand) {
				// Extract the actual question (remove the @ai/@gpt prefix)
				const question = messageContent.replace(/^@(ai|gpt)\s*/i, '').trim();
				const finalQuestion = question || "Hello! How can I help you today?";
				
				// Clear input immediately for better UX
				setMsgText("");
				
				// Send user's message
				try {
					await sendTextMessage({
						conversationId: selectedConversation.id || selectedConversation._id,
						content: messageContent
					});
				} catch (error) {
					await sendDirectMessage({
						conversationId: selectedConversation.id || selectedConversation._id,
						content: messageContent,
						messageType: 'text'
					});
				}
				
				// Ask AI with the cleaned question
				await askAI(finalQuestion);
			} else {
				// Clear input immediately for better UX
				setMsgText("");
				
				// Regular message - Try Socket.IO first, fallback to direct database method
				try {
					await sendTextMessage({
						conversationId: selectedConversation.id || selectedConversation._id,
						content: messageContent
					});
				} catch (socketError) {
					await sendDirectMessage({
						conversationId: selectedConversation.id || selectedConversation._id,
						content: messageContent,
						messageType: 'text'
					});
				}
			}
			
			// Immediate conversation update
			triggerUpdate();
			
		} catch (error) {
			console.error('Error sending message:', error);
			toast.error("Failed to send message");
		} finally {
			setIsSending(false);
		}
	};

	// Function to handle AI button click
	const handleAIClick = async () => {
		if (!selectedConversation || !currentUser || isSending) return;
		
		const question = msgText.trim() || "Hello! How can I help you today?";
		setIsSending(true);
		
		try {
			// Send user's message first if there's text
			if (msgText.trim()) {
				// Clear input immediately
				setMsgText("");
				
				try {
					await sendTextMessage({
						conversationId: selectedConversation.id || selectedConversation._id,
						content: question
					});
				} catch (socketError) {
					await sendDirectMessage({
						conversationId: selectedConversation.id || selectedConversation._id,
						content: question,
						messageType: 'text'
					});
				}
			}
			
			// Ask AI
			await askAI(question);
		} catch (error) {
			console.error('Error with AI:', error);
			toast.error("Failed to send message to AI");
		} finally {
			setIsSending(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setMsgText(value);

		if (!selectedConversation) return;

		// Clear existing timeout
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// Start typing indicator if user is typing (INSTANT)
		if (value.trim()) {
			startTyping();
			
			// Stop typing indicator after 1 second of inactivity (more responsive)
			typingTimeoutRef.current = setTimeout(() => {
				stopTyping();
			}, 1000);
		} else {
			// Stop typing immediately if input is empty
			stopTyping();
		}
	};

	// Handle key press for more responsive typing indicators
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!selectedConversation) return;

		// Clear existing timeout on any key press
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// Start typing indicator on any key press (except Enter when sending)
		if (e.key !== 'Enter' && msgText.trim()) {
			startTyping();
			
			// Reset timeout (reduced for instant feel)
			typingTimeoutRef.current = setTimeout(() => {
				stopTyping();
			}, 1000);
		}
	};

	// Stop typing when user stops interacting with input
	const handleInputBlur = () => {
		if (!selectedConversation) return;
		
		// Clear timeout and stop typing when input loses focus
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}
		stopTyping();
	};

	// Cleanup typing timeout on unmount
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, []);

	// Check if message starts with AI command or image generation command
	const isAICommand = msgText.toLowerCase().startsWith('@ai') || 
					   msgText.toLowerCase().startsWith('@gpt');
	const isImageCommand = msgText.toLowerCase().startsWith('/generate') || 
						  msgText.toLowerCase().startsWith('/img') ||
						  msgText.toLowerCase().startsWith('/image');

	return (
		<div className='bg-gray-primary p-2 flex gap-4 items-center'>
			<div className='relative flex gap-2 ml-2'>
				{/* EMOJI PICKER */}
				<div ref={ref} onClick={() => setIsComponentVisible(true)}>
					{isComponentVisible && (
						<EmojiPicker
							theme={Theme.DARK}
							onEmojiClick={(emojiObject) => {
								setMsgText((prev) => prev + emojiObject.emoji);
							}}
							style={{ position: "absolute", bottom: "1.5rem", left: "1rem", zIndex: 50 }}
						/>
					)}
					<Laugh className='text-gray-600 dark:text-gray-400' />
				</div>
				<MediaDropdown />
			</div>
			<form onSubmit={handleSendTextMsg} className='w-full flex gap-3'>
				<div className='flex-1'>
					<Input
						type='text'
						placeholder='Type a message, @ai to ask AI, or /generate to create images...'
						className={`py-2 text-sm w-full rounded-lg shadow-sm focus-visible:ring-transparent ${
							isAICommand 
								? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' 
								: isImageCommand
								? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
								: 'bg-gray-tertiary'
						}`}
						value={msgText}
						onChange={handleInputChange}
						onKeyDown={handleKeyPress}
						onBlur={handleInputBlur}
						disabled={isSending}
					/>
				</div>
				<div className='mr-4 flex items-center gap-3'>
					{/* AI Button */}
					<Button
						type='button'
						size={"sm"}
						disabled={isAskingAI || isSending}
						onClick={handleAIClick}
						className='bg-blue-600 hover:bg-blue-700 text-white'
						title="Ask AI Assistant"
					>
						{isAskingAI ? (
							<div className='w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin' />
						) : (
							<Bot size={16} />
						)}
					</Button>

					{/* Send Button */}
					{msgText.length > 0 ? (
						<Button
							type='submit'
							size={"sm"}
							disabled={isSending || isGenerating || isAskingAI}
							className={`bg-transparent hover:bg-transparent ${
								isAICommand ? 'text-blue-600' : 
								isImageCommand ? 'text-purple-600' : 'text-foreground'
							}`}
						>
							{isSending ? (
								<div className='w-4 h-4 border-t-2 border-b-2 border-foreground rounded-full animate-spin' />
							) : (
								<Send />
							)}
						</Button>
					) : (
						<Button
							type='submit'
							size={"sm"}
							className='bg-transparent text-foreground hover:bg-transparent'
							disabled={isSending}
						>
							<Mic />
						</Button>
					)}
				</div>
			</form>

			{/* Command Indicators */}
			{isAICommand && (
				<div className="absolute bottom-full left-4 mb-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
					🤖 AI command detected
				</div>
			)}
			{isImageCommand && (
				<div className="absolute bottom-full left-4 mb-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">
					🎨 Image generation command detected
				</div>
			)}
		</div>
	);
};
export default MessageInput;