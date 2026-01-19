import React, { useState, useEffect } from 'react';
import { Card, Button, Upload, message, Table, Space, Popconfirm, Modal, InputNumber, Input, Form, Tabs, Divider } from 'antd';
import { InboxOutlined, ArrowLeftOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined, EditOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { adminService } from '../services/api';

const { Dragger } = Upload;

const AdminPage = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [machineData, setMachineData] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editRate, setEditRate] = useState(0);
  
  // Manual entry states
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualForm] = Form.useForm();
  const [submittingManual, setSubmittingManual] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchMachineData();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await adminService.getMachineStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  const fetchMachineData = async () => {
    setLoadingMachines(true);
    try {
      const data = await adminService.getMachineList();
      if (data.success) {
        setMachineData(data.machines || []);
      }
    } catch (error) {
      console.error('Error fetching machine list:', error);
      message.error('Failed to load machine data');
    } finally {
      setLoadingMachines(false);
    }
  };

  const handleUpload = async () => {
    if (!excelFile) {
      message.error('Please select an Excel file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      setUploading(true);
      const result = await adminService.uploadMachineData(formData);
      
      if (result.success) {
        message.success(
          `Successfully uploaded! Inserted: ${result.inserted}, Skipped: ${result.skipped}`
        );
        setExcelFile(null);
        fetchStats();
        fetchMachineData();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error(error.response?.data?.detail || 'Failed to upload Excel file');
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    try {
      const values = await manualForm.validateFields();
      setSubmittingManual(true);
      
      const result = await adminService.createMachine(values);
      
      if (result.success) {
        message.success('Machine record added successfully');
        setManualEntryOpen(false);
        manualForm.resetFields();
        fetchStats();
        fetchMachineData();
      }
    } catch (error) {
      if (error.errorFields) {
        message.error('Please fill all required fields');
      } else {
        console.error('Error creating machine:', error);
        message.error(error.response?.data?.detail || 'Failed to create machine record');
      }
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleDeleteMachine = async (machineId) => {
    try {
      // Call the delete API endpoint
      const result = await adminService.deleteMachine(machineId);
      
      if (result.success) {
        message.success('Machine record deleted successfully');
        fetchStats();
        fetchMachineData();
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      message.error(error.response?.data?.detail || 'Failed to delete machine record');
    }
  };

  const handleClearData = async () => {
    try {
      const result = await adminService.clearMachineData();
      if (result.success) {
        message.success(`Deleted ${result.deleted_count} machine records`);
        fetchStats();
        fetchMachineData();
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      message.error('Failed to clear machine data');
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.xlsx,.xls',
    beforeUpload: (file) => {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isExcel) {
        message.error('Please upload Excel file (.xlsx or .xls)');
        return false;
      }
      setExcelFile(file);
      return false;
    },
    onRemove: () => {
      setExcelFile(null);
    },
    fileList: excelFile ? [excelFile] : []
  };

  const machineColumns = [
    {
      title: 'Sl. No',
      key: 'slno',
      align: 'center',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: 'Work Center Code',
      dataIndex: 'Work_Center_Code',
      key: 'Work_Center_Code',
      align: 'center',
      width: 150,
    },
    {
      title: 'Work Center Type',
      dataIndex: 'Work_Center_Type',
      key: 'Work_Center_Type',
      align: 'center',
      width: 150,
    },
    {
      title: 'Machine Make',
      dataIndex: 'Machine_Make',
      key: 'Machine_Make',
      align: 'center',
      width: 140,
    },
    {
      title: 'Machine Model',
      dataIndex: 'Machine_Model',
      key: 'Machine_Model',
      align: 'center',
      width: 180,
    },
    {
      title: 'Hourly Rate (₹/hr)',
      dataIndex: 'Hourly_Rate',
      key: 'Hourly_Rate',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      align: 'center',
      width: 140,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditRecord(record);
              setEditRate(Number(record.Hourly_Rate || 0));
              setEditOpen(true);
            }}
          />

          <Popconfirm
            title="Delete Machine"
            description="Are you sure you want to delete this machine?"
            onConfirm={() => handleDeleteMachine(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    }

  ];

  const tabItems = [
    {
      key: 'bulk',
      label: 'Upload (Excel)',
      children: (
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: 16, 
            padding: '10px 16px',
            backgroundColor: '#e6f7ff',
            borderRadius: 6,
            border: '1px solid #91d5ff'
          }}>
            <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />
            <span style={{ color: '#0050b3', fontSize: 14 }}>
              Excel file must contain columns: Work_Center_Code, Work_Center_Type, Machine_Make, Machine_Model, Hourly_Rate
            </span>
          </div>
          
          <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag Excel file to upload</p>
            <p className="ant-upload-hint">
              Supports .xlsx and .xls files with machine data
            </p>
          </Dragger>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              type="primary"
              size="middle"
              onClick={handleUpload}
              loading={uploading}
              disabled={!excelFile}
              style={{ minWidth: 150 }}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'manual',
      label: 'Manual Entry',
      children: (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <PlusOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 16 }}>Add Machine Manually</h3>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Use this option to add individual machine records one at a time
          </p>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setManualEntryOpen(true)}
          >
            Add New Machine
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 16px' }}>
        <Card style={{ marginBottom: 24, borderRadius: 8 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/')}
            >
              Back
            </Button>
            
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              Admin - Machine Data Management
            </h2>
            
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchStats}
              loading={loadingStats}
            >
              Refresh
            </Button>
          </div>
        </Card>

        {/* Data Entry Section */}
        <Card style={{ marginBottom: 24, borderRadius: 8 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 16 }}>
            Add Machine Data
          </h3>
          
          <Tabs items={tabItems} />

          <Divider />

          <Popconfirm
            title="Clear All Machine Data"
            description="Are you sure? This will delete ALL machine records!"
            onConfirm={handleClearData}
            okText="Yes, Delete All"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={!stats || stats.total_machines === 0}
            >
              Clear All Data
            </Button>
          </Popconfirm>
        </Card>

        {/* Machine Master Data Table */}
        <Card style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              Machine Master Data
            </h3>
            <span style={{ fontSize: '16px', color: '#666' }}>
              Total Machines: <strong style={{ color: 'blue', fontSize: '18px' }}>{stats?.total_machines || 0}</strong>
            </span>
          </div>
          <Table
            columns={machineColumns}
            dataSource={machineData}
            rowKey={(record) => record.id}
            pagination={{ pageSize: 10 }}
            loading={loadingMachines}
            bordered
            size="middle"
            scroll={{ x: 1200 }}
            components={{
              header: {
                cell: (props) => (
                  <th {...props} style={{ ...props.style, backgroundColor: '#e6f7ff' }} />
                ),
              },
            }}
          />
        </Card>
        
        {/* Edit Rate Modal */}
        <Modal
          title={
            <div>
              <div style={{ marginBottom: 12 }}>Edit Hourly Rate</div>
              <div style={{ borderBottom: '1px solid #f0f0f0' }} />
            </div>
          }
          open={editOpen}
          onOk={async () => {
            try {
              const resp = await adminService.updateMachineRate(editRecord.id, editRate);
              if (resp.success) {
                message.success('Hourly rate updated');
                setEditOpen(false);
                setEditRecord(null);
                fetchMachineData();
                fetchStats();
              }
            } catch (error) {
              console.error('Error updating rate:', error);
              message.error('Failed to update hourly rate');
            }
          }}
          onCancel={() => {
            setEditOpen(false);
            setEditRecord(null);
          }}
          okText="Save"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <div style={{ marginBottom: 8 }}>Work Center Code: <strong>{editRecord?.Work_Center_Code}</strong></div>
              <div style={{ marginBottom: 8 }}>Machine Model: <strong>{editRecord?.Machine_Model}</strong></div>
            </div>
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              value={editRate}
              onChange={(v) => setEditRate(v)}
              style={{ width: '100%' }}
              addonBefore="₹"
            />
          </Space>
        </Modal>

        {/* Manual Entry Modal */}
        <Modal
          title="Add Machine Manually"
          open={manualEntryOpen}
          onOk={handleManualSubmit}
          onCancel={() => {
            setManualEntryOpen(false);
            manualForm.resetFields();
          }}
          okText="Add Machine"
          confirmLoading={submittingManual}
          width={600}
        >
          <Form
            form={manualForm}
            layout="vertical"
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="work_center_id"
              label="Work Center ID"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Optional"
              />
            </Form.Item>

            <Form.Item
              name="work_center_code"
              label="Work Center Code"
              rules={[{ required: true, message: 'Please enter work center code' }]}
            >
              <Input placeholder="e.g., WC001" />
            </Form.Item>

            <Form.Item
              name="work_center_type"
              label="Work Center Type"
              rules={[{ required: true, message: 'Please enter work center type' }]}
            >
              <Input placeholder="e.g., CNC, Milling, Lathe" />
            </Form.Item>

            <Form.Item
              name="machine_make"
              label="Machine Make"
              rules={[{ required: true, message: 'Please enter machine make' }]}
            >
              <Input placeholder="e.g., HAAS, DMG MORI" />
            </Form.Item>

            <Form.Item
              name="machine_model"
              label="Machine Model"
              rules={[{ required: true, message: 'Please enter machine model' }]}
            >
              <Input placeholder="e.g., VF-2SS, NLX 2500" />
            </Form.Item>

            <Form.Item
              name="hourly_rate"
              label="Hourly Rate (₹/hr)"
              rules={[
                { required: true, message: 'Please enter hourly rate' },
                { type: 'number', min: 0, message: 'Rate must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                addonBefore="₹"
                placeholder="0.00"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default AdminPage;