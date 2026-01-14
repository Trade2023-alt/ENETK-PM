#!/usr/bin/env python3
"""
Test script to verify the improved Excel export functionality
"""

from exporters import ExcelExporter
from file_parsers import ExcelParser

def test_export():
    """Test the Excel export with improvements"""
    print("🧪 Testing Improved Excel Export...")
    print("=" * 50)
    
    try:
        # Parse the Excel file
        parser = ExcelParser()
        items = parser.parse('ehOnline-Shop_2061348427.xlsx')
        
        print(f"✅ Parsed {len(items)} items from Excel file")
        
        # Create sample quote data
        quote_data = {
            'quote_number': 'Q-20250105-001',
            'quote_date': '2025-01-05',
            'project_name': 'Kinder Morgan Radar Upgrade',
            'customer_company': 'Kinder Morgan',
            'contact_person': 'Mr. Kyle Merrill',
            'phone': '(713) 555-0123',
            'email': 'kyle.merrill@kindermorgan.com',
            'customer_ref': 'KM RADAR REQUEST',
            'bill_to': 'Kinder Morgan\n1234 Energy Drive\nHouston, TX 77002',
            'ship_to': 'Kinder Morgan\n1234 Energy Drive\nHouston, TX 77002',
            'payment_terms': 'Net 30 Days',
            'delivery_terms': 'FOB Origin',
            'markup_percentage': 20.0,
            'tax_percentage': 8.0,
            'line_items': items
        }
        
        # Export to Excel
        exporter = ExcelExporter()
        output_path = exporter.export_quote(quote_data, 'test_quote_improved.xlsx')
        
        print(f"✅ Excel quote generated successfully!")
        print(f"📁 Saved as: {output_path}")
        print("\n🎯 Improvements included:")
        print("   - ENETK LLC branding with proper colors")
        print("   - Full order codes with text wrapping")
        print("   - Comprehensive terms and conditions")
        print("   - Better text formatting and layout")
        print("   - Part number breakdowns in descriptions")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_export()
