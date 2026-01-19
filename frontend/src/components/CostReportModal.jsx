import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { projectService } from '../services/api';

const CostReportModal = ({
  open,
  onClose,
  data
}) => {
  const {
    projectId,
    project,
    operations,
    miscCosts,
    totalCost,
    totalMiscCost,
    grandTotal,
    has3D,
    previewImage
  } = data || {};

  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (open) {
      loadImage();
    }
  }, [open, previewImage, has3D, projectId]);

  const loadImage = async () => {
    if (!has3D) {
      setImageUrl(null);
      return;
    }

    setLoading(true);
    try {
      // Try to use captured image first
      if (previewImage) {
        setImageUrl(previewImage);
      } else {
        // Fallback to preview URL
        const url = projectService.getFileUrl(projectId, '3d-preview');
        setImageUrl(url);
      }
    } catch (error) {
      console.error('Error loading image:', error);
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const createdAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const sanitizeFilename = (name) => {
    return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  };

  const handlePrint = () => {
    const safeProjectName = sanitizeFilename(project?.project_name || 'Project');
    
    const printStyles = `
      <style>
        @page { 
          size: A4; 
          margin: 20mm; 
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body { 
          font-family: Arial, sans-serif; 
          color: #000; 
          margin: 0;
          padding: 20px;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #000;
        }
        .title { 
          font-size: 18px; 
          font-weight: bold; 
          text-align: left;
        }
        .sub { 
          font-size: 12px; 
          color: #666; 
          text-align: right;
        }
        
        .image-container { 
          text-align: center; 
          margin-bottom: 24px; 
          page-break-inside: avoid;
        }
        .image-box { 
          display: inline-block; 
          border: 4px solid #bfbfbf; 
          padding: 10px; 
          background-color: #fff; 
        }
        .preview-image { 
          max-width: 100%; 
          max-height: 300px; 
          display: block; 
        }
        .image-label { 
          font-size: 14px; 
          color: #000; 
          margin-top: 8px; 
          font-family: 'Times New Roman', serif; 
        }

        .table-container { 
          margin-bottom: 24px; 
          page-break-inside: avoid;
        }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 13px; 
        }
        .table th, .table td { 
          border: 1px solid #000; 
          padding: 8px; 
        }
        .table th { 
          background-color: #dce6f1 !important; 
          text-align: center; 
          font-weight: bold; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .table td { 
          text-align: center; 
        }
        .header-cell { 
          background-color: #dce6f1 !important; 
          border: 1px solid #000; 
          padding: 8px; 
          text-align: center; 
          font-weight: bold;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .header-left { 
          text-align: left !important; 
        }
        .label-cell { 
          background-color: #dce6f1 !important; 
          border: 1px solid #000; 
          padding: 8px; 
          font-weight: bold; 
          text-align: left; 
          width: 20%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .value-cell { 
          border: 1px solid #000; 
          padding: 8px; 
          text-align: left; 
          width: 30%;
        }
        .right { 
          text-align: right !important; 
        }
        .total-row { 
          font-weight: bold; 
        }
        
        .total-banner { 
          margin-top: 24px; 
          padding: 16px; 
          border: 2px solid #000; 
          border-radius: 4px; 
          text-align: center; 
          background-color: #fff;
          page-break-inside: avoid;
        }
        .total-value { 
          font-size: 28px; 
          font-weight: bold; 
          color: #1890ff; 
          margin: 8px 0; 
        }
        .kpi { 
          display: flex; 
          gap: 24px; 
          justify-content: center; 
          margin-top: 12px; 
        }
        
        @media print {
          @page { 
            margin: 15mm; 
          }
          body { 
            padding: 0; 
          }
          .table-container {
            page-break-inside: avoid;
          }
        }
      </style>
    `;

    const operationsRows = (operations || []).map(op => `
      <tr>
        <td>${op.oprn_no ?? '-'}</td>
        <td>${op.wc ?? '-'}</td>
        <td>${op.operation ?? '-'}</td>
        <td>${op.selected_machine ?? '-'}</td>
        <td>${op.allowed_time_hrs !== undefined && op.allowed_time_hrs !== null ? parseFloat(op.allowed_time_hrs).toFixed(2) : '-'}</td>
        <td>${op.calculated_cost ? formatCurrency(op.calculated_cost) : '-'}</td>
      </tr>
    `).join('');

    const miscRows = (miscCosts || []).map(m => `
      <tr>
        <td>${m.cost_type ?? '-'}</td>
        <td>${formatCurrency(m.cost_value ?? 0)}</td>
        <td>${m.description ?? '-'}</td>
      </tr>
    `).join('');

    const imageHtml = has3D && imageUrl ? `
      <div class="image-container">
        <div class="image-box">
          <img 
            src="${imageUrl}" 
            alt="3D Preview" 
            class="preview-image"
          />
        </div>
        <div class="image-label">3D Model View</div>
      </div>
    ` : '';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>cost_report</title>
          <meta charset="UTF-8">
          ${printStyles}
        </head>
        <body>
          <div class="header">
            <div class="title">Project: ${project?.project_name ?? '-'}</div>
            <div class="sub">Generated: ${createdAt}</div>
          </div>

          ${imageHtml}

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th colspan="4" class="header-cell header-left" style="font-size: 16px;">
                    Project Details
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-cell">Part Number</td>
                  <td class="value-cell">${project?.part_no ?? '-'}</td>
                  <td class="label-cell">Production Order</td>
                  <td class="value-cell">${project?.prod_order_no ?? '-'}</td>
                </tr>
                <tr>
                  <td class="label-cell">Plant</td>
                  <td class="value-cell">${project?.plant ?? '-'}</td>
                  <td class="label-cell">Total Operations</td>
                  <td class="value-cell">${project?.total_no_of_oprns ?? 0}</td>
                </tr>
                <tr>
                  <td class="label-cell">Sale Order</td>
                  <td class="value-cell">${project?.sale_order ?? '-'}</td>
                  <td class="label-cell">WBS</td>
                  <td class="value-cell">${project?.wbs ?? '-'}</td>
                </tr>
                <tr>
                  <td class="label-cell">Description</td>
                  <td class="value-cell" colspan="3">${project?.part_desc ?? '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th colspan="6" class="header-cell header-left" style="font-size: 16px;">
                    Operational Cost
                  </th>
                </tr>
                <tr>
                  <th class="header-cell">Op No</th>
                  <th class="header-cell">Wc/Plant</th>
                  <th class="header-cell">Operation</th>
                  <th class="header-cell">Machine Model</th>
                  <th class="header-cell">Allowed Time (Hrs)</th>
                  <th class="header-cell">Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${operationsRows.length > 0 ? operationsRows : '<tr><td colspan="6">No operations found</td></tr>'}
                <tr class="total-row">
                  <td colspan="5" class="right">Subtotal</td>
                  <td>${formatCurrency(totalCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th colspan="3" class="header-cell header-left" style="font-size: 16px;">
                    Miscellaneous Cost
                  </th>
                </tr>
                <tr>
                  <th class="header-cell">Cost Type</th>
                  <th class="header-cell">Cost Value (₹)</th>
                  <th class="header-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                ${miscRows.length > 0 ? miscRows : '<tr><td colspan="3">No miscellaneous costs</td></tr>'}
                <tr class="total-row">
                  <td class="right">Total Miscellaneous Cost</td>
                  <td>${formatCurrency(totalMiscCost)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="total-banner">
            <div style="font-size: 16px;">Total Project Cost</div>
            <div class="total-value">${formatCurrency(grandTotal)}</div>
          </div>
        </body>
      </html>
    `;

    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();

    // Wait for content to load, especially images
    iframe.onload = () => {
      const images = iframe.contentWindow.document.images;
      let loadedImages = 0;
      const totalImages = images.length;

      const checkPrint = () => {
        loadedImages++;
        if (loadedImages >= totalImages || totalImages === 0) {
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
              
              // Clean up after print
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 1000);
            } catch (error) {
              console.error('Print error:', error);
              document.body.removeChild(iframe);
            }
          }, 500);
        }
      };

      if (totalImages === 0) {
        checkPrint();
      } else {
        Array.from(images).forEach(img => {
          if (img.complete) {
            checkPrint();
          } else {
            img.onload = checkPrint;
            img.onerror = checkPrint;
          }
        });
      }
    };
  };

  const styles = {
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '24px',
      fontSize: '14px',
      color: '#000'
    },
    th: {
      backgroundColor: '#dce6f1',
      border: '1px solid #000',
      padding: '8px',
      textAlign: 'center',
      fontWeight: 'bold',
      color: '#000'
    },
    td: {
      border: '1px solid #000',
      padding: '8px',
      textAlign: 'center'
    },
    labelCell: {
      backgroundColor: '#dce6f1',
      border: '1px solid #000',
      padding: '8px',
      fontWeight: 'bold',
      textAlign: 'left',
      width: '20%'
    },
    valueCell: {
      border: '1px solid #000',
      padding: '8px',
      textAlign: 'left',
      width: '30%'
    },
    totalRow: {
      fontWeight: 'bold',
      backgroundColor: '#fff'
    }
  };

  return (
    <Modal
      title={`Cost Report - ${project?.project_name || 'Project'}`}
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>,
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      styles={{ body: { padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' } }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : data ? (
        <div id="report-content" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Project: {project?.project_name || '-'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Generated: {createdAt}
            </div>
          </div>

          {/* 3D Preview Section */}
          {has3D && imageUrl && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-block', border: '4px solid #bfbfbf', padding: '10px', backgroundColor: '#fff' }}>
                <img 
                  src={imageUrl} 
                  alt="3D Model View" 
                  style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }} 
                  onError={(e) => { 
                    console.error('Image failed to load');
                    e.target.style.display = 'none'; 
                  }}
                />
              </div>
              <div style={{ fontSize: '14px', color: '#000', marginTop: 8, fontFamily: 'Times New Roman, serif' }}>
                3D Model View
              </div>
            </div>
          )}

          {/* Project Details Table */}
          <div style={{ marginBottom: 24 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th colSpan="4" style={{ ...styles.th, textAlign: 'left', fontSize: '16px' }}>
                    Project Details
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.labelCell}>Part Number</td>
                  <td style={styles.valueCell}>{project?.part_no || '-'}</td>
                  <td style={styles.labelCell}>Production Order</td>
                  <td style={styles.valueCell}>{project?.prod_order_no || '-'}</td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Plant</td>
                  <td style={styles.valueCell}>{project?.plant || '-'}</td>
                  <td style={styles.labelCell}>Total Operations</td>
                  <td style={styles.valueCell}>{project?.total_no_of_oprns || 0}</td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Sale Order</td>
                  <td style={styles.valueCell}>{project?.sale_order || '-'}</td>
                  <td style={styles.labelCell}>WBS</td>
                  <td style={styles.valueCell}>{project?.wbs || '-'}</td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Description</td>
                  <td style={styles.valueCell} colSpan="3">{project?.part_desc || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Operational Cost Table */}
          <div style={{ marginBottom: 24 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th colSpan="6" style={{ ...styles.th, textAlign: 'left', fontSize: '16px' }}>
                    Operational Cost
                  </th>
                </tr>
                <tr>
                  <th style={styles.th}>Op No</th>
                  <th style={styles.th}>Wc/Plant</th>
                  <th style={styles.th}>Operation</th>
                  <th style={styles.th}>Machine Model</th>
                  <th style={styles.th}>Allowed Time (Hrs)</th>
                  <th style={styles.th}>Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {operations && operations.length > 0 ? (
                  operations.map((op, index) => (
                    <tr key={index}>
                      <td style={styles.td}>{op.oprn_no ?? '-'}</td>
                      <td style={styles.td}>{op.wc ?? '-'}</td>
                      <td style={styles.td}>{op.operation ?? '-'}</td>
                      <td style={styles.td}>{op.selected_machine ?? '-'}</td>
                      <td style={styles.td}>
                        {op.allowed_time_hrs !== undefined && op.allowed_time_hrs !== null
                          ? parseFloat(op.allowed_time_hrs).toFixed(2)
                          : '-'}
                      </td>
                      <td style={styles.td}>
                        {op.calculated_cost ? formatCurrency(op.calculated_cost) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={styles.td}>No operations found</td>
                  </tr>
                )}
                <tr style={styles.totalRow}>
                  <td colSpan="5" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                    Subtotal
                  </td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>
                    {formatCurrency(totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Miscellaneous Cost Table */}
          <div style={{ marginBottom: 24 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th colSpan="3" style={{ ...styles.th, textAlign: 'left', fontSize: '16px' }}>
                    Miscellaneous Cost
                  </th>
                </tr>
                <tr>
                  <th style={styles.th}>Cost Type</th>
                  <th style={styles.th}>Cost Value (₹)</th>
                  <th style={styles.th}>Description</th>
                </tr>
              </thead>
              <tbody>
                {miscCosts && miscCosts.length > 0 ? (
                  miscCosts.map((item, index) => (
                    <tr key={index}>
                      <td style={styles.td}>{item.cost_type ?? '-'}</td>
                      <td style={styles.td}>{formatCurrency(item.cost_value)}</td>
                      <td style={styles.td}>{item.description ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={styles.td}>No miscellaneous costs</td>
                  </tr>
                )}
                <tr style={styles.totalRow}>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                    Total Miscellaneous Cost
                  </td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>
                    {formatCurrency(totalMiscCost)}
                  </td>
                  <td style={styles.td}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grand Total Section */}
          <div style={{ 
            marginTop: 24, 
            padding: 16, 
            border: '2px solid #000',
            borderRadius: 4, 
            textAlign: 'center',
            backgroundColor: '#fff'
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>Total Project Cost</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff', margin: '8px 0' }}>
              {formatCurrency(grandTotal)}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default CostReportModal;