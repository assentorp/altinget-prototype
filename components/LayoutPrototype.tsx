'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Random name generator
const firstNames = ['Emma', 'Lars', 'Sofia', 'Mads', 'Ida', 'Oliver', 'Freja', 'Noah', 'Clara', 'William', 'Alma', 'Oscar', 'Ella', 'Victor', 'Nora', 'Emil', 'Luna', 'Felix', 'Astrid', 'August'];
const userColors = ['#F87171', '#FB923C', '#FBBF24', '#34D399', '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6', '#E879F9', '#818CF8'];

type OnlineUser = {
  id: string;
  name: string;
  color: string;
  activeField: string | null;
  lastSeen: number;
};

const getRandomName = () => firstNames[Math.floor(Math.random() * firstNames.length)];
const getRandomColor = (usedColors: string[]) => {
  const available = userColors.filter(c => !usedColors.includes(c));
  return available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : userColors[Math.floor(Math.random() * userColors.length)];
};

// Generate unique user ID for this session
const getUserId = () => {
  if (typeof window === 'undefined') return '';
  let userId = sessionStorage.getItem('userId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('userId', userId);
  }
  return userId;
};

// Generate user name and color for this session
const getUserData = () => {
  if (typeof window === 'undefined') return { name: '', color: '' };
  let userData = sessionStorage.getItem('userData');
  if (!userData) {
    const name = getRandomName();
    const color = getRandomColor([]);
    userData = JSON.stringify({ name, color });
    sessionStorage.setItem('userData', userData);
  }
  return JSON.parse(userData);
};

export default function LayoutPrototype() {
  const [containerWidth, setContainerWidth] = useState('wide');
  const [formColumns, setFormColumns] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [sidebarWidth, setSidebarWidth] = useState(270);
  const [isResizing, setIsResizing] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const [layoutType, setLayoutType] = useState<'form' | 'list'>('form');
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentUserField, setCurrentUserField] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    bio: '',
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentUserRef = useRef<{ id: string; name: string; color: string } | null>(null);
  const currentFieldRef = useRef<string | null>(null);
  const isUpdatingFromRemoteRef = useRef(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const minSidebarWidth = 200;
  const maxSidebarWidth = 500;

  const isMobileView = viewportMode === 'mobile';

  // Initialize current user and Supabase Realtime
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userId = getUserId();
    const userData = getUserData();
    currentUserRef.current = { id: userId, name: userData.name, color: userData.color };

    // Create Supabase Realtime channel for collaboration
    const channel = supabase.channel('form-collaboration', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presence with user data
    const trackPresence = () => {
      channel.track({
        id: userId,
        name: userData.name,
        color: userData.color,
        activeField: currentFieldRef.current,
        lastSeen: Date.now(),
      });
    };

    // Subscribe to presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];

        for (const [userId, presences] of Object.entries(state)) {
          if (Array.isArray(presences) && presences.length > 0) {
            // Get the latest presence data (last item in array)
            const presence = presences[presences.length - 1] as unknown;
            if (presence && typeof presence === 'object') {
              // Cast to our expected presence structure
              const presenceData = presence as {
                id?: string;
                name?: string;
                color?: string;
                activeField?: string | null;
                lastSeen?: number;
                [key: string]: unknown;
              };

              // Only add if we have valid data
              if (presenceData.id || presenceData.name) {
                users.push({
                  id: presenceData.id || userId,
                  name: presenceData.name || 'Unknown',
                  color: presenceData.color || '#999999',
                  activeField: presenceData.activeField || null,
                  lastSeen: presenceData.lastSeen || Date.now(),
                });
              }
            }
          }
        }

        setOnlineUsers(users);
      })
      .on('broadcast', { event: 'fieldUpdate' }, (payload) => {
        // Handle field value updates
        const { fieldName, value, userId: updateUserId } = payload.payload;
        if (updateUserId !== userId) {
          isUpdatingFromRemoteRef.current = true;
          setFormValues(prev => ({
            ...prev,
            [fieldName]: value,
          }));
          setTimeout(() => {
            isUpdatingFromRemoteRef.current = false;
          }, 100);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Initial presence tracking
          trackPresence();
        }
      });

    channelRef.current = channel;

    // Update presence when field changes
    const updatePresence = () => {
      if (channel && currentUserRef.current) {
        channel.track({
          id: currentUserRef.current.id,
          name: currentUserRef.current.name,
          color: currentUserRef.current.color,
          activeField: currentFieldRef.current,
          lastSeen: Date.now(),
        });
      }
    };

    // Send heartbeat every 2 seconds
    const heartbeatInterval = setInterval(updatePresence, 2000);

    // Cleanup inactive users (users not seen for 5 seconds)
    const cleanupInterval = setInterval(() => {
      setOnlineUsers(prev => {
        const now = Date.now();
        const activeUsers = prev.filter(user => {
          return user.id === userId || (now - user.lastSeen <= 5000);
        });
        return activeUsers.length !== prev.length ? activeUsers : prev;
      });
    }, 1000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      channel.unsubscribe();
    };
  }, []);

  // Update ref and broadcast when field changes
  useEffect(() => {
    currentFieldRef.current = currentUserField;

    // Update presence immediately when field changes
    if (channelRef.current && currentUserRef.current) {
      channelRef.current.track({
        id: currentUserRef.current.id,
        name: currentUserRef.current.name,
        color: currentUserRef.current.color,
        activeField: currentUserField,
        lastSeen: Date.now(),
      });
    }
  }, [currentUserField]);

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Handle field value changes and broadcast to other users
  const handleFieldChange = (fieldName: string, value: string) => {
    // Don't broadcast if we're updating from a remote change
    if (isUpdatingFromRemoteRef.current) return;

    // Update local state
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // Broadcast the change to other users via Supabase
    if (channelRef.current && currentUserRef.current) {
      // @ts-ignore - Supabase Realtime send method
      channelRef.current.send({
        type: 'broadcast',
        event: 'fieldUpdate',
        payload: {
          fieldName,
          value,
          userId: currentUserRef.current.id,
        },
      });
    }
  };

  // Sample user data for list view
  const sampleUsers = [
    { id: 1, name: 'Emma Andersen', email: 'emma.andersen@example.com', phone: '+45 12 34 56 78', company: 'Tech Solutions A/S' },
    { id: 2, name: 'Lars Hansen', email: 'lars.hansen@example.com', phone: '+45 23 45 67 89', company: 'Design Studio' },
    { id: 3, name: 'Sofia Nielsen', email: 'sofia.nielsen@example.com', phone: '+45 34 56 78 90', company: 'Marketing Pro' },
    { id: 4, name: 'Mads Pedersen', email: 'mads.pedersen@example.com', phone: '+45 45 67 89 01', company: 'Digital Agency' },
    { id: 5, name: 'Ida Christensen', email: 'ida.christensen@example.com', phone: '+45 56 78 90 12', company: 'Consulting Group' },
    { id: 6, name: 'Oliver Jensen', email: 'oliver.jensen@example.com', phone: '+45 67 89 01 23', company: 'Innovation Lab' },
    { id: 7, name: 'Freja Larsen', email: 'freja.larsen@example.com', phone: '+45 78 90 12 34', company: 'Creative Works' },
    { id: 8, name: 'Noah Andersen', email: 'noah.andersen@example.com', phone: '+45 89 01 23 45', company: 'Business Solutions' },
  ];


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Simulated Device Frame */}
      <div
        className={`bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
          isMobileView
            ? 'w-[370px] h-[700px] rounded-3xl ring-8 ring-gray-800'
            : 'w-full h-screen rounded-none'
        }`}
        style={isMobileView ? {} : { position: 'fixed', inset: 0 }}
      >
        <div className={`h-full flex overflow-hidden relative ${isMobileView ? 'rounded-2xl' : ''}`}>
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && isMobileView && (
            <div
              className="absolute inset-0 bg-black/20 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className={`
              ${isMobileView ? 'absolute inset-y-0 left-0 z-50' : 'relative'}
              bg-white border-r border-gray-200 p-4 flex shrink-0
              transform transition-transform duration-200 ease-out
              ${isMobileView && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
              ${isResizing ? 'transition-none' : ''}
            `}
            style={{
              width: isMobileView ? 270 : sidebarWidth,
              minWidth: isMobileView ? 270 : sidebarWidth
            }}
          >
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <span className="text-sm text-gray-600">User</span>
                </div>
                {isMobileView && (
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs text-gray-400">Sidebar</span>
              </div>
            </div>

            {/* Resize Handle - only show in desktop mode, attached to border-r */}
            {!isMobileView && (
              <div
                onMouseDown={handleResizeStart}
                className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-10 -mr-0.5"
              />
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
                <div className="text-sm text-gray-500">
                  {!isMobileView && (
                    <>
                      <span className="text-gray-400">Home</span>
                      <span className="mx-2 text-gray-300">/</span>
                    </>
                  )}
                  <span>Settings</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Online Users */}
                {onlineUsers.filter(user => user.id !== currentUserRef.current?.id).length > 0 && (
                  <div className="flex items-center pr-4 border-r border-gray-200">
                    <div className="flex -space-x-2">
                      {onlineUsers
                        .filter(user => user.id !== currentUserRef.current?.id)
                        .map((user) => (
                          <div
                            key={user.id}
                            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: user.color }}
                            title={user.name}
                          >
                            {user.name.charAt(0)}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    Preview
                  </button>
                  <button className="px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors">
                    Publish
                  </button>
                </div>
              </div>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="px-6 py-3 bg-white border-b border-gray-200">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Container Area */}
            <div className="flex-1 overflow-auto">
              {layoutType === 'form' ? (
                <div
                  className={`mx-auto p-6 transition-all duration-300 ${
                    containerWidth === 'narrow' ? 'max-w-[860px]' : 'max-w-none'
                  }`}
                >
                  {/* Form Header */}
                  <div className="pb-4 border-b border-gray-100 mb-6">
                    <h2 className="text-2xl font-medium text-gray-900">Account Settings</h2>
                    <p className="text-base text-gray-500 mt-1">Update your personal information and preferences.</p>
                  </div>

                  {/* Form Fields */}
                  <div
                    className={`grid gap-5 transition-all duration-300 ${
                      formColumns === 2 && !isMobileView ? 'grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {(['firstName', 'lastName', 'email', 'phone', 'company', 'bio'] as const).map((fieldName, index) => {
                      const fieldUser = onlineUsers.find(u =>
                        u.activeField === fieldName && u.id !== currentUserRef.current?.id
                      );
                      const isTextarea = fieldName === 'bio';
                      const isWide = fieldName === 'email' || fieldName === 'bio';

                      return (
                        <div
                          key={fieldName}
                          className={`space-y-1.5 ${isWide && formColumns === 2 && !isMobileView ? 'col-span-2' : ''}`}
                        >
                          <label className="block text-sm font-medium text-gray-700">
                            {fieldName === 'firstName' ? 'First name' :
                             fieldName === 'lastName' ? 'Last name' :
                             fieldName === 'email' ? 'Email address' :
                             fieldName === 'phone' ? 'Phone' :
                             fieldName === 'company' ? 'Company' :
                             'Bio'}
                          </label>
                          <div className="relative">
                            {fieldUser && (
                              <div
                                className="absolute -top-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white z-10"
                                style={{ backgroundColor: fieldUser.color }}
                              >
                                {fieldUser.name}
                              </div>
                            )}
                            {isTextarea ? (
                              <textarea
                                rows={3}
                                value={formValues[fieldName] || ''}
                                placeholder={fieldName === 'bio' ? 'Tell us about yourself...' : ''}
                                className="w-full px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
                                style={{
                                  borderWidth: '2px',
                                  borderColor: fieldUser?.color || '#D1D5DB',
                                }}
                                onFocus={() => setCurrentUserField(fieldName)}
                                onBlur={() => setCurrentUserField(null)}
                                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                              />
                            ) : (
                              <input
                                type={fieldName === 'email' ? 'email' : fieldName === 'phone' ? 'tel' : 'text'}
                                value={formValues[fieldName] || ''}
                                placeholder={
                                  fieldName === 'firstName' ? 'Enter first name' :
                                  fieldName === 'lastName' ? 'Enter last name' :
                                  fieldName === 'email' ? 'you@example.com' :
                                  fieldName === 'phone' ? '+45 00 00 00 00' :
                                  'Company name'
                                }
                                className="w-full px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                                style={{
                                  borderWidth: '2px',
                                  borderColor: fieldUser?.color || '#D1D5DB',
                                }}
                                onFocus={() => setCurrentUserField(fieldName)}
                                onBlur={() => setCurrentUserField(null)}
                                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  className={`transition-all duration-300 ${
                    containerWidth === 'narrow' ? 'max-w-[860px] mx-auto' : 'max-w-none'
                  }`}
                >
                  {/* List Header */}
                  <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex justify-start">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filter
                    </button>
                  </div>

                  {/* Table List - Full Width with Horizontal Scroll on Mobile */}
                  <div className={`overflow-x-auto ${isMobileView ? 'overflow-x-scroll' : ''}`}>
                    <table className={`border-collapse ${isMobileView ? 'min-w-[600px]' : 'w-full'}`}>
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Name</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Email</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Phone</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Company</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-6 text-sm text-gray-900">{user.name}</td>
                            <td className="py-3 px-6 text-sm text-gray-600">{user.email}</td>
                            <td className="py-3 px-6 text-sm text-gray-600">{user.phone}</td>
                            <td className="py-3 px-6 text-sm text-gray-600">{user.company}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Overlay */}
      {showOverlay && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center gap-6 z-50">
          {/* Viewport Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">View</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'desktop', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )},
                { id: 'mobile', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewportMode(mode.id)}
                  className={`p-2 rounded-md transition-all ${
                    viewportMode === mode.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Container Width Control */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Container</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['narrow', 'wide'].map((width) => (
                <button
                  key={width}
                  onClick={() => setContainerWidth(width)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    containerWidth === width
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {width.charAt(0).toUpperCase() + width.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Column Control */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Columns</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[1, 2].map((cols) => (
                <button
                  key={cols}
                  onClick={() => setFormColumns(cols)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                    formColumns === cols
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: cols }).map((_, i) => (
                      <div key={i} className="w-2 h-4 bg-current rounded-sm opacity-60" />
                    ))}
                  </div>
                  {cols} Col
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Layout Type Dropdown */}
          <div className="flex items-center gap-3 relative">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Layout</span>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLayoutDropdown(!showLayoutDropdown);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2"
              >
                <span>{layoutType === 'form' ? 'Form' : 'List'}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showLayoutDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLayoutDropdown(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayoutType('form');
                        setShowLayoutDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                        layoutType === 'form'
                          ? 'bg-gray-50 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Form
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayoutType('list');
                        setShowLayoutDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                        layoutType === 'list'
                          ? 'bg-gray-50 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      List
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Search Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Search</span>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                showSearch
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {showSearch ? 'On' : 'Off'}
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowOverlay(false)}
            className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Toggle Overlay Button */}
      {!showOverlay && (
        <button
          onClick={() => setShowOverlay(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-gray-800 transition-colors z-50"
        >
          Show Controls
        </button>
      )}
    </div>
  );
}
