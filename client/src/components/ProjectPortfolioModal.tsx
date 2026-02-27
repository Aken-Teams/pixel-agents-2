import { useState, useEffect, useCallback } from 'react'
import { wsClient } from '../wsClient.js'
import { PixelSpriteAvatar } from './PixelSpriteAvatar.js'

interface TeamMemberInfo {
  skillId: string
  name: string
  agentId: number
  palette?: number
  hueShift?: number
  role?: 'orchestrator' | 'worker'
}

interface ProjectSummary {
  name: string
  dir: string
  status: 'running' | 'paused' | 'completed'
  updatedAt: string
  currentPhase: number
}

interface TaskRecord {
  skillId: string
  status: 'dispatched' | 'completed' | 'failed'
  description: string
  phase?: number
}

interface DocMeta {
  fileName: string
  agentName: string
  skillId: string
  time: string
  summary: string
  sizeBytes: number
}

interface ProjectDetail {
  projectDir: string
  name: string
  status: string
  currentPhase: number
  userMessage: string
  tasks: Record<string, TaskRecord>
  docs: DocMeta[]
}

interface ProjectPortfolioModalProps {
  onClose: () => void
  teamMembers: TeamMemberInfo[]
}

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  running: '#4ade80',
  paused: '#facc15',
  completed: '#94a3b8',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  completed: '#4ade80',
  dispatched: '#facc15',
  failed: '#f87171',
}

const SKILL_ROLE_NAMES: Record<string, string> = {
  techlead: '技術長',
  pm: '產品經理',
  architect: '架構師',
  designer: '設計師',
  frontend: '前端工程師',
  backend: '後端工程師',
  qa: 'QA 工程師',
  security: '資安工程師',
  devops: '維運工程師',
  dba: '資料庫管理師',
  reviewer: '程式碼審查員',
  'technical-writer': '技術文件撰寫師',
  sre: 'SRE 工程師',
  data: '資料工程師',
  mobile: '行動端工程師',
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${min}`
  } catch {
    return iso
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(1)}KB`
}

// ── Simple Markdown renderer ────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(raw: string): string {
  // Normalize line endings (Windows CRLF → LF) and strip BOM
  const normalized = raw.replace(/\uFEFF/g, '').replace(/\r\n?/g, '\n')
  // Strip metadata header
  const text = normalized.replace(/^(<!--[\s\S]*?-->\s*\n)+/, '').trimStart()

  const lines = text.split('\n')
  const html: string[] = []
  let inCodeBlock = false
  let inTable = false
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        html.push('</pre>')
        inCodeBlock = false
      } else {
        if (inList) { html.push('</ul>'); inList = false }
        if (inTable) { html.push('</table>'); inTable = false }
        html.push('<pre style="background:rgba(255,255,255,0.05);padding:8px;overflow-x:auto;font-size:14px;font-family:\'Cascadia Code\',\'Fira Code\',Consolas,monospace;border:1px solid rgba(255,255,255,0.1)">')
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      html.push(escapeHtml(line))
      html.push('\n')
      continue
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false }
      if (inTable) { html.push('</table>'); inTable = false }
      html.push('<div style="height:8px"></div>')
      continue
    }

    // Horizontal rule (---, ***, ___)
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      if (inList) { html.push('</ul>'); inList = false }
      if (inTable) { html.push('</table>'); inTable = false }
      html.push('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:10px 0" />')
      continue
    }

    // Table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Skip separator rows
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue
      if (!inTable) {
        if (inList) { html.push('</ul>'); inList = false }
        html.push('<table style="width:100%;border-collapse:collapse;font-size:14px;margin:4px 0">')
        inTable = true
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      const isHeader = i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())
      const tag = isHeader ? 'th' : 'td'
      const style = isHeader
        ? 'padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.2);text-align:left;font-weight:bold'
        : 'padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:left'
      html.push('<tr>' + cells.map(c => `<${tag} style="${style}">${inlineFormat(escapeHtml(c))}</${tag}>`).join('') + '</tr>')
      continue
    }
    if (inTable) { html.push('</table>'); inTable = false }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      if (inList) { html.push('</ul>'); inList = false }
      const level = headingMatch[1].length
      const sizes: Record<number, string> = { 1: '22px', 2: '19px', 3: '16px', 4: '15px' }
      html.push(`<div style="font-size:${sizes[level] ?? '15px'};font-weight:bold;margin:12px 0 6px;padding-bottom:4px;border-bottom:${level <= 2 ? '1px solid rgba(255,255,255,0.15)' : 'none'}">${inlineFormat(escapeHtml(headingMatch[2]))}</div>`)
      continue
    }

    // List items
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      if (!inList) { html.push('<ul style="margin:4px 0;padding-left:20px">'); inList = true }
      const content = line.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '')
      // Handle checkbox
      const checkbox = content.startsWith('[ ] ') ? '<span style="opacity:0.4">☐</span> '
        : content.startsWith('[x] ') || content.startsWith('[X] ') ? '<span style="color:#4ade80">☑</span> '
        : ''
      const cleaned = checkbox ? content.slice(4) : content
      html.push(`<li style="margin:2px 0;font-size:15px">${checkbox}${inlineFormat(escapeHtml(cleaned))}</li>`)
      continue
    }
    if (inList) { html.push('</ul>'); inList = false }

    // Regular paragraph
    html.push(`<p style="margin:4px 0;font-size:15px;line-height:1.5">${inlineFormat(escapeHtml(line))}</p>`)
  }

  if (inCodeBlock) html.push('</pre>')
  if (inList) html.push('</ul>')
  if (inTable) html.push('</table>')

  return html.join('')
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;font-size:13px;font-family:\'Cascadia Code\',Consolas,monospace">$1</code>')
}

// ── Main Component ──────────────────────────────────────────

export function ProjectPortfolioModal({ onClose, teamMembers }: ProjectPortfolioModalProps) {
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<{ doc: DocMeta; content: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)

  // Request project list on mount
  useEffect(() => {
    wsClient.postMessage({ type: 'listProjects' })
  }, [])

  // Listen for WS messages
  useEffect(() => {
    const handler = (msg: unknown) => {
      const data = msg as { type: string; [key: string]: unknown }
      if (data.type === 'projectList') {
        setProjects((data as { projects: ProjectSummary[] }).projects ?? [])
        setLoading(false)
      } else if (data.type === 'projectDetail') {
        const d = data as unknown as ProjectDetail
        setSelectedProject(d)
        setView('detail')
        setSelectedDoc(null)
      } else if (data.type === 'docContent') {
        const d = data as { fileName: string; content: string }
        setSelectedDoc(prev => prev && prev.doc.fileName === d.fileName ? { ...prev, content: d.content } : prev)
      }
    }
    wsClient.addMessageListener(handler)
    return () => wsClient.removeMessageListener(handler)
  }, [])

  const handleProjectClick = useCallback((dir: string) => {
    wsClient.postMessage({ type: 'getProjectDetail', projectDir: dir })
  }, [])

  const handleDocClick = useCallback((doc: DocMeta, projectDir: string) => {
    setSelectedDoc({ doc, content: null })
    wsClient.postMessage({ type: 'getDocContent', projectDir, fileName: doc.fileName })
  }, [])

  const handleBack = useCallback(() => {
    if (selectedDoc) {
      setSelectedDoc(null)
    } else {
      setView('list')
      setSelectedProject(null)
    }
  }, [selectedDoc])

  const findMember = useCallback((skillId: string) => {
    return teamMembers.find(m => m.skillId === skillId)
  }, [teamMembers])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 75,
        }}
      />
      {/* Full-screen panel */}
      <div
        className="interview-modal"
        style={{
          position: 'fixed',
          top: '5%',
          left: '5%',
          width: '90%',
          height: '90%',
          zIndex: 76,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          boxShadow: 'var(--pixel-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            borderBottom: '2px solid var(--pixel-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {view === 'detail' && (
              <button
                onClick={handleBack}
                onMouseEnter={() => setHovered('back')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === 'back' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '2px 8px',
                }}
              >
                {selectedDoc ? '< Docs' : '< Back'}
              </button>
            )}
            <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.9)' }}>
              {view === 'list' ? 'Portfolio' : selectedProject?.name ?? ''}
            </span>
            {view === 'detail' && selectedProject && (
              <span style={{ fontSize: '16px', color: STATUS_COLORS[selectedProject.status] ?? '#94a3b8' }}>
                {STATUS_LABELS[selectedProject.status] ?? selectedProject.status}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setHovered('close')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'close' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255,255,255,0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'list' ? (
            <ProjectListView
              projects={projects}
              loading={loading}
              hovered={hovered}
              setHovered={setHovered}
              onProjectClick={handleProjectClick}
            />
          ) : selectedProject && !selectedDoc ? (
            <ProjectDetailView
              project={selectedProject}
              hovered={hovered}
              setHovered={setHovered}
              findMember={findMember}
              onDocClick={handleDocClick}
            />
          ) : selectedDoc && selectedProject ? (
            <DocPreviewView
              doc={selectedDoc.doc}
              content={selectedDoc.content}
              findMember={findMember}
            />
          ) : null}
        </div>
      </div>
    </>
  )
}

// ── Project List View ───────────────────────────────────────

function ProjectListView({
  projects, loading, hovered, setHovered, onProjectClick,
}: {
  projects: ProjectSummary[]
  loading: boolean
  hovered: string | null
  setHovered: (v: string | null) => void
  onProjectClick: (dir: string) => void
}) {
  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '8px 0' }}>
      {loading && (
        <div style={{ padding: '32px', fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          Loading...
        </div>
      )}
      {!loading && projects.length === 0 && (
        <div style={{ padding: '32px', fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          No projects yet
        </div>
      )}
      {projects.map((p) => (
        <button
          key={p.dir}
          onClick={() => onProjectClick(p.dir)}
          onMouseEnter={() => setHovered(p.dir)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '100%',
            padding: '10px 16px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.85)',
            background: hovered === p.dir ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
            textAlign: 'left',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {p.name}
            </span>
            <span style={{ fontSize: '16px', color: STATUS_COLORS[p.status] ?? '#94a3b8', flexShrink: 0 }}>
              {STATUS_LABELS[p.status] ?? p.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '16px', color: 'rgba(255,255,255,0.45)' }}>
            <span>Phase {p.currentPhase}</span>
            <span>{formatTime(p.updatedAt)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Project Detail View ─────────────────────────────────────

function ProjectDetailView({
  project, hovered, setHovered, findMember, onDocClick,
}: {
  project: ProjectDetail
  hovered: string | null
  setHovered: (v: string | null) => void
  findMember: (skillId: string) => TeamMemberInfo | undefined
  onDocClick: (doc: DocMeta, projectDir: string) => void
}) {
  const taskEntries = Object.entries(project.tasks).sort(([a], [b]) => {
    const na = parseInt(a.replace('task-', '')) || 0
    const nb = parseInt(b.replace('task-', '')) || 0
    return na - nb
  })

  const completedCount = taskEntries.filter(([, t]) => t.status === 'completed').length

  // Group tasks by phase
  const phaseGroups: { phase: number; tasks: [string, TaskRecord][] }[] = []
  for (const entry of taskEntries) {
    const phase = entry[1].phase ?? 0
    let group = phaseGroups.find(g => g.phase === phase)
    if (!group) {
      group = { phase, tasks: [] }
      phaseGroups.push(group)
    }
    group.tasks.push(entry)
  }
  phaseGroups.sort((a, b) => a.phase - b.phase)
  const showPhaseHeaders = phaseGroups.length > 1

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left: Task Timeline */}
      <div
        style={{
          width: '35%',
          borderRight: '2px solid var(--pixel-border)',
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {/* User message */}
        <div style={{ padding: '8px 12px', fontSize: '14px', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
          {project.userMessage}
        </div>

        {/* Task count */}
        <div style={{ padding: '6px 12px', fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>
          Tasks: {completedCount}/{taskEntries.length}
        </div>

        {/* Tasks grouped by phase */}
        {phaseGroups.map(({ phase, tasks: phaseTasks }) => {
          const phaseCompleted = phaseTasks.filter(([, t]) => t.status === 'completed').length
          return (
            <div key={`phase-${phase}`}>
              {/* Phase header (only shown when multiple phases exist) */}
              {showPhaseHeaders && (
                <div style={{
                  padding: '8px 12px 4px',
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.6)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  marginTop: phase > 0 ? 8 : 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 'bold' }}>Phase {phase}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                    {phaseCompleted}/{phaseTasks.length}
                  </span>
                </div>
              )}

              {/* Phase tasks */}
              {phaseTasks.map(([taskId, task]) => {
                const member = findMember(task.skillId)
                return (
                  <div
                    key={taskId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: 0,
                      background: TASK_STATUS_COLORS[task.status] ?? '#94a3b8',
                      flexShrink: 0,
                      border: '1px solid rgba(0,0,0,0.3)',
                    }} />

                    {/* Agent avatar */}
                    {member && (
                      <PixelSpriteAvatar
                        palette={member.palette ?? 0}
                        hueShift={member.hueShift ?? 0}
                        zoom={1}
                        style={{ width: 16, height: 24, flexShrink: 0 }}
                      />
                    )}

                    {/* Task info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>{taskId}</span>
                        <span>{SKILL_ROLE_NAMES[task.skillId] ?? member?.name ?? task.skillId}</span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.35)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {task.description.slice(0, 80)}
                      </div>
                    </div>

                    {/* Status */}
                    <span style={{
                      fontSize: '13px',
                      color: TASK_STATUS_COLORS[task.status] ?? '#94a3b8',
                      flexShrink: 0,
                    }}>
                      {task.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Right: Document List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ padding: '6px 12px', fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>
          Documents ({project.docs.length})
        </div>
        {project.docs.map((doc) => {
          const member = findMember(doc.skillId)
          const key = `doc-${doc.fileName}`
          return (
            <button
              key={key}
              onClick={() => onDocClick(doc, project.projectDir)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                background: hovered === key ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none',
                borderRadius: 0,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Agent avatar */}
              {member && (
                <PixelSpriteAvatar
                  palette={member.palette ?? 0}
                  hueShift={member.hueShift ?? 0}
                  zoom={1}
                  style={{ width: 16, height: 24, flexShrink: 0, marginTop: 2 }}
                />
              )}

              {/* Doc info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '16px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                    {doc.fileName.split('-')[0]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>{SKILL_ROLE_NAMES[doc.skillId] ?? doc.agentName}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', flexShrink: 0 }}>
                    {formatFileSize(doc.sizeBytes)}
                  </span>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.45)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {doc.summary ? doc.summary.replace(/\n/g, ' ') : '無摘要內容'}
                </div>
              </div>

              {/* Time */}
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 2 }}>
                {doc.time ? formatTime(doc.time) : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Doc Preview View ────────────────────────────────────────

function DocPreviewView({
  doc, content, findMember,
}: {
  doc: DocMeta
  content: string | null
  findMember: (skillId: string) => TeamMemberInfo | undefined
}) {
  const member = findMember(doc.skillId)

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left: Document preview with watermark */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Watermark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -200,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 80,
              transform: 'rotate(-30deg)',
              opacity: 0.04,
              alignContent: 'flex-start',
            }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                style={{
                  color: '#ffffff',
                  fontSize: 18,
                  whiteSpace: 'nowrap',
                  letterSpacing: 4,
                }}
              >
                PIXEL AGENTS
              </span>
            ))}
          </div>
        </div>

        {/* Document content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            overflowY: 'auto',
            height: '100%',
            boxSizing: 'border-box',
            padding: '16px 20px 60px',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          {content === null ? (
            <div style={{ padding: '32px', fontSize: '18px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              Loading...
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          )}
        </div>
      </div>

      {/* Right: Character panel */}
      <div
        style={{
          width: 220,
          borderLeft: '2px solid var(--pixel-border)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        {/* Large avatar */}
        {member ? (
          <PixelSpriteAvatar
            palette={member.palette ?? 0}
            hueShift={member.hueShift ?? 0}
            zoom={5}
            animated
            interactive
            style={{ width: 80, height: 120 }}
          />
        ) : (
          <div style={{ width: 80, height: 120, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        )}

        {/* Agent name */}
        <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
          {SKILL_ROLE_NAMES[doc.skillId] ?? doc.agentName}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          {doc.agentName}
        </div>

        {/* Divider */}
        <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.1)' }} />

        {/* Summary */}
        <div
          style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, textAlign: 'left', width: '100%' }}
          dangerouslySetInnerHTML={{ __html: doc.summary ? escapeHtml(doc.summary) : '無摘要內容' }}
        />

        {/* File info */}
        <div style={{ marginTop: 'auto', width: '100%', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          <div>{doc.fileName}</div>
          <div>{formatFileSize(doc.sizeBytes)}</div>
          {doc.time && <div>{formatTime(doc.time)}</div>}
        </div>
      </div>
    </div>
  )
}
