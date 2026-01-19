import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import MainLayout from '../components/MainLayout';
import ProjectDetailsView from '../components/ProjectDetailsView';
import { projectService, machineService, costVersionService, miscellaneousCostsService } from '../services/api';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Project data states
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [has3D, setHas3D] = useState(false);
  const [has2D, setHas2D] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Machine selection states
  const [operationMachines, setOperationMachines] = useState({});
  const [calculatedCosts, setCalculatedCosts] = useState({});
  const [editingOperations, setEditingOperations] = useState({});
  const [machineOptions, setMachineOptions] = useState({});
  const [loadingMachines, setLoadingMachines] = useState({});
  const [searchText, setSearchText] = useState('');
  
  // Miscellaneous costs states
  const [miscCosts, setMiscCosts] = useState([]);
  const [totalMiscCost, setTotalMiscCost] = useState(0);
  
  // Version and calculation states
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [calculatingCosts, setCalculatingCosts] = useState(false);
  const [saveVersionModal, setSaveVersionModal] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [viewMode, setViewMode] = useState('3d');

  // Fetch project data on mount and when version changes
  useEffect(() => {
    if (id) {
      const versionId = searchParams.get('version');
      const tab = searchParams.get('tab');
      
      if (tab) {
        setActiveTab(tab);
      }
      
      if (versionId) {
        fetchProjectAndSpecificVersion(versionId);
      } else {
        fetchProjectAndVersion();
      }
    }
  }, [id, searchParams]);

  // Combined fetch to ensure proper sequencing
  const fetchProjectAndVersion = async () => {
    try {
      setLoading(true);
      
      const data = await projectService.getProject(id);
      
      let projectData;
      if (data.success && data.project) {
        projectData = { ...data.project, operations: data.operations || [] };
      } else if (data.project) {
        projectData = { ...data.project, operations: data.operations || [] };
      } else {
        projectData = data;
      }
      
      setProject(projectData);
      
      const [d3Available, d2Available] = await Promise.all([
        projectService.checkFile(id, '3d-converted'),
        projectService.checkFile(id, '2d')
      ]);
      
      setHas3D(d3Available);
      setHas2D(d2Available);
      
      await fetchLatestVersion(projectData);
      
    } catch (error) {
      console.error('Error fetching project:', error);
      message.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific version
  const fetchProjectAndSpecificVersion = async (versionId) => {
    try {
      setLoading(true);
      
      const data = await projectService.getProject(id);
      
      let projectData;
      if (data.success && data.project) {
        projectData = { ...data.project, operations: data.operations || [] };
      } else if (data.project) {
        projectData = { ...data.project, operations: data.operations || [] };
      } else {
        projectData = data;
      }
      
      setProject(projectData);
      
      const [d3Available, d2Available] = await Promise.all([
        projectService.checkFile(id, '3d-converted'),
        projectService.checkFile(id, '2d')
      ]);
      
      setHas3D(d3Available);
      setHas2D(d2Available);
      
      const detailData = await costVersionService.getVersionDetail(id, versionId);
      if (detailData.success && detailData.version) {
        setCurrentVersionId(parseInt(versionId));
        
        const machines = {};
        const costs = {};
        
        detailData.version.operations.forEach(op => {
          const operation = projectData.operations?.find(o => o.oprn_no === op.operation_no);
          if (operation) {
            machines[operation.id] = op.selected_machine;
            costs[operation.id] = op.calculated_cost;
          }
        });
        
        setOperationMachines(machines);
        setCalculatedCosts(costs);

        console.log('Loading misc costs from version:', detailData.version.miscellaneous_costs);
        handleMiscCostsUpdate({
          miscellaneous_costs: detailData.version.miscellaneous_costs || [],
          total_cost: detailData.version.miscellaneous_cost || 0
        });
      }
      
    } catch (error) {
      console.error('Error fetching project:', error);
      message.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestVersion = async (currentProject = null) => {
    try {
      const projectToUse = currentProject || project;
      if (!projectToUse) return;
      
      const data = await costVersionService.getProjectVersions(id);
      if (data.success && data.versions && data.versions.length > 0) {
        const sortedVersions = [...data.versions].sort((a, b) => b.version_no - a.version_no);
        const latest = sortedVersions[0];
        setCurrentVersionId(latest.version_no);
        
        const detailData = await costVersionService.getVersionDetail(id, latest.version_no);
        if (detailData.success && detailData.version) {
          const machines = {};
          const costs = {};
          
          detailData.version.operations.forEach(op => {
            const operation = projectToUse.operations?.find(o => o.oprn_no === op.operation_no);
            if (operation) {
              machines[operation.id] = op.selected_machine;
              costs[operation.id] = op.calculated_cost;
            }
          });
          
          setOperationMachines(machines);
          setCalculatedCosts(costs);

          if (detailData.version.miscellaneous_costs) {
            console.log('Loading latest version misc costs:', detailData.version.miscellaneous_costs);
            handleMiscCostsUpdate({
              miscellaneous_costs: detailData.version.miscellaneous_costs,
              total_cost: detailData.version.miscellaneous_cost || 0
            });
            const miscTotal = detailData.version.miscellaneous_costs.reduce(
              (sum, item) => sum + (item.cost || 0),
              0
            );
            setTotalMiscCost(miscTotal);
          }
        }
        return latest.version_no;
      }
    } catch (error) {
      console.error('Error fetching latest version:', error);
    }
    return null;
  };

  const fetchMachinesForWC = async (wcCode, operationId) => {
    if (machineOptions[wcCode]) return;
    
    setLoadingMachines(prev => ({ ...prev, [operationId]: true }));
    
    try {
      const data = await machineService.getMachinesForWC(wcCode);
      
      if (data.success && data.machines && data.machines.length > 0) {
        setMachineOptions(prev => ({ ...prev, [wcCode]: data.machines }));
      } else {
        message.warning(`No machines found for work center ${wcCode}. Please upload machine data in Admin panel.`);
        setMachineOptions(prev => ({ ...prev, [wcCode]: [] }));
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      message.error('Failed to load machines');
      setMachineOptions(prev => ({ ...prev, [wcCode]: [] }));
    } finally {
      setLoadingMachines(prev => ({ ...prev, [operationId]: false }));
    }
  };

  const handleMachineChange = (operationId, selectedMachine) => {
    setOperationMachines(prev => ({
      ...prev,
      [operationId]: selectedMachine
    }));
    
    if (calculatedCosts[operationId]) {
      setCalculatedCosts(prev => {
        const newCosts = { ...prev };
        delete newCosts[operationId];
        return newCosts;
      });
    }
  };

  const handleEditOperation = (operationId) => {
    setEditingOperations(prev => ({
      ...prev,
      [operationId]: true
    }));
  };

  const handleCancelEdit = (operationId) => {
    setEditingOperations(prev => ({
      ...prev,
      [operationId]: false
    }));
    
    fetchLatestVersion();
  };

  const handleCalculateAllCosts = async () => {
    const operationsWithMachines = Object.entries(operationMachines).filter(([_, machine]) => machine);
    
    if (operationsWithMachines.length === 0) {
      message.warning('Please select machines for at least one operation');
      return 0;
    }
    
    setCalculatingCosts(true);
    const newCosts = { ...calculatedCosts };
    let successCount = 0;
    let failCount = 0;
    
    try {
      // Only calculate costs for operations that don't have calculated costs yet
      // OR operations that are being edited
      for (const [operationId, machine] of operationsWithMachines) {
        const needsCalculation = !calculatedCosts[operationId] || editingOperations[operationId];
        
        if (needsCalculation) {
          try {
            const result = await machineService.calculateCost(parseInt(operationId), machine);
            if (result.success) {
              newCosts[operationId] = result.calculated_cost;
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            console.error(`Error calculating cost for operation ${operationId}:`, error);
            failCount++;
          }
        } else {
          // Keep existing calculated cost
          successCount++;
        }
      }
      
      setCalculatedCosts(newCosts);
      
      if (successCount > 0 && failCount === 0) {
        message.success(`Ready to save ${successCount} operation(s)`);
      } else if (failCount > 0) {
        message.warning(`Failed to calculate costs for ${failCount} operation(s)`);
      }
      
      return successCount;
    } catch (error) {
      console.error('Error calculating costs:', error);
      message.error('Failed to calculate costs');
      return 0;
    } finally {
      setCalculatingCosts(false);
    }
  };

  const handleCalculateAndSave = async () => {
    // Check if we have any machines selected
    const operationsWithMachines = Object.entries(operationMachines).filter(([_, machine]) => machine);
    
    if (operationsWithMachines.length === 0) {
      message.warning('Please select machines for at least one operation');
      return;
    }
    
    // Calculate costs only for operations that need calculation
    const successCount = await handleCalculateAllCosts();
    
    if (successCount > 0 || Object.keys(calculatedCosts).length > 0) {
      setSaveVersionModal(true);
    }
  };

  const handleSaveVersion = async (mode = 'new') => {
    console.log('=== SAVE VERSION START ===');
    console.log('Mode:', mode);
    console.log('Current Version ID:', currentVersionId);
    console.log('Operation Machines:', operationMachines);
    console.log('Calculated Costs:', calculatedCosts);
    
    const costsArray = Object.entries(operationMachines)
      .filter(([opId, _]) => calculatedCosts[opId] !== null && calculatedCosts[opId] !== undefined)
      .map(([operationId, machine]) => {
        const operation = project.operations.find(op => op.id === parseInt(operationId));
        return {
          operation_id: parseInt(operationId),
          operation_no: operation.oprn_no,
          selected_machine_model: machine,
          calculated_cost: calculatedCosts[operationId]
        };
      });

    console.log('Costs Array to save:', costsArray);

    if (costsArray.length === 0) {
      message.warning('Please calculate costs before saving');
      return;
    }

    // Only check for duplicates when creating NEW version
    if (mode === 'new') {
      try {
        const versionsData = await costVersionService.getProjectVersions(id);
        if (versionsData.success && versionsData.versions && versionsData.versions.length > 0) {
          const sortedVersions = [...versionsData.versions].sort((a, b) => b.version_no - a.version_no);
          const latestVersion = sortedVersions[0];
          
          const latestDetail = await costVersionService.getVersionDetail(id, latestVersion.version_no);
          
          if (latestDetail.success && latestDetail.version) {
            const latestOps = latestDetail.version.operations;
            
            if (latestOps.length === costsArray.length) {
              const isDuplicate = costsArray.every(curr => {
                const prev = latestOps.find(p => p.operation_no === curr.operation_no);
                return prev && 
                       prev.selected_machine === curr.selected_machine_model && 
                       Math.abs(prev.calculated_cost - curr.calculated_cost) < 0.01;
              });

              if (isDuplicate) {
                message.warning(`No changes detected from Version ${latestVersion.version_no}. Save cancelled.`);
                setSaveVersionModal(false);
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for duplicates:', error);
      }
    }

    setSavingVersion(true);
    try {
      const payload = {
        project_id: parseInt(id),
        operation_costs: costsArray,
        notes: versionNotes || undefined
      };
      
      // CRITICAL FIX: Properly set mode and target_version_no when updating current version
      if (mode === 'current' && currentVersionId) {
        payload.mode = 'update';
        payload.target_version_no = parseInt(currentVersionId);
        console.log('Updating current version:', currentVersionId);
      } else {
        payload.mode = 'new';
        console.log('Creating new version');
      }
      
      console.log('Save payload:', JSON.stringify(payload, null, 2));
      
      const result = await costVersionService.saveVersion(payload);
      
      console.log('Save result:', result);
      
      if (result.success) {
        const savedVersionId = mode === 'current' ? currentVersionId : result.version_no;

        const miscSaveResult = await miscellaneousCostsService.saveCosts({
          project_id: parseInt(id),
          version_no: parseInt(savedVersionId),
          misc_costs: (miscCosts || []).map(c => ({
            cost_type: c.cost_type,
            cost_value: parseFloat(c.cost_value ?? c.cost ?? 0) || 0,
            description: c.description || null
          }))
        });

        if (!miscSaveResult?.success) {
          message.error(miscSaveResult?.detail || 'Failed to save miscellaneous costs');
          return { success: false, error: miscSaveResult };
        }

        message.success(
          mode === 'current' 
            ? `Version ${currentVersionId} updated successfully!`
            : `New version ${savedVersionId} created successfully!`
        );
        setSaveVersionModal(false);
        setVersionNotes('');
        setEditingOperations({});
        
        // Reload the data for the saved version
        if (mode === 'current') {
          await fetchProjectAndSpecificVersion(currentVersionId);
        } else {
          await fetchLatestVersion();
        }
        
        return { success: true, version_id: savedVersionId };
      }
    } catch (error) {
      console.error('Error saving version:', error);
      message.error(error.response?.data?.detail || 'Failed to save version');
      return { success: false, error };
    } finally {
      setSavingVersion(false);
      console.log('=== SAVE VERSION END ===');
    }
  };

  const handleMiscCostsUpdate = (data) => {
    try {
      console.log('handleMiscCostsUpdate called with:', data);
      
      const costs = Array.isArray(data?.miscellaneous_costs) ? data.miscellaneous_costs : [];
      
      const sanitizedCosts = costs.map(item => ({
        ...item,
        cost_value: parseFloat(item.cost_value || item.cost || 0) || 0
      }));

      setMiscCosts(sanitizedCosts);

      const miscTotal = sanitizedCosts.reduce(
        (sum, item) => sum + (parseFloat(item.cost_value) || 0),
        0
      );

      console.log('Calculated misc total:', miscTotal);
      
      setTotalMiscCost(miscTotal);

      if (data.miscellaneous_cost !== undefined) {
        console.log('Using API provided miscellaneous_cost:', data.miscellaneous_cost);
        setTotalMiscCost(parseFloat(data.miscellaneous_cost));
      }

      return { 
        miscellaneous_costs: sanitizedCosts, 
        total_cost: data.miscellaneous_cost !== undefined ? parseFloat(data.miscellaneous_cost) : miscTotal 
      };
    } catch (error) {
      console.error('Error updating misc costs:', error);
      message.error('Failed to update miscellaneous costs');
      return { miscellaneous_costs: [], total_cost: 0 };
    }
  };

  const getOperationsWithMachines = () => {
    if (!project || !project.operations) return [];
    
    return project.operations.map(op => ({
      ...op,
      selected_machine_model: operationMachines[op.id] || null,
      calculated_cost: calculatedCosts[op.id] || null,
      is_editing: editingOperations[op.id] || false,
      has_cost: calculatedCosts[op.id] !== null && calculatedCosts[op.id] !== undefined
    }));
  };

  const getCalculatedOperations = () => {
    if (!project || !project.operations) return [];
    
    return project.operations
      .filter(op => calculatedCosts[op.id] !== null && calculatedCosts[op.id] !== undefined)
      .map(op => ({
        id: op.id,
        oprn_no: op.oprn_no,
        wc: op.wc,
        operation: op.operation,
        allowed_time_hrs: op.allowed_time_hrs,
        selected_machine: operationMachines[op.id],
        calculated_cost: calculatedCosts[op.id]
      }));
  };

  const getTotalCost = () => {
    return Object.values(calculatedCosts)
      .filter(cost => cost !== null && cost !== undefined)
      .reduce((sum, cost) => sum + cost, 0);
  };

  const getGrandTotal = () => {
    return getTotalCost() + totalMiscCost;
  };

  const getFilteredOperations = (operations) => {
    if (!searchText.trim()) return operations;
    
    const lowerSearch = searchText.toLowerCase();
    return operations.filter(op => 
      (op.oprn_no && op.oprn_no.toString().toLowerCase().includes(lowerSearch)) ||
      (op.wc && op.wc.toLowerCase().includes(lowerSearch)) ||
      (op.operation && op.operation.toLowerCase().includes(lowerSearch))
    );
  };

  return (
    <MainLayout>
      <ProjectDetailsView
        // Navigation props
        navigate={navigate}
        projectId={id}
        
        // Project data
        project={project}
        loading={loading}
        has3D={has3D}
        has2D={has2D}
        
        // Tab control
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        
        // Operations data
        operationsWithMachines={getOperationsWithMachines()}
        calculatedOperations={getCalculatedOperations()}
        filteredCalculatedOps={getFilteredOperations(getCalculatedOperations())}
        
        // Machine selection
        machineOptions={machineOptions}
        loadingMachines={loadingMachines}
        onMachineChange={handleMachineChange}
        onEditOperation={handleEditOperation}
        onCancelEdit={handleCancelEdit}
        onFetchMachines={fetchMachinesForWC}
        
        // Cost calculation
        calculatingCosts={calculatingCosts}
        onCalculateAndSave={handleCalculateAndSave}
        hasAnyMachineSelected={Object.keys(operationMachines).length > 0}
        hasAnyCostCalculated={Object.keys(calculatedCosts).length > 0}
        
        // Miscellaneous costs
        miscCosts={miscCosts}
        totalMiscCost={totalMiscCost}
        onMiscCostsUpdate={handleMiscCostsUpdate}
        
        // Totals
        totalCost={getTotalCost()}
        grandTotal={getGrandTotal()}
        
        // Version management
        currentVersionId={currentVersionId}
        saveVersionModal={saveVersionModal}
        setSaveVersionModal={setSaveVersionModal}
        versionNotes={versionNotes}
        setVersionNotes={setVersionNotes}
        savingVersion={savingVersion}
        onSaveVersion={handleSaveVersion}
        
        // Search
        searchText={searchText}
        setSearchText={setSearchText}
      />
    </MainLayout>
  );
};

export default ProjectDetails;
