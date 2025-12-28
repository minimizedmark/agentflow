'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Phone, Settings, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { INDUSTRY_TEMPLATES } from '@shared/types'
import type { Agent as SharedAgent } from '@shared/types'

interface Agent {
  id: string
  name: string
  industry_template: string
  phone_number?: string
  system_prompt: string
  voice_model: string
  is_active: boolean
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    industryTemplate: 'custom',
    systemPrompt: '',
    voiceModel: 'Ara',
  })

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const template = INDUSTRY_TEMPLATES.find(t => t.id === formData.industryTemplate)
      const systemPrompt = formData.systemPrompt || template?.systemPrompt || ''

      const { data, error } = await supabase
        .from('agents')
        .insert({
          user_id: user.id,
          name: formData.name,
          industry_template: formData.industryTemplate,
          system_prompt: systemPrompt,
          voice_model: formData.voiceModel,
          tools: template?.suggestedTools || [],
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setAgents(prev => [data, ...prev])
      setShowCreateForm(false)
      setFormData({
        name: '',
        industryTemplate: 'custom',
        systemPrompt: '',
        voiceModel: 'Ara',
      })
    } catch (error) {
      console.error('Error creating agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId)

      if (error) throw error

      setAgents(prev => prev.filter(a => a.id !== agentId))
    } catch (error) {
      console.error('Error deleting agent:', error)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    const template = INDUSTRY_TEMPLATES.find(t => t.id === templateId)
    setFormData(prev => ({
      ...prev,
      industryTemplate: templateId,
      systemPrompt: template?.systemPrompt || '',
    }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Agents</h1>
          <p className="text-gray-600 mt-2">
            Create and manage your AI voice agents
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Agent</CardTitle>
            <CardDescription>
              Configure your AI voice agent with custom instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Dental Office Assistant"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Industry Template</Label>
                <Select
                  value={formData.industryTemplate}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.icon} {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voiceModel">Voice Model</Label>
                <Select
                  value={formData.voiceModel}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, voiceModel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ara">Ara (Female)</SelectItem>
                    <SelectItem value="Eve">Eve (Female)</SelectItem>
                    <SelectItem value="Leo">Leo (Male)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="Instructions for your AI agent..."
                  rows={6}
                />
                <p className="text-sm text-gray-500">
                  Customize how your agent behaves and responds to callers
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Agent'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {agents.length === 0 && !showCreateForm ? (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Phone className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents yet</h3>
              <p className="text-gray-600 mb-4">Create your first AI voice agent to get started</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          agents.map(agent => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {INDUSTRY_TEMPLATES.find(t => t.id === agent.industry_template)?.name || 'Custom'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Phone Number</div>
                  <div className="text-sm text-gray-600">
                    {agent.phone_number || 'Not assigned'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Voice Model</div>
                  <div className="text-sm text-gray-600">{agent.voice_model}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
