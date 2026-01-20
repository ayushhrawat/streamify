import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ImageIcon, Plus, Video, Bot, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Image from "next/image";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import { useSendMessage } from "@/hooks/use-messages";
import { useSupabase } from "@/providers/supabase-provider";
import { useConversationUpdates } from "@/hooks/use-conversation-updates";
import { useAIAssistant } from "@/hooks/use-ai-assistant";
import { useImageGeneration } from "@/hooks/use-image-generation";

const MediaDropdown = () => {
	const imageInput = useRef<HTMLInputElement>(null);
	const videoInput = useRef<HTMLInputElement>(null);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
	const [showAIDialog, setShowAIDialog] = useState(false);
	const [aiQuestion, setAiQuestion] = useState("");
	const [showImageGenDialog, setShowImageGenDialog] = useState(false);
	const [imagePrompt, setImagePrompt] = useState("");

	const [isLoading, setIsLoading] = useState(false);

	const { selectedConversation } = useConversationStore();
	const { sendImageMessage, sendVideoMessage, loading: sendLoading } = useSendMessage();
	const { currentUser } = useSupabase();
	const { triggerUpdate } = useConversationUpdates();

	// Use AI assistant and image generation hooks
	const { askAI, isGenerating: isAskingAI } = useAIAssistant();
	const { generateImage, isGenerating: isGeneratingImage } = useImageGeneration();

	const handleSendImage = async () => {
		if (!selectedImage || !selectedConversation || !currentUser) return;
		
		setIsLoading(true);
		try {
			await sendImageMessage({
				conversationId: selectedConversation.id || selectedConversation._id,
				imageFile: selectedImage
			});
			setSelectedImage(null);
			toast.success("Image sent successfully!");
		} catch (err) {
			console.error('Error sending image:', err);
			toast.error("Failed to send image");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSendVideo = async () => {
		if (!selectedVideo || !selectedConversation || !currentUser) return;
		
		setIsLoading(true);
		try {
			await sendVideoMessage({
				conversationId: selectedConversation.id || selectedConversation._id,
				videoFile: selectedVideo
			});
			setSelectedVideo(null);
			toast.success("Video sent successfully!");
		} catch (error) {
			console.error('Error sending video:', error);
			toast.error("Failed to send video");
		} finally {
			setIsLoading(false);
		}
	};

	// Function to ask AI using the hook
	const handleAskAI = async () => {
		if (!aiQuestion.trim()) return;
		
		const success = await askAI(aiQuestion.trim());
		if (success) {
			// Close dialog and reset
			setShowAIDialog(false);
			setAiQuestion("");
		}
	};

	// Function to generate AI image using the hook
	const handleGenerateImage = async () => {
		if (!imagePrompt.trim()) return;
		
		const success = await generateImage(imagePrompt.trim());
		if (success) {
			// Close dialog and reset
			setShowImageGenDialog(false);
			setImagePrompt("");
		}
	};

	return (
		<>
			<input
				type='file'
				ref={imageInput}
				accept='image/*'
				onChange={(e) => setSelectedImage(e.target.files![0])}
				hidden
			/>

			<input
				type='file'
				ref={videoInput}
				accept='video/mp4'
				onChange={(e) => setSelectedVideo(e.target?.files![0])}
				hidden
			/>

			{selectedImage && (
				<MediaImageDialog
					isOpen={selectedImage !== null}
					onClose={() => setSelectedImage(null)}
					selectedImage={selectedImage}
					isLoading={isLoading}
					handleSendImage={handleSendImage}
				/>
			)}

			{selectedVideo && (
				<MediaVideoDialog
					isOpen={selectedVideo !== null}
					onClose={() => setSelectedVideo(null)}
					selectedVideo={selectedVideo}
					isLoading={isLoading}
					handleSendVideo={handleSendVideo}
				/>
			)}

			{/* AI Dialog */}
			<Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Bot className="text-blue-600" size={20} />
							Ask AI Assistant
						</DialogTitle>
					</DialogHeader>
					<DialogDescription className="space-y-4">
						<div>
							<Input
								placeholder="What would you like to ask the AI?"
								value={aiQuestion}
								onChange={(e) => setAiQuestion(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleAskAI();
									}
								}}
								className="w-full"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button 
								variant="outline" 
								onClick={() => {
									setShowAIDialog(false);
									setAiQuestion("");
								}}
							>
								Cancel
							</Button>
							<Button 
								onClick={handleAskAI}
								disabled={!aiQuestion.trim() || isAskingAI}
								className="bg-blue-600 hover:bg-blue-700"
							>
								{isAskingAI ? (
									<div className='w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2' />
								) : (
									<Bot size={16} className="mr-2" />
								)}
								Ask AI
							</Button>
						</div>
					</DialogDescription>
				</DialogContent>
			</Dialog>

			{/* Image Generation Dialog */}
			<Dialog open={showImageGenDialog} onOpenChange={setShowImageGenDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Palette className="text-purple-600" size={20} />
							Generate AI Image
						</DialogTitle>
					</DialogHeader>
					<DialogDescription className="space-y-4">
						<div>
							<Input
								placeholder="Describe the image you want to generate..."
								value={imagePrompt}
								onChange={(e) => setImagePrompt(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleGenerateImage();
									}
								}}
								className="w-full"
							/>
							<p className="text-xs text-gray-500 mt-2">
								Example: "A beautiful sunset over mountains", "A cute cat wearing sunglasses"
							</p>
						</div>
						<div className="flex justify-end gap-2">
							<Button 
								variant="outline" 
								onClick={() => {
									setShowImageGenDialog(false);
									setImagePrompt("");
								}}
							>
								Cancel
							</Button>
							<Button 
								onClick={handleGenerateImage}
								disabled={!imagePrompt.trim() || isGeneratingImage}
								className="bg-purple-600 hover:bg-purple-700"
							>
								{isGeneratingImage ? (
									<div className='w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2' />
								) : (
									<Palette size={16} className="mr-2" />
								)}
								Generate Image
							</Button>
						</div>
					</DialogDescription>
				</DialogContent>
			</Dialog>

			<DropdownMenu>
				<DropdownMenuTrigger>
					<Plus className='text-gray-600 dark:text-gray-400' />
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => imageInput.current!.click()}>
						<ImageIcon size={18} className='mr-1' /> Photo
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => videoInput.current!.click()}>
						<Video size={20} className='mr-1' />
						Video
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setShowImageGenDialog(true)}>
						<Palette size={18} className='mr-1 text-purple-600' />
						Generate Image
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setShowAIDialog(true)}>
						<Bot size={18} className='mr-1 text-blue-600' />
						Ask AI
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
export default MediaDropdown;

type MediaImageDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	selectedImage: File;
	isLoading: boolean;
	handleSendImage: () => void;
};

const MediaImageDialog = ({ isOpen, onClose, selectedImage, isLoading, handleSendImage }: MediaImageDialogProps) => {
	const [renderedImage, setRenderedImage] = useState<string | null>(null);

	useEffect(() => {
		if (!selectedImage) return;
		const reader = new FileReader();
		reader.onload = (e) => setRenderedImage(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent>
				<DialogDescription className='flex flex-col gap-10 justify-center items-center'>
					{renderedImage && <Image src={renderedImage} width={300} height={300} alt='selected image' />}
					<Button className='w-full' disabled={isLoading} onClick={handleSendImage}>
						Send
					</Button>
				</DialogDescription>
			</DialogContent>
		</Dialog>
	);
};

type MediaVideoDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	selectedVideo: File;
	isLoading: boolean;
	handleSendVideo: () => void;
};

const MediaVideoDialog = ({ isOpen, onClose, selectedVideo, isLoading, handleSendVideo }: MediaVideoDialogProps) => {
	const renderedVideo = URL.createObjectURL(new Blob([selectedVideo], { type: "video/mp4" }));

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent>
				<DialogDescription>Video</DialogDescription>
				<div className='w-full'>
					{renderedVideo && <ReactPlayer url={renderedVideo} controls width='100%' />}
				</div>
				<Button className='w-full' disabled={isLoading} onClick={handleSendVideo}>
					Send
				</Button>
			</DialogContent>
		</Dialog>
	);
};