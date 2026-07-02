import React from 'react';
import { Link } from 'react-router-dom';
import type { ToolInfo } from '../data/tools';

interface ToolCardProps {
  tool: ToolInfo;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const Icon = tool.icon;
  return (
    <Link to={`/tool/${tool.slug}`} className="tool-card">
      <div className="tool-card-icon" style={{ background: tool.colorLight, color: tool.color }}>
        <Icon size={22} />
      </div>
      <div className="tool-card-info">
        <div className="tool-card-name">{tool.name}</div>
        <div className="tool-card-desc">{tool.description}</div>
      </div>
    </Link>
  );
};
