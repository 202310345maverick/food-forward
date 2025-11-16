'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  FiSend, 
  FiUsers, 
  FiMessageSquare, 
  FiSearch,
  FiUser,
  FiHome,
  FiTruck,
  FiPackage,
  FiRefreshCw,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiWifi,
  FiWifiOff,
  FiAlertCircle,
  FiBell,
  FiSettings,
  FiHeart,
  FiAward,
  FiTrendingUp,
  FiCheckCircle,
  FiXCircle,
  FiInfo
} from 'react-icons/fi';

interface ChatMessage {
  id: string;
  userId: string;
  userDisplayName: string;
  userRole: 'donor' | 'recipient' | 'volunteer';
  message: string;
  timestamp: any;
}

interface UserProfile {
  id: string;
  displayName: string;
  role: 'donor' | 'recipient' | 'volunteer';
  lastActive: any;
  email: string;
}

// Helper functions
const getRoleColor = (role: 'donor' | 'recipient' | 'volunteer') => {
  const colors = {
    donor: { bg: '#dcfce7', text: '#166534', badge: '#16a34a', gradient: 'from-green-500 to-emerald-600' },
    recipient: { bg: '#dbeafe', text: '#1e40af', badge: '#2563eb', gradient: 'from-blue-500 to-indigo-600' },
    volunteer: { bg: '#f3e8ff', text: '#6b21a8', badge: '#9333ea', gradient: 'from-purple-500 to-violet-600' }
  };
  return colors[role] || { bg: '#f1f5f9', text: '#475569', badge: '#64748b', gradient: 'from-gray-500 to-slate-600' };
};

const getRoleIcon = (role: 'donor' | 'recipient' | 'volunteer') => {
  const icons = {
    donor: <FiPackage size={14} />,
    recipient: <FiHome size={14} />,
    volunteer: <FiTruck size={14} />
  };
  return icons[role] || <FiUser size={14} />;
};

const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
};

const isUserRecentlyActive = (lastActive: any) => {
  if (!lastActive) return false;
  try {
    const lastActiveTime = lastActive.toDate();
    return new Date().getTime() - lastActiveTime.getTime() < 2 * 60 * 1000;
  } catch {
    return false;
  }
};

export default function CommunityChat() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'members'>('chat');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages with error handling
  useEffect(() => {
    if (!user) return;

    const messagesRef = collection(db, 'communityMessages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const messagesData: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({ 
            id: doc.id, 
            ...data
          } as ChatMessage);
        });
        setMessages(messagesData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setError('Unable to load messages. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch users
  useEffect(() => {
    if (!user) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const usersData: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const userData = doc.data();
          usersData.push({
            id: doc.id,
            displayName: userData.displayName || 'Unknown User',
            role: userData.role || 'donor',
            lastActive: userData.lastActive,
            email: userData.email || ''
          });
        });
        setAllUsers(usersData);
        setLoadingUsers(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching users:', error);
        setError('Unable to load users. Please check your permissions.');
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Update user activity
  useEffect(() => {
    if (!user || !userProfile) return;

    const updateLastActive = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          lastActive: serverTimestamp(),
          displayName: userProfile.displayName,
          role: userProfile.role,
          email: user.email || ''
        });
      } catch (error) {
        console.error('Error updating last active:', error);
      }
    };

    updateLastActive();
    const interval = setInterval(updateLastActive, 15000);
    
    return () => {
      clearInterval(interval);
      updateLastActive();
    };
  }, [user, userProfile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userProfile || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'communityMessages'), {
        userId: user.uid,
        userDisplayName: userProfile.displayName,
        userRole: userProfile.role,
        message: newMessage.trim(),
        timestamp: serverTimestamp()
      });

      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please check your permissions.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const filteredUsers = allUsers.filter(userProfile =>
    userProfile.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userProfile.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userProfile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineUsers = allUsers.filter(profile => isUserRecentlyActive(profile.lastActive));

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  // Community Guidelines Data
  const communityGuidelines = [
    {
      type: 'do',
      title: 'Do',
      items: [
        'Be respectful and kind to all community members',
        'Share relevant information about food donations and needs',
        'Coordinate pickup and delivery details clearly',
        'Report any issues or concerns promptly',
        'Keep conversations focused on community support'
      ]
    },
    {
      type: 'dont',
      title: "Don't",
      items: [
        "Share personal or sensitive information",
        "Use inappropriate language or make offensive comments",
        "Coordinate transactions outside the platform",
        "Spam or send unrelated messages",
        "Make false claims about donations or needs"
      ]
    }
  ];

  return (
    <div className="community-chat-container">
      {/* Scrollable Main Content */}
      <div className="dashboard-scroll-container">
        <div className="dashboard-main">
          
          {/* Main Content Grid */}
          <div className="content-grid">
            
            {/* Chat Area */}
            <div className="chat-section">
              <div className="section-card">
                <div className="card-header">
                  <h3 className="card-title">
                    <FiMessageSquare className="w-5 h-5" />
                    Community Chat
                  </h3>
                  <div className="card-actions">
                    <span className="online-badge">
                      <FiWifi className="w-4 h-4" />
                      {onlineUsers.length} online
                    </span>
                    <button className="refresh-btn" onClick={() => window.location.reload()}>
                      <FiRefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="error-banner">
                    <div className="error-content">
                      <div className="error-message">
                        <FiAlertCircle className="w-5 h-5" />
                        <div>
                          <p className="error-title">Connection Error</p>
                          <p className="error-description">{error}</p>
                        </div>
                      </div>
                      <button onClick={handleRetry} className="retry-button">
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Container */}
                <div className="messages-container">
                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p className="loading-text">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="empty-state">
                      <FiMessageSquare className="empty-icon" />
                      <h3 className="empty-title">No messages yet</h3>
                      <p className="empty-description">
                        Be the first to start the conversation in our community!
                      </p>
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((message) => {
                        const isOwnMessage = user && message.userId === user.uid;
                        const roleColors = getRoleColor(message.userRole);
                        
                        return (
                          <div
                            key={message.id}
                            className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
                          >
                            <div className="message-avatar">
                              <div
                                className="avatar"
                                style={{ 
                                  background: `linear-gradient(135deg, ${roleColors.badge}, ${roleColors.badge}dd)`
                                }}
                              >
                                {message.userDisplayName.charAt(0).toUpperCase()}
                              </div>
                            </div>

                            <div className={`message-content ${isOwnMessage ? 'own-content' : 'other-content'}`}>
                              {!isOwnMessage && (
                                <div className="message-header">
                                  <div className="user-info">
                                    <span className="user-name">{message.userDisplayName}</span>
                                    <span
                                      className="role-badge"
                                      style={{
                                        backgroundColor: roleColors.bg,
                                        color: roleColors.text
                                      }}
                                    >
                                      {getRoleIcon(message.userRole)}
                                      {message.userRole}
                                    </span>
                                  </div>
                                  <span className="message-time">
                                    {formatTime(message.timestamp)}
                                  </span>
                                </div>
                              )}
                              
                              <div className={`message-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'}`}>
                                <p className="message-text">{message.message}</p>
                              </div>
                              
                              {isOwnMessage && (
                                <div className="message-time own-time">
                                  {formatTime(message.timestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="message-input-section">
                  <form onSubmit={handleSendMessage} className="message-form">
                    <div className="input-wrapper">
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                        rows={1}
                        disabled={sending}
                        className="message-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="send-button"
                    >
                      {sending ? (
                        <div className="send-spinner"></div>
                      ) : (
                        <FiSend className="send-icon" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Members Sidebar */}
            <div className="members-section">
              <div className="section-card">
                <div className="card-header">
                  <h3 className="card-title">
                    <FiUsers className="w-5 h-5" />
                    Community Members
                  </h3>
                  <div className="card-actions">
                    <div className="search-container">
                      <FiSearch className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="members-content">
                  {/* Online Status */}
                  <div className="online-section">
                    <div className="online-header">
                      <div className="online-status">
                        <FiWifi className="wifi-icon" />
                        <span>{onlineUsers.length} Online Members</span>
                      </div>
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="users-list">
                    {loadingUsers ? (
                      <div className="users-loading">
                        <div className="loading-spinner small"></div>
                        <p>Loading members...</p>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="no-users">
                        <FiUser className="no-users-icon" />
                        <p>No members found</p>
                      </div>
                    ) : (
                      <div className="users-grid">
                        {filteredUsers.map((userProfile) => {
                          const roleColors = getRoleColor(userProfile.role);
                          const isOnline = isUserRecentlyActive(userProfile.lastActive);
                          const isCurrentUser = user && userProfile.id === user.uid;
                          
                          return (
                            <div
                              key={userProfile.id}
                              className={`user-item ${isCurrentUser ? 'current-user' : ''} ${isOnline ? 'online' : 'offline'}`}
                            >
                              <div className="user-avatar-container">
                                <div
                                  className="user-avatar"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${roleColors.badge}, ${roleColors.badge}dd)`
                                  }}
                                >
                                  {userProfile.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className={`user-status ${isOnline ? 'online' : 'offline'}`} />
                              </div>
                              
                              <div className="user-info">
                                <div className="user-main">
                                  <span className="user-name">
                                    {userProfile.displayName}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="you-badge">You</span>
                                  )}
                                </div>
                                <div className="user-details">
                                  <span
                                    className="user-role"
                                    style={{
                                      backgroundColor: roleColors.bg,
                                      color: roleColors.text
                                    }}
                                  >
                                    {getRoleIcon(userProfile.role)}
                                    {userProfile.role}
                                  </span>
                                  <span className="user-status-text">
                                    {isOnline ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Guidelines */}
          <div className="guidelines-section">
            <div className="section-card">
              <div className="card-header">
                <h3 className="card-title">
                  <FiInfo className="w-5 h-5" />
                  Community Guidelines
                </h3>
              </div>
              <div className="guidelines-content">
                <div className="guidelines-grid">
                  {communityGuidelines.map((section, index) => (
                    <div key={section.type} className={`guideline-section ${section.type}`}>
                      <div className="guideline-header">
                        {section.type === 'do' ? (
                          <FiCheckCircle className="guideline-icon do" />
                        ) : (
                          <FiXCircle className="guideline-icon dont" />
                        )}
                        <h4 className="guideline-title">{section.title}</h4>
                      </div>
                      <ul className="guideline-list">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="guideline-item">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="guidelines-footer">
                  <p className="guidelines-note">
                    <strong>Note:</strong> Please follow these guidelines to maintain a positive and supportive community environment. 
                    Violations may result in restricted access to community features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .community-chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f8fafc;
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          bottom: 0;
        }

        /* Adjust for desktop sidebar */
        @media (min-width: 1024px) {
          .community-chat-container {
            left: 260px;
            width: calc(100% - 260px);
          }
        }

        /* Scrollable Main Content */
        .dashboard-scroll-container {
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
        }

        .dashboard-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem;
          width: 100%;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        .section-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 600px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: white;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .online-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          color: #166534;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        .search-container {
          position: relative;
          width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          width: 1rem;
          height: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
          background: white;
        }

        .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Error Banner */
        .error-banner {
          background: #fef3f2;
          border-bottom: 1px solid #fecaca;
          padding: 1rem 1.5rem;
          flex-shrink: 0;
        }

        .error-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #dc2626;
          flex: 1;
        }

        .error-title {
          font-weight: 600;
          margin: 0;
          font-size: 0.875rem;
        }

        .error-description {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .retry-button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          flex-shrink: 0;
        }

        .retry-button:hover {
          background: #b91c1c;
        }

        /* Messages Container */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
          padding: 0;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b7280;
          padding: 2rem;
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .loading-spinner.small {
          width: 1.5rem;
          height: 1.5rem;
          border-width: 2px;
        }

        .loading-text {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b7280;
          text-align: center;
          padding: 2rem;
        }

        .empty-icon {
          width: 4rem;
          height: 4rem;
          opacity: 0.5;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .empty-description {
          font-size: 1rem;
          margin: 0;
          max-width: 24rem;
        }

        .messages-list {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-item {
          display: flex;
          gap: 0.75rem;
          width: 100%;
        }

        .message-item.own-message {
          flex-direction: row-reverse;
        }

        .message-avatar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .message-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          max-width: 70%;
        }

        .message-content.own-content {
          align-items: flex-end;
        }

        .message-content.other-content {
          align-items: flex-start;
        }

        .message-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
          width: 100%;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-name {
          font-weight: 700;
          font-size: 0.875rem;
          color: #374151;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .message-time {
          font-size: 0.75rem;
          color: #6b7280;
          white-space: nowrap;
        }

        .own-time {
          margin-top: 0.25rem;
          text-align: right;
          width: 100%;
        }

        .message-bubble {
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          max-width: 100%;
          word-wrap: break-word;
        }

        .own-bubble {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border-bottom-right-radius: 0.25rem;
        }

        .other-bubble {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 0.25rem;
        }

        .message-text {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        /* Message Input */
        .message-input-section {
          border-top: 1px solid #e5e7eb;
          background: white;
          padding: 1.5rem;
          flex-shrink: 0;
        }

        .message-form {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          width: 100%;
        }

        .input-wrapper {
          flex: 1;
          min-width: 0;
        }

        .message-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 1.5rem;
          font-size: 0.875rem;
          font-family: inherit;
          resize: none;
          outline: none;
          transition: all 0.2s;
          background: white;
          box-sizing: border-box;
        }

        .message-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .message-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-button {
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .send-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }

        .send-spinner {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .send-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        /* Members Section */
        .members-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .online-section {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
          flex-shrink: 0;
        }

        .online-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .online-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #059669;
        }

        .wifi-icon {
          width: 1rem;
          height: 1rem;
        }

        .users-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .users-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
          text-align: center;
          padding: 2rem;
        }

        .users-loading p {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
        }

        .no-users {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
          text-align: center;
          padding: 2rem;
        }

        .no-users-icon {
          width: 2rem;
          height: 2rem;
          opacity: 0.5;
          margin-bottom: 0.5rem;
        }

        .no-users p {
          margin: 0;
          font-size: 0.875rem;
        }

        .users-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .user-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: white;
          transition: all 0.2s;
        }

        .user-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .user-item.current-user {
          background: #f0f9ff;
          border-color: #bfdbfe;
        }

        .user-item.online {
          border-left: 3px solid #10b981;
        }

        .user-item.offline {
          border-left: 3px solid #6b7280;
        }

        .user-avatar-container {
          position: relative;
          flex-shrink: 0;
        }

        .user-avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          flex-shrink: 0;
        }

        .user-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0.75rem;
          height: 0.75rem;
          border: 2px solid white;
          border-radius: 50%;
        }

        .user-status.online {
          background: #10b981;
        }

        .user-status.offline {
          background: #6b7280;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .you-badge {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .user-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-role {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .user-status-text {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
        }

        /* Community Guidelines */
        .guidelines-section {
          margin-top: 0;
        }

        .guidelines-section .section-card {
          height: auto;
          min-height: 300px;
        }

        .guidelines-content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .guidelines-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .guidelines-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        .guideline-section {
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .guideline-section.do {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .guideline-section.dont {
          background: #fef3f2;
          border-color: #fecaca;
        }

        .guideline-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .guideline-icon {
          width: 1.5rem;
          height: 1.5rem;
          flex-shrink: 0;
        }

        .guideline-icon.do {
          color: #10b981;
        }

        .guideline-icon.dont {
          color: #dc2626;
        }

        .guideline-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .guideline-section.do .guideline-title {
          color: #059669;
        }

        .guideline-section.dont .guideline-title {
          color: #dc2626;
        }

        .guideline-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .guideline-item {
          font-size: 0.875rem;
          line-height: 1.5;
          color: #374151;
          padding-left: 0;
          position: relative;
        }

        .guideline-section.do .guideline-item {
          color: #065f46;
        }

        .guideline-section.dont .guideline-item {
          color: #991b1b;
        }

        .guideline-item:before {
          content: '•';
          font-weight: bold;
          margin-right: 0.5rem;
        }

        .guidelines-footer {
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
          margin-top: auto;
        }

        .guidelines-note {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0;
          text-align: center;
          font-style: italic;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .dashboard-main {
            padding: 0.5rem;
          }

          .content-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .card-actions {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .search-container {
            width: 100%;
          }

          .section-card {
            height: 500px;
          }
        }
      `}</style>
    </div>
  );
}