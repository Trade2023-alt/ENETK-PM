# Excel Quote Generator - Instructions

## Files Created

1. **Quote_Generator_Excel.xlsx** - Basic Excel file with form and template
2. **Quote_Generator_VBA.xlsx** - Excel file ready for VBA macros
3. **VBA_Code.txt** - VBA code to add to Excel

## How to Use the Excel File

### Option 1: Basic Excel File (No Macros)
1. Open `Quote_Generator_Excel.xlsx`
2. Fill in the quote details in the "Quote Generator" sheet
3. Add line items in the table
4. Copy the data to the "Quote Template" sheet to create your quote
5. Save as a new file for each quote

### Option 2: Excel with VBA Macros (Recommended)
1. Open `Quote_Generator_VBA.xlsx`
2. Press `Alt+F11` to open VBA Editor
3. Right-click on 'VBAProject (Quote_Generator_VBA.xlsx)'
4. Select 'Insert' > 'Module'
5. Copy the code from `VBA_Code.txt` and paste it into the module
6. Save the file and close VBA Editor
7. Now you can use the buttons in the Excel file!

## Using the VBA-Enabled Excel File

### Step 1: Fill in Quote Details
- Quote Number: Enter your quote number
- Quote Date: Will auto-fill with today's date
- Customer Company: Enter customer name
- Contact Person: Enter contact name
- Phone: Enter phone number
- Email: Enter email address
- Customer Reference: Enter any reference number
- Payment Terms: Default is "Net 30 Days"
- Delivery Terms: Default is "FOB Origin"

### Step 2: Add Line Items
- Fill in up to 10 line items
- Description: What you're selling
- Qty: Quantity
- Unit: Unit of measure (default is "EA")
- Unit Price: Price per unit
- Total Price: Will calculate automatically

### Step 3: Generate Quote
- Click the "GENERATE QUOTE" button
- A new worksheet will be created with your formatted quote
- The quote will have professional Kinder Morgan styling

### Step 4: Clear Form
- Click "CLEAR FORM" to start over
- This will clear all data and reset to defaults

## Features

- **Automatic Calculations**: Totals, tax, and freight are calculated automatically
- **Professional Formatting**: Kinder Morgan-style header and layout
- **Multiple Quotes**: Each quote creates a new worksheet
- **Easy to Use**: Just fill in the form and click generate
- **Customizable**: You can modify the VBA code to change formatting or add features

## Troubleshooting

### If VBA doesn't work:
1. Make sure macros are enabled in Excel
2. Go to File > Options > Trust Center > Trust Center Settings
3. Click "Macro Settings"
4. Select "Enable all macros"
5. Restart Excel and try again

### If buttons don't work:
1. Make sure you copied the VBA code correctly
2. Check that the module was inserted properly
3. Try saving the file and reopening it

## Customization

You can modify the VBA code to:
- Change the company information
- Modify the quote layout
- Add more fields
- Change calculations
- Add email functionality
- Export to PDF

## Support

If you need help:
1. Check that all files are in the same folder
2. Make sure Excel macros are enabled
3. Try the basic Excel file first to test the layout
4. Contact support if you need help with VBA modifications
