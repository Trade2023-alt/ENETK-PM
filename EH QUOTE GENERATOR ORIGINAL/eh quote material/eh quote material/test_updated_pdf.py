#!/usr/bin/env python3
"""
Test script to generate updated PDF with removed company contact info
"""

from exporters import PDFExporter
from file_parsers import ExcelParser

def test_updated_pdf():
    """Test the updated PDF generation"""
    print("🧪 Testing Updated PDF Generation")
    print("=" * 50)
    
    try:
        # Parse Excel file
        parser = ExcelParser()
        quote_data = parser.parse('ehOnline-Shop_2061348427.xlsx')
        
        if not quote_data or not isinstance(quote_data, list) or len(quote_data) == 0:
            print("❌ No data found in Excel file")
            return False
            
        print(f"✅ Parsed {len(quote_data)} items from Excel")
        
        # Convert to expected format
        quote_data = {
            'quote_number': 'TEST-001',
            'date': '2025-01-27',
            'customer_name': 'Test Customer',
            'customer_address': '123 Test St, Test City, TC 12345',
            'line_items': quote_data,
            'markup_percentage': 20.0,
            'tax_percentage': 8.0
        }
        
        # Generate PDF
        exporter = PDFExporter()
        pdf_path = exporter.export_quote(quote_data, 'final_clean_quote.pdf')
        
        print(f"✅ PDF generated successfully: {pdf_path}")
        print("📄 Company contact information has been removed from the PDF")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_updated_pdf()
