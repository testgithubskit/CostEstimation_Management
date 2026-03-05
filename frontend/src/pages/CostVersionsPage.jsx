import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Space, message, Spin, Empty, List, Typography, Tag, Popconfirm, Grid } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined, CalendarOutlined, NumberOutlined, DeleteOutlined } from '@ant-design/icons';
import MainLayout from '../components/MainLayout';
import { costVersionService } from '../services/api';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const CostVersionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg;
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Fetch versions on mount and when location changes (coming back from detail page)
  useEffect(() => {
    console.log('Fetching versions for project:', id);
    fetchVersions();
  }, [id, location.key]); // Add location.key to re-fetch when navigating back

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const data = await costVersionService.getProjectVersions(id);
      if (data.success) {
        // Sort versions by version_no in descending order (newest first)
        const sortedVersions = (data.versions || []).sort((a, b) => b.version_no - a.version_no);
        setVersions(sortedVersions);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      message.error('Failed to load cost versions');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (versionId) => {
    navigate(`/project/${id}?version=${versionId}&tab=costs`);
  };

  const handleDeleteVersion = async (versionNo, e) => {
    e?.stopPropagation();
    try {
      const response = await costVersionService.deleteVersion(id, versionNo);
      if (response.success) {
        message.success('Version deleted successfully');
        fetchVersions(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      message.error('Failed to delete version');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

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
              onClick={() => navigate(`/project/${id}`)}
              size={isMobile ? 'small' : 'default'}
            >
              {isMobile ? '←' : 'Back'}
            </Button>
            
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '16px' : '20px', 
              fontWeight: '500',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HistoryOutlined style={{ marginRight: isMobile ? 4 : 8 }} />
              {isMobile ? 'Versions' : 'Cost Version History'}
            </h2>
            
            <div style={{ width: isMobile ? 80 : 100 }}></div>
          </div>
        </Card>

        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          </Card>
        ) : versions.length > 0 ? (
          <List
            grid={{
              gutter: isMobile ? 12 : 16,
              xs: 1,
              sm: 2,
              md: 2,
              lg: 3,
              xl: 4,
              xxl: 4,
            }}
            dataSource={versions}
            renderItem={(version) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleVersionClick(version.version_no)}
                  onMouseEnter={() => setHoveredCard(version.version_no)}
                  onMouseLeave={() => setHoveredCard(null)}
                  bodyStyle={{ padding: 0 }}
                  style={{
                    border: hoveredCard === version.version_no ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    transition: 'all 0.3s ease',
                    boxShadow: hoveredCard === version.version_no ? '0 4px 12px rgba(24, 144, 255, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}
                >
                  {/* Header with blue background */}
                  <div style={{
                    backgroundColor: '#e6f7ff',
                    padding: isMobile ? '12px' : '16px',
                    borderBottom: '1px solid #e8e8e8'
                  }}>
                    <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#000' }}>
                      Version {version.version_no}
                    </Text>
                  </div>

                  {/* Body */}
                  <div style={{ padding: isMobile ? '12px' : '16px' }}>
                    <Space direction="vertical" size={isMobile ? "small" : "small"} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>Total Cost</Text>
                        <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                          ₹{version.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </div>
                      
                      {(version.notes || version.note) ? (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start' 
                        }}>
                          <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, marginRight: 8 }}>Notes</Text>
                          <Text style={{ fontSize: isMobile ? 11 : 12, color: '#333', textAlign: 'right' }}>
                            {version.notes || version.note}
                          </Text>
                        </div>
                      ) : null}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>Operations</Text>
                        <Tag color="blue" style={{ margin: 0, fontSize: isMobile ? 10 : 12 }}>{version.operations_count}</Tag>
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
                          <CalendarOutlined style={{ color: '#999', fontSize: isMobile ? 12 : 14 }} />
                          <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                            {formatDate(version.created_at)}
                          </Text>
                        </Space>
                        <Popconfirm
                          title="Delete version"
                          description="Are you sure to delete this version?"
                          onConfirm={(e) => handleDeleteVersion(version.version_no, e)}
                          onCancel={(e) => e.stopPropagation()}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={(e) => e.stopPropagation()}
                            size={isMobile ? 'small' : 'small'}
                            style={{ padding: isMobile ? '2px 4px' : '4px 8px' }}
                          />
                        </Popconfirm>
                      </div>
                    </Space>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Card>
            <Empty
              description="No cost versions saved yet"
              style={{ padding: '40px 0' }}
            >
              <Button
                type="primary"
                onClick={() => navigate(`/project/${id}`)}
              >
                Go to Project Details
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default CostVersionsPage;
