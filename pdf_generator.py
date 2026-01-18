import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

class PDFGenerator:
    def __init__(self, output_dir='outputs/pdf'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Register fonts
        try:
            pdfmetrics.registerFont(TTFont('Arial', 'arial.ttf'))
            pdfmetrics.registerFont(TTFont('Arial-Bold', 'arialbd.ttf'))
        except:
            # Fallback to default fonts
            pass
    
    def generate_proposal_pdf(self, proposal_data):
        """Generate PDF for proposal"""
        proposal = proposal_data['proposal']
        evaluation = proposal_data['evaluation']
        approval = proposal_data['approval']
        implementation = proposal_data['implementation']
        
        # Create filename
        filename = f"Usulan_Perubahan_{proposal['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Add title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            alignment=1,  # Center
            spaceAfter=12
        )
        story.append(Paragraph("FORMULIR USULAN PERUBAHAN", title_style))
        story.append(Spacer(1, 12))
        
        # Section 1: Data Usulan
        story.append(self._create_section_title("A. DATA USULAN"))
        story.append(self._create_proposal_table(proposal))
        
        # Section 2: Evaluasi Dampak
        if evaluation:
            story.append(Spacer(1, 12))
            story.append(self._create_section_title("B. EVALUASI DAMPAK PERUBAHAN"))
            story.append(self._create_evaluation_table(evaluation))
        
        # Section 3: Persetujuan
        if approval:
            story.append(Spacer(1, 12))
            story.append(self._create_section_title("C. PERSETUJUAN PERUBAHAN"))
            story.append(self._create_approval_table(approval))
        
        # Section 4: Implementasi
        if implementation:
            story.append(Spacer(1, 12))
            story.append(self._create_section_title("D. IMPLEMENTASI PERUBAHAN"))
            story.append(self._create_implementation_table(implementation))
        
        # Build PDF
        doc.build(story)
        return filepath
    
    def _create_section_title(self, title):
        styles = getSampleStyleSheet()
        style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=6
        )
        return Paragraph(title, style)
    
    def _create_proposal_table(self, proposal):
        data = [
            ["No. Dokumen", proposal.get('nomor_dokumen', '-')],
            ["Revisi", proposal.get('revisi', '00')],
            ["Tgl. Efektif", self._format_date(proposal.get('tgl_efektif'))],
            ["No. Usulan", proposal['id']],
            ["Tanggal", self._format_date(proposal['tanggal'])],
            ["Diminta Oleh", proposal['diminta_oleh']],
            ["Jabatan", proposal['jabatan']],
            ["Deskripsi Perubahan", proposal['deskripsi_perubahan']],
            ["Hasil Perubahan Dibutuhkan", self._format_date(proposal.get('hasil_dibutuhkan_tgl'))],
            ["Alasan Perubahan", proposal.get('alasan_perubahan', '-')],
        ]
        
        table = Table(data, colWidths=[80*mm, 100*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#495057')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return table
    
    def _create_evaluation_table(self, evaluation):
        data = []
        
        # Tipe Perubahan
        tipe_perubahan = evaluation.get('tipe_perubahan', '')
        if isinstance(tipe_perubahan, str):
            try:
                import json
                tipe_list = json.loads(tipe_perubahan)
                tipe_perubahan = ', '.join(tipe_list)
            except:
                pass
        
        data.append(["Tipe Perubahan", tipe_perubahan])
        data.append(["Prioritas", evaluation.get('prioritas', '-')])
        data.append(["Dampak Lingkungan Produksi", evaluation.get('dampak_lingkungan', '-')])
        data.append(["Upaya/Tindakan yang Diperlukan", evaluation.get('upaya_dibutuhkan', '-')])
        data.append(["Kebutuhan Sumber Daya", evaluation.get('sumber_daya', '-')])
        data.append(["Rencana Pengujian", evaluation.get('rencana_pengujian', '-')])
        data.append(["Catatan Evaluasi", evaluation.get('catatan_evaluasi', '-')])
        
        table = Table(data, colWidths=[80*mm, 100*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#495057')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return table
    
    def _create_approval_table(self, approval):
        data = [
            ["Status Permintaan", approval.get('status', '-')],
            ["Tanggal Pelaksanaan", self._format_date(approval.get('tanggal_pelaksanaan'))],
            ["PIC Pelaksana", approval.get('pic_pelaksana', '-')],
            ["Catatan Persetujuan", approval.get('catatan_persetujuan', '-')],
            ["Tanggal Persetujuan", self._format_date(approval.get('approved_at'))],
        ]
        
        table = Table(data, colWidths=[80*mm, 100*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#495057')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return table
    
    def _create_implementation_table(self, implementation):
        data = [
            ["Hasil Tahapan Perubahan", implementation.get('hasil_tahapan_perubahan', '-')],
            ["Hasil Pengujian Implementasi", implementation.get('hasil_pengujian', '-')],
            ["Tanggal Rilis Operasional", self._format_date(implementation.get('tanggal_rilis'))],
            ["Catatan Implementasi", implementation.get('catatan_implementasi', '-')],
            ["Tanggal Implementasi", self._format_date(implementation.get('implemented_at'))],
        ]
        
        table = Table(data, colWidths=[80*mm, 100*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#495057')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return table
    
    def _format_date(self, date_str):
        if not date_str:
            return '-'
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            return date_obj.strftime('%d %B %Y')
        except:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                return date_obj.strftime('%d %B %Y')
            except:
                return str(date_str)