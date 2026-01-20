import { useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { supabase } from '@/lib/supabase';

export const useGroupManagement = () => {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useSupabase();

  const updateGroupInfo = async (params: {
    conversationId: string;
    groupName: string;
    groupImage?: string;
  }) => {
    if (!currentUser) throw new Error('User not authenticated');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          group_name: params.groupName,
          group_image: params.groupImage,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.conversationId)
        .eq('admin', currentUser.id); // Only admin can update

      if (error) throw error;
      return true;
    } finally {
      setLoading(false);
    }
  };

  const addMembersToGroup = async (params: {
    conversationId: string;
    newMemberIds: string[];
  }) => {
    if (!currentUser) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // First get current participants
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', params.conversationId)
        .eq('admin', currentUser.id) // Only admin can add members
        .single();

      if (fetchError) throw fetchError;

      // Add new members to existing participants
      const updatedParticipants = [...conversation.participants, ...params.newMemberIds];

      const { error } = await supabase
        .from('conversations')
        .update({
          participants: updatedParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.conversationId);

      if (error) throw error;
      return updatedParticipants;
    } finally {
      setLoading(false);
    }
  };

  const removeMemberFromGroup = async (params: {
    conversationId: string;
    memberIdToRemove: string;
  }) => {
    if (!currentUser) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // First get current participants
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('participants, admin')
        .eq('id', params.conversationId)
        .single();

      if (fetchError) throw fetchError;

      // Check if current user is admin
      if (conversation.admin !== currentUser.id) {
        throw new Error('Only admin can remove members');
      }

      // Don't allow removing the admin
      if (params.memberIdToRemove === conversation.admin) {
        throw new Error('Cannot remove the group admin');
      }

      // Remove member from participants
      const updatedParticipants = conversation.participants.filter(
        (id: string) => id !== params.memberIdToRemove
      );

      const { error } = await supabase
        .from('conversations')
        .update({
          participants: updatedParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.conversationId);

      if (error) throw error;
      return updatedParticipants;
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (conversationId: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // Only admin can delete the group
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('admin', currentUser.id);

      if (error) throw error;
      return true;
    } finally {
      setLoading(false);
    }
  };

  const leaveGroup = async (conversationId: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    console.log('🔧 HOOK: leaveGroup called with:', { conversationId, currentUserId: currentUser.id });
    
    setLoading(true);
    try {
      console.log('🔧 HOOK: Fetching conversation data...');
      
      // Get current participants and admin info
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('participants, admin')
        .eq('id', conversationId)
        .single();

      if (fetchError) {
        console.error('🔧 HOOK: Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('🔧 HOOK: Conversation data:', conversation);

      // Remove current user from participants
      const updatedParticipants = conversation.participants.filter(
        (id: string) => id !== currentUser.id
      );

      console.log('🔧 HOOK: Updated participants:', updatedParticipants);

      // If no participants left, delete the group
      if (updatedParticipants.length === 0) {
        console.log('🔧 HOOK: No participants left, deleting group...');
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);

        if (deleteError) {
          console.error('🔧 HOOK: Delete error:', deleteError);
          throw deleteError;
        }
        console.log('🔧 HOOK: Group deleted successfully');
        return [];
      }

      // If user is admin and there are other participants, transfer admin to first remaining participant
      let newAdmin = conversation.admin;
      if (conversation.admin === currentUser.id && updatedParticipants.length > 0) {
        newAdmin = updatedParticipants[0]; // Transfer to first remaining participant
        console.log('🔧 HOOK: Transferring admin from', currentUser.id, 'to', newAdmin);
      }

      console.log('🔧 HOOK: Updating conversation with new data...');
      const { error } = await supabase
        .from('conversations')
        .update({
          participants: updatedParticipants,
          admin: newAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('🔧 HOOK: Update error:', error);
        throw error;
      }

      console.log('🔧 HOOK: Leave group completed successfully');
      return updatedParticipants;
    } finally {
      setLoading(false);
    }
  };

  const transferAdminRights = async (params: {
    conversationId: string;
    newAdminId: string;
  }) => {
    if (!currentUser) throw new Error('User not authenticated');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          admin: params.newAdminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.conversationId)
        .eq('admin', currentUser.id); // Only current admin can transfer

      if (error) throw error;
      return true;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateGroupInfo,
    addMembersToGroup,
    removeMemberFromGroup,
    deleteGroup,
    leaveGroup,
    transferAdminRights,
    loading
  };
};