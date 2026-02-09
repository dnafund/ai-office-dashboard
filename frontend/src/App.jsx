import { useState, useCallback } from 'react'
import { useWebSocket } from './hooks/useWebSocket.js'
import { Layout } from './components/layout/Layout.jsx'
import { Header } from './components/layout/Header.jsx'
import { OfficeCanvas } from './components/office/OfficeCanvas.jsx'
import { OrgChart } from './components/orgchart/OrgChart.jsx'
import { StatusBar } from './components/ui/StatusBar.jsx'
import { AgentTooltip } from './components/ui/AgentTooltip.jsx'
import { ActivityFeed } from './components/ui/ActivityFeed.jsx'
import { setGlobalRoomOverride } from './components/office/Agent.js'

export function App() {
  const { data, connected } = useWebSocket()
  const [view, setView] = useState('office')
  const [hoveredAgent, setHoveredAgent] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [currentRoom, setCurrentRoom] = useState(null)

  const handleAgentHover = useCallback((agent) => {
    setHoveredAgent(agent)
  }, [])

  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent((prev) =>
      prev?.id === agent?.id ? null : agent
    )
  }, [])

  const handleRoomCommand = useCallback((room) => {
    setCurrentRoom(room)
    setGlobalRoomOverride(room)
  }, [])

  const teams = data.teams ?? []
  const activity = data.activity ?? []

  return (
    <Layout>
      <Header
        view={view}
        onViewChange={setView}
        connected={connected}
        currentRoom={currentRoom}
        onRoomCommand={handleRoomCommand}
      />

      <div className="flex-1 relative">
        {view === 'office' ? (
          <div className="space-y-4">
            <OfficeCanvas
              teams={teams}
              roomOverride={currentRoom}
              onAgentHover={handleAgentHover}
              onAgentClick={handleAgentClick}
            />

            {/* Floating tooltip */}
            {hoveredAgent && (
              <div className="absolute top-4 right-4 z-10">
                <AgentTooltip agent={hoveredAgent} />
              </div>
            )}

            {/* Selected agent detail panel */}
            {selectedAgent && (
              <div className="glass-panel rounded-lg p-4 page-enter">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm tracking-wider">
                    Agent Detail
                  </h3>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="text-text-dim hover:text-white text-xs"
                  >
                    Close
                  </button>
                </div>
                <AgentTooltip agent={selectedAgent} />
              </div>
            )}
          </div>
        ) : (
          <OrgChart teams={teams} />
        )}
      </div>

      <ActivityFeed activity={activity} />
      <StatusBar teams={teams} connected={connected} />
    </Layout>
  )
}
