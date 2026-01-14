# Quote Generation System - Usage Guide

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Create Template**:
   ```bash
   python create_simple_template.py
   ```

3. **Run Demo**:
   ```bash
   python demo.py
   ```

## File Overview

### Core Files
- `quote_generator.py` - Main system with parsers and quote generation
- `create_simple_template.py` - Creates the Excel template
- `demo.py` - Comprehensive demo script
- `quote_template_simple.xlsx` - Professional quote template

### Sample Files
- `ehOnline-Shop_20250905-160419.xml` - XML sample (EH Online Shop format)
- `ehOnline-Shop_2061348427.rtf` - RTF sample
- `ehOnline-Shop_2061348427.xlsx` - Excel sample

### Generated Files
- `quote_2061348427_20250905_081427.xlsx` - Generated from XML
- `rtf_quote.xlsx` - Generated from RTF
- `excel_quote.xlsx` - Generated from Excel
- `custom_quote.xlsx` - Custom quote example

## Usage Examples

### 1. Parse XML File
```python
from quote_generator import QuoteGenerator

generator = QuoteGenerator()
data = generator.parse_file("ehOnline-Shop_20250905-160419.xml")
print(f"Quote: {data.quote_number}")
print(f"Customer: {data.customer_company}")
print(f"Total: ${data.total:,.2f}")
```

### 2. Generate Quote
```python
output_path = generator.generate_quote(data)
print(f"Quote saved to: {output_path}")
```

### 3. Custom Quote
```python
from quote_generator import QuoteData

data = QuoteData()
data.quote_number = "KM-2025-001"
data.customer_company = "Your Customer"
data.line_items = [
    {
        'item_number': '1',
        'quantity': 2,
        'unit': 'EA',
        'description': 'Your Product',
        'unit_price': 1000.00,
        'total_price': 2000.00
    }
]
data.subtotal = 2000.00
data.tax = 100.00
data.total = 2100.00

generator = QuoteGenerator()
output_path = generator.generate_quote(data)
```

## Field Mapping

### XML Files (EH Online Shop)
- **Quote Number**: `bas:docNumber/c:docNo`
- **Quote Date**: `bas:docNumber/c:date`
- **Customer Reference**: `bas:custReference`
- **Customer Number**: `bas:customer/bas:number`
- **Customer Name**: `bas:customer/bas:name`
- **Contact**: `bas:customer/bas:contact/c:firstname + c:lastname`
- **Phone**: `bas:customer/bas:contact/c:connectivity/c:phone[@type='phone']`
- **Email**: `bas:customer/bas:contact/c:connectivity/c:email[@type='email']`
- **Address**: `bas:customer/bas:address[@type='BILL_TO']`
- **Line Items**: `bas:item` elements
- **Pricing**: `bas:itemPricing` elements

### RTF Files
- Uses pattern matching to extract text between labels
- Quote Number: After 'Quote no.:'
- Quote Date: After 'Quote date:'
- Customer Ref: After 'Your reference:'
- Customer Number: After 'Customer no.:'

### Excel Files
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
1. Edit `quote_template_simple.xlsx` directly
2. Modify `create_simple_template.py` for programmatic changes
3. Update the `_fill_quote_data()` method in `QuoteGenerator`

## Troubleshooting

### Common Issues

1. **"MergedCell object attribute 'value' is read-only"**
   - Solution: Use the simple template (`quote_template_simple.xlsx`)

2. **"ModuleNotFoundError: No module named 'openpyxl'"**
   - Solution: Run `pip install -r requirements.txt`

3. **"Unsupported file type"**
   - Solution: Check file extension (.xml, .rtf, .xlsx, .xls)

4. **Empty quote data**
   - Solution: Check file format and field mapping

### Debug Mode
Add debug prints to see what data is being parsed:
```python
data = generator.parse_file("your_file.xml")
print(f"Debug - Quote Number: '{data.quote_number}'")
print(f"Debug - Line Items: {len(data.line_items)}")
```

## Advanced Usage

### Batch Processing
```python
import os
from quote_generator import QuoteGenerator

generator = QuoteGenerator()
input_dir = "input_files"
output_dir = "generated_quotes"

for filename in os.listdir(input_dir):
    if filename.endswith(('.xml', '.rtf', '.xlsx')):
        input_path = os.path.join(input_dir, filename)
        data = generator.parse_file(input_path)
        output_path = os.path.join(output_dir, f"quote_{data.quote_number}.xlsx")
        generator.generate_quote(data, output_path=output_path)
```

### Custom Field Extraction
```python
class CustomXMLParser(XMLParser):
    def parse(self, file_path):
        data = super().parse(file_path)
        # Add custom field extraction
        data.custom_field = "your_custom_value"
        return data

# Use custom parser
generator = QuoteGenerator()
generator.parsers['xml'] = CustomXMLParser()
```

## Template Structure

The Excel template includes:
- **Header**: Company logo area and quote title
- **Quote Details**: Quote number, date, customer reference
- **Customer Information**: Company, contact, phone, email
- **Line Items Table**: Item #, Qty, Unit, Description, Unit Price, Total Price
- **Totals Section**: Subtotal, tax, freight, total
- **Terms & Conditions**: Payment terms, delivery, validity

## Performance Tips

1. **Large Files**: For large XML files, consider streaming parsing
2. **Memory Usage**: Process files one at a time for batch operations
3. **Template**: Use the simple template for better performance

## Support

For questions or issues:
1. Check the demo script for examples
2. Review the field mapping guide
3. Examine the parser classes for customization options
4. Check the generated Excel files for output format

## Future Enhancements

- PDF export functionality
- Email integration
- Database connectivity
- Web interface
- Advanced template customization
- Batch processing GUI
