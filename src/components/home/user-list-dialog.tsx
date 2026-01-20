import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageIcon, MessageSquareDiff, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { useConversationStore, convertSupabaseConversation } from "@/store/chat-store";
import { useUsers } from "@/hooks/use-users";
import { useCreateConversation, useConversations } from "@/hooks/use-conversations";
import { useSupabase } from "@/providers/supabase-provider";
import { useConversationRefresh } from "@/contexts/conversation-refresh-context";

interface UserListDialogProps {
	trigger?: React.ReactNode;
}

const UserListDialog = ({ trigger }: UserListDialogProps) => {
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const [groupName, setGroupName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [renderedImage, setRenderedImage] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [step, setStep] = useState<'select-users' | 'configure-group'>('select-users');

	const imgRef = useRef<HTMLInputElement>(null);
	const dialogCloseRef = useRef<HTMLButtonElement>(null);

	// Use Supabase hooks
	const { currentUser } = useSupabase();
	const { users: userList, loading: usersLoading } = useUsers();
	const { createConversation, loading: createLoading } = useCreateConversation();
	const { refetch: refetchConversations } = useConversations();
	const { triggerRefresh: triggerConversationRefresh } = useConversationRefresh();

	const { setSelectedConversation } = useConversationStore();

	// Filter users based on search query
	const filteredUsers = useMemo(() => {
		if (!userList) return [];
		
		if (!searchQuery.trim()) {
			return userList;
		}
		
		return userList.filter((user) => {
			const userName = user.name?.toLowerCase() || '';
			const userEmail = user.email?.toLowerCase() || '';
			const query = searchQuery.toLowerCase();
			
			return userName.includes(query) || userEmail.includes(query);
		});
	}, [userList, searchQuery]);

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

	const handleNextStep = () => {
		if (selectedUsers.length === 0) return;
		
		const isGroup = selectedUsers.length > 1;
		
		if (isGroup) {
			// For groups, go to configuration step
			setStep('configure-group');
		} else {
			// For 1-on-1 chats, create immediately
			handleCreateConversation();
		}
	};

	const handleCreateConversation = async () => {
		if (selectedUsers.length === 0 || !currentUser) return;
		setIsLoading(true);

		try {
			const isGroup = selectedUsers.length > 1;
			
			// For groups, require group name
			if (isGroup && !groupName.trim()) {
				toast.error("Please enter a group name");
				setIsLoading(false);
				return;
			}
			
			console.log('Creating conversation with participants:', selectedUsers);
			
			// Create conversation
			const conversationId = await createConversation({
				participants: selectedUsers,
				isGroup,
				groupName: isGroup ? groupName : undefined,
				groupImage: selectedImage ? 'placeholder-group-image' : undefined
			});

			console.log('Conversation created with ID:', conversationId);
			
			// Force immediate refresh of conversations
			await refetchConversations();
			triggerConversationRefresh();
			
			// Close dialog and reset form after successful creation
			dialogCloseRef.current?.click();
			
			toast.success(
				isGroup ? `Group "${groupName}" created successfully` : "Conversation created successfully"
			);
		} catch (error) {
			toast.error("Failed to create conversation");
			console.error('Conversation creation error:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackToUserSelection = () => {
		setStep('select-users');
	};

	useEffect(() => {
		if (!selectedImage) return setRenderedImage("");
		const reader = new FileReader();
		reader.onload = (e) => setRenderedImage(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	// Reset form when dialog closes
	const handleDialogClose = () => {
		setSelectedUsers([]);
		setGroupName("");
		setSelectedImage(null);
		setSearchQuery("");
		setRenderedImage("");
		setStep('select-users');
	};

	return (
		<Dialog onOpenChange={(open) => !open && handleDialogClose()}>
			<DialogTrigger data-testid="new-chat-button">
				{trigger || <MessageSquareDiff size={20} />}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogClose ref={dialogCloseRef} />
					<DialogTitle>
						{step === 'select-users' ? 'SELECT USERS' : 'CREATE GROUP'}
					</DialogTitle>
				</DialogHeader>

				<DialogDescription>
					{step === 'select-users' 
						? 'Choose users to start a conversation' 
						: 'Configure your group settings'
					}
				</DialogDescription>

				{step === 'configure-group' && (
					<>
						{renderedImage && (
							<div className='w-16 h-16 relative mx-auto'>
								<Image src={renderedImage} fill alt='group image' className='rounded-full object-cover' />
							</div>
						)}
						<input
							type='file'
							accept='image/*'
							ref={imgRef}
							hidden
							onChange={(e) => setSelectedImage(e.target.files![0])}
						/>
						
						<div className='space-y-4'>
							<div>
								<label className='text-sm font-medium mb-2 block'>Group Name *</label>
								<Input
									placeholder='Enter group name...'
									value={groupName}
									onChange={(e) => setGroupName(e.target.value)}
									className='w-full'
								/>
							</div>
							
							<div>
								<label className='text-sm font-medium mb-2 block'>Group Image (Optional)</label>
								<Button 
									variant="outline" 
									className='flex gap-2 w-full' 
									onClick={() => imgRef.current?.click()}
								>
									<ImageIcon size={20} />
									{selectedImage ? 'Change Group Image' : 'Choose Group Image'}
								</Button>
							</div>
							
							<div className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg'>
								<p className='text-sm font-medium mb-2'>Selected Users ({selectedUsers.length}):</p>
								<div className='flex flex-wrap gap-2'>
									{selectedUsers.map(userId => {
									const user = userList?.find(u => u.token_identifier === userId);
									return (
									<div key={userId} className='bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs'>
									{user?.name || 'Unknown User'}
									</div>
									);
									})}
								</div>
							</div>
						</div>
					</>
				)}
				
				{step === 'select-users' && (
					<>
						{/* Search Users */}
						<div className='relative'>
							<Search
								className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10'
								size={18}
							/>
							<Input
								type='text'
								placeholder='Search users by name or email...'
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
						
						{!currentUser && (
							<div className='bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-2 rounded'>
								⚠️ Please sign in to view users
							</div>
						)}
						
						{selectedUsers.length > 0 && (
							<div className='bg-green-50 dark:bg-green-900/20 p-3 rounded-lg'>
								<p className='text-sm font-medium mb-2'>Selected Users ({selectedUsers.length}):</p>
								<div className='flex flex-wrap gap-2'>
									{selectedUsers.map(userId => {
									const user = userList?.find(u => u.token_identifier === userId);
									return (
									<div key={userId} className='bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-xs flex items-center gap-1'>
									{user?.name || 'Unknown User'}
									<button
									onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
									className='text-red-500 hover:text-red-700 ml-1'
									>
									<X size={12} />
									</button>
									</div>
									);
									})}
								</div>
							</div>
						)}
						
						<div className='flex flex-col gap-3 overflow-auto max-h-60'>
					{usersLoading && (
						<div className='text-center text-gray-500 py-4'>
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
							Loading users...
						</div>
					)}
					
					{/* Search results message */}
					{searchQuery.trim() && !usersLoading && (
						<div className='px-3 py-2'>
							<div className='bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded'>
								{filteredUsers.length > 0 
									? `Found ${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} matching "${searchQuery}"`
									: `No users found matching "${searchQuery}"`
								}
							</div>
						</div>
					)}
					
					{filteredUsers && filteredUsers.length > 0 ? (
						filteredUsers.map((user) => (
							<div
								key={user.token_identifier}
								className={`flex gap-3 items-center p-2 rounded cursor-pointer active:scale-95 
									transition-all ease-in-out duration-300
								${selectedUsers.includes(user.token_identifier) ? "bg-green-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
								onClick={() => {
									if (selectedUsers.includes(user.token_identifier)) {
										setSelectedUsers(selectedUsers.filter((id) => id !== user.token_identifier));
									} else {
										setSelectedUsers([...selectedUsers, user.token_identifier]);
									}
								}}
							>
								<Avatar className='overflow-visible'>
									{user.is_online && (
										<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-foreground' />
									)}

									<AvatarImage src={user.image} className='rounded-full object-cover' />
									<AvatarFallback>
										<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
									</AvatarFallback>
								</Avatar>

								<div className='w-full '>
								<div className='flex items-center justify-between'>
								<p className='text-md font-medium'>{user.name || 'User'}</p>
								{selectedUsers.includes(user.token_identifier) && (
								<div className='w-5 h-5 bg-white rounded-full flex items-center justify-center'>
								<div className='w-3 h-3 bg-green-600 rounded-full'></div>
								</div>
								)}
								</div>
								</div>
							</div>
						))
					) : !usersLoading && userList && userList.length === 0 ? (
						<div className='text-center text-gray-500 py-8'>
							<p className='text-lg mb-2'>No other users found</p>
							<p className='text-sm'>Invite friends to start chatting!</p>
						</div>
					) : !usersLoading && searchQuery.trim() && filteredUsers.length === 0 ? (
						<div className='text-center text-gray-500 py-8'>
							<p className='text-lg mb-2'>No users found</p>
							<p className='text-sm'>Try a different search term</p>
						</div>
					) : null}
						</div>
					</>
				)}
				
				<div className='flex justify-between'>
					{step === 'select-users' ? (
						<>
							<Button variant={"outline"} onClick={handleDialogClose}>Cancel</Button>
							<Button
								onClick={handleNextStep}
								disabled={selectedUsers.length === 0}
							>
								{selectedUsers.length > 1 ? 'Next' : 'Create Chat'}
							</Button>
						</>
					) : (
						<>
							<Button variant={"outline"} onClick={handleBackToUserSelection}>Back</Button>
							<Button
								onClick={handleCreateConversation}
								disabled={!groupName.trim() || isLoading || createLoading}
							>
								{(isLoading || createLoading) ? (
									<div className='w-5 h-5 border-t-2 border-b-2  rounded-full animate-spin' />
								) : (
									"Create Group"
								)}
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
export default UserListDialog;