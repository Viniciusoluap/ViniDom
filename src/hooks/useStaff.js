import { useState, useCallback } from 'react';
import { loadStaff, addStaffMember, updateStaffMember, deleteStaffMember } from '../utils/staffService';

export function useStaff() {
  const [staff, setStaff] = useState(() => loadStaff());

  const addMember = useCallback((member) => {
    setStaff(prev => addStaffMember(prev, member));
  }, []);

  const updateMember = useCallback((id, updates) => {
    setStaff(prev => updateStaffMember(prev, id, updates));
  }, []);

  const deleteMember = useCallback((id) => {
    setStaff(prev => {
      if (prev.length <= 1) return prev;
      return deleteStaffMember(prev, id);
    });
  }, []);

  return { staff, addMember, updateMember, deleteMember };
}
