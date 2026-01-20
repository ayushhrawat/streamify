import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Crown } from "lucide-react";
import { Conversation } from "@/store/chat-store";
import { useGroupMembers } from "@/hooks/use-users";

type GroupMembersDialogProps = {
	selectedConversation: Conversation;
};

const GroupMembersDialog = ({ selectedConversation }: GroupMembersDialogProps) => {
	const { members: users, loading } = useGroupMembers(
		selectedConversation.id || selectedConversation._id
	);
	return (
		<Dialog>
			<DialogTrigger>
				<p className='text-xs text-muted-foreground text-left'>See members</p>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className='my-2'>Current Members</DialogTitle>
					<DialogDescription>
						{loading && (
							<div className='text-center py-4'>
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
								<p className='text-sm text-gray-500'>Loading members...</p>
							</div>
						)}
						<div className='flex flex-col gap-3 '>
							{!loading && users?.map((user) => (
								<div key={user.id} className={`flex gap-3 items-center p-2 rounded`}>
									<Avatar className='overflow-visible'>
										{user.is_online && (
											<div className='absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-foreground' />
										)}
										<AvatarImage src={user.image} className='rounded-full object-cover' />
										<AvatarFallback>
											<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
										</AvatarFallback>
									</Avatar>

									<div className='w-full '>
										<div className='flex items-center gap-2'>
											<h3 className='text-md font-medium'>
												{user.name || 'User'}
											</h3>
											{user.id === selectedConversation.admin && (
												<Crown size={16} className='text-yellow-400' />
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
};
export default GroupMembersDialog;