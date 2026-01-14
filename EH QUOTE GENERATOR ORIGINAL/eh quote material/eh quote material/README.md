# Quote Generation System

A comprehensive Python-based quote generation system that can parse multiple file formats (RTF, XML, XLSX) and generate professional Kinder Morgan-style Excel quotes.

## Features

- **Multi-format Support**: Parse RTF, XML, and XLSX files
- **Professional Templates**: Kinder Morgan-style Excel quote templates
- **Flexible Field Mapping**: Customizable field extraction for different file formats
- **Auto-calculation**: Automatic subtotal, tax, and total calculations
- **Export Options**: Generate Excel quotes with professional formatting

## File Structure

```
├── quote_generator.py      # Main quote generation system
├── create_template.py      # Excel template creation script
├── demo.py                # Demo script with examples
├── quote_template.xlsx    # Excel template file
├── README.md              # This file
└── requirements.txt       # Python dependencies
```

## Installation

1. Install Python 3.7 or higher
2. Install required packages:
   ```bash
   pip install openpyxl pandas xlrd reportlab
   ```

## Quick Start

1. **Create the Excel template**:
   ```bash
   python create_template.py
   ```

2. **Run the demo**:
   ```bash
   python demo.py
   ```

3. **Use in your code**:
   ```python
   from quote_generator import QuoteGenerator
   
   generator = QuoteGenerator()
   data = generator.parse_file("your_file.xml")  # or .rtf, .xlsx
   output_path = generator.generate_quote(data)
   ```

## Supported File Formats

### XML Files (EH Online Shop format)
- **Quote Information**: Quote number, date, customer reference
- **Customer Details**: Company name, contact person, phone, email, address
- **Line Items**: Product descriptions, quantities, prices
- **Pricing**: Subtotal, tax, total amounts

### RTF Files
- **Basic Information**: Quote number, date, customer reference
- **Line Items**: Simplified table parsing
- **Pricing**: Basic price extraction

### Excel Files
- **Flexible Parsing**: Reads any Excel file structure
- **Line Items**: Converts rows to quote line items
- **Pricing**: Extracts price information from columns

## Field Mapping

### XML Field Mapping
```xml
Quote Number: bas:docNumber/c:docNo
Quote Date: bas:docNumber/c:date
Customer Ref: bas:custReference
Customer Number: bas:customer/bas:number
Customer Name: bas:customer/bas:name
Contact: bas:customer/bas:contact/c:firstname + c:lastname
Phone: bas:customer/bas:contact/c:connectivity/c:phone[@type='phone']
Email: bas:customer/bas:contact/c:connectivity/c:email[@type='email']
Address: bas:customer/bas:address[@type='BILL_TO']
Line Items: bas:item elements
Pricing: bas:itemPricing elements
```

### RTF Field Mapping
- Uses pattern matching to extract text between labels
- Quote Number: After 'Quote no.:'
- Quote Date: After 'Quote date:'
- Customer Ref: After 'Your reference:'
- Customer Number: After 'Customer no.:'

### Excel Field Mapping
- Column 1: Description
- Column 2: Unit Price
- Other columns: Additional data

## Customization

### Adding New File Formats
1. Create a new parser class inheriting from `FileParser`
2. Implement the `parse()` method
3. Add the parser to the `QuoteGenerator` class

### Modifying Field Mapping
Edit the parser classes in `quote_generator.py`:
- `XMLParser`: Modify XPath expressions
- `RTFParser`: Update regex patterns
- `ExcelParser`: Change column mappings

### Customizing the Template
1. Edit `quote_template.xlsx` directly
2. Modify `create_template.py` for programmatic changes
3. Update the `_fill_quote_data()` method in `QuoteGenerator`

## Example Usage

### Parse XML File
```python
from quote_generator import QuoteGenerator

generator = QuoteGenerator()
data = generator.parse_file("ehOnline-Shop_20250905-160419.xml")
print(f"Quote Number: {data.quote_number}")
print(f"Customer: {data.customer_company}")
print(f"Total: ${data.total:,.2f}")
```

### Generate Quote
```python
output_path = generator.generate_quote(data)
print(f"Quote saved to: {output_path}")
```

### Custom Quote
```python
from quote_generator import QuoteData

# Create custom quote data
data = QuoteData()
data.quote_number = "KM-2025-001"
data.customer_company = "Custom Customer"
data.line_items = [
    {
        'item_number': '1',
        'quantity': 2,
        'unit': 'EA',
        'description': 'Custom Product',
        'unit_price': 1000.00,
        'total_price': 2000.00
    }
]
data.subtotal = 2000.00
data.tax = 100.00
data.total = 2100.00

# Generate quote
generator = QuoteGenerator()
output_path = generator.generate_quote(data)
```

## Template Structure

The Excel template includes:
- **Header**: Company logo area and quote title
- **Quote Details**: Quote number, date, customer reference
- **Customer Information**: Company, contact, phone, email
- **Line Items Table**: Item #, Qty, Unit, Description, Unit Price, Total Price
- **Totals Section**: Subtotal, tax, freight, total
- **Terms & Conditions**: Payment terms, delivery, validity

## Error Handling

The system includes comprehensive error handling:
- File format detection
- Parsing error recovery
- Missing field handling
- Data validation

## Dependencies

- `openpyxl`: Excel file manipulation
- `pandas`: Data processing
- `xlrd`: Excel file reading
- `reportlab`: PDF generation (future feature)

## License

This project is provided as-is for educational and commercial use.

## Support

For questions or issues:
1. Check the demo script for examples
2. Review the field mapping guide
3. Examine the parser classes for customization options

## Future Enhancements

- PDF export functionality
- Email integration
- Database connectivity
- Web interface
- Advanced template customization
- Batch processing
