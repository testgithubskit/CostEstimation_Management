import React, { useState } from 'react';
import { Card, Button, Upload, message, Row, Col, Progress } from 'antd';
import { InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { projectService } from '../services/api';

const { Dragger } = Upload;

const CreateProject = () => {
  const navigate = useNavigate();
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
              Create New Project
            </h2>
            
            <div style={{ width: 120 }}></div>
          </div>
        </Card>

        <Card style={{ borderRadius: 8, paddingBottom: 40 }}>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: '14px' }}>
            Upload the Route Card (mandatory) and optionally add 2D drawing and 3D model files
          </p>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold' }}>Route Card *</div>
              <Dragger {...uploadProps(setOarcFile, '.pdf', 'Route Card')}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click to Upload Route Card</p>
                <p className="ant-upload-hint">Contains operations for the product</p>
              </Dragger>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold' }}>2D Drawing (Optional)</div>
              <Dragger {...uploadProps(setDrawing2d, '.pdf', '2D Drawing')}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click to Upload 2D Drawing</p>
                <p className="ant-upload-hint">Mechanical drawing 2D image PDF</p>
              </Dragger>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold' }}>3D Model (Optional)</div>
              <Dragger {...uploadProps(setDrawing3d, '.stp,.step', '3D Model')}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click to Upload 3D Model</p>
                <p className="ant-upload-hint">3D model in STEP format (.step, .stp)</p>
              </Dragger>
            </Col>
          </Row>

          <div style={{ marginTop: 80, textAlign: 'center', marginBottom: 24 }}>
            {/* Loading Progress Bar above button */}
            {loading && (
              <div style={{ 
                width: '100%', 
                margin: '0 auto 24px auto',
                padding: '0 24px'
              }}>
                <Progress 
                  percent={99.9} 
                  status="active"
                  strokeColor="#1890ff"
                  trailColor="#f0f0f0"
                  strokeWidth={8}
                  showInfo={false}
                  style={{ marginBottom: 0 }}
                />
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: 8, 
                  color: '#1890ff',
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  Creating project...
                </div>
              </div>
            )}
            
            <Button 
              type="primary" 
              size="large" 
              onClick={handleUpload}
              disabled={loading}
              style={{ minWidth: 200, height: 50, fontSize: 18 }}
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