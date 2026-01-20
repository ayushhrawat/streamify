"use client";

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
import { 
	ImageIcon, 
	Search, 
	X, 
	UserPlus, 
	Edit3, 
	Trash2,
	Settings,
	Users,
	Crown,
	LogOut
} from "lucide-react";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import { useUsers } from "@/hooks/use-users";
import { useSupabase } from "@/providers/supabase-provider";
import { useGroupManagement } from "@/hooks/use-group-management";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupManagementDialogProps {
	trigger?: React.ReactNode;
	conversation: any;
}

const GroupManagementDialog = ({ trigger, conversation }: GroupManagementDialogProps) => {
	const [step, setStep] = useState<'overview' | 'edit-info' | 'add-members'>('overview');
	const [groupName, setGroupName] = useState(conversation?.groupName || conversation?.group_name || "");
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [renderedImage, setRenderedImage] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showLeaveDialog, setShowLeaveDialog] = useState(false);
	const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);

	const imgRef = useRef<HTMLInputElement>(null);
	const dialogCloseRef = useRef<HTMLButtonElement>(null);

	const { currentUser } = useSupabase();
	const { users: allUsers, loading: usersLoading } = useUsers();
	const { setSelectedConversation } = useConversationStore();
	const {
		updateGroupInfo,
		addMembersToGroup,
		deleteGroup,
		leaveGroup,
		loading: groupLoading
	} = useGroupManagement();

	// Check if current user is admin
	const isAdmin = conversation?.admin === currentUser?.id;

	
	// Get current group members
	const groupMembers = useMemo(() => {
		if (!allUsers || !conversation?.participants) return [];
		return allUsers.filter(user => conversation.participants.includes(user.id));
	}, [allUsers, conversation?.participants]);

	// Get users that can be added (not already in group)
	const availableUsers = useMemo(() => {
		if (!allUsers || !conversation?.participants) return [];
		return allUsers.filter(user => !conversation.participants.includes(user.id));
	}, [allUsers, conversation?.participants]);

	// Filter available users based on search
	const filteredAvailableUsers = useMemo(() => {
		if (!searchQuery.trim()) return availableUsers;
		
		return availableUsers.filter((user) => {
			const userName = user.name?.toLowerCase() || '';
			const userEmail = user.email?.toLowerCase() || '';
			const query = searchQuery.toLowerCase();
			
			return userName.includes(query) || userEmail.includes(query);
		});
	}, [availableUsers, searchQuery]);

	// Handle search input
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};

	// Handle search clear
	const handleSearchClear = () => {
		setSearchQuery("");
	};

	// Update group info
	const handleUpdateGroupInfo = async () => {
		if (!groupName.trim()) {
			toast.error("Group name is required");
			return;
		}

		try {
			await updateGroupInfo({
				conversationId: conversation.id || conversation._id,
				groupName: groupName,
				groupImage: selectedImage ? 'new-image-url' : conversation.group_image
			});

			// Update local state
			const updatedConversation = {
				...conversation,
				groupName: groupName,
				group_name: groupName,
			};
			setSelectedConversation(updatedConversation);

			toast.success("Group info updated successfully");
			setStep('overview');
		} catch (error) {
			toast.error("Failed to update group info");
			console.error(error);
		}
	};

	// Leave group
	const handleLeaveGroup = async () => {
		try {
			if (!currentUser?.id) {
				throw new Error('No current user found');
			}

			if (!conversation?.id && !conversation?._id) {
				throw new Error('No conversation ID found');
			}

			const conversationId = conversation.id || conversation._id;
			await leaveGroup(conversationId);

			// Clear selected conversation
			setSelectedConversation(null);
			
			// Close dialog
			if (dialogCloseRef.current) {
				dialogCloseRef.current.click();
			}

			toast.success("You have left the group successfully!");
		} catch (error) {
			console.error('Leave group failed:', error);
			toast.error(`Failed to leave group: ${error?.message || 'Unknown error'}`);
		}
	};

	// Add members to group
	const handleAddMembers = async () => {
		if (selectedNewMembers.length === 0) {
			toast.error("Please select members to add");
			return;
		}

		try {
			const updatedParticipants = await addMembersToGroup({
				conversationId: conversation.id || conversation._id,
				newMemberIds: selectedNewMembers
			});

			// Update local state
			const updatedConversation = {
				...conversation,
				participants: updatedParticipants,
			};
			setSelectedConversation(updatedConversation);

			toast.success(`${selectedNewMembers.length} member(s) added to group`);
			setSelectedNewMembers([]);
			setStep('overview');
		} catch (error) {
			toast.error("Failed to add members");
			console.error(error);
		}
	};

	// Delete group
	const handleDeleteGroup = async () => {
		if (!isAdmin) {
			toast.error("Only admins can delete the group");
			return;
		}

		try {
			await deleteGroup(conversation.id || conversation._id);

			// Clear selected conversation
			setSelectedConversation(null);
			dialogCloseRef.current?.click();

			toast.success("Group deleted successfully");
		} catch (error) {
			toast.error("Failed to delete group");
			console.error(error);
		}
	};

	// Reset form when dialog closes
	const handleDialogClose = () => {
		setStep('overview');
		setGroupName(conversation?.groupName || conversation?.group_name || "");
		setSelectedImage(null);
		setRenderedImage("");
		setSearchQuery("");
		setSelectedNewMembers([]);
		setShowLeaveDialog(false);
	};

	useEffect(() => {
		if (!selectedImage) return setRenderedImage("");
		const reader = new FileReader();
		reader.onload = (e) => setRenderedImage(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	if (!conversation?.isGroup) {
		return null; // Only show for group conversations
	}

	return (
		<>
			<Dialog onOpenChange={(open) => !open && handleDialogClose()}>
				<DialogTrigger asChild>
					{trigger || (
						<Button variant="ghost" size="sm">
							<Settings size={16} />
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogClose ref={dialogCloseRef} />
						<DialogTitle className="flex items-center gap-2">
							<Users size={20} />
							{step === 'overview' && 'Group Settings'}
							{step === 'edit-info' && 'Edit Group Info'}
							{step === 'add-members' && 'Add Members'}
						</DialogTitle>
					</DialogHeader>

					<DialogDescription>
						{step === 'overview' && 'Manage your group settings and members'}
						{step === 'edit-info' && 'Update group name and picture'}
						{step === 'add-members' && 'Add new members to the group'}
					</DialogDescription>

					{/* Overview Step */}
					{step === 'overview' && (
						<div className="space-y-4">
							{/* Group Info */}
							<div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<Avatar className="w-12 h-12">
									<AvatarImage src={conversation.groupImage || conversation.group_image} />
									<AvatarFallback>
										<Users size={20} />
									</AvatarFallback>
								</Avatar>
								<div className="flex-1">
									<h3 className="font-medium">{conversation.groupName || conversation.group_name}</h3>
									<p className="text-sm text-gray-500">{groupMembers.length} members</p>
								</div>
								{isAdmin && (
									<Crown size={16} className="text-yellow-500" title="You are the admin" />
								)}
							</div>

							
							{/* Action Buttons */}
							<div className="space-y-2">
								{/* Admin Actions */}
								{isAdmin && (
									<>
										<Button
											variant="outline"
											className="w-full justify-start"
											onClick={() => setStep('edit-info')}
										>
											<Edit3 size={16} className="mr-2" />
											Edit Group Info
										</Button>
										<Button
											variant="outline"
											className="w-full justify-start"
											onClick={() => setStep('add-members')}
										>
											<UserPlus size={16} className="mr-2" />
											Add Members
										</Button>
										<Button
											variant="destructive"
											className="w-full justify-start"
											onClick={() => setShowDeleteDialog(true)}
										>
											<Trash2 size={16} className="mr-2" />
											Delete Group
										</Button>
									</>
								)}
								
								{/* Leave Group Button */}
								<Button
									variant="outline"
									className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
									onClick={() => setShowLeaveDialog(true)}
								>
									<LogOut size={16} className="mr-2" />
									Leave Group
								</Button>

								{/* Info for non-admins */}
								{!isAdmin && (
									<div className="text-center text-gray-500 py-2">
										<p className="text-xs">Only group admins can manage group settings</p>
									</div>
								)}
							</div>

							{/* Members List */}
							<div>
								<h4 className="font-medium mb-2">Members ({groupMembers.length})</h4>
								<div className="space-y-2 max-h-40 overflow-y-auto">
									{groupMembers.map((member) => (
										<div key={member.id} className="flex items-center gap-3 p-2 rounded">
											<Avatar className="w-8 h-8">
												<AvatarImage src={member.image} />
												<AvatarFallback>{member.name?.[0]}</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<p className="text-sm font-medium">{member.name}</p>
											</div>
											{member.id === conversation.admin && (
												<Crown size={14} className="text-yellow-500" />
											)}
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Edit Info Step */}
					{step === 'edit-info' && (
						<div className="space-y-4">
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
							
							<div>
								<label className='text-sm font-medium mb-2 block'>Group Name</label>
								<Input
									placeholder='Enter group name...'
									value={groupName}
									onChange={(e) => setGroupName(e.target.value)}
									className='w-full'
								/>
							</div>
							
							<div>
								<label className='text-sm font-medium mb-2 block'>Group Image</label>
								<Button 
									variant="outline" 
									className='flex gap-2 w-full' 
									onClick={() => imgRef.current?.click()}
								>
									<ImageIcon size={20} />
									{selectedImage ? 'Change Group Image' : 'Choose Group Image'}
								</Button>
							</div>
						</div>
					)}

					{/* Add Members Step */}
					{step === 'add-members' && (
						<div className="space-y-4">
							{/* Search Users */}
							<div className='relative'>
								<Search
									className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10'
									size={18}
								/>
								<Input
									type='text'
									placeholder='Search users to add...'
									className='pl-10 pr-10 py-2 text-sm w-full'
									value={searchQuery}
									onChange={handleSearchChange}
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

							{/* Selected New Members */}
							{selectedNewMembers.length > 0 && (
								<div className='bg-green-50 dark:bg-green-900/20 p-3 rounded-lg'>
									<p className='text-sm font-medium mb-2'>Selected Users ({selectedNewMembers.length}):</p>
									<div className='flex flex-wrap gap-2'>
										{selectedNewMembers.map(userId => {
											const user = allUsers?.find(u => u.id === userId);
											return (
												<div key={userId} className='bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-xs flex items-center gap-1'>
													{user?.name || 'Unknown User'}
													<button
														onClick={() => setSelectedNewMembers(prev => prev.filter(id => id !== userId))}
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

							{/* Available Users */}
							<div className='flex flex-col gap-2 max-h-60 overflow-y-auto'>
								{filteredAvailableUsers.map((user) => (
									<div
										key={user.id}
										className={`flex gap-3 items-center p-2 rounded cursor-pointer transition-all
										${selectedNewMembers.includes(user.id) ? "bg-green-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
										onClick={() => {
											if (selectedNewMembers.includes(user.id)) {
												setSelectedNewMembers(prev => prev.filter(id => id !== user.id));
											} else {
												setSelectedNewMembers(prev => [...prev, user.id]);
											}
										}}
									>
										<Avatar className='w-8 h-8'>
											<AvatarImage src={user.image} />
											<AvatarFallback>{user.name?.[0]}</AvatarFallback>
										</Avatar>
										<div className='flex-1'>
											<p className='text-sm font-medium'>{user.name}</p>
											<p className='text-xs opacity-70'>{user.email}</p>
										</div>
										{selectedNewMembers.includes(user.id) && (
											<div className='w-5 h-5 bg-white rounded-full flex items-center justify-center'>
												<div className='w-3 h-3 bg-green-600 rounded-full'></div>
											</div>
										)}
									</div>
								))}
								
								{filteredAvailableUsers.length === 0 && !usersLoading && (
									<div className="text-center text-gray-500 py-4">
										<p className="text-sm">
											{searchQuery ? 'No users found' : 'All users are already in this group'}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className='flex justify-between'>
						{step === 'overview' ? (
							<Button variant="outline" onClick={handleDialogClose}>Close</Button>
						) : step === 'edit-info' ? (
							<>
								<Button variant="outline" onClick={() => setStep('overview')}>Back</Button>
								<Button
									onClick={handleUpdateGroupInfo}
									disabled={!groupName.trim() || groupLoading}
								>
									{groupLoading ? (
										<div className='w-4 h-4 border-t-2 border-b-2 rounded-full animate-spin' />
									) : (
										'Save Changes'
									)}
								</Button>
							</>
						) : step === 'add-members' ? (
							<>
								<Button variant="outline" onClick={() => setStep('overview')}>Back</Button>
								<Button
									onClick={handleAddMembers}
									disabled={selectedNewMembers.length === 0 || groupLoading}
								>
									{groupLoading ? (
										<div className='w-4 h-4 border-t-2 border-b-2 rounded-full animate-spin' />
									) : (
										`Add ${selectedNewMembers.length} Member${selectedNewMembers.length === 1 ? '' : 's'}`
									)}
								</Button>
							</>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Group Confirmation Modal */}
			{showDeleteDialog && (
				<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Group</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this group? This action cannot be undone and all messages will be lost.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									handleDeleteGroup();
									setShowDeleteDialog(false);
								}}
								className="bg-red-600 hover:bg-red-700"
							>
								Delete Group
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}

			{/* Leave Group Confirmation Modal */}
			{showLeaveDialog && (
				<div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
						<h2 className="text-lg font-semibold mb-4">Leave Group</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
							{isAdmin 
								? "As an admin, leaving the group will transfer admin rights to another member automatically. Are you sure you want to leave?"
								: "Are you sure you want to leave this group? You will no longer receive messages from this group and will need to be re-added by an admin to rejoin."
							}
						</p>
						<div className="flex justify-end gap-2">
							<Button 
								variant="outline" 
								onClick={() => setShowLeaveDialog(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={() => {
									handleLeaveGroup();
									setShowLeaveDialog(false);
								}}
								className="bg-red-600 hover:bg-red-700 text-white"
							>
								Leave Group
							</Button>
						</div>
					</div>
				</div>
			)}

					</>
	);
};

export default GroupManagementDialog;