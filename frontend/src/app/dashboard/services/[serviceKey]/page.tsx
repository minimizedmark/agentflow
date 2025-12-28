'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Service, UserService, SMSTemplate } from '@shared/types';
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ServiceConfigPage() {
  const params = useParams();
  const router = useRouter();
  const serviceKey = params?.serviceKey as string;

  const [service, setService] = useState<Service | null>(null);
  const [userService, setUserService] = useState<UserService | null>(null);
  const [config, setConfig] = useState<any>({});
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '' });
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  useEffect(() => {
    loadServiceConfig();
  }, [serviceKey]);

  const loadServiceConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load service details
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('service_key', serviceKey)
        .single();

      if (serviceData) {
        setService({
          id: serviceData.id,
          serviceKey: serviceData.service_key,
          name: serviceData.name,
          description: serviceData.description,
          icon: serviceData.icon,
          category: serviceData.category,
          tier: serviceData.tier,
          basePriceUsd: parseFloat(serviceData.base_price_usd || 0),
          usageBased: serviceData.usage_based,
          usagePriceModel: serviceData.usage_price_model,
          version: serviceData.version,
          isAvailable: serviceData.is_available,
          isBeta: serviceData.is_beta,
          requiresServices: serviceData.requires_services,
          conflictsWith: serviceData.conflicts_with,
          configSchema: serviceData.config_schema,
          defaultConfig: serviceData.default_config,
          setupInstructions: serviceData.setup_instructions,
          documentationUrl: serviceData.documentation_url,
          createdAt: serviceData.created_at,
          updatedAt: serviceData.updated_at,
        });
      }

      // Load user's service configuration
      const { data: userServiceData } = await supabase
        .from('user_services')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_id', serviceData?.id)
        .single();

      if (userServiceData) {
        setUserService({
          id: userServiceData.id,
          userId: userServiceData.user_id,
          serviceId: userServiceData.service_id,
          enabled: userServiceData.enabled,
          enabledAt: userServiceData.enabled_at,
          disabledAt: userServiceData.disabled_at,
          config: userServiceData.config,
          lastUsedAt: userServiceData.last_used_at,
          usageCount: userServiceData.usage_count,
          createdAt: userServiceData.created_at,
          updatedAt: userServiceData.updated_at,
        });
        setConfig(userServiceData.config || serviceData?.default_config || {});
      } else {
        setConfig(serviceData?.default_config || {});
      }

      // Load templates if this is an SMS service
      if (serviceKey === 'sms_autoresponder' || serviceKey === 'missed_call_responder') {
        const { data: templatesData } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('service_key', serviceKey);

        if (templatesData) {
          setTemplates(templatesData.map(t => ({
            id: t.id,
            userId: t.user_id,
            agentId: t.agent_id,
            name: t.name,
            serviceKey: t.service_key,
            messageTemplate: t.message_template,
            isActive: t.is_active,
            isDefault: t.is_default,
            availableVariables: t.available_variables,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading service config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !service) return;

      // Update service configuration
      const { error } = await supabase
        .from('user_services')
        .update({ config, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('service_id', service.id);

      if (error) throw error;

      alert('Configuration saved successfully!');
      await loadServiceConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      alert(`Failed to save configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !newTemplate.name || !newTemplate.message) return;

      const { error } = await supabase
        .from('sms_templates')
        .insert({
          user_id: user.id,
          name: newTemplate.name,
          service_key: serviceKey,
          message_template: newTemplate.message,
          is_active: true,
        });

      if (error) throw error;

      setNewTemplate({ name: '', message: '' });
      setShowNewTemplate(false);
      await loadServiceConfig();
    } catch (error: any) {
      console.error('Error creating template:', error);
      alert(`Failed to create template: ${error.message}`);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      await loadServiceConfig();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      alert(`Failed to delete template: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Service not found</p>
          <Link href="/dashboard/services">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/services">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{service.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{service.description}</p>
        </div>
        <Button onClick={handleSaveConfig} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* SMS Autoresponder Configuration */}
      {serviceKey === 'sms_autoresponder' && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Configuration</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Reply</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically respond to incoming text messages
                </p>
              </div>
              <Switch
                checked={config.auto_reply || false}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, auto_reply: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>AI-Powered Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Use AI to generate intelligent responses
                </p>
              </div>
              <Switch
                checked={config.ai_powered || false}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, ai_powered: checked })
                }
              />
            </div>

            {!config.ai_powered && (
              <div className="space-y-2">
                <Label>Default Template</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={config.template_id || ''}
                  onChange={(e) =>
                    setConfig({ ...config, template_id: e.target.value })
                  }
                >
                  <option value="">Default message</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Missed Call Responder Configuration */}
      {serviceKey === 'missed_call_responder' && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Configuration</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enabled Hours</Label>
              <Input
                value={config.enabled_hours || '24/7'}
                onChange={(e) =>
                  setConfig({ ...config, enabled_hours: e.target.value })
                }
                placeholder="24/7"
              />
              <p className="text-sm text-muted-foreground">
                When to send missed call SMS (e.g., "24/7", "9am-5pm", etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Delay (seconds)</Label>
              <Input
                type="number"
                value={config.delay_seconds || 30}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    delay_seconds: parseInt(e.target.value, 10),
                  })
                }
                min="0"
                max="300"
              />
              <p className="text-sm text-muted-foreground">
                Wait time before sending SMS after missed call
              </p>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={config.template_id || ''}
                onChange={(e) =>
                  setConfig({ ...config, template_id: e.target.value })
                }
              >
                <option value="">Default message</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* SMS Templates Section */}
      {(serviceKey === 'sms_autoresponder' || serviceKey === 'missed_call_responder') && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">SMS Templates</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewTemplate(!showNewTemplate)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>

          {showNewTemplate && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="E.g., Business Hours Reply"
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={newTemplate.message}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, message: e.target.value })
                  }
                  placeholder="Thank you for contacting us. We will get back to you shortly."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Available variables: {'{{from_number}}'}, {'{{to_number}}'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateTemplate} size="sm">
                  Create Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewTemplate(false);
                    setNewTemplate({ name: '', message: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No templates created yet
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.messageTemplate}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Service Info */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Service Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium">
              {userService?.enabled ? 'Active' : 'Disabled'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Usage Count</p>
            <p className="font-medium">{userService?.usageCount || 0}</p>
          </div>
          {userService?.lastUsedAt && (
            <div>
              <p className="text-muted-foreground">Last Used</p>
              <p className="font-medium">
                {new Date(userService.lastUsedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
