import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectService = {
  // Get all projects
  getAllProjects: async () => {
    const response = await api.get('/projects/');
    return response.data;
  },

  // Get project details
  getProject: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create project (Upload files)
  createProject: async (formData) => {
    const response = await api.post('/projects/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Download file (url helper)
  getFileUrl: (projectId, fileType) => {
    return `http://localhost:8000/api/v1/projects/${projectId}/files/${fileType}`;
  },

  // Check file status (HEAD)
  checkFile: async (projectId, fileType) => {
    try {
      await api.head(`/projects/${projectId}/files/${fileType}`);
      return true;
    } catch (error) {
      return false;
    }
  }
};

export const machineService = {
  // Get machines for a work center
  getMachinesForWC: async (wcCode) => {
    const response = await api.get(`/machines/work-center/${wcCode}`);
    return response.data;
  },

  // Get all operations for a project with machine options
  getProjectOperations: async (projectId) => {
    const response = await api.get(`/machines/project/${projectId}/operations`);
    return response.data;
  },

  // Calculate cost for operation (DOES NOT SAVE - just returns calculation)
  calculateCost: async (operationId, selectedMachineModel) => {
    const response = await api.post(`/machines/calculate-cost`, null, {
      params: {
        operation_id: operationId,
        selected_machine_model: selectedMachineModel
      }
    });
    return response.data;
  },

  // Check if machine data exists
  checkMachineData: async () => {
    const response = await api.get('/machines/check-data');
    return response.data;
  }
};

// Admin Service for Excel Upload
export const adminService = {
  // Upload machine data from Excel
  uploadMachineData: async (formData, replaceExisting = false) => {
    const response = await api.post(
      `/admin/upload-machine-data?replace_existing=${replaceExisting}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get machine data statistics
  getMachineStats: async () => {
    const response = await api.get('/admin/machine-data-stats');
    return response.data;
  },
  
  // List all machine master records
  getMachineList: async () => {
    const response = await api.get('/admin/machine-data');
    return response.data;
  },
  
  // Create machine manually - NEW METHOD
  createMachine: async (machineData) => {
    const response = await api.post('/admin/machine', machineData);
    return response.data;
  },
  
  // Update hourly rate for a machine record
  updateMachineRate: async (id, hourlyRate) => {
    const response = await api.put(`/admin/machine/${id}/hourly-rate`, {
      hourly_rate: hourlyRate
    });
    return response.data;
  },

  // Delete machine record - CRITICAL FIX FOR YOUR ISSUE
  deleteMachine: async (machineId) => {
    const response = await api.delete(`/admin/machine/${machineId}`);
    return response.data;
  },

  // Clear all machine data
  clearMachineData: async () => {
    const response = await api.delete('/admin/clear-machine-data?confirm=true');
    return response.data;
  }
};

// Cost Version Service - UPDATED FOR NEW SCHEMA
export const costVersionService = {
  // Save new cost version with all operation costs
  saveVersion: async (data) => {
    const response = await api.post('/cost-versions/save', data);
    return response.data;
  },

  // Get all versions for a project
  getProjectVersions: async (projectId) => {
    const response = await api.get(`/cost-versions/project/${projectId}`);
    return response.data;
  },

  // Get version detail (project_id and version_no)
  getVersionDetail: async (projectId, versionNo) => {
    const response = await api.get(`/cost-versions/version/${projectId}/${versionNo}`);
    return response.data;
  },

  // Compare versions
  compareVersions: async (projectId) => {
    const response = await api.get(`/cost-versions/compare/${projectId}`);
    return response.data;
  },

  // Delete version (project_id and version_no)
  deleteVersion: async (projectId, versionNo) => {
    const response = await api.delete(`/cost-versions/version/${projectId}/${versionNo}`);
    return response.data;
  },

  // Get operation cost history across versions
  getOperationHistory: async (projectId, operationNo) => {
    const response = await api.get(`/cost-versions/operation-changes/${projectId}/${operationNo}`);
    return response.data;
  }
};

// Miscellaneous Costs Service
export const miscellaneousCostsService = {
  // Get predefined cost types
  getCostTypes: async () => {
    const response = await api.get('/miscellaneous-costs/cost-types');
    return response.data;
  },

  // Get miscellaneous costs for a specific version
  getVersionCosts: async (projectId, versionNo) => {
    const response = await api.get(`/miscellaneous-costs/version/${projectId}/${versionNo}`);
    return response.data;
  },

  // Save miscellaneous costs for a version
  saveCosts: async (data) => {
    const response = await api.post('/miscellaneous-costs/save', data);
    return response.data;
  }
};

export default api;