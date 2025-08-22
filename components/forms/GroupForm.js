'use client';

import { useState, useEffect } from 'react';
import { useContactStore } from '@/store/useStore';
import { Search, Lock, Globe, UserPlus, UserMinus } from 'lucide-react';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';

export default function GroupForm({
  onSubmit,
  loading = false,
  submitText = 'Create Group',
  initialData = {}
}) {
  const [groupName, setGroupName] = useState(initialData.groupName || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [isPrivate, setIsPrivate] = useState(initialData.isPrivate || false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(initialData.members || []);

  const { contacts } = useContactStore();

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    if (!contact || !contact.id || !contact.username) {
      return false;
    }
    
    const fullName = contact.fullName || contact.username || '';
    const username = contact.username || '';
    
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Reset form when initialData changes
  useEffect(() => {
    setGroupName(initialData.groupName || '');
    setDescription(initialData.description || '');
    setIsPrivate(initialData.isPrivate || false);
    setSelectedMembers(initialData.members || []);
  }, [initialData]);

  const handleAddMember = (contact) => {
    if (!contact || !contact.id || !contact.username) {
      return;
    }
    
    if (!selectedMembers.find(member => member.id === contact.id)) {
      setSelectedMembers([...selectedMembers, contact]);
    }
  };

  const handleRemoveMember = (contactId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== contactId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      return;
    }

    if (selectedMembers.length === 0) {
      return;
    }

    const formData = {
      groupName: groupName.trim(),
      description: description.trim(),
      isPrivate: isPrivate,
      memberUsernames: selectedMembers
        .filter(member => member && member.username)
        .map(member => member.username)
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Group Basic Info */}
      <div className="space-y-4">
        <Input
          label="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name..."
          maxLength={50}
          required
        />

        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this group about?"
          rows={3}
          maxLength={200}
        />

        {/* Privacy Setting */}
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            {isPrivate ? (
              <Lock size={20} className="text-red-400" />
            ) : (
              <Globe size={20} className="text-green-400" />
            )}
            <div>
              <div className="font-medium text-white">
                {isPrivate ? "Private Group" : "Public Group"}
              </div>
              <div className="text-sm text-gray-400">
                {isPrivate
                  ? "Only invited members can join"
                  : "Anyone can discover and join"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPrivate ? "bg-red-600" : "bg-green-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPrivate ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Member Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Add Members ({selectedMembers.length} selected)
        </label>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-300 mb-2">Selected:</div>
            <div className="flex flex-wrap gap-2">
              {selectedMembers
                .filter(member => member && member.id)
                .map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 bg-amber-600 text-black px-3 py-1 rounded-full text-sm"
                >
                  <span>{member.fullName || member.username || 'Unknown'}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="hover:bg-amber-700 rounded-full p-1"
                  >
                    <UserMinus size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Contacts */}
        <div className="border border-gray-600 rounded-lg max-h-48 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              {contacts.length === 0 ? (
                <p>No contacts available</p>
              ) : (
                <p>No contacts found matching &quot;{searchTerm}&quot;</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-600">
              {filteredContacts.map((contact) => {
                if (!contact || !contact.id) {
                  return null;
                }
                
                const isSelected = selectedMembers.find(member => member && member.id === contact.id);
                const displayName = contact.fullName || contact.username || 'Unknown User';
                const avatarText = displayName.charAt(0).toUpperCase();
                
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => isSelected ? handleRemoveMember(contact.id) : handleAddMember(contact)}
                    className={`w-full p-3 text-left hover:bg-gray-700 transition-colors flex items-center justify-between ${
                      isSelected ? "bg-gray-700" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt={displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-semibold text-sm">
                          {avatarText}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">
                          {displayName}
                        </div>
                        <div className="text-sm text-gray-400">
                          @{contact.username || 'unknown'}
                        </div>
                      </div>
                    </div>
                    
                    {isSelected ? (
                      <UserMinus size={16} className="text-red-400" />
                    ) : (
                      <UserPlus size={16} className="text-green-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          loading={loading}
          disabled={loading || !groupName.trim() || selectedMembers.length === 0}
          icon={UserPlus}
        >
          {submitText}
        </Button>
      </div>
    </form>
  );
}