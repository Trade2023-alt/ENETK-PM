#!/usr/bin/env python3
"""
Test script to verify Excel parsing works correctly
"""

from file_parsers import ExcelParser

def test_excel_parsing():
    """Test the Excel parsing functionality"""
    print("🧪 Testing Excel Parsing...")
    print("=" * 50)
    
    try:
        parser = ExcelParser()
        items = parser.parse('ehOnline-Shop_2061348427.xlsx')
        
        print(f"✅ Successfully parsed {len(items)} items")
        print("\n📋 Parsed Items:")
        print("-" * 50)
        
        for i, item in enumerate(items, 1):
            print(f"Item {i}:")
            print(f"  Description: {item['description']}")
            print(f"  Model: {item['model']}")
            print(f"  Order Code: {item['order_code']}")
            print(f"  Quantity: {item['quantity']}")
            print(f"  Unit: {item['unit']}")
            print(f"  Unit Price: ${item['unit_price']:.2f}")
            print(f"  Config: {item['config'][:50]}..." if item['config'] else "  Config: None")
            print()
        
        # Verify we got the right data
        if len(items) == 2:
            print("✅ Correct number of items parsed!")
        else:
            print(f"❌ Expected 2 items, got {len(items)}")
        
        # Check if prices are correct
        expected_prices = [4050.83, 3850.50]  # Approximate expected prices
        for i, item in enumerate(items):
            if abs(item['unit_price'] - expected_prices[i]) < 100:  # Within $100
                print(f"✅ Item {i+1} price looks correct: ${item['unit_price']:.2f}")
            else:
                print(f"❌ Item {i+1} price seems wrong: ${item['unit_price']:.2f} (expected ~${expected_prices[i]})")
        
    except Exception as e:
        print(f"❌ Error parsing Excel file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_excel_parsing()
