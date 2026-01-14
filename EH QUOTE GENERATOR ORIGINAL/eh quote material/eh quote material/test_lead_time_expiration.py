#!/usr/bin/env python3
"""
Test script for lead time and quote expiration features
"""

from quote_generator import QuoteGenerator, QuoteData
from datetime import datetime

def test_lead_time_expiration():
    """Test the new lead time and expiration features"""
    print("🧪 Testing Lead Time and Quote Expiration Features")
    print("=" * 60)
    
    # Create a test quote
    data = QuoteData()
    data.quote_number = "TEST-2025-001"
    data.quote_date = "01/15/2025"
    data.customer_company = "Test Company Inc."
    data.customer_contact = "John Doe"
    data.customer_phone = "(555) 123-4567"
    data.customer_email = "john@testcompany.com"
    
    # Set lead time and expiration
    data.lead_time_value = 14
    data.lead_time_unit = "Days"
    data.quote_expiration_days = 30
    
    # Add some test line items
    data.line_items = [
        {
            'item_number': '1',
            'quantity': 2,
            'unit': 'EA',
            'description': 'Test Product A',
            'unit_price': 1000.00,
            'total_price': 2000.00
        },
        {
            'item_number': '2',
            'quantity': 1,
            'unit': 'EA',
            'description': 'Test Product B',
            'unit_price': 500.00,
            'total_price': 500.00
        }
    ]
    
    data.subtotal = 2500.00
    data.tax = 125.00
    data.total = 2625.00
    
    # Test expiration date calculation
    print("📅 Testing expiration date calculation...")
    data.calculate_expiration_date()
    print(f"   Quote Date: {data.quote_date}")
    print(f"   Expiration Days: {data.quote_expiration_days}")
    print(f"   Calculated Expiration: {data.quote_expiration_date}")
    
    # Test lead time display
    print(f"\n⏱️  Testing lead time display...")
    print(f"   Lead Time: {data.get_lead_time_display()}")
    
    # Generate quote
    print(f"\n📄 Generating test quote...")
    generator = QuoteGenerator()
    output_path = generator.generate_quote(data, output_path="test_lead_time_quote.xlsx")
    print(f"   Quote saved to: {output_path}")
    
    print(f"\n✅ Test completed successfully!")
    print(f"   - Lead time: {data.get_lead_time_display()}")
    print(f"   - Quote valid until: {data.quote_expiration_date}")
    print(f"   - Check the generated Excel file to see the new fields in action!")

if __name__ == "__main__":
    test_lead_time_expiration()
