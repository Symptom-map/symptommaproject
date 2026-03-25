// src/hooks/useLocalStorage.js - CON SOPORTE PARA DIAG PROFILES
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'symptommap-state';

const DEFAULT_STATE = {
  selectedDiags: [],
  nodes: [],
  idCounter: 1,
  lang: 'es',
  username: '',
  diagProfiles: {}
};

export function useLocalStorage() {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure diagProfiles exists
        return {
          ...DEFAULT_STATE,
          ...parsed,
          diagProfiles: parsed.diagProfiles || {}
        };
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
    return DEFAULT_STATE;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [state]);

  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addNode = (node) => {
    setState(prev => ({
      ...prev,
      nodes: [...prev.nodes, { ...node, id: node.id || `node-${prev.idCounter}` }],
      idCounter: prev.idCounter + 1
    }));
  };

  const removeNode = (nodeId) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId)
    }));
  };

  const toggleDiagnosis = (diagId) => {
    setState(prev => ({
      ...prev,
      selectedDiags: prev.selectedDiags.includes(diagId)
        ? prev.selectedDiags.filter(id => id !== diagId)
        : [...prev.selectedDiags, diagId]
    }));
  };

  const addCustomDiagnosis = (customDiag) => {
    setState(prev => ({
      ...prev,
      selectedDiags: [...prev.selectedDiags, customDiag.id],
      nodes: [
        ...prev.nodes,
        {
          id: `hub-${customDiag.id}`,
          name: customDiag.label,
          conds: [customDiag.id],
          hub: true,
          x: 0,
          y: 0,
          _placed: false
        }
      ]
    }));
  };

  const saveDiagProfile = (diagId, profileData) => {
    setState(prev => ({
      ...prev,
      diagProfiles: {
        ...prev.diagProfiles,
        [diagId]: profileData
      }
    }));
  };

  return {
    state,
    updateState,
    addNode,
    removeNode,
    toggleDiagnosis,
    addCustomDiagnosis,
    saveDiagProfile
  };
}
