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
  Mail,
  Loader2,
  Settings,
  Sparkles,
  CheckCircle2,
  Circle
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
      alert(`Error: ${error.message}`);
    } finally {
      setToggling(null);
    }
  };

  const getServiceIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Phone': return <Phone className="h-8 w-8" />;
      case 'MessageSquare': return <MessageSquare className="h-8 w-8" />;
      case 'PhoneMissed': return <PhoneMissed className="h-8 w-8" />;
      case 'Mail': return <Mail className="h-8 w-8" />;
      default: return <Sparkles className="h-8 w-8" />;
    }
  };

  const isServiceEnabled = (serviceId: string) => {
    const userService = userServices.find(us => us.serviceId === serviceId);
    return userService?.enabled || false;
  };

  const formatPricing = (service: Service) => {
    if (service.usageBased && service.usagePriceModel) {
      const price = formatCurrency(service.usagePriceModel.price);
      const unit = service.usagePriceModel.type.replace('per_', '');
      return `${price}/${unit}`;
    }
    if (service.basePriceUsd > 0) {
      return `${formatCurrency(service.basePriceUsd)}/month`;
    }
    return 'Free';
  };

  // Show only the 5 core services by default
  const coreServiceKeys = [
    'voice_receptionist',
    'sms_autoresponder_standalone',
    'sms_autoresponder_bundled',
    'missed_call_responder',
    'email_assistant_standalone',
    'email_assistant_bundled'
  ];

  const coreServices = services.filter(s => coreServiceKeys.includes(s.serviceKey));
  const addOnServices = services.filter(s => !coreServiceKeys.includes(s.serviceKey));

  const [showAddOns, setShowAddOns] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Pick What You Need</h1>
        <p className="text-xl text-muted-foreground">
          Enable services with one click. Disable anytime. Pay only for what you use.
        </p>
      </div>

      {/* Core Services */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Core Services</h2>
          <p className="text-muted-foreground">Pick the services your business needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coreServices.map((service) => {
            const enabled = isServiceEnabled(service.id);
            const isToggling = toggling === service.id;

            return (
              <Card
                key={service.id}
                className={`p-8 transition-all ${
                  enabled
                    ? 'border-2 border-green-500 bg-green-50/50'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="space-y-6">
                  {/* Icon and Name */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        enabled ? 'bg-green-500 text-white' : 'bg-gray-100'
                      }`}>
                        {getServiceIcon(service.icon)}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          {service.name}
                          {enabled && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        </h3>
                        <div className="text-2xl font-bold text-primary mt-1">
                          {formatPricing(service)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-base text-gray-700 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Action */}
                  <div className="pt-4">
                    {enabled ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-700 font-medium">
                          <CheckCircle2 className="h-5 w-5" />
                          Active and working
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/services/${service.serviceKey}`} className="flex-1">
                            <Button variant="outline" size="lg" className="w-full">
                              <Settings className="mr-2 h-5 w-5" />
                              Configure
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => handleToggleService(service)}
                            disabled={isToggling}
                            className="flex-1"
                          >
                            {isToggling ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              'Disable'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full text-lg h-14"
                        onClick={() => handleToggleService(service)}
                        disabled={isToggling}
                      >
                        {isToggling ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          <>
                            Enable Now
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add-ons (hidden by default) */}
      {addOnServices.length > 0 && (
        <div className="space-y-6 pt-8 border-t">
          {!showAddOns ? (
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowAddOns(true)}
                className="mx-auto"
              >
                Show Optional Add-ons ({addOnServices.length})
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Advanced features for power users
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Optional Add-ons</h2>
                  <p className="text-muted-foreground">
                    Enhance your services with these optional features
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowAddOns(false)}
                >
                  Hide
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {addOnServices.map((service) => {
                  const enabled = isServiceEnabled(service.id);
                  const isToggling = toggling === service.id;

                  return (
                    <Card
                      key={service.id}
                      className={`p-6 ${enabled ? 'border-green-500 bg-green-50/30' : ''}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${enabled ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                            {getServiceIcon(service.icon)}
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => handleToggleService(service)}
                            disabled={isToggling}
                          />
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <div className="text-lg font-bold text-primary">
                            {formatPricing(service)}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600">
                          {service.description}
                        </p>

                        {enabled && (
                          <Link href={`/dashboard/services/${service.serviceKey}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              Configure
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Help text */}
      <div className="text-center pt-8 text-muted-foreground space-y-2">
        <p className="text-lg">💡 All services work immediately when enabled</p>
        <p className="text-sm">No setup required. Configure them later if you want to customize.</p>
      </div>
    </div>
  );
}
