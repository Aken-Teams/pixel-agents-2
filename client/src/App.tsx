import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { OfficeState } from './office/engine/officeState.js'
import { OfficeCanvas } from './office/components/OfficeCanvas.js'
import { ToolOverlay } from './office/components/ToolOverlay.js'
import { EditorToolbar } from './office/editor/EditorToolbar.js'
import { EditorState } from './office/editor/editorState.js'
import { EditTool } from './office/types.js'
import { isRotatable } from './office/layout/furnitureCatalog.js'
import { isStaticBackgroundLayout } from './office/layout/layoutSerializer.js'
// computeFitZoom removed — using fixed zoom=1
import { wsClient } from './wsClient.js'
import { useServerMessages } from './hooks/useServerMessages.js'
import { PULSE_ANIMATION_DURATION_SEC, MAX_CHARACTERS } from './constants.js'
import { useEditorActions } from './hooks/useEditorActions.js'
import { useEditorKeyboard } from './hooks/useEditorKeyboard.js'
import { ZoomControls } from './components/ZoomControls.js'
import { BottomToolbar } from './components/BottomToolbar.js'
import { DebugView } from './components/DebugView.js'
import { ConnectionStatus } from './components/ConnectionStatus.js'
import { ProjectStatusBar } from './components/ProjectStatusBar.js'
import { ChatPanel } from './components/ChatPanel.js'
import { PixelSpriteAvatar } from './components/PixelSpriteAvatar.js'
import { AgentLabels } from './components/AgentLabels.js'
import { ThoughtBubbles } from './components/ThoughtBubbles.js'
import { InterviewModal } from './components/InterviewModal.js'
import { CharacterProfileModal } from './components/CharacterProfileModal.js'
import { LoginScreen } from './components/LoginScreen.js'
import { MobileNavBar } from './components/MobileNavBar.js'
import { useIsMobile } from './hooks/useIsMobile.js'
import type { TeamMemberInfo } from './hooks/useServerMessages.js'

// Game state lives outside React — updated imperatively by message handlers
const officeStateRef = { current: null as OfficeState | null }
const editorState = new EditorState()

function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState()
  }
  return officeStateRef.current
}

const actionBarBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '22px',
  background: 'var(--pixel-btn-bg)',
  color: 'var(--pixel-text-dim)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
}

const actionBarBtnDisabled: React.CSSProperties = {
  ...actionBarBtnStyle,
  opacity: 'var(--pixel-btn-disabled-opacity)',
  cursor: 'default',
}

function EditActionBar({ editor, editorState: es }: { editor: ReturnType<typeof useEditorActions>; editorState: EditorState }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const undoDisabled = es.undoStack.length === 0
  const redoDisabled = es.redoStack.length === 0

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        padding: '4px 8px',
        boxShadow: 'var(--pixel-shadow)',
      }}
    >
      <button
        style={undoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={undoDisabled ? undefined : editor.handleUndo}
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        style={redoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={redoDisabled ? undefined : editor.handleRedo}
        title="Redo (Ctrl+Y)"
      >
        Redo
      </button>
      <button
        style={actionBarBtnStyle}
        onClick={editor.handleSave}
        title="Save layout"
      >
        Save
      </button>
      {!showResetConfirm ? (
        <button
          style={actionBarBtnStyle}
          onClick={() => setShowResetConfirm(true)}
          title="Reset to last saved layout"
        >
          Reset
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '22px', color: 'var(--pixel-reset-text)' }}>Reset?</span>
          <button
            style={{ ...actionBarBtnStyle, background: 'var(--pixel-danger-bg)', color: '#fff' }}
            onClick={() => { setShowResetConfirm(false); editor.handleReset() }}
          >
            Yes
          </button>
          <button
            style={actionBarBtnStyle}
            onClick={() => setShowResetConfirm(false)}
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

function App() {
  const editor = useEditorActions(getOfficeState, editorState)

  const isEditDirty = useCallback(() => editor.isEditMode && editor.isDirty, [editor.isEditMode, editor.isDirty])

  const {
    agents, selectedAgent, agentTools, agentStatuses, subagentTools, subagentCharacters,
    layoutReady, loadedAssets, chatList, chats, addUserMessage,
    mode, teamMembers, teamChats, addTeamUserMessage, agentNames,
    orchestratorSkillId, orchestratorBusy, dispatchedTasks, activePipeline, addOrchestratorUserMessage,
    teamToolActivities, thoughtData,
    interviewQuestions, clearInterview,
    aiProvider, deepseekModel,
    currentProject,
    scheduledTasks,
  } = useServerMessages(getOfficeState, editor.setLastSavedLayout, isEditDirty)

  // Set default zoom to 1x when layout first loads
  useEffect(() => {
    if (layoutReady) {
      editor.handleZoomChange(1)
    }
  }, [layoutReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'canvas' | 'chat'>('canvas')

  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isRouteDebug, setIsRouteDebug] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(
    () => localStorage.getItem('chatPanelCollapsed') === 'true'
  )
  const setChatCollapsed = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setIsChatCollapsed((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      localStorage.setItem('chatPanelCollapsed', String(next))
      return next
    })
  }, [])
  const [profileMember, setProfileMember] = useState<TeamMemberInfo | null>(null)
  const [hoveredSidebarSkillId, setHoveredSidebarSkillId] = useState<string | null>(null)

  const handleToggleDebugMode = useCallback(() => setIsDebugMode((prev) => !prev), [])
  const handleToggleRouteDebug = useCallback(() => setIsRouteDebug((prev) => !prev), [])

  const handleSelectAgent = useCallback((id: number) => {
    wsClient.postMessage({ type: 'focusAgent', id })
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0)
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  )

  const handleCloseAgent = useCallback((id: number) => {
    wsClient.postMessage({ type: 'closeAgent', id })
  }, [])

  const officeState = getOfficeState()

  // Enrich teamMembers with actual palette/hueShift from the live game characters
  // (skill file values may differ from what was randomly assigned at addAgent time)
  const enrichedTeamMembers = useMemo(() => {
    return teamMembers.map((m) => {
      const ch = officeState.characters.get(m.agentId)
      if (!ch) return m
      return { ...m, palette: ch.palette, hueShift: ch.hueShift }
    })
  }, [teamMembers, officeState])

  const handleClick = useCallback((agentId: number) => {
    // If clicked agent is a sub-agent, resolve to the parent
    const os = getOfficeState()
    const meta = os.subagentMeta.get(agentId)
    const focusId = meta ? meta.parentAgentId : agentId
    // Show character profile if team member info is available
    // enrichedTeamMembers already has actual palette/hueShift from officeState
    const member = enrichedTeamMembers.find((m) => m.agentId === focusId)
    if (member) {
      setProfileMember(member)
    } else {
      wsClient.postMessage({ type: 'focusAgent', id: focusId })
    }
  }, [enrichedTeamMembers])

  const handleCreateChat = useCallback(() => {
    wsClient.postMessage({ type: 'createChat' })
  }, [])

  const handleSendChatMessage = useCallback((chatId: string, message: string) => {
    addUserMessage(chatId, message)
    wsClient.postMessage({ type: 'sendChatMessage', chatId, message })
  }, [addUserMessage])

  const handleCloseChat = useCallback((chatId: string) => {
    wsClient.postMessage({ type: 'closeChat', chatId })
  }, [])

  const handleModeChange = useCallback((newMode: 'chat' | 'team') => {
    wsClient.postMessage({ type: 'setMode', mode: newMode })
  }, [])

  const handleSendTeamMessage = useCallback((skillId: string, message: string) => {
    addTeamUserMessage(skillId, message)
    wsClient.postMessage({ type: 'sendTeamMessage', skillId, message })
  }, [addTeamUserMessage])

  const handleSendOrchestratorMessage = useCallback((message: string) => {
    addOrchestratorUserMessage(message)
    wsClient.postMessage({ type: 'sendOrchestratorMessage', message })
  }, [addOrchestratorUserMessage])

  // Track background image locally for instant scene picker feedback
  const [activeBackgroundImage, setActiveBackgroundImage] = useState<string | undefined>(undefined)
  const currentBackgroundImage = activeBackgroundImage ?? officeState.getLayout().backgroundImage

  const handleSwitchScene = useCallback((layout: import('./office/types.js').OfficeLayout, defaultZoom: number) => {
    setActiveBackgroundImage(layout.backgroundImage)
    wsClient.postMessage({ type: 'importLayout', layout: layout as unknown as Record<string, unknown> })
    editor.handleZoomChange(defaultZoom)
    editor.panRef.current = { x: 0, y: 0 }
  }, [editor.handleZoomChange, editor.panRef])

  // Force dependency on editorTickForKeyboard to propagate keyboard-triggered re-renders
  void editorTickForKeyboard

  // Show "Press R to rotate" hint when a rotatable item is selected or being placed
  const showRotateHint = editor.isEditMode && (() => {
    if (editorState.selectedFurnitureUid) {
      const item = officeState.getLayout().furniture.find((f) => f.uid === editorState.selectedFurnitureUid)
      if (item && isRotatable(item.type)) return true
    }
    if (editorState.activeTool === EditTool.FURNITURE_PLACE && isRotatable(editorState.selectedFurnitureType)) {
      return true
    }
    return false
  })()

  if (!layoutReady) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pixel-text)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {/* Chat panel — collapsible (desktop) / full-screen overlay (mobile) */}
      <div
        className={`chat-panel-wrapper${isMobile && mobileView !== 'chat' ? ' mobile-hidden' : ''}`}
        style={isMobile ? undefined : {
          width: isChatCollapsed ? 0 : 340,
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <ChatPanel
          chatList={chatList}
          chats={chats}
          onCreateChat={handleCreateChat}
          onSendMessage={handleSendChatMessage}
          onCloseChat={handleCloseChat}
          atCharacterLimit={agents.length >= MAX_CHARACTERS}
          mode={mode}
          onModeChange={handleModeChange}
          teamMembers={enrichedTeamMembers}
          teamChats={teamChats}
          onSendTeamMessage={handleSendTeamMessage}
          orchestratorSkillId={orchestratorSkillId}
          orchestratorBusy={orchestratorBusy}
          dispatchedTasks={dispatchedTasks}
          activePipeline={activePipeline}
          onSendOrchestratorMessage={handleSendOrchestratorMessage}
          teamToolActivities={teamToolActivities}
          onToggleCollapse={() => {
            if (isMobile) {
              setMobileView('canvas')
            } else {
              setChatCollapsed(true)
            }
          }}
        />
      </div>

      {/* VS Code-style collapsed sidebar — hidden on mobile */}
      {!isMobile && isChatCollapsed && (
        <div className="hidden-scrollbar desktop-sidebar" style={{
          width: 64,
          flexShrink: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--pixel-bg)',
          borderRight: '2px solid var(--pixel-border)',
          padding: '6px 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 10,
        }}>
          {/* Expand button */}
          <button
            onClick={() => setChatCollapsed(false)}
            title="Expand panel"
            style={{
              width: 36,
              height: 36,
              padding: 0,
              background: 'rgba(255,255,255,0.06)',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pixel-text-dim)',
              flexShrink: 0,
              marginBottom: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polyline points="5,2 10,7 5,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="2" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Divider */}
          <div style={{ width: 44, height: 1, background: 'var(--pixel-border)', marginBottom: 8, flexShrink: 0 }} />

          {/* Agent cards: avatar + status dot + name — orchestrator first */}
          {[...enrichedTeamMembers].sort((a, b) => {
            if (a.skillId === orchestratorSkillId) return -1
            if (b.skillId === orchestratorSkillId) return 1
            return 0
          }).map((member) => {
            const isOrchestrator = member.skillId === orchestratorSkillId
            const isOrchestratorActive = isOrchestrator && orchestratorBusy
            const memberChat = teamChats[member.skillId]
            const isStreaming = memberChat?.isStreaming
            const hasPendingTask = dispatchedTasks.some((t) => t.targetSkillId === member.skillId && !t.completed)
            const hasCompleted = dispatchedTasks.some((t) => t.targetSkillId === member.skillId && t.completed)
            const isActive = isStreaming || hasPendingTask || isOrchestratorActive
            const statusColor = isActive
              ? 'var(--pixel-status-active)'
              : hasCompleted
                ? 'var(--pixel-green)'
                : 'rgba(255,255,255,0.2)'
            const isHovered = hoveredSidebarSkillId === member.skillId

            return (
              <div
                key={member.skillId}
                title={member.name}
                onClick={() => {
                  setChatCollapsed(false)
                  handleModeChange('team')
                }}
                onMouseEnter={() => setHoveredSidebarSkillId(member.skillId)}
                onMouseLeave={() => setHoveredSidebarSkillId(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 4px',
                  cursor: 'pointer',
                  width: '100%',
                  gap: 4,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Pixel avatar — clipped to head only, with notification badge */}
                <div style={{
                  position: 'relative',
                  width: 32,
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 32,
                    height: 22,
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    imageRendering: 'pixelated',
                  }}>
                    <PixelSpriteAvatar
                      palette={member.palette ?? 0}
                      hueShift={member.hueShift ?? 0}
                      zoom={2}
                      animated={isHovered}
                    />
                  </div>
                </div>

                {/* Status dot + name row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  width: '100%',
                  justifyContent: 'center',
                  paddingLeft: 2,
                  paddingRight: 2,
                }}>
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: statusColor,
                    animation: isActive ? 'pixel-agents-pulse 1.5s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{
                    fontSize: '10px',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
                    color: isOrchestrator ? '#c8a840' : 'var(--pixel-text-dim)',
                    userSelect: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 44,
                  }}>
                    {member.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div ref={containerRef} className="canvas-area" style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes pixel-agents-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pixel-agents-pulse { animation: pixel-agents-pulse ${PULSE_ANIMATION_DURATION_SEC}s ease-in-out infinite; }
      `}</style>

      <OfficeCanvas
        officeState={officeState}
        onClick={handleClick}
        isEditMode={editor.isEditMode}
        editorState={editorState}
        onEditorTileAction={editor.handleEditorTileAction}
        onEditorEraseAction={editor.handleEditorEraseAction}
        onEditorSelectionChange={editor.handleEditorSelectionChange}
        onDeleteSelected={editor.handleDeleteSelected}
        onRotateSelected={editor.handleRotateSelected}
        onDragMove={editor.handleDragMove}
        editorTick={editor.editorTick}
        zoom={editor.zoom}
        onZoomChange={editor.handleZoomChange}
        panRef={editor.panRef}
        isPanMode={editor.isPanMode}
        isDebugMode={isRouteDebug}
      />

      <ZoomControls
        zoom={editor.zoom}
        onZoomChange={editor.handleZoomChange}
        isPanMode={editor.isPanMode}
        onTogglePanMode={editor.handleTogglePanMode}
        onResetView={editor.handleResetView}
      />

      {/* Vignette overlay */}
      <div
        className="mobile-vignette"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--pixel-vignette)',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      <BottomToolbar
        isEditMode={editor.isEditMode}
        onToggleEditMode={editor.handleToggleEditMode}
        isStaticBackground={isStaticBackgroundLayout(officeState.getLayout())}
        currentBackgroundImage={currentBackgroundImage}
        onSwitchScene={handleSwitchScene}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        isRouteDebug={isRouteDebug}
        onToggleRouteDebug={handleToggleRouteDebug}
        teamMembers={enrichedTeamMembers}
        aiProvider={aiProvider}
        deepseekModel={deepseekModel}
        scheduledTasks={scheduledTasks}
      />

      {editor.isEditMode && editor.isDirty && (
        <EditActionBar editor={editor} editorState={editorState} />
      )}

      {showRotateHint && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: editor.isDirty ? 'translateX(calc(-50% + 100px))' : 'translateX(-50%)',
            zIndex: 49,
            background: 'var(--pixel-hint-bg)',
            color: '#fff',
            fontSize: '20px',
            padding: '3px 8px',
            borderRadius: 0,
            border: '2px solid var(--pixel-accent)',
            boxShadow: 'var(--pixel-shadow)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Press <b>R</b> to rotate
        </div>
      )}

      {editor.isEditMode && (() => {
        // Compute selected furniture color from current layout
        const selUid = editorState.selectedFurnitureUid
        const selColor = selUid
          ? officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null
          : null
        return (
          <EditorToolbar
            activeTool={editorState.activeTool}
            selectedTileType={editorState.selectedTileType}
            selectedFurnitureType={editorState.selectedFurnitureType}
            selectedFurnitureUid={selUid}
            selectedFurnitureColor={selColor}
            floorColor={editorState.floorColor}
            wallColor={editorState.wallColor}
            onToolChange={editor.handleToolChange}
            onTileTypeChange={editor.handleTileTypeChange}
            onFloorColorChange={editor.handleFloorColorChange}
            onWallColorChange={editor.handleWallColorChange}
            onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
            onFurnitureTypeChange={editor.handleFurnitureTypeChange}
            loadedAssets={loadedAssets}
          />
        )
      })()}

      <ToolOverlay
        officeState={officeState}
        agents={agents}
        agentTools={agentTools}
        subagentCharacters={subagentCharacters}
        containerRef={containerRef}
        zoom={editor.zoom}
        panRef={editor.panRef}
        onCloseAgent={handleCloseAgent}
      />

      <AgentLabels
        officeState={officeState}
        containerRef={containerRef}
        zoom={editor.zoom}
        panRef={editor.panRef}
        agentNames={agentNames}
      />

      <ThoughtBubbles
        officeState={officeState}
        containerRef={containerRef}
        zoom={editor.zoom}
        panRef={editor.panRef}
        thoughtData={thoughtData}
      />

      {isDebugMode && (
        <DebugView
          agents={agents}
          selectedAgent={selectedAgent}
          agentTools={agentTools}
          agentStatuses={agentStatuses}
          subagentTools={subagentTools}
          onSelectAgent={handleSelectAgent}
        />
      )}

      <ProjectStatusBar currentProject={currentProject} />
      <ConnectionStatus />

      {/* Mobile bottom navigation bar */}
      {isMobile && (
        <MobileNavBar
          activeView={mobileView}
          onViewChange={setMobileView}
          agentCount={enrichedTeamMembers.length}
          hasUnread={Object.values(teamChats).some((c) => c?.isStreaming)}
        />
      )}
      </div>
      {interviewQuestions && (
        <InterviewModal
          questions={interviewQuestions}
          onClose={clearInterview}
        />
      )}
      {profileMember && (
        <CharacterProfileModal
          member={profileMember}
          onClose={() => {
            const focusId = profileMember.agentId
            setProfileMember(null)
            wsClient.postMessage({ type: 'focusAgent', id: focusId })
          }}
        />
      )}
    </div>
  )
}

function AppWithAuth() {
  const [authState, setAuthState] = useState<'checking' | 'login' | 'ready'>('checking')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth-required')
        const { required } = await res.json() as { required: boolean }
        if (cancelled) return

        if (!required) {
          // No auth needed — connect and go
          wsClient.connect()
          setAuthState('ready')
          return
        }

        // Auth required — check existing token
        const token = localStorage.getItem('auth_token')
        if (token) {
          const vRes = await fetch('/api/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
          const { valid } = await vRes.json() as { valid: boolean }
          if (!cancelled && valid) {
            wsClient.connect()
            setAuthState('ready')
            return
          }
        }

        if (!cancelled) {
          localStorage.removeItem('auth_token')
          setAuthState('login')
        }
      } catch {
        // Server unreachable — show login so user can retry
        if (!cancelled) setAuthState('login')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleLogin = useCallback((token: string) => {
    localStorage.setItem('auth_token', token)
    wsClient.connect()
    setAuthState('ready')
  }, [])

  if (authState === 'checking') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: "'FS Pixel Sans', sans-serif",
        fontSize: '16px',
      }}>
        Connecting...
      </div>
    )
  }

  if (authState === 'login') {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <App />
}

export default AppWithAuth
