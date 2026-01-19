import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, Button, Select, Input, Table, message, Space, Popconfirm, InputNumber, Alert } from 'antd';
import { PlusOutlined, SaveOutlined, EditOutlined, DeleteOutlined, CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { miscellaneousCostsService } from '../services/api';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          message="Something went wrong"
          description={
            <div>
              <p>An error occurred while rendering this component.</p>
              <pre style={{ color: 'red' }}>{this.state.error?.toString()}</pre>
              <Button onClick={() => this.setState({ hasError: false, error: null })}>
                Try Again
              </Button>
            </div>
          }
          type="error"
          showIcon
        />
      );
    }

    return this.props.children;
  }
}

const { Option } = Select;

const MiscellaneousCostsTable = forwardRef(({
  projectId,
  versionNo,
  onCostsUpdate,
  initialCosts = []
}, ref) => {
  const [costTypes, setCostTypes] = useState([]);
  const [miscCosts, setMiscCosts] = useState(Array.isArray(initialCosts) ? initialCosts : []);
  const [editingKey, setEditingKey] = useState('');
  const [newCost, setNewCost] = useState({
    cost_type: null,
    cost_value: 0,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use ref to track if we've already loaded data for this version
  const loadedVersionRef = useRef(null);

  // Expose save functionality to parent
  useImperativeHandle(ref, () => ({
    saveCosts: async (targetVersionNo) => {
      return await handleSaveAll(targetVersionNo);
    },
    getCosts: () => miscCosts
  }));

  // Fetch predefined cost types (only once on mount)
  useEffect(() => {
    fetchCostTypes();
  }, []);

  // Auto-expand if there are existing costs
  useEffect(() => {
    if (miscCosts.length > 0) {
      setIsExpanded(true);
    }
  }, [miscCosts.length]);

  // Load costs only when version changes or initialCosts change
  useEffect(() => {
    if (initialCosts && initialCosts.length > 0) {
      setMiscCosts(initialCosts);
      loadedVersionRef.current = versionNo;
    }
    else if (versionNo && loadedVersionRef.current !== versionNo && (!initialCosts || initialCosts.length === 0)) {
      fetchVersionCosts();
      loadedVersionRef.current = versionNo;
    }
    else if (versionNo !== loadedVersionRef.current && (!initialCosts || initialCosts.length === 0)) {
      setMiscCosts([]);
      loadedVersionRef.current = versionNo;
    }
  }, [versionNo]);

  // Separate effect to update costs when initialCosts changes (without fetching)
  useEffect(() => {
    if (Array.isArray(initialCosts) && initialCosts.length > 0 && JSON.stringify(initialCosts) !== JSON.stringify(miscCosts)) {
      setMiscCosts(initialCosts);
    }
  }, [initialCosts?.length]);

  const fetchCostTypes = async () => {
    try {
      const data = await miscellaneousCostsService.getCostTypes();
      if (data && data.success) {
        setCostTypes(data.cost_types || []);
      }
    } catch (error) {
      console.error('Error fetching cost types:', error);
      message.error('Failed to load cost types');
    }
  };

  const fetchVersionCosts = async () => {
    if (!versionNo || !projectId) return;

    try {
      setLoading(true);
      const data = await miscellaneousCostsService.getVersionCosts(projectId, versionNo);
      if (data.success) {
        const costs = Array.isArray(data?.miscellaneous_costs) ? data.miscellaneous_costs : [];
        const sanitizedCosts = costs.map(item => ({
          ...item,
          cost_value: parseFloat(item.cost_value || item.cost || 0) || 0
        }));
        setMiscCosts(sanitizedCosts);
      }
    } catch (error) {
      console.error('Error fetching costs:', error);
      message.error('Failed to load miscellaneous costs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCost = () => {
    if (!newCost.cost_type) {
      message.warning('Please select a cost type');
      return;
    }
    if (newCost.cost_value <= 0) {
      message.warning('Please enter a valid cost value');
      return;
    }

    // Check if cost type already exists
    if (miscCosts.find(c => c.cost_type === newCost.cost_type)) {
      message.warning('This cost type already exists. Edit the existing one.');
      return;
    }

    const newCostItem = {
      id: `temp-${Date.now()}`,
      ...newCost,
      isNew: true
    };

    const updatedCosts = [...miscCosts, newCostItem];
    setMiscCosts(updatedCosts);
    setNewCost({ cost_type: null, cost_value: 0, description: '' });
    
    // Notify parent of updates for total calculation
    if (onCostsUpdate) {
      updateParentTotals(updatedCosts);
    }
  };

  const updateParentTotals = (costs) => {
    const totalMisc = costs.reduce((sum, cost) => sum + parseFloat(cost.cost_value || 0), 0);
    onCostsUpdate({
      miscellaneous_costs: costs.map(c => ({
        ...c,
        cost_value: parseFloat(c.cost_value)
      })),
      total_cost: totalMisc,
      miscellaneous_cost: totalMisc
    });
  };

  const handleSaveAll = async (targetVersionNo) => {
    const vNo = targetVersionNo || versionNo;

    if (!vNo) {
      message.error('Version number is missing for saving costs');
      return false;
    }

    setSaving(true);
    try {
      const data = await miscellaneousCostsService.saveCosts({
        project_id: parseInt(projectId),
        version_no: vNo,
        misc_costs: (miscCosts || []).map(c => ({
          cost_type: c.cost_type,
          cost_value: parseFloat(c.cost_value ?? 0) || 0,
          description: c.description || null
        }))
      });

      if (data.success) {
        if (onCostsUpdate) {
          updateParentTotals(miscCosts);
        }
        if (!targetVersionNo || targetVersionNo === versionNo) {
          await fetchVersionCosts();
        }
        return true;
      } else {
        message.error(data.detail || 'Failed to save miscellaneous costs');
        return false;
      }
    } catch (error) {
      console.error('Error saving costs:', error);
      message.error('Failed to save miscellaneous costs');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setEditingKey(record.id);
  };

  const handleSaveEdit = (record) => {
    setEditingKey('');
    // Just update local state, don't call API
    if (onCostsUpdate) {
        updateParentTotals(miscCosts);
    }
  };

  const handleDelete = (record) => {
    // Just update local state, don't call API
    const updatedCosts = miscCosts.filter(c => c.id !== record.id);
    setMiscCosts(updatedCosts);
    if (onCostsUpdate) {
        updateParentTotals(updatedCosts);
    }
  };

  const handleCellEdit = (record, field, value) => {
    const newData = miscCosts.map(item => {
      if (item.id === record.id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setMiscCosts(newData);
    if (onCostsUpdate) {
      updateParentTotals(newData);
    }
  };

  const isEditing = (record) => record.id === editingKey;

  const formatCurrency = (value) => {
    const numValue = parseFloat(value || 0);
    return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns = [
    {
      title: 'Cost Type',
      dataIndex: 'cost_type',
      key: 'cost_type',
      width: 250,
      align: 'center',
      render: (value) => value || '-',
    },
    {
      title: 'Cost Value (₹)',
      dataIndex: 'cost_value',
      key: 'cost_value',
      width: 150,
      align: 'center',
      render: (value, record) => {
        const editable = isEditing(record);
        const displayValue = value || 0;

        return editable ? (
          <InputNumber
            value={displayValue}
            onChange={(val) => handleCellEdit(record, 'cost_value', val)}
            min={0}
            style={{ width: '100%' }}
            formatter={val => `₹ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={val => val.replace(/₹\s?|(,*)/g, '')}
          />
        ) : (
          formatCurrency(displayValue)
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      align: 'center',
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Input
            value={value}
            onChange={(e) => handleCellEdit(record, 'description', e.target.value)}
            placeholder="Optional description"
          />
        ) : (
          value || '-'
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button
              type="link"
              onClick={() => handleSaveEdit(record)}
              icon={<SaveOutlined />}
            >
              Ok
            </Button>
            <Button
              type="link"
              onClick={() => setEditingKey('')}
              icon={<CloseOutlined />}
            >
              Cancel
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              type="link"
              onClick={() => handleEdit(record)}
              icon={<EditOutlined />}
              disabled={editingKey !== ''}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this cost?"
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled={editingKey !== ''}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  const totalMiscCost = miscCosts.reduce((sum, cost) => sum + parseFloat(cost.cost_value || 0), 0);

  if (loading) {
    return <div>Loading costs data...</div>;
  }

  return (
    <Card 
      style={{ borderRadius: 8 }}
      bordered={true}
    >
      {/* Header - Always Visible */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Miscellaneous Costs
        </h3>
        <Space>
          <Button
            icon={isExpanded ? <UpOutlined /> : <PlusOutlined />}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Close' : 'Add'}
          </Button>
        </Space>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div style={{ marginTop: 24 }}>
          {/* Add New Cost Section - Inline Form */}
          <div style={{ 
            backgroundColor: '#fafafa', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: 16,
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ marginBottom: 12, fontWeight: '600', fontSize: '14px' }}>
              Add New Cost
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Select
                placeholder="Select cost type"
                style={{ width: 250 }}
                value={newCost.cost_type}
                onChange={(value) => setNewCost({ ...newCost, cost_type: value })}
              >
                {costTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>

              <InputNumber
                placeholder="Enter cost value"
                style={{ width: 200 }}
                value={newCost.cost_value}
                onChange={(value) => setNewCost({ ...newCost, cost_value: value })}
                min={0}
                formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/₹\s?|(,*)/g, '')}
              />

              <Input
                placeholder="Description (optional)"
                style={{ width: 300 }}
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
              />

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddCost}
              >
                Add Cost
              </Button>
            </div>
          </div>

          {/* Costs Table */}
          <Table
            columns={columns}
            dataSource={miscCosts}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'No costs added yet. Add your first cost above.' }}
            components={{
              header: {
                cell: (props) => (
                  <th {...props} style={{ ...props.style, backgroundColor: '#e6f7ff' }} />
                ),
              },
            }}
            summary={() => miscCosts.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={1}>
                    <strong>Total Miscellaneous Cost</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong style={{ color: '#1890ff', fontSize: 16 }}>
                      ₹{totalMiscCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={2} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null}
          />
        </div>
      )}
    </Card>
  );
});

const WrappedMiscellaneousCostsTable = React.forwardRef((props, ref) => {
  return (
    <ErrorBoundary>
      <MiscellaneousCostsTable ref={ref} {...props} />
    </ErrorBoundary>
  );
});

export default WrappedMiscellaneousCostsTable;
