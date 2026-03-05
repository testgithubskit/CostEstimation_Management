import React, { useState } from 'react';
import { Card, Button, Upload, message, Row, Col, Progress, Grid } from 'antd';
import { InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { projectService } from '../services/api';

const { Dragger } = Upload;
const { useBreakpoint } = Grid;

const CreateProject = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg;
  const [loading, setLoading] = useState(false);
  
  // File states
  const [oarcFile, setOarcFile] = useState(null);
  const [drawing2d, setDrawing2d] = useState(null);
  const [drawing3d, setDrawing3d] = useState(null);

  const handleUpload = async () => {
    // Validation - only OARC file is mandatory
    if (!oarcFile) {
      message.error('Route Card (OARC PDF) is mandatory!');
      return;
    }

    const formData = new FormData();
    formData.append('oarc_file', oarcFile);
    
    // Add optional files only if they exist
    if (drawing2d) {
      formData.append('drawing_2d_file', drawing2d);
    }
    if (drawing3d) {
      formData.append('drawing_3d_file', drawing3d);
    }

    try {
      setLoading(true);
      const result = await projectService.createProject(formData);
      if (result.success) {
        message.success('Project created successfully!');
        navigate(`/project/${result.project_id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      message.error('Failed to create project. Please check files and try again.');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = (setter, accept, text) => ({
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept,
    beforeUpload: (file) => {
      setter(file);
      return false; // Prevent auto upload
    },
    onRemove: () => {
      setter(null);
    },
    fileList: setter === setOarcFile && oarcFile ? [oarcFile] : 
              setter === setDrawing2d && drawing2d ? [drawing2d] :
              setter === setDrawing3d && drawing3d ? [drawing3d] : []
  });

  return (
    <MainLayout>
      <div style={{ width: '100%', padding: '0 8px' }}>
        <Card style={{ marginBottom: isMobile ? 16 : 24, borderRadius: 8 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '8px' : '0'
          }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/')}
              size={isMobile ? 'small' : 'default'}
            >
              {isMobile ? '←' : 'Back'}
            </Button>
            
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '16px' : '20px', 
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {isMobile ? 'New Project' : 'Create New Project'}
            </h2>
            
            <div style={{ width: isMobile ? 80 : 120 }}></div>
          </div>
        </Card>

        <Card style={{ borderRadius: 8, paddingBottom: 40 }}>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: '14px' }}>
            Upload the Route Card (mandatory) and optionally add 2D drawing and 3D model files
          </p>

          <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold', fontSize: isMobile ? '14px' : '16px' }}>
                {isMobile ? 'Route Card *' : 'Route Card *'}
              </div>
              <Dragger {...uploadProps(setOarcFile, '.pdf', 'Route Card')}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: isMobile ? 32 : 48 }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  {isMobile ? 'Upload Route Card' : 'Click to Upload Route Card'}
                </p>
                <p className="ant-upload-hint" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  {isMobile ? 'Operations PDF' : 'Contains operations for the product'}
                </p>
              </Dragger>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold', fontSize: isMobile ? '14px' : '16px' }}>
                {isMobile ? '2D Drawing' : '2D Drawing (Optional)'}
              </div>
              <Dragger {...uploadProps(setDrawing2d, '.pdf', '2D Drawing')}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: isMobile ? 32 : 48 }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  {isMobile ? 'Upload 2D Drawing' : 'Click to Upload 2D Drawing'}
                </p>
                <p className="ant-upload-hint" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  {isMobile ? 'Drawing PDF' : 'Mechanical drawing 2D image PDF'}
                </p>
              </Dragger>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold', fontSize: isMobile ? '14px' : '16px' }}>
                {isMobile ? '3D Model' : '3D Model (Optional)'}
              </div>
              <Dragger {...uploadProps(setDrawing3d, '.stp,.step', '3D Model')}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: isMobile ? 32 : 48 }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  {isMobile ? 'Upload 3D Model' : 'Click to Upload 3D Model'}
                </p>
                <p className="ant-upload-hint" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  {isMobile ? 'STEP file' : '3D model in STEP format (.step, .stp)'}
                </p>
              </Dragger>
            </Col>
          </Row>

          <div style={{ marginTop: isMobile ? 60 : 80, textAlign: 'center', marginBottom: 24 }}>
            {/* Loading Progress Bar above button */}
            {loading && (
              <div style={{ 
                width: '100%', 
                margin: '0 auto 24px auto',
                padding: isMobile ? '0 16px' : '0 24px'
              }}>
                <Progress 
                  percent={99.9} 
                  status="active"
                  strokeColor="#1890ff"
                  trailColor="#f0f0f0"
                  strokeWidth={isMobile ? 6 : 8}
                  showInfo={false}
                  style={{ marginBottom: 0 }}
                />
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: 8, 
                  color: '#1890ff',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: 500
                }}>
                  Creating project...
                </div>
              </div>
            )}
            
            <Button 
              type="primary" 
              size={isMobile ? 'middle' : 'large'} 
              onClick={handleUpload}
              disabled={loading}
              style={{ 
                minWidth: isMobile ? 150 : 200, 
                height: isMobile ? 40 : 50, 
                fontSize: isMobile ? 14 : 18 
              }}
            >
              Create Project
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CreateProject;