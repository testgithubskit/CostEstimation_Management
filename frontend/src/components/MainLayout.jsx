import React from 'react';
import { Layout, Typography, theme, Grid } from 'antd';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

const MainLayout = ({ children }) => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md is 768px in Ant Design
  const isTablet = !screens.lg; // lg is 992px in Ant Design

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#193cb8',
          padding: isMobile ? '0 16px' : '0 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          flexDirection: isMobile ? 'column' : 'row',
          height: isMobile ? 'auto' : '64px',
          minHeight: isMobile ? '80px' : '64px'
        }}
      >
        <div className="logo-container" style={{ 
          display: 'flex', 
          alignItems: 'center',
          marginBottom: isMobile ? '8px' : '0'
        }}>
          <img 
            src="/src/assets/cmti.webp" 
            alt="CMTI Logo" 
            className="logo-img"
            style={{ 
              height: isMobile ? '32px' : '40px', 
              filter: 'brightness(0) invert(1)' 
            }}
            onError={(e) => {
              e.target.onerror = null; 
              e.target.style.display = 'none';
              const textNode = document.createElement('span');
              textNode.innerText = 'CMTI';
              textNode.style.color = '#fff';
              textNode.style.fontWeight = 'bold';
              textNode.style.fontSize = isMobile ? '16px' : '18px';
              e.target.parentNode.appendChild(textNode);
            }}
          />
        </div>
        
        <Title 
          level={4} 
          style={{ 
            margin: 0, 
            color: '#fff',
            fontSize: isMobile ? '16px' : '18px',
            textAlign: isMobile ? 'center' : 'left'
          }}
        >
          {isMobile ? 'Cost Estimation' : 'Cost Estimation Software'}
        </Title>
      </Header>
      <Content className="layout-content" style={{ 
        background: '#f5f5f5', 
        padding: isMobile ? '16px' : '24px',
        marginTop: isMobile ? '80px' : '64px',
        marginBottom: isMobile ? '40px' : '64px',
        flex: 1,
        overflowY: 'auto'
      }}>
        <div
          style={{
            minHeight: 280,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </div>
      </Content>
      <Footer style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center', 
        background: '#193cb8', 
        color: '#fff',
        padding: isMobile ? '8px 16px' : '16px 24px',
        fontSize: isMobile ? '12px' : '14px',
        zIndex: 1000,
        height: isMobile ? '40px' : '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isMobile ? '©' : 'Cost Estimation Software ©'}{new Date().getFullYear()} CMTI
      </Footer>
    </Layout>
  );
};

export default MainLayout;
