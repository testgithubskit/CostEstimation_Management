import React from 'react';
import { Card, Row, Col, Input } from 'antd';

const ProjectDetailsCard = ({ project }) => {
  const labelStyle = {
    marginBottom: '8px',
    fontSize: '14px',
    color: '#000',
    fontWeight: '400'
  };

  return (
    <Card 
      style={{ marginBottom: 24, borderRadius: 8 }}
      bordered={true}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: 24, marginTop: 0 }}>
        Project Details
      </h3>
      <Row gutter={[24, 16]}>
        <Col xs={24} sm={12} md={8}>
          <div style={labelStyle}>Part Number</div>
          <Input 
            value={project.part_no || ''} 
            placeholder="Enter part number"
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={labelStyle}>Production Order No</div>
          <Input 
            value={project.prod_order_no || ''} 
            placeholder="Enter production order"
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={labelStyle}>WBS</div>
          <Input 
            value={project.wbs || 'N/A'} 
            placeholder="Enter WBS"
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={labelStyle}>Sale Order</div>
          <Input 
            value={project.sale_order || ''} 
            placeholder="Enter sale order"
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={labelStyle}>Plant</div>
          <Input 
            value={project.plant || ''} 
            placeholder="Enter plant"
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={labelStyle}>Total Operations</div>
          <Input 
            value={project.total_no_of_oprns || 0} 
            placeholder="Total operations"
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
        <Col xs={24}>
          <div style={labelStyle}>Part Description</div>
          <Input.TextArea 
            value={project.part_desc || ''} 
            placeholder="Enter part description"
            rows={2}
            readOnly
            style={{ backgroundColor: '#fafafa' }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default ProjectDetailsCard;