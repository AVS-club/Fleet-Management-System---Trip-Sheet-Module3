import React from 'react';
import { FeedEvent } from '@/hooks/useHeroFeed';
import { AlertCircle, FileText, Wrench, Truck, Activity, CheckCircle, XCircle } from 'lucide-react';
import KPICard from './KPICard';
import { supabase } from '@/utils/supabaseClient';

interface FeedCardProps {
  event: FeedEvent;
  onRefresh: () => void;
}

export default function FeedCard({ event, onRefresh }: FeedCardProps) {
  if (event.kind === 'kpi') {
    return <KPICard event={event} />;
  }

  const getIcon = () => {
    switch (event.kind) {
      case 'ai_alert': return <AlertCircle className="w-5 h-5" />;
      case 'vehicle_doc': return <FileText className="w-5 h-5" />;
      case 'maintenance': return <Wrench className="w-5 h-5" />;
      case 'trip': return <Truck className="w-5 h-5" />;
      case 'activity':
      case 'vehicle_activity': return <Activity className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getPriorityColor = () => {
    switch (event.priority) {
      case 'danger': return 'border-red-200 bg-red-50';
      case 'warn': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const handleAction = async (action: string) => {
    if (event.kind === 'ai_alert') {
      const { error } = await supabase
        .from('ai_alerts')
        .update({ status: action.toLowerCase() })
        .eq('id', event.entity_json?.alert_id || event.id);
      
      if (!error) {
        onRefresh();
      }
    }
    // Add more action handlers as needed
  };

  const getActions = () => {
    switch (event.kind) {
      case 'ai_alert':
        if (event.status === 'pending') {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => handleAction('accepted')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Accept
              </button>
              <button
                onClick={() => handleAction('rejected')}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-1 text-sm">
              {event.status === 'accepted' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Accepted</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">Rejected</span>
                </>
              )}
            </div>
          );
        }
      case 'vehicle_doc':
        return (
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Send Reminder
          </button>
        );
      case 'maintenance':
        return (
          <button className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
            View Task
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getPriorityColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-1 ${event.priority === 'danger' ? 'text-red-600' : event.priority === 'warn' ? 'text-yellow-600' : 'text-gray-600'}`}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(event.event_time).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="ml-4">
          {getActions()}
        </div>
      </div>
    </div>
  );
}
