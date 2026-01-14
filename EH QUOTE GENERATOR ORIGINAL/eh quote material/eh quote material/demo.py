#!/usr/bin/env python3
"""
Quote Generation Demo
Demonstrates the quote generation system with sample files
"""

import os
import sys
from quote_generator import QuoteGenerator, QuoteData
from datetime import datetime

def demo_xml_parsing():
    """Demo XML file parsing"""
    print("=" * 60)
    print("DEMO: XML File Parsing")
    print("=" * 60)
    
    generator = QuoteGenerator()
    
    try:
        # Parse XML file
        print("Parsing XML file: ehOnline-Shop_20250905-160419.xml")
        data = generator.parse_file("ehOnline-Shop_20250905-160419.xml")
        
        # Display parsed data
        print(f"\nParsed Data:")
        print(f"Quote Number: {data.quote_number}")
        print(f"Quote Date: {data.quote_date}")
        print(f"Customer Reference: {data.customer_reference}")
        print(f"Customer Number: {data.customer_number}")
        print(f"Customer Company: {data.customer_company}")
        print(f"Customer Contact: {data.customer_contact}")
        print(f"Customer Phone: {data.customer_phone}")
        print(f"Customer Email: {data.customer_email}")
        print(f"Subtotal: ${data.subtotal:,.2f}")
        print(f"Tax: ${data.tax:,.2f}")
        print(f"Total: ${data.total:,.2f}")
        
        print(f"\nLine Items ({len(data.line_items)}):")
        for i, item in enumerate(data.line_items, 1):
            print(f"  {i}. {item.get('description', 'N/A')}")
            print(f"     Qty: {item.get('quantity', 0)} {item.get('unit', 'EA')}")
            print(f"     Unit Price: ${item.get('unit_price', 0):,.2f}")
            print(f"     Total: ${item.get('total_price', 0):,.2f}")
            print()
        
        # Generate quote
        print("Generating Excel quote...")
        output_path = generator.generate_quote(data)
        print(f"Quote generated: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return False

def demo_rtf_parsing():
    """Demo RTF file parsing"""
    print("=" * 60)
    print("DEMO: RTF File Parsing")
    print("=" * 60)
    
    generator = QuoteGenerator()
    
    try:
        # Parse RTF file
        print("Parsing RTF file: ehOnline-Shop_2061348427.rtf")
        data = generator.parse_file("ehOnline-Shop_2061348427.rtf")
        
        # Display parsed data
        print(f"\nParsed Data:")
        print(f"Quote Number: {data.quote_number}")
        print(f"Quote Date: {data.quote_date}")
        print(f"Customer Reference: {data.customer_reference}")
        print(f"Customer Number: {data.customer_number}")
        print(f"Subtotal: ${data.subtotal:,.2f}")
        print(f"Tax: ${data.tax:,.2f}")
        print(f"Total: ${data.total:,.2f}")
        
        # Generate quote
        print("\nGenerating Excel quote...")
        output_path = generator.generate_quote(data, output_path="rtf_quote.xlsx")
        print(f"Quote generated: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"Error parsing RTF: {e}")
        return False

def demo_excel_parsing():
    """Demo Excel file parsing"""
    print("=" * 60)
    print("DEMO: Excel File Parsing")
    print("=" * 60)
    
    generator = QuoteGenerator()
    
    try:
        # Parse Excel file
        print("Parsing Excel file: ehOnline-Shop_2061348427.xlsx")
        data = generator.parse_file("ehOnline-Shop_2061348427.xlsx")
        
        # Display parsed data
        print(f"\nParsed Data:")
        print(f"Quote Number: {data.quote_number}")
        print(f"Quote Date: {data.quote_date}")
        print(f"Customer Company: {data.customer_company}")
        print(f"Subtotal: ${data.subtotal:,.2f}")
        print(f"Tax: ${data.tax:,.2f}")
        print(f"Total: ${data.total:,.2f}")
        
        print(f"\nLine Items ({len(data.line_items)}):")
        for i, item in enumerate(data.line_items, 1):
            print(f"  {i}. {item.get('description', 'N/A')}")
            print(f"     Unit Price: ${item.get('unit_price', 0):,.2f}")
            print(f"     Total: ${item.get('total_price', 0):,.2f}")
        
        # Generate quote
        print("\nGenerating Excel quote...")
        output_path = generator.generate_quote(data, output_path="excel_quote.xlsx")
        print(f"Quote generated: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"Error parsing Excel: {e}")
        return False

def demo_custom_quote():
    """Demo creating a custom quote from scratch"""
    print("=" * 60)
    print("DEMO: Custom Quote Creation")
    print("=" * 60)
    
    # Create custom quote data
    data = QuoteData()
    data.quote_number = "KM-2025-001"
    data.quote_date = datetime.now().strftime("%m/%d/%Y")
    data.customer_reference = "CUSTOM_DEMO"
    data.customer_number = "CUST001"
    data.customer_company = "Demo Customer Inc."
    data.customer_contact = "John Smith"
    data.customer_phone = "(555) 123-4567"
    data.customer_email = "john.smith@democustomer.com"
    data.customer_address = "123 Demo Street\nDemo City, DC 12345"
    
    # Add custom line items
    data.line_items = [
        {
            'item_number': '1',
            'quantity': 2,
            'unit': 'EA',
            'description': 'Industrial Pressure Transmitter\nModel: PT-1000\nRange: 0-1000 PSI',
            'unit_price': 1250.00,
            'total_price': 2500.00
        },
        {
            'item_number': '2',
            'quantity': 1,
            'unit': 'EA',
            'description': 'Temperature Sensor\nModel: TS-200\nRange: -40°C to 150°C',
            'unit_price': 450.00,
            'total_price': 450.00
        },
        {
            'item_number': '3',
            'quantity': 5,
            'unit': 'EA',
            'description': 'Cable Assembly\nModel: CA-500\nLength: 10 meters',
            'unit_price': 75.00,
            'total_price': 375.00
        }
    ]
    
    data.subtotal = sum(item['total_price'] for item in data.line_items)
    data.tax = data.subtotal * 0.05
    data.freight = 50.00
    data.total = data.subtotal + data.tax + data.freight
    data.payment_terms = "Net 30 Days"
    data.delivery_terms = "FOB Origin"
    from datetime import timedelta
    data.valid_until = (datetime.now() + timedelta(days=30)).strftime("%m/%d/%Y")
    
    # Display custom data
    print(f"\nCustom Quote Data:")
    print(f"Quote Number: {data.quote_number}")
    print(f"Quote Date: {data.quote_date}")
    print(f"Customer: {data.customer_company}")
    print(f"Contact: {data.customer_contact}")
    print(f"Subtotal: ${data.subtotal:,.2f}")
    print(f"Tax: ${data.tax:,.2f}")
    print(f"Freight: ${data.freight:,.2f}")
    print(f"Total: ${data.total:,.2f}")
    
    # Generate quote
    generator = QuoteGenerator()
    print("\nGenerating custom quote...")
    output_path = generator.generate_quote(data, output_path="custom_quote.xlsx")
    print(f"Custom quote generated: {output_path}")
    
    return True

def show_file_mapping_guide():
    """Show field mapping guide for different file types"""
    print("=" * 60)
    print("FIELD MAPPING GUIDE")
    print("=" * 60)
    
    print("\nXML File Mapping (EH Online Shop format):")
    print("  Quote Number: bas:docNumber/c:docNo")
    print("  Quote Date: bas:docNumber/c:date")
    print("  Customer Ref: bas:custReference")
    print("  Customer Number: bas:customer/bas:number")
    print("  Customer Name: bas:customer/bas:name")
    print("  Contact: bas:customer/bas:contact/c:firstname + c:lastname")
    print("  Phone: bas:customer/bas:contact/c:connectivity/c:phone[@type='phone']")
    print("  Email: bas:customer/bas:contact/c:connectivity/c:email[@type='email']")
    print("  Address: bas:customer/bas:address[@type='BILL_TO']")
    print("  Line Items: bas:item elements")
    print("  Pricing: bas:itemPricing elements")
    
    print("\nRTF File Mapping:")
    print("  Uses pattern matching to extract text between labels")
    print("  Quote Number: After 'Quote no.:'")
    print("  Quote Date: After 'Quote date:'")
    print("  Customer Ref: After 'Your reference:'")
    print("  Customer Number: After 'Customer no.:'")
    print("  Line Items: Table parsing (simplified)")
    
    print("\nExcel File Mapping:")
    print("  Reads first few rows for basic information")
    print("  Converts each row to a line item")
    print("  Column 1: Description")
    print("  Column 2: Unit Price")
    print("  Other columns: Additional data")
    
    print("\nTo customize field mapping, modify the parser classes in quote_generator.py")

def main():
    """Main demo function"""
    print("QUOTE GENERATION SYSTEM DEMO")
    print("=" * 60)
    
    # Check if template exists
    if not os.path.exists("quote_template_simple.xlsx"):
        print("Error: quote_template_simple.xlsx not found!")
        print("Please run create_simple_template.py first.")
        return
    
    # Run demos
    demos = [
        ("XML Parsing", demo_xml_parsing),
        ("RTF Parsing", demo_rtf_parsing),
        ("Excel Parsing", demo_excel_parsing),
        ("Custom Quote", demo_custom_quote)
    ]
    
    results = []
    for name, demo_func in demos:
        try:
            print(f"\nRunning {name} demo...")
            success = demo_func()
            results.append((name, success))
        except Exception as e:
            print(f"Demo {name} failed: {e}")
            results.append((name, False))
    
    # Show results
    print("\n" + "=" * 60)
    print("DEMO RESULTS")
    print("=" * 60)
    
    for name, success in results:
        status = "✓ SUCCESS" if success else "✗ FAILED"
        print(f"{name}: {status}")
    
    # Show field mapping guide
    show_file_mapping_guide()
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("Check the generated Excel files for the quotes!")
    print("To customize field mapping, edit the parser classes in quote_generator.py")

if __name__ == "__main__":
    main()
