'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function LayoutPrototype() {
  const [containerWidth, setContainerWidth] = useState('wide');
  const [formColumns, setFormColumns] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [sidebarWidth, setSidebarWidth] = useState(270);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const minSidebarWidth = 200;
  const maxSidebarWidth = 500;

  const isMobileView = viewportMode === 'mobile';

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

            {/* Resize Handle - only show in desktop mode */}
            {!isMobileView && (
              <div
                onMouseDown={handleResizeStart}
                className="w-1 cursor-ew-resize hover:bg-blue-400 active:bg-blue-500 transition-colors flex-shrink-0 relative group"
                style={{ marginLeft: 4, marginRight: -4 }}
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
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
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button className="px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors">
                  Save
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3 bg-white border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                />
              </div>
            </div>

            {/* Container Area */}
            <div className="flex-1 overflow-auto">
              <div
                className={`mx-auto p-4 transition-all duration-300 ${
                  containerWidth === 'narrow' ? 'max-w-[860px]' : 'max-w-none'
                }`}
              >
                {/* Form Header */}
                <div className="pb-4 border-b border-gray-100 mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your personal information and preferences.</p>
                </div>

                {/* Form Fields */}
                <div
                  className={`grid gap-5 transition-all duration-300 ${
                    formColumns === 2 && !isMobileView ? 'grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">First name</label>
                    <input
                      type="text"
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Last name</label>
                    <input
                      type="text"
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                    />
                  </div>

                  <div className={`space-y-1.5 ${formColumns === 2 && !isMobileView ? 'col-span-2' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700">Email address</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      placeholder="+45 00 00 00 00"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <input
                      type="text"
                      placeholder="Company name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                    />
                  </div>

                  <div className={`space-y-1.5 ${formColumns === 2 && !isMobileView ? 'col-span-2' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about yourself..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
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
