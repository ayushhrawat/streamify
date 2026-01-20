"use client";

import { useState, useCallback } from "react";
import { MoreVertical, Palette, Users, Mail, Info, Github } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ThemeSwitch from "./theme-switch";
import UserListDialog from "./user-list-dialog";

const SettingsMenu = () => {
	const [contactDialogOpen, setContactDialogOpen] = useState(false);
	const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	// Use useCallback to prevent unnecessary re-renders and ensure clean state management
	const handleContactDeveloper = useCallback(() => {
		setDropdownOpen(false); // Close dropdown first
		// Small delay to prevent conflicts between dropdown and dialog
		setTimeout(() => {
			setContactDialogOpen(true);
		}, 150);
	}, []);

	const handleAboutUs = useCallback(() => {
		setDropdownOpen(false); // Close dropdown first
		// Small delay to prevent conflicts between dropdown and dialog
		setTimeout(() => {
			setAboutDialogOpen(true);
		}, 150);
	}, []);

	const handleCloseContactDialog = useCallback((open: boolean) => {
		setContactDialogOpen(open);
	}, []);

	const handleCloseAboutDialog = useCallback((open: boolean) => {
		setAboutDialogOpen(open);
	}, []);

	const handleEmailClick = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			window.open('mailto:rawatayush412@gmail.com', '_blank');
		} catch (error) {
			console.error('Failed to open email client:', error);
		}
	}, []);

	const handleGithubClick = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			window.open('https://github.com/ayushhrawat', '_blank');
		} catch (error) {
			console.error('Failed to open GitHub:', error);
		}
	}, []);

	return (
		<>
			<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
				<DropdownMenuTrigger asChild>
					<button 
						className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						aria-label="Settings menu"
						type="button"
					>
						<MoreVertical size={20} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent 
					align="end" 
					side="bottom"
					className="w-56 max-h-[70vh] overflow-y-auto z-[100]"
					sideOffset={8}
					alignOffset={-10}
				>
					<div className="px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
						<Info size={14} />
						Settings
					</div>
					<DropdownMenuSeparator />
					
					{/* Theme Section */}
					<div className="px-2 py-1">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Palette size={14} />
								<span className="text-sm">Theme</span>
							</div>
							<ThemeSwitch />
						</div>
					</div>
					
					<DropdownMenuSeparator />
					
					{/* New Group */}
					<UserListDialog 
						trigger={
							<DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-sm py-1">
								<Users size={14} />
								New Group
							</DropdownMenuItem>
						}
					/>
					
					<DropdownMenuSeparator />
					
					{/* Contact Developer */}
					<DropdownMenuItem 
						onClick={handleContactDeveloper}
						className="flex items-center gap-2 cursor-pointer text-sm py-1"
					>
						<Mail size={14} />
						Contact Developer
					</DropdownMenuItem>
					
					{/* About Us */}
					<DropdownMenuItem 
						onClick={handleAboutUs}
						className="flex items-center gap-2 cursor-pointer text-sm py-1"
					>
						<Info size={14} />
						About Us
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Contact Developer Dialog */}
			<Dialog open={contactDialogOpen} onOpenChange={handleCloseContactDialog}>
				<DialogContent className="sm:max-w-md z-[200]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Mail size={20} />
							Contact Developer
						</DialogTitle>
						<DialogDescription>
							Get in touch with the developer through these channels
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-4">
						{/* Email */}
						<Button
							variant="outline"
							className="flex items-center gap-3 justify-start h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
							onClick={handleEmailClick}
							type="button"
						>
							<Mail size={20} className="text-blue-600" />
							<div className="text-left">
								<div className="font-medium">Email</div>
								<div className="text-sm text-gray-500">rawatayush412@gmail.com</div>
							</div>
						</Button>

						{/* GitHub */}
						<Button
							variant="outline"
							className="flex items-center gap-3 justify-start h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
							onClick={handleGithubClick}
							type="button"
						>
							<Github size={20} className="text-gray-800 dark:text-gray-200" />
							<div className="text-left">
								<div className="font-medium">GitHub</div>
								<div className="text-sm text-gray-500">@ayushhrawat</div>
							</div>
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* About Us Dialog */}
			<Dialog open={aboutDialogOpen} onOpenChange={handleCloseAboutDialog}>
				<DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto z-[200]">
					<DialogHeader className="pb-4">
						<DialogTitle className="flex items-center gap-2">
							<Info size={20} />
							About Streamify
						</DialogTitle>
						<DialogDescription>
							Learn more about this application
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 px-1">
						<div>
							<h3 className="font-semibold text-lg mb-2">Streamify Chat</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
								A modern, AI-powered real-time chat application built with Next.js, Supabase, and Socket.IO. 
								Features include instant messaging, AI chat assistance, free image generation, user presence, and a beautiful dark/light theme.
							</p>
						</div>
						
						<div>
							<h4 className="font-medium mb-2">Features:</h4>
							<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
								<li>• Real-time messaging</li>
								<li>• AI chat assistant (Groq AI)</li>
								<li>• Free AI image generation</li>
								<li>• User search and discovery</li>
								<li>• Group conversations</li>
								<li>• Dark/Light theme support</li>
								<li>• Message read receipts</li>
								<li>• Online status indicators</li>
								<li>• Video calling support</li>
								<li>• Media sharing (images/videos)</li>
							</ul>
						</div>

						<div>
							<h4 className="font-medium mb-2">Technology Stack:</h4>
							<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
								<li>• Next.js 14 with TypeScript</li>
								<li>• Supabase for database & auth</li>
								<li>• Socket.IO for real-time features</li>
								<li>• Groq AI for chat assistance</li>
								<li>• Hugging Face for image generation</li>
								<li>• Tailwind CSS for styling</li>
								<li>• Clerk for authentication</li>
								<li>• ZegoCloud for video calls</li>
							</ul>
						</div>

						<div className="pt-4 border-t pb-2">
							<p className="text-xs text-gray-500 text-center">
								Developed with ❤️ by Ayush Rawat
							</p>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SettingsMenu;