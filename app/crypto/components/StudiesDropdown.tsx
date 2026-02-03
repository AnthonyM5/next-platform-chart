'use client';

import { useState, useRef, useEffect } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { SMA_INFO, MACD_INFO, BOLLINGER_INFO } from '../utils/indicators';
import type { StudyType } from '../types';

interface StudyOption {
  id: StudyType;
  name: string;
  description: string;
  infoUrl: string;
}

const STUDY_OPTIONS: StudyOption[] = [
  {
    id: 'rsi',
    name: 'RSI',
    description: 'Relative Strength Index - Momentum oscillator',
    infoUrl: 'https://www.investopedia.com/terms/r/rsi.asp',
  },
  {
    id: 'sma',
    name: 'SMA',
    description: SMA_INFO.description,
    infoUrl: SMA_INFO.source,
  },
  {
    id: 'bollingerBands',
    name: 'Bollinger Bands',
    description: BOLLINGER_INFO.description,
    infoUrl: BOLLINGER_INFO.source,
  },
  {
    id: 'macd',
    name: 'MACD',
    description: MACD_INFO.description,
    infoUrl: MACD_INFO.source,
  },
];

interface StudiesDropdownProps {
  disabled?: boolean;
}

export default function StudiesDropdown({ disabled = false }: StudiesDropdownProps) {
  const { enabledStudies, toggleStudy } = useCryptoStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Count active studies
  const activeCount = Object.values(enabledStudies).filter(Boolean).length;

  return (
    <div className={`studies-dropdown ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`studies-dropdown-button ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={disabled}
        title={disabled ? 'Studies not available for candlestick charts' : 'Technical indicators'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
        <span className="button-text">Studies</span>
        {activeCount > 0 && (
          <span className="studies-count">{activeCount}</span>
        )}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 chevron ${isOpen ? 'open' : ''}`}
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="studies-dropdown-menu">
          <div className="studies-menu-header">
            <span>Technical Indicators</span>
          </div>
          <div className="studies-menu-list">
            {STUDY_OPTIONS.map((study) => (
              <label key={study.id} className="study-option">
                <div className="study-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={enabledStudies[study.id]}
                    onChange={() => toggleStudy(study.id)}
                    className="study-checkbox"
                  />
                  <span className="study-checkmark"></span>
                </div>
                <div className="study-info">
                  <span className="study-name">{study.name}</span>
                  <span className="study-description">{study.description}</span>
                </div>
                <a
                  href={study.infoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="study-info-link"
                  onClick={(e) => e.stopPropagation()}
                  title="Learn more"
                >
                  ⓘ
                </a>
              </label>
            ))}
          </div>
          <div className="studies-menu-footer">
            <button
              onClick={() => {
                STUDY_OPTIONS.forEach((study) => {
                  if (!enabledStudies[study.id]) {
                    toggleStudy(study.id);
                  }
                });
              }}
              className="studies-action-btn"
            >
              Enable All
            </button>
            <button
              onClick={() => {
                STUDY_OPTIONS.forEach((study) => {
                  if (enabledStudies[study.id]) {
                    toggleStudy(study.id);
                  }
                });
              }}
              className="studies-action-btn"
            >
              Disable All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
