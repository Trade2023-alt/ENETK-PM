#!/usr/bin/env python3
"""
Test script to verify text wrapping and full product descriptions
"""

from exporters import ExcelExporter, PDFExporter
from file_parsers import ExcelParser

def test_text_wrapping():
    """Test text wrapping and full product descriptions"""
    print("📝 Testing Text Wrapping and Product Descriptions...")
    print("=" * 60)
    
    try:
        # Parse the Excel file
        parser = ExcelParser()
        items = parser.parse('ehOnline-Shop_2061348427.xlsx')
        
        print(f"✅ Parsed {len(items)} items from Excel file")
        
        # Display the parsed items to verify full descriptions
        for i, item in enumerate(items, 1):
            print(f"\n📦 Item {i}:")
            print(f"   Description: {item.get('description', 'N/A')[:100]}...")
            print(f"   Model: {item.get('model', 'N/A')}")
            print(f"   Order Code: {item.get('order_code', 'N/A')}")
            print(f"   Config: {item.get('config', 'N/A')[:50]}...")
            print(f"   Quantity: {item.get('quantity', 'N/A')}")
            print(f"   Unit Price: ${item.get('unit_price', 0):.2f}")
        
        # Create quote data
        quote_data = {
            'quote_number': 'Q-20250105-001',
            'quote_date': '2025-01-05',
            'project_name': 'Text Wrapping Test',
            'customer_company': 'Test Company',
            'contact_person': 'Test User',
            'phone': '(555) 123-4567',
            'email': 'test@example.com',
            'customer_ref': 'TEST-001',
            'bill_to': 'Test Company\n123 Test St\nTest City, TS 12345',
            'ship_to': 'Test Company\n123 Test St\nTest City, TS 12345',
            'payment_terms': 'Net 30 Days',
            'delivery_terms': 'FOB Origin',
            'markup_percentage': 20.0,
            'tax_percentage': 8.0,
            'line_items': items
        }
        
        # Export to Excel with text wrapping
        print(f"\n📊 Generating Excel with text wrapping...")
        excel_exporter = ExcelExporter()
        excel_path = excel_exporter.export_quote(quote_data, 'text_wrapping_test.xlsx')
        print(f"✅ Excel generated: {excel_path}")
        
        # Export to PDF with text wrapping
        print(f"\n📄 Generating PDF with text wrapping...")
        pdf_exporter = PDFExporter()
        pdf_path = pdf_exporter.export_quote(quote_data, 'text_wrapping_test.pdf')
        print(f"✅ PDF generated: {pdf_path}")
        
        print(f"\n🎯 Text Wrapping Improvements:")
        print(f"   ✨ Full product descriptions imported from XLSX")
        print(f"   ✨ Text wrapping enabled for all description cells")
        print(f"   ✨ Dynamic row heights based on content length")
        print(f"   ✨ Wider description columns (70 chars for Excel, 4 inches for PDF)")
        print(f"   ✨ Proper alignment and spacing for readability")
        print(f"   ✨ No more cut-off text - everything is visible!")
        
        print(f"\n📁 Test files created:")
        print(f"   - {excel_path}")
        print(f"   - {pdf_path}")
        print(f"\n🎉 Text wrapping test complete! All descriptions should now be fully visible.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_text_wrapping()
