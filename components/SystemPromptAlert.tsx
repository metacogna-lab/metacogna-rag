
import React from 'react';
import { AppConfig } from '../types';
import { AlertTriangle, Settings } from 'lucide-react';
import { PaperButton } from './PaperComponents';

interface SystemPromptAlertProps {
  config: AppConfig;
  onNavigateToSettings: () => void;
}

export const SystemPromptAlert: React.FC<SystemPromptAlertProps> = ({ config, onNavigateToSettings }) => {
  // Check if there are no system prompts or if the list is empty
  const hasPrompts = config.systemPrompts && config.systemPrompts.length > 0;

  if (hasPrompts) return null;

  return (
    <div className="bg-red-50 border-b-2 border-red-200 p-4 animate-slide-in">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 text-red-700">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Missing System Prompts</h4>
            <p className="text-xs opacity-90">Your application requires at least one System Prompt to guide the LLM behavior.</p>
          </div>
        </div>
        <PaperButton 
          variant="danger" 
          size="sm" 
          onClick={onNavigateToSettings}
          icon={<Settings size={14} />}
        >
          Configure Prompts
        </PaperButton>
      </div>
    </div>
  );
};
