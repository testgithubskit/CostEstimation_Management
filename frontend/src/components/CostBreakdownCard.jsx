import React from 'react';
import { Card, Table } from 'antd';

const CostBreakdownCard = ({ operations, totalCost, style }) => {
  const costColumns = [
    {
      title: 'Op No',
      dataIndex: 'oprn_no',
      key: 'oprn_no',
      align: 'center',
      width: 100,
      fixed: 'left',
      render: (text) => text || '-'
    },
    {
      title: 'Wc/Plant',
      dataIndex: 'wc',
      key: 'wc',
      align: 'center',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
      align: 'center',
      width: 200,
      render: (text) => text || '-'
    },
    {
      title: 'Machine Model',
      dataIndex: 'selected_machine',
      key: 'selected_machine',
      align: 'center',
      width: 180,
      render: (text) => text || '-'
    },
    {
      title: 'Allowed Time (Hrs)',
      dataIndex: 'allowed_time_hrs',
      key: 'allowed_time_hrs',
      align: 'center',
      width: 150,
      render: (text) => (text !== undefined && text !== null) ? parseFloat(text).toFixed(2) : '-'
    },
    {
      title: 'Cost (₹)',
      dataIndex: 'calculated_cost',
      key: 'calculated_cost',
      align: 'center',
      width: 150,
      fixed: 'right',
      render: (cost) => cost ? `₹${cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
    }
  ];

  return (
    <Card style={{ borderRadius: 8, ...style }}>
      <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: 16, marginTop: 0 }}>
        Cost Breakdown
      </h3>
      
      <Table
        columns={costColumns}
        dataSource={operations}
        rowKey="id"
        pagination={{
          pageSize: 6,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} operations`
        }}
        scroll={{ x: 800 }}
        components={{
          header: {
            cell: (props) => (
              <th {...props} style={{ ...props.style, backgroundColor: '#e6f7ff' }} />
            ),
          },
        }}
      />

      {/* Total Cost Section */}
      <div style={{ 
        marginTop: 24, 
        padding: 20, 
        backgroundColor: '#e6f7ff',
        borderRadius: 8,
        border: '1px solid #91d5ff',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#000' }}>
          Operational Cost
        </h3>
        <p style={{ 
          margin: '8px 0 0', 
          fontSize: '32px', 
          fontWeight: 'bold',
          color: '#1890ff' 
        }}>
          ₹{totalCost?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </p>
      </div>
    </Card>
  );
};

export default CostBreakdownCard;