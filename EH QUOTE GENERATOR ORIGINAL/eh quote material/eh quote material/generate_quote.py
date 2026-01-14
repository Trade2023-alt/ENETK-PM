#!/usr/bin/env python3
"""
Interactive Quote Generator
Simple script to generate quotes from files or custom data
"""

import os
from quote_generator import QuoteGenerator, QuoteData
from datetime import datetime

def generate_from_file():
    """Generate quote from an existing file"""
    generator = QuoteGenerator()
    
    print("\n=== Generate Quote from File ===")
    print("Supported formats: .xml, .rtf, .xlsx, .xls")
    
    # List available files
    files = [f for f in os.listdir('.') if f.endswith(('.xml', '.rtf', '.xlsx', '.xls'))]
    
    if not files:
        print("No supported files found in current directory.")
        return
    
    print("\nAvailable files:")
    for i, file in enumerate(files, 1):
        print(f"{i}. {file}")
    
    try:
        choice = int(input("\nEnter file number: ")) - 1
        if 0 <= choice < len(files):
            file_path = files[choice]
            print(f"\nProcessing {file_path}...")
            
            data = generator.parse_file(file_path)
            print(f"Parsed data:")
            print(f"  Quote Number: {data.quote_number}")
            print(f"  Customer: {data.customer_company}")
            print(f"  Total: ${data.total:,.2f}")
            
            # Generate quote
            output_path = generator.generate_quote(data)
            print(f"\nQuote generated: {output_path}")
            print("Open the file in Excel to view your quote!")
            
        else:
            print("Invalid choice.")
    except (ValueError, IndexError):
        print("Invalid input.")

def generate_custom_quote():
    """Generate a custom quote from user input"""
    print("\n=== Generate Custom Quote ===")
    
    data = QuoteData()
    
    # Get basic info
    data.quote_number = input("Quote Number: ") or f"KM-{datetime.now().strftime('%Y%m%d')}-001"
    data.quote_date = input("Quote Date (MM/DD/YYYY): ") or datetime.now().strftime("%m/%d/%Y")
    data.customer_company = input("Customer Company: ") or "Customer Company"
    data.customer_contact = input("Contact Person: ") or "Contact Person"
    data.customer_phone = input("Phone: ") or "(555) 123-4567"
    data.customer_email = input("Email: ") or "contact@customer.com"
    
    # Get line items
    print("\nEnter line items (press Enter with empty description to finish):")
    data.line_items = []
    item_num = 1
    
    while True:
        print(f"\nItem {item_num}:")
        description = input("Description: ")
        if not description:
            break
            
        try:
            quantity = int(input("Quantity: ") or "1")
            unit = input("Unit (EA, PC, etc.): ") or "EA"
            unit_price = float(input("Unit Price: $") or "0")
            total_price = quantity * unit_price
            
            data.line_items.append({
                'item_number': str(item_num),
                'quantity': quantity,
                'unit': unit,
                'description': description,
                'unit_price': unit_price,
                'total_price': total_price
            })
            
            print(f"Added: {description} - ${total_price:,.2f}")
            item_num += 1
            
        except ValueError:
            print("Invalid number. Please try again.")
    
    if not data.line_items:
        print("No items added. Exiting.")
        return
    
    # Calculate totals
    data.subtotal = sum(item['total_price'] for item in data.line_items)
    tax_rate = float(input(f"\nTax Rate (default 5%): ") or "5") / 100
    data.tax = data.subtotal * tax_rate
    data.freight = float(input("Freight (default $0): $") or "0")
    data.total = data.subtotal + data.tax + data.freight
    
    print(f"\nQuote Summary:")
    print(f"  Subtotal: ${data.subtotal:,.2f}")
    print(f"  Tax: ${data.tax:,.2f}")
    print(f"  Freight: ${data.freight:,.2f}")
    print(f"  Total: ${data.total:,.2f}")
    
    # Generate quote
    generator = QuoteGenerator()
    output_path = generator.generate_quote(data)
    print(f"\nCustom quote generated: {output_path}")
    print("Open the file in Excel to view your quote!")

def main():
    """Main menu"""
    print("=" * 50)
    print("QUOTE GENERATOR")
    print("=" * 50)
    
    while True:
        print("\nChoose an option:")
        print("1. Generate quote from existing file")
        print("2. Create custom quote")
        print("3. Exit")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == "1":
            generate_from_file()
        elif choice == "2":
            generate_custom_quote()
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
