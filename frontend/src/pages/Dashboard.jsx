import React, { useState, useEffect } from 'react';
import { Button, Card, List, Input, Tag, Empty, Space, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, CalendarOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { projectService } from '../services/api';

const { Search } = Input;
const { Text, Title } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAllProjects();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId, e) => {
    e.stopPropagation();
    try {
      setDeletingId(projectId);
      const response = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (response.ok) {
        message.success('Project deleted successfully');
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        message.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      message.error('Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.project_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    p.part_no?.toLowerCase().includes(searchText.toLowerCase()) ||
    p.part_desc?.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 16px' }}>
        <Card style={{ marginBottom: 24, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Cost Estimation Projects</h1>
              <p style={{ margin: '8px 0 0', color: '#666' }}>Upload project files and manage cost estimations</p>
            </div>
            <Space>
              <Button 
                icon={<SettingOutlined />}
                onClick={() => navigate('/admin')}
                size="large"
              >
                Admin Panel
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                size="large"
                onClick={() => navigate('/create')}
              >
                Create Project
              </Button>
            </Space>
          </div>
        </Card>

        <Card style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
            <Search
              placeholder="Search by project name, part no, or description..."
              allowClear
              onChange={e => setSearchText(e.target.value)}
              style={{ maxWidth: 400 }}
              size="large"
            />
          </div>

          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 3,
              xl: 4,
              xxl: 4,
            }}
            dataSource={filteredProjects}
            loading={loading}
            renderItem={(item) => (
              <List.Item>
                <Card 
                  hoverable 
                  onClick={() => navigate(`/project/${item.id}`)}
                  onMouseEnter={() => setHoveredCard(item.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  bodyStyle={{ padding: 0 }}
                  style={{
                    border: hoveredCard === item.id ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    transition: 'all 0.3s ease',
                    boxShadow: hoveredCard === item.id ? '0 4px 12px rgba(24, 144, 255, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}
                >
                  {/* Header with blue background */}
                  <div style={{
                    backgroundColor: '#e6f7ff',
                    padding: '16px',
                    borderBottom: '1px solid #e8e8e8'
                  }}>
                    <Text strong style={{ fontSize: 16, color: '#000' }}>
                      {item.project_name}
                    </Text>
                  </div>

                  {/* Body */}
                  <div style={{ padding: 16 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Part No</Text>
                        <Text strong>{item.part_no || '-'}</Text>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Prod Order</Text>
                        <Text>{item.prod_order_no || '-'}</Text>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Operations</Text>
                        <Tag color="blue" style={{ margin: 0 }}>{item.total_no_of_oprns || 0}</Tag>
                      </div>
                      
                      <div style={{ 
                        marginTop: 8, 
                        paddingTop: 8, 
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Space size={4}>
                          <CalendarOutlined style={{ color: '#999', fontSize: 14 }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatDate(item.created_at)}
                          </Text>
                        </Space>
                        
                        <Popconfirm
                          title="Delete Project"
                          description="Are you sure you want to delete this project?"
                          onConfirm={(e) => handleDelete(item.id, e)}
                          onCancel={(e) => e.stopPropagation()}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            loading={deletingId === item.id}
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: '4px 8px' }}
                          />
                        </Popconfirm>
                      </div>
                    </Space>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;