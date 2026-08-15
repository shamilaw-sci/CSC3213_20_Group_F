import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  FaPaperPlane,
  FaPaperclip,
  FaTimes,
  FaSearch,
  FaUserCircle,
  FaFileAlt,
  FaArrowLeft,
  FaLock,
  FaDownload,
  FaComments,
  FaTrashAlt
} from 'react-icons/fa';
import api from '../utils/api';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  let filename = url;
  if (url.includes('/uploads/')) {
    filename = url.split('/uploads/').pop();
  } else if (url.startsWith('/')) {
    filename = url.substring(1);
  }
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${backendBase}/uploads/${filename}`;
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getRoleBadge = (role) => {
  switch (role) {
    case 'admin':
      return <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Admin</span>;
    case 'teacher':
      return <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Teacher</span>;
    case 'student':
      return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Student</span>;
    case 'parent':
      return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Parent</span>;
    case 'counter_staff':
    case 'staff':
      return <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Staff</span>;
    default:
      return <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{role}</span>;
  }
};

const MessagingPopup = ({ isOpen, onClose, onUnreadUpdate }) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // --- NAVIGATION & CHAT STATES ---
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' | 'new_chat' | 'chat'
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // --- SEARCH & INPUT STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // --- CUSTOM DELETE CONFIRMATION MODAL STATE ---
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null, // 'message' | 'conversation'
    targetId: null,
    title: '',
    description: ''
  });

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Scroll to bottom of message list
  const scrollToBottom = (behavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 100);
  };

  // --- ROLE RULES BANNER ---
  const getRoleNotice = () => {
    switch (currentUser.role) {
      case 'student':
        return 'Notice: You can send messages to Teachers of your enrolled courses and Admins.';
      case 'teacher':
        return 'Notice: You can message Students & Parents enrolled in your assigned courses, and Admins.';
      case 'parent':
        return 'Notice: You can send messages to Teachers of your children\'s enrolled courses and Admins.';
      case 'counter_staff':
      case 'staff':
        return 'Notice: Staff members can message Admins only.';
      case 'admin':
        return 'Admin Mode: You can message any user in the system.';
      default:
        return '';
    }
  };

  // --- FETCH CONVERSATIONS ---
  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      if (res.data) {
        setConversations(res.data.conversations || []);
        if (onUnreadUpdate) {
          const totalUnread = (res.data.conversations || []).reduce((acc, c) => acc + c.unreadCount, 0);
          onUnreadUpdate(totalUnread);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // --- FETCH ALLOWED CONTACTS ---
  const fetchContacts = async (query = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/messages/contacts?search=${encodeURIComponent(query)}`);
      if (res.data) {
        setContacts(res.data.contacts || []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast.error('Failed to load messaging contacts.');
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH CONVERSATION MESSAGES ---
  const fetchConversationMessages = async (contactUser, pageNum = 1, append = false, isSilent = false) => {
    try {
      if (!isSilent) {
        if (!append) setLoading(true);
        else setLoadingMore(true);
      }

      const res = await api.get(`/messages/conversation/${contactUser._id}?page=${pageNum}&limit=30`);
      if (res.data) {
        if (append) {
          setMessages(prev => [...(res.data.messages || []), ...prev]);
        } else {
          setMessages(res.data.messages || []);
          if (!isSilent) {
            scrollToBottom('auto');
          }
        }
        setHasMore(res.data.hasMore);
        setPage(pageNum);

        // Refresh conversation list unread badges
        fetchConversations();
      }
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      if (!isSilent) toast.error('Failed to load message history.');
    } finally {
      if (!isSilent) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Initial loads & silent polling setup
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      if (activeTab === 'new_chat') {
        fetchContacts(searchQuery);
      } else if (activeTab === 'chat' && selectedContact) {
        fetchConversationMessages(selectedContact, 1, false, false);
      }

      // Silent polling for updates every 15 seconds when popup is open
      const interval = setInterval(() => {
        fetchConversations();
        if (activeTab === 'chat' && selectedContact) {
          fetchConversationMessages(selectedContact, 1, false, true);
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, selectedContact]);

  // Handle opening chat with a user
  const handleSelectContact = (contactUser) => {
    setSelectedContact(contactUser);
    setActiveTab('chat');
    setMessages([]);
    setPage(1);
    fetchConversationMessages(contactUser, 1, false, false);
  };

  // Handle Attachment Selection with Strict Validation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const maxImageSize = 2 * 1024 * 1024; // 2MB
    const maxDocSize = 5 * 1024 * 1024; // 5MB

    if (isImage && file.size > maxImageSize) {
      toast.error(`Image exceeds 2MB limit! Selected file size is ${formatFileSize(file.size)}`);
      e.target.value = '';
      return;
    }

    if (!isImage && file.size > maxDocSize) {
      toast.error(`Document exceeds 5MB limit! Selected file size is ${formatFileSize(file.size)}`);
      e.target.value = '';
      return;
    }

    setAttachment(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview({ type: 'image', url: reader.result, name: file.name, size: file.size });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview({ type: 'document', name: file.name, size: file.size });
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Message Dispatch
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedContact) return;

    if (!messageText.trim() && !attachment) {
      toast.error('Please enter a message or select a file attachment.');
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      formData.append('recipientId', selectedContact._id);
      if (messageText.trim()) {
        formData.append('content', messageText.trim());
      }
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.message) {
        setMessages(prev => [...prev, res.data.message]);
        setMessageText('');
        removeAttachment();
        scrollToBottom('smooth');
        fetchConversations();
        toast.success('Message sent!');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errMsg = err.response?.data?.message || 'Failed to send message.';
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  // --- TRIGGER CUSTOM DELETE CONFIRMATION MODALS ---
  const triggerDeleteMessageConfirm = (messageId) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'message',
      targetId: messageId,
      title: 'Delete Message',
      description: 'Are you sure you want to delete this message? This action cannot be undone.'
    });
  };

  const triggerDeleteConversationConfirm = (targetUserId, contactName) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'conversation',
      targetId: targetUserId,
      title: `Delete Conversation`,
      description: `Are you sure you want to delete all messages with ${contactName || 'this user'}? This action cannot be undone.`
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirm.targetId) return;

    try {
      if (deleteConfirm.type === 'message') {
        await api.delete(`/messages/${deleteConfirm.targetId}`);
        setMessages(prev => prev.filter(m => m._id !== deleteConfirm.targetId));
        fetchConversations();
        toast.success('Message deleted.');
      } else if (deleteConfirm.type === 'conversation') {
        await api.delete(`/messages/conversation/${deleteConfirm.targetId}`);
        setConversations(prev => prev.filter(c => c.contact._id !== deleteConfirm.targetId));
        if (selectedContact && selectedContact._id === deleteConfirm.targetId) {
          setSelectedContact(null);
          setActiveTab('conversations');
          setMessages([]);
        }
        fetchConversations();
        toast.success('Conversation deleted.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to perform delete action.');
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, targetId: null, title: '', description: '' });
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && selectedContact) {
      fetchConversationMessages(selectedContact, page + 1, true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-2.5rem)] h-[580px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

      {/* --- POPUP HEADER --- */}
      <div className="bg-gradient-to-r from-purple-700 via-lumina-purple to-purple-900 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {activeTab === 'chat' && (
            <button
              onClick={() => {
                setActiveTab('conversations');
                setSelectedContact(null);
              }}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white"
              title="Back to Conversations"
            >
              <FaArrowLeft className="text-sm" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <FaComments className="text-xl text-purple-200" />
            <h3 className="font-bold text-base truncate">
              {activeTab === 'chat' && selectedContact
                ? selectedContact.name
                : activeTab === 'new_chat'
                  ? 'New Message'
                  : 'Messages'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'conversations' && (
            <button
              onClick={() => {
                setActiveTab('new_chat');
                fetchContacts('');
              }}
              className="bg-white/20 hover:bg-white/30 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              + New Chat
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white cursor-pointer"
            title="Close popup"
          >
            <FaTimes className="text-base" />
          </button>
        </div>
      </div>

      {/* --- ROLE ACCESS RULE NOTICE BANNER --- */}
      <div className="bg-purple-50 border-b border-purple-100 px-3 py-2 text-[11px] font-medium text-purple-800 flex items-center gap-2">
        <FaLock className="text-purple-500 text-xs flex-shrink-0" />
        <span className="truncate">{getRoleNotice()}</span>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: RECENT CONVERSATIONS LIST */}
      {/* ========================================================================= */}
      {activeTab === 'conversations' && (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50">

          <div className="p-3 border-b border-gray-100 bg-white">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Filter conversation list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 py-2 pl-9 pr-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {conversations.length > 0 ? (
              conversations
                .filter(c => !searchQuery || c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((conv) => (
                  <div
                    key={conv.contact._id}
                    onClick={() => handleSelectContact(conv.contact)}
                    className="p-3.5 hover:bg-purple-50/60 transition-colors cursor-pointer flex items-center gap-3 relative bg-white"
                  >
                    <div className="relative flex-shrink-0">
                      {conv.contact.profilePicture ? (
                        <img
                          src={getImageUrl(conv.contact.profilePicture)}
                          alt={conv.contact.name}
                          className="w-11 h-11 rounded-full object-cover border border-purple-100 shadow-sm"
                        />
                      ) : (
                        <FaUserCircle className="w-11 h-11 text-gray-300" />
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-gray-800 text-xs truncate flex items-center gap-1.5">
                          {conv.contact.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {conv.lastMessage?.createdAt
                            ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate max-w-[180px] ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                          {conv.lastMessage?.attachmentsCount > 0 ? '📎 Attachment' : (conv.lastMessage?.content || 'No messages yet.')}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getRoleBadge(conv.contact.role)}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDeleteConversationConfirm(conv.contact._id, conv.contact.name);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete conversation"
                          >
                            <FaTrashAlt className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-10 text-center text-gray-400">
                <FaComments className="text-4xl mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-semibold text-gray-500">No conversations yet.</p>
                <p className="text-[11px] mt-1 text-gray-400">Click "+ New Chat" to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: NEW CHAT / CONTACT SELECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'new_chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50">

          <div className="p-3 border-b border-gray-100 bg-white">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search recipients by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchContacts(e.target.value);
                }}
                className="w-full bg-gray-100 py-2 pl-9 pr-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 font-medium">Loading permitted contacts...</div>
            ) : contacts.length > 0 ? (
              contacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => handleSelectContact(contact)}
                  className="p-3.5 hover:bg-purple-50/70 transition-colors cursor-pointer flex items-center gap-3 bg-white"
                >
                  {contact.profilePicture ? (
                    <img
                      src={getImageUrl(contact.profilePicture)}
                      alt={contact.name}
                      className="w-10 h-10 rounded-full object-cover border border-purple-100"
                    />
                  ) : (
                    <FaUserCircle className="w-10 h-10 text-gray-300" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-gray-800 text-xs truncate">{contact.name}</h4>
                      {getRoleBadge(contact.role)}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{contact.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs">
                No matching recipients found based on your role permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ACTIVE CHAT THREAD */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && selectedContact && (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-100/40">

          {/* ACTIVE CHAT HEADER BAR */}
          <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center gap-3 shadow-2xs">
            {selectedContact.profilePicture ? (
              <img
                src={getImageUrl(selectedContact.profilePicture)}
                alt={selectedContact.name}
                className="w-9 h-9 rounded-full object-cover border border-purple-200"
              />
            ) : (
              <FaUserCircle className="w-9 h-9 text-gray-400" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-xs truncate">{selectedContact.name}</h4>
              <p className="text-[10px] text-gray-500 truncate">{selectedContact.email}</p>
            </div>
            {getRoleBadge(selectedContact.role)}
            <button
              type="button"
              onClick={() => triggerDeleteConversationConfirm(selectedContact._id, selectedContact.name)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1"
              title="Delete entire conversation"
            >
              <FaTrashAlt className="text-xs" />
            </button>
          </div>

          {/* CHAT MESSAGES DISPLAY */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">

            {hasMore && (
              <div className="text-center my-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer"
                >
                  {loadingMore ? 'Loading older messages...' : 'Load older messages'}
                </button>
              </div>
            )}

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading conversation...</div>
            ) : messages.length > 0 ? (
              messages.map((msg) => {
                const rawSender = msg.sender;
                const senderId = (typeof rawSender === 'object' && rawSender !== null)
                  ? (rawSender._id || rawSender.id)
                  : rawSender;
                const currentUserId = currentUser._id || currentUser.id;
                const isMe = String(senderId) === String(currentUserId);

                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-xs text-xs ${isMe
                        ? 'bg-lumina-purple text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none'
                        }`}
                    >
                      {/* ATTACHMENTS RENDER */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 space-y-2">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} className="overflow-hidden rounded-lg">
                              {att.category === 'image' ? (
                                <div className="group relative">
                                  <img
                                    src={getImageUrl(att.url)}
                                    alt={att.originalName}
                                    className="max-h-48 rounded-lg object-cover cursor-pointer border border-black/10"
                                    onClick={() => window.open(getImageUrl(att.url), '_blank')}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={getImageUrl(att.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${isMe ? 'bg-purple-800/60 text-white hover:bg-purple-800' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    } transition-colors`}
                                >
                                  <FaFileAlt className="text-base flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-bold">{att.originalName}</p>
                                    <p className="text-[9px] opacity-80">{formatFileSize(att.fileSize)}</p>
                                  </div>
                                  <FaDownload className="text-xs" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* TEXT CONTENT */}
                      {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                      {/* TIMESTAMP & READ TICK & DELETE BUTTON */}
                      <div className={`mt-1 text-[9px] flex items-center justify-end gap-1.5 opacity-80 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {(isMe || currentUser.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => triggerDeleteMessageConfirm(msg._id)}
                            className="hover:text-red-400 p-0.5 transition-colors cursor-pointer opacity-75 hover:opacity-100"
                            title="Delete message"
                          >
                            <FaTrashAlt className="text-[10px]" />
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs">
                No messages in this conversation yet. Say hello!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ATTACHMENT PREVIEW BANNER */}
          {attachmentPreview && (
            <div className="bg-purple-50 p-2.5 border-t border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {attachmentPreview.type === 'image' ? (
                  <img src={attachmentPreview.url} alt="preview" className="w-9 h-9 rounded object-cover border" />
                ) : (
                  <div className="w-9 h-9 bg-purple-200 text-purple-700 rounded flex items-center justify-center font-bold text-xs">
                    <FaFileAlt />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate max-w-[200px]">{attachmentPreview.name}</p>
                  <p className="text-[10px] text-gray-500">{formatFileSize(attachmentPreview.size)}</p>
                </div>
              </div>
              <button
                onClick={removeAttachment}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-full cursor-pointer transition-colors"
                title="Remove attachment"
              >
                <FaTimes />
              </button>
            </div>
          )}

          {/* INPUT FORM BAR */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-500 hover:text-lumina-purple hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
              title="Attach Image (Max 2MB) or Document (Max 5MB)"
            >
              <FaPaperclip className="text-base" />
            </button>

            <input
              type="text"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 bg-gray-50 py-2.5 px-3.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />

            <button
              type="submit"
              disabled={sending || (!messageText.trim() && !attachment)}
              className="bg-lumina-purple hover:bg-purple-800 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Send Message"
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </form>

        </div>
      )}

      {/* --- CUSTOM LUMINALEARN DELETE CONFIRMATION MODAL --- */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 space-y-4 transform transition-all animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl flex-shrink-0">
                <FaTrashAlt className="text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 text-sm">{deleteConfirm.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{deleteConfirm.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, targetId: null, title: '', description: '' })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPopup;
