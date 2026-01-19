import React from 'react';
import { Layout, Typography, theme } from 'antd';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const MainLayout = ({ children }) => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#193cb8',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1,
        }}
      >
        <div className="logo-container">
          <img 
            src="/src/assets/cmti.webp" 
            alt="CMTI Logo" 
            className="logo-img"
            style={{ height: '40px', filter: 'brightness(0) invert(1)' }}
            onError={(e) => {
              e.target.onerror = null; 
              e.target.style.display = 'none';
              const textNode = document.createElement('span');
              textNode.innerText = 'CMTI';
              textNode.style.color = '#fff';
              textNode.style.fontWeight = 'bold';
              textNode.style.fontSize = '18px';
              e.target.parentNode.appendChild(textNode);
            }}
          />
        </div>
        
        <Title level={4} style={{ margin: 0, color: '#fff' }}>
          Cost Estimation Software
        </Title>
      </Header>
      <Content className="layout-content" style={{ background: '#f5f5f5', padding: '24px' }}>
        <div
          style={{
            minHeight: 280,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#193cb8', color: '#fff' }}>
        Cost Estimation Software ©{new Date().getFullYear()} CMTI
      </Footer>
    </Layout>
  );
};

export default MainLayout;
