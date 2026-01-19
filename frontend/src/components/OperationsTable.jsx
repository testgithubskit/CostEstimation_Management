import React from 'react';
import { Card, Input, Select, Button, Empty, Tag, Space, Tooltip } from 'antd';
import { EditOutlined, CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';

const OperationsTable = ({
  operations,
  machineOptions,
  loadingMachines,
  onMachineChange,
  onEditOperation,
  onCancelEdit,
  onFetchMachines,
  actionButtons
}) => {
  const operationsTableHeaderStyle = {
    backgroundColor: '#e6f7ff',
    padding: '12px',
    fontWeight: '600',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid #f0f0f0',
    whiteSpace: 'normal',
    wordWrap: 'break-word'
  };

  const operationsTableCellStyle = {
    padding: '12px',
    border: '1px solid #f0f0f0',
    textAlign: 'center',
    whiteSpace: 'normal',
    wordWrap: 'break-word'
  };

  return (
    <Card 
      style={{ borderRadius: 8 }}
      bordered={true}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Operations ({operations?.length || 0})
        </h3>
        {actionButtons && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {actionButtons}
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'separate', 
          borderSpacing: 0,
          minWidth: '1200px',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <thead>
            <tr>
              <th style={{...operationsTableHeaderStyle, borderTopLeftRadius: '8px'}}>Sl. No</th>
              <th style={operationsTableHeaderStyle}>Op No</th>
              <th style={operationsTableHeaderStyle}>Wc/Plant</th>
              <th style={operationsTableHeaderStyle}>Operation</th>
              <th style={operationsTableHeaderStyle}>Setup Time Hrs</th>
              <th style={operationsTableHeaderStyle}>Per Pc Time Hrs</th>
              <th style={operationsTableHeaderStyle}>Total Qty</th>
              <th style={operationsTableHeaderStyle}>Allowed Time Hrs</th>
              <th style={operationsTableHeaderStyle}>Machine Model</th>
              <th style={{...operationsTableHeaderStyle, borderTopRightRadius: '8px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {operations.length > 0 ? (
              operations.map((op, index) => {
                const isEditing = op.is_editing;
                const hasMachineSelected = op.selected_machine_model !== null && op.selected_machine_model !== undefined;
                const hasCost = op.has_cost;
                
                return (
                  <tr key={op.id || index}>
                    <td style={operationsTableCellStyle}>{index + 1}</td>
                    <td style={operationsTableCellStyle}>
                      <Input 
                        value={op.oprn_no || 'N/A'} 
                        readOnly 
                        bordered={false}
                        style={{ textAlign: 'center' }}
                      />
                    </td>
                    <td style={operationsTableCellStyle}>
                      <Input 
                        value={op.wc || 'N/A'} 
                        readOnly 
                        bordered={false}
                        style={{ textAlign: 'center' }}
                      />
                    </td>
                    <td style={{...operationsTableCellStyle, textAlign: 'center', paddingLeft: '16px', minWidth: '180px', whiteSpace: 'nowrap'}}>
                      {op.operation || 'N/A'}
                    </td>
                    <td style={operationsTableCellStyle}>
                      <Input 
                        value={op.setup_time_hrs ? parseFloat(op.setup_time_hrs).toFixed(2) : 'N/A'} 
                        readOnly 
                        bordered={false}
                        style={{ textAlign: 'center' }}
                      />
                    </td>
                    <td style={operationsTableCellStyle}>
                      <Input 
                        value={op.per_pc_time_hrs ? parseFloat(op.per_pc_time_hrs).toFixed(3) : 'N/A'} 
                        readOnly 
                        bordered={false}
                        style={{ textAlign: 'center' }}
                      />
                    </td>
                    <td style={operationsTableCellStyle}>
                      <Input 
                        value={op.total_qty || 'N/A'} 
                        readOnly 
                        bordered={false}
                        style={{ textAlign: 'center' }}
                      />
                    </td>
                    <td style={operationsTableCellStyle}>
                      <Input 
                          value={op.allowed_time_hrs ? parseFloat(op.allowed_time_hrs).toFixed(2) : 'N/A'} 
                          readOnly 
                          bordered={false}
                          style={{ 
                            textAlign: 'center'
                          }}
                        />
                    </td>
                    <td style={operationsTableCellStyle}>
                      <Select
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Select machine"
                        value={op.selected_machine_model || undefined}
                        onChange={(value) => onMachineChange(op.id, value)}
                        onDropdownVisibleChange={(open) => {
                          if (open && op.wc) {
                            onFetchMachines(op.wc, op.id);
                          }
                        }}
                        loading={loadingMachines[op.id]}
                        disabled={hasMachineSelected && !isEditing}
                        allowClear
                      >
                        {machineOptions[op.wc]?.map((machine) => (
                          <Select.Option 
                            key={machine.id} 
                            value={machine.display_value}
                          >
                            {machine.display_value}
                          </Select.Option>
                        ))}
                      </Select>
                    </td>
                    <td style={operationsTableCellStyle}>
                      {isEditing ? (
                        <Space>
                          <Button
                            size="small"
                            onClick={() => onCancelEdit(op.id)}
                          >
                            Cancel
                          </Button>
                        </Space>
                      ) : hasMachineSelected ? (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => onEditOperation(op.id)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Tag color="default">Not selected</Tag>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ ...operationsTableCellStyle, padding: '24px' }}>
                  <Empty description="No operations found" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default OperationsTable;