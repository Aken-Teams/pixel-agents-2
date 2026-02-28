import { useState, useEffect, useRef, useCallback } from 'react'
import type { OfficeState } from '../office/engine/officeState.js'
import type { OfficeLayout, ToolActivity } from '../office/types.js'
import type { ThoughtData } from '../components/ThoughtBubbles.js'
import { extractToolName } from '../office/toolUtils.js'
import { migrateLayoutColors } from '../office/layout/layoutSerializer.js'
import { buildDynamicCatalog } from '../office/layout/furnitureCatalog.js'
import { setFloorSprites } from '../office/floorTiles.js'
import { setWallSprites } from '../office/wallTiles.js'
import { setCharacterTemplates } from '../office/sprites/spriteData.js'
import { wsClient } from '../wsClient.js'
import { playDoneSound, playAlertSound, setSoundEnabled } from '../notificationSound.js'
import { loadBackgroundImage } from '../office/backgroundImage.js'

export interface SubagentCharacter {
  id: number
  parentAgentId: number
  parentToolId: string
  label: string
}

export interface FurnitureAsset {
  id: string
  name: string
  label: string
  category: string
  file: string
  width: number
  height: number
  footprintW: number
  footprintH: number
  isDesk: boolean
  canPlaceOnWalls: boolean
  partOfGroup?: boolean
  groupId?: string
  canPlaceOnSurfaces?: boolean
  backgroundTiles?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  streamBuffer: string
}

export interface TeamMemberInfo {
  skillId: string
  name: string
  agentId: number
  palette?: number
  hueShift?: number
  role?: 'orchestrator' | 'worker'
  description?: string
  bio?: string
}

export interface DispatchedTask {
  taskId: string
  targetSkillId: string
  targetAgentId: number
  description: string
  completed: boolean
}

export interface ServerMessageState {
  agents: number[]
  selectedAgent: number | null
  agentTools: Record<number, ToolActivity[]>
  agentStatuses: Record<number, string>
  subagentTools: Record<number, Record<string, ToolActivity[]>>
  subagentCharacters: SubagentCharacter[]
  layoutReady: boolean
  loadedAssets?: { catalog: FurnitureAsset[]; sprites: Record<string, string[][]> }
  chatList: string[]
  chats: Record<string, ChatState>
  addUserMessage: (chatId: string, content: string) => void
  mode: 'chat' | 'team'
  teamMembers: TeamMemberInfo[]
  teamChats: Record<string, ChatState>
  addTeamUserMessage: (skillId: string, content: string) => void
  agentNames: Record<number, string>
  orchestratorSkillId: string | null
  orchestratorBusy: boolean
  dispatchedTasks: DispatchedTask[]
  addOrchestratorUserMessage: (content: string) => void
  teamToolActivities: Record<string, string | null>
  thoughtData: Record<number, ThoughtData>
  interviewQuestions: { id: string; question: string }[] | null
  clearInterview: () => void
  aiProvider: string
  deepseekModel: string
  currentProject: { name: string; status: string; dir: string } | null
}

function saveAgentSeats(os: OfficeState): void {
  const seats: Record<number, { palette: number; hueShift: number; seatId: string | null }> = {}
  for (const ch of os.characters.values()) {
    if (ch.isSubagent) continue
    seats[ch.id] = { palette: ch.palette, hueShift: ch.hueShift, seatId: ch.seatId }
  }
  wsClient.postMessage({ type: 'saveAgentSeats', seats })
}

export function useServerMessages(
  getOfficeState: () => OfficeState,
  onLayoutLoaded?: (layout: OfficeLayout) => void,
  isEditDirty?: () => boolean,
): ServerMessageState {
  const [agents, setAgents] = useState<number[]>([])
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)
  const [agentTools, setAgentTools] = useState<Record<number, ToolActivity[]>>({})
  const [agentStatuses, setAgentStatuses] = useState<Record<number, string>>({})
  const [subagentTools, setSubagentTools] = useState<Record<number, Record<string, ToolActivity[]>>>({})
  const [subagentCharacters, setSubagentCharacters] = useState<SubagentCharacter[]>([])
  const [layoutReady, setLayoutReady] = useState(false)
  const [loadedAssets, setLoadedAssets] = useState<{ catalog: FurnitureAsset[]; sprites: Record<string, string[][]> } | undefined>()
  const [chatList, setChatList] = useState<string[]>([])
  const [chats, setChats] = useState<Record<string, ChatState>>({})
  const [mode, setMode] = useState<'chat' | 'team'>('chat')
  const [teamMembers, setTeamMembers] = useState<TeamMemberInfo[]>([])
  const [teamChats, setTeamChats] = useState<Record<string, ChatState>>({})
  const [agentNames, setAgentNames] = useState<Record<number, string>>({})
  const [orchestratorSkillId, setOrchestratorSkillId] = useState<string | null>(null)
  const [orchestratorBusy, setOrchestratorBusy] = useState(false)
  const [dispatchedTasks, setDispatchedTasks] = useState<DispatchedTask[]>([])
  const [teamToolActivities, setTeamToolActivities] = useState<Record<string, string | null>>({})
  const [thoughtData, setThoughtData] = useState<Record<number, ThoughtData>>({})
  const [interviewQuestions, setInterviewQuestions] = useState<{ id: string; question: string }[] | null>(null)
  const [aiProvider, setAIProvider] = useState<string>('claude-cli')
  const [deepseekModel, setDeepseekModel] = useState<string>('deepseek-chat')
  const [currentProject, setCurrentProject] = useState<{ name: string; status: string; dir: string } | null>(null)

  // Track whether initial layout has been loaded (ref to avoid re-render)
  const layoutReadyRef = useRef(false)
  // Chat agent tracking (chatId → agentId mapping)
  const chatAgentMapRef = useRef<Record<string, number>>({})
  // skillId → agentId lookup ref (populated from teamMembers)
  const skillAgentMapRef = useRef<Record<string, number>>({})

  useEffect(() => {
    // Buffer agents from existingAgents until layout is loaded
    let pendingAgents: Array<{ id: number; palette?: number; hueShift?: number; seatId?: string }> = []

    const handler = (raw: unknown) => {
      const msg = raw as Record<string, unknown>
      const os = getOfficeState()

      if (msg.type === 'layoutLoaded') {
        // Skip external layout updates while editor has unsaved changes
        if (layoutReadyRef.current && isEditDirty?.()) {
          console.log('[Webview] Skipping external layout update — editor has unsaved changes')
          return
        }
        const rawLayout = msg.layout as OfficeLayout | null
        const layout = rawLayout && rawLayout.version === 1 ? migrateLayoutColors(rawLayout) : null
        if (layout) {
          if (layout.backgroundImage) {
            loadBackgroundImage(`/assets/${layout.backgroundImage}`)
          }
          os.rebuildFromLayout(layout)
          onLayoutLoaded?.(layout)
        } else {
          // Default layout — snapshot whatever OfficeState built
          onLayoutLoaded?.(os.getLayout())
        }
        // Add buffered agents now that layout (and seats) are correct
        for (const p of pendingAgents) {
          os.addAgent(p.id, p.palette, p.hueShift, p.seatId, true)
        }
        pendingAgents = []
        layoutReadyRef.current = true
        setLayoutReady(true)
        if (os.characters.size > 0) {
          saveAgentSeats(os)
        }
      } else if (msg.type === 'agentCreated') {
        const id = msg.id as number
        const name = msg.name as string | undefined
        const role = msg.role as string | undefined
        setAgents((prev) => (prev.includes(id) ? prev : [...prev, id]))
        setSelectedAgent(id)
        if (name) {
          setAgentNames((prev) => ({ ...prev, [id]: name }))
        }
        const preferredSeatId = msg.preferredSeatId as string | undefined
        const preferredSeat = preferredSeatId ?? (role === 'orchestrator' ? 'seat-b1' : undefined)
        os.addAgent(id, undefined, undefined, preferredSeat, undefined, name)
        saveAgentSeats(os)
      } else if (msg.type === 'agentClosed') {
        const id = msg.id as number
        setAgents((prev) => prev.filter((a) => a !== id))
        setSelectedAgent((prev) => (prev === id ? null : prev))
        setAgentTools((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
        setAgentStatuses((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
        setSubagentTools((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
        // Remove all sub-agent characters belonging to this agent
        os.removeAllSubagents(id)
        setSubagentCharacters((prev) => prev.filter((s) => s.parentAgentId !== id))
        os.removeAgent(id)
      } else if (msg.type === 'existingAgents') {
        const incoming = msg.agents as number[]
        const meta = (msg.agentMeta || {}) as Record<number, { palette?: number; hueShift?: number; seatId?: string }>
        // Buffer agents — they'll be added in layoutLoaded after seats are built
        for (const id of incoming) {
          const m = meta[id]
          pendingAgents.push({ id, palette: m?.palette, hueShift: m?.hueShift, seatId: m?.seatId })
        }
        setAgents((prev) => {
          const ids = new Set(prev)
          const merged = [...prev]
          for (const id of incoming) {
            if (!ids.has(id)) {
              merged.push(id)
            }
          }
          return merged.sort((a, b) => a - b)
        })
      } else if (msg.type === 'agentToolStart') {
        const id = msg.id as number
        const toolId = msg.toolId as string
        const status = msg.status as string
        setAgentTools((prev) => {
          const list = prev[id] || []
          if (list.some((t) => t.toolId === toolId)) return prev
          return { ...prev, [id]: [...list, { toolId, status, done: false }] }
        })
        const toolName = extractToolName(status)
        os.setAgentTool(id, toolName)
        os.setAgentActive(id, true)
        os.clearPermissionBubble(id)
        // Mark agent as working for thought bubble (if no text yet)
        setThoughtData((prev) => {
          const existing = prev[id]
          if (existing && existing.text) return prev
          return {
            ...prev,
            [id]: { text: '', updatedAt: Date.now(), isWorking: true, justCompleted: false },
          }
        })
        // Create sub-agent character for Task tool subtasks
        if (status.startsWith('Subtask:')) {
          const label = status.slice('Subtask:'.length).trim()
          const subId = os.addSubagent(id, toolId)
          setSubagentCharacters((prev) => {
            if (prev.some((s) => s.id === subId)) return prev
            return [...prev, { id: subId, parentAgentId: id, parentToolId: toolId, label }]
          })
        }
      } else if (msg.type === 'agentToolDone') {
        const id = msg.id as number
        const toolId = msg.toolId as string
        setAgentTools((prev) => {
          const list = prev[id]
          if (!list) return prev
          return {
            ...prev,
            [id]: list.map((t) => (t.toolId === toolId ? { ...t, done: true } : t)),
          }
        })
      } else if (msg.type === 'agentToolsClear') {
        const id = msg.id as number
        setAgentTools((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
        setSubagentTools((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
        // Remove all sub-agent characters belonging to this agent
        os.removeAllSubagents(id)
        setSubagentCharacters((prev) => prev.filter((s) => s.parentAgentId !== id))
        os.setAgentTool(id, null)
        os.clearPermissionBubble(id)
      } else if (msg.type === 'agentSelected') {
        const id = msg.id as number
        setSelectedAgent(id)
      } else if (msg.type === 'agentStatus') {
        const id = msg.id as number
        const status = msg.status as string
        setAgentStatuses((prev) => {
          if (status === 'active' || status === 'idle') {
            if (!(id in prev)) return prev
            const next = { ...prev }
            delete next[id]
            return next
          }
          return { ...prev, [id]: status }
        })
        os.setAgentActive(id, status === 'active')
        if (status === 'waiting') {
          os.showWaitingBubble(id)
          playDoneSound()
        }
      } else if (msg.type === 'agentToolPermission') {
        const id = msg.id as number
        setAgentTools((prev) => {
          const list = prev[id]
          if (!list) return prev
          return {
            ...prev,
            [id]: list.map((t) => (t.done ? t : { ...t, permissionWait: true })),
          }
        })
        os.showPermissionBubble(id)
      } else if (msg.type === 'subagentToolPermission') {
        const id = msg.id as number
        const parentToolId = msg.parentToolId as string
        // Show permission bubble on the sub-agent character
        const subId = os.getSubagentId(id, parentToolId)
        if (subId !== null) {
          os.showPermissionBubble(subId)
        }
      } else if (msg.type === 'agentToolPermissionClear') {
        const id = msg.id as number
        setAgentTools((prev) => {
          const list = prev[id]
          if (!list) return prev
          const hasPermission = list.some((t) => t.permissionWait)
          if (!hasPermission) return prev
          return {
            ...prev,
            [id]: list.map((t) => (t.permissionWait ? { ...t, permissionWait: false } : t)),
          }
        })
        os.clearPermissionBubble(id)
        // Also clear permission bubbles on all sub-agent characters of this parent
        for (const [subId, meta] of os.subagentMeta) {
          if (meta.parentAgentId === id) {
            os.clearPermissionBubble(subId)
          }
        }
      } else if (msg.type === 'subagentToolStart') {
        const id = msg.id as number
        const parentToolId = msg.parentToolId as string
        const toolId = msg.toolId as string
        const status = msg.status as string
        setSubagentTools((prev) => {
          const agentSubs = prev[id] || {}
          const list = agentSubs[parentToolId] || []
          if (list.some((t) => t.toolId === toolId)) return prev
          return { ...prev, [id]: { ...agentSubs, [parentToolId]: [...list, { toolId, status, done: false }] } }
        })
        // Update sub-agent character's tool and active state
        const subId = os.getSubagentId(id, parentToolId)
        if (subId !== null) {
          const subToolName = extractToolName(status)
          os.setAgentTool(subId, subToolName)
          os.setAgentActive(subId, true)
        }
      } else if (msg.type === 'subagentToolDone') {
        const id = msg.id as number
        const parentToolId = msg.parentToolId as string
        const toolId = msg.toolId as string
        setSubagentTools((prev) => {
          const agentSubs = prev[id]
          if (!agentSubs) return prev
          const list = agentSubs[parentToolId]
          if (!list) return prev
          return {
            ...prev,
            [id]: { ...agentSubs, [parentToolId]: list.map((t) => (t.toolId === toolId ? { ...t, done: true } : t)) },
          }
        })
      } else if (msg.type === 'subagentClear') {
        const id = msg.id as number
        const parentToolId = msg.parentToolId as string
        setSubagentTools((prev) => {
          const agentSubs = prev[id]
          if (!agentSubs || !(parentToolId in agentSubs)) return prev
          const next = { ...agentSubs }
          delete next[parentToolId]
          if (Object.keys(next).length === 0) {
            const outer = { ...prev }
            delete outer[id]
            return outer
          }
          return { ...prev, [id]: next }
        })
        // Remove sub-agent character
        os.removeSubagent(id, parentToolId)
        setSubagentCharacters((prev) => prev.filter((s) => !(s.parentAgentId === id && s.parentToolId === parentToolId)))
      } else if (msg.type === 'characterSpritesLoaded') {
        const characters = msg.characters as Array<{ down: string[][][]; up: string[][][]; right: string[][][] }>
        console.log(`[Webview] Received ${characters.length} pre-colored character sprites`)
        setCharacterTemplates(characters)
      } else if (msg.type === 'floorTilesLoaded') {
        const sprites = msg.sprites as string[][][]
        console.log(`[Webview] Received ${sprites.length} floor tile patterns`)
        setFloorSprites(sprites)
      } else if (msg.type === 'wallTilesLoaded') {
        const sprites = msg.sprites as string[][][]
        console.log(`[Webview] Received ${sprites.length} wall tile sprites`)
        setWallSprites(sprites)
      } else if (msg.type === 'settingsLoaded') {
        const soundOn = msg.soundEnabled as boolean
        setSoundEnabled(soundOn)
        if (msg.mode) {
          setMode(msg.mode as 'chat' | 'team')
        }
        if (msg.aiProvider) {
          setAIProvider(msg.aiProvider as string)
        }
        if (msg.deepseekModel) {
          setDeepseekModel(msg.deepseekModel as string)
        }
      } else if (msg.type === 'furnitureAssetsLoaded') {
        try {
          const catalog = msg.catalog as FurnitureAsset[]
          const sprites = msg.sprites as Record<string, string[][]>
          console.log(`[Webview] Loaded ${catalog.length} furniture assets`)
          // Build dynamic catalog immediately so getCatalogEntry() works when layoutLoaded arrives next
          buildDynamicCatalog({ catalog, sprites })
          setLoadedAssets({ catalog, sprites })
        } catch (err) {
          console.error(`[Webview] Error processing furnitureAssetsLoaded:`, err)
        }
      } else if (msg.type === 'chatCreated') {
        const chatId = msg.chatId as string
        const agentId = msg.agentId as number | undefined
        if (agentId !== undefined) {
          chatAgentMapRef.current[chatId] = agentId
        }
        setChatList((prev) => prev.includes(chatId) ? prev : [...prev, chatId])
        setChats((prev) => ({
          ...prev,
          [chatId]: { messages: [], isStreaming: false, streamBuffer: '' },
        }))
      } else if (msg.type === 'chatClosed') {
        const chatId = msg.chatId as string
        delete chatAgentMapRef.current[chatId]
        setChatList((prev) => prev.filter((id) => id !== chatId))
        setChats((prev) => {
          const next = { ...prev }
          delete next[chatId]
          return next
        })
      } else if (msg.type === 'chatStreamChunk') {
        const chatId = msg.chatId as string
        const text = msg.text as string
        setChats((prev) => {
          const chat = prev[chatId]
          if (!chat) return prev
          return {
            ...prev,
            [chatId]: { ...chat, isStreaming: true, streamBuffer: chat.streamBuffer + text },
          }
        })
        // Update thought bubble for chat agent (keep last ~100 chars)
        const chatChunkAgentId = chatAgentMapRef.current[chatId]
        if (chatChunkAgentId !== undefined) {
          setThoughtData((prev) => {
            const combined = (prev[chatChunkAgentId]?.text ?? '') + text
            return {
              ...prev,
              [chatChunkAgentId]: {
                text: combined.length > 120 ? combined.slice(-100) : combined,
                updatedAt: Date.now(),
                isWorking: true,
                justCompleted: false,
              },
            }
          })
        }
      } else if (msg.type === 'chatStreamEnd') {
        const chatId = msg.chatId as string
        // Clear thinking bubble
        const streamEndAgentId = msg.agentId as number | undefined
        if (streamEndAgentId !== undefined && streamEndAgentId >= 0) {
          os.clearThinkingBubble(streamEndAgentId)
        }
        // Mark thought as completed for chat agent
        const chatEndAgentId = chatAgentMapRef.current[chatId] ?? streamEndAgentId
        if (chatEndAgentId !== undefined) {
          setThoughtData((prev) => {
            if (!prev[chatEndAgentId]) return prev
            return {
              ...prev,
              [chatEndAgentId]: {
                text: '已完成',
                updatedAt: Date.now(),
                isWorking: false,
                justCompleted: true,
              },
            }
          })
          setTimeout(() => {
            setThoughtData((prev) => {
              const current = prev[chatEndAgentId]
              if (current && current.justCompleted) {
                const next = { ...prev }
                delete next[chatEndAgentId]
                return next
              }
              return prev
            })
          }, 3000)
        }
        setChats((prev) => {
          const chat = prev[chatId]
          if (!chat) return prev
          const newMessages = [...chat.messages]
          if (chat.streamBuffer.trim()) {
            newMessages.push({ role: 'assistant', content: chat.streamBuffer })
          }
          return {
            ...prev,
            [chatId]: { messages: newMessages, isStreaming: false, streamBuffer: '' },
          }
        })
      } else if (msg.type === 'chatError') {
        const chatId = msg.chatId as string
        const error = msg.error as string
        setChats((prev) => {
          const chat = prev[chatId]
          if (!chat) return prev
          return {
            ...prev,
            [chatId]: {
              ...chat,
              isStreaming: false,
              streamBuffer: '',
              messages: [...chat.messages, { role: 'assistant', content: `Error: ${error}` }],
            },
          }
        })
      } else if (msg.type === 'chatAlertBubble') {
        const agentId = msg.agentId as number
        os.showAlertBubble(agentId)
        playAlertSound()
      } else if (msg.type === 'chatThinkingChunk') {
        // Thinking chunks no longer used for UI — ignored
      } else if (msg.type === 'existingChats') {
        const chatIds = msg.chatIds as string[]
        setChatList(chatIds)
        setChats((prev) => {
          const next = { ...prev }
          for (const chatId of chatIds) {
            if (!next[chatId]) {
              next[chatId] = { messages: [], isStreaming: false, streamBuffer: '' }
            }
          }
          return next
        })
      } else if (msg.type === 'teamLoaded') {
        const members = msg.members as TeamMemberInfo[]
        setTeamMembers(members)
        // Set orchestrator
        const orchId = (msg.orchestratorSkillId as string) || null
        setOrchestratorSkillId(orchId)
        // Initialize team chat states for new members
        setTeamChats((prev) => {
          const next = { ...prev }
          for (const m of members) {
            if (!next[m.skillId]) {
              const initMessages = m.skillId === 'receptionist'
                ? [{
                    role: 'assistant' as const,
                    content: '你好！我是 AI-Agents Office 的小幫手 👋\n\n你可以問我以下問題：\n\n- 這個辦公室是什麼？有什麼特色？\n- 怎麼開始使用？\n- Chat 和 Team 模式有什麼差別？\n- AI 團隊能幫我做什麼任務？\n- 辦公室裡有哪些 AI 成員？\n- Team 模式怎麼運作？\n\n直接輸入你的問題吧！',
                  }]
                : m.role === 'orchestrator'
                ? [{
                    role: 'assistant' as const,
                    content: '你好！我是技術長，AI-Agents Office 的專案指揮官 🎯\n\n**我的職責**：分析你的需求，拆解任務，並協調前端、後端、設計師、QA 等專業成員協作完成。\n\n**怎麼開始**：直接告訴我你想做什麼，例如：\n\n- 「幫我建立一個待辦清單 App」\n- 「設計一個使用者登入系統」\n- 「優化這段程式碼的效能」\n- 「幫我規劃這個功能的架構」\n\n我會拆解需求，依序派任務給各專業成員，最後整合成果回覆給你。',
                  }]
                : []
              next[m.skillId] = { messages: initMessages, isStreaming: false, streamBuffer: '' }
            }
          }
          return next
        })
        // Store agent names and skill→agent mapping
        const names: Record<number, string> = {}
        const skillMap: Record<string, number> = {}
        for (const m of members) {
          names[m.agentId] = m.name
          skillMap[m.skillId] = m.agentId
        }
        skillAgentMapRef.current = skillMap
        setAgentNames((prev) => ({ ...prev, ...names }))
      } else if (msg.type === 'teamStreamChunk') {
        const skillId = msg.skillId as string
        const text = msg.text as string
        setTeamChats((prev) => {
          const chat = prev[skillId]
          if (!chat) return prev
          return {
            ...prev,
            [skillId]: { ...chat, isStreaming: true, streamBuffer: chat.streamBuffer + text },
          }
        })
        // Update thought bubble with latest text snippet (keep last ~100 chars)
        const chunkAgentId = skillAgentMapRef.current[skillId]
        if (chunkAgentId !== undefined) {
          setThoughtData((prev) => {
            const existing = prev[chunkAgentId]
            const combined = (existing?.text ?? '') + text
            return {
              ...prev,
              [chunkAgentId]: {
                text: combined.length > 120 ? combined.slice(-100) : combined,
                updatedAt: Date.now(),
                isWorking: true,
                justCompleted: false,
                workStartedAt: existing?.workStartedAt ?? Date.now(),
                toolStatus: undefined, // clear tool status when streaming text
              },
            }
          })
        }
      } else if (msg.type === 'teamStreamEnd') {
        const skillId = msg.skillId as string
        const agentId = msg.agentId as number | undefined
        if (agentId !== undefined && agentId >= 0) {
          os.clearThinkingBubble(agentId)
        }
        setTeamToolActivities((prev) => ({ ...prev, [skillId]: null }))
        // Mark thought as completed
        const endAgentId = skillAgentMapRef.current[skillId]
        if (endAgentId !== undefined) {
          setThoughtData((prev) => ({
            ...prev,
            [endAgentId]: {
              text: '已完成任務',
              updatedAt: Date.now(),
              isWorking: false,
              justCompleted: true,
            },
          }))
          // Auto-clear the completed message after a delay
          setTimeout(() => {
            setThoughtData((prev) => {
              const current = prev[endAgentId]
              if (current && current.justCompleted) {
                const next = { ...prev }
                delete next[endAgentId]
                return next
              }
              return prev
            })
          }, 3000)
        }
        setTeamChats((prev) => {
          const chat = prev[skillId]
          if (!chat) return prev
          const newMessages = [...chat.messages]
          if (chat.streamBuffer.trim()) {
            newMessages.push({ role: 'assistant', content: chat.streamBuffer })
          }
          return {
            ...prev,
            [skillId]: { messages: newMessages, isStreaming: false, streamBuffer: '' },
          }
        })
      } else if (msg.type === 'teamError') {
        const skillId = msg.skillId as string
        const error = msg.error as string
        setTeamChats((prev) => {
          const chat = prev[skillId]
          if (!chat) return prev
          return {
            ...prev,
            [skillId]: {
              ...chat,
              isStreaming: false,
              streamBuffer: '',
              messages: [...chat.messages, { role: 'assistant', content: `Error: ${error}` }],
            },
          }
        })
      } else if (msg.type === 'teamAlertBubble') {
        const agentId = msg.agentId as number
        os.showAlertBubble(agentId)
        playAlertSound()
      } else if (msg.type === 'taskDispatched') {
        const task: DispatchedTask = {
          taskId: msg.taskId as string,
          targetSkillId: msg.targetSkillId as string,
          targetAgentId: msg.targetAgentId as number,
          description: msg.description as string,
          completed: false,
        }
        setDispatchedTasks((prev) => [...prev, task])
        // Mark target agent as working for thought bubble
        const targetAgentId = msg.targetAgentId as number
        if (targetAgentId !== undefined) {
          setThoughtData((prev) => ({
            ...prev,
            [targetAgentId]: {
              text: '',
              updatedAt: Date.now(),
              isWorking: true,
              justCompleted: false,
              workStartedAt: Date.now(),
            },
          }))
        }
      } else if (msg.type === 'taskCompleted') {
        const taskId = msg.taskId as string
        setDispatchedTasks((prev) =>
          prev.map((t) => t.taskId === taskId ? { ...t, completed: true } : t),
        )
      } else if (msg.type === 'orchestratorBusy') {
        setOrchestratorBusy(msg.busy as boolean)
        if (!(msg.busy as boolean)) {
          // Clear transient data when orchestration finishes
          // Keep dispatchedTasks so green "completed" dots remain visible
          // (they get cleared on next user message via addOrchestratorUserMessage)
          setTeamToolActivities({})
          setThoughtData({})
        }
      } else if (msg.type === 'teamToolActivity') {
        const skillId = msg.skillId as string
        const status = msg.status as string | null
        setTeamToolActivities((prev) => ({ ...prev, [skillId]: status }))
        // Mark agent as working for thought bubble (but don't override existing text)
        const toolAgentId = skillAgentMapRef.current[skillId]
        if (toolAgentId !== undefined && status) {
          setThoughtData((prev) => {
            const existing = prev[toolAgentId]
            return {
              ...prev,
              [toolAgentId]: {
                text: existing?.text ?? '',
                updatedAt: Date.now(),
                isWorking: true,
                justCompleted: false,
                workStartedAt: existing?.workStartedAt ?? Date.now(),
                toolStatus: status,
              },
            }
          })
        }
      // ── Interview ──
      } else if (msg.type === 'interviewRequest') {
        setInterviewQuestions(msg.questions as { id: string; question: string }[])
      // ── Project History Restore ──
      } else if (msg.type === 'projectHistoryRestored') {
        const history = msg.history as Record<string, { role: string; content: string }[]>
        setTeamChats((prev) => {
          const next = { ...prev }
          for (const [skillId, messages] of Object.entries(history)) {
            next[skillId] = {
              messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
              isStreaming: false,
              streamBuffer: '',
            }
          }
          return next
        })
      // ── Project State ──
      } else if (msg.type === 'projectLoaded') {
        setCurrentProject({
          name: msg.name as string,
          status: msg.status as string,
          dir: msg.projectDir as string,
        })
      } else if (msg.type === 'projectCleared') {
        setCurrentProject(null)
      // ── Idle Chat ──
      } else if (msg.type === 'idleChatMessage') {
        const agentId = msg.agentId as number
        const text = msg.text as string
        setThoughtData((prev) => ({
          ...prev,
          [agentId]: {
            text,
            updatedAt: Date.now(),
            isWorking: false,
            justCompleted: false,
            isIdleChat: true,
          },
        }))
      } else if (msg.type === 'idleChatEnd') {
        const agentId = msg.agentId as number
        setThoughtData((prev) => {
          const next = { ...prev }
          // Only remove if it's an idle chat entry (don't remove work bubbles)
          if (next[agentId]?.isIdleChat) {
            delete next[agentId]
          }
          return next
        })
      }
    }
    wsClient.addMessageListener(handler)
    // Send webviewReady now (if already connected) and on every reconnect
    wsClient.postMessage({ type: 'webviewReady' })
    const onConnection = (connected: boolean) => {
      if (connected) {
        wsClient.postMessage({ type: 'webviewReady' })
      }
    }
    wsClient.addConnectionListener(onConnection)
    return () => {
      wsClient.removeMessageListener(handler)
      wsClient.removeConnectionListener(onConnection)
    }
  }, [getOfficeState])

  const addUserMessage = useCallback((chatId: string, content: string) => {
    setChats((prev) => {
      const chat = prev[chatId]
      if (!chat) return prev
      return {
        ...prev,
        [chatId]: {
          ...chat,
          messages: [...chat.messages, { role: 'user', content }],
          isStreaming: true,
        },
      }
    })
  }, [])

  const addTeamUserMessage = useCallback((skillId: string, content: string) => {
    setTeamChats((prev) => {
      const chat = prev[skillId]
      if (!chat) return prev
      return {
        ...prev,
        [skillId]: {
          ...chat,
          messages: [...chat.messages, { role: 'user', content }],
          isStreaming: true,
        },
      }
    })
  }, [])

  const clearInterview = useCallback(() => {
    setInterviewQuestions(null)
  }, [])

  const addOrchestratorUserMessage = useCallback((content: string) => {
    // In orchestrator mode, user messages go to the orchestrator's chat
    if (!orchestratorSkillId) return
    setTeamChats((prev) => {
      const chat = prev[orchestratorSkillId]
      if (!chat) return prev
      return {
        ...prev,
        [orchestratorSkillId]: {
          ...chat,
          messages: [...chat.messages, { role: 'user', content }],
          isStreaming: true,
        },
      }
    })
    // Clear previous tasks for new orchestration round
    setDispatchedTasks([])
  }, [orchestratorSkillId])

  return {
    agents, selectedAgent, agentTools, agentStatuses, subagentTools, subagentCharacters,
    layoutReady, loadedAssets, chatList, chats, addUserMessage,
    mode, teamMembers, teamChats, addTeamUserMessage, agentNames,
    orchestratorSkillId, orchestratorBusy, dispatchedTasks, addOrchestratorUserMessage,
    teamToolActivities, thoughtData,
    interviewQuestions, clearInterview,
    aiProvider, deepseekModel,
    currentProject,
  }
}
