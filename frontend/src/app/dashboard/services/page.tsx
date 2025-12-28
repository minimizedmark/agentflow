'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Service, UserService, formatCurrency } from '@shared/types';
import {
  Phone,
  MessageSquare,
  PhoneMissed,
  Loader2,
  Settings,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [userServices, setUserServices] = useState<UserService[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all available services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });

      if (servicesData) {
        setServices(servicesData.map(s => ({
          id: s.id,
          serviceKey: s.service_key,
          name: s.name,
          description: s.description,
          icon: s.icon,
          category: s.category,
          tier: s.tier,
          basePriceUsd: parseFloat(s.base_price_usd || 0),
          usageBased: s.usage_based,
          usagePriceModel: s.usage_price_model,
          version: s.version,
          isAvailable: s.is_available,
          isBeta: s.is_beta,
          requiresServices: s.requires_services,
          conflictsWith: s.conflicts_with,
          configSchema: s.config_schema,
          defaultConfig: s.default_config,
          setupInstructions: s.setup_instructions,
          documentationUrl: s.documentation_url,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        })));
      }

      // Load user's enabled services
      const { data: userServicesData } = await supabase
        .from('user_services')
        .select('*')
        .eq('user_id', user.id);

      if (userServicesData) {
        setUserServices(userServicesData.map(us => ({
          id: us.id,
          userId: us.user_id,
          serviceId: us.service_id,
          enabled: us.enabled,
          enabledAt: us.enabled_at,
          disabledAt: us.disabled_at,
          config: us.config,
          lastUsedAt: us.last_used_at,
          usageCount: us.usage_count,
          createdAt: us.created_at,
          updatedAt: us.updated_at,
        })));
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = async (service: Service) => {
    setToggling(service.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userService = userServices.find(us => us.serviceId === service.id);
      const isCurrentlyEnabled = userService?.enabled || false;

      if (isCurrentlyEnabled) {
        // Disable service
        const { error } = await supabase.rpc('disable_service', {
          p_user_id: user.id,
          p_service_key: service.serviceKey,
        });

        if (error) throw error;
      } else {
        // Enable service
        const { error } = await supabase.rpc('enable_service', {
          p_user_id: user.id,
          p_service_key: service.serviceKey,
          p_config: service.defaultConfig || {},
        });

        if (error) throw error;
      }

      // Reload services
      await loadServices();
    } catch (error: any) {
      console.error('Error toggling service:', error);
      alert(`Failed to ${userServices.find(us => us.serviceId === service.id)?.enabled ? 'disable' : 'enable'} service: ${error.message}`);
    } finally {
      setToggling(null);
    }
  };

  const getServiceIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Phone': return <Phone className="h-6 w-6" />;
      case 'MessageSquare': return <MessageSquare className="h-6 w-6" />;
      case 'PhoneMissed': return <PhoneMissed className="h-6 w-6" />;
      default: return <Sparkles className="h-6 w-6" />;
    }
  };

  const isServiceEnabled = (serviceId: string) => {
    const userService = userServices.find(us => us.serviceId === serviceId);
    return userService?.enabled || false;
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      core: 'Core Services',
      communication: 'Communication',
      intelligence: 'Analytics & Intelligence',
      automation: 'Automation',
      integration: 'Integrations',
      enterprise: 'Enterprise',
    };
    return names[category] || category;
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground">
          Enable only the services you need. Pay only for what you use.
        </p>
      </div>

      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold">{getCategoryName(category)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryServices.map((service) => {
              const enabled = isServiceEnabled(service.id);
              const isToggling = toggling === service.id;

              return (
                <Card
                  key={service.id}
                  className={`p-6 ${enabled ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {getServiceIcon(service.icon)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          {service.isBeta && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              Beta
                            </span>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleToggleService(service)}
                        disabled={isToggling}
                      />
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>

                    {/* Pricing */}
                    <div className="text-sm">
                      {service.basePriceUsd > 0 && (
                        <div className="text-muted-foreground">
                          Base: {formatCurrency(service.basePriceUsd)}/month
                        </div>
                      )}
                      {service.usageBased && service.usagePriceModel && (
                        <div className="text-muted-foreground">
                          Usage: {formatCurrency(service.usagePriceModel.price)} per {service.usagePriceModel.type.replace('per_', '')}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    {enabled && (
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                        <Link href={`/dashboard/services/${service.serviceKey}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Disabled state */}
                    {!enabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleToggleService(service)}
                        disabled={isToggling}
                      >
                        {isToggling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          'Enable Service'
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {services.length === 0 && (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No services available</p>
        </Card>
      )}
    </div>
  );
}
