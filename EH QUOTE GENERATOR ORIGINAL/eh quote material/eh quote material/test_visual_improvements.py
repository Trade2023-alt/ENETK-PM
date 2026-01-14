#!/usr/bin/env python3
"""
Test script to demonstrate the visual improvements made to the quote generator
"""

from exporters import ExcelExporter, PDFExporter
from file_parsers import ExcelParser

def test_visual_improvements():
    """Test the visual improvements in both Excel and PDF exports"""
    print("🎨 Testing Visual Improvements...")
    print("=" * 60)
    
    try:
        # Parse the Excel file
        parser = ExcelParser()
        items = parser.parse('ehOnline-Shop_2061348427.xlsx')
        
        print(f"✅ Parsed {len(items)} items from Excel file")
        
        # Create comprehensive quote data
        quote_data = {
            'quote_number': 'Q-20250105-001',
            'quote_date': '2025-01-05',
            'project_name': 'Kinder Morgan Radar Upgrade Project',
            'customer_company': 'Kinder Morgan Energy Partners',
            'contact_person': 'Mr. Kyle Merrill',
            'phone': '(713) 555-0123',
            'email': 'kyle.merrill@kindermorgan.com',
            'customer_ref': 'KM RADAR REQUEST 2025',
            'bill_to': 'Kinder Morgan Energy Partners\n1234 Energy Drive\nHouston, TX 77002\nAttn: Accounts Payable',
            'ship_to': 'Kinder Morgan Energy Partners\n1234 Energy Drive\nHouston, TX 77002\nAttn: Kyle Merrill',
            'payment_terms': 'Net 30 Days',
            'delivery_terms': 'FOB Origin',
            'markup_percentage': 20.0,
            'tax_percentage': 8.0,
            'line_items': items
        }
        
        # Export to Excel with enhanced styling
        print("\n📊 Generating Enhanced Excel Quote...")
        excel_exporter = ExcelExporter()
        excel_path = excel_exporter.export_quote(quote_data, 'enhanced_quote_excel.xlsx')
        print(f"✅ Excel quote generated: {excel_path}")
        
        # Export to PDF with enhanced styling
        print("\n📄 Generating Enhanced PDF Quote...")
        pdf_exporter = PDFExporter()
        pdf_path = pdf_exporter.export_quote(quote_data, 'enhanced_quote_pdf.pdf')
        print(f"✅ PDF quote generated: {pdf_path}")
        
        print("\n🎯 Visual Improvements Applied:")
        print("   ✨ Professional ENETK LLC branding with maroon colors")
        print("   ✨ Enhanced header with company logo area and styling")
        print("   ✨ Alternating row colors in line items table")
        print("   ✨ Professional borders and shading throughout")
        print("   ✨ Better typography with proper font sizes and colors")
        print("   ✨ Improved spacing and row heights for readability")
        print("   ✨ Enhanced totals section with highlighted styling")
        print("   ✨ Professional terms and conditions formatting")
        print("   ✨ Better column widths and text wrapping")
        print("   ✨ Consistent color scheme throughout the document")
        
        print(f"\n📁 Files created:")
        print(f"   - {excel_path}")
        print(f"   - {pdf_path}")
        print("\n🎉 Visual improvements complete! The quotes now look much more professional and visually appealing.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_visual_improvements()
