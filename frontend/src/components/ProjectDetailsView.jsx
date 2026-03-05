import React, { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Button, Spin, Empty, Row, Col, Input, Space, Modal, Segmented, Radio, Table, Grid } from 'antd';
import { 
  SaveOutlined, 
  PrinterOutlined, 
  EditOutlined, 
  CloseOutlined, 
  HistoryOutlined, 
  ArrowLeftOutlined, 
  CodeSandboxOutlined, 
  FileImageOutlined 
} from '@ant-design/icons';
import { projectService } from '../services/api';
import ProjectDetailsCard from './ProjectDetailsCard';
import OperationsTable from './OperationsTable';
import ModelViewer3D from './ModelViewer3D';
import CostBreakdownCard from './CostBreakdownCard';
import MiscellaneousCostsTable from './MiscellaneousCostsTable';
import CostReportModal from './CostReportModal';

const { useBreakpoint } = Grid;

const ProjectDetailsView = ({
  navigate,
  projectId,
  project,
  loading,
  has3D,
  has2D,
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  operationsWithMachines,
  calculatedOperations,
  filteredCalculatedOps,
  machineOptions,
  loadingMachines,
  onMachineChange,
  onEditOperation,
  onCancelEdit,
  onFetchMachines,
  calculatingCosts,
  onCalculateAndSave,
  hasAnyMachineSelected,
  hasAnyCostCalculated,
  miscCosts,
  totalMiscCost,
  onMiscCostsUpdate,
  totalCost,
  grandTotal,
  currentVersionId,
  saveVersionModal,
  setSaveVersionModal,
  versionNotes,
  setVersionNotes,
  savingVersion,
  onSaveVersion,
  searchText,
  setSearchText
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md is 768px in Ant Design
  const isTablet = !screens.lg; // lg is 992px in Ant Design
  const viewerRef = useRef(null);
  const [reportImage, setReportImage] = React.useState(null);
  const [saveMode, setSaveMode] = React.useState('new');
  const [showReportModal, setShowReportModal] = React.useState(false);

  const handleGenerateReport = async () => {
    let image = null;
    if (viewerRef.current && has3D && viewMode === '3d') {
      try {
        image = await viewerRef.current();
      } catch (e) {
        console.error("Failed to capture 3D image", e);
      }
    }
    setReportImage(image);
    setShowReportModal(true);
  };

  const handleModalOk = async () => {
    await onSaveVersion(saveMode);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return <Empty description="Project not found" />;
  }

  const showViewer = has3D || has2D;

  const tabItems = [
    {
      key: 'details',
      label: isMobile ? 'Details' : 'Project Details',
      children: (
        <div>
          <ProjectDetailsCard project={project} />
          <OperationsTable
            operations={operationsWithMachines}
            machineOptions={machineOptions}
            loadingMachines={loadingMachines}
            onMachineChange={onMachineChange}
            onEditOperation={onEditOperation}
            onCancelEdit={onCancelEdit}
            onFetchMachines={onFetchMachines}
          />
          <div style={{ marginTop: 24 }}>
            <MiscellaneousCostsTable
              projectId={projectId}
              versionNo={currentVersionId}
              initialCosts={miscCosts}
              onCostsUpdate={onMiscCostsUpdate}
            />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 24,
            padding: '16px 0',
            borderTop: '1px solid #f0f0f0',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '8px' : '0'
          }}>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onCalculateAndSave}
                loading={calculatingCosts}
                disabled={calculatingCosts}
                size={isMobile ? 'default' : 'large'}
                style={{ width: isMobile ? '100%' : 'auto' }}
              >
                {calculatingCosts ? 'Calculating...' : (isMobile ? 'Save' : 'Save Project Details')}
              </Button>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => navigate(`/project/${projectId}/versions`)}
                size={isMobile ? 'default' : 'large'}
                style={{ width: isMobile ? '100%' : 'auto' }}
              >
                {isMobile ? 'Versions' : 'View Version History'}
              </Button>
            </Space>
          </div>
        </div>
      )
    },
    {
      key: 'costs',
      label: isMobile ? 'Costs' : 'Estimated Cost',
      children: (
        <div style={{ position: 'relative' }}>
          {calculatedOperations.length > 0 ? (
            <>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                {currentVersionId && (
                  <span style={{ color: '#666', fontSize: isMobile ? 12 : 14 }}>
                    {isMobile ? 'Ver:' : 'Viewing Version:'} <strong>v{currentVersionId}</strong>
                  </span>
                )}
              </div>

              {/* Main Content Row - Responsive Height */}
              <Row gutter={[isMobile ? 16 : 24, 16]} style={{ marginBottom: 24 }}>
                {/* Left Side - 3D/2D Viewer */}
                {showViewer && (
                  <Col xs={24} lg={14} xl={14}>
                    <Card 
                      style={{ 
                        marginBottom: 24,
                        height: isMobile ? '400px' : '700px'
                      }}
                      bodyStyle={{ 
                        height: '100%',
                        display: 'flex', 
                        flexDirection: 'column',
                        padding: isMobile ? '16px' : '24px'
                      }}
                    >
                      <div style={{ marginBottom: 16, textAlign: 'center' }}>
                        <Segmented
                          options={[
                            { label: '3D View', value: '3d', icon: <CodeSandboxOutlined />, disabled: !has3D },
                            { label: '2D View', value: '2d', icon: <FileImageOutlined />, disabled: !has2D }
                          ]}
                          value={viewMode}
                          onChange={setViewMode}
                          size={isMobile ? 'small' : 'default'}
                        />
                      </div>

                      <div style={{ 
                        flex: 1, 
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: 0
                      }}>
                        {viewMode === '3d' ? (
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: '#f5f5f5',
                            border: '1px solid #d9d9d9',
                            borderRadius: 8
                          }}>
                            <ModelViewer3D
                              has3D={has3D}
                              modelUrl={projectService.getFileUrl(projectId, '3d-converted')}
                              onCaptureRef={viewerRef}
                            />
                          </div>
                        ) : (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: '#f5f5f5',
                            border: '1px solid #d9d9d9',
                            borderRadius: 8,
                            overflow: 'hidden'
                          }}>
                            <iframe
                              src={projectService.getFileUrl(projectId, '2d')}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                border: 'none'
                              }}
                              title="2D Drawing"
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                )}

                {/* Right Side - Cost Cards */}
                <Col xs={24} lg={showViewer ? 10 : 24} xl={showViewer ? 10 : 24}>
                  <div style={{ 
                    height: isMobile ? 'auto' : '700px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px' 
                  }}>
                    {/* Cost Breakdown Card - Takes 60% */}
                    <Card 
                      style={{ 
                        borderRadius: 8,
                        height: isMobile ? 'auto' : '55%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      bodyStyle={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: isMobile ? '16px' : '20px'
                      }}
                    >
                      <h3 style={{ 
                        fontSize: isMobile ? '14px' : '16px', 
                        fontWeight: 'bold', 
                        marginBottom: 16, 
                        marginTop: 0 
                      }}>
                        Cost Breakdown
                      </h3>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <Table
                          columns={[
                            { 
                              title: 'Op No', 
                              dataIndex: 'oprn_no', 
                              key: 'oprn_no', 
                              align: 'center', 
                              width: isMobile ? 60 : 80,
                              fixed: 'left',
                              render: (text) => text || '-'
                            },
                            { 
                              title: 'Wc/Plant', 
                              dataIndex: 'wc', 
                              key: 'wc', 
                              align: 'center', 
                              width: isMobile ? 80 : 100,
                              render: (text) => text || '-'
                            },
                            { 
                              title: 'Operation', 
                              dataIndex: 'operation', 
                              key: 'operation', 
                              align: 'center',
                              width: isMobile ? 120 : 150,
                              ellipsis: true,
                              render: (text) => text || '-'
                            },
                            { 
                              title: 'Machine Model', 
                              dataIndex: 'selected_machine', 
                              key: 'selected_machine', 
                              align: 'center',
                              width: isMobile ? 120 : 150,
                              ellipsis: true,
                              render: (text) => text || '-'
                            },
                            { 
                              title: 'Allowed Time (Hrs)', 
                              dataIndex: 'allowed_time_hrs', 
                              key: 'allowed_time_hrs', 
                              align: 'center',
                              width: isMobile ? 120 : 150,
                              render: (text) => (text !== undefined && text !== null) ? parseFloat(text).toFixed(2) : '-'
                            },
                            { 
                              title: 'Cost (₹)', 
                              dataIndex: 'calculated_cost', 
                              key: 'calculated_cost', 
                              align: 'center',
                              width: isMobile ? 100 : 120,
                              fixed: 'right',
                              render: (cost) => `₹${parseFloat(cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            }
                          ]}
                          dataSource={filteredCalculatedOps}
                          rowKey="id"
                          pagination={{ 
                            pageSize: isMobile ? 3 : 5, 
                            size: 'small', 
                            showSizeChanger: false 
                          }}
                          size="small"
                          scroll={{ x: isMobile ? 600 : 700 }}
                          summary={() => (
                            <Table.Summary fixed>
                              <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5} align="left">
                                  <strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                                    {isMobile ? 'Op Cost' : 'Operational Cost'}
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="center">
                                  <strong style={{ color: '#1890ff', fontSize: isMobile ? '12px' : '14px' }}>
                                    ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </strong>
                                </Table.Summary.Cell>
                              </Table.Summary.Row>
                            </Table.Summary>
                          )}
                          components={{
                            header: {
                              cell: (props) => (
                                <th {...props} style={{ 
                                  ...props.style, 
                                  backgroundColor: '#e6f7ff',
                                  fontSize: isMobile ? '11px' : '14px'
                                }} />
                              ),
                            },
                          }}
                        />
                      </div>
                    </Card>

                    {/* Miscellaneous Cost Card - Takes 40% */}
                    <Card 
                      style={{ 
                        borderRadius: 8,
                        height: isMobile ? 'auto' : '43%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      bodyStyle={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: isMobile ? '16px' : '20px'
                      }}
                    >
                      <h3 style={{ 
                        fontSize: isMobile ? '14px' : '16px', 
                        fontWeight: 'bold', 
                        marginBottom: 16, 
                        marginTop: 0 
                      }}>
                        Miscellaneous Cost
                      </h3>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <Table
                          columns={[
                            { 
                              title: 'Cost Type', 
                              dataIndex: 'cost_type', 
                              key: 'cost_type', 
                              align: 'center',
                              render: (text) => text || '-'
                            },
                            {
                              title: 'Cost Value (₹)', 
                              dataIndex: 'cost_value', 
                              key: 'cost_value', 
                              align: 'center',
                              width: isMobile ? 120 : 140,
                              render: (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            },
                            { 
                              title: 'Description', 
                              dataIndex: 'description', 
                              key: 'description', 
                              align: 'center',
                              ellipsis: true,
                              render: (text) => text || '-'
                            }
                          ]}
                          dataSource={miscCosts}
                          rowKey={(r) => r.id || `${r.cost_type}-${r.description}`}
                          pagination={{ 
                            pageSize: isMobile ? 2 : 3, 
                            size: 'small', 
                            showSizeChanger: false 
                          }}
                          size="small"
                          summary={() => (
                            <Table.Summary fixed>
                              <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={2} align="left">
                                  <strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                                    {isMobile ? 'Total Misc' : 'Total Miscellaneous Cost'}
                                  </strong>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="center">
                                  <strong style={{ color: '#1890ff', fontSize: isMobile ? '12px' : '14px' }}>
                                    ₹{parseFloat(totalMiscCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </strong>
                                </Table.Summary.Cell>
                              </Table.Summary.Row>
                            </Table.Summary>
                          )}
                          components={{
                            header: {
                              cell: (props) => (
                                <th {...props} style={{ 
                                  ...props.style, 
                                  backgroundColor: '#e6f7ff',
                                  fontSize: isMobile ? '11px' : '14px'
                                }} />
                              ),
                            },
                          }}
                        />
                      </div>
                    </Card>
                  </div>
                </Col>
              </Row>

              {/* Total Cost Summary - Below Everything */}
              <Row gutter={[isMobile ? 16 : 24, 16]}>
                <Col xs={24}>
                  <Card style={{
                    borderRadius: 8,
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff'
                  }}>
                    <div style={{ textAlign: 'center', padding: isMobile ? '16px 0' : '20px 0' }}>
                      <h2 style={{
                        color: '#000',
                        margin: 0,
                        fontSize: isMobile ? '16px' : '20px',
                        fontWeight: 'bold',
                        marginBottom: isMobile ? 16 : 24
                      }}>
                        {isMobile ? 'Total Cost' : 'Total Project Cost Estimation'}
                      </h2>

                      <Row gutter={[isMobile ? 16 : 24, 16]} justify="center">
                        <Col xs={24} sm={12} md={8}>
                          <div style={{
                            background: 'white',
                            padding: isMobile ? '16px 12px' : '24px 16px',
                            borderRadius: 8,
                            border: '1px solid #d9d9d9'
                          }}>
                            <div style={{ color: '#666', fontSize: isMobile ? 12 : 14, marginBottom: 12 }}>
                              {isMobile ? 'Op Cost' : 'Operational Cost'}
                            </div>
                            <div style={{ 
                              color: '#1890ff', 
                              fontSize: isMobile ? 20 : 28, 
                              fontWeight: 'bold' 
                            }}>
                              ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </Col>

                        <Col xs={24} sm={12} md={8}>
                          <div style={{
                            background: 'white',
                            padding: isMobile ? '16px 12px' : '24px 16px',
                            borderRadius: 8,
                            border: '1px solid #d9d9d9'
                          }}>
                            <div style={{ color: '#666', fontSize: isMobile ? 12 : 14, marginBottom: 12 }}>
                              {isMobile ? 'Misc Cost' : 'Miscellaneous Cost'}
                            </div>
                            <div style={{ 
                              color: '#1890ff', 
                              fontSize: isMobile ? 20 : 28, 
                              fontWeight: 'bold' 
                            }}>
                              ₹{totalMiscCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </Col>

                        <Col xs={24} sm={24} md={8}>
                          <div style={{
                            background: '#1890ff',
                            padding: isMobile ? '16px 12px' : '24px 16px',
                            borderRadius: 8,
                            border: '2px solid #096dd9'
                          }}>
                            <div style={{ 
                              color: 'white', 
                              fontSize: isMobile ? 12 : 14, 
                              fontWeight: '500', 
                              marginBottom: 12 
                            }}>
                              TOTAL COST
                            </div>
                            <div style={{ 
                              color: 'white', 
                              fontSize: isMobile ? 24 : 32, 
                              fontWeight: 'bold' 
                            }}>
                              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          ) : (
            <Empty description="No costs calculated yet" style={{ marginTop: 50 }}>
              <p style={{ color: '#666', marginBottom: 16 }}>
                Please select machines and calculate costs in the Project Details tab.
              </p>
              <Button type="primary" onClick={() => setActiveTab('details')}>
                Go to Project Details
              </Button>
            </Empty>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ width: '100%', padding: '0 8px' }}>
      <Card style={{ marginBottom: isMobile ? 16 : 24, borderRadius: 8 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '8px' : '0'
        }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            {isMobile ? '←' : 'Back'}
          </Button>
          {project.project_name && (
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '16px' : '20px', 
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {project.project_name}
            </h2>
          )}
          <div style={{ width: isMobile ? 80 : 80 }}></div>
        </div>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size={isMobile ? 'small' : 'default'}
        tabBarExtraContent={
          activeTab === 'costs' ? (
            <Button 
              type="primary" 
              onClick={handleGenerateReport}
              size={isMobile ? 'small' : 'default'}
            >
              {isMobile ? 'Report' : 'View Report'}
            </Button>
          ) : null
        }
        items={tabItems}
      />

      <CostReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        data={{
          projectId,
          project,
          operations: filteredCalculatedOps,
          miscCosts,
          totalCost,
          totalMiscCost,
          grandTotal,
          has3D,
          previewImage: reportImage
        }}
      />

      <Modal
        title="Save Cost Version"
        open={saveVersionModal}
        onOk={handleModalOk}
        onCancel={() => setSaveVersionModal(false)}
        confirmLoading={savingVersion}
        okText="Save Version"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Radio.Group value={saveMode} onChange={(e) => setSaveMode(e.target.value)}>
            <Radio.Button value="new">Create New Version</Radio.Button>
            <Radio.Button value="current" disabled={!currentVersionId}>
              Save to Current Version
            </Radio.Button>
          </Radio.Group>
          <div>
            <p style={{ marginBottom: 8 }}>
              <strong>Operations with costs:</strong> {calculatedOperations.length} / {project.operations.length}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Operational Cost:</strong> ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Miscellaneous Cost:</strong> ₹{totalMiscCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Total Cost:</strong> ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {/* <div> */}
            {/* <label style={{ fontWeight: 'bold', marginBottom: 8, display: 'block' }}>
              Notes (Optional)
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Add notes about this version..."
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
            />
          </div> */}
        </Space>
      </Modal>
    </div>
  );
};

export default ProjectDetailsView;
